const GRID_SIZE = 8;
const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🍉'];

let board = [];
let score = 0;
let moves = 20;
let currentLevel = 1;
let targetScore = 500;
let highScore = 0;
let gameMode = 'level';
let isProcessing = false;
let soundEnabled = true;
let musicEnabled = true;
let customBackgroundData = null;

// Swipe detection variables
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let swipeStartTile = null;
let minSwipeDistance = 30;

// Audio elements
let audioContext;
let popSoundElement;
let backgroundMusicElement;
let musicStarted = false;

// Level configuration
const LEVEL_CONFIG = [
    { level: 1, moves: 20, target: 500, difficulty: 'easy' },
    { level: 2, moves: 20, target: 700, difficulty: 'easy' },
    { level: 3, moves: 18, target: 900, difficulty: 'medium' },
    { level: 4, moves: 18, target: 1100, difficulty: 'medium' },
    { level: 5, moves: 16, target: 1300, difficulty: 'medium' },
    { level: 6, moves: 16, target: 1500, difficulty: 'hard' },
    { level: 7, moves: 15, target: 1700, difficulty: 'hard' },
    { level: 8, moves: 15, target: 2000, difficulty: 'hard' },
    { level: 9, moves: 14, target: 2300, difficulty: 'expert' },
    { level: 10, moves: 14, target: 2600, difficulty: 'expert' }
];

// Initialize on page load
window.onload = function() {
    loadGameData();
    updateModeSelection();
    setupMenuAudioControls();
    loadBackgroundSettings();
    setupCustomBackgroundUpload();
};

// Load game data from localStorage
function loadGameData() {
    const savedLevel = localStorage.getItem('fruitMatchLevel');
    const savedHighScore = localStorage.getItem('fruitMatchHighScore');
    const savedSoundEnabled = localStorage.getItem('fruitMatchSoundEnabled');
    const savedMusicEnabled = localStorage.getItem('fruitMatchMusicEnabled');
    
    if (savedLevel) currentLevel = parseInt(savedLevel);
    if (savedHighScore) highScore = parseInt(savedHighScore);
    if (savedSoundEnabled !== null) soundEnabled = savedSoundEnabled === 'true';
    if (savedMusicEnabled !== null) musicEnabled = savedMusicEnabled === 'true';
}

// Save game data to localStorage
function saveGameData() {
    localStorage.setItem('fruitMatchLevel', currentLevel);
    localStorage.setItem('fruitMatchHighScore', highScore);
    localStorage.setItem('fruitMatchSoundEnabled', soundEnabled);
    localStorage.setItem('fruitMatchMusicEnabled', musicEnabled);
}

// Load background settings
function loadBackgroundSettings() {
    const savedBackground = localStorage.getItem('fruitMatchBackground');
    const savedCustomBg = localStorage.getItem('fruitMatchCustomBackground');
    
    if (savedBackground) {
        if (savedBackground === 'custom' && savedCustomBg) {
            applyCustomBackgroundFromStorage(savedCustomBg);
        } else {
            selectBackground(savedBackground);
        }
    }
}

// Save background settings
function saveBackgroundSettings(bgType, customData = null) {
    localStorage.setItem('fruitMatchBackground', bgType);
    if (customData) {
        localStorage.setItem('fruitMatchCustomBackground', customData);
    }
}

// Select background
function selectBackground(bgType) {
    const body = document.getElementById('mainBody');
    
    // Remove all background classes
    body.className = '';
    
    // Apply selected background
    body.classList.add('bg-' + bgType);
    
    // Remove custom background image if switching to default
    body.style.backgroundImage = '';
    
    saveBackgroundSettings(bgType);
}

// Setup custom background upload
function setupCustomBackgroundUpload() {
    const fileInput = document.getElementById('customBgInput');
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                customBackgroundData = event.target.result;
                
                // Show preview
                const preview = document.getElementById('customPreview');
                const previewImg = document.getElementById('customPreviewImg');
                
                previewImg.src = customBackgroundData;
                preview.style.display = 'block';
            };
            
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }
    });
}

