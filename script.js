document.addEventListener('DOMContentLoaded', () => {
    // 游戏变量
    const gameBoard = document.getElementById('gameBoard');
    const timeElement = document.getElementById('time');
    const scoreElement = document.getElementById('score');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const gameMessage = document.getElementById('gameMessage');
    
    // 道具元素
    const hintProp = document.getElementById('hintProp');
    const timeProp = document.getElementById('timeProp');
    const shuffleProp = document.getElementById('shuffleProp');
    const hintCountElement = document.getElementById('hintCount');
    const timeCountElement = document.getElementById('timeCount');
    const shuffleCountElement = document.getElementById('shuffleCount');
    
    // 游戏参数
    const ROWS = 8;
    const COLS = 8;
    const TILE_TYPES = ['🍎', '🍌', '🍇', '🍓', '🍒', '🍉', '🍊', '🥝', '🥭', '🍍', '🍋', '🍐', '🥥', '🍈', '🍑', '🥑'];
    
    // 游戏状态
    let board = [];
    let selectedTile = null;
    let score = 0;
    let timeLeft = 6000;
    let gameStarted = false;
    let timer = null;
    let matchedCount = 0;
    let hintTimeout = null;
    let hintCount = 3;
    let timeCount = 2;
    let shuffleCount = 1;
    let validPairs = [];
    
    // 初始化游戏
    function initGame() {
        board = [];
        gameBoard.innerHTML = '';
        selectedTile = null;
        score = 0;
        timeLeft = 6000;
        gameStarted = false;
        matchedCount = 0;
        validPairs = [];
        
        // 重置道具数量
        hintCount = 30000;
        timeCount = 20000;
        shuffleCount = 10000;
        hintCountElement.textContent = hintCount;
        timeCountElement.textContent = timeCount;
        shuffleCountElement.textContent = shuffleCount;
        
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        
        if (hintTimeout) {
            clearTimeout(hintTimeout);
            hintTimeout = null;
        }
        
        timeElement.textContent = timeLeft;
        scoreElement.textContent = score;
        gameMessage.textContent = '';
        
        gameBoard.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
        gameBoard.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
    }
    
    // 创建游戏棋盘
    function createBoard() {
        // 创建配对的图标数组
        let tiles = [];
        const pairsNeeded = (ROWS * COLS) / 2;
        
        for (let i = 0; i < pairsNeeded; i++) {
            const tileType = TILE_TYPES[i % TILE_TYPES.length];
            tiles.push(tileType, tileType);
        }
        
        // 洗牌算法
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        
        // 创建棋盘
        let tileIndex = 0;
        for (let row = 0; row < ROWS; row++) {
            board[row] = [];
            for (let col = 0; col < COLS; col++) {
                const tile = document.createElement('div');
                tile.className = 'tile';
                tile.textContent = tiles[tileIndex];
                tile.dataset.row = row;
                tile.dataset.col = col;
                
                tile.addEventListener('click', () => handleTileClick(row, col));
                
                // 添加初始动画
                tile.style.opacity = '0';
                tile.style.transform = 'scale(0.5)';
                
                gameBoard.appendChild(tile);
                board[row][col] = {
                    element: tile,
                    type: tiles[tileIndex],
                    matched: false
                };
                
                // 延迟显示每个方块，创造瀑布效果
                setTimeout(() => {
                    tile.style.opacity = '1';
                    tile.style.transform = 'scale(1)';
                }, (row * COLS + col) * 20);
                
                tileIndex++;
            }
        }
        
        // 初始检查可连接的对
        setTimeout(findAllValidPairs, (ROWS * COLS) * 20 + 100);
    }
    
    // 处理点击方块
    function handleTileClick(row, col) {
        if (!gameStarted || board[row][col].matched) {
            return;
        }
        
        const clickedTile = board[row][col];
        
        // 如果没有选中的方块，选择当前方块
        if (!selectedTile) {
            selectedTile = clickedTile;
            clickedTile.element.classList.add('selected');
            // 添加点击音效
            playSound('select');
            return;
        }
        
        // 如果点击已选择的方块，取消选择
        if (selectedTile === clickedTile) {
            selectedTile.element.classList.remove('selected');
            selectedTile = null;
            // 添加取消选择音效
            playSound('cancel');
            return;
        }
        
        // 检查两个方块是否相同
        if (selectedTile.type === clickedTile.type) {
            // 检查是否可以连接
            const path = findPath(
                parseInt(selectedTile.element.dataset.row), 
                parseInt(selectedTile.element.dataset.col), 
                row, 
                col
            );
            
            if (path) {
                // 匹配成功
                selectedTile.element.classList.remove('selected');
                selectedTile.element.classList.add('matched');
                clickedTile.element.classList.add('matched');
                
                selectedTile.matched = true;
                clickedTile.matched = true;
                
                // 显示连接路径
                showPath(path);
                
                // 播放匹配成功音效
                playSound('match');
                
                // 更新分数
                score += 10;
                scoreElement.textContent = score;
                
                // 显示加分动画
                showScoreAnimation(row, col, '+10');
                
                // 检查是否所有方块都匹配
                matchedCount += 2;
                if (matchedCount === ROWS * COLS) {
                    endGame(true);
                } else {
                    // 重新计算有效配对
                    findAllValidPairs();
                    
                    // 如果没有有效配对，自动使用洗牌
                    if (validPairs.length === 0) {
                        if (shuffleCount > 0) {
                            shuffleBoard();
                        } else {
                            gameMessage.textContent = '没有可连接的方块了！游戏结束！';
                            endGame(false);
                        }
                    }
                }
                
                selectedTile = null;
            } else {
                // 无法连接
                selectedTile.element.classList.remove('selected');
                selectedTile = clickedTile;
                clickedTile.element.classList.add('selected');
                
                // 播放无法连接音效
                playSound('error');
            }
        } else {
            // 类型不同
            selectedTile.element.classList.remove('selected');
            selectedTile = clickedTile;
            clickedTile.element.classList.add('selected');
            
            // 播放选择音效
            playSound('select');
        }
    }
    
    // 查找连接路径（最多两个拐点）
    function findPath(startRow, startCol, endRow, endCol) {
        // 如果是同一个方块，返回null
        if (startRow === endRow && startCol === endCol) {
            return null;
        }
        
        // 直接连接
        if (isDirectlyConnectable(startRow, startCol, endRow, endCol)) {
            return [
                { row: startRow, col: startCol },
                { row: endRow, col: endCol }
            ];
        }
        
        // 一个拐点
        const oneCornerPath = findOneCornerPath(startRow, startCol, endRow, endCol);
        if (oneCornerPath) return oneCornerPath;
        
        // 两个拐点
        return findTwoCornerPath(startRow, startCol, endRow, endCol);
    }
    
    // 查找所有可连接的配对
    function findAllValidPairs() {
        validPairs = [];
        
        for (let row1 = 0; row1 < ROWS; row1++) {
            for (let col1 = 0; col1 < COLS; col1++) {
                if (board[row1][col1].matched) continue;
                
                for (let row2 = 0; row2 < ROWS; row2++) {
                    for (let col2 = 0; col2 < COLS; col2++) {
                        // 跳过同一个方块或已匹配的方块
                        if ((row1 === row2 && col1 === col2) || board[row2][col2].matched) continue;
                        
                        // 如果类型相同且可以连接
                        if (board[row1][col1].type === board[row2][col2].type && 
                            findPath(row1, col1, row2, col2)) {
                            validPairs.push({
                                start: { row: row1, col: col1 },
                                end: { row: row2, col: col2 }
                            });
                        }
                    }
                }
            }
        }
    }
    
    // 检查两个方块是否可以直接相连（同行或同列且中间没有障碍物）
    function isDirectlyConnectable(row1, col1, row2, col2) {
        // 如果不在同一行也不在同一列，返回false
        if (row1 !== row2 && col1 !== col2) {
            return false;
        }
        
        if (row1 === row2) {
            // 同一行
            const minCol = Math.min(col1, col2);
            const maxCol = Math.max(col1, col2);
            
            // 检查中间是否有方块
            for (let col = minCol + 1; col < maxCol; col++) {
                if (!board[row1][col].matched) {
                    return false;
                }
            }
            
            return true;
        } else {
            // 同一列
            const minRow = Math.min(row1, row2);
            const maxRow = Math.max(row1, row2);
            
            // 检查中间是否有方块
            for (let row = minRow + 1; row < maxRow; row++) {
                if (!board[row][col1].matched) {
                    return false;
                }
            }
            
            return true;
        }
    }
    
    // 查找一个拐点的路径
    function findOneCornerPath(row1, col1, row2, col2) {
        // 尝试通过拐点 (row1, col2)
        const corner1 = { row: row1, col: col2 };
        if (board[corner1.row][corner1.col].matched || 
            (corner1.row === row2 && corner1.col === col1)) {
            if (isDirectlyConnectable(row1, col1, corner1.row, corner1.col) && 
                isDirectlyConnectable(corner1.row, corner1.col, row2, col2)) {
                return [
                    { row: row1, col: col1 },
                    { row: corner1.row, col: corner1.col },
                    { row: row2, col: col2 }
                ];
            }
        }
        
        // 尝试通过拐点 (row2, col1)
        const corner2 = { row: row2, col: col1 };
        if (board[corner2.row][corner2.col].matched || 
            (corner2.row === row1 && corner2.col === col2)) {
            if (isDirectlyConnectable(row1, col1, corner2.row, corner2.col) && 
                isDirectlyConnectable(corner2.row, corner2.col, row2, col2)) {
                return [
                    { row: row1, col: col1 },
                    { row: corner2.row, col: corner2.col },
                    { row: row2, col: col2 }
                ];
            }
        }
        
        return null;
    }
    
    // 查找两个拐点的路径
    function findTwoCornerPath(row1, col1, row2, col2) {
        // 检查可能的拐点路径
        for (let row = 0; row < ROWS; row++) {
            // 尝试通过拐点 (row, col1) 和 (row, col2)
            if (row !== row1 && row !== row2 && 
                (board[row][col1].matched || (row === row2 && col1 === col2)) && 
                (board[row][col2].matched || (row === row1 && col1 === col2))) {
                
                if (isDirectlyConnectable(row1, col1, row, col1) && 
                    isDirectlyConnectable(row, col1, row, col2) && 
                    isDirectlyConnectable(row, col2, row2, col2)) {
                    return [
                        { row: row1, col: col1 },
                        { row: row, col: col1 },
                        { row: row, col: col2 },
                        { row: row2, col: col2 }
                    ];
                }
            }
        }
        
        for (let col = 0; col < COLS; col++) {
            // 尝试通过拐点 (row1, col) 和 (row2, col)
            if (col !== col1 && col !== col2 && 
                (board[row1][col].matched || (row1 === row2 && col === col2)) && 
                (board[row2][col].matched || (row2 === row1 && col === col1))) {
                
                if (isDirectlyConnectable(row1, col1, row1, col) && 
                    isDirectlyConnectable(row1, col, row2, col) && 
                    isDirectlyConnectable(row2, col, row2, col2)) {
                    return [
                        { row: row1, col: col1 },
                        { row: row1, col: col },
                        { row: row2, col: col },
                        { row: row2, col: col2 }
                    ];
                }
            }
        }
        
        return null;
    }
    
    // 显示连接路径
    function showPath(path) {
        // 设置短暂显示连接路径的动画
        const pathElements = [];
        
        for (let i = 0; i < path.length - 1; i++) {
            const start = path[i];
            const end = path[i + 1];
            
            const pathElement = document.createElement('div');
            pathElement.className = 'path';
            
            if (start.row === end.row) {
                // 水平线
                const minCol = Math.min(start.col, end.col);
                const width = Math.abs(start.col - end.col) + 1;
                
                pathElement.style.left = `${minCol * (100 / COLS)}%`;
                pathElement.style.top = `${(start.row + 0.4) * (100 / ROWS)}%`;
                pathElement.style.width = `${width * (100 / COLS)}%`;
                pathElement.style.height = '20%';
            } else if (start.col === end.col) {
                // 垂直线
                const minRow = Math.min(start.row, end.row);
                const height = Math.abs(start.row - end.row) + 1;
                
                pathElement.style.left = `${(start.col + 0.4) * (100 / COLS)}%`;
                pathElement.style.top = `${minRow * (100 / ROWS)}%`;
                pathElement.style.width = '20%';
                pathElement.style.height = `${height * (100 / ROWS)}%`;
            }
            
            gameBoard.appendChild(pathElement);
            pathElements.push(pathElement);
        }
        
        // 短暂显示后移除
        setTimeout(() => {
            pathElements.forEach(el => el.remove());
        }, 300);
    }
    
    // 显示加分动画
    function showScoreAnimation(row, col, text) {
        const scoreAnimation = document.createElement('div');
        scoreAnimation.textContent = text;
        scoreAnimation.style.position = 'absolute';
        scoreAnimation.style.left = `${(col + 0.5) * (100 / COLS)}%`;
        scoreAnimation.style.top = `${(row) * (100 / ROWS)}%`;
        scoreAnimation.style.color = '#FF4081';
        scoreAnimation.style.fontWeight = 'bold';
        scoreAnimation.style.fontSize = '24px';
        scoreAnimation.style.zIndex = '10';
        scoreAnimation.style.pointerEvents = 'none';
        scoreAnimation.style.transform = 'translate(-50%, -50%)';
        scoreAnimation.style.animation = 'scoreAnimation 1s forwards';
        
        const keyframes = `
            @keyframes scoreAnimation {
                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                10% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                70% { transform: translate(-50%, -150%) scale(1); opacity: 1; }
                100% { transform: translate(-50%, -200%) scale(0.8); opacity: 0; }
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = keyframes;
        document.head.appendChild(style);
        
        gameBoard.appendChild(scoreAnimation);
        
        setTimeout(() => {
            scoreAnimation.remove();
            style.remove();
        }, 1000);
    }
    
    // 开始计时器
    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            timeElement.textContent = timeLeft;
            
            // 当剩余时间低于10秒时，显示红色并闪烁
            if (timeLeft <= 10) {
                timeElement.style.color = '#ff0000';
                if (timeLeft % 2 === 0) {
                    timeElement.style.fontSize = '1.2em';
                } else {
                    timeElement.style.fontSize = '1em';
                }
            }
            
            if (timeLeft <= 0) {
                endGame(false);
            }
        }, 1000);
    }
    
    // 结束游戏
    function endGame(isWin) {
        gameStarted = false;
        clearInterval(timer);
        
        // 清除提示
        if (hintTimeout) {
            clearTimeout(hintTimeout);
            hintTimeout = null;
        }
        
        // 移除所有提示样式
        document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
        
        if (isWin) {
            gameMessage.textContent = '🎉 恭喜你赢了！ 🎉';
            gameMessage.style.color = '#2ecc71';
            playSound('win');
            
            // 胜利动画
            const confetti = createConfetti();
            setTimeout(() => confetti.remove(), 3000);
        } else {
            gameMessage.textContent = '⏱️ 时间到，游戏结束！';
            gameMessage.style.color = '#e74c3c';
            playSound('lose');
        }
        
        // 显示最终得分
        showFinalScore();
    }
    
    // 显示最终得分
    function showFinalScore() {
        const finalScore = document.createElement('div');
        finalScore.className = 'final-score';
        finalScore.innerHTML = `
            <h2>最终得分</h2>
            <p class="score-value">${score}</p>
            <p class="score-time">用时: ${60 - timeLeft} 秒</p>
            <p class="score-matches">消除对数: ${matchedCount / 2}</p>
        `;
        finalScore.style.position = 'absolute';
        finalScore.style.top = '50%';
        finalScore.style.left = '50%';
        finalScore.style.transform = 'translate(-50%, -50%)';
        finalScore.style.background = 'white';
        finalScore.style.padding = '20px';
        finalScore.style.borderRadius = '10px';
        finalScore.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
        finalScore.style.zIndex = '100';
        finalScore.style.textAlign = 'center';
        finalScore.style.animation = 'fadeIn 0.5s';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.className = 'cute-button';
        closeButton.style.marginTop = '15px';
        closeButton.addEventListener('click', () => {
            finalScore.remove();
        });
        
        finalScore.appendChild(closeButton);
        document.body.appendChild(finalScore);
    }
    
    // 创建胜利时的五彩纸屑
    function createConfetti() {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-container';
        confetti.style.position = 'fixed';
        confetti.style.top = '0';
        confetti.style.left = '0';
        confetti.style.width = '100%';
        confetti.style.height = '100%';
        confetti.style.pointerEvents = 'none';
        confetti.style.zIndex = '1000';
        
        // 添加100个纸屑片
        for (let i = 0; i < 100; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            
            // 随机颜色
            const colors = ['#ff4081', '#4caf50', '#2196f3', '#ffeb3b', '#ff9800', '#9c27b0'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            piece.style.position = 'absolute';
            piece.style.width = `${5 + Math.random() * 10}px`;
            piece.style.height = `${5 + Math.random() * 10}px`;
            piece.style.backgroundColor = color;
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.top = `-20px`;
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            
            // 随机下落动画
            piece.style.animation = `
                confettiFall ${3 + Math.random() * 5}s linear forwards,
                confettiRotate ${Math.random() > 0.5 ? '' : '-'}${0.5 + Math.random() * 2}s linear infinite
            `;
            
            const keyframes = `
                @keyframes confettiFall {
                    to { transform: translateY(${window.innerHeight}px); }
                }
                @keyframes confettiRotate {
                    to { transform: rotate(360deg); }
                }
            `;
            
            const style = document.createElement('style');
            style.textContent = keyframes;
            document.head.appendChild(style);
            
            confetti.appendChild(piece);
        }
        
        document.body.appendChild(confetti);
        return confetti;
    }
    
    // 洗牌功能
    function shuffleBoard() {
        if (!gameStarted || shuffleCount <= 0) return;
        
        const remainingTiles = [];
        let remainingPositions = [];
        
        // 收集剩余未匹配的方块和位置
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                if (!board[row][col].matched) {
                    remainingTiles.push(board[row][col].type);
                    remainingPositions.push({ row, col });
                }
            }
        }
        
        // 洗牌
        for (let i = remainingTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remainingTiles[i], remainingTiles[j]] = [remainingTiles[j], remainingTiles[i]];
        }
        
        // 标记所有方块为洗牌动画
        remainingPositions.forEach(pos => {
            board[pos.row][pos.col].element.classList.add('shuffle-animation');
        });
        
        // 更新所有方块
        setTimeout(() => {
            for (let i = 0; i < remainingTiles.length; i++) {
                const pos = remainingPositions[i];
                board[pos.row][pos.col].type = remainingTiles[i];
                board[pos.row][pos.col].element.textContent = remainingTiles[i];
                board[pos.row][pos.col].element.classList.remove('shuffle-animation');
            }
            
            // 减少洗牌道具数量
            shuffleCount--;
            shuffleCountElement.textContent = shuffleCount;
            
            // 重新计算有效配对
            findAllValidPairs();
            
            // 播放洗牌音效
            playSound('shuffle');
            
            // 显示洗牌消息
            gameMessage.textContent = '已重新洗牌！';
            gameMessage.style.color = '#2196f3';
            setTimeout(() => {
                if (gameStarted) gameMessage.textContent = '';
            }, 1500);
        }, 500);
    }
    
    // 提示功能
    function showHint() {
        if (!gameStarted || hintCount <= 0 || validPairs.length === 0) return;
        
        // 清除之前的提示
        document.querySelectorAll('.hint').forEach(el => el.classList.remove('hint'));
        
        // 随机选择一对可连接的方块
        const randomPair = validPairs[Math.floor(Math.random() * validPairs.length)];
        
        // 高亮显示这对方块
        const startTile = board[randomPair.start.row][randomPair.start.col].element;
        const endTile = board[randomPair.end.row][randomPair.end.col].element;
        
        startTile.classList.add('hint');
        endTile.classList.add('hint');
        
        // 5秒后移除提示
        if (hintTimeout) clearTimeout(hintTimeout);
        hintTimeout = setTimeout(() => {
            startTile.classList.remove('hint');
            endTile.classList.remove('hint');
            hintTimeout = null;
        }, 5000);
        
        // 减少提示道具数量
        hintCount--;
        hintCountElement.textContent = hintCount;
        
        // 播放提示音效
        playSound('hint');
    }
    
    // 增加时间功能
    function addTime() {
        if (!gameStarted || timeCount <= 0) return;
        
        // 增加10秒
        timeLeft += 10;
        timeElement.textContent = timeLeft;
        timeElement.classList.add('time-bonus');
        
        // 减少时间道具数量
        timeCount--;
        timeCountElement.textContent = timeCount;
        
        // 显示增加时间消息
        gameMessage.textContent = '时间 +10 秒！';
        gameMessage.style.color = '#4CAF50';
        setTimeout(() => {
            if (gameStarted) gameMessage.textContent = '';
            timeElement.classList.remove('time-bonus');
        }, 1500);
        
        // 播放增加时间音效
        playSound('time');
    }
    
    // 播放音效
    function playSound(type) {
        // 这里可以实现真实的音效，为简化暂时使用console.log
        console.log(`播放音效: ${type}`);
        
        // 如果要添加实际音效，可以用下面的代码
        /*
        const audio = new Audio();
        switch(type) {
            case 'select': audio.src = 'sounds/select.mp3'; break;
            case 'match': audio.src = 'sounds/match.mp3'; break;
            case 'hint': audio.src = 'sounds/hint.mp3'; break;
            case 'time': audio.src = 'sounds/time.mp3'; break;
            case 'shuffle': audio.src = 'sounds/shuffle.mp3'; break;
            case 'win': audio.src = 'sounds/win.mp3'; break;
            case 'lose': audio.src = 'sounds/lose.mp3'; break;
            case 'error': audio.src = 'sounds/error.mp3'; break;
            case 'cancel': audio.src = 'sounds/cancel.mp3'; break;
        }
        audio.play().catch(e => console.log('音效播放失败:', e));
        */
    }
    
    // 开始游戏按钮事件
    startButton.addEventListener('click', () => {
        if (!gameStarted) {
            initGame();
            createBoard();
            gameStarted = true;
            startTimer();
            playSound('start');
        }
    });
    
    // 重新开始按钮事件
    restartButton.addEventListener('click', () => {
        initGame();
        createBoard();
        gameStarted = true;
        startTimer();
        playSound('start');
    });
    
    // 道具按钮事件
    hintProp.addEventListener('click', showHint);
    timeProp.addEventListener('click', addTime);
    shuffleProp.addEventListener('click', shuffleBoard);
    
    // 初始化游戏
    initGame();
}); 