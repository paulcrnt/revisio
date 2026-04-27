// pomodoro.js - Gestion de la technique Pomodoro

// ============= PERSISTENCE =============

function saveTimerState() {
    const state = {
        isRunning: timerState.isRunning,
        currentSession: timerState.currentSession,
        pomodoroCount: timerState.pomodoroCount,
        completedPomodoros: timerState.completedPomodoros,
        totalMinutes: timerState.totalMinutes,
        currentStreak: timerState.currentStreak,
        timeRemaining: timerState.timeRemaining,
        totalTime: timerState.totalTime,
        startTimestamp: Date.now() // Timestamp du dernier save
    };
    
    localStorage.setItem('pomodoroState', JSON.stringify(state));
}

function loadTimerState() {
    const saved = localStorage.getItem('pomodoroState');
    if (!saved) return false;
    
    const state = JSON.parse(saved);
    
    // Si le timer était en cours
    if (state.isRunning) {
        const elapsed = Math.floor((Date.now() - state.startTimestamp) / 1000);
        const newTimeRemaining = state.timeRemaining - elapsed;
        
        if (newTimeRemaining > 0) {
            // Le timer continue
            timerState = {
                ...state,
                timeRemaining: newTimeRemaining,
                interval: null
            };
            
            updateDisplay();
            updateSessionStatus();
            updateStats();
            
            // Redémarrer automatiquement
            startTimer();
            return true;
        } else {
            // Le timer était fini pendant qu'on était parti
            sessionComplete();
            return true;
        }
    } else {
        // Le timer était en pause, restaurer l'état
        timerState = {
            ...state,
            interval: null
        };
        
        updateDisplay();
        updateSessionStatus();
        updateStats();
        return true;
    }
}

// Configuration par défaut
let config = {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    longBreakInterval: 4,
    autoStartBreaks: true,
    autoStartWork: true,
    soundEnabled: true
};

// État du timer
let timerState = {
    isRunning: false,
    currentSession: 'work', // 'work', 'short-break', 'long-break'
    pomodoroCount: 0,
    completedPomodoros: 0,
    totalMinutes: 0,
    currentStreak: 0,
    timeRemaining: 0, // en secondes
    totalTime: 0, // durée totale de la session en secondes
    interval: null
};

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    
    // Essayer de restaurer l'état
    const restored = loadTimerState();
    
    // Si aucun état restauré, initialiser normalement
    if (!restored) {
        initTimer();
    }
});

// ============= CONFIGURATION =============

function loadConfig() {
    const saved = localStorage.getItem('pomodoroConfig');
    if (saved) {
        config = JSON.parse(saved);
    }
}

function saveConfig() {
    localStorage.setItem('pomodoroConfig', JSON.stringify(config));
}

function applyPreset(preset) {
    const presets = {
        classic: { work: 25, short: 5, long: 15, interval: 4 },
        short: { work: 15, short: 3, long: 10, interval: 4 },
        long: { work: 50, short: 10, long: 30, interval: 4 },
        intense: { work: 90, short: 15, long: 45, interval: 3 }
    };

    const selected = presets[preset];
    config.workDuration = selected.work;
    config.shortBreakDuration = selected.short;
    config.longBreakDuration = selected.long;
    config.longBreakInterval = selected.interval;

    saveConfig();
    closeSettingsModal();
    resetTimer();
}

function applyCustomSettings() {
    config.workDuration = parseInt(document.getElementById('work-duration').value);
    config.shortBreakDuration = parseInt(document.getElementById('short-break-duration').value);
    config.longBreakDuration = parseInt(document.getElementById('long-break-duration').value);
    config.longBreakInterval = parseInt(document.getElementById('long-break-interval').value);
    config.autoStartBreaks = document.getElementById('auto-start-breaks').checked;
    config.autoStartWork = document.getElementById('auto-start-work').checked;
    config.soundEnabled = document.getElementById('sound-enabled').checked;

    saveConfig();
    closeSettingsModal();
    resetTimer();
}

function syncSlider(type) {
    const input = document.getElementById(`${type}-duration`);
    const slider = document.getElementById(`${type}-slider`);
    
    if (input && slider) {
        input.value = slider.value;
    }
}

// ============= TIMER =============

function initTimer() {
    timerState.currentSession = 'work';
    timerState.pomodoroCount = 1;
    timerState.timeRemaining = config.workDuration * 60;
    timerState.totalTime = config.workDuration * 60;
    
    updateDisplay();
    updateSessionStatus();
}

function startTimer() {
    if (timerState.isRunning) return;
    
    timerState.isRunning = true;
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('pause-btn').style.display = 'inline-block';
    
    document.getElementById('progress-bar').classList.add('pulsing');
    
    timerState.interval = setInterval(() => {
        timerState.timeRemaining--;
        
        // Sauvegarder l'état toutes les secondes
        saveTimerState();
        
        if (timerState.timeRemaining <= 0) {
            sessionComplete();
        }
        
        updateDisplay();
    }, 1000);
}


function pauseTimer() {
    if (!timerState.isRunning) return;
    
    timerState.isRunning = false;
    document.getElementById('start-btn').style.display = 'inline-block';
    document.getElementById('pause-btn').style.display = 'none';
    
    document.getElementById('progress-bar').classList.remove('pulsing');
    
    clearInterval(timerState.interval);
    
    // Sauvegarder l'état en pause
    saveTimerState();
}

function resetTimer() {
    pauseTimer();
    
    if (timerState.currentSession === 'work') {
        timerState.timeRemaining = config.workDuration * 60;
        timerState.totalTime = config.workDuration * 60;
    } else if (timerState.currentSession === 'short-break') {
        timerState.timeRemaining = config.shortBreakDuration * 60;
        timerState.totalTime = config.shortBreakDuration * 60;
    } else {
        timerState.timeRemaining = config.longBreakDuration * 60;
        timerState.totalTime = config.longBreakDuration * 60;
    }
    
    // Sauvegarder l'état reset
    saveTimerState();
    updateDisplay();
}

function skipSession() {
    if (confirm('Voulez-vous vraiment passer cette session ?')) {
        sessionComplete();
    }
}

function sessionComplete() {
    pauseTimer();
    
    // Jouer un son
    if (config.soundEnabled) {
        playNotificationSound();
    }
    
    // Si c'était une session de travail
    if (timerState.currentSession === 'work') {
        timerState.completedPomodoros++;
        timerState.totalMinutes += config.workDuration;
        timerState.currentStreak++;
        
        // Animation de célébration
        document.querySelector('.stat-card').classList.add('celebrate');
        setTimeout(() => {
            document.querySelector('.stat-card').classList.remove('celebrate');
        }, 500);
        
        // Déterminer si c'est une pause longue ou courte
        if (timerState.completedPomodoros % config.longBreakInterval === 0) {
            startBreak('long-break');
        } else {
            startBreak('short-break');
        }
    } else {
        // Fin de pause, retour au travail
        startWork();
    }
    
    updateStats();
}

function startWork() {
    timerState.currentSession = 'work';
    timerState.pomodoroCount++;
    timerState.timeRemaining = config.workDuration * 60;
    timerState.totalTime = config.workDuration * 60;
    
    updateSessionStatus();
    updateDisplay();
    
    showNotification(
        '🍅 Nouvelle session de travail !',
        'C\'est parti pour ' + config.workDuration + ' minutes de concentration.'
    );
    
    if (config.autoStartWork) {
        setTimeout(() => {
            closeNotification();
            startTimer();
        }, 3000);
    }
}

function startBreak(type) {
    timerState.currentSession = type;
    
    if (type === 'long-break') {
        timerState.timeRemaining = config.longBreakDuration * 60;
        timerState.totalTime = config.longBreakDuration * 60;
        showNotification(
            '🌴 Pause longue bien méritée !',
            'Profitez de ' + config.longBreakDuration + ' minutes de repos.'
        );
    } else {
        timerState.timeRemaining = config.shortBreakDuration * 60;
        timerState.totalTime = config.shortBreakDuration * 60;
        showNotification(
            '☕ Temps de pause !',
            'Reposez-vous pendant ' + config.shortBreakDuration + ' minutes.'
        );
    }
    
    updateSessionStatus();
    updateDisplay();
    
    if (config.autoStartBreaks) {
        setTimeout(() => {
            closeNotification();
            startTimer();
        }, 3000);
    }
}

// ============= AFFICHAGE =============

function updateDisplay() {
    // Mettre à jour le chronomètre
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    document.getElementById('timer-text').textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Mettre à jour la barre de progression
    const progress = ((timerState.totalTime - timerState.timeRemaining) / timerState.totalTime) * 100;
    const progressBar = document.getElementById('progress-bar');
    progressBar.style.width = progress + '%';
    document.getElementById('progress-text').textContent = Math.round(progress) + '%';
    
    // Changer la couleur de la barre selon le type de session
    progressBar.className = 'progress-bar ' + timerState.currentSession;
    if (timerState.isRunning) {
        progressBar.classList.add('pulsing');
    }
    
    // Mettre à jour le cercle du timer
    const timerCircle = document.querySelector('.timer-circle');
    timerCircle.className = 'timer-circle ' + timerState.currentSession;
}

function updateSessionStatus() {
    const statusMap = {
        'work': 'Session de travail',
        'short-break': 'Pause courte',
        'long-break': 'Pause longue'
    };
    
    document.getElementById('session-type').textContent = statusMap[timerState.currentSession];
    
    if (timerState.currentSession === 'work') {
        document.getElementById('session-number').textContent = 
            `Pomodoro #${timerState.pomodoroCount}`;
    } else {
        document.getElementById('session-number').textContent = 
            `Après ${timerState.completedPomodoros} Pomodoro${timerState.completedPomodoros > 1 ? 's' : ''}`;
    }
}

function updateStats() {
    document.getElementById('completed-count').textContent = timerState.completedPomodoros;
    
    const hours = Math.floor(timerState.totalMinutes / 60);
    const minutes = timerState.totalMinutes % 60;
    document.getElementById('total-time').textContent = `${hours}h ${minutes}min`;
    
    document.getElementById('streak-count').textContent = timerState.currentStreak;
}

// ============= MODALS =============

function openSettingsModal() {
    // Charger les valeurs actuelles
    document.getElementById('work-duration').value = config.workDuration;
    document.getElementById('work-slider').value = config.workDuration;
    document.getElementById('short-break-duration').value = config.shortBreakDuration;
    document.getElementById('short-break-slider').value = config.shortBreakDuration;
    document.getElementById('long-break-duration').value = config.longBreakDuration;
    document.getElementById('long-break-slider').value = config.longBreakDuration;
    document.getElementById('long-break-interval').value = config.longBreakInterval;
    document.getElementById('auto-start-breaks').checked = config.autoStartBreaks;
    document.getElementById('auto-start-work').checked = config.autoStartWork;
    document.getElementById('sound-enabled').checked = config.soundEnabled;
    
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettingsModal() {
    document.getElementById('settingsModal').classList.remove('active');
}

function showSettingsTab(tab) {
    // Mettre à jour les onglets
    document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    
    // Afficher le contenu approprié
    if (tab === 'preset') {
        document.getElementById('preset-settings').style.display = 'block';
        document.getElementById('custom-settings').style.display = 'none';
    } else {
        document.getElementById('preset-settings').style.display = 'none';
        document.getElementById('custom-settings').style.display = 'block';
    }
}

// ============= NOTIFICATIONS =============

function showNotification(title, message) {
    document.getElementById('notification-title').textContent = title;
    document.getElementById('notification-message').textContent = message;
    document.getElementById('notification').classList.add('active');
}

function closeNotification() {
    document.getElementById('notification').classList.remove('active');
}

function playNotificationSound() {
    // Créer un son de notification simple avec Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported');
    }
}

// ============= EVENT LISTENERS =============

// Synchroniser les inputs number avec les sliders
document.addEventListener('input', (e) => {
    if (e.target.type === 'number') {
        const sliderId = e.target.id.replace('duration', 'slider');
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.value = e.target.value;
        }
    }
});

// Fermer les modals en cliquant en dehors
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
}

// Sauvegarder les stats avant de quitter
window.addEventListener('beforeunload', () => {
    if (timerState.isRunning) {
        return 'Un timer est en cours. Êtes-vous sûr de vouloir quitter ?';
    }
});