// Apply custom background
function applyCustomBackground() {
    if (!customBackgroundData) return;
    
    const body = document.getElementById('mainBody');
    
    // Remove all background classes
    body.className = '';
    
    // Apply custom background
    body.style.backgroundImage = `url(${customBackgroundData})`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
    
    saveBackgroundSettings('custom', customBackgroundData);
    
    closeBackgroundSettings();
}

// Apply custom background from storage
function applyCustomBackgroundFromStorage(imageData) {
    const body = document.getElementById('mainBody');
    
    body.className = '';
    body.style.backgroundImage = `url(${imageData})`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
    
    customBackgroundData = imageData;
}

// Remove custom background
function removeCustomBackground() {
    customBackgroundData = null;
    document.getElementById('customPreview').style.display = 'none';
    document.getElementById('customBgInput').value = '';
    localStorage.removeItem('fruitMatchCustomBackground');
}

// Open background settings
function openBackgroundSettings() {
    document.getElementById('backgroundModal').classList.add('active');
}

// Close background settings
function closeBackgroundSettings() {
    document.getElementById('backgroundModal').classList.remove('active');
}

// Update mode selection display
function updateModeSelection() {
    document.getElementById('currentLevelDisplay').textContent = currentLevel;
    document.getElementById('highScoreDisplay').textContent = highScore;
}

// Setup menu audio controls
function setupMenuAudioControls() {
    const musicToggleMenu = document.getElementById('musicToggleMenu');
    const sfxToggleMenu = document.getElementById('sfxToggleMenu');
    
    updateMenuButtonStates();
    
    musicToggleMenu.addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        updateMenuButtonStates();
        saveGameData();
        
        if (backgroundMusicElement) {
            if (musicEnabled && musicStarted) {
                backgroundMusicElement.play().catch(e => console.log('Music play failed:', e));
            } else {
                backgroundMusicElement.pause();
            }
        }
    });
    
    sfxToggleMenu.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        updateMenuButtonStates();
        saveGameData();
    });
}

// Update menu button states
function updateMenuButtonStates() {
    const musicToggleMenu = document.getElementById('musicToggleMenu');
    const sfxToggleMenu = document.getElementById('sfxToggleMenu');
    
    if (musicEnabled) {
        musicToggleMenu.textContent = '🎵 Music';
        musicToggleMenu.classList.remove('muted');
    } else {
        musicToggleMenu.textContent = '🔇 Music';
        musicToggleMenu.classList.add('muted');
    }
    
    if (soundEnabled) {
        sfxToggleMenu.textContent = '🔊 Effects';
        sfxToggleMenu.classList.remove('muted');
    } else {
        sfxToggleMenu.textContent = '🔇 Effects';
        sfxToggleMenu.classList.add('muted');
    }
}

// Select game mode
function selectMode(mode) {
    gameMode = mode;
    document.getElementById('modeSelection').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'block';
    
    if (mode === 'level') {
        initLevelMode();
    } else {
        initInfiniteMode();
    }
}

// Initialize level mode
function initLevelMode() {
    const levelData = getLevelConfig(currentLevel);
    moves = levelData.moves;
    targetScore = levelData.target;
    
    document.getElementById('gameTitle').textContent = `Level ${currentLevel}`;
    document.getElementById('movesContainer').style.display = 'block';
    document.getElementById('levelContainer').style.display = 'block';
    document.getElementById('targetContainer').style.display = 'block';
    document.getElementById('highScoreContainer').style.display = 'none';
    
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('target').textContent = targetScore;
    
    initGame();
}

// Initialize infinite mode
function initInfiniteMode() {
    moves = 0;
    targetScore = 0;
    
    document.getElementById('gameTitle').textContent = 'Infinite Mode';
    document.getElementById('movesContainer').style.display = 'none';
    document.getElementById('levelContainer').style.display = 'none';
    document.getElementById('targetContainer').style.display = 'none';
    document.getElementById('highScoreContainer').style.display = 'block';
    
    document.getElementById('highScore').textContent = highScore;
    
    initGame();
}

