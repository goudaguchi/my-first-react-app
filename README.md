# Todo アプリケーション

React + Node.js + Express + SQLite で構築されたモダンなTodoアプリケーションです。

## 機能

- ✅ Todoアイテムの追加
- ✅ Todoアイテムの完了/未完了の切り替え
- ✅ Todoアイテムの編集（ダブルクリック）
- ✅ Todoアイテムの削除
- ✅ ローカルSQLiteデータベースによる永続化

## 技術スタック

- **フロントエンド**: React 18
- **バックエンド**: Node.js + Express
- **データベース**: SQLite
- **HTTP クライアント**: Axios

## セットアップ

### 1. 依存関係のインストール

ルートディレクトリで以下のコマンドを実行してください：

```bash
npm run install-all
```

これにより、ルート、サーバー、クライアントのすべての依存関係がインストールされます。

### 2. アプリケーションの起動

#### 開発モード（推奨）

ルートディレクトリで以下のコマンドを実行すると、サーバーとクライアントが同時に起動します：

```bash
npm run dev
```

#### 個別に起動する場合

**サーバーのみ起動:**
```bash
npm run server
```

**クライアントのみ起動:**
```bash
npm run client
```

### 3. アクセス

- **フロントエンド**: http://localhost:3002
- **バックエンドAPI**: http://localhost:3001

## プロジェクト構造

```
todo/
├── client/              # React フロントエンド
│   ├── public/
│   ├── src/
│   │   ├── App.js      # メインアプリケーションコンポーネント
│   │   ├── App.css     # スタイルシート
│   │   ├── index.js    # エントリーポイント
│   │   └── index.css   # グローバルスタイル
│   └── package.json
├── server/             # Express バックエンド
│   ├── index.js        # サーバーファイル
│   ├── todos.db        # SQLiteデータベース（自動生成）
│   └── package.json
├── package.json        # ルートパッケージ
└── README.md
```

## API エンドポイント

- `GET /api/todos` - すべてのTodoを取得
- `POST /api/todos` - 新しいTodoを作成
- `PUT /api/todos/:id` - Todoを更新
- `DELETE /api/todos/:id` - Todoを削除

## データベース

SQLiteデータベースは `server/todos.db` に自動的に作成されます。

テーブル構造:
- `id` (INTEGER PRIMARY KEY)
- `text` (TEXT)
- `completed` (INTEGER, 0 or 1)
- `created_at` (DATETIME)

## 使用方法

1. アプリケーションを起動します
2. 上部の入力フィールドにTodoを入力して「追加」ボタンをクリック
3. チェックボックスをクリックして完了/未完了を切り替え
4. Todoテキストをダブルクリックして編集
5. ×ボタンをクリックしてTodoを削除

## ライセンス

ISC

