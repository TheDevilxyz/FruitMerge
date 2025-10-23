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
let transparentMode = false;
let extractedColors = null;
let selectedColorIndex = 0;

// Swipe detection
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let swipeStartTile = null;
let minSwipeDistance = 30;

// Audio
let audioContext;
let popSoundElement;
let backgroundMusicElement;
let musicStarted = false;

const LEVEL_CONFIG = [
    { level: 1, moves: 20, target: 500 },
    { level: 2, moves: 20, target: 700 },
    { level: 3, moves: 18, target: 900 },
    { level: 4, moves: 18, target: 1100 },
    { level: 5, moves: 16, target: 1300 },
    { level: 6, moves: 16, target: 1500 },
    { level: 7, moves: 15, target: 1700 },
    { level: 8, moves: 15, target: 2000 },
    { level: 9, moves: 14, target: 2300 },
    { level: 10, moves: 14, target: 2600 }
];

// Initialize
window.onload = function() {
    loadGameData();
    updateModeSelection();
    setupMenuAudioControls();
    loadBackgroundSettings();
    setupCustomBackgroundUpload();
    setupRippleEffect();
};

// Ripple Effect
function setupRippleEffect() {
    document.addEventListener('click', function(e) {
        const target = e.target.closest('.ripple');
        if (!target) return;
        
        const ripple = document.createElement('span');
        ripple.classList.add('ripple-effect');
        
        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';
        
        target.appendChild(ripple);
        
        // Play click sound
        playClickSound();
        
        setTimeout(() => ripple.remove(), 600);
    });
}

// Click Sound
function playClickSound() {
    if (!soundEnabled) return;
    
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 1000;
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.05);
    } catch (error) {
        console.log('Click sound failed:', error);
    }
}

// Color Extraction
function extractColorsFromImage(imgElement) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const MAX_SIZE = 150;
        let width = imgElement.naturalWidth || imgElement.width;
        let height = imgElement.naturalHeight || imgElement.height;
        
        if (width > height) {
            if (width > MAX_SIZE) {
                height = height * (MAX_SIZE / width);
                width = MAX_SIZE;
            }
        } else {
            if (height > MAX_SIZE) {
                width = width * (MAX_SIZE / height);
                height = MAX_SIZE;
            }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        ctx.drawImage(imgElement, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const colorMap = {};
        
        for (let i = 0; i < pixels.length; i += 20) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            if (a < 125) continue;
            
            const rBucket = Math.floor(r / 40) * 40;
            const gBucket = Math.floor(g / 40) * 40;
            const bBucket = Math.floor(b / 40) * 40;
            
            const key = `${rBucket},${gBucket},${bBucket}`;
            colorMap[key] = (colorMap[key] || 0) + 1;
        }
        
        const sortedColors = Object.entries(colorMap)
            .sort((a, b) => b[1] - a[1])
            .map(([color]) => {
                const [r, g, b] = color.split(',').map(Number);
                return { r, g, b };
            });
        
        const selectedColors = [sortedColors[0]];
        for (let i = 1; i < sortedColors.length && selectedColors.length < 6; i++) {
            const color = sortedColors[i];
            const isDifferent = selectedColors.every(sc => {
                const diff = Math.abs(sc.r - color.r) + Math.abs(sc.g - color.g) + Math.abs(sc.b - color.b);
                return diff > 120;
            });
            if (isDifferent) {
                selectedColors.push(color);
            }
        }
        
        resolve(selectedColors.slice(0, 6));
    });
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function generateMaterialPalette(baseColor) {
    const darken = (color, amount = 0.2) => ({
        r: Math.max(0, Math.floor(color.r * (1 - amount))),
        g: Math.max(0, Math.floor(color.g * (1 - amount))),
        b: Math.max(0, Math.floor(color.b * (1 - amount)))
    });
    
    const lighten = (color, amount = 0.3) => ({
        r: Math.min(255, Math.floor(color.r + (255 - color.r) * amount)),
        g: Math.min(255, Math.floor(color.g + (255 - color.g) * amount)),
        b: Math.min(255, Math.floor(color.b + (255 - color.b) * amount))
    });
    
    const secondary = {
        r: Math.min(255, Math.max(0, baseColor.r + 60)),
        g: Math.max(0, baseColor.g - 30),
        b: Math.min(255, baseColor.b + 80)
    };
    
    return {
        primary: rgbToHex(baseColor.r, baseColor.g, baseColor.b),
        primaryDark: rgbToHex(...Object.values(darken(baseColor, 0.2))),
        secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
        secondaryDark: rgbToHex(...Object.values(darken(secondary, 0.2))),
        tertiary: rgbToHex(...Object.values(lighten(secondary, 0.2)))
    };
}

