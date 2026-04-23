// =========================================================
//                 TASK CONFIGURATION
// =========================================================
const CONFIG = {
    circlePosition: 'fixed',
    showFeedback: true,
    showInstructionFeedback: true,
};


// =========================================================
//            BLOCK & TRIAL COUNT CONFIGURATION
//   Change these three values to adjust the real session.
// =========================================================
let NUM_BLOCKS     = 2;   // Number of blocks in the real session
let GO_PER_BLOCK   = 15;  // GO trials per block
let NOGO_PER_BLOCK = 5;   // NO GO trials per block
let TRIALS_PER_BLOCK = GO_PER_BLOCK + NOGO_PER_BLOCK; // derived — do not edit


// =========================================================
//         FIXED TRIAL TEMPLATE  (applied to every block)
//   All values are deterministic so every user sees the
//   exact same timing and order.  Edit these arrays to
//   change stimulus timing, prompt delays, or positions.
//   Each array must have exactly TRIALS_PER_BLOCK entries.
// =========================================================

// Trial types: must contain GO_PER_BLOCK 'go' and NOGO_PER_BLOCK 'nogo' entries.
let BLOCK_TRIAL_TYPES = [
    'go',   'go',   'nogo', 'go',   'go',
    'go',   'nogo', 'go',   'go',   'go',
    'nogo', 'go',   'go',   'nogo', 'go',
    'go',   'go',   'nogo', 'go',   'go'
];

// Holding delay (ms) from button press to stimulus appearance — range 2 000–6 000 ms.
let BLOCK_STIM_DELAYS = [
    2000, 3000, 2500, 1500, 3000,
    2000, 2500, 1500, 3000, 2000,
    2500, 1500, 3000, 2000, 2500,
    1500, 3000, 2000, 2500, 1500
];

// Delay (ms) from GO finger-lift to "Put your finger down" prompt — range 2 000–3 000 ms.
// Only used for GO trials; ignored for NO GO trials.
let BLOCK_PROMPT_DELAYS = [
    1000, 1500, 1000, 1000, 1000,
    1500, 1000, 1000, 1500, 1000,
    1000, 1500, 1000, 1000, 1500,
    1000, 1000, 1000, 1500, 1000
];

// Button position factors per trial position (–1 to 1).
// Only used when CONFIG.circlePosition !== 'fixed'.
let BLOCK_X_FACTORS = [
     0,    0.4, -0.4,  0.6, -0.6,
     0.2, -0.2,  0.8, -0.8,  0,
     0.3, -0.3,  0.5, -0.5,  0.7,
    -0.7,  0.1, -0.1,  0.4, -0.4
];
let BLOCK_Y_FACTORS = [
     0,    0.4, -0.4, -0.6,  0.6,
    -0.2,  0.2, -0.8,  0.8,  0,
    -0.3,  0.3, -0.5,  0.5, -0.7,
     0.7, -0.1,  0.1, -0.4,  0.4
];


// =========================================================
//                 EDIT TRIAL SEQUENCES HERE
// =========================================================
let PRACTICE_SEQUENCE = [
    { type: 'go',   delay: 3000, goPromptDelay: 2000, xFactor: 0,    yFactor: 0    },
    { type: 'go',   delay: 3000, goPromptDelay: 2500, xFactor: -0.5, yFactor: 0.5  },
    { type: 'nogo', delay: 3000, goPromptDelay: 2000, xFactor: 0.5,  yFactor: -0.5 },
];

// Real sequence is generated from block config above. Do not edit directly.
let _realSequence = null;
function getRealSequence() {
    if (_realSequence) return _realSequence;
    _realSequence = [];
    for (let b = 0; b < NUM_BLOCKS; b++) {
        for (let i = 0; i < TRIALS_PER_BLOCK; i++) {
            _realSequence.push({
                type:          BLOCK_TRIAL_TYPES[i],
                delay:         BLOCK_STIM_DELAYS[i],
                goPromptDelay: BLOCK_PROMPT_DELAYS[i],
                xFactor:       BLOCK_X_FACTORS[i],
                yFactor:       BLOCK_Y_FACTORS[i],
                blockNumber:   b + 1
            });
        }
    }
    return _realSequence;
}


