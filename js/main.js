// =========================================================
//                 TASK CONFIGURATION
// =========================================================
const CONFIG = {
    // Set to 'moving' for changing positions or 'fixed' for center position
    // circlePosition: 'moving', // Options: 'moving' or 'fixed'
    circlePosition: 'fixed',
    
    // Set to true to show feedback popups during practice/real trials, false to hide them
    showFeedback: true, // Options: true or false
    
    // Set to true to show feedback popups during interactive instructions, false to hide them
    showInstructionFeedback: true // Options: true or false
};

// =========================================================
//                 EDIT TRIAL SEQUENCES HERE
// =========================================================
const PRACTICE_SEQUENCE = [
    { type: 'go', delay: 6000, xFactor: 0, yFactor: 0 },    // Center
    { type: 'nogo', delay: 6000, xFactor: 0.5, yFactor: -0.5 }, // Top Right
    { type: 'go', delay: 7000, xFactor: -0.5, yFactor: 0.5 },  // Bottom Left
    { type: 'go', delay: 8000, xFactor: 0.8, yFactor: 0.8 },  // Bottom Right
    { type: 'nogo', delay: 7000, xFactor: -0.8, yFactor: -0.2 }, // Mid Left
    { type: 'go', delay: 6000, xFactor: 0, yFactor: 0.9 }   // Bottom Center
];

const REAL_SEQUENCE = [
    { type: 'go', delay: 6000, xFactor: 0, yFactor: 0 },
    { type: 'go', delay: 7000, xFactor: 0.4, yFactor: 0.4 },
    { type: 'nogo', delay: 8000, xFactor: -0.4, yFactor: -0.4 },
    { type: 'go', delay: 7000, xFactor: 0.6, yFactor: -0.6 },
    { type: 'nogo', delay: 6000, xFactor: -0.7, yFactor: 0.7 },
    { type: 'go', delay: 8000, xFactor: 0.2, yFactor: -0.2 }
];

// ================= INTERACTIVE INSTRUCTION SEQUENCE =================

const INSTRUCTION_STEPS = [
    {
        id: 'go-intro',
        type: 'text',
        title: 'Learning GO Trials',
        message: 'Let\'s start with GO trials. You\'ll see a blue circle on the screen.',
        buttonText: 'Continue'
    },
    {
        id: 'go-hold-1',
        type: 'tutorial',
        trialType: 'hold-only',
        instruction: 'Place your index finger on the circle and hold it down.',
        statusTextWaiting: 'Press & Hold',
        statusTextHolding: 'Good! Keep holding...',
        delay: 3000,
        autoAdvance: true
    },
    {
        id: 'go-release-1',
        type: 'tutorial',
        trialType: 'go',
        instruction: 'When you see "GO", lift your finger and press the circle again as fast as possible.',
        statusTextWaiting: 'Press & Hold',
        statusTextHolding: 'Hold...',
        statusTextStimulus: 'GO',
        statusTextReleased: 'Now hold again',
        delay: 4000
    },
    {
        id: 'go-release-2',
        type: 'tutorial',
        trialType: 'go',
        instruction: 'Let\'s try that again. Remember: when you see "GO", release and press again quickly.',
        statusTextWaiting: 'Press & Hold',
        statusTextHolding: 'Hold...',
        statusTextStimulus: 'GO',
        statusTextReleased: 'Now hold again',
        delay: 5000
    },
    {
        id: 'nogo-intro',
        type: 'text',
        title: 'Learning NO GO Trials',
        message: 'Great! Now let\'s learn about NO GO trials.',
        buttonText: 'Continue'
    },
    {
        id: 'nogo-1',
        type: 'tutorial',
        trialType: 'nogo',
        instruction: 'When you see "NO GO", keep holding the circle. Do NOT lift your finger.',
        statusTextWaiting: 'Press & Hold',
        statusTextHolding: 'Hold...',
        statusTextStimulus: 'NO GO',
        delay: 4000
    },
    {
        id: 'nogo-2',
        type: 'tutorial',
        trialType: 'nogo',
        instruction: 'Let\'s practice one more time. Remember: "NO GO" means keep holding.',
        statusTextWaiting: 'Press & Hold',
        statusTextHolding: 'Hold...',
        statusTextStimulus: 'NO GO',
        delay: 5000
    },
    {
        id: 'complete',
        type: 'text',
        title: 'Instructions Complete!',
        message: 'Excellent work! You now understand both GO and NO GO trials. Ready to start practicing?',
        buttonText: 'Start Practice'
    }
];