// Get level configuration
function getLevelConfig(level) {
    if (level <= LEVEL_CONFIG.length) {
        return LEVEL_CONFIG[level - 1];
    }
    const movesCount = Math.max(12, 20 - Math.floor(level / 2));
    const target = 500 + (level - 1) * 300;
    return { level, moves: movesCount, target, difficulty: 'expert' };
}

// Initialize game
function initGame() {
    board = [];
    score = 0;
    isProcessing = false;
    updateScore();
    createBoard();
    
    while (findMatches().length > 0) {
        removeMatches();
        fillBoard();
    }
    
    renderBoard();
    setupSwipeListeners();
    setupAudio();
    setupGameAudioControls();
    showMessage('Swipe to match fruits!');
}

// Setup audio
function setupAudio() {
    popSoundElement = document.getElementById('popSound');
    backgroundMusicElement = document.getElementById('backgroundMusic');
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    if (backgroundMusicElement) {
        backgroundMusicElement.volume = 0.3;
    }
    
    document.addEventListener('click', function initAudio() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        if (musicEnabled && backgroundMusicElement && !musicStarted) {
            backgroundMusicElement.play().catch(e => console.log('Music autoplay prevented:', e));
            musicStarted = true;
        }
        
        document.removeEventListener('click', initAudio);
    }, { once: true });
}

// Setup game audio controls
function setupGameAudioControls() {
    const musicToggle = document.getElementById('musicToggle');
    const sfxToggle = document.getElementById('sfxToggle');
    
    updateGameButtonStates();
    
    const newMusicToggle = musicToggle.cloneNode(true);
    const newSfxToggle = sfxToggle.cloneNode(true);
    musicToggle.parentNode.replaceChild(newMusicToggle, musicToggle);
    sfxToggle.parentNode.replaceChild(newSfxToggle, sfxToggle);
    
    document.getElementById('musicToggle').addEventListener('click', () => {
        musicEnabled = !musicEnabled;
        updateGameButtonStates();
        saveGameData();
        
        if (backgroundMusicElement) {
            if (musicEnabled) {
                backgroundMusicElement.play().catch(e => console.log('Music play failed:', e));
            } else {
                backgroundMusicElement.pause();
            }
        }
    });
    
    document.getElementById('sfxToggle').addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        updateGameButtonStates();
        saveGameData();
    });
}

// Update game button states
function updateGameButtonStates() {
    const musicToggle = document.getElementById('musicToggle');
    const sfxToggle = document.getElementById('sfxToggle');
    
    const musicIcon = musicToggle.querySelector('.icon');
    const sfxIcon = sfxToggle.querySelector('.icon');
    
    if (musicEnabled) {
        musicIcon.textContent = '🎵';
        musicToggle.classList.remove('muted');
    } else {
        musicIcon.textContent = '🔇';
        musicToggle.classList.add('muted');
    }
    
    if (soundEnabled) {
        sfxIcon.textContent = '🔊';
        sfxToggle.classList.remove('muted');
    } else {
        sfxIcon.textContent = '🔇';
        sfxToggle.classList.add('muted');
    }
}

// Play pop sound
function playPopSound() {
    if (!soundEnabled) return;
    
    if (popSoundElement && popSoundElement.readyState >= 2) {
        popSoundElement.currentTime = 0;
        popSoundElement.play().catch(() => {
            playGeneratedPop();
        });
    } else {
        playGeneratedPop();
    }
}

// Generate pop sound with Web Audio API
function playGeneratedPop() {
    if (!audioContext || !soundEnabled) return;
    
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.type = 'sine';
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
        console.log('Audio playback failed:', error);
    }
}

// Create initial board
function createBoard() {
    for (let row = 0; row < GRID_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            board[row][col] = getRandomFruit();
        }
    }
}

// Get random fruit
function getRandomFruit() {
    return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

// Render board
function renderBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.textContent = board[row][col];
            tile.dataset.row = row;
            tile.dataset.col = col;
            gameBoard.appendChild(tile);
        }
    }
}