// ================= LOAD CONFIG FROM SERVER =================
// Fetches task parameters from the DB (set via admin panel).
// Falls back to the hardcoded defaults above if the server is unreachable.
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const cfg = await res.json();
        NUM_BLOCKS      = cfg.NUM_BLOCKS      ?? NUM_BLOCKS;
        GO_PER_BLOCK    = cfg.GO_PER_BLOCK    ?? GO_PER_BLOCK;
        NOGO_PER_BLOCK  = cfg.NOGO_PER_BLOCK  ?? NOGO_PER_BLOCK;
        TRIALS_PER_BLOCK = GO_PER_BLOCK + NOGO_PER_BLOCK;
        BLOCK_TRIAL_TYPES   = cfg.BLOCK_TRIAL_TYPES   ?? BLOCK_TRIAL_TYPES;
        BLOCK_STIM_DELAYS   = cfg.BLOCK_STIM_DELAYS   ?? BLOCK_STIM_DELAYS;
        BLOCK_PROMPT_DELAYS = cfg.BLOCK_PROMPT_DELAYS ?? BLOCK_PROMPT_DELAYS;
        BLOCK_X_FACTORS     = cfg.BLOCK_X_FACTORS     ?? BLOCK_X_FACTORS;
        BLOCK_Y_FACTORS     = cfg.BLOCK_Y_FACTORS     ?? BLOCK_Y_FACTORS;
        PRACTICE_SEQUENCE   = cfg.PRACTICE_SEQUENCE   ?? PRACTICE_SEQUENCE;
        _realSequence = null; // clear cache so it rebuilds with new values
    } catch (e) {
        console.warn('Config fetch failed — using hardcoded defaults.', e);
    }
}


// ================= INTERACTIVE INSTRUCTION SEQUENCE =================
const INSTRUCTION_STEPS = [
    {
        id: 'task-overview',
        type: 'text',
        title: 'How This Task Works',
        // message: 'You\'ll press and hold a blue circle on the screen. You\'ll need to lift your finger when you see <strong style="color: #10b981">"LIFT"</strong>  — then wait for a prompt before pressing again. You\'ll need to keep holding when you see <strong style="color: #ef4444">"HOLD"</strong>.',
        message: 'You\'ll press and hold a blue circle on the screen. You\'ll need to lift your finger when you see <strong>"LIFT"</strong>  — then wait for a prompt before pressing again. You\'ll need to keep holding when you see <strong>"HOLD"</strong>.',
        buttonText: 'Got it, let\'s start!'
    },
    {
        id: 'go-explanation',
        type: 'text',
        title: 'Learning LIFT Trials',
        // message: 'You\'ll see a blue circle on the screen. When the word <strong style="color: #10b981">"LIFT"</strong> appears above the circle, lift your finger quickly. Then wait — a prompt will appear saying "HOLD". Press the circle again as fast as you can only when you see that prompt.',
        message: 'You\'ll see a blue circle on the screen. When the word <strong>"LIFT"</strong> appears above the circle, lift your finger quickly. Then wait — a prompt will appear saying "HOLD". Press the circle again as fast as you can only when you see that prompt.',
        buttonText: 'Ready to try it!'
    },
    {
        id: 'go-release-1',
        type: 'tutorial',
        trialType: 'go',
        delay: 4000
    },
    {
        id: 'go-release-2',
        type: 'tutorial',
        trialType: 'go',
        delay: 5000
    },
    {
        id: 'nogo-explanation',
        type: 'text',
        title: 'Learning HOLD Trials',
        // message: 'Great job! Now when you see <strong style="color: #ef4444">"HOLD"</strong> appear above the circle, keep holding the circle. Do NOT lift your finger.',
        message: 'Great job! Now when you see <strong>"HOLD"</strong> appear above the circle, keep holding the circle. Do NOT lift your finger.',
        buttonText: 'Ready to try it!'
    },
    {
        id: 'nogo-1',
        type: 'tutorial',
        trialType: 'nogo',
        delay: 4000
    },
    {
        id: 'nogo-2',
        type: 'tutorial',
        trialType: 'nogo',
        delay: 5000
    },
    {
        id: 'complete',
        type: 'text',
        title: 'Tutorial Complete!',
        // message: 'Excellent work! You now understand both <strong style="color: #10b981">LIFT</strong> and <strong style="color: #ef4444">HOLD</strong> trials.<br>Ready to start practicing?',
        message: 'Excellent work! You now understand both <strong>LIFT</strong> and <strong>HOLD</strong> trials.<br>Ready to start practicing?',
        buttonText: 'Start Practice'
    }
];