// ================= STATE MANAGEMENT =================

const STATE = {
    phase: 'welcome',
    isPractice: true,
    trialState: 'waiting',
    currentTrialIndex: 0,
    allTrials: [], // Store ALL trials including practice
    currentPhaseTrials: [], // Current phase trials
    score: { correct: 0, total: 0 },
    isHolding: false,
    slipCount: 0,
    currentTrialConfig: null,
    stimulusOnsetTime: 0,
    noGoSlipStartTime: null,
    lastInput: { x: 0, y: 0, screenW: 0, screenH: 0 },
    safeZoneDims: { w: 0, h: 0, top: 0 },
    sessionStartTime: null,
    
    // Tutorial state
    isInTutorial: false,
    tutorialStepIndex: 0,
    tutorialTrialComplete: false
};

// Timers
let stimulusTimeout = null;
let feedbackTimeout = null;
let goTimeout = null;
let noGoTimeout = null;

// Elements
const els = {
    menuOverlay: document.getElementById('menu-overlay'),
    welcomeScreen: document.getElementById('welcome-screen'),
    instructionContainer: document.getElementById('instruction-container'),
    instructionContent: document.getElementById('instruction-content'),
    introPractice: document.getElementById('intro-practice'),
    introReal: document.getElementById('intro-real'),
    outroComplete: document.getElementById('outro-complete'),
    resultsView: document.getElementById('results-view'),
    resultsTableContainer: document.getElementById('results-table-container'),
    taskUi: document.getElementById('task-ui'),
    taskHeader: document.getElementById('task-header'),
    statusText: document.getElementById('status-text'),
    feedbackText: document.getElementById('feedback-text'),
    gameButton: document.getElementById('game-button'),
    retryModal: document.getElementById('retry-modal'),
    retryMessage: document.getElementById('retry-message'),
    
    // Tutorial elements
    tutorialUi: document.getElementById('tutorial-ui'),
    tutorialHeader: document.getElementById('tutorial-header'),
    tutorialInstructionText: document.getElementById('tutorial-instruction-text'),
    tutorialStatusText: document.getElementById('tutorial-status-text'),
    tutorialButton: document.getElementById('tutorial-button'),
    tutorialContinueContainer: document.getElementById('tutorial-continue-container'),
    tutorialContinueBtn: document.getElementById('tutorial-continue-btn')
};

// ================= INTERACTIVE INSTRUCTIONS =================

function startInteractiveInstructions() {
    STATE.isInTutorial = true;
    STATE.tutorialStepIndex = 0;
    showInstructionStep();
}

