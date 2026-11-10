# 🧠 Second Brain

**Second Brain** is a minimalist, single-workspace web application designed to organize your daily meetings, tasks, and time management with an interactive focus timer.

---

## 🎯 Project Goal & Target Audience

### What is the goal of the project?
The main goal of **Second Brain** is to reduce cognitive overload by bringing daily scheduling and time tracking together onto one visual board—without switching between tabs or complex productivity tools. It combines a meeting schedule, a to-do list, and a Pomodoro-style visual timer so you can focus on one active task at a time.

### Who is it for?
* **Students & Learners** — for organizing classes, deadlines, and study sessions using time-blocking or the Pomodoro technique.
* **Freelancers & Remote Workers** — for keeping track of daily calls/meetings and monitoring time spent on tasks.
* **People with ADHD or Focus Challenges** — features clear visual highlighting of the active task, an analog SVG progress dial with a moving hand, and a synthesized musical chime when time is up.
* **Minimalism & Visual Board Enthusiasts** — styled with a warm, hand-drawn neobrutalist aesthetic that works instantly in the browser with zero setup or sign-up.

---

## ✨ Key Features

* **📅 Meeting Schedule:**
  * Split into upcoming (upper section) and completed/past (lower section) meetings.
  * Automatic meeting time prefix formatting (e.g., `12:30 movie`).
* **✅ Task Schedule:**
  * Separate sections for active and completed tasks.
  * Smart duration parsing directly from task text (supports `min`, `m`, `h`, `hours`, as well as Ukrainian units `хв`, `хвилин`, `годин`, etc.) to automatically configure the timer when a task is selected.
* **⏱️ Interactive Focus Timer:**
  * **Visual SVG Dial:** circular progress ring and analog clock hand that smoothly animate as time counts down.
  * **Quick Presets:** one-click `5min`, `15min`, `25min`, `30min`, and `60min` buttons.
  * **Controls:** `Start` / `Pause`, `Reset`, and quick `Complete` for the currently active item.
  * **Audio Notification:** a pleasant musical chord (C5–E5–G5–C6) synthesized via the **Web Audio API** upon completion (no external audio files required).
* **🕒 Live Clock & Date:** real-time date (`DD.MM.YYYY`) and digital clock (`HH:MM`) displayed in the board header.
* **💾 Persistent Local State:** all meetings, tasks, the active item, and timer state are automatically saved in the browser's `localStorage` (`SECOND_BRAIN_APP_STATE_V2`).
* **✏️ Intuitive Item Management:**
  * Single-click an incomplete card to select it as the active item in the timer.
  * Click the active card again (or press `✓ Complete`) to mark it as completed.
  * Click a completed card to move it back to the active list.
  * Edit items via the `✏️` button or right-click context menu; delete items via the `🗑` button.

---

## 🗂️ Project Structure

```text
second-brain/
├── index.html   # Main board layout (Header, Meetings, Tasks, Timer columns) & modal dialog
├── styles.css   # UI styling, CSS custom properties, animations, and responsive Grid layout
├── script.js    # State management, localStorage persistence, timer logic, duration parser, Web Audio API
├── assets/      # Directory for static assets
└── README.md    # Project documentation
```

---

## 🛠️ Tech Stack

* **HTML5** — semantic markup and inline `<svg>` graphics for the analog timer dial.
* **CSS3** — CSS Variables, CSS Grid & Flexbox, smooth transitions, pulse animations, and Google Fonts (*Quicksand*, *Shantell Sans*, *Patrick Hand*).
* **Vanilla JavaScript (ES6+)** — dependency-free JS utilizing `localStorage` for state persistence and the `Web Audio API` for sound synthesis.

---

## 🚀 Getting Started

This project requires no build tools or package installations (`npm`, etc.):

1. Clone the repository or download the project files:
   ```bash
   git clone <repository-url>
   cd second-brain
   ```
2. Open `index.html` in any modern web browser (by double-clicking the file or using the **Live Server** extension in VS Code).
