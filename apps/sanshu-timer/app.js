(function() {
    'use strict';

    // =================================================================
    // Constants
    // =================================================================
    var BUY_URL = 'https://note.com/houday';
    const STORAGE_KEY_PREFIX = 'hd_sanshu-timer_';
    const STORAGE_KEY_HISTORY = `${STORAGE_KEY_PREFIX}history`;
    const STORAGE_KEY_SESSION = `${STORAGE_KEY_PREFIX}current_session`;

    const MODES = {
        TAKUITSU: 'takuitsu',
        SENTAKU: 'sentaku'
    };

    const TAKUITSU_DEF = {
        totalQuestions: 70,
        subjects: [
            { name: '労基・安衛', count: 10 },
            { name: '労災・徴収', count: 10 },
            { name: '雇用・徴収', count: 10 },
            { name: '労一・社一', count: 10 },
            { name: '健保', count: 10 },
            { name: '厚年', count: 10 },
            { name: '国年', count: 10 },
        ],
        defaultRoundTimes: [60, 90, 60], // minutes for round 1, 2, 3
        checkpoints: [9, 17, 26, 34, 43, 51, 60], // minutes
    };

    const SENTAKU_DEF = {
        totalSubjects: 8,
        subjects: [
            { name: '労基安衛', kuuran: 5 },
            { name: '労災', kuuran: 5 },
            { name: '雇用', kuuran: 5 },
            { name: '労一', kuuran: 5 },
            { name: '社一', kuuran: 5 },
            { name: '健保', kuuran: 5 },
            { name: '厚年', kuuran: 5 },
            { name: '国年', kuuran: 5 },
        ],
        defaultRoundTimes: [20, 40, 20], // minutes for round 1, 2, 3
        checkpoints: [2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20], // minutes
    };

    const QUESTION_STATES_TAKU = ['none', 'l1', 'l2', 'l3'];
    const QUESTION_STATES_SENTAKU = ['none', 'safe', 'danger'];
    let longPressTimer;

    // =================================================================
    // State
    // =================================================================
    let state = {
        currentScreen: 'mode-selection-screen',
        currentMode: null, // MODES.TAKUITSU or MODES.SENTAKU
        session: null, // { mode, round, startTime, roundStartTime, pausedTime, totalPausedTime, questionStates, ... }
        timerInterval: null,
        history: [],
        audioContext: null,
        wakeLock: null,
    };

    // =================================================================
    // DOM Elements
    // =================================================================
    const dom = {
        planBadge: document.getElementById('planBadge'),
        proBtn: document.getElementById('proBtn'),
        main: document.getElementById('main'),
        screens: {
            modeSelection: document.getElementById('mode-selection-screen'),
            timer: document.getElementById('timer-screen'),
            result: document.getElementById('result-screen'),
            history: document.getElementById('history-screen'),
        },
        // Mode Selection
        startTakuitsuBtn: document.getElementById('start-takuitsu-btn'),
        startSentakuBtn: document.getElementById('start-sentaku-btn'),
        settings: {
            takuR1: document.getElementById('taku-round1-time'),
            takuR2: document.getElementById('taku-round2-time'),
            takuR3: document.getElementById('taku-round3-time'),
            sentakuR1: document.getElementById('sentaku-round1-time'),
            sentakuR2: document.getElementById('sentaku-round2-time'),
            sentakuR3: document.getElementById('sentaku-round3-time'),
            proBtn: document.getElementById('settings-pro-btn'),
            takuitsuSettings: document.getElementById('takuitsu-settings'),
            sentakuSettings: document.getElementById('sentaku-settings'),
        },
        historyListSummary: document.getElementById('history-list-summary'),
        historyBtn: document.getElementById('history-btn'),
        usageCard: document.getElementById('usage-card'),
        toggleUsageBtn: document.getElementById('toggle-usage-btn'),

        // Timer
        currentRoundDisplay: document.getElementById('current-round-display'),
        roundTimerDisplay: document.getElementById('round-timer-display'),
        totalTimerDisplay: document.getElementById('total-timer-display'),
        checkpointBar: document.getElementById('checkpoint-bar'),
        questionGridTaku: document.getElementById('question-grid-takuitsu'),
        questionGridSentaku: document.getElementById('question-grid-sentaku'),
        nextRoundBtn: document.getElementById('next-round-btn'),
        pauseResumeBtn: document.getElementById('pause-resume-btn'),
        stopBtn: document.getElementById('stop-btn'),
        soundToggle: document.getElementById('sound-toggle'),

        // Result
        resultScreen: document.getElementById('result-screen'),
        resultMode: document.getElementById('result-mode'),
        resultTotalTime: document.getElementById('result-total-time'),
        resultSummary: document.getElementById('result-summary'),
        resultCpDiff: document.getElementById('result-cp-diff'),
        resultWarnings: document.getElementById('result-warnings'),
        resultMemo: document.getElementById('result-memo'),
        saveMemoBtn: document.getElementById('save-memo-btn'),
        backToTopBtn: document.getElementById('back-to-top-btn'),

        // History
        historyScreen: document.getElementById('history-screen'),
        historyListFull: document.getElementById('history-list-full'),
        historyProNote: document.getElementById('history-pro-note'),
        historyChart: document.getElementById('history-chart'),
        backToTopFromHistoryBtn: document.getElementById('back-to-top-from-history-btn'),
        historyProBtn: document.getElementById('history-pro-btn'),

        // Dialog
        confirmDialog: document.getElementById('confirm-dialog'),
        confirmMessage: document.getElementById('confirm-message'),
        confirmOkBtn: document.getElementById('confirm-ok-btn'),
        confirmCancelBtn: document.getElementById('confirm-cancel-btn'),
    };
    
    // =================================================================
    // Utility Functions
    // =================================================================

    function formatTime(seconds) {
        const s = Math.floor(seconds);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        const secs = s % 60;
        const mins = m % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function playBeep(frequency = 440, duration = 100) {
        if (!state.audioContext || !dom.soundToggle.checked) return;
        const oscillator = state.audioContext.createOscillator();
        const gainNode = state.audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(state.audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, state.audioContext.currentTime);
        gainNode.gain.setValueAtTime(1, state.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.00001, state.audioContext.currentTime + duration / 1000);
        oscillator.start();
        oscillator.stop(state.audioContext.currentTime + duration / 1000);
    }
    
    function vibrate(duration = 100) {
        if (navigator.vibrate && dom.soundToggle.checked) {
            navigator.vibrate(duration);
        }
    }
    
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                state.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock is active.');
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
            }
        }
    }

    async function releaseWakeLock() {
        if (state.wakeLock !== null) {
            await state.wakeLock.release();
            state.wakeLock = null;
            console.log('Wake Lock was released.');
        }
    }

    function showConfirmation(message, onConfirm) {
        dom.confirmMessage.textContent = message;
        dom.confirmDialog.classList.remove('hidden');
        dom.confirmOkBtn.onclick = () => {
            dom.confirmDialog.classList.add('hidden');
            onConfirm();
        };
        dom.confirmCancelBtn.onclick = () => {
            dom.confirmDialog.classList.add('hidden');
        };
    }
    
    // =================================================================
    // Local Storage
    // =================================================================

    function loadHistory() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
            state.history = stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to parse history from localStorage', e);
            state.history = [];
        }
    }

    function saveHistory() {
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
    }
    
    function saveSession() {
        if (state.session) {
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(state.session));
        } else {
            localStorage.removeItem(STORAGE_KEY_SESSION);
        }
    }

    function loadSession() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SESSION);
            if(stored) {
                state.session = JSON.parse(stored);
                return true;
            }
            return false;
        } catch (e) {
            console.error('Failed to parse session from localStorage', e);
            localStorage.removeItem(STORAGE_KEY_SESSION);
            return false;
        }
    }

    // =================================================================
    // Screen Management
    // =================================================================

    function showScreen(screenId) {
        state.currentScreen = screenId;
        Object.values(dom.screens).forEach(screen => {
            screen.classList.add('hidden');
        });
        dom.screens[screenId.replace('-screen', '').replace(/-(\w)/g, (_, c) => c.toUpperCase())].classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // =================================================================
    // Rendering
    // =================================================================

    function render() {
        renderPlan();
        switch (state.currentScreen) {
            case 'mode-selection-screen':
                renderModeSelectionScreen();
                break;
            case 'timer-screen':
                renderTimerScreen();
                break;
            case 'result-screen':
                renderResultScreen();
                break;
            case 'history-screen':
                renderHistoryScreen();
                break;
        }
    }

    function renderPlan() {
        const isPro = window.HDLicense && window.HDLicense.isPro();
        dom.planBadge.textContent = isPro ? 'Pro' : 'Free';
        dom.planBadge.className = isPro ? 'badge pro' : 'badge';
        dom.proBtn.textContent = isPro ? 'Pro有効' : 'Pro版';

        // Unlock settings for Pro
        [dom.settings.takuR1, dom.settings.takuR2, dom.settings.takuR3, 
         dom.settings.sentakuR1, dom.settings.sentakuR2, dom.settings.sentakuR3].forEach(input => {
            input.disabled = !isPro;
        });
        document.querySelector('#settings-card .note').classList.toggle('hidden', isPro);
        document.querySelector('#settings-card .pro-lock').classList.toggle('hidden', isPro);
        
        dom.historyProNote.classList.toggle('hidden', isPro || state.history.length === 0);
    }
    
    function renderModeSelectionScreen() {
        dom.settings.takuitsuSettings.classList.remove('hidden');
        dom.settings.sentakuSettings.classList.remove('hidden');
        renderHistoryList(dom.historyListSummary, true);
    }
    
    function renderTimerScreen() {
        if (!state.session) return;
        // Grids
        renderQuestionGrid();
        updateTimerDisplay();
        updateCheckpointBar();
        
        dom.currentRoundDisplay.textContent = `${state.session.round}/${state.session.roundTimes.length}`;

        // Next round button
        const isLastRound = state.session.round >= state.session.roundTimes.length;
        dom.nextRoundBtn.textContent = isLastRound ? '結果を見る' : `${state.session.round + 1}周目へ`;

        // Highlight questions for current round
        updateQuestionHighlights();
    }
    
    function renderResultScreen() {
        if (!state.session) return;
        const result = calculateResults();
        
        dom.resultMode.textContent = state.session.mode === MODES.TAKUITSU ? '択一式' : '選択式';
        dom.resultTotalTime.textContent = formatTime(result.totalTime);
        
        // Summary Table
        const def = state.session.mode === MODES.TAKUITSU ? TAKUITSU_DEF : SENTAKU_DEF;
        let summaryHtml = '<table class="data-table"><thead><tr><th>科目</th>';
        const states = state.session.mode === MODES.TAKUITSU ? ['L1', 'L2', 'L3', '済'] : ['安全', '危険', '済'];
        states.forEach(s => summaryHtml += `<th>${s}</th>`);
        summaryHtml += '</tr></thead><tbody>';
        
        def.subjects.forEach((subj, i) => {
            summaryHtml += `<tr><td>${subj.name}</td>`;
            states.forEach(s => {
                const stateKey = s === '済' ? 'done' : s.toLowerCase();
                summaryHtml += `<td>${result.summary[i][stateKey] || 0}</td>`;
            });
            summaryHtml += '</tr>';
        });
        summaryHtml += '</tbody></table>';
        dom.resultSummary.innerHTML = summaryHtml;
        
        // CP Diff Table
        if (state.session.mode === MODES.TAKUITSU) {
             let cpHtml = '<table class="data-table"><thead><tr><th>科目</th><th>目標CP</th><th>実績</th><th>差</th></tr></thead><tbody>';
             def.subjects.forEach((subj, i) => {
                 const target = def.checkpoints[i];
                 const actual = result.cpTimes[i];
                 const diff = actual - target * 60;
                 const diffStr = diff > 0 ? `+${formatTime(diff)}` : formatTime(diff);
                 cpHtml += `<tr>
                    <td>${subj.name}</td>
                    <td>${formatTime(target*60)}</td>
                    <td>${actual ? formatTime(actual) : '-'}</td>
                    <td class="${diff > 0 ? 'ng' : 'ok'}">${actual ? diffStr : '-'}</td>
                 </tr>`;
             });
             cpHtml += '</tbody></table>';
             dom.resultCpDiff.innerHTML = cpHtml;
             dom.resultCpDiff.previousElementSibling.classList.remove('hidden');
        } else {
            dom.resultCpDiff.innerHTML = '';
            dom.resultCpDiff.previousElementSibling.classList.add('hidden');
        }
        
        // Warnings
        let warningsHtml = '';
        if (result.l3WarningSubjects.length > 0) {
            warningsHtml += `<div class="alert warn">L3(捨て)が多かった科目: ${result.l3WarningSubjects.join(', ')}。復習を推奨します。</div>`;
        }
        dom.resultWarnings.innerHTML = warningsHtml;
        
        // Memo
        dom.resultMemo.value = state.session.memo || '';
    }
    
    function renderHistoryScreen() {
        renderHistoryList(dom.historyListFull, false);
        renderHistoryChart();
    }
    
    function renderHistoryList(container, isSummary) {
        container.innerHTML = '';
        const isPro = window.HDLicense && window.HDLicense.isPro();
        const limit = isPro ? state.history.length : 3;
        const historyToShow = state.history.slice(0, limit);

        if (historyToShow.length === 0) {
            container.innerHTML = '<p class="muted">履歴はありません。</p>';
            return;
        }

        historyToShow.forEach(session => {
            const card = document.createElement('div');
            card.className = 'card';
            card.dataset.sessionId = session.id;
            const date = new Date(session.startTime).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const l3Count = calculateResults(session).l3Count;
            card.innerHTML = `
                <div class="row">
                    <strong>${date}</strong>
                    <span class="pill">${session.mode === MODES.TAKUITSU ? '択一' : '選択'}</span>
                </div>
                <div class="row">
                    <span>所要時間: ${formatTime(calculateResults(session).totalTime)}</span>
                    <span class="pill ng">L3: ${l3Count}</span>
                </div>
            `;
            card.onclick = () => {
                state.session = session;
                showScreen('result-screen');
                render();
            };
            container.appendChild(card);
        });
        
        if (!isPro && state.history.length > 3 && isSummary) {
             const proNote = document.createElement('div');
             proNote.className = 'note';
             proNote.innerHTML = `他${state.history.length - 3}件の履歴はPro版で確認できます。`;
             container.appendChild(proNote);
        }
    }
    
    function renderHistoryChart() {
        const isPro = window.HDLicense && window.HDLicense.isPro();
        if (!isPro || state.history.length < 2) {
            dom.historyChart.classList.add('hidden');
            return;
        }
        dom.historyChart.classList.remove('hidden');
        
        const ctx = dom.historyChart.getContext('2d');
        // This is a placeholder for a complex chart implementation.
        // A real implementation would use a library or extensive Canvas API calls.
        // For this exercise, we'll draw something simple.
        const takuHistory = state.history.filter(s => s.mode === MODES.TAKUITSU).reverse();
        if (takuHistory.length < 2) {
            ctx.clearRect(0, 0, dom.historyChart.width, dom.historyChart.height);
            dom.historyChart.previousElementSibling.textContent = '択一式の履歴が2件以上でグラフが表示されます。';
            return;
        }
        
        const labels = takuHistory.map((s, i) => i + 1);
        const l3Data = takuHistory.map(s => calculateResults(s).l3Count);
        
        // Simple drawing logic
        ctx.clearRect(0, 0, dom.historyChart.width, dom.historyChart.height);
        ctx.font = "10px sans-serif";
        ctx.fillStyle = "#999";
        ctx.fillText("L3数推移(択一式)", 5, 15);

        const maxL3 = Math.max(...l3Data);
        const width = dom.historyChart.width - 20;
        const height = dom.historyChart.height - 30;
        
        // Draw L3 line
        ctx.beginPath();
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        l3Data.forEach((d, i) => {
            const x = 10 + (i / (l3Data.length - 1)) * width;
            const y = 20 + height - (d / maxL3) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            ctx.fillText(d, x, y-2);
        });
        ctx.stroke();
    }


    function createQuestionGrid() {
        if (state.currentMode === MODES.TAKUITSU) {
            createTakuitsuGrid();
        } else {
            createSentakuGrid();
        }
    }

    function createTakuitsuGrid() {
        const grid = dom.questionGridTaku;
        grid.innerHTML = '';
        let qNum = 1;
        TAKUITSU_DEF.subjects.forEach(subject => {
            const group = document.createElement('div');
            group.className = 'subject-group';
            const name = document.createElement('div');
            name.className = 'subject-name';
            name.textContent = `${subject.name} (${qNum}〜${qNum + subject.count - 1})`;
            grid.appendChild(name);

            for (let i = 0; i < subject.count; i++) {
                const btn = document.createElement('button');
                btn.className = 'question-btn';
                btn.dataset.q = qNum;
                btn.textContent = qNum;
                addQuestionBtnListeners(btn);
                grid.appendChild(btn);
                qNum++;
            }
        });
    }

    function createSentakuGrid() {
        const grid = dom.questionGridSentaku;
        grid.innerHTML = '';
        
        // Header
        grid.appendChild(document.createElement('div')); // empty corner
        for(let i=1; i<=5; i++) {
            const header = document.createElement('div');
            header.className = 'sentaku-header';
            header.textContent = `空欄${i}`;
            grid.appendChild(header);
        }

        SENTAKU_DEF.subjects.forEach((subject, subjIndex) => {
            const label = document.createElement('div');
            label.className = 'sentaku-subject-label';
            label.textContent = subject.name;
            grid.appendChild(label);
            
            for (let i = 0; i < subject.kuuran; i++) {
                const btn = document.createElement('button');
                btn.className = 'sentaku-kuuran-btn';
                btn.dataset.q = `${subjIndex}-${i}`;
                btn.textContent = String.fromCharCode(65 + i); // A, B, C...
                addQuestionBtnListeners(btn);
                grid.appendChild(btn);
            }
        });
    }

    function renderQuestionGrid() {
        const isTaku = state.session.mode === MODES.TAKUITSU;
        dom.questionGridTaku.classList.toggle('hidden', !isTaku);
        dom.questionGridSentaku.classList.toggle('hidden', isTaku);
        const grid = isTaku ? dom.questionGridTaku : dom.questionGridSentaku;

        const states = state.session.questionStates;
        for (const key in states) {
            const btn = grid.querySelector(`[data-q='${key}']`);
            if (btn) {
                const [state, done] = states[key];
                const stateClass = state || 'none';
                
                let classes;
                if(isTaku) {
                    classes = QUESTION_STATES_TAKU;
                } else {
                    classes = QUESTION_STATES_SENTAKU;
                }
                
                btn.classList.remove(...classes, 'done');
                if (stateClass !== 'none') {
                    btn.classList.add(stateClass);
                }
                if (done) {
                    btn.classList.add('done');
                }
            }
        }
    }
    
    function updateQuestionHighlights() {
        if (!state.session) return;
        
        const isTaku = state.session.mode === MODES.TAKUITSU;
        const grid = isTaku ? dom.questionGridTaku : dom.questionGridSentaku;
        const allBtns = grid.querySelectorAll('[data-q]');
        
        let targetState = null;
        if(state.session.round === 2) targetState = isTaku ? 'l2' : 'danger';
        if(state.session.round === 3) targetState = 'l3';

        allBtns.forEach(btn => {
            const key = btn.dataset.q;
            const [qState, done] = state.session.questionStates[key] || ['none', false];
            const isTarget = qState === targetState;
            
            let shouldBeDisabled = false;
            if(targetState && !isTarget) {
                 shouldBeDisabled = true;
            }
            if(done) {
                shouldBeDisabled = true;
            }
            
            btn.classList.toggle('disabled', shouldBeDisabled);
        });
    }

    function updateCheckpointBar() {
        if (!state.session || state.session.mode !== MODES.TAKUITSU) {
            dom.checkpointBar.innerHTML = '';
            return;
        }

        const elapsed = (Date.now() - state.session.startTime - state.session.totalPausedTime) / 1000;
        let targetSubjIndex = TAKUITSU_DEF.checkpoints.findIndex(cp => elapsed < cp * 60);
        if (targetSubjIndex === -1 && elapsed < TAKUITSU_DEF.checkpoints[TAKUITSU_DEF.checkpoints.length - 1] * 60) {
             targetSubjIndex = TAKUITSU_DEF.subjects.length - 1;
        }

        let html = '<table><tr>';
        TAKUITSU_DEF.subjects.forEach((s,i) => html += `<th>${s.name}</th>`);
        html += '</tr><tr>';
        TAKUITSU_DEF.subjects.forEach((s,i) => {
            let classes = [];
            if (state.session.currentSubjectIndex === i) classes.push('current-subject');
            if (targetSubjIndex === i) classes.push('target-subject');
            html += `<td class="${classes.join(' ')}" data-subj-index="${i}">${TAKUITSU_DEF.checkpoints[i]}'</td>`;
        });
        html += '</tr><tr>';
        // Placeholder for time diff
        TAKUITSU_DEF.subjects.forEach((s,i) => html += `<td data-subj-diff-index="${i}"></td>`);
        html += '</tr></table>';
        dom.checkpointBar.innerHTML = html;
        
        // Add click listeners to change current subject
        dom.checkpointBar.querySelectorAll('[data-subj-index]').forEach(cell => {
           cell.onclick = () => {
               const newIndex = parseInt(cell.dataset.subjIndex, 10);
               state.session.currentSubjectIndex = newIndex;
               // Record time
               if (!state.session.cpTimes) state.session.cpTimes = {};
               state.session.cpTimes[newIndex] = (Date.now() - state.session.startTime - state.session.totalPausedTime) / 1000;
               saveSession();
               updateCheckpointBar();
           };
        });
        
        // Display time diff
        if(state.session.cpTimes) {
            for(const idx in state.session.cpTimes) {
                const diffCell = dom.checkpointBar.querySelector(`[data-subj-diff-index="${idx}"]`);
                if(diffCell) {
                    const diff = state.session.cpTimes[idx] - (TAKUITSU_DEF.checkpoints[idx] * 60);
                    diffCell.textContent = (diff > 0 ? '+' : '') + Math.round(diff/60) + '分';
                    diffCell.className = diff > 0 ? 'progress-diff minus' : 'progress-diff plus';
                }
            }
        }
    }


    // =================================================================
    // Timer Logic
    // =================================================================

    function startTimer(mode) {
        state.currentMode = mode;
        const isPro = window.HDLicense && window.HDLicense.isPro();
        let roundTimes;

        if (mode === MODES.TAKUITSU) {
            roundTimes = isPro ? 
                [parseInt(dom.settings.takuR1.value, 10), parseInt(dom.settings.takuR2.value, 10), parseInt(dom.settings.takuR3.value, 10)] 
                : TAKUITSU_DEF.defaultRoundTimes;
        } else {
            roundTimes = isPro ?
                [parseInt(dom.settings.sentakuR1.value, 10), parseInt(dom.settings.sentakuR2.value, 10), parseInt(dom.settings.sentakuR3.value, 10)]
                : SENTAKU_DEF.defaultRoundTimes;
        }

        state.session = {
            id: 'session_' + Date.now(),
            mode: mode,
            round: 1,
            roundTimes: roundTimes, // in minutes
            startTime: Date.now(),
            roundStartTime: Date.now(),
            pausedTime: 0,
            totalPausedTime: 0,
            questionStates: {},
            currentSubjectIndex: 0,
            cpTimes: {},
            memo: '',
        };

        createQuestionGrid();
        showScreen('timer-screen');
        runTimer();
        requestWakeLock();
    }
    
    function resumeSession() {
        showScreen('timer-screen');
        createQuestionGrid(); // Create grid first
        render(); // Then render states onto it
        
        if (state.session.pausedTime) { // Paused
            state.session.paused = true;
            dom.pauseResumeBtn.textContent = '再開';
            updateTimerDisplay(); // show stored time
            updateCheckpointBar();
        } else { // Running
             state.session.paused = false;
             runTimer();
        }
        requestWakeLock();
    }

    function runTimer() {
        if (state.timerInterval) clearInterval(state.timerInterval);
        state.session.paused = false;
        
        state.timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
        dom.pauseResumeBtn.textContent = '一時停止';
    }

    function updateTimer() {
        if (!state.session || state.session.paused) return;

        const now = Date.now();
        const totalElapsed = (now - state.session.startTime - state.session.totalPausedTime) / 1000;
        const roundElapsed = (now - state.session.roundStartTime - state.session.totalPausedTime) / 1000;
        const currentRoundTimeLimit = state.session.roundTimes[state.session.round - 1] * 60;
        const roundRemaining = currentRoundTimeLimit - roundElapsed;

        dom.totalTimerDisplay.textContent = formatTime(totalElapsed);
        dom.roundTimerDisplay.textContent = formatTime(Math.max(0, roundRemaining));
        
        if (state.session.mode === MODES.TAKUITSU) {
            updateCheckpointBar();
        }

        // Notifications
        if (roundRemaining <= 0) {
            nextRound();
            playBeep(523, 500); // C5
            vibrate(500);
        } else if (Math.floor(roundRemaining) === 5 * 60) {
            playBeep(440, 200); // A4
            vibrate(200);
        } else if (state.session.mode === MODES.TAKUITSU) {
            const currentCpTime = TAKUITSU_DEF.checkpoints[state.session.currentSubjectIndex] * 60;
            if(totalElapsed >= currentCpTime && !state.session.cpNotified?.[state.session.currentSubjectIndex]) {
                 if(!state.session.cpNotified) state.session.cpNotified = {};
                 state.session.cpNotified[state.session.currentSubjectIndex] = true;
                 playBeep(330, 100); // E4
                 vibrate(100);
            }
        }
        
        saveSession();
    }
    
    function updateTimerDisplay() {
        if (!state.session) return;
        
        const totalElapsed = (state.session.pausedTime || Date.now()) - state.session.startTime - state.session.totalPausedTime;
        const roundElapsed = (state.session.pausedTime || Date.now()) - state.session.roundStartTime - state.session.totalPausedTime;
        
        const roundTimeLimit = state.session.roundTimes[state.session.round - 1] * 60 * 1000;
        const roundRemaining = (roundTimeLimit - roundElapsed) / 1000;

        dom.totalTimerDisplay.textContent = formatTime(totalElapsed / 1000);
        dom.roundTimerDisplay.textContent = formatTime(Math.max(0, roundRemaining));
    }


    function pauseTimer() {
        if (!state.session) return;
        clearInterval(state.timerInterval);
        state.session.pausedTime = Date.now();
        state.session.paused = true;
        dom.pauseResumeBtn.textContent = '再開';
        releaseWakeLock();
        saveSession();
    }

    function resumeTimer() {
        if (!state.session || !state.session.pausedTime) return;
        const pausedDuration = Date.now() - state.session.pausedTime;
        state.session.totalPausedTime += pausedDuration;
        state.session.pausedTime = 0;
        state.session.paused = false;
        runTimer();
        requestWakeLock();
        saveSession();
    }

    function stopTimer() {
        showConfirmation('タイマーを中断し、結果を保存しますか？', () => {
            clearInterval(state.timerInterval);
            state.session.endTime = Date.now();
            
            // Save to history
            const result = calculateResults();
            const historyEntry = { ...state.session, result };
            state.history.unshift(historyEntry); // Add to beginning
            saveHistory();

            state.session = null;
            saveSession();
            releaseWakeLock();

            showScreen('result-screen');
            render();
        });
    }

    function nextRound() {
        if (!state.session) return;

        const isLastRound = state.session.round >= state.session.roundTimes.length;
        if (isLastRound) {
            stopTimer();
            return;
        }

        // Move to next round
        state.session.round++;
        state.session.roundStartTime = Date.now();
        // totalPausedTime should already account for pauses, reset for next round's calculation basis
        // No, totalPausedTime should accumulate. Let's adjust roundStartTime instead.
        const elapsedSinceStart = state.session.roundStartTime - state.session.startTime;
        state.session.roundStartTime = state.session.startTime + elapsedSinceStart;
        
        // Let's simplify. roundStartTime is just the mark for the new round.
        state.session.roundStartTime = Date.now();
        // The time elapsed for the previous round needs to be based on its duration.
        // Let's adjust totalPausedTime to correctly calculate the new round's start
        const prevRoundDuration = state.session.roundTimes[state.session.round - 2] * 60 * 1000;
        // This is getting complicated. Let's use a simpler model.
        // Reset round-specific timers and continue.
        
        // Correct approach: Just reset roundStartTime and keep totalPausedTime cumulative.
        state.session.roundStartTime = Date.now();
        state.session.totalPausedTime = 0; // Pause time is only within a round. Resetting.
        if(state.session.pausedTime) { // If paused during round change
            const pausedDuration = Date.now() - state.session.pausedTime;
            state.session.totalPausedTime += pausedDuration;
            state.session.pausedTime = Date.now();
        }


        // Final attempt at time logic:
        // Keep `totalPausedTime` cumulative for the whole session.
        // `roundStartTime` is the timestamp when the round *should* have started if not for pauses.
        const prevRoundLimitMs = state.session.roundTimes[state.session.round - 2] * 60 * 1000;
        state.session.roundStartTime += prevRoundLimitMs;
        
        playBeep(659, 200); // E5
        vibrate([100, 50, 100]);

        render(); // Re-render to update round display and button text
        saveSession();
    }

    // =================================================================
    // Event Handlers
    // =================================================================

    function setupEventListeners() {
        dom.proBtn.onclick = () => {
            if (window.HDLicense && window.HDLicense.isPro()) {
                showConfirmation('Pro版のライセンスを無効にしますか？', () => window.HDLicense.deactivate());
            } else {
                 window.HDLicense.prompt({ buyUrl: BUY_URL });
            }
        };

        dom.startTakuitsuBtn.onclick = () => startTimer(MODES.TAKUITSU);
        dom.startSentakuBtn.onclick = () => startTimer(MODES.SENTAKU);

        dom.settings.proBtn.onclick = () => window.HDLicense.prompt({ buyUrl: BUY_URL });
        dom.historyProBtn.onclick = () => window.HDLicense.prompt({ buyUrl: BUY_URL });

        dom.toggleUsageBtn.onclick = () => {
            const isHidden = dom.usageCard.classList.toggle('hidden');
            dom.toggleUsageBtn.textContent = isHidden ? '続きを読む' : '閉じる';
        };
        
        dom.historyBtn.onclick = () => {
            showScreen('history-screen');
            render();
        };

        dom.pauseResumeBtn.onclick = () => {
            if (state.session && state.session.paused) {
                resumeTimer();
            } else {
                pauseTimer();
            }
        };

        dom.stopBtn.onclick = stopTimer;
        dom.nextRoundBtn.onclick = nextRound;

        dom.backToTopBtn.onclick = () => {
            showScreen('mode-selection-screen');
            render();
        };
        dom.backToTopFromHistoryBtn.onclick = () => {
            showScreen('mode-selection-screen');
            render();
        };
        
        dom.saveMemoBtn.onclick = () => {
            if (state.session) {
                state.session.memo = dom.resultMemo.value;
                // Find and update in history
                const index = state.history.findIndex(h => h.id === state.session.id);
                if (index > -1) {
                    state.history[index].memo = state.session.memo;
                    saveHistory();
                    dom.saveMemoBtn.textContent = '保存済み';
                    setTimeout(() => dom.saveMemoBtn.textContent = 'メモを保存', 2000);
                }
            }
        };
        
        window.addEventListener('beforeunload', (e) => {
            if (state.session && !state.session.paused) {
                saveSession();
            }
        });
        
        if (window.HDLicense) {
            window.HDLicense.onChange(render);
        }
    }

    function addQuestionBtnListeners(btn) {
        const qKey = btn.dataset.q;

        btn.addEventListener('click', () => {
            if (longPressTimer) clearTimeout(longPressTimer);
            if(btn.classList.contains('disabled')) return;
            
            const isTaku = state.session.mode === MODES.TAKUITSU;
            const states = isTaku ? QUESTION_STATES_TAKU : QUESTION_STATES_SENTAKU;
            
            const [currentState] = state.session.questionStates[qKey] || ['none'];
            const currentIndex = states.indexOf(currentState);
            const nextIndex = (currentIndex + 1) % states.length;
            const nextState = states[nextIndex];
            
            state.session.questionStates[qKey] = [nextState, false]; // Reset done state on cycle
            
            renderQuestionGrid();
            saveSession();
        });

        const onLongPress = () => {
            if(btn.classList.contains('disabled')) return;
            const [currentState, currentDone] = state.session.questionStates[qKey] || ['none', false];
            state.session.questionStates[qKey] = [currentState, !currentDone];
            renderQuestionGrid();
            saveSession();
        };

        btn.addEventListener('mousedown', () => {
            longPressTimer = setTimeout(onLongPress, 500);
        });
        btn.addEventListener('mouseup', () => {
            clearTimeout(longPressTimer);
        });
        btn.addEventListener('mouseleave', () => {
            clearTimeout(longPressTimer);
        });
        btn.addEventListener('touchstart', (e) => {
             e.preventDefault();
             longPressTimer = setTimeout(onLongPress, 500);
        });
        btn.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });
    }

    // =================================================================
    // Calculation
    // =================================================================

    function calculateResults(session = state.session) {
        if (!session) return {};
        
        const def = session.mode === MODES.TAKUITSU ? TAKUITSU_DEF : SENTAKU_DEF;
        const summary = def.subjects.map(() => ({ l1: 0, l2: 0, l3: 0, safe: 0, danger: 0, done: 0 }));
        let l3Count = 0;

        let qNum = 1;
        if (session.mode === MODES.TAKUITSU) {
            def.subjects.forEach((subj, subjIndex) => {
                for(let i=0; i<subj.count; i++) {
                    const [qState, isDone] = session.questionStates[qNum] || ['none', false];
                    if(isDone) summary[subjIndex].done++;
                    else if(qState !== 'none') summary[subjIndex][qState]++;
                    if(qState === 'l3') l3Count++;
                    qNum++;
                }
            });
        } else { // Sentaku
            def.subjects.forEach((subj, subjIndex) => {
                 for(let i=0; i<subj.kuuran; i++) {
                    const key = `${subjIndex}-${i}`;
                    const [qState, isDone] = session.questionStates[key] || ['none', false];
                    if(isDone) summary[subjIndex].done++;
                    else if(qState !== 'none') summary[subjIndex][qState]++;
                    if(qState === 'danger') l3Count++; // treat danger as l3 for counting
                 }
            });
        }
        
        const totalTime = (session.endTime - session.startTime - (session.totalPausedTime || 0)) / 1000;
        
        const l3WarningSubjects = [];
        if(session.mode === MODES.TAKUITSU) {
            summary.forEach((s, i) => {
                if (s.l3 >= 3) { // Example threshold
                    l3WarningSubjects.push(def.subjects[i].name);
                }
            });
        }

        return {
            summary,
            totalTime: Math.max(0, totalTime),
            l3Count,
            cpTimes: session.cpTimes || {},
            l3WarningSubjects
        };
    }

    // =================================================================
    // Initialization
    // =================================================================

    function init() {
        console.log('Sanshu Timer Initializing...');
        setupEventListeners();
        
        try {
             state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.warn("Web Audio API is not supported in this browser.");
            dom.soundToggle.parentElement.classList.add('hidden');
        }

        if (loadSession()) {
            showConfirmation('中断したセッションがあります。再開しますか？', 
            () => { // onConfirm
                resumeSession();
            },
            () => { // onCancel - defined as a separate function for clarity
                state.session = null;
                saveSession();
                loadHistory();
                showScreen('mode-selection-screen');
                render();
            });
            // Also need to set the cancel button's behavior inside showConfirmation now.
            dom.confirmCancelBtn.onclick = () => {
                dom.confirmDialog.classList.add('hidden');
                state.session = null;
                saveSession();
                loadHistory();
                showScreen('mode-selection-screen');
                render();
            };
        } else {
            loadHistory();
            showScreen('mode-selection-screen');
            render();
        }
    }

    // Start the app
    document.addEventListener('DOMContentLoaded', init);

})();