function showInstructionStep() {
    const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
    
    if (step.type === 'text') {
        // Show text instruction in overlay
        els.menuOverlay.classList.remove('hidden');
        els.tutorialUi.classList.add('hidden');
        document.querySelectorAll('.phase-container').forEach(el => el.classList.remove('active'));
        els.instructionContainer.classList.add('active');
        
        els.instructionContent.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">${step.title}</h2>
            <p class="text-lg mb-8">${step.message}</p>
            <button onclick="nextInstructionStep()"
                class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg text-xl transition-colors shadow-lg">
                ${step.buttonText}
            </button>
        `;
    } else if (step.type === 'tutorial') {
        // Show interactive tutorial
        els.menuOverlay.classList.add('hidden');
        els.tutorialUi.classList.remove('hidden');
        
        // Reset tutorial state
        STATE.tutorialTrialComplete = false;
        STATE.isHolding = false;
        STATE.trialState = 'waiting';
        
        // Set instruction text
        els.tutorialInstructionText.innerText = step.instruction;
        els.tutorialStatusText.innerText = step.statusTextWaiting || 'Press & Hold';
        
        // Hide continue button initially
        els.tutorialContinueContainer.classList.add('hidden');
        
        // Center the button
        updateTutorialButtonPosition(0, 0);
        
        // Set up the tutorial trial
        setupTutorialTrial(step);
    }
}

function nextInstructionStep() {
    STATE.tutorialStepIndex++;
    
    if (STATE.tutorialStepIndex >= INSTRUCTION_STEPS.length) {
        // Instructions complete, show practice intro
        STATE.isInTutorial = false;
        els.tutorialUi.classList.add('hidden');
        showMenuPhase('practice-intro');
    } else {
        showInstructionStep();
    }
}

function setupTutorialTrial(step) {
    clearAllTimeouts();
    
    const tutorialButton = els.tutorialButton;
    
    // Remove old listeners by cloning
    const newButton = tutorialButton.cloneNode(true);
    tutorialButton.parentNode.replaceChild(newButton, tutorialButton);
    els.tutorialButton = newButton;
    
    // Add new listeners
    const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (e.type === 'touchstart') e.preventDefault();
        handleTutorialPressStart(step);
    };
    
    const end = (e) => {
        if (e.type === 'touchend') e.preventDefault();
        handleTutorialPressEnd(step);
    };
    
    newButton.addEventListener('mousedown', start);
    newButton.addEventListener('touchstart', start, { passive: false });
    newButton.addEventListener('mouseup', end);
    newButton.addEventListener('touchend', end, { passive: false });
    newButton.addEventListener('mouseleave', () => { if (STATE.isHolding) end(); });
}

function handleTutorialPressStart(step) {
    if (STATE.tutorialTrialComplete) return;
    
    if (STATE.trialState === 'waiting') {
        STATE.isHolding = true;
        STATE.trialState = 'holding';
        els.tutorialStatusText.innerText = step.statusTextHolding || 'Hold...';
        
        // Update button appearance
        updateTutorialButtonAppearance();
        
        if (step.trialType === 'hold-only') {
            // For hold-only, just wait and show continue button
            stimulusTimeout = setTimeout(() => {
                els.tutorialStatusText.innerText = 'Perfect!';
                STATE.tutorialTrialComplete = true;
                els.tutorialContinueContainer.classList.remove('hidden');
            }, step.delay);
        } else {
            // For go/nogo trials, show stimulus
            stimulusTimeout = setTimeout(() => {
                STATE.stimulusOnsetTime = Date.now();
                STATE.trialState = 'stimulus';
                els.tutorialStatusText.innerText = step.statusTextStimulus;
                STATE.noGoSlipStartTime = null;
                
                if (step.trialType === 'go') {
                    // Wait for release
                    goTimeout = setTimeout(() => {
                        if (!STATE.tutorialTrialComplete) {
                            showTutorialRetry("Too slow! Please release when you see GO.");
                        }
                    }, 5000);
                } else if (step.trialType === 'nogo') {
                    // Wait to see if they hold
                    noGoTimeout = setTimeout(() => {
                        if (STATE.isHolding) {
                            // Success! They held
                            els.tutorialStatusText.innerText = 'Perfect! You held it.';
                            STATE.tutorialTrialComplete = true;
                            els.tutorialContinueContainer.classList.remove('hidden');
                        } else {
                            // They released during NO GO
                            showTutorialRetry("You released! Remember: NO GO means keep holding.");
                        }
                    }, 5000);
                }
            }, step.delay);
        }
    } else if (STATE.trialState === 'released' && step.trialType === 'go') {
        // They pressed again after releasing
        STATE.isHolding = true;
        els.tutorialStatusText.innerText = 'Excellent!';
        STATE.tutorialTrialComplete = true;
        updateTutorialButtonAppearance();
        
        clearTimeout(goTimeout);
        els.tutorialContinueContainer.classList.remove('hidden');
    }
}

function handleTutorialPressEnd(step) {
    STATE.isHolding = false;
    
    // Don't show errors if trial is already complete
    if (STATE.tutorialTrialComplete) {
        updateTutorialButtonAppearance();
        return;
    }
    
    if (STATE.trialState === 'holding') {
        // Released too early
        clearTimeout(stimulusTimeout);
        showTutorialRetry("You released too early. Please keep holding until you see the instruction.");
    } else if (STATE.trialState === 'stimulus') {
        if (step.trialType === 'go') {
            // Correct release for GO
            clearTimeout(goTimeout);
            STATE.trialState = 'released';
            els.tutorialStatusText.innerText = step.statusTextReleased || 'Now hold again';
            updateTutorialButtonAppearance();
        } else if (step.trialType === 'nogo') {
            // Incorrect release for NO GO
            STATE.noGoSlipStartTime = Date.now();
            clearTimeout(noGoTimeout);
            showTutorialRetry("You released! Remember: NO GO means keep holding.");
        }
    }
    
    updateTutorialButtonAppearance();
}

function showTutorialRetry(message) {
    if (!CONFIG.showInstructionFeedback) {
        // Silently retry
        const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
        STATE.tutorialTrialComplete = false;
        STATE.isHolding = false;
        STATE.trialState = 'waiting';
        setupTutorialTrial(step);
        els.tutorialStatusText.innerText = step.statusTextWaiting || 'Press & Hold';
        return;
    }
    
    // Show retry modal
    clearAllTimeouts();
    els.retryMessage.innerText = message;
    els.retryModal.classList.remove('hidden');
    
    // Override retry button for tutorial
    const retryBtn = els.retryModal.querySelector('button');
    retryBtn.onclick = () => {
        els.retryModal.classList.add('hidden');
        const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
        STATE.tutorialTrialComplete = false;
        STATE.isHolding = false;
        STATE.trialState = 'waiting';
        setupTutorialTrial(step);
        els.tutorialStatusText.innerText = step.statusTextWaiting || 'Press & Hold';
    };
}

function updateTutorialButtonPosition(xFactor, yFactor) {
    const headerRect = els.tutorialHeader.getBoundingClientRect();
    const headerBottom = headerRect.bottom;
    const btnRadius = 64;
    const padding = 20;

    const minAbsY = headerBottom + btnRadius + padding;
    const maxAbsY = window.innerHeight - btnRadius - padding;
    const availableHeight = maxAbsY - minAbsY;

    const minAbsX = btnRadius + padding;
    const maxAbsX = window.innerWidth - btnRadius - padding;
    const availableWidth = maxAbsX - minAbsX;

    if (availableHeight <= 0 || availableWidth <= 0) return;

    const normX = (xFactor + 1) / 2;
    const normY = (yFactor + 1) / 2;

    const targetAbsX = minAbsX + (normX * availableWidth);
    const targetAbsY = minAbsY + (normY * availableHeight);

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const translateX = targetAbsX - screenCenterX;
    const translateY = targetAbsY - screenCenterY;

    els.tutorialButton.style.transform = `translate(${translateX}px, ${translateY}px)`;
}

function updateTutorialButtonAppearance() {
    const btn = els.tutorialButton;
    btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none transition-transform duration-300 ease-out`;
    
    if (STATE.trialState === 'waiting') {
        btn.classList.add('hover:scale-105', 'active:scale-95');
    } else if (STATE.trialState === 'holding') {
        btn.classList.add('scale-95');
    } else if (STATE.trialState === 'stimulus' || STATE.trialState === 'released') {
        btn.classList.add('scale-100');
    }
}

// Set up tutorial continue button
els.tutorialContinueBtn.addEventListener('click', () => {
    nextInstructionStep();
});

// ================= METRICS LOGGING =================

function getSafeZone() {
    const headerRect = els.taskHeader.getBoundingClientRect();
    const headerBottom = headerRect.bottom;
    return {
        width: window.innerWidth,
        height: window.innerHeight - headerBottom,
        topOffset: headerBottom
    };
}

function logMetric(data) {
    const safe = getSafeZone();
    const record = {
        phase: STATE.isPractice ? 'Practice' : 'Real Study',
        trialIndex: STATE.currentPhaseTrials.length + 1,
        timestamp: new Date().toISOString(),
        ...data,
        touchX: STATE.lastInput.x,
        touchY: STATE.lastInput.y
    };
    
    // Add to current phase trials
    STATE.currentPhaseTrials.push(record);
    // Add to all trials
    STATE.allTrials.push(record);

    const style = record.isCorrect ? 'color: #4ade80; font-weight: bold' : 'color: #f87171; font-weight: bold';
    console.group(`%c Event: ${record.resultType || 'Info'}`, style);
    console.log(`Trial Type: ${record.trialType}`);
    if (record.rt) console.log(`Reaction Time: ${record.rt}ms`);
    console.log(`Error: ${record.errorCategory}`);
    console.groupEnd();
}

// ================= CSV EXPORT =================

function downloadCSV() {
    const headers = [
        'Phase',
        'Trial Index',
        'Trial Type',
        'Is Correct',
        'Result Type',
        'Error Category',
        'Reaction Time (ms)',
        'Recontact Time (ms)',
        'Touch X',
        'Touch Y',
        'Timestamp'
    ];

    const rows = STATE.allTrials.map(trial => [
        trial.phase,
        trial.trialIndex,
        trial.trialType,
        trial.isCorrect,
        trial.resultType,
        trial.errorCategory,
        trial.rt || '',
        trial.recontactTime || '',
        trial.touchX,
        trial.touchY,
        trial.timestamp
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
        csvContent += row.map(cell => {
            const cellStr = String(cell);
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return '"' + cellStr.replace(/"/g, '""') + '"';
            }
            return cellStr;
        }).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `go-nogo-results-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showResults() {
    const headers = [
        'Phase',
        'Trial',
        'Type',
        'Correct',
        'Result',
        'Error',
        'RT (ms)',
        'Recontact (ms)',
        'Touch X',
        'Touch Y',
        'Timestamp'
    ];

    let tableHTML = '<table class="w-full border-collapse border border-slate-600 text-left"><thead><tr>';
    headers.forEach(header => {
        tableHTML += `<th class="border border-slate-600 px-4 py-2">${header}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    STATE.allTrials.forEach(trial => {
        const rowClass = trial.isCorrect ? 'bg-green-900/20' : 'bg-red-900/20';
        tableHTML += `<tr class="${rowClass}">`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.phase}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.trialIndex}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.trialType}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.isCorrect}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.resultType}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.errorCategory}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.rt || ''}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.recontactTime || ''}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.touchX}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.touchY}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.timestamp}</td>`;
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table>';
    els.resultsTableContainer.innerHTML = tableHTML;
    showMenuPhase('results');
}

// ================= FLOW CONTROL =================

function init() {
    showMenuPhase('welcome');
    setupButtonListeners();
    console.log("App Initialized.");
    console.log("Configuration:", CONFIG);
}

function resetApp() {
    STATE.allTrials = [];
    STATE.currentPhaseTrials = [];
    STATE.score = { correct: 0, total: 0 };
    STATE.slipCount = 0;
    STATE.isInTutorial = false;
    STATE.tutorialStepIndex = 0;
    showMenuPhase('welcome');
}

function startPhase(phaseName) {
    // Reset current phase trials but keep all trials
    STATE.currentPhaseTrials = [];
    STATE.score = { correct: 0, total: 0 };
    STATE.slipCount = 0;
    STATE.trialState = 'waiting';
    STATE.isHolding = false;
    STATE.currentTrialIndex = 0;
    STATE.sessionStartTime = new Date().toISOString();
    els.feedbackText.innerText = '';

    if (phaseName === 'practice') {
        STATE.phase = 'practice';
        STATE.isPractice = true;
        els.menuOverlay.classList.add('hidden');
        els.taskUi.classList.remove('hidden');
    } else {
        STATE.phase = 'real';
        STATE.isPractice = false;
        els.menuOverlay.classList.add('hidden');
        els.taskUi.classList.remove('hidden');
    }

    const sequence = getCurrentSequence();
    if (CONFIG.circlePosition === 'fixed') {
        updateButtonPosition(0, 0);
    } else if (sequence && sequence.length > 0) {
        const firstTrial = sequence[0];
        updateButtonPosition(firstTrial.xFactor, firstTrial.yFactor);
    } else {
        updateButtonPosition(0, 0);
    }
    updateUI();
}

function getCurrentSequence() {
    return STATE.isPractice ? PRACTICE_SEQUENCE : REAL_SEQUENCE;
}

function onTaskComplete() {
    console.log("=== PHASE COMPLETE ===");
    console.log("Phase:", STATE.isPractice ? 'Practice' : 'Real Study');
    console.log("Total Slips:", STATE.slipCount);
    console.table(STATE.currentPhaseTrials);

    els.taskUi.classList.add('hidden');
    els.menuOverlay.classList.remove('hidden');
    if (STATE.isPractice) showMenuPhase('real-intro');
    else showMenuPhase('complete');
}

function showMenuPhase(id) {
    document.querySelectorAll('.phase-container').forEach(el => el.classList.remove('active'));
    if (id === 'welcome') els.welcomeScreen.classList.add('active');
    if (id === 'practice-intro') els.introPractice.classList.add('active');
    if (id === 'real-intro') els.introReal.classList.add('active');
    if (id === 'complete') els.outroComplete.classList.add('active');
    if (id === 'results') els.resultsView.classList.add('active');
}

// ================= RETRY MODAL LOGIC =================

function showRetryModal(msg) {
    if (!CONFIG.showFeedback) {
        retryCurrentTrial();
        return;
    }

    clearAllTimeouts();
    els.retryMessage.innerText = msg;
    els.retryModal.classList.remove('hidden');
}

function retryCurrentTrial() {
    els.retryModal.classList.add('hidden');
    
    // Reset all trial state
    STATE.isHolding = false;
    STATE.currentTrialConfig = null;
    STATE.currentRT = null;
    STATE.noGoSlipStartTime = null;
    els.feedbackText.innerText = '';
    
    setTrialState('waiting');

    const sequence = getCurrentSequence();
    const currentConfig = sequence[STATE.currentTrialIndex];
    if (currentConfig) {
        if (CONFIG.circlePosition === 'fixed') {
            updateButtonPosition(0, 0);
        } else {
            updateButtonPosition(currentConfig.xFactor, currentConfig.yFactor);
        }
    }
    updateUI();
}

// ================= TASK LOGIC =================

function handlePressStart() {
    if (STATE.trialState === 'feedback') return;

    if (STATE.trialState === 'stimulus' && STATE.currentTrialConfig?.type === 'nogo' && STATE.noGoSlipStartTime) {
        const now = Date.now();
        const timeToReapply = now - STATE.noGoSlipStartTime;
        STATE.isHolding = true;
        STATE.slipCount++;
        logMetric({
            trialType: 'nogo',
            isCorrect: true,
            resultType: 'Slip Recorded',
            errorCategory: 'Partial Release / Slip',
            rt: STATE.noGoSlipStartTime - STATE.stimulusOnsetTime,
            recontactTime: timeToReapply
        });
        STATE.noGoSlipStartTime = null;
        return;
    }

    if (STATE.trialState === 'waiting') {
        const sequence = getCurrentSequence();
        if (STATE.currentTrialIndex >= sequence.length) {
            onComplete();
            return;
        }

        STATE.currentTrialConfig = sequence[STATE.currentTrialIndex];
        STATE.isHolding = true;
        setTrialState('holding');

        const delay = STATE.currentTrialConfig.delay;
        stimulusTimeout = setTimeout(() => {
            STATE.stimulusOnsetTime = Date.now();
            STATE.noGoSlipStartTime = null;
            setTrialState('stimulus');
            runStimulusLogic();
        }, delay);

    } else if (STATE.trialState === 'released') {
        STATE.isHolding = true;
        evaluateGoTrial(true);
    }
}

function handlePressEnd() {
    STATE.isHolding = false;
    const releaseTime = Date.now();

    if (STATE.trialState === 'holding') {
        clearTimeout(stimulusTimeout);

        logMetric({
            trialType: 'pending',
            isCorrect: false,
            resultType: 'Mistake',
            errorCategory: 'Early Release',
            rt: null
        });

        showRetryModal("You released too early, please try again.");

    } else if (STATE.trialState === 'stimulus') {
        if (STATE.currentTrialConfig.type === 'go') {
            const reactionTime = releaseTime - STATE.stimulusOnsetTime;
            STATE.currentRT = reactionTime;

            clearTimeout(goTimeout);
            setPositionForNextPhase();
            setTrialState('released');
            updateUI();
        } else {
            STATE.noGoSlipStartTime = releaseTime;
        }
    }
}

function runStimulusLogic() {
    if (STATE.currentTrialConfig.type === 'go') {
        goTimeout = setTimeout(() => {
            logMetric({
                trialType: 'go',
                isCorrect: false,
                resultType: 'Mistake',
                errorCategory: 'Late Release',
                rt: null
            });
            showRetryModal("Too slow! Please try again.");
        }, 5000);
    } else {
        noGoTimeout = setTimeout(() => {
            if (STATE.isHolding) {
                evaluateNoGoTrial(true);
            } else {
                evaluateNoGoTrial(false);
            }
        }, 5000);
    }
}

function evaluateGoTrial(heldAgain) {
    logMetric({
        trialType: 'go',
        isCorrect: true,
        resultType: 'Success',
        errorCategory: 'None',
        rt: STATE.currentRT
    });
    setTrialState('feedback');
    advanceTrial();
}

function evaluateNoGoTrial(finalSuccess) {
    if (finalSuccess) {
        logMetric({
            trialType: 'nogo',
            isCorrect: true,
            resultType: 'Success',
            errorCategory: 'None',
            rt: null
        });
        setTrialState('feedback');
        advanceTrial();
    } else {
        logMetric({
            trialType: 'nogo',
            isCorrect: false,
            resultType: 'Mistake',
            errorCategory: 'Failed Inhibition',
            rt: STATE.noGoSlipStartTime ? (STATE.noGoSlipStartTime - STATE.stimulusOnsetTime) : null
        });
        showRetryModal("You released. Please try again.");
    }
}

function advanceTrial() {
    STATE.currentTrialIndex++;
    const sequence = getCurrentSequence();

    if (STATE.currentTrialIndex >= sequence.length) {
        feedbackTimeout = setTimeout(onComplete, 1500);
    } else {
        feedbackTimeout = setTimeout(() => {
            setTrialState('waiting');
            STATE.currentTrialConfig = null;
            STATE.currentRT = null;
            STATE.noGoSlipStartTime = null;
            els.feedbackText.innerText = '';

            const nextConfig = sequence[STATE.currentTrialIndex];
            if (nextConfig) {
                if (CONFIG.circlePosition === 'fixed') {
                    updateButtonPosition(0, 0);
                } else {
                    updateButtonPosition(nextConfig.xFactor, nextConfig.yFactor);
                }
            }

            updateUI();
        }, 1500);
    }
}

function setPositionForNextPhase() {
    if (CONFIG.circlePosition === 'fixed') {
        updateButtonPosition(0, 0);
    } else {
        const pseudoRandomX = Math.sin(STATE.currentTrialIndex * 99) * 0.8;
        const pseudoRandomY = Math.cos(STATE.currentTrialIndex * 99) * 0.8;
        updateButtonPosition(pseudoRandomX, pseudoRandomY);
    }
}

function onComplete() {
    clearAllTimeouts();
    onTaskComplete();
}

// ================= POSITIONING LOGIC =================

function updateButtonPosition(xFactor, yFactor) {
    const headerRect = els.taskHeader.getBoundingClientRect();
    const headerBottom = headerRect.bottom;
    const btnRadius = 64;
    const padding = 20;

    const minAbsY = headerBottom + btnRadius + padding;
    const maxAbsY = window.innerHeight - btnRadius - padding;
    const availableHeight = maxAbsY - minAbsY;

    const minAbsX = btnRadius + padding;
    const maxAbsX = window.innerWidth - btnRadius - padding;
    const availableWidth = maxAbsX - minAbsX;

    if (availableHeight <= 0 || availableWidth <= 0) return;

    const normX = (xFactor + 1) / 2;
    const normY = (yFactor + 1) / 2;

    const targetAbsX = minAbsX + (normX * availableWidth);
    const targetAbsY = minAbsY + (normY * availableHeight);

    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    const translateX = targetAbsX - screenCenterX;
    const translateY = targetAbsY - screenCenterY;

    els.gameButton.style.transform = `translate(${translateX}px, ${translateY}px)`;
}

function setTrialState(newState) {
    STATE.trialState = newState;
    updateUI();
}

function clearAllTimeouts() {
    if (stimulusTimeout) clearTimeout(stimulusTimeout);
    if (feedbackTimeout) clearTimeout(feedbackTimeout);
    if (goTimeout) clearTimeout(goTimeout);
    if (noGoTimeout) clearTimeout(noGoTimeout);
}

function updateUI() {
    const { trialState, currentTrialConfig } = STATE;
    const btn = els.gameButton;

    let text = '';
    if (trialState === 'waiting') text = 'Press & Hold';
    else if (trialState === 'holding') text = 'Hold...';
    else if (trialState === 'stimulus') text = currentTrialConfig.type === 'go' ? 'GO' : 'NO GO';
    else if (trialState === 'released') text = 'Now hold again';
    els.statusText.innerText = text;

    btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none transition-transform duration-300 ease-out`;
    if (trialState === 'waiting') btn.classList.add('hover:scale-105', 'active:scale-95');
    else if (trialState === 'holding') btn.classList.add('scale-95');
    else if (trialState === 'stimulus' || trialState === 'released') btn.classList.add('scale-100');
}

function setupButtonListeners() {
    const btn = els.gameButton;
    const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;

        let x, y;
        if (e.touches && e.touches.length > 0) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }

        STATE.lastInput = {
            x: Math.round(x),
            y: Math.round(y),
            screenW: window.innerWidth,
            screenH: window.innerHeight
        };

        if (e.type === 'touchstart') e.preventDefault();
        handlePressStart();
    };

    const end = (e) => {
        if (e.type === 'touchend') e.preventDefault();
        handlePressEnd();
    };

    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('mouseup', end);
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mouseleave', () => { if (STATE.isHolding) end(); });
}

init();