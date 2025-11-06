const express = require('express');
const cors = require('cors');

// メモリベースのデータストア（VercelではSQLiteの書き込みができないため）
let todos = [];
let nextId = 1;

const app = express();
app.use(cors());
app.use(express.json());

// Todoをマッピングする関数
function mapTodo(row) {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    priority: row.priority || 1,
    dueDate: row.due_date || null,
    category: row.category || null,
    tags: row.tags ? (typeof row.tags === 'string' ? JSON.parse(row.tags) : row.tags) : [],
    archived: Boolean(row.archived || 0),
    createdAt: row.created_at || new Date().toISOString()
  };
}

// すべてのtodoを取得
app.get('/api/todos', (req, res) => {
  const { filter, sort, search, category, priority, archived } = req.query;
  
  let filtered = todos.filter(todo => {
    // アーカイブフィルター
    if (archived !== undefined) {
      if (archived === 'true' && !todo.archived) return false;
      if (archived === 'false' && todo.archived) return false;
    } else {
      if (todo.archived) return false;
    }
    
    // 完了状態フィルター
    if (filter === 'completed' && !todo.completed) return false;
    if (filter === 'active' && todo.completed) return false;
    
    // カテゴリフィルター
    if (category && todo.category !== category) return false;
    
    // 優先度フィルター
    if (priority !== undefined && todo.priority !== parseInt(priority)) return false;
    
    // 検索
    if (search) {
      const searchLower = search.toLowerCase();
      if (!todo.text.toLowerCase().includes(searchLower) && 
          !(todo.category && todo.category.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    
    return true;
  });
  
  // ソート
  if (sort === 'priority') {
    filtered.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  } else if (sort === 'dueDate') {
    filtered.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return new Date(b.createdAt) - new Date(a.createdAt);
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  } else if (sort === 'text') {
    filtered.sort((a, b) => a.text.localeCompare(b.text));
  } else {
    filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  res.json(filtered.map(mapTodo));
});

// 統計情報を取得
app.get('/api/stats', (req, res) => {
  const activeTodos = todos.filter(t => !t.archived);
  const stats = {
    total: activeTodos.length,
    completed: activeTodos.filter(t => t.completed).length,
    active: activeTodos.filter(t => !t.completed).length,
    highPriority: activeTodos.filter(t => t.priority === 2).length,
    archived: todos.filter(t => t.archived).length
  };
  res.json(stats);
});

// カテゴリ一覧を取得
app.get('/api/categories', (req, res) => {
  const categories = [...new Set(todos.filter(t => t.category && !t.archived).map(t => t.category))];
  res.json(categories);
});

// 新しいtodoを作成
app.post('/api/todos', (req, res) => {
  const { text, priority, dueDate, category, tags } = req.body;
  if (!text || text.trim() === '') {
    res.status(400).json({ error: 'テキストが必要です' });
    return;
  }

  const newTodo = {
    id: nextId++,
    text: text.trim(),
    completed: false,
    priority: priority !== undefined ? parseInt(priority) : 1,
    due_date: dueDate || null,
    category: category || null,
    tags: tags && Array.isArray(tags) ? tags : [],
    archived: false,
    created_at: new Date().toISOString()
  };
  
  todos.push(newTodo);
  res.status(201).json(mapTodo(newTodo));
});

// todoを更新
app.put('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const { text, completed, priority, dueDate, category, tags, archived } = req.body;

  const todoIndex = todos.findIndex(t => t.id === parseInt(id));
  if (todoIndex === -1) {
    res.status(404).json({ error: 'Todoが見つかりません' });
    return;
  }

  const todo = todos[todoIndex];
  if (text !== undefined) todo.text = text.trim();
  if (completed !== undefined) todo.completed = completed;
  if (priority !== undefined) todo.priority = parseInt(priority);
  if (dueDate !== undefined) todo.due_date = dueDate || null;
  if (category !== undefined) todo.category = category || null;
  if (tags !== undefined) todo.tags = Array.isArray(tags) ? tags : [];
  if (archived !== undefined) todo.archived = archived;

  res.json(mapTodo(todo));
});

// todoを削除
app.delete('/api/todos/:id', (req, res) => {
  const { id } = req.params;
  const todoIndex = todos.findIndex(t => t.id === parseInt(id));
  if (todoIndex === -1) {
    res.status(404).json({ error: 'Todoが見つかりません' });
    return;
  }
  todos.splice(todoIndex, 1);
  res.json({ message: 'Todoが削除されました' });
});

// 一括操作
app.post('/api/todos/batch', (req, res) => {
  const { action, ids, filter } = req.body;
  
  if (!action) {
    res.status(400).json({ error: 'アクションが指定されていません' });
    return;
  }
  
  let targetTodos = todos.filter(t => !t.archived);
  
  if (ids && ids.length > 0) {
    targetTodos = targetTodos.filter(t => ids.includes(t.id));
  } else if (filter) {
    if (filter === 'active') {
      targetTodos = targetTodos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      targetTodos = targetTodos.filter(t => t.completed);
    }
  }
  
  let count = 0;
  if (action === 'complete') {
    targetTodos.forEach(t => { t.completed = true; count++; });
  } else if (action === 'uncomplete') {
    targetTodos.forEach(t => { t.completed = false; count++; });
  } else if (action === 'delete') {
    count = targetTodos.length;
    todos = todos.filter(t => !targetTodos.includes(t));
  } else if (action === 'archive') {
    targetTodos.forEach(t => { t.archived = true; count++; });
  } else if (action === 'unarchive') {
    targetTodos.forEach(t => { t.archived = false; count++; });
  } else {
    res.status(400).json({ error: '無効なアクションです' });
    return;
  }
  
  res.json({ message: `${count}件のTodoが更新されました` });
});

module.exports = app;

