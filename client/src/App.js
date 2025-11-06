import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// カスタムドロップダウンコンポーネント
function CustomSelect({ value, onChange, options, className, onPlaySound }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    if (onPlaySound) onPlaySound('click');
  };

  return (
    <div className={`custom-select ${className} ${isOpen ? 'open' : ''}`} ref={selectRef}>
      <button
        type="button"
        className="custom-select-button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (onPlaySound && !isOpen) onPlaySound('click');
        }}
      >
        <span>{selectedOption.label}</span>
        <span className="custom-select-arrow">▼</span>
      </button>
      {isOpen && (
        <div className="custom-select-dropdown">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {value === option.value && <span className="checkmark">✓</span>}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 8bit風の効果音を生成する関数
function playSound(type) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  switch(type) {
    case 'add':
      oscillator.frequency.value = 440;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'delete':
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      break;
    case 'complete':
      oscillator.frequency.value = 523.25;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      break;
    case 'click':
      oscillator.frequency.value = 800;
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.05);
      break;
  }
}

function App() {
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, active: 0, highPriority: 0, archived: 0 });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // フィルターとソート
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // フォーム状態
  const [inputText, setInputText] = useState('');
  const [inputPriority, setInputPriority] = useState(1);
  const [inputDueDate, setInputDueDate] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [inputTags, setInputTags] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  
  // ミニゲーム状態
  const [showGame, setShowGame] = useState(false);

  // 統計情報を取得
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // カテゴリ一覧を取得
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/categories`);
      setCategories(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  // すべてのtodoを取得
  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filter !== 'all') params.filter = filter;
      if (sort) params.sort = sort;
      if (search) params.search = search;
      if (selectedCategory) params.category = selectedCategory;
      if (selectedPriority) params.priority = selectedPriority;
      if (showArchived) params.archived = 'true';
      
      const response = await axios.get(`${API_URL}/todos`, { params });
      setTodos(response.data);
      await fetchStats();
      await fetchCategories();
    } catch (err) {
      setError('TODOの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [filter, sort, search, selectedCategory, selectedPriority, showArchived]);

  // 新しいtodoを追加
  const addTodo = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      setError(null);
      const tags = inputTags.split(',').map(t => t.trim()).filter(t => t);
      const response = await axios.post(`${API_URL}/todos`, {
        text: inputText.trim(),
        priority: inputPriority,
        dueDate: inputDueDate || null,
        category: inputCategory || null,
        tags: tags
      });
      setTodos([response.data, ...todos]);
      setInputText('');
      setInputPriority(1);
      setInputDueDate('');
      setInputCategory('');
      setInputTags('');
      setShowAddForm(false);
      playSound('add');
      await fetchStats();
      await fetchCategories();
    } catch (err) {
      setError('TODOの追加に失敗しました');
      console.error(err);
    }
  };

  // todoを更新
  const updateTodo = async (id, updates) => {
    try {
      setError(null);
      const response = await axios.put(`${API_URL}/todos/${id}`, updates);
      setTodos(todos.map(todo => 
        todo.id === id ? response.data : todo
      ));
      await fetchStats();
      return response.data;
    } catch (err) {
      setError('TODOの更新に失敗しました');
      console.error(err);
      return null;
    }
  };

  // todoの完了状態を切り替え
  const toggleTodo = async (id, currentCompleted) => {
    const updated = await updateTodo(id, { completed: !currentCompleted });
    if (updated) playSound('complete');
  };

  // todoを削除
  const deleteTodo = async (id) => {
    try {
      setError(null);
      await axios.delete(`${API_URL}/todos/${id}`);
      setTodos(todos.filter(todo => todo.id !== id));
      playSound('delete');
      await fetchStats();
    } catch (err) {
      setError('TODOの削除に失敗しました');
      console.error(err);
    }
  };

  // 一括操作
  const batchAction = async (action, filterType = null) => {
    try {
      setError(null);
      await axios.post(`${API_URL}/todos/batch`, { action, filter: filterType });
      playSound('click');
      await fetchTodos();
    } catch (err) {
      setError('一括操作に失敗しました');
      console.error(err);
    }
  };

  const completedCount = todos.filter(t => t.completed).length;
  const totalCount = todos.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="App">
      <div className="cloud-1">☁</div>
      <div className="cloud-2">☁</div>
      <div className="ground-decoration"></div>
      <div className="container">
        <div className="header">
          <h1 className="title">
            <span className="title-icon">🍄</span>
            TODO GAME
          </h1>
          <button 
            className="game-button"
            onClick={() => { setShowGame(true); playSound('click'); }}
            title="PLAY MINI GAME"
          >
            🎮 GAME
          </button>
          {totalCount > 0 && (
            <div className="stats">
              <div className="stat-item">
                <span className="stat-number">{completedCount}</span>
                <span className="stat-label">DONE</span>
              </div>
              <div className="stat-divider">/</div>
              <div className="stat-item">
                <span className="stat-number">{totalCount}</span>
                <span className="stat-label">TOTAL</span>
              </div>
            </div>
          )}
        </div>

        {/* 統計情報パネル */}
        <div className="stats-panel">
          <div className="stat-box">
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label-small">ACTIVE</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.highPriority}</div>
            <div className="stat-label-small">HIGH</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{stats.archived}</div>
            <div className="stat-label-small">ARCHIVED</div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="progress-bar-container">
            <div className="progress-bar" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        )}
        
        {error && (
          <div className="error-message animate-slide-down">
            <span className="error-icon">!</span>
            {error}
          </div>
        )}

        {/* コントロールパネル */}
        <div className="control-panel">
          <div className="control-row">
            <div className="filter-group">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => { setFilter('all'); playSound('click'); }}
              >
                ALL
              </button>
              <button 
                className={`filter-btn ${filter === 'active' ? 'active' : ''}`}
                onClick={() => { setFilter('active'); playSound('click'); }}
              >
                ACTIVE
              </button>
              <button 
                className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => { setFilter('completed'); playSound('click'); }}
              >
                DONE
              </button>
            </div>
            
            <div className="sort-group">
              <CustomSelect
                value={sort}
                onChange={(value) => setSort(value)}
                options={[
                  { value: 'date', label: 'DATE' },
                  { value: 'priority', label: 'PRIORITY' },
                  { value: 'dueDate', label: 'DUE DATE' },
                  { value: 'text', label: 'TEXT' }
                ]}
                className="sort-select"
                onPlaySound={playSound}
              />
            </div>
          </div>

          <div className="control-row">
            <div className="search-group">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="SEARCH..."
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
              <CustomSelect
                value={selectedCategory}
                onChange={(value) => setSelectedCategory(value)}
                options={[
                  { value: '', label: 'ALL CATEGORIES' },
                  ...categories.map(cat => ({ value: cat, label: cat }))
                ]}
                className="filter-select"
                onPlaySound={playSound}
              />
              
              <CustomSelect
                value={selectedPriority}
                onChange={(value) => setSelectedPriority(value)}
                options={[
                  { value: '', label: 'ALL PRIORITIES' },
                  { value: '2', label: 'HIGH' },
                  { value: '1', label: 'MEDIUM' },
                  { value: '0', label: 'LOW' }
                ]}
                className="filter-select"
                onPlaySound={playSound}
              />
            </div>
          </div>

          <div className="control-row">
            <button 
              className="toggle-btn"
              onClick={() => { setShowArchived(!showArchived); playSound('click'); }}
            >
              {showArchived ? 'HIDE ARCHIVED' : 'SHOW ARCHIVED'}
            </button>
            
            <div className="batch-actions">
              <button 
                className="batch-btn"
                onClick={() => batchAction('complete', 'active')}
                title="Complete all active"
              >
                ✓ ALL
              </button>
              <button 
                className="batch-btn"
                onClick={() => batchAction('delete', 'completed')}
                title="Delete all completed"
              >
                DEL DONE
              </button>
              <button 
                className="batch-btn"
                onClick={() => batchAction('archive', 'completed')}
                title="Archive all completed"
              >
                ARCHIVE
              </button>
            </div>
          </div>
        </div>

        {/* 追加フォーム */}
        <div className="add-section">
          {!showAddForm ? (
            <button 
              className="add-toggle-btn"
              onClick={() => { setShowAddForm(true); playSound('click'); }}
            >
              + ADD NEW TODO
            </button>
          ) : (
            <form onSubmit={addTodo} className="todo-form-expanded">
              <div className="form-row">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="ENTER NEW TODO..."
                  className="todo-input"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PRIORITY:</label>
                  <CustomSelect
                    value={inputPriority.toString()}
                    onChange={(value) => setInputPriority(parseInt(value))}
                    options={[
                      { value: '0', label: 'LOW' },
                      { value: '1', label: 'MEDIUM' },
                      { value: '2', label: 'HIGH' }
                    ]}
                    className="form-select"
                    onPlaySound={playSound}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">DUE DATE:</label>
                  <input
                    type="date"
                    value={inputDueDate}
                    onChange={(e) => setInputDueDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">CATEGORY:</label>
                  <input
                    type="text"
                    value={inputCategory}
                    onChange={(e) => setInputCategory(e.target.value)}
                    placeholder="CATEGORY"
                    className="form-input"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group full-width">
                  <label className="form-label">TAGS (comma separated):</label>
                  <input
                    type="text"
                    value={inputTags}
                    onChange={(e) => setInputTags(e.target.value)}
                    placeholder="tag1, tag2, tag3"
                    className="form-input"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="add-button">
                  <span className="button-icon">+</span>
                  <span>ADD</span>
                </button>
                <button 
                  type="button"
                  className="cancel-button"
                  onClick={() => { setShowAddForm(false); playSound('click'); }}
                >
                  CANCEL
                </button>
              </div>
            </form>
          )}
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>LOADING...</p>
          </div>
        ) : (
          <div className="todo-list">
            {todos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">[ ]</div>
                <p className="empty-title">NO TODOS</p>
                <p className="empty-hint">ADD NEW TODO ABOVE</p>
              </div>
            ) : (
              todos.map((todo, index) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  index={index}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                  onUpdate={updateTodo}
                  onPlaySound={playSound}
                />
              ))
            )}
          </div>
        )}
      </div>
      {showGame && (
        <MiniGame 
          onClose={() => { setShowGame(false); playSound('click'); }}
          onPlaySound={playSound}
        />
      )}
    </div>
  );
}

// ミニゲームコンポーネント
function MiniGame({ onClose, onPlaySound }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
  const [score, setScore] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [obstacles, setObstacles] = useState([]);
  const gameRef = useRef(null);
  const animationFrameRef = useRef(null);
  const obstacleTimerRef = useRef(null);
  
  // useRefでリアルタイムな状態を管理
  const gameStateRef = useRef('ready');
  const playerYRef = useRef(0);
  const velocityRef = useRef(0);
  const gameSpeedRef = useRef(3);
  const isJumpingRef = useRef(false);
  const obstaclesRef = useRef([]);
  const scoreRef = useRef(0);
  const lastSpeedUpdateRef = useRef(0);
  
  const groundY = 40; // 地面のY座標（bottomからの距離）
  const PLAYER_HEIGHT = 72; // キャラクターの高さ（9行 × 8px）
  const GRAVITY = 0.6;
  const JUMP_POWER = -12;
  const OBSTACLE_SPAWN_INTERVAL = 2000; // 2秒ごとに障害物を生成
  const PLAYER_X = 100; // プレイヤーのX座標
  const PLAYER_WIDTH = 40; // プレイヤーの幅
  const OBSTACLE_WIDTH = 30; // 障害物の幅

  // ゲーム開始
  const startGame = () => {
    gameStateRef.current = 'playing';
    setGameState('playing');
    scoreRef.current = 0;
    setScore(0);
    playerYRef.current = 0; // 0 = 地面、負の値 = 上にジャンプ
    setPlayerY(0);
    velocityRef.current = 0;
    gameSpeedRef.current = 3;
    isJumpingRef.current = false;
    obstaclesRef.current = [];
    setObstacles([]);
    lastSpeedUpdateRef.current = 0;
    onPlaySound('click');
    
    // 障害物生成タイマー
    if (obstacleTimerRef.current) {
      clearInterval(obstacleTimerRef.current);
    }
    obstacleTimerRef.current = setInterval(() => {
      if (gameStateRef.current === 'playing') {
        const newObstacle = { id: Date.now(), x: 800, passed: false };
        obstaclesRef.current = [...obstaclesRef.current, newObstacle];
        setObstacles([...obstaclesRef.current]);
      }
    }, OBSTACLE_SPAWN_INTERVAL);

    // ゲームループ開始
    gameLoop();
  };

  // ジャンプ
  const jump = () => {
    if (gameStateRef.current !== 'playing' || isJumpingRef.current) return;
    if (playerYRef.current >= 0) { // 地面にいる時だけジャンプ可能
      velocityRef.current = JUMP_POWER;
      isJumpingRef.current = true;
      onPlaySound('complete');
    }
  };

  // ゲームループ
  const gameLoop = () => {
    if (gameStateRef.current !== 'playing') {
      return;
    }

    // プレイヤーの物理演算（上方向が負の値）
    let newY = playerYRef.current + velocityRef.current;
    let newVelocity = velocityRef.current + GRAVITY;

    // 地面に着地（0以下にならない）
    if (newY >= 0) {
      newY = 0;
      newVelocity = 0;
      isJumpingRef.current = false;
    }

    playerYRef.current = newY;
    velocityRef.current = newVelocity;
    setPlayerY(newY);

    // 障害物を左に移動
    const updated = obstaclesRef.current.map(obs => ({
      ...obs,
      x: obs.x - gameSpeedRef.current
    })).filter(obs => {
      // 衝突判定（緩くする：プレイヤーが地面にいて、障害物がプレイヤーの位置に来た時）
      const playerLeft = PLAYER_X;
      const playerRight = PLAYER_X + PLAYER_WIDTH;
      const obstacleLeft = obs.x;
      const obstacleRight = obs.x + OBSTACLE_WIDTH;
      
      // プレイヤーと障害物が重なっているか判定（より緩く）
      const isColliding = obstacleRight > playerLeft + 10 && obstacleLeft < playerRight - 10;
      
      if (isColliding && playerYRef.current >= -5) { // 地面付近にいる時だけ衝突（少し余裕を持たせる）
        // ゲームオーバー
        gameStateRef.current = 'gameover';
        setGameState('gameover');
        if (obstacleTimerRef.current) {
          clearInterval(obstacleTimerRef.current);
        }
        onPlaySound('delete');
        return false;
      } else if (obs.x < PLAYER_X - 20 && !obs.passed) {
        // 障害物を通過（スコア加算）
        obs.passed = true;
        scoreRef.current += 1;
        setScore(scoreRef.current);
        onPlaySound('add');
      }
      return obs.x > -50; // 画面外に出た障害物を削除
    });

    obstaclesRef.current = updated;
    setObstacles(updated);

    // スコアに応じて速度を上げる
    if (scoreRef.current > lastSpeedUpdateRef.current && scoreRef.current % 10 === 0) {
      gameSpeedRef.current = Math.min(gameSpeedRef.current + 0.5, 8);
      lastSpeedUpdateRef.current = scoreRef.current;
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop);
  };

  // ゲームループの開始と停止
  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState]);

  // キーボードイベント
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        jump();
      } else if (e.key === 'Escape') {
        if (gameStateRef.current === 'playing') {
          gameStateRef.current = 'ready';
          setGameState('ready');
          if (obstacleTimerRef.current) {
            clearInterval(obstacleTimerRef.current);
          }
        }
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (obstacleTimerRef.current) {
        clearInterval(obstacleTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="mini-game-overlay">
      <div className="mini-game-container">
        <div className="game-header">
          <h2 className="game-title">🎮 MINI GAME</h2>
          <button className="game-close-btn" onClick={onClose}>×</button>
        </div>

        {gameState === 'ready' && (
          <div className="game-start-screen">
            <div className="game-instructions">
              <p className="instruction-title">HOW TO PLAY</p>
              <p className="instruction-text">PRESS SPACE TO JUMP</p>
              <p className="instruction-text">AVOID OBSTACLES</p>
              <p className="instruction-text">GET HIGH SCORE!</p>
            </div>
            <button className="game-start-btn" onClick={startGame}>
              START GAME
            </button>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="game-screen" ref={gameRef} onClick={jump}>
            <div className="game-score">SCORE: {score}</div>
            <div className="game-ground"></div>
            <div 
              className="game-player"
              style={{ 
                bottom: `${groundY + PLAYER_HEIGHT}px`,
                transform: `translateY(${playerY}px)`
              }}
            >
              <div className="player-body"></div>
            </div>
            {obstacles.map(obs => (
              <div
                key={obs.id}
                className="game-obstacle"
                style={{ left: `${obs.x}px`, bottom: `${groundY}px` }}
              >
                <div className="obstacle-body"></div>
              </div>
            ))}
            <div className="game-hint">CLICK OR PRESS SPACE TO JUMP</div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="game-over-screen">
            <div className="game-over-title">GAME OVER</div>
            <div className="game-final-score">FINAL SCORE: {score}</div>
            <div className="game-over-message">
              {score < 5 && "KEEP PRACTICING!"}
              {score >= 5 && score < 15 && "GOOD JOB!"}
              {score >= 15 && score < 30 && "GREAT!"}
              {score >= 30 && "AMAZING!"}
            </div>
            <button className="game-restart-btn" onClick={startGame}>
              PLAY AGAIN
            </button>
            <button className="game-close-btn-bottom" onClick={onClose}>
              CLOSE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TodoItem({ todo, onToggle, onDelete, onUpdate, index, onPlaySound }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState(todo.priority);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate || '');
  const [editCategory, setEditCategory] = useState(todo.category || '');
  const [editTags, setEditTags] = useState(todo.tags ? todo.tags.join(', ') : '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editText.trim() && editText !== todo.text) {
      const tags = editTags.split(',').map(t => t.trim()).filter(t => t);
      onUpdate(todo.id, {
        text: editText.trim(),
        priority: editPriority,
        dueDate: editDueDate || null,
        category: editCategory || null,
        tags: tags
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate || '');
    setEditCategory(todo.category || '');
    setEditTags(todo.tags ? todo.tags.join(', ') : '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    setIsDeleting(true);
    setTimeout(() => {
      onDelete(todo.id);
    }, 300);
  };

  const handleArchive = () => {
    onUpdate(todo.id, { archived: !todo.archived });
    onPlaySound('click');
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 2: return '#ff0000'; // HIGH - Red
      case 1: return '#ffff00'; // MEDIUM - Yellow
      case 0: return '#00ff00'; // LOW - Green
      default: return '#00ff00';
    }
  };

  const getPriorityLabel = (priority) => {
    switch(priority) {
      case 2: return 'HIGH';
      case 1: return 'MED';
      case 0: return 'LOW';
      default: return 'LOW';
    }
  };

  const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

  return (
    <div 
      className={`todo-item ${todo.completed ? 'completed' : ''} ${isDeleting ? 'deleting' : ''} ${todo.archived ? 'archived' : ''}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div className="checkbox-wrapper">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id, todo.completed)}
          className="todo-checkbox"
          id={`todo-${todo.id}`}
        />
        <label htmlFor={`todo-${todo.id}`} className="checkbox-label">
          {todo.completed && <span className="checkmark">✓</span>}
        </label>
      </div>
      
      <div className="todo-content">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="edit-form-expanded">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              autoFocus
              className="edit-input"
            />
            <div className="edit-meta">
              <CustomSelect
                value={editPriority.toString()}
                onChange={(value) => setEditPriority(parseInt(value))}
                options={[
                  { value: '0', label: 'LOW' },
                  { value: '1', label: 'MEDIUM' },
                  { value: '2', label: 'HIGH' }
                ]}
                className="edit-select"
                onPlaySound={onPlaySound}
              />
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="edit-input-small"
              />
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="CATEGORY"
                className="edit-input-small"
              />
            </div>
            <div className="edit-actions">
              <button type="submit" className="edit-save-btn">SAVE</button>
              <button type="button" className="edit-cancel-btn" onClick={handleCancel}>CANCEL</button>
            </div>
          </form>
        ) : (
          <>
            <div className="todo-main">
              <span
                className="todo-text"
                onDoubleClick={() => { setIsEditing(true); onPlaySound('click'); }}
                title="DOUBLE CLICK TO EDIT"
              >
                {todo.text}
              </span>
              <div className="todo-meta">
                <span 
                  className="priority-badge"
                  style={{ color: getPriorityColor(todo.priority) }}
                >
                  {getPriorityLabel(todo.priority)}
                </span>
                {todo.category && (
                  <span className="category-badge">{todo.category}</span>
                )}
                {todo.dueDate && (
                  <span className={`due-date-badge ${isOverdue ? 'overdue' : ''}`}>
                    {new Date(todo.dueDate).toLocaleDateString()}
                  </span>
                )}
                {todo.tags && todo.tags.length > 0 && (
                  <div className="tags-container">
                    {todo.tags.map((tag, idx) => (
                      <span key={idx} className="tag-badge">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      <div className="todo-actions">
        <button
          onClick={() => { setIsEditing(true); onPlaySound('click'); }}
          className="edit-button"
          aria-label="編集"
          title="EDIT"
        >
          EDIT
        </button>
        <button
          onClick={handleArchive}
          className="archive-button"
          aria-label="アーカイブ"
          title={todo.archived ? "UNARCHIVE" : "ARCHIVE"}
        >
          {todo.archived ? 'UNARCH' : 'ARCH'}
        </button>
        <button
          onClick={handleDelete}
          className="delete-button"
          aria-label="削除"
          title="DELETE"
        >
          DEL
        </button>
      </div>
    </div>
  );
}

export default App;