function applyMaterialColors(palette) {
    if (!palette) return;
    
    const root = document.documentElement;
    root.style.setProperty('--md-primary', palette.primary);
    root.style.setProperty('--md-primary-dark', palette.primaryDark);
    root.style.setProperty('--md-secondary', palette.secondary);
    root.style.setProperty('--md-secondary-dark', palette.secondaryDark);
    root.style.setProperty('--md-tertiary', palette.tertiary);
}

function displayColorPalette(colors) {
    const paletteGrid = document.getElementById('colorPaletteGrid');
    if (!paletteGrid || !colors || colors.length === 0) return;
    
    paletteGrid.innerHTML = '';
    
    colors.forEach((color, index) => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch ripple';
        const hexColor = rgbToHex(color.r, color.g, color.b);
        swatch.style.backgroundColor = hexColor;
        swatch.title = hexColor;
        
        if (index === selectedColorIndex) {
            swatch.classList.add('selected');
        }
        
        swatch.onclick = function(e) {
            e.stopPropagation();
            applyColorTheme(color, index);
            
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
        };
        
        paletteGrid.appendChild(swatch);
    });
}

function applyColorTheme(color, index) {
    selectedColorIndex = index;
    const palette = generateMaterialPalette(color);
    applyMaterialColors(palette);
    localStorage.setItem('fruitMatchSelectedColor', JSON.stringify(color));
    localStorage.setItem('fruitMatchSelectedColorIndex', index);
}

// Load/Save Data
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

function saveGameData() {
    localStorage.setItem('fruitMatchLevel', currentLevel);
    localStorage.setItem('fruitMatchHighScore', highScore);
    localStorage.setItem('fruitMatchSoundEnabled', soundEnabled);
    localStorage.setItem('fruitMatchMusicEnabled', musicEnabled);
}

function loadBackgroundSettings() {
    const savedBackground = localStorage.getItem('fruitMatchBackground');
    const savedCustomBg = localStorage.getItem('fruitMatchCustomBackground');
    const savedColors = localStorage.getItem('fruitMatchExtractedColors');
    const savedSelectedColor = localStorage.getItem('fruitMatchSelectedColor');
    const savedColorIndex = localStorage.getItem('fruitMatchSelectedColorIndex');
    
    if (savedBackground === 'custom' && savedCustomBg) {
        if (savedColors) {
            extractedColors = JSON.parse(savedColors);
        }
        if (savedColorIndex) {
            selectedColorIndex = parseInt(savedColorIndex);
        }
        applyCustomBackgroundFromStorage(savedCustomBg);
        
        if (savedSelectedColor) {
            const color = JSON.parse(savedSelectedColor);
            applyColorTheme(color, selectedColorIndex);
        }
    } else if (savedBackground) {
        selectBackground(savedBackground);
    }
}

function saveBackgroundSettings(bgType, customData = null, colors = null) {
    localStorage.setItem('fruitMatchBackground', bgType);
    if (customData) {
        localStorage.setItem('fruitMatchCustomBackground', customData);
    }
    if (colors) {
        localStorage.setItem('fruitMatchExtractedColors', JSON.stringify(colors));
    }
}

// Transparent Mode
function enableTransparentMode() {
    transparentMode = true;
    document.getElementById('mainBody').classList.add('transparent-mode');
}

function disableTransparentMode() {
    transparentMode = false;
    document.getElementById('mainBody').classList.remove('transparent-mode');
    
    const root = document.documentElement;
    root.style.setProperty('--md-primary', '#667eea');
    root.style.setProperty('--md-primary-dark', '#5568d3');
    root.style.setProperty('--md-secondary', '#f093fb');
    root.style.setProperty('--md-secondary-dark', '#d47fe3');
    root.style.setProperty('--md-tertiary', '#f5576c');
}

// Background Selection
function selectBackground(bgType) {
    const body = document.getElementById('mainBody');
    body.className = '';
    disableTransparentMode();
    body.classList.add('bg-' + bgType);
    body.style.backgroundImage = '';
    
    localStorage.removeItem('fruitMatchSelectedColor');
    localStorage.removeItem('fruitMatchSelectedColorIndex');
    
    saveBackgroundSettings(bgType);
    closeBackgroundSettings();
}

