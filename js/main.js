// =========================================================
//                 TASK CONFIGURATION
// =========================================================
const CONFIG = {
    circlePosition: 'fixed',
    showFeedback: true,
    showInstructionFeedback: true,
    // Delay (ms) between GO stimulus and "Put your finger down" prompt.
    // Only applies to practice and real phases (not tutorial).
    goPromptDelay: { min: 2000, max: 4000 }
};


// =========================================================
//                 EDIT TRIAL SEQUENCES HERE
// =========================================================
const PRACTICE_SEQUENCE = [
    { type: 'go', delay: 6000, xFactor: 0, yFactor: 0 },
    { type: 'nogo', delay: 6000, xFactor: 0.5, yFactor: -0.5 },
    { type: 'go', delay: 7000, xFactor: -0.5, yFactor: 0.5 },
    // { type: 'go', delay: 8000, xFactor: 0.8, yFactor: 0.8 },
    // { type: 'nogo', delay: 7000, xFactor: -0.8, yFactor: -0.2 },
    // { type: 'go', delay: 6000, xFactor: 0, yFactor: 0.9 }
];


const REAL_SEQUENCE = [
    { type: 'go', delay: 6000, xFactor: 0, yFactor: 0 },
    { type: 'go', delay: 7000, xFactor: 0.4, yFactor: 0.4 },
    { type: 'nogo', delay: 8000, xFactor: -0.4, yFactor: -0.4 },
    // { type: 'go', delay: 7000, xFactor: 0.6, yFactor: -0.6 },
    // { type: 'nogo', delay: 6000, xFactor: -0.7, yFactor: 0.7 },
    // { type: 'go', delay: 8000, xFactor: 0.2, yFactor: -0.2 }
];


// ================= INTERACTIVE INSTRUCTION SEQUENCE =================
const INSTRUCTION_STEPS = [
    {
        id: 'task-overview',
        type: 'text',
        title: 'How This Task Works',
        message: 'In the Go/No-Go task, you\'ll press and hold a blue circle on the screen. Sometimes you\'ll need to lift your finger when you see <strong style="color: #10b981">"GO"</strong>, and other times you\'ll need to keep holding when you see <strong style="color: #ef4444">"NO GO"</strong>.',
        buttonText: 'Got it, let\'s start!'
    },
    {
        id: 'go-explanation',
        type: 'text',
        title: 'Learning GO Trials',
        message: 'You\'ll see a blue circle on the screen. When the word <strong style="color: #10b981">"GO"</strong> appears above the circle, lift your finger quickly and then press the circle again as fast as you can.',
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
        title: 'Learning NO GO Trials',
        message: 'Great job! Now when you see <strong style="color: #ef4444">"NO GO"</strong> appear above the circle, keep holding the circle. Do NOT lift your finger.',
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
        message: 'Excellent work! You now understand both <strong style="color: #10b981">GO</strong> and <strong style="color: #ef4444">NO GO</strong> trials.<br>Ready to start practicing?',
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
    rtRelease: null,       // Time from GO onset to finger lift
    putDownPromptTime: null, // Timestamp when "Put your finger down" appeared
    rtDown: null           // Time from "Put your finger down" prompt to finger recontact
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
        updateTutorialUI();


        stimulusTimeout = setTimeout(() => {
            STATE.stimulusOnsetTime = Date.now();
            STATE.trialState = 'stimulus';
            updateTutorialUI();
            STATE.noGoSlipStartTime = null;


            if (step.trialType === 'go') {
                goTimeout = setTimeout(() => {
                    if (!STATE.tutorialTrialComplete) {
                        showTutorialRetry("Too slow! Please lift your finger when you see GO.");
                    }
                }, 5000);
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
                        showTutorialRetry("You lifted your finger! Remember: NO GO means keep holding.");
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
        showTutorialRetry("You lifted your finger before seeing the instruction. Please keep holding until you see GO or NO GO. Let's try again!");
    } else if (STATE.trialState === 'stimulus') {
        if (step.trialType === 'go') {
            clearTimeout(goTimeout);
            STATE.trialState = 'released';
            updateTutorialUI();
            updateTutorialButtonAppearance();
        } else if (step.trialType === 'nogo') {
            STATE.noGoSlipStartTime = Date.now();
            clearTimeout(noGoTimeout);
            showTutorialRetry("You lifted your finger! Remember: NO GO means keep holding. Let's try again!");
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
            text = 'GO';
            color = '#10b981'; // GREEN
        } else {
            text = 'NO GO';
            color = '#ef4444'; // RED
        }
    } else if (trialState === 'released') {
        text = 'Put your finger down';
        color = '#10b981'; // GREEN
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


    if (STATE.trialState === 'waiting') {
        btn.classList.add('hover:scale-105', 'active:scale-95');
    } else if (STATE.trialState === 'holding') {
        btn.classList.add('scale-95');
    } else if (STATE.trialState === 'stimulus' || STATE.trialState === 'released') {
        btn.classList.add('scale-100');
    }
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
    const safe = getSafeZone();
    const record = {
        phase: STATE.isPractice ? 'Practice' : 'Real Study',
        trialIndex: STATE.currentTrialIndex + 1,  // FIXED: Now properly reflects current trial
        timestamp: new Date().toISOString(),
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
        'RT-Release (ms)',
        'RT-Down (ms)',
        'Response Time (ms)',
        'Slip Duration (ms)',
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
        trial.rtRelease != null ? trial.rtRelease : (trial.rt || ''),
        trial.rtDown != null ? trial.rtDown : '',
        trial.responseTime != null ? trial.responseTime : '',
        trial.slipDuration != null ? trial.slipDuration : '',
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
    if (STATE.trialState === 'feedback') return;
    if (STATE.trialState === 'go-delay') return;  // Ignore presses during the delay


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


        showRetryModal("You lifted your finger before seeing the instruction. Please keep holding until you see GO or NO GO. Let's try again!");


    } else if (STATE.trialState === 'stimulus') {
        if (STATE.currentTrialConfig.type === 'go') {
            const reactionTime = releaseTime - STATE.stimulusOnsetTime;
            STATE.currentRT = reactionTime;
            STATE.rtRelease = reactionTime;

            clearTimeout(goTimeout);
            setPositionForNextPhase();
            setTrialState('go-delay');

            // Wait a randomized delay before showing "Put your finger down"
            goDelayTimeout = setTimeout(() => {
                STATE.putDownPromptTime = Date.now();
                setTrialState('released');
                updateUI();
            }, getRandomGoDelay());
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
            showRetryModal("Too slow! Please lift your finger when you see GO.");
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
        showRetryModal("You lifted your finger! Remember: NO GO means keep holding. Let's try again!");
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
            STATE.rtRelease = null;
            STATE.putDownPromptTime = null;
            STATE.rtDown = null;
            els.stimulusText.innerText = '';
            els.stimulusText.classList.add('opacity-0');
            // els.stimulusText.classList.remove('animate-fadeInDown');


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


function getRandomGoDelay() {
    const { min, max } = CONFIG.goPromptDelay;
    return Math.floor(Math.random() * (max - min + 1)) + min;
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
            text = 'GO';
            color = '#10b981'; // GREEN
        } else {
            text = 'NO GO';
            color = '#ef4444'; // RED
        }
    } else if (trialState === 'go-delay') {
        text = '';
        color = '#000000';
    } else if (trialState === 'released') {
        text = 'Put your finger down';
        color = '#10b981'; // GREEN
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