
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
    timer: {
        totalSeconds: 16 * 60, // 
        remainingSeconds: 16 * 60,
        isRunning: false
    }
};

let appState = null;
let timerInterval = null;


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
        
        const mins = type === 'task' ? parseMinutesFromText(item.text) : 25;
        appState.timer.totalSeconds = mins * 60;
        appState.timer.remainingSeconds = mins * 60;
        appState.timer.isRunning = false;
        clearInterval(timerInterval);
        
    } else {
        item.completed = true;
        appState.activeItemId = null;
        appState.timer.isRunning = false;
        clearInterval(timerInterval);
    }

    saveState();
    renderItems();
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

    if (timerHand) {
        const degrees = remRatio * 360;
        timerHand.style.transform = `rotate(${degrees}deg)`;
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

function initModal() {
    const modal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const itemIdInput = document.getElementById('item-id');
    const itemTypeInput = document.getElementById('item-type');
    const itemTextInput = document.getElementById('item-text');
    const itemTimeInput = document.getElementById('item-time');
    const form = document.getElementById('item-form');

    const addMeetingBtn = document.getElementById('add-meeting-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    function openModal(type) {
        if (itemIdInput) itemIdInput.value = '';
        itemTypeInput.value = type;
        itemTextInput.value = '';
        itemTimeInput.value = '';

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

        if (!text) return;

        if (editId) {
            let targetList = type === 'meeting' ? appState.meetings : appState.tasks;
            let existingItem = targetList.find(i => i.id === editId);

            if (existingItem) {
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

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initClock();
    renderItems();
    initModal();

    document.getElementById('timer-toggle-btn').onclick = toggleTimer;
    document.getElementById('timer-reset-btn').onclick = resetTimer;
    document.getElementById('timer-complete-btn').onclick = completeActiveItem;

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