// Setup swipe listeners
function setupSwipeListeners() {
    const gameBoard = document.getElementById('gameBoard');
    
    gameBoard.addEventListener('touchstart', handleTouchStart, false);
    gameBoard.addEventListener('touchmove', handleTouchMove, false);
    gameBoard.addEventListener('touchend', handleTouchEnd, false);
    
    gameBoard.addEventListener('mousedown', handleMouseDown, false);
    gameBoard.addEventListener('mousemove', handleMouseMove, false);
    gameBoard.addEventListener('mouseup', handleMouseUp, false);
}

// Handle touch start
function handleTouchStart(e) {
    if (isProcessing || (gameMode === 'level' && moves <= 0)) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.classList.contains('tile')) {
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        swipeStartTile = {
            row: parseInt(element.dataset.row),
            col: parseInt(element.dataset.col),
            element: element
        };
        element.classList.add('swiping');
    }
    
    e.preventDefault();
}

// Handle touch move
function handleTouchMove(e) {
    if (!swipeStartTile) return;
    
    const touch = e.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    
    e.preventDefault();
}

// Handle touch end
function handleTouchEnd(e) {
    if (!swipeStartTile) return;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    swipeStartTile.element.classList.remove('swiping');
    
    if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
        let targetTile = null;
        
        if (Math.abs(diffX) > Math.abs(diffY)) {
            if (diffX > 0 && swipeStartTile.col < GRID_SIZE - 1) {
                targetTile = { row: swipeStartTile.row, col: swipeStartTile.col + 1 };
            } else if (diffX < 0 && swipeStartTile.col > 0) {
                targetTile = { row: swipeStartTile.row, col: swipeStartTile.col - 1 };
            }
        } else {
            if (diffY > 0 && swipeStartTile.row < GRID_SIZE - 1) {
                targetTile = { row: swipeStartTile.row + 1, col: swipeStartTile.col };
            } else if (diffY < 0 && swipeStartTile.row > 0) {
                targetTile = { row: swipeStartTile.row - 1, col: swipeStartTile.col };
            }
        }
        
        if (targetTile) {
            swapTiles(swipeStartTile, targetTile);
        }
    }
    
    swipeStartTile = null;
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;
    
    e.preventDefault();
}

// Mouse handlers
function handleMouseDown(e) {
    if (isProcessing || (gameMode === 'level' && moves <= 0)) return;
    
    const element = e.target;
    
    if (element && element.classList.contains('tile')) {
        touchStartX = e.clientX;
        touchStartY = e.clientY;
        swipeStartTile = {
            row: parseInt(element.dataset.row),
            col: parseInt(element.dataset.col),
            element: element
        };
        element.classList.add('swiping');
    }
}

function handleMouseMove(e) {
    if (!swipeStartTile) return;
    touchEndX = e.clientX;
    touchEndY = e.clientY;
}

function handleMouseUp(e) {
    handleTouchEnd(e);
}

// Swap tiles
function swapTiles(tile1, tile2) {
    isProcessing = true;
    
    const temp = board[tile1.row][tile1.col];
    board[tile1.row][tile1.col] = board[tile2.row][tile2.col];
    board[tile2.row][tile2.col] = temp;
    
    renderBoard();
    
    setTimeout(() => {
        const matches = findMatches();
        
        if (matches.length > 0) {
            if (gameMode === 'level') {
                moves--;
            }
            updateScore();
            processMatches();
        } else {
            const temp = board[tile1.row][tile1.col];
            board[tile1.row][tile1.col] = board[tile2.row][tile2.col];
            board[tile2.row][tile2.col] = temp;
            renderBoard();
            showMessage('No matches! Try again');
            isProcessing = false;
        }
        
        checkGameStatus();
    }, 300);
}