// Custom Background Upload
function setupCustomBackgroundUpload() {
    const fileInput = document.getElementById('customBgInput');
    
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        
        if (file && file.type.startsWith('image/')) {
            if (file.size > 10 * 1024 * 1024) {
                alert('Image is too large. Please choose an image smaller than 10MB.');
                return;
            }
            
            const reader = new FileReader();
            
            reader.onload = async function(event) {
                customBackgroundData = event.target.result;
                
                const previewImg = document.getElementById('previewImage');
                const previewSection = document.getElementById('imagePreviewSection');
                
                previewImg.src = customBackgroundData;
                previewSection.style.display = 'block';
                
                previewImg.onload = async function() {
                    try {
                        const colors = await extractColorsFromImage(previewImg);
                        extractedColors = colors;
                        displayColorPalette(colors);
                        
                        if (colors && colors.length > 0) {
                            applyColorTheme(colors[0], 0);
                        }
                    } catch (error) {
                        console.error('Color extraction failed:', error);
                    }
                };
            };
            
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }
    });
}

function openCustomBackgroundUpload() {
    closeBackgroundSettings();
    document.getElementById('customUploadModal').classList.add('active');
}

function closeCustomUpload() {
    document.getElementById('customUploadModal').classList.remove('active');
}

function applyCustomWallpaper() {
    if (!customBackgroundData) return;
    
    const body = document.getElementById('mainBody');
    body.className = '';
    body.style.backgroundImage = `url(${customBackgroundData})`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
    
    enableTransparentMode();
    saveBackgroundSettings('custom', customBackgroundData, extractedColors);
    closeCustomUpload();
}

function applyCustomBackgroundFromStorage(imageData) {
    const body = document.getElementById('mainBody');
    body.className = '';
    body.style.backgroundImage = `url(${imageData})`;
    body.style.backgroundSize = 'cover';
    body.style.backgroundPosition = 'center center';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundRepeat = 'no-repeat';
    
    customBackgroundData = imageData;
    enableTransparentMode();
}

function removeCustomWallpaper() {
    customBackgroundData = null;
    extractedColors = null;
    selectedColorIndex = 0;
    document.getElementById('imagePreviewSection').style.display = 'none';
    document.getElementById('customBgInput').value = '';
    
    localStorage.removeItem('fruitMatchCustomBackground');
    localStorage.removeItem('fruitMatchExtractedColors');
    localStorage.removeItem('fruitMatchSelectedColor');
    localStorage.removeItem('fruitMatchSelectedColorIndex');
    
    selectBackground('default1');
    closeCustomUpload();
}

// Modal Controls
function openBackgroundSettings() {
    document.getElementById('backgroundModal').classList.add('active');
}

function closeBackgroundSettings() {
    document.getElementById('backgroundModal').classList.remove('active');
}

// Mode Selection
function updateModeSelection() {
    document.getElementById('currentLevelDisplay').textContent = currentLevel;
    document.getElementById('highScoreDisplay').textContent = highScore;
}

// Audio Controls
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

function updateMenuButtonStates() {
    const musicToggleMenu = document.getElementById('musicToggleMenu');
    const sfxToggleMenu = document.getElementById('sfxToggleMenu');
    
    const musicIcon = musicToggleMenu.querySelector('.material-icons-outlined');
    const sfxIcon = sfxToggleMenu.querySelector('.material-icons-outlined');
    
    if (musicEnabled) {
        musicIcon.textContent = 'music_note';
        musicToggleMenu.classList.remove('muted');
    } else {
        musicIcon.textContent = 'music_off';
        musicToggleMenu.classList.add('muted');
    }
    
    if (soundEnabled) {
        sfxIcon.textContent = 'volume_up';
        sfxToggleMenu.classList.remove('muted');
    } else {
        sfxIcon.textContent = 'volume_off';
        sfxToggleMenu.classList.add('muted');
    }
}

// Game Mode Selection
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

function initLevelMode() {
    const levelData = getLevelConfig(currentLevel);
    moves = levelData.moves;
    targetScore = levelData.target;
    
    document.getElementById('gameTitle').innerHTML = `<span class="material-icons-outlined">layers</span> Level ${currentLevel}`;
    document.getElementById('movesContainer').style.display = 'block';
    document.getElementById('levelContainer').style.display = 'block';
    document.getElementById('targetContainer').style.display = 'block';
    document.getElementById('highScoreContainer').style.display = 'none';
    
    document.getElementById('level').textContent = currentLevel;
    document.getElementById('target').textContent = targetScore;
    
    initGame();
}

function initInfiniteMode() {
    moves = 0;
    targetScore = 0;
    
    document.getElementById('gameTitle').innerHTML = '<span class="material-icons-outlined">all_inclusive</span> Infinite Mode';
    document.getElementById('movesContainer').style.display = 'none';
    document.getElementById('levelContainer').style.display = 'none';
    document.getElementById('targetContainer').style.display = 'none';
    document.getElementById('highScoreContainer').style.display = 'block';
    
    document.getElementById('highScore').textContent = highScore;
    
    initGame();
}

function getLevelConfig(level) {
    if (level <= LEVEL_CONFIG.length) {
        return LEVEL_CONFIG[level - 1];
    }
    const movesCount = Math.max(12, 20 - Math.floor(level / 2));
    const target = 500 + (level - 1) * 300;
    return { level, moves: movesCount, target };
}

// Game Logic
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
    showMessage('<span class="material-icons-outlined">swipe</span> Swipe to match!');
}

function setupAudio() {
    popSoundElement = document.getElementById('popSound');
    backgroundMusicElement = document.getElementById('backgroundMusic');
    
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
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

function updateGameButtonStates() {
    const musicToggle = document.getElementById('musicToggle');
    const sfxToggle = document.getElementById('sfxToggle');
    
    const musicIcon = musicToggle.querySelector('.icon');
    const sfxIcon = sfxToggle.querySelector('.icon');
    
    if (musicEnabled) {
        musicIcon.textContent = 'music_note';
        musicToggle.classList.remove('muted');
    } else {
        musicIcon.textContent = 'music_off';
        musicToggle.classList.add('muted');
    }
    
    if (soundEnabled) {
        sfxIcon.textContent = 'volume_up';
        sfxToggle.classList.remove('muted');
    } else {
        sfxIcon.textContent = 'volume_off';
        sfxToggle.classList.add('muted');
    }
}

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

function createBoard() {
    for (let row = 0; row < GRID_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < GRID_SIZE; col++) {
            board[row][col] = getRandomFruit();
        }
    }
}

function getRandomFruit() {
    return FRUITS[Math.floor(Math.random() * FRUITS.length)];
}

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

function setupSwipeListeners() {
    const gameBoard = document.getElementById('gameBoard');
    
    gameBoard.addEventListener('touchstart', handleTouchStart, false);
    gameBoard.addEventListener('touchmove', handleTouchMove, false);
    gameBoard.addEventListener('touchend', handleTouchEnd, false);
    
    gameBoard.addEventListener('mousedown', handleMouseDown, false);
    gameBoard.addEventListener('mousemove', handleMouseMove, false);
    gameBoard.addEventListener('mouseup', handleMouseUp, false);
}

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

function handleTouchMove(e) {
    if (!swipeStartTile) return;
    
    const touch = e.touches[0];
    touchEndX = touch.clientX;
    touchEndY = touch.clientY;
    
    e.preventDefault();
}

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

function removeMatches() {
    const matches = findMatches();
    matches.forEach(match => {
        board[match.row][match.col] = null;
    });
}

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

function showMessage(text) {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = text;
    setTimeout(() => {
        if (messageEl.innerHTML === text) {
            messageEl.innerHTML = '';
        }
    }, 2000);
}

function checkGameStatus() {
    if (gameMode === 'level' && moves <= 0) {
        if (score >= targetScore) {
            showLevelComplete();
        } else {
            showGameOver('Not enough points! Try again.');
        }
    }
}

function showLevelComplete() {
    document.getElementById('modalScore').textContent = score;
    document.getElementById('modalLevel').textContent = currentLevel;
    document.getElementById('levelCompleteModal').classList.add('active');
    
    currentLevel++;
    saveGameData();
}

function showGameOver(message) {
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverModal').classList.add('active');
}

function nextLevel() {
    document.getElementById('levelCompleteModal').classList.remove('active');
    initLevelMode();
}

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

function backToMenu() {
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('modeSelection').style.display = 'block';
    updateModeSelection();
}

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
    showMessage('<span class="material-icons-outlined">shuffle</span> Shuffled!');
}