
const STORAGE_KEY = 'SECOND_BRAIN_APP_STATE_V2';

const DEFAULT_STATE = {
    meetings: [
        { id: 'm1', text: '12:30 movie', completed: false, time: '12:30' },
        { id: 'm2', text: '15:00 Meeting', completed: false, time: '15:00' },
        { id: 'm3', text: '10:00 Fitness', completed: true, time: '10:00' }
    ],
    tasks: [
        { id: 't1', text: 'Find a sock', completed: false, durationMinutes: 30 },
        { id: 't2', text: 'Buy a bread', completed: false, durationMinutes: 15 },
        { id: 't3', text: 'Doing project', completed: false, durationMinutes: 180 },
        { id: 't4', text: 'Clean the shoes', completed: true, durationMinutes: 20 }
    ],
    activeItemId: 't1', 
    companionType: 'cat',
    circadianMode: 'auto',
    timer: {
        totalSeconds: 16 * 60, // 
        remainingSeconds: 16 * 60,
        isRunning: false
    }
};

let appState = null;
let timerInterval = null;
let companionCelebrationTimeout = null;
let isCompanionCelebrating = false;
let ambientAudio = {
    ctx: null,
    source: null,
    gain: null,
    lfo: null,
    mode: 'off' // 'off' | 'rain' | 'brown' | 'vinyl'
};


function playPencilScratchSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const duration = 0.38;
        const sampleRate = ctx.sampleRate;
        const bufferSize = Math.floor(sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        // Two brisk pencil strokes across textured paper
        for (let i = 0; i < bufferSize; i++) {
            const t = i / duration / sampleRate;
            const stroke1 = Math.exp(-Math.pow((t - 0.28) / 0.22, 2));
            const stroke2 = 0.65 * Math.exp(-Math.pow((t - 0.75) / 0.16, 2));
            const grain = (Math.sin(i * 0.17) * 0.3 + 0.7);
            data[i] = (Math.random() * 2 - 1) * (stroke1 + stroke2) * grain;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(2200, ctx.currentTime);
        bandpass.Q.setValueAtTime(1.8, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.28, ctx.currentTime);

        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
    } catch (e) {
        console.log('Pencil sound playback skipped:', e);
    }
}

function playCompanionSwitchSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.11);

        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.13);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.14);
    } catch (e) {
        // Ignore audio errors
    }
}

function createPencilStrikeSVG() {
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'pencil-strike-svg');
    svg.setAttribute('viewBox', '0 0 200 16');
    svg.setAttribute('preserveAspectRatio', 'none');

    const pathPrimary = document.createElementNS(svgNS, 'path');
    pathPrimary.setAttribute('class', 'pencil-strike-path');
    pathPrimary.setAttribute('d', 'M 2 9 Q 35 4, 72 9 T 142 8 T 198 7');

    const pathSecondary = document.createElementNS(svgNS, 'path');
    pathSecondary.setAttribute('class', 'pencil-strike-path-secondary');
    pathSecondary.setAttribute('d', 'M 5 11 Q 50 13, 105 8 T 195 10');

    svg.appendChild(pathPrimary);
    svg.appendChild(pathSecondary);
    return svg;
}

function spawnPaperConfetti(cardEl) {
    const colors = ['#ffb7c5', '#e65c84', '#fde047', '#86efac', '#ffffff'];
    for (let i = 0; i < 8; i++) {
        const bit = document.createElement('span');
        bit.className = 'paper-confetti-bit';
        bit.style.backgroundColor = colors[i % colors.length];
        bit.style.left = `${18 + Math.random() * 65}%`;
        bit.style.top = `${30 + Math.random() * 40}%`;
        const tx = (Math.random() - 0.5) * 70;
        const ty = -18 - Math.random() * 34;
        const rot = (Math.random() - 0.5) * 260;
        bit.style.setProperty('--tx', `${tx}px`);
        bit.style.setProperty('--ty', `${ty}px`);
        bit.style.setProperty('--rot', `${rot}deg`);
        cardEl.appendChild(bit);
        setTimeout(() => bit.remove(), 600);
    }
}

function triggerCompanionCelebration() {
    isCompanionCelebrating = true;
    clearTimeout(companionCelebrationTimeout);
    updateTimerUI();
    companionCelebrationTimeout = setTimeout(() => {
        isCompanionCelebrating = false;
        updateTimerUI();
    }, 1500);
}


function playTimerCompletionSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const chimeNotes = [
            { freq: 523.25, time: 0.0,  duration: 0.65 }, // C5
            { freq: 659.25, time: 0.22, duration: 0.65 }, // E5
            { freq: 783.99, time: 0.44, duration: 0.75 }, // G5
            { freq: 1046.50, time: 0.78, duration: 5  } // C6 
        ];

        chimeNotes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(note.freq, ctx.currentTime + note.time);

            gain.gain.setValueAtTime(0.001, ctx.currentTime + note.time);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + note.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.time + note.duration);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + note.time);
            osc.stop(ctx.currentTime + note.time + note.duration);
        });
    } catch (e) {
        console.log('Musical audio playback not allowed or failed:', e);
    }
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

function loadState() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            appState = JSON.parse(data);
        } else {
            appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
            saveState();
        }
    } catch (e) {
        console.error('Failed to load state:', e);
        appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
}


function parseMinutesFromText(text) {
    if (!text) return null;
    
    const minMatch = text.match(/(\d+)\s*(хв|min|m|хвилин)/i);
    if (minMatch) return parseInt(minMatch[1], 10);
    
    const hrMatch = text.match(/(\d+)\s*(годин|години|година|ч|h|hours)/i);
    if (hrMatch) return parseInt(hrMatch[1], 10) * 60;
    
    return null;
}

function getAutoCircadianPhase(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 19) return 'day';
    return 'dusk';
}

function updateCircadianTheme() {
    const mode = (appState && appState.circadianMode) || 'auto';
    const nowHour = new Date().getHours();
    const activePhase = mode === 'auto' ? getAutoCircadianPhase(nowHour) : mode;

    document.body.dataset.circadian = activePhase;

    const toggleBtn = document.getElementById('circadian-toggle');
    if (toggleBtn) {
        const icons = { morning: '🌅', day: '☀️', dusk: '🌙' };
        const labels = {
            auto: `Auto (${activePhase})`,
            morning: 'Morning Peach',
            day: 'Daylight Rose',
            dusk: 'Dusk Lavender'
        };
        toggleBtn.textContent = icons[activePhase] || '☀️';
        toggleBtn.title = `Atmosphere: ${labels[mode]} — Click to switch`;
    }
}

function cycleCircadianMode() {
    const order = ['auto', 'morning', 'day', 'dusk'];
    const current = (appState && appState.circadianMode) || 'auto';
    const next = order[(order.indexOf(current) + 1) % order.length];
    appState.circadianMode = next;
    playCompanionSwitchSound();
    saveState();
    updateCircadianTheme();
}

function stopAmbientSound() {
    if (ambientAudio.source) {
        try {
            ambientAudio.source.stop();
            ambientAudio.source.disconnect();
        } catch (e) {}
        ambientAudio.source = null;
    }
    if (ambientAudio.lfo) {
        try {
            ambientAudio.lfo.stop();
            ambientAudio.lfo.disconnect();
        } catch (e) {}
        ambientAudio.lfo = null;
    }
}

function startAmbientSound(mode) {
    stopAmbientSound();
    if (mode === 'off') return;

    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        if (!ambientAudio.ctx) {
            ambientAudio.ctx = new AudioContext();
        }
        const ctx = ambientAudio.ctx;
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const sampleRate = ctx.sampleRate;
        const seconds = 5;
        const bufferSize = sampleRate * seconds;
        const buffer = ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        if (mode === 'brown') {
            // Deep warm Brown Noise (ideal for focus / ADHD)
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = data[i];
                data[i] *= 2.8;
            }
        } else if (mode === 'rain') {
            // Soft textured rainfall
            let b0 = 0, b1 = 0, b2 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99765 * b0 + white * 0.0990460;
                b1 = 0.96300 * b1 + white * 0.2965164;
                b2 = 0.57000 * b2 + white * 1.0526913;
                data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
            }
        } else if (mode === 'vinyl') {
            // Warm cozy vinyl dust & crackle
            let warm = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                warm = (warm + 0.03 * white) / 1.03;
                const crackle = Math.random() > 0.9985 ? (Math.random() * 2 - 1) * 0.9 : 0;
                data[i] = warm * 1.2 + crackle;
            }
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        if (mode === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(480, ctx.currentTime);
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.35);
        } else if (mode === 'rain') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(950, ctx.currentTime);
            filter.Q.setValueAtTime(0.7, ctx.currentTime);

            // Subtle rain breeze modulation
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
            lfoGain.gain.setValueAtTime(180, ctx.currentTime);
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start();
            ambientAudio.lfo = lfo;

            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.35);
        } else if (mode === 'vinyl') {
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1350, ctx.currentTime);
            filter.Q.setValueAtTime(0.55, ctx.currentTime);
            gain.gain.setValueAtTime(0.001, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.35);
        }

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start();

        ambientAudio.source = source;
        ambientAudio.gain = gain;
    } catch (e) {
        console.log('Ambient audio error:', e);
    }
}

function cycleAmbientSound() {
    const order = ['off', 'rain', 'brown', 'vinyl'];
    const labels = {
        off: '🎧 Sound',
        rain: '🌧️ Rain',
        brown: '📻 Café',
        vinyl: '💿 Vinyl'
    };

    const nextMode = order[(order.indexOf(ambientAudio.mode) + 1) % order.length];
    ambientAudio.mode = nextMode;
    startAmbientSound(nextMode);

    const btn = document.getElementById('ambient-sound-btn');
    if (btn) {
        btn.textContent = labels[nextMode];
        btn.classList.toggle('is-playing', nextMode !== 'off');
    }
}

function initClock() {
    const clockEl = document.getElementById('digital-clock');
    const dateEl = document.getElementById('current-date');
    
    function update() {
        const now = new Date();
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
        
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        if (dateEl) dateEl.textContent = `${day}.${month}.${year}`;

        updateCircadianTheme();
    }
    
    update();
    setInterval(update, 1000);
}

function renderItems() {
    const meetingsIncomplete = document.getElementById('meetings-incomplete');
    const meetingsCompleted = document.getElementById('meetings-completed');
    const tasksIncomplete = document.getElementById('tasks-incomplete');
    const tasksCompleted = document.getElementById('tasks-completed');

    if (!meetingsIncomplete || !meetingsCompleted || !tasksIncomplete || !tasksCompleted) return;

    meetingsIncomplete.innerHTML = '';
    meetingsCompleted.innerHTML = '';
    tasksIncomplete.innerHTML = '';
    tasksCompleted.innerHTML = '';

    const incMeetings = appState.meetings.filter(m => !m.completed);
    const compMeetings = appState.meetings.filter(m => m.completed);

    if (incMeetings.length === 0) {
        meetingsIncomplete.innerHTML = `<div class="empty-placeholder">No upcoming meetings</div>`;
    } else {
        incMeetings.forEach(item => meetingsIncomplete.appendChild(createItemCard(item, 'meeting')));
    }

    if (compMeetings.length === 0) {
        meetingsCompleted.innerHTML = `<div class="empty-placeholder">No past meetings</div>`;
    } else {
        compMeetings.forEach(item => meetingsCompleted.appendChild(createItemCard(item, 'meeting')));
    }

    const incTasks = appState.tasks.filter(t => !t.completed);
    const compTasks = appState.tasks.filter(t => t.completed);

    if (incTasks.length === 0) {
        tasksIncomplete.innerHTML = `<div class="empty-placeholder">No active tasks</div>`;
    } else {
        incTasks.forEach(item => tasksIncomplete.appendChild(createItemCard(item, 'task')));
    }

    if (compTasks.length === 0) {
        tasksCompleted.innerHTML = `<div class="empty-placeholder">No tasks completed</div>`;
    } else {
        compTasks.forEach(item => tasksCompleted.appendChild(createItemCard(item, 'task')));
    }

    updateTimerUI();
}

function createItemCard(item, type) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = item.id;
    card.dataset.type = type;

    const isActive = appState.activeItemId === item.id;
    if (isActive) {
        card.classList.add('is-active');
    }

    if (item.completed) {
        card.classList.add('is-completed');
    }

    let displayText = item.text;
    if (type === 'meeting' && item.time && !item.text.toLowerCase().startsWith(item.time.toLowerCase())) {
        displayText = `${item.time} ${item.text}`;
    }

    const titleSpan = document.createElement('span');
    titleSpan.className = 'item-title';
    titleSpan.textContent = displayText;

    const dayLabel = getItemDayBadgeLabel(item.scheduledDate);
    if (dayLabel) {
        const badge = document.createElement('span');
        badge.className = 'item-day-badge';
        badge.textContent = dayLabel;
        titleSpan.appendChild(badge);
    }

    if (item.completed) {
        titleSpan.appendChild(createPencilStrikeSVG());
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'item-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'item-action-btn edit-btn';
    editBtn.innerHTML = '✏️';
    editBtn.title = 'Edit';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        if (window.openEditModal) {
            window.openEditModal(item, type);
        }
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'item-action-btn delete-btn';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = 'Delete';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteItem(item.id, type);
    };

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    card.appendChild(titleSpan);
    card.appendChild(actionsDiv);

    card.oncontextmenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.openEditModal) {
            window.openEditModal(item, type);
        }
    };

    card.onclick = () => handleItemClick(item, type);

    return card;
}

function handleItemClick(item, type) {
    if (item.completed) {
        item.completed = false;
        saveState();
        renderItems();
        return;
    }

    const isCurrentlyActive = appState.activeItemId === item.id;

    if (!isCurrentlyActive) {
        appState.activeItemId = item.id;
        
        const mins = (type === 'task' ? (parseMinutesFromText(item.text) || item.durationMinutes) : 25) || 25;
        appState.timer.totalSeconds = mins * 60;
        appState.timer.remainingSeconds = mins * 60;
        appState.timer.isRunning = false;
        clearInterval(timerInterval);
        saveState();
        renderItems();
    } else {
        appState.timer.isRunning = false;
        clearInterval(timerInterval);
        playPencilScratchSound();
        triggerCompanionCelebration();

        const cardEl = document.querySelector(`.item-card[data-id="${item.id}"]`);
        const titleEl = cardEl ? cardEl.querySelector('.item-title') : null;

        if (cardEl && titleEl && !cardEl.classList.contains('is-scribbling')) {
            cardEl.classList.add('is-scribbling');
            titleEl.appendChild(createPencilStrikeSVG());

            const pencilRunner = document.createElement('span');
            pencilRunner.className = 'pencil-tip-runner';
            pencilRunner.textContent = '✏️';
            titleEl.appendChild(pencilRunner);

            spawnPaperConfetti(cardEl);

            setTimeout(() => {
                item.completed = true;
                appState.activeItemId = null;
                saveState();
                renderItems();
            }, 420);
        } else {
            item.completed = true;
            appState.activeItemId = null;
            saveState();
            renderItems();
        }
    }
}

function deleteItem(id, type) {
    if (type === 'meeting') {
        appState.meetings = appState.meetings.filter(m => m.id !== id);
    } else {
        appState.tasks = appState.tasks.filter(t => t.id !== id);
    }

    if (appState.activeItemId === id) {
        appState.activeItemId = null;
    }

    saveState();
    renderItems();
}

function getActiveItem() {
    if (!appState.activeItemId) return null;
    const task = appState.tasks.find(t => t.id === appState.activeItemId);
    if (task) return { ...task, type: 'task' };
    const meeting = appState.meetings.find(m => m.id === appState.activeItemId);
    if (meeting) return { ...meeting, type: 'meeting' };
    return null;
}

function updateTimerUI() {
    const timerBlock = document.getElementById('timer-block');
    const activeTitle = document.getElementById('active-item-title');
    const statusBadge = document.getElementById('timer-status-badge');
    const timeDisplay = document.getElementById('timer-time-display');
    const labelDisplay = document.getElementById('timer-label-display');
    const toggleBtn = document.getElementById('timer-toggle-btn');
    const ringProgress = document.getElementById('timer-ring-progress');
    const timerHand = document.getElementById('timer-hand');

    const activeItem = getActiveItem();

    if (activeItem) {
        timerBlock.classList.add('has-active');
        activeTitle.textContent = activeItem.text;
        statusBadge.textContent = 'In progress';
    } else {
        timerBlock.classList.remove('has-active');
        activeTitle.textContent = 'Select a task or meeting';
        statusBadge.textContent = 'Inactive';
    }

    const totalSecs = appState.timer.totalSeconds || 1500;
    const remSecs = Math.max(0, appState.timer.remainingSeconds);

    const mins = Math.floor(remSecs / 60);
    const secs = remSecs % 60;

    if (remSecs >= 60) {
        timeDisplay.textContent = `${mins} min`;
        labelDisplay.textContent = secs > 0 ? `${secs} sec` : 'remaining';
    } else {
        timeDisplay.textContent = `${secs} sec`;
        labelDisplay.textContent = 'remaining';
    }

    if (appState.timer.isRunning) {
        toggleBtn.textContent = '⏸ Pause';
        toggleBtn.classList.remove('primary-btn');
        toggleBtn.classList.add('secondary-btn');
    } else {
        toggleBtn.textContent = '► Start';
        toggleBtn.classList.add('primary-btn');
        toggleBtn.classList.remove('secondary-btn');
    }

    const circumference = 515;
    const maxDialSecs = Math.max(3600, totalSecs); 
    const remRatio = Math.max(0, Math.min(1, remSecs / maxDialSecs));
    const strokeDashoffset = circumference * (1 - remRatio);

    if (ringProgress) {
        ringProgress.style.strokeDashoffset = strokeDashoffset;
    }

    const degrees = remRatio * 360;
    if (timerHand) {
        timerHand.style.transform = `rotate(${degrees}deg)`;
    }

    updateCompanionUI(degrees, totalSecs, remSecs);
}

function updateCompanionUI(handDegrees, totalSecs, remSecs) {
    const companionEl = document.getElementById('focus-companion');
    if (!companionEl) return;

    const companionType = appState.companionType || 'cat';
    companionEl.dataset.companion = companionType;

    let state = 'idle';
    if (isCompanionCelebrating) {
        state = 'celebrating';
    } else if (appState.timer.isRunning) {
        state = 'running';
    }
    companionEl.dataset.state = state;

    // Cat pupils follow the clock hand around the dial
    const pupils = document.getElementById('cat-pupils');
    if (pupils && state === 'running') {
        const rad = (handDegrees * Math.PI) / 180;
        const dx = Math.sin(rad) * 2.2;
        const dy = 1.2 - Math.cos(rad) * 1.8;
        pupils.setAttribute('transform', `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
    } else if (pupils) {
        pupils.setAttribute('transform', 'translate(0, 0)');
    }

    // Plant companion grows & blooms as timer progresses
    const plantGroup = document.getElementById('plant-growth-group');
    const flowerBloom = document.getElementById('plant-flower-bloom');
    if (plantGroup && flowerBloom) {
        const progress = totalSecs > 0 ? Math.max(0, Math.min(1, 1 - remSecs / totalSecs)) : 0;
        const growthScale = state === 'celebrating' ? 1.08 : (0.62 + progress * 0.38);
        plantGroup.style.transform = `scale(${growthScale.toFixed(3)})`;

        const bloomScale = state === 'celebrating'
            ? 1.15
            : (appState.timer.isRunning || progress > 0.05 ? Math.max(0.35, progress) : 0.25);
        flowerBloom.style.transform = `scale(${bloomScale.toFixed(3)})`;
    }
}

function toggleTimer() {
    if (appState.timer.isRunning) {
        appState.timer.isRunning = false;
        clearInterval(timerInterval);
    } else {
        appState.timer.isRunning = true;
        clearInterval(timerInterval);
        
        timerInterval = setInterval(() => {
            if (appState.timer.remainingSeconds > 0) {
                appState.timer.remainingSeconds--;
                updateTimerUI();
            } else {
                appState.timer.isRunning = false;
                clearInterval(timerInterval);
                playTimerCompletionSound();
                triggerCompanionCelebration();
                updateTimerUI();
                alert(`⏱️ Time is up for: "${getActiveItem()?.text || 'Task'}"!`);
            }
            saveState();
        }, 1000);
    }

    saveState();
    updateTimerUI();
}

function resetTimer() {
    appState.timer.isRunning = false;
    clearInterval(timerInterval);
    appState.timer.remainingSeconds = appState.timer.totalSeconds;
    saveState();
    updateTimerUI();
}

function completeActiveItem() {
    const active = getActiveItem();
    if (active) {
        handleItemClick(active, active.type);
    }
}

function setPresetMinutes(mins) {
    appState.timer.totalSeconds = mins * 60;
    appState.timer.remainingSeconds = mins * 60;
    appState.timer.isRunning = false;
    clearInterval(timerInterval);
    saveState();
    updateTimerUI();
}

function toLocalIsoDate(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getUpcomingWeekDays() {
    const weekdaysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        const iso = toLocalIsoDate(d);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        const wk = weekdaysShort[d.getDay()];

        let prefix = '';
        if (i === 0) prefix = 'Today — ';
        else if (i === 1) prefix = 'Tomorrow — ';

        days.push({
            offset: i,
            iso,
            shortDate: `${dd}.${mm}`,
            fullDate: `${dd}.${mm}.${yyyy}`,
            weekday: wk,
            label: `${prefix}${wk}, ${dd}.${mm}`,
            badge: i === 0 ? '' : (i === 1 ? 'Tomorrow' : `${wk} ${dd}.${mm}`)
        });
    }
    return days;
}

function getItemDayBadgeLabel(scheduledDate) {
    if (!scheduledDate) return '';
    const weekDays = getUpcomingWeekDays();
    const todayIso = weekDays[0].iso;
    if (scheduledDate === todayIso) return '';
    const match = weekDays.find(d => d.iso === scheduledDate);
    if (match) return match.badge;
    const parts = scheduledDate.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}`;
    return '';
}

function initModal() {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const itemIdInput = document.getElementById('item-id');
    const itemTypeInput = document.getElementById('item-type');
    const itemTextInput = document.getElementById('item-text');
    const itemTimeInput = document.getElementById('item-time');
    const itemDateSelect = document.getElementById('item-date');
    const form = document.getElementById('item-form');

    const addMeetingBtn = document.getElementById('add-meeting-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    function populateDateSelect(selectedIso) {
        if (!itemDateSelect) return;
        const weekDays = getUpcomingWeekDays();
        const targetIso = selectedIso || weekDays[0].iso;
        itemDateSelect.innerHTML = '';

        weekDays.forEach(day => {
            const opt = document.createElement('option');
            opt.value = day.iso;
            opt.textContent = day.label;
            if (day.iso === targetIso) opt.selected = true;
            itemDateSelect.appendChild(opt);
        });
    }

    function openModal(type) {
        if (itemIdInput) itemIdInput.value = '';
        itemTypeInput.value = type;
        itemTextInput.value = '';
        itemTimeInput.value = '';
        populateDateSelect();

        if (type === 'meeting') {
            modalTitle.textContent = 'Add meeting';
            itemTextInput.placeholder = 'For example: 16:30 Project meeting';
            itemTimeInput.placeholder = 'For example: 16:30';
        } else {
            modalTitle.textContent = 'Add task';
            itemTextInput.placeholder = 'For example: Prepare a report';
            itemTimeInput.placeholder = 'For example: 25 min';
        }

        modal.classList.add('open');
        itemTextInput.focus();
    }

    window.openEditModal = function(item, type) {
        if (itemIdInput) itemIdInput.value = item.id;
        itemTypeInput.value = type;

        itemTextInput.value = item.text || '';
        const parsedDur = parseMinutesFromText(item.text);
        itemTimeInput.value = type === 'meeting' ? (item.time || '') : (parsedDur ? `${parsedDur} min` : '');
        populateDateSelect(item.scheduledDate);

        if (type === 'meeting') {
            modalTitle.textContent = 'Edit meeting';
            itemTextInput.placeholder = 'For example: 4:30 PM — Project meeting';
            itemTimeInput.placeholder = 'For example: 16:30';
        } else {
            modalTitle.textContent = 'Edit task';
            itemTextInput.placeholder = 'For example: Prepare a report — 25 min';
            itemTimeInput.placeholder = 'For example: 25 min';
        }

        modal.classList.add('open');
        itemTextInput.focus();
        itemTextInput.select();
    };

    function closeModal() {
        modal.classList.remove('open');
        if (itemIdInput) itemIdInput.value = '';
    }

    addMeetingBtn.onclick = () => openModal('meeting');
    addTaskBtn.onclick = () => openModal('task');
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    form.onsubmit = (e) => {
        e.preventDefault();
        const editId = itemIdInput ? itemIdInput.value : '';
        const text = itemTextInput.value.trim();
        const type = itemTypeInput.value;
        const timeOrDur = itemTimeInput.value.trim();
        const scheduledDate = itemDateSelect ? itemDateSelect.value : getUpcomingWeekDays()[0].iso;

        if (!text) return;

        if (editId) {
            let targetList = type === 'meeting' ? appState.meetings : appState.tasks;
            let existingItem = targetList.find(i => i.id === editId);

            if (existingItem) {
                existingItem.scheduledDate = scheduledDate;
                if (type === 'meeting') {
                    const timeVal = timeOrDur;
                    let fullText = text;
                    if (timeVal && !text.toLowerCase().startsWith(timeVal.toLowerCase())) {
                        fullText = `${timeVal} ${text}`;
                    }
                    existingItem.text = fullText;
                    existingItem.time = timeVal || (text.match(/\b\d{1,2}:\d{2}\b/)?.[0] || '');
                } else {
                    let fullText = text;
                    if (timeOrDur && !text.toLowerCase().includes(timeOrDur.toLowerCase())) {
                        fullText = `${text} ${timeOrDur}`;
                    }
                    existingItem.text = fullText;
                    existingItem.durationMinutes = parseMinutesFromText(fullText);

                    if (appState.activeItemId === editId) {
                        const mins = existingItem.durationMinutes || 25;
                        appState.timer.totalSeconds = mins * 60;
                        appState.timer.remainingSeconds = mins * 60;
                    }
                }
            }
        } else {
            if (type === 'meeting') {
                const timeVal = timeOrDur;
                let fullText = text;
                if (timeVal && !text.toLowerCase().startsWith(timeVal.toLowerCase())) {
                    fullText = `${timeVal} ${text}`;
                }

                const newItem = {
                    id: 'm_' + Date.now(),
                    text: fullText,
                    time: timeVal || (text.match(/\b\d{1,2}:\d{2}\b/)?.[0] || ''),
                    scheduledDate,
                    completed: false
                };
                appState.meetings.unshift(newItem);
            } else {
                let fullText = text;
                if (timeOrDur && !text.toLowerCase().includes(timeOrDur.toLowerCase())) {
                    fullText = `${text} ${timeOrDur}`;
                }

                const newItem = {
                    id: 't_' + Date.now(),
                    text: fullText,
                    durationMinutes: parseMinutesFromText(fullText),
                    scheduledDate,
                    completed: false
                };
                appState.tasks.unshift(newItem);
            }
        }

        saveState();
        renderItems();
        closeModal();
    };
}

function initReceiptModal() {
    const receiptModal = document.getElementById('receipt-modal');
    const closeBtn = document.getElementById('receipt-close-btn');
    const openAllBtn = document.getElementById('open-receipt-btn');
    const openMeetingsBtn = document.getElementById('share-meetings-btn');
    const openTasksBtn = document.getElementById('share-tasks-btn');

    const periodBtns = document.querySelectorAll('.receipt-period-btn');
    const filterBtns = document.querySelectorAll('.receipt-filter-btn');
    const itemsBody = document.getElementById('receipt-items-body');
    const totalsBox = document.getElementById('receipt-totals-box');
    const dateStamp = document.getElementById('receipt-date-stamp');
    const periodBadge = document.getElementById('receipt-period-badge');

    const printBtn = document.getElementById('receipt-print-btn');
    const copyBtn = document.getElementById('receipt-copy-btn');
    const nativeShareBtn = document.getElementById('receipt-native-share-btn');
    const messengerPills = document.querySelectorAll('.messenger-pill');

    if (!receiptModal) return;

    let currentPeriod = 'today'; // 'today' | 'week'
    let currentFilter = 'all';   // 'all' | 'tasks' | 'meetings'

    function formatDurationLabel(mins) {
        if (!mins || mins <= 0) return '25 min';
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${mins} min`;
    }

    function isItemOnDay(item, dayIso, todayIso) {
        const itemIso = item.scheduledDate || todayIso;
        return itemIso === dayIso;
    }

    function createPlannerLine(item, type) {
        const row = document.createElement('div');
        row.className = 'planner-line-item' + (item.completed ? ' is-done' : '');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'planner-item-name';
        const checkSymbol = item.completed ? '☑' : '☐';
        nameSpan.textContent = `${checkSymbol} ${item.text}`;

        const metaSpan = document.createElement('span');
        metaSpan.className = 'planner-item-meta';
        if (type === 'meeting') {
            metaSpan.textContent = item.completed ? 'Done' : (item.time || 'Meeting');
        } else {
            const mins = parseMinutesFromText(item.text) || item.durationMinutes || 25;
            metaSpan.textContent = item.completed ? 'Done' : formatDurationLabel(mins);
        }

        row.appendChild(nameSpan);
        row.appendChild(metaSpan);
        return row;
    }

    function renderPlannerSheet(period, filter) {
        if (period) currentPeriod = period;
        if (filter) currentFilter = filter;

        periodBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === currentPeriod);
        });
        filterBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === currentFilter);
        });

        const weekDays = getUpcomingWeekDays();
        const todayObj = weekDays[0];
        const lastDayObj = weekDays[weekDays.length - 1];

        if (periodBadge) {
            periodBadge.textContent = currentPeriod === 'today' ? 'Today' : 'Next 7 Days';
        }
        if (dateStamp) {
            dateStamp.textContent = currentPeriod === 'today'
                ? `Date: ${todayObj.weekday}, ${todayObj.fullDate}`
                : `Week: ${todayObj.fullDate} – ${lastDayObj.fullDate}`;
        }

        itemsBody.innerHTML = '';

        let totalMinutes = 0;
        let totalItems = 0;
        let completedItems = 0;

        if (currentPeriod === 'today') {
            const todayMeetings = (appState.meetings || []).filter(m => isItemOnDay(m, todayObj.iso, todayObj.iso));
            const todayTasks = (appState.tasks || []).filter(t => isItemOnDay(t, todayObj.iso, todayObj.iso));

            if (currentFilter === 'all' || currentFilter === 'meetings') {
                const title = document.createElement('div');
                title.className = 'planner-section-title';
                title.textContent = '📅 Meetings for Today';
                itemsBody.appendChild(title);

                if (todayMeetings.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'planner-empty-line';
                    empty.textContent = 'No meetings scheduled for today.';
                    itemsBody.appendChild(empty);
                } else {
                    todayMeetings.forEach(m => {
                        totalItems++;
                        if (m.completed) completedItems++;
                        totalMinutes += parseMinutesFromText(m.text) || 30;
                        itemsBody.appendChild(createPlannerLine(m, 'meeting'));
                    });
                }
            }

            if (currentFilter === 'all' || currentFilter === 'tasks') {
                const title = document.createElement('div');
                title.className = 'planner-section-title';
                title.textContent = '✅ Tasks for Today';
                itemsBody.appendChild(title);

                if (todayTasks.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'planner-empty-line';
                    empty.textContent = 'No tasks scheduled for today.';
                    itemsBody.appendChild(empty);
                } else {
                    todayTasks.forEach(t => {
                        totalItems++;
                        if (t.completed) completedItems++;
                        totalMinutes += parseMinutesFromText(t.text) || t.durationMinutes || 25;
                        itemsBody.appendChild(createPlannerLine(t, 'task'));
                    });
                }
            }
        } else {
            // Upcoming Week (7 Days) view
            weekDays.forEach(day => {
                const dayMeetings = (currentFilter === 'all' || currentFilter === 'meetings')
                    ? (appState.meetings || []).filter(m => isItemOnDay(m, day.iso, todayObj.iso))
                    : [];
                const dayTasks = (currentFilter === 'all' || currentFilter === 'tasks')
                    ? (appState.tasks || []).filter(t => isItemOnDay(t, day.iso, todayObj.iso))
                    : [];

                const dayBlock = document.createElement('div');
                dayBlock.className = 'planner-day-block' + (day.offset === 0 ? ' is-today' : '');

                const dayHeader = document.createElement('div');
                dayHeader.className = 'planner-day-header';
                const count = dayMeetings.length + dayTasks.length;
                dayHeader.innerHTML = `
                    <span>${day.label}</span>
                    <span>${count > 0 ? `${count} item${count > 1 ? 's' : ''}` : 'Free day'}</span>
                `;
                dayBlock.appendChild(dayHeader);

                if (count === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'planner-empty-line';
                    empty.textContent = '☐ ________________________________________';
                    dayBlock.appendChild(empty);
                } else {
                    dayMeetings.forEach(m => {
                        totalItems++;
                        if (m.completed) completedItems++;
                        totalMinutes += parseMinutesFromText(m.text) || 30;
                        dayBlock.appendChild(createPlannerLine(m, 'meeting'));
                    });
                    dayTasks.forEach(t => {
                        totalItems++;
                        if (t.completed) completedItems++;
                        totalMinutes += parseMinutesFromText(t.text) || t.durationMinutes || 25;
                        dayBlock.appendChild(createPlannerLine(t, 'task'));
                    });
                }

                itemsBody.appendChild(dayBlock);
            });
        }

        const hours = Math.floor(totalMinutes / 60);
        const remMins = totalMinutes % 60;
        const totalTimeStr = hours > 0 ? `${hours} hr ${remMins} min` : `${remMins} min`;

        totalsBox.innerHTML = `
            <span>Completed: ${completedItems} / ${totalItems}</span>
            <span>Planned Time: ${totalTimeStr}</span>
        `;
    }

    function formatShareText() {
        const weekDays = getUpcomingWeekDays();
        const todayObj = weekDays[0];
        const lastDayObj = weekDays[weekDays.length - 1];

        if (currentPeriod === 'today') {
            const lines = [`🧠 Second Brain — Plan for Today (${todayObj.fullDate})`];
            const todayMeetings = (appState.meetings || []).filter(m => isItemOnDay(m, todayObj.iso, todayObj.iso));
            const todayTasks = (appState.tasks || []).filter(t => isItemOnDay(t, todayObj.iso, todayObj.iso));

            if (currentFilter === 'all' || currentFilter === 'meetings') {
                lines.push('\n📅 Meetings:');
                if (todayMeetings.length === 0) {
                    lines.push('• No meetings scheduled');
                } else {
                    todayMeetings.forEach(m => {
                        lines.push(`${m.completed ? '☑' : '☐'} ${m.text}`);
                    });
                }
            }

            if (currentFilter === 'all' || currentFilter === 'tasks') {
                lines.push('\n✅ Tasks:');
                if (todayTasks.length === 0) {
                    lines.push('• No tasks scheduled');
                } else {
                    todayTasks.forEach(t => {
                        const mins = parseMinutesFromText(t.text) || t.durationMinutes || 25;
                        const durTag = t.text.toLowerCase().includes('min') ? '' : ` (${mins} min)`;
                        lines.push(`${t.completed ? '☑' : '☐'} ${t.text}${durTag}`);
                    });
                }
            }
            return lines.join('\n');
        } else {
            const lines = [`🧠 Second Brain — Weekly Plan (${todayObj.shortDate} – ${lastDayObj.fullDate})`];
            weekDays.forEach(day => {
                const dayMeetings = (currentFilter === 'all' || currentFilter === 'meetings')
                    ? (appState.meetings || []).filter(m => isItemOnDay(m, day.iso, todayObj.iso))
                    : [];
                const dayTasks = (currentFilter === 'all' || currentFilter === 'tasks')
                    ? (appState.tasks || []).filter(t => isItemOnDay(t, day.iso, todayObj.iso))
                    : [];

                if (dayMeetings.length > 0 || dayTasks.length > 0) {
                    lines.push(`\n📌 ${day.label}:`);
                    dayMeetings.forEach(m => lines.push(`  ${m.completed ? '☑' : '☐'} [Meeting] ${m.text}`));
                    dayTasks.forEach(t => lines.push(`  ${t.completed ? '☑' : '☐'} ${t.text}`));
                }
            });
            return lines.join('\n');
        }
    }

    function openReceipt(filter) {
        renderPlannerSheet(currentPeriod, filter || 'all');
        receiptModal.classList.add('open');
    }

    function closeReceipt() {
        receiptModal.classList.remove('open');
    }

    if (openAllBtn) openAllBtn.onclick = () => openReceipt('all');
    if (openMeetingsBtn) openMeetingsBtn.onclick = () => openReceipt('meetings');
    if (openTasksBtn) openTasksBtn.onclick = () => openReceipt('tasks');
    if (closeBtn) closeBtn.onclick = closeReceipt;

    receiptModal.onclick = (e) => {
        if (e.target === receiptModal) closeReceipt();
    };

    periodBtns.forEach(btn => {
        btn.onclick = () => {
            playCompanionSwitchSound();
            renderPlannerSheet(btn.dataset.period, currentFilter);
        };
    });

    filterBtns.forEach(btn => {
        btn.onclick = () => {
            playCompanionSwitchSound();
            renderPlannerSheet(currentPeriod, btn.dataset.filter);
        };
    });

    if (printBtn) {
        printBtn.onclick = () => {
            window.print();
        };
    }

    if (copyBtn) {
        copyBtn.onclick = async () => {
            const text = formatShareText();
            try {
                await navigator.clipboard.writeText(text);
                const original = copyBtn.textContent;
                copyBtn.textContent = '✓ Copied!';
                setTimeout(() => {
                    copyBtn.textContent = original;
                }, 1600);
            } catch (err) {
                alert('Copy text:\n\n' + text);
            }
        };
    }

    if (nativeShareBtn) {
        nativeShareBtn.onclick = async () => {
            const text = formatShareText();
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'My Second Brain Schedule',
                        text: text
                    });
                } catch (e) {
                    // User cancelled share sheet
                }
            } else if (copyBtn) {
                copyBtn.click();
            }
        };
    }

    messengerPills.forEach(pill => {
        pill.onclick = () => {
            const channel = pill.dataset.channel;
            const text = formatShareText();
            const encoded = encodeURIComponent(text);
            const subject = encodeURIComponent('My Second Brain Schedule');

            let url = '';
            if (channel === 'telegram') {
                url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encoded}`;
            } else if (channel === 'whatsapp') {
                url = `https://wa.me/?text=${encoded}`;
            } else if (channel === 'viber') {
                url = `viber://forward?text=${encoded}`;
            } else if (channel === 'email') {
                url = `mailto:?subject=${subject}&body=${encoded}`;
            }

            if (url) {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        };
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initClock();
    renderItems();
    initModal();
    initReceiptModal();

    document.getElementById('timer-toggle-btn').onclick = toggleTimer;
    document.getElementById('timer-reset-btn').onclick = resetTimer;
    document.getElementById('timer-complete-btn').onclick = completeActiveItem;

    const companionEl = document.getElementById('focus-companion');
    if (companionEl) {
        companionEl.onclick = () => {
            appState.companionType = appState.companionType === 'plant' ? 'cat' : 'plant';
            playCompanionSwitchSound();
            saveState();
            updateTimerUI();
        };
    }

    const circadianBtn = document.getElementById('circadian-toggle');
    if (circadianBtn) {
        circadianBtn.onclick = cycleCircadianMode;
    }

    const ambientBtn = document.getElementById('ambient-sound-btn');
    if (ambientBtn) {
        ambientBtn.onclick = cycleAmbientSound;
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mins = parseInt(btn.dataset.minutes, 10);
            setPresetMinutes(mins);
        };
    });

    console.log('Second Brain App loaded successfully.');
});

