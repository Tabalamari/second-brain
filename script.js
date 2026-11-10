
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
let selectedDateIso = null;
let calendarYear = null;
let calendarMonth = null;
let isCalendarOpen = false;

function toIsoDateString(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getTodayIso() {
    return toIsoDateString(new Date());
}

function parseIsoDate(isoStr) {
    const [y, m, d] = (isoStr || getTodayIso()).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function formatIsoToDotDate(isoStr) {
    const dObj = parseIsoDate(isoStr);
    const d = String(dObj.getDate()).padStart(2, '0');
    const m = String(dObj.getMonth() + 1).padStart(2, '0');
    const y = dObj.getFullYear();
    return `${d}.${m}.${y}`;
}

function formatIsoToDayHeading(isoStr) {
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dObj = parseIsoDate(isoStr);
    const wk = weekdays[dObj.getDay()];
    return `${wk}, ${formatIsoToDotDate(isoStr)}`;
}

function ensureItemDates() {
    const todayIso = getTodayIso();
    if (appState && Array.isArray(appState.meetings)) {
        appState.meetings.forEach(m => {
            if (!m.date) m.date = todayIso;
        });
    }
    if (appState && Array.isArray(appState.tasks)) {
        appState.tasks.forEach(t => {
            if (!t.date) t.date = todayIso;
        });
    }
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
        }
    } catch (e) {
        console.error('Failed to load state:', e);
        appState = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }

    ensureItemDates();
    saveState();

    const now = new Date();
    selectedDateIso = getTodayIso();
    calendarYear = now.getFullYear();
    calendarMonth = now.getMonth();
}


function parseMinutesFromText(text) {
    if (!text) return null;
    
    const minMatch = text.match(/(\d+)\s*(хв|min|m|хвилин)/i);
    if (minMatch) return parseInt(minMatch[1], 10);
    
    const hrMatch = text.match(/(\d+)\s*(годин|години|година|ч|h|hours)/i);
    if (hrMatch) return parseInt(hrMatch[1], 10) * 60;
    
    return null;
}

function updateHeaderDatePill() {
    const dateEl = document.getElementById('current-date');
    const labelEl = document.getElementById('selected-date-label');
    const todayIso = getTodayIso();
    const activeIso = selectedDateIso || todayIso;

    if (labelEl) {
        labelEl.textContent = activeIso === todayIso ? 'Today:' : 'Date:';
    }
    if (dateEl) {
        dateEl.textContent = formatIsoToDotDate(activeIso);
    }
}

function initClock() {
    const clockEl = document.getElementById('digital-clock');
    
    function update() {
        const now = new Date();
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        if (clockEl) clockEl.textContent = `${hours}:${minutes}`;
        
        updateHeaderDatePill();
    }
    
    update();
    setInterval(update, 1000);
}

function isItemOnDate(item, targetIso) {
    const itemIso = item.date || getTodayIso();
    return itemIso === targetIso;
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

    const activeDate = selectedDateIso || getTodayIso();
    updateHeaderDatePill();

    const dayMeetings = appState.meetings.filter(m => isItemOnDate(m, activeDate));
    const incMeetings = dayMeetings.filter(m => !m.completed);
    const compMeetings = dayMeetings.filter(m => m.completed);

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

    const dayTasks = appState.tasks.filter(t => isItemOnDate(t, activeDate));
    const incTasks = dayTasks.filter(t => !t.completed);
    const compTasks = dayTasks.filter(t => t.completed);

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
    renderCalendar();
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
    const itemDateInput = document.getElementById('item-date');
    const form = document.getElementById('item-form');

    const addMeetingBtn = document.getElementById('add-meeting-btn');
    const addTaskBtn = document.getElementById('add-task-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    const cancelBtn = document.getElementById('modal-cancel-btn');

    function openModal(type, customDateIso) {
        if (itemIdInput) itemIdInput.value = '';
        itemTypeInput.value = type;
        itemTextInput.value = '';
        itemTimeInput.value = '';
        if (itemDateInput) {
            itemDateInput.value = customDateIso || selectedDateIso || getTodayIso();
        }

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

    window.openAddModal = openModal;

    window.openEditModal = function(item, type) {
        if (itemIdInput) itemIdInput.value = item.id;
        itemTypeInput.value = type;

        itemTextInput.value = item.text || '';
        const parsedDur = parseMinutesFromText(item.text);
        itemTimeInput.value = type === 'meeting' ? (item.time || '') : (parsedDur ? `${parsedDur} min` : '');
        if (itemDateInput) {
            itemDateInput.value = item.date || selectedDateIso || getTodayIso();
        }

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
        const chosenDate = (itemDateInput && itemDateInput.value) ? itemDateInput.value : (selectedDateIso || getTodayIso());

        if (!text) return;

        if (editId) {
            let targetList = type === 'meeting' ? appState.meetings : appState.tasks;
            let existingItem = targetList.find(i => i.id === editId);

            if (existingItem) {
                existingItem.date = chosenDate;
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
                    date: chosenDate,
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
                    date: chosenDate,
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

function renderCalendar() {
    const gridEl = document.getElementById('calendar-days-grid');
    const monthTitleEl = document.getElementById('cal-month-title');
    if (!gridEl || !monthTitleEl) return;

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    monthTitleEl.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;
    gridEl.innerHTML = '';

    const todayIso = getTodayIso();
    const activeIso = selectedDateIso || todayIso;

    // Week starts on Monday: convert JS getDay() (0=Sun..6=Sat) -> Monday-first index (0=Mon..6=Sun)
    const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
    const mondayFirstOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    const totalCells = 42; // 6 full weeks (Monday to Sunday)

    for (let i = 0; i < totalCells; i++) {
        let cellYear = calendarYear;
        let cellMonth = calendarMonth;
        let dayNum = 1;
        let isOtherMonth = false;

        if (i < mondayFirstOffset) {
            isOtherMonth = true;
            dayNum = daysInPrevMonth - mondayFirstOffset + 1 + i;
            const prevDate = new Date(calendarYear, calendarMonth - 1, dayNum);
            cellYear = prevDate.getFullYear();
            cellMonth = prevDate.getMonth();
        } else if (i >= mondayFirstOffset + daysInCurrentMonth) {
            isOtherMonth = true;
            dayNum = i - (mondayFirstOffset + daysInCurrentMonth) + 1;
            const nextDate = new Date(calendarYear, calendarMonth + 1, dayNum);
            cellYear = nextDate.getFullYear();
            cellMonth = nextDate.getMonth();
        } else {
            dayNum = i - mondayFirstOffset + 1;
        }

        const cellDateObj = new Date(cellYear, cellMonth, dayNum);
        const cellIso = toIsoDateString(cellDateObj);

        const dayMeetings = appState.meetings.filter(m => isItemOnDate(m, cellIso));
        const dayTasks = appState.tasks.filter(t => isItemOnDate(t, cellIso));
        const allDayNotes = [
            ...dayMeetings.map(m => ({ ...m, _type: 'meeting' })),
            ...dayTasks.map(t => ({ ...t, _type: 'task' }))
        ];

        const cell = document.createElement('div');
        cell.className = 'cal-day-cell';
        if (isOtherMonth) cell.classList.add('is-other-month');
        if (cellIso === todayIso) cell.classList.add('is-today');
        if (cellIso === activeIso) cell.classList.add('is-selected');
        cell.dataset.date = cellIso;

        const topRow = document.createElement('div');
        topRow.className = 'cal-day-top';

        const numSpan = document.createElement('span');
        numSpan.className = 'cal-day-number';
        numSpan.textContent = dayNum;
        topRow.appendChild(numSpan);

        if (allDayNotes.length > 0) {
            const countBadge = document.createElement('span');
            countBadge.className = 'cal-day-count';
            countBadge.textContent = allDayNotes.length;
            topRow.appendChild(countBadge);
        }

        cell.appendChild(topRow);

        const previewBox = document.createElement('div');
        previewBox.className = 'cal-day-notes-preview';

        allDayNotes.slice(0, 2).forEach(note => {
            const chip = document.createElement('div');
            chip.className = 'cal-note-chip'
                + (note._type === 'meeting' ? ' is-meeting' : '')
                + (note.completed ? ' is-completed' : '');
            chip.textContent = note.text;
            previewBox.appendChild(chip);
        });

        if (allDayNotes.length > 2) {
            const moreChip = document.createElement('div');
            moreChip.className = 'cal-more-chip';
            moreChip.textContent = `+${allDayNotes.length - 2} more`;
            previewBox.appendChild(moreChip);
        }

        cell.appendChild(previewBox);

        cell.onclick = () => {
            selectedDateIso = cellIso;
            if (isOtherMonth) {
                calendarYear = cellYear;
                calendarMonth = cellMonth;
            }
            renderItems();
        };

        gridEl.appendChild(cell);
    }

    renderCalendarDayPanel();
}

function renderCalendarDayPanel() {
    const titleEl = document.getElementById('cal-selected-date-title');
    const meetingsListEl = document.getElementById('cal-day-meetings');
    const tasksListEl = document.getElementById('cal-day-tasks');

    if (!titleEl || !meetingsListEl || !tasksListEl) return;

    const activeIso = selectedDateIso || getTodayIso();
    titleEl.textContent = formatIsoToDayHeading(activeIso);

    meetingsListEl.innerHTML = '';
    tasksListEl.innerHTML = '';

    const dayMeetings = appState.meetings.filter(m => isItemOnDate(m, activeIso));
    const dayTasks = appState.tasks.filter(t => isItemOnDate(t, activeIso));

    if (dayMeetings.length === 0) {
        meetingsListEl.innerHTML = `<div class="empty-placeholder">No meetings on this day</div>`;
    } else {
        dayMeetings.forEach(item => meetingsListEl.appendChild(createItemCard(item, 'meeting')));
    }

    if (dayTasks.length === 0) {
        tasksListEl.innerHTML = `<div class="empty-placeholder">No tasks on this day</div>`;
    } else {
        dayTasks.forEach(item => tasksListEl.appendChild(createItemCard(item, 'task')));
    }
}

function setCalendarViewOpen(open) {
    isCalendarOpen = open;
    const boardView = document.getElementById('board-view');
    const calendarView = document.getElementById('calendar-view');
    const toggleBtn = document.getElementById('calendar-toggle-btn');

    if (boardView && calendarView) {
        boardView.classList.toggle('hidden', isCalendarOpen);
        calendarView.classList.toggle('hidden', !isCalendarOpen);
    }

    if (toggleBtn) {
        toggleBtn.classList.toggle('is-active', isCalendarOpen);
        toggleBtn.textContent = isCalendarOpen ? '📋 Board' : '📅 Calendar';
    }

    if (isCalendarOpen) {
        renderCalendar();
    }
}

function initCalendar() {
    const toggleBtn = document.getElementById('calendar-toggle-btn');
    const todayPill = document.getElementById('today-pill');
    const prevMonthBtn = document.getElementById('cal-prev-month');
    const nextMonthBtn = document.getElementById('cal-next-month');
    const gotoTodayBtn = document.getElementById('cal-goto-today');
    const addMeetingDayBtn = document.getElementById('cal-add-meeting-btn');
    const addTaskDayBtn = document.getElementById('cal-add-task-btn');
    const openOnBoardBtn = document.getElementById('cal-open-on-board-btn');

    if (toggleBtn) {
        toggleBtn.onclick = () => setCalendarViewOpen(!isCalendarOpen);
    }

    if (todayPill) {
        todayPill.onclick = () => setCalendarViewOpen(!isCalendarOpen);
    }

    if (prevMonthBtn) {
        prevMonthBtn.onclick = () => {
            calendarMonth--;
            if (calendarMonth < 0) {
                calendarMonth = 11;
                calendarYear--;
            }
            renderCalendar();
        };
    }

    if (nextMonthBtn) {
        nextMonthBtn.onclick = () => {
            calendarMonth++;
            if (calendarMonth > 11) {
                calendarMonth = 0;
                calendarYear++;
            }
            renderCalendar();
        };
    }

    if (gotoTodayBtn) {
        gotoTodayBtn.onclick = () => {
            const now = new Date();
            selectedDateIso = getTodayIso();
            calendarYear = now.getFullYear();
            calendarMonth = now.getMonth();
            renderItems();
        };
    }

    if (addMeetingDayBtn) {
        addMeetingDayBtn.onclick = () => {
            if (window.openAddModal) {
                window.openAddModal('meeting', selectedDateIso || getTodayIso());
            }
        };
    }

    if (addTaskDayBtn) {
        addTaskDayBtn.onclick = () => {
            if (window.openAddModal) {
                window.openAddModal('task', selectedDateIso || getTodayIso());
            }
        };
    }

    if (openOnBoardBtn) {
        openOnBoardBtn.onclick = () => {
            setCalendarViewOpen(false);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initClock();
    renderItems();
    initModal();
    initCalendar();

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