// ================= STATE MANAGEMENT =================
const STATE = {
    phase: 'welcome',
    isPractice: true,
    trialState: 'waiting',
    currentTrialIndex: 0,
    allTrials: [],
    currentPhaseTrials: [],
    score: { correct: 0, total: 0 },
    isHolding: false,
    slipCount: 0,
    currentTrialConfig: null,
    stimulusOnsetTime: 0,
    noGoSlipStartTime: null,
    lastInput: { x: 0, y: 0, screenW: 0, screenH: 0 },
    safeZoneDims: { w: 0, h: 0, top: 0 },
    sessionStartTime: null,
    isInTutorial: false,
    tutorialStepIndex: 0,
    tutorialTrialComplete: false,
    rtRelease: null,       // Time from LIFT onset to finger lift
    putDownPromptTime: null, // Timestamp when "HOLD" prompt appeared
    rtDown: null,          // Time from "HOLD" prompt to finger recontact
    pid: null,              // Assigned from DB at start of real session
    isPressed: false,
};


// Timers
let stimulusTimeout = null;
let feedbackTimeout = null;
let goTimeout = null;
let noGoTimeout = null;
let goDelayTimeout = null;


// Elements - UPDATED: Removed status and feedback text elements
const els = {
    menuOverlay: document.getElementById('menu-overlay'),
    welcomeScreen: document.getElementById('welcome-screen'),
    instructionContainer: document.getElementById('instruction-container'),
    instructionContent: document.getElementById('instruction-content'),
    introPractice: document.getElementById('intro-practice'),
    introReal: document.getElementById('intro-real'),
    blockBreak: document.getElementById('block-break'),
    blockBreakTitle: document.getElementById('block-break-title'),
    blockBreakSubtitle: document.getElementById('block-break-subtitle'),
    blockBreakNext: document.getElementById('block-break-next'),
    outroComplete: document.getElementById('outro-complete'),
    resultsView: document.getElementById('results-view'),
    resultsTableContainer: document.getElementById('results-table-container'),
    taskUi: document.getElementById('task-ui'),
    stimulusText: document.getElementById('stimulus-text'),
    gameButton: document.getElementById('game-button'),
    retryModal: document.getElementById('retry-modal'),
    retryMessage: document.getElementById('retry-message'),
    tutorialUi: document.getElementById('tutorial-ui'),
    tutorialStimulusText: document.getElementById('tutorial-stimulus-text'),
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

function skipTutorial() {
    STATE.isInTutorial = false;
    showMenuPhase('practice-intro');
}


function showInstructionStep() {
    const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];


    if (step.type === 'text') {
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
        els.menuOverlay.classList.add('hidden');
        els.tutorialUi.classList.remove('hidden');


        STATE.tutorialTrialComplete = false;
        STATE.isHolding = false;
        STATE.trialState = 'waiting';


        els.tutorialStimulusText.innerText = '';
        els.tutorialContinueContainer.classList.add('hidden');


        updateTutorialButtonPosition(0, 0);
        setupTutorialTrial(step);
        updateTutorialUI();
    }
}


function nextInstructionStep() {
    STATE.tutorialStepIndex++;


    if (STATE.tutorialStepIndex >= INSTRUCTION_STEPS.length) {
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
    const newButton = tutorialButton.cloneNode(true);
    tutorialButton.parentNode.replaceChild(newButton, tutorialButton);
    els.tutorialButton = newButton;


        const start = (e) => {
        if (e.type === 'mousedown' && e.button !== 0) return;
        if (e.type === 'touchstart') e.preventDefault();
        STATE.isPressed = true;
        updateTutorialButtonAppearance();
        handleTutorialPressStart(step);
    };

    const end = (e) => {
        if (e.type === 'touchend') e.preventDefault();
        STATE.isPressed = false;
        updateTutorialButtonAppearance();
        handleTutorialPressEnd(step);
    };


    newButton.addEventListener('mousedown', start);
    newButton.addEventListener('touchstart', start, { passive: false });
    newButton.addEventListener('mouseup', end);
    newButton.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', (e) => {
    STATE.isPressingButton = false;
    handlePressEnd();
    });
    newButton.addEventListener('mouseleave', () => { STATE.isPressingButton = false; if (STATE.isHolding) end(); });
}


function handleTutorialPressStart(step) {
    if (STATE.tutorialTrialComplete) return;

    if (STATE.trialState === 'go-delay') {
        showTutorialRetry("Too early! Wait for the HOLD prompt to appear before pressing again.");
        return;
    }

    if (STATE.trialState === 'waiting') {
        STATE.isHolding = true;
        STATE.trialState = 'holding';
        updateTutorialUI();
        updateTutorialButtonAppearance();


        stimulusTimeout = setTimeout(() => {
            STATE.stimulusOnsetTime = Date.now();
            STATE.trialState = 'stimulus';
            updateTutorialUI();
            STATE.noGoSlipStartTime = null;


            if (step.trialType === 'go') {
                goTimeout = setTimeout(() => {
                    if (!STATE.tutorialTrialComplete) {
                        showTutorialRetry("Too slow! Please lift your finger when you see LIFT.");
                    }
                }, 2500);
            } else if (step.trialType === 'nogo') {
                noGoTimeout = setTimeout(() => {
                    if (STATE.isHolding) {
                        // Success! They held - show feedback ONLY in tutorial
                        if (CONFIG.showInstructionFeedback) {
                            els.tutorialStimulusText.innerText = 'Perfect!';
                            els.tutorialStimulusText.style.color = '#000000'; // BLACK
                        }
                        STATE.tutorialTrialComplete = true;
                        els.tutorialContinueContainer.classList.remove('hidden');
                    } else {
                        showTutorialRetry("You lifted your finger! Remember: HOLD means keep holding.");
                    }
                }, 5000);
            }
        }, step.delay);
    } else if (STATE.trialState === 'released' && step.trialType === 'go') {
        STATE.isHolding = true;
        // Show feedback ONLY in tutorial
        if (CONFIG.showInstructionFeedback) {
            els.tutorialStimulusText.innerText = 'Excellent!';
            els.tutorialStimulusText.style.color = '#000000'; // BLACK
            els.tutorialStimulusText.classList.remove('opacity-0');
        }
        STATE.tutorialTrialComplete = true;
        updateTutorialButtonAppearance();


        clearTimeout(goTimeout);
        els.tutorialContinueContainer.classList.remove('hidden');
    }
}


function handleTutorialPressEnd(step) {
    STATE.isHolding = false;


    if (STATE.tutorialTrialComplete) {
        updateTutorialButtonAppearance();
        return;
    }


    if (STATE.trialState === 'holding') {
        clearTimeout(stimulusTimeout);
        showTutorialRetry("You lifted your finger before seeing the instruction. Please keep holding until you see LIFT or HOLD. Let's try again!");
    } else if (STATE.trialState === 'stimulus') {
    if (step.trialType === 'go') {
        clearTimeout(goTimeout);
        STATE.trialState = 'go-delay';
        updateTutorialUI();
        updateTutorialButtonAppearance();
        setTimeout(() => {
            STATE.trialState = 'released';
            updateTutorialUI();
            updateTutorialButtonAppearance();
        }, 1000);
        } else if (step.trialType === 'nogo') {
            STATE.noGoSlipStartTime = Date.now();
            clearTimeout(noGoTimeout);
            showTutorialRetry("You lifted your finger! Remember: HOLD means keep holding. Let's try again!");
        }
    }


    updateTutorialButtonAppearance();
}


function updateTutorialUI() {
    const { trialState } = STATE;
    const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
    let text = '';
    let color = '#000000'; // Default BLACK


    if (trialState === 'waiting') {
        text = 'Press & Hold';
        color = '#000000'; // BLACK
    } else if (trialState === 'holding') {
        text = 'Hold...';
        color = '#000000'; // BLACK
    } else if (trialState === 'stimulus') {
        if (step.trialType === 'go') {
            text = 'LIFT';
            // color = '#10b981'; // GREEN
        } else {
            text = 'HOLD';
            // color = '#ef4444'; // RED
        }
    } else if (trialState === 'released') {
        text = 'HOLD';
        // color = '#10b981'; // GREEN
    }


    els.tutorialStimulusText.innerText = text;
    els.tutorialStimulusText.style.color = color;


    if (text) {
        els.tutorialStimulusText.classList.remove('opacity-0');
        // els.tutorialStimulusText.classList.add('animate-fadeInDown');
    } else {
        els.tutorialStimulusText.classList.add('opacity-0');
        // els.tutorialStimulusText.classList.remove('animate-fadeInDown');
    }
}


function showTutorialRetry(message) {
    if (!CONFIG.showInstructionFeedback) {
        retryTutorialStep();
        return;
    }


    clearAllTimeouts();
    els.retryMessage.innerText = message;
    els.retryModal.classList.remove('hidden');
}


function retryTutorialStep() {
    els.retryModal.classList.add('hidden');
    const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
    STATE.tutorialTrialComplete = false;
    STATE.isHolding = false;
    STATE.trialState = 'waiting';
    els.tutorialStimulusText.innerText = '';
    els.tutorialStimulusText.classList.add('opacity-0');
    // els.tutorialStimulusText.classList.remove('animate-fadeInDown');
    setupTutorialTrial(step);
    updateTutorialUI();
}


function updateTutorialButtonPosition(xFactor, yFactor) {
    const btnRadius = 64;
    const padding = 20;


    const minAbsY = btnRadius + padding;
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
    els.tutorialStimulusText.style.transform = `translate(${translateX}px, ${translateY - 264}px)`;
}


function updateTutorialButtonAppearance() {
    const btn = els.tutorialButton;
    btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none`;
    if (STATE.isPressed) btn.classList.add('btn-pressed');
}


els.tutorialContinueBtn.addEventListener('click', () => {
    nextInstructionStep();
});


window.retryCurrentTrial = function() {
    if (STATE.isInTutorial) {
        retryTutorialStep();
    } else {
        retryTaskTrial();
    }
};


// ================= METRICS LOGGING =================
// FIXED: trial_index now uses currentTrialIndex instead of incrementing on every log
function getSafeZone() {
    return {
        width: window.innerWidth,
        height: window.innerHeight,
        topOffset: 0
    };
}


function logMetric(data) {
    const cfg = STATE.currentTrialConfig;
    const blockNum = (!STATE.isPractice && cfg && cfg.blockNumber != null)
        ? cfg.blockNumber
        : (!STATE.isPractice ? Math.floor(STATE.currentTrialIndex / TRIALS_PER_BLOCK) + 1 : null);
    const trialInBlock = STATE.isPractice
        ? null
        : (STATE.currentTrialIndex % TRIALS_PER_BLOCK) + 1;

    const record = {
        phase:                  STATE.isPractice ? 'Practice' : 'Real Study',
        blockNumber:            blockNum,
        trialIndex:             STATE.currentTrialIndex + 1,
        trialInBlock:           trialInBlock,
        timestamp:              new Date().toISOString(),
        stimulusOnsetTimestamp: STATE.stimulusOnsetTime ? new Date(STATE.stimulusOnsetTime).toISOString() : null,
        sessionStartTime:       STATE.sessionStartTime,
        trialDelay:             cfg ? cfg.delay : null,
        goPromptDelay:          cfg ? cfg.goPromptDelay : null,
        ...data,
        touchX: STATE.lastInput.x,
        touchY: STATE.lastInput.y
    };

    STATE.currentPhaseTrials.push(record);
    STATE.allTrials.push(record);

    const style = record.isCorrect ? 'color: #4ade80; font-weight: bold' : 'color: #f87171; font-weight: bold';
    console.group(`%c Event: ${record.resultType || 'Info'}`, style);
    console.log(`Trial Type: ${record.trialType}`);
    if (record.rt) console.log(`Reaction Time: ${record.rt}ms`);
    console.log(`Error: ${record.errorCategory}`);
    console.groupEnd();

    // Only log real-session trials. Practice trials have no PID.
    if (!STATE.isPractice && STATE.pid != null) {
        saveTrialToDB(record).catch(err => console.error('Trial save failed:', err));
    }
}


// ================= CSV EXPORT =================
function downloadCSV() {
    const headers = [
        'Phase',
        'Block',
        'Trial Index',
        'Trial in Block',
        'Trial Type',
        'Is Correct',
        'Result Type',
        'Error Category',
        'RT-Release (ms)',
        'RT-Down (ms)',
        'Response Time (ms)',
        'Anticipatory Press Delay (ms)',
        'Slip Duration (ms)',
        'Recontact Time (ms)',
        'Trial Delay (ms)',
        'Go Prompt Delay (ms)',
        'Touch X',
        'Touch Y',
        'Timestamp',
        'Stimulus Onset Timestamp',
        'Session Start Time'
    ];

    const rows = STATE.allTrials.map(trial => [
        trial.phase,
        trial.blockNumber != null ? trial.blockNumber : '',
        trial.trialIndex,
        trial.trialInBlock != null ? trial.trialInBlock : '',
        trial.trialType,
        trial.isCorrect,
        trial.resultType,
        trial.errorCategory,
        trial.rtRelease != null ? trial.rtRelease : (trial.rt || ''),
        trial.rtDown != null ? trial.rtDown : '',
        trial.responseTime != null ? trial.responseTime : '',
        trial.anticipatoryPressDelay != null ? trial.anticipatoryPressDelay : '',
        trial.slipDuration != null ? trial.slipDuration : '',
        trial.recontactTime || '',
        trial.trialDelay != null ? trial.trialDelay : '',
        trial.goPromptDelay != null ? trial.goPromptDelay : '',
        trial.touchX,
        trial.touchY,
        trial.timestamp,
        trial.stimulusOnsetTimestamp || '',
        trial.sessionStartTime || ''
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
        'RT-Release (ms)',
        'RT-Down (ms)',
        'Response Time (ms)',
        'Slip Duration (ms)',
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
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.rtRelease != null ? trial.rtRelease : (trial.rt || '')}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.rtDown != null ? trial.rtDown : ''}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.responseTime != null ? trial.responseTime : ''}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.slipDuration != null ? trial.slipDuration : ''}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.touchX}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.touchY}</td>`;
        tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.timestamp}</td>`;
        tableHTML += '</tr>';
    });


    tableHTML += '</tbody></table>';
    els.resultsTableContainer.innerHTML = tableHTML;
    showMenuPhase('results');
}


// ================= DASHBOARD =================
function showDashboard() {
    // Open results dashboard in a new window/tab
    const dashboardWindow = window.open('dashboard.html', '_blank');
    
    // Pass data to the dashboard
    if (dashboardWindow) {
        dashboardWindow.addEventListener('load', () => {
            dashboardWindow.postMessage({ 
                type: 'GO_NOGO_DATA', 
                data: STATE.allTrials 
            }, '*');
        });
    }
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
    STATE.pid = null;
    showMenuPhase('welcome');
}


function startPhase(phaseName) {
    STATE.currentPhaseTrials = [];
    STATE.score = { correct: 0, total: 0 };
    STATE.slipCount = 0;
    STATE.trialState = 'waiting';
    STATE.isHolding = false;
    STATE.currentTrialIndex = 0;
    STATE.sessionStartTime = new Date().toISOString();

    if (phaseName === 'practice') {
        STATE.phase = 'practice';
        STATE.isPractice = true;
        els.menuOverlay.classList.add('hidden');
        els.taskUi.classList.remove('hidden');
    } else {
        STATE.phase = 'real';
        STATE.isPractice = false;
        // Fetch and store PID before the first trial fires.
        fetch('/api/next-pid')
            .then(r => r.json())
            .then(({ pid }) => {
                STATE.pid = pid;
                console.log(`Real session started — pid=${pid}`);
            })
            .catch(err => console.error('Failed to fetch PID:', err));
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
    return STATE.isPractice ? PRACTICE_SEQUENCE : getRealSequence();
}


function onTaskComplete() {
    console.log("=== PHASE COMPLETE ===");
    console.log("Phase:", STATE.isPractice ? 'Practice' : 'Real Study');
    console.log("Total Slips:", STATE.slipCount);
    console.table(STATE.currentPhaseTrials);

    els.taskUi.classList.add('hidden');
    els.menuOverlay.classList.remove('hidden');

    if (STATE.isPractice) {
        showMenuPhase('real-intro');
    } else {
        showMenuPhase('complete');
    }
}


// ================= DATABASE SAVE =================
// Called by logMetric for every real-session trial immediately after it completes.
async function saveTrialToDB(trial) {
    const response = await fetch('/api/save-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pid: STATE.pid, trial })
    });
    if (!response.ok) throw new Error(`save-trial HTTP ${response.status}`);
}


function continueNextBlock() {
    // Reset per-trial state but keep cumulative data and trial index intact
    STATE.currentTrialConfig = null;
    STATE.currentRT = null;
    STATE.noGoSlipStartTime = null;
    STATE.rtRelease = null;
    STATE.putDownPromptTime = null;
    STATE.rtDown = null;
    STATE.isHolding = false;
    STATE.trialState = 'waiting';

    els.menuOverlay.classList.add('hidden');
    els.taskUi.classList.remove('hidden');
    els.stimulusText.innerText = '';
    els.stimulusText.classList.add('opacity-0');

    const sequence = getCurrentSequence();
    const nextConfig = sequence[STATE.currentTrialIndex];
    if (nextConfig) {
        if (CONFIG.circlePosition === 'fixed') {
            updateButtonPosition(0, 0);
        } else {
            updateButtonPosition(nextConfig.xFactor, nextConfig.yFactor);
        }
    }
    updateUI();
}



function showMenuPhase(id) {
    document.querySelectorAll('.phase-container').forEach(el => el.classList.remove('active'));
    if (id === 'welcome') els.welcomeScreen.classList.add('active');
    if (id === 'practice-intro') els.introPractice.classList.add('active');
    if (id === 'real-intro') els.introReal.classList.add('active');
    if (id === 'block-break') els.blockBreak.classList.add('active');
    if (id === 'complete') els.outroComplete.classList.add('active');
    if (id === 'results') els.resultsView.classList.add('active');
}


// ================= RETRY MODAL LOGIC =================
function showRetryModal(msg) {
    if (!CONFIG.showFeedback) {
        retryTaskTrial();
        return;
    }


    clearAllTimeouts();
    els.retryMessage.innerText = msg;
    els.retryModal.classList.remove('hidden');
}


function retryTaskTrial() {
    els.retryModal.classList.add('hidden');


    STATE.isHolding = false;
    STATE.currentTrialConfig = null;
    STATE.currentRT = null;
    STATE.noGoSlipStartTime = null;
    STATE.rtRelease = null;
    STATE.putDownPromptTime = null;
    STATE.rtDown = null;
    els.stimulusText.innerText = '';
    els.stimulusText.classList.add('opacity-0');
    // els.stimulusText.classList.remove('animate-fadeInDown');


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
    if (STATE.trialState === 'feedback') {
        STATE.isHolding = true; // track so auto-start can fire after the feedback pause
        return;
    }

    if (STATE.trialState === 'go-delay') {
        STATE.isHolding = true;
        // User pressed before "Put your finger down" appeared — log as Anticipatory Press
        const anticipatoryPressDelay = Date.now() - STATE.stimulusOnsetTime - STATE.rtRelease;
        logMetric({
            trialType: 'go',
            isCorrect: false,
            resultType: 'Mistake',
            errorCategory: 'Anticipatory Press',
            rt: null,
            rtRelease: STATE.rtRelease,
            rtDown: null,
            responseTime: null,
            anticipatoryPressDelay: anticipatoryPressDelay
        });
        return;
    }


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
            recontactTime: timeToReapply,
            slipDuration: timeToReapply
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
        STATE.rtDown = Date.now() - STATE.putDownPromptTime;
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


        showRetryModal("You lifted your finger before seeing the instruction. Please keep holding until you see LIFT or HOLD. Let's try again!");


    } else if (STATE.trialState === 'stimulus') {
        if (STATE.currentTrialConfig.type === 'go') {
            const reactionTime = releaseTime - STATE.stimulusOnsetTime;
            STATE.currentRT = reactionTime;
            STATE.rtRelease = reactionTime;

            clearTimeout(goTimeout);
            setPositionForNextPhase();
            setTrialState('go-delay');

            // Use the deterministic prompt delay from the trial config
            const promptDelay = STATE.currentTrialConfig.goPromptDelay;
            goDelayTimeout = setTimeout(() => {
                STATE.putDownPromptTime = Date.now();
                setTrialState('released');
                updateUI();
                // If the user pressed during go-delay (anticipatory press), they're already
                // holding — evaluate the GO trial immediately with rtDown ≈ 0.
                if (STATE.isHolding) {
                    STATE.rtDown = Date.now() - STATE.putDownPromptTime;
                    evaluateGoTrial(true);
                }
            }, promptDelay);
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
            showRetryModal("Too slow! Please lift your finger when you see LIFT.");
        }, 2500);
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
    const responseTime = (STATE.rtRelease != null && STATE.rtDown != null)
        ? STATE.rtRelease + STATE.rtDown
        : null;
    logMetric({
        trialType: 'go',
        isCorrect: true,
        resultType: 'Success',
        errorCategory: 'None',
        rt: STATE.currentRT,
        rtRelease: STATE.rtRelease,
        rtDown: STATE.rtDown,
        responseTime: responseTime
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
        showRetryModal("You lifted your finger! Remember: HOLD means keep holding. Let's try again!");
    }
}


function advanceTrial() {
    STATE.currentTrialIndex++;
    const sequence = getCurrentSequence();

    if (STATE.currentTrialIndex >= sequence.length) {
        feedbackTimeout = setTimeout(onComplete, 1500);
    } else if (
        !STATE.isPractice &&
        STATE.currentTrialIndex % TRIALS_PER_BLOCK === 0
    ) {
        // Finished a block — show the rest screen before continuing
        feedbackTimeout = setTimeout(() => {
            const completedBlock = STATE.currentTrialIndex / TRIALS_PER_BLOCK;
            const nextBlock = completedBlock + 1;
            const totalBlocks = NUM_BLOCKS;
            els.blockBreakTitle.innerText = `Block ${completedBlock} of ${totalBlocks} Complete`;
            els.blockBreakSubtitle.innerText = 'Take a short rest.';
            els.blockBreakNext.innerText = `Block ${nextBlock} starts when you're ready.`;
            STATE.isHolding = false;
            clearAllTimeouts();
            els.taskUi.classList.add('hidden');
            els.menuOverlay.classList.remove('hidden');
            showMenuPhase('block-break');
        }, 1500);
    } else {
        feedbackTimeout = setTimeout(() => {
            STATE.currentTrialConfig = null;
            STATE.currentRT = null;
            STATE.noGoSlipStartTime = null;
            STATE.rtRelease = null;
            STATE.putDownPromptTime = null;
            STATE.rtDown = null;
            els.stimulusText.innerText = '';
            els.stimulusText.classList.add('opacity-0');

            const nextConfig = sequence[STATE.currentTrialIndex];
            if (nextConfig) {
                if (CONFIG.circlePosition === 'fixed') {
                    updateButtonPosition(0, 0);
                } else {
                    updateButtonPosition(nextConfig.xFactor, nextConfig.yFactor);
                }
            }

            if (STATE.isHolding && nextConfig) {
                STATE.currentTrialConfig = nextConfig;
                STATE.trialState = 'holding';
                updateUI();
                stimulusTimeout = setTimeout(() => {
                    STATE.stimulusOnsetTime = Date.now();
                    STATE.noGoSlipStartTime = null;
                    setTrialState('stimulus');
                    runStimulusLogic();
                }, nextConfig.delay);
            } else {
                setTrialState('waiting');
                updateUI();
            }
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
    const btnRadius = 64;
    const padding = 20;


    const minAbsY = btnRadius + padding;
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
    els.stimulusText.style.transform = `translate(${translateX}px, ${translateY - 264}px)`;
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
    if (goDelayTimeout) clearTimeout(goDelayTimeout);
}




// ================= UI UPDATE - UPDATED WITH COLOR LOGIC =================
function updateUI() {
    const { trialState, currentTrialConfig } = STATE;
    const btn = els.gameButton;


    let text = '';
    let color = '#000000'; // Default BLACK


    if (trialState === 'waiting') {
        text = 'Press & Hold';
        color = '#000000'; // BLACK
    } else if (trialState === 'holding') {
        text = 'Hold...';
        color = '#000000'; // BLACK
    } else if (trialState === 'stimulus') {
        if (currentTrialConfig.type === 'go') {
            text = 'LIFT';
            // color = '#10b981'; // GREEN
        } else {
            text = 'HOLD';
            // color = '#ef4444'; // RED
        }
    } else if (trialState === 'go-delay') {
        text = '';
        color = '#000000';
    } else if (trialState === 'released') {
        text = 'HOLD';
        // color = '#10b981'; // GREEN
    } else if (trialState === 'feedback') {
        text = '';  // No feedback in practice/real sessions
    }


    els.stimulusText.innerText = text;
    els.stimulusText.style.color = color;


    if (text) {
        els.stimulusText.classList.remove('opacity-0');
        // els.stimulusText.classList.add('animate-fadeInDown');
    } else {
        els.stimulusText.classList.add('opacity-0');
        // els.stimulusText.classList.remove('animate-fadeInDown');
    }


    btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none`;
    if (STATE.isPressed) btn.classList.add('btn-pressed'); 
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
        STATE.isPressed = true;  
        updateUI();
        handlePressStart();
    };


    const end = (e) => {
        if (e.type === 'touchend') e.preventDefault();
        STATE.isPressed = false;
        updateUI();
        handlePressEnd();
    };


    btn.addEventListener('mousedown', start);
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('mouseup', end);
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', (e) => {
    STATE.isPressingButton = false;
    handlePressEnd();
    });
    btn.addEventListener('mouseleave', () => {  STATE.isPressingButton = false; if (STATE.isHolding) end(); });
}


loadConfig().then(() => init());