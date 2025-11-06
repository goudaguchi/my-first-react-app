const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// ミドルウェア
app.use(cors());
app.use(express.json());

// データベースの初期化
const dbPath = path.join(__dirname, 'todos.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
  } else {
    console.log('SQLiteデータベースに接続しました');
    // テーブルの作成（拡張版）
    db.run(`CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 1,
      due_date TEXT,
      category TEXT,
      tags TEXT,
      archived INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('テーブル作成エラー:', err.message);
      } else {
        console.log('todosテーブルが準備されました');
        // 既存のテーブルに新しいカラムを追加（マイグレーション）
        addColumnIfNotExists('priority', 'INTEGER DEFAULT 1');
        addColumnIfNotExists('due_date', 'TEXT');
        addColumnIfNotExists('category', 'TEXT');
        addColumnIfNotExists('tags', 'TEXT');
        addColumnIfNotExists('archived', 'INTEGER DEFAULT 0');
      }
    });
  }
});

// カラムが存在しない場合に追加する関数
function addColumnIfNotExists(columnName, columnDefinition) {
  db.all(`PRAGMA table_info(todos)`, [], (err, columns) => {
    if (err) {
      console.error(`カラム情報取得エラー:`, err.message);
      return;
    }
    const columnExists = columns.some(col => col.name === columnName);
    if (!columnExists) {
      db.run(`ALTER TABLE todos ADD COLUMN ${columnName} ${columnDefinition}`, (err) => {
        if (err) {
          console.error(`${columnName}カラム追加エラー:`, err.message);
        } else {
          console.log(`${columnName}カラムを追加しました`);
        }
      });
    }
  });
}

// Todoをマッピングする関数
function mapTodo(row) {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    priority: row.priority || 1,
    dueDate: row.due_date || null,
    category: row.category || null,
    tags: row.tags ? JSON.parse(row.tags) : [],
    archived: Boolean(row.archived || 0),
    createdAt: row.created_at
  };
}

// すべてのtodoを取得（フィルター、ソート、検索対応）
app.get('/api/todos', (req, res) => {
  const { filter, sort, search, category, priority, archived } = req.query;
  
  let query = 'SELECT * FROM todos WHERE 1=1';
  const params = [];
  
  // アーカイブフィルター
  if (archived !== undefined) {
    query += ' AND archived = ?';
    params.push(archived === 'true' ? 1 : 0);
  } else {
    // デフォルトではアーカイブされていないもののみ
    query += ' AND archived = 0';
  }
  
  // 完了状態フィルター
  if (filter === 'completed') {
    query += ' AND completed = 1';
  } else if (filter === 'active') {
    query += ' AND completed = 0';
  }
  
  // カテゴリフィルター
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  // 優先度フィルター
  if (priority !== undefined) {
    query += ' AND priority = ?';
    params.push(parseInt(priority));
  }
  
  // 検索
  if (search) {
    query += ' AND (text LIKE ? OR category LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }
  
  // ソート
  if (sort === 'priority') {
    query += ' ORDER BY priority DESC, created_at DESC';
  } else if (sort === 'dueDate') {
    query += ' ORDER BY due_date ASC, created_at DESC';
  } else if (sort === 'text') {
    query += ' ORDER BY text ASC';
  } else {
    query += ' ORDER BY created_at DESC';
  }
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(mapTodo));
  });
});

// 統計情報を取得
app.get('/api/stats', (req, res) => {
  db.all(`SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN priority = 2 THEN 1 ELSE 0 END) as highPriority,
    SUM(CASE WHEN archived = 1 THEN 1 ELSE 0 END) as archived
    FROM todos WHERE archived = 0`, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const stats = rows[0];
    res.json({
      total: stats.total || 0,
      completed: stats.completed || 0,
      active: stats.active || 0,
      highPriority: stats.highPriority || 0,
      archived: stats.archived || 0
    });
  });
});

// カテゴリ一覧を取得
app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM todos WHERE category IS NOT NULL AND category != "" AND archived = 0', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows.map(row => row.category));
  });
});

// 新しいtodoを作成
app.post('/api/todos', (req, res) => {
  const { text, priority, dueDate, category, tags } = req.body;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'テキストが必要です' });
    return;
  }

  const tagsJson = tags && Array.isArray(tags) ? JSON.stringify(tags) : '[]';
  const priorityValue = priority !== undefined ? parseInt(priority) : 1;
  
  db.run(
    'INSERT INTO todos (text, priority, due_date, category, tags) VALUES (?, ?, ?, ?, ?)',
    [text.trim(), priorityValue, dueDate || null, category || null, tagsJson],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      db.get('SELECT * FROM todos WHERE id = ?', [this.lastID], (err, row) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json(mapTodo(row));
      });
    }
  );
});

// todoを更新
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed, priority, dueDate, category, tags, archived } = req.body;

  let query = 'UPDATE todos SET ';
  const params = [];
  const updates = [];
  
  if (text !== undefined) {
    updates.push('text = ?');
    params.push(text.trim());
  }
  
  if (completed !== undefined) {
    updates.push('completed = ?');
    params.push(completed ? 1 : 0);
  }
  
  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(parseInt(priority));
  }
  
  if (dueDate !== undefined) {
    updates.push('due_date = ?');
    params.push(dueDate || null);
  }
  
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category || null);
  }
  
  if (tags !== undefined) {
    updates.push('tags = ?');
    params.push(Array.isArray(tags) ? JSON.stringify(tags) : '[]');
  }
  
  if (archived !== undefined) {
    updates.push('archived = ?');
    params.push(archived ? 1 : 0);
  }
  
  if (updates.length === 0) {
    res.status(400).json({ error: '更新するフィールドが指定されていません' });
    return;
  }
  
  query += updates.join(', ') + ' WHERE id = ?';
  params.push(id);

  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Todoが見つかりません' });
      return;
    }
    db.get('SELECT * FROM todos WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(mapTodo(row));
    });
  });
});

// todoを削除
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM todos WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Todoが見つかりません' });
      return;
    }
    res.json({ message: 'Todoが削除されました' });
  });
});

// 一括操作
app.post('/api/todos/batch', (req, res) => {
  const { action, ids, filter } = req.body;
  
  if (!action) {
    res.status(400).json({ error: 'アクションが指定されていません' });
    return;
  }
  
  let query = '';
  const params = [];
  
  if (action === 'complete') {
    query = 'UPDATE todos SET completed = 1 WHERE archived = 0';
    if (ids && ids.length > 0) {
      query += ' AND id IN (' + ids.map(() => '?').join(',') + ')';
      params.push(...ids);
    } else if (filter) {
      if (filter === 'active') {
        query += ' AND completed = 0';
      }
    }
  } else if (action === 'uncomplete') {
    query = 'UPDATE todos SET completed = 0 WHERE archived = 0';
    if (ids && ids.length > 0) {
      query += ' AND id IN (' + ids.map(() => '?').join(',') + ')';
      params.push(...ids);
    }
  } else if (action === 'delete') {
    query = 'DELETE FROM todos WHERE archived = 0';
    if (ids && ids.length > 0) {
      query += ' AND id IN (' + ids.map(() => '?').join(',') + ')';
      params.push(...ids);
    } else if (filter) {
      if (filter === 'completed') {
        query += ' AND completed = 1';
      }
    }
  } else if (action === 'archive') {
    query = 'UPDATE todos SET archived = 1 WHERE archived = 0';
    if (ids && ids.length > 0) {
      query += ' AND id IN (' + ids.map(() => '?').join(',') + ')';
      params.push(...ids);
    } else if (filter) {
      if (filter === 'completed') {
        query += ' AND completed = 1';
      }
    }
  } else if (action === 'unarchive') {
    query = 'UPDATE todos SET archived = 0 WHERE archived = 1';
    if (ids && ids.length > 0) {
      query += ' AND id IN (' + ids.map(() => '?').join(',') + ')';
      params.push(...ids);
    }
  }
  
  if (!query) {
    res.status(400).json({ error: '無効なアクションです' });
    return;
  }
  
  db.run(query, params, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: `${this.changes}件のTodoが更新されました` });
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーがポート ${PORT} で起動しました`);
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('データベース接続を閉じました');
    }
    process.exit(0);
  });
});