// Find matches
function findMatches() {
    const matches = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE - 2; col++) {
            const fruit = board[row][col];
            if (fruit && board[row][col + 1] === fruit && board[row][col + 2] === fruit) {
                let matchLength = 3;
                while (col + matchLength < GRID_SIZE && board[row][col + matchLength] === fruit) {
                    matchLength++;
                }
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row, col: col + i });
                }
                col += matchLength - 1;
            }
        }
    }
    
    for (let col = 0; col < GRID_SIZE; col++) {
        for (let row = 0; row < GRID_SIZE - 2; row++) {
            const fruit = board[row][col];
            if (fruit && board[row + 1][col] === fruit && board[row + 2][col] === fruit) {
                let matchLength = 3;
                while (row + matchLength < GRID_SIZE && board[row + matchLength][col] === fruit) {
                    matchLength++;
                }
                for (let i = 0; i < matchLength; i++) {
                    matches.push({ row: row + i, col });
                }
                row += matchLength - 1;
            }
        }
    }
    
    return matches.filter((match, index, self) =>
        index === self.findIndex(m => m.row === match.row && m.col === match.col)
    );
}

// Process matches
function processMatches() {
    const matches = findMatches();
    
    if (matches.length === 0) {
        isProcessing = false;
        return;
    }
    
    playPopSound();
    
    matches.forEach(match => {
        const index = match.row * GRID_SIZE + match.col;
        const tiles = document.querySelectorAll('.tile');
        tiles[index].classList.add('matched');
    });
    
    score += matches.length * 10;
    updateScore();
    showMessage(`+${matches.length * 10} points!`);
    
    setTimeout(() => {
        removeMatches();
        fillBoard();
        renderBoard();
        
        setTimeout(() => {
            processMatches();
        }, 300);
    }, 500);
}

// Remove matches
function removeMatches() {
    const matches = findMatches();
    matches.forEach(match => {
        board[match.row][match.col] = null;
    });
}

// Fill board
function fillBoard() {
    for (let col = 0; col < GRID_SIZE; col++) {
        let emptyRow = GRID_SIZE - 1;
        for (let row = GRID_SIZE - 1; row >= 0; row--) {
            if (board[row][col] !== null) {
                if (row !== emptyRow) {
                    board[emptyRow][col] = board[row][col];
                    board[row][col] = null;
                }
                emptyRow--;
            }
        }
    }
    
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (board[row][col] === null) {
                board[row][col] = getRandomFruit();
            }
        }
    }
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = score;
    if (gameMode === 'level') {
        document.getElementById('moves').textContent = moves;
    }
    
    if (gameMode === 'infinite' && score > highScore) {
        highScore = score;
        document.getElementById('highScore').textContent = highScore;
        saveGameData();
    }
}

// Show message
function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    setTimeout(() => {
        if (messageEl.textContent === text) {
            messageEl.textContent = '';
        }
    }, 2000);
}

// Check game status
function checkGameStatus() {
    if (gameMode === 'level' && moves <= 0) {
        if (score >= targetScore) {
            showLevelComplete();
        } else {
            showGameOver('Not enough points! Try again.');
        }
    }
}

// Show level complete modal
function showLevelComplete() {
    document.getElementById('modalScore').textContent = score;
    document.getElementById('modalLevel').textContent = currentLevel;
    document.getElementById('levelCompleteModal').classList.add('active');
    
    currentLevel++;
    saveGameData();
}

// Show game over modal
function showGameOver(message) {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverModal').classList.add('active');
}

// Next level
function nextLevel() {
    document.getElementById('levelCompleteModal').classList.remove('active');
    initLevelMode();
}

// Reset game
function resetGame() {
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
    
    if (gameMode === 'level') {
        initLevelMode();
    } else {
        score = 0;
        initInfiniteMode();
    }
}

// Back to menu
function backToMenu() {
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('modeSelection').style.display = 'block';
    updateModeSelection();
}

// Shuffle board
function shuffle() {
    if (gameMode === 'level' && moves <= 0) return;
    
    const fruits = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            fruits.push(board[row][col]);
        }
    }
    
    for (let i = fruits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fruits[i], fruits[j]] = [fruits[j], fruits[i]];
    }
    
    let index = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            board[row][col] = fruits[index++];
        }
    }
    
    renderBoard();
    showMessage('Board shuffled!');
}