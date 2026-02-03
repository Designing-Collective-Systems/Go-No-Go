// =========================================================
// TASK CONFIGURATION
// =========================================================

const CONFIG = {
  circlePosition: 'fixed',
  showFeedback: true,
  showInstructionFeedback: true,
  
  // Distance from start circle center to goal circle center (pixels)
  // Increase to move goal further up, decrease to move closer
  goalDistancePx: 300,
  
  // Goal circle radius for detection (pixels)
  goalRadiusPx: 64,
  
  // POSITION CONTROLS
  // Prompt text position (top of screen) - pixels from top
  promptTextTopPx: 32,
  
  // Start circle vertical position - percentage of screen height (0 = top, 100 = bottom)
  // Default: 75 means 75% down from top
  startCircleVerticalPercent: 75,
  
  // Horizontal offset for circles - percentage (-50 to 50, 0 = center)
  // Negative = left, Positive = right, 0 = center
  circlesHorizontalOffsetPercent: 0,
  
  // Minimum padding from screen edges (pixels)
  edgePaddingPx: 20
};

// =========================================================
// EDIT TRIAL SEQUENCES HERE
// =========================================================

const PRACTICE_SEQUENCE = [
  { type: 'go', delay: 6000, xFactor: 0, yFactor: 0 },
  { type: 'nogo', delay: 6000, xFactor: 0.5, yFactor: -0.5 },
  { type: 'go', delay: 7000, xFactor: -0.5, yFactor: 0.5 },
  { type: 'go', delay: 8000, xFactor: 0.8, yFactor: 0.8 },
  { type: 'nogo', delay: 7000, xFactor: -0.8, yFactor: -0.2 },
  { type: 'go', delay: 6000, xFactor: 0, yFactor: 0.9 }
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
    id: 'task-overview',
    type: 'text',
    title: 'How This Task Works',
    message: 'In the Go/No-Go task, you\'ll press and hold a blue circle on the screen. Sometimes you\'ll need to swipe up to the orange goal circle when you see <strong>GO</strong>, and other times you\'ll need to keep holding (no swiping) when you see <strong>NO GO</strong>.',
    buttonText: 'Got it, let\'s start!'
  },
  {
    id: 'go-explanation',
    type: 'text',
    title: 'Learning GO Trials',
    message: 'You\'ll see a blue circle at the bottom. When the word <strong>GO</strong> appears in the orange circle above, keep your finger on the screen and swipe up to touch the orange goal circle.',
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
    message: 'Great job! Now when you see <strong>NO GO</strong> appear in the orange circle, keep holding the blue circle. Do NOT swipe up.',
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
    message: 'Excellent work! You now understand both <strong>GO</strong> and <strong>NO GO</strong> trials.<br>Ready to start practicing?',
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
  trialCompleted: false,
  trialErrorShown: false,

  // Swipe tracking
  swipe: {
    isActive: false,
    baseX: null,
    baseY: null,
    goalX: null,
    goalY: null,
    samples: [],
    movementOnsetTime: null,
    movementOnsetX: null,
    movementOnsetY: null,
    peakVelocity: null,
    peakVelocityTime: null,
    pathLength: 0,
    directionReversals: 0,
    _lastX: null,
    _lastY: null,
    _lastT: null,
    _lastDySign: 0,
    maxDisplacement: 0,
    endX: null,
    endY: null,
    goalReachedTime: null,
    completed: false
  }
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
  promptText: document.getElementById('prompt-text'),
  goalText: document.getElementById('goal-text'),
  goalCircle: document.getElementById('goal-circle'),
  gameButton: document.getElementById('game-button'),
  retryModal: document.getElementById('retry-modal'),
  retryMessage: document.getElementById('retry-message'),
  tutorialUi: document.getElementById('tutorial-ui'),
  tutorialPromptText: document.getElementById('tutorial-prompt-text'),
  tutorialGoalText: document.getElementById('tutorial-goal-text'),
  tutorialGoalCircle: document.getElementById('tutorial-goal-circle'),
  tutorialButton: document.getElementById('tutorial-button'),
  tutorialContinueContainer: document.getElementById('tutorial-continue-container'),
  tutorialContinueBtn: document.getElementById('tutorial-continue-btn')
};

// ================= SWIPE / MOVEMENT TRACKING =================

const MOVE_DEADBAND_PX = 8;

function resetSwipeTracking(baseX, baseY) {
  STATE.swipe.isActive = true;
  STATE.swipe.baseX = baseX;
  STATE.swipe.baseY = baseY;
  STATE.swipe.goalX = baseX;
  STATE.swipe.goalY = baseY - CONFIG.goalDistancePx;
  STATE.swipe.samples = [];
  STATE.swipe.movementOnsetTime = null;
  STATE.swipe.movementOnsetX = null;
  STATE.swipe.movementOnsetY = null;
  STATE.swipe.peakVelocity = null;
  STATE.swipe.peakVelocityTime = null;
  STATE.swipe.pathLength = 0;
  STATE.swipe.directionReversals = 0;
  STATE.swipe._lastX = null;
  STATE.swipe._lastY = null;
  STATE.swipe._lastT = null;
  STATE.swipe._lastDySign = 0;
  STATE.swipe.maxDisplacement = 0;
  STATE.swipe.endX = null;
  STATE.swipe.endY = null;
  STATE.swipe.goalReachedTime = null;
  STATE.swipe.completed = false;
  
  console.log(`Goal Circle Position: (${Math.round(STATE.swipe.goalX)}, ${Math.round(STATE.swipe.goalY)})`);
}

function updateSwipeSample(x, y, t) {
  if (!STATE.swipe.isActive || STATE.swipe.completed) return;

  const bx = STATE.swipe.baseX;
  const by = STATE.swipe.baseY;
  if (bx == null || by == null) return;

  const dxBase = x - bx;
  const dyBase = y - by;
  const disp = Math.sqrt(dxBase * dxBase + dyBase * dyBase);
  if (disp > STATE.swipe.maxDisplacement) STATE.swipe.maxDisplacement = disp;

  if (STATE.swipe.movementOnsetTime == null && disp >= MOVE_DEADBAND_PX) {
    STATE.swipe.movementOnsetTime = t;
    STATE.swipe.movementOnsetX = x;
    STATE.swipe.movementOnsetY = y;
  }

  if (STATE.swipe._lastX != null) {
    const dx = x - STATE.swipe._lastX;
    const dy = y - STATE.swipe._lastY;
    const dt = t - STATE.swipe._lastT;
    const seg = Math.sqrt(dx * dx + dy * dy);
    STATE.swipe.pathLength += seg;

    if (dt > 0) {
      const v = (seg / dt) * 1000;
      if (STATE.swipe.peakVelocity == null || v > STATE.swipe.peakVelocity) {
        STATE.swipe.peakVelocity = v;
        STATE.swipe.peakVelocityTime = t;
      }
    }

    const sign = dy < 0 ? -1 : dy > 0 ? 1 : 0;
    if (sign !== 0 && STATE.swipe._lastDySign !== 0 && sign !== STATE.swipe._lastDySign) {
      STATE.swipe.directionReversals += 1;
    }
    if (sign !== 0) STATE.swipe._lastDySign = sign;
  }

  STATE.swipe._lastX = x;
  STATE.swipe._lastY = y;
  STATE.swipe._lastT = t;
  STATE.swipe.samples.push({ x, y, t });

  // Check if finger is inside goal circle (distance-based)
  const goalCenterX = STATE.swipe.goalX;
  const goalCenterY = STATE.swipe.goalY;
  const dx = x - goalCenterX;
  const dy = y - goalCenterY;
  const distanceToGoal = Math.sqrt(dx * dx + dy * dy);

  if (distanceToGoal <= CONFIG.goalRadiusPx) {
    STATE.swipe.completed = true;
    STATE.swipe.goalReachedTime = t;
    STATE.swipe.endX = x;
    STATE.swipe.endY = y;
    onGoalReached();
  }
}

function onGoalReached() {
  // Prevent double-triggering
  if (STATE.trialCompleted || STATE.trialErrorShown) return;
  
  if (!STATE.isInTutorial) {
    if (STATE.trialState !== 'stimulus' || !STATE.currentTrialConfig) return;

    if (STATE.currentTrialConfig.type === 'go') {
      completeGoSwipeTrial();
    } else {
      // NO-GO trial - user reached goal (ERROR)
      completeNoGoReachedGoalError();
    }
    return;
  }

  const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];
  if (!step || step.type !== 'tutorial') return;
  if (STATE.trialState !== 'stimulus') return;

  if (step.trialType === 'go') {
    completeTutorialGoSwipe();
  } else {
    // Tutorial NO-GO trial - user reached goal (ERROR)
    completeTutorialNoGoReachedGoalError();
  }
}

function getSwipeMetricsForLog() {
  const s = STATE.swipe;
  const stimulusOnset = STATE.stimulusOnsetTime || null;
  const mot = s.movementOnsetTime;
  const goalT = s.goalReachedTime;

  const movementOnsetRT = (stimulusOnset != null && mot != null) ? (mot - stimulusOnset) : null;
  const responseTime = (stimulusOnset != null && goalT != null) ? (goalT - stimulusOnset) : null;
  const totalMovementTime = (mot != null && goalT != null) ? (goalT - mot) : null;
  const peakVelocityTime = (mot != null && s.peakVelocityTime != null) ? (s.peakVelocityTime - mot) : null;

  return {
    rt: movementOnsetRT,
    movementOnsetTimeMs: movementOnsetRT,
    totalMovementTimeMs: totalMovementTime,
    peakVelocityTimeMs: peakVelocityTime,
    responseTimeMs: responseTime,
    peakVelocityPxPerSec: s.peakVelocity,
    pathLengthPx: s.pathLength,
    directionReversals: s.directionReversals,
    startX: s.baseX,
    startY: s.baseY,
    endX: s.endX,
    endY: s.endY,
    goalX: s.goalX,
    goalY: s.goalY,
    maxNoGoDisplacementPx: null
  };
}

function handleGlobalMove(e) {
  if (!STATE.isHolding) return;
  if (STATE.trialState !== 'stimulus') return;

  let x, y;
  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
    e.preventDefault();
  } else {
    x = e.clientX;
    y = e.clientY;
  }

  const t = Date.now();
  updateSwipeSample(x, y, t);
}

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
      <button onclick="nextInstructionStep()" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg text-xl transition-colors shadow-lg">
        ${step.buttonText}
      </button>
    `;
  } else if (step.type === 'tutorial') {
    els.menuOverlay.classList.add('hidden');
    els.tutorialUi.classList.remove('hidden');

    STATE.tutorialTrialComplete = false;
    STATE.isHolding = false;
    STATE.trialState = 'waiting';

    els.tutorialPromptText.innerText = '';
    els.tutorialGoalText.innerText = '';
    els.tutorialGoalText.style.opacity = '0';
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

    let x, y;
    if (e.touches && e.touches.length > 0) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      x = e.clientX;
      y = e.clientY;
    }
    STATE.lastInput = { x: Math.round(x), y: Math.round(y), screenW: window.innerWidth, screenH: window.innerHeight };

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
  newButton.addEventListener('mouseleave', () => {
    if (STATE.isHolding) end();
  });
}

function handleTutorialPressStart(step) {
  if (STATE.tutorialTrialComplete) return;

  if (STATE.trialState === 'waiting') {
    STATE.isHolding = true;
    STATE.trialState = 'holding';
    STATE.trialErrorShown = false;
    STATE.trialCompleted = false;
    updateTutorialUI();

    stimulusTimeout = setTimeout(() => {
      STATE.stimulusOnsetTime = Date.now();
      STATE.trialState = 'stimulus';
      updateTutorialUI();
      STATE.noGoSlipStartTime = null;

      resetSwipeTracking(STATE.lastInput.x, STATE.lastInput.y);

      if (step.trialType === 'go') {
        goTimeout = setTimeout(() => {
          if (!STATE.tutorialTrialComplete && !STATE.trialErrorShown) {
            STATE.trialErrorShown = true;
            showTutorialRetry("Too slow! Please swipe up to touch the orange goal circle when you see GO.");
          }
        }, 5000);
      } else if (step.trialType === 'nogo') {
        noGoTimeout = setTimeout(() => {
          if (STATE.isHolding && !STATE.trialErrorShown) {
            if (CONFIG.showInstructionFeedback) {
              els.tutorialPromptText.innerText = 'Perfect!';
              els.tutorialPromptText.style.color = '#000000';
            }
            STATE.tutorialTrialComplete = true;
            els.tutorialContinueContainer.classList.remove('hidden');
          } else if (!STATE.trialErrorShown) {
            STATE.trialErrorShown = true;
            showTutorialRetry("You lifted your finger! Remember: NO GO means keep holding.");
          }
        }, 5000);
      }
    }, step.delay);
  }
}

function handleTutorialPressEnd(step) {
  STATE.isHolding = false;

  if (STATE.tutorialTrialComplete) {
    updateTutorialButtonAppearance();
    return;
  }

  if (STATE.trialErrorShown) {
    return;
  }

  if (STATE.trialState === 'holding') {
    clearTimeout(stimulusTimeout);
    STATE.trialErrorShown = true;
    showTutorialRetry("You lifted your finger before seeing the instruction. Please keep holding until you see GO or NO GO. Let's try again!");
  } else if (STATE.trialState === 'stimulus') {
    if (step.trialType === 'go') {
      if (STATE.swipe.completed) {
        return;
      }
      clearTimeout(goTimeout);
      STATE.trialErrorShown = true;
      showTutorialRetry("Keep your finger on the screen and swipe up to touch the orange goal circle when you see GO. Let's try again!");
    } else if (step.trialType === 'nogo') {
      STATE.noGoSlipStartTime = Date.now();
      clearTimeout(noGoTimeout);
      STATE.trialErrorShown = true;
      showTutorialRetry("You lifted your finger! Remember: NO GO means keep holding. Let's try again!");
    }
  }

  updateTutorialButtonAppearance();
}

function completeTutorialGoSwipe() {
  if (STATE.tutorialTrialComplete) return;
  STATE.tutorialTrialComplete = true;
  
  clearTimeout(goTimeout);
  
  const metrics = getSwipeMetricsForLog();

  if (CONFIG.showInstructionFeedback) {
    els.tutorialPromptText.innerText = 'Excellent!';
    els.tutorialPromptText.style.color = '#000000';
  }

  logMetric({
    trialType: 'go',
    isCorrect: true,
    resultType: 'Success',
    errorCategory: 'None',
    ...metrics
  });

  els.tutorialContinueContainer.classList.remove('hidden');
}

function completeTutorialNoGoReachedGoalError() {
  if (STATE.tutorialTrialComplete || STATE.trialErrorShown) return;
  
  STATE.trialErrorShown = true;
  clearTimeout(noGoTimeout);
  
  const metrics = getSwipeMetricsForLog();
  
  logMetric({
    trialType: 'nogo',
    isCorrect: false,
    resultType: 'Mistake',
    errorCategory: 'Failed Inhibition (Reached Goal)',
    ...metrics,
    maxNoGoDisplacementPx: STATE.swipe.maxDisplacement
  });
  
  showTutorialRetry('You reached the goal during a NO GO trial. Remember: NO GO means keep holding. Let\'s try again!');
}

function updateTutorialUI() {
  const { trialState } = STATE;
  const step = INSTRUCTION_STEPS[STATE.tutorialStepIndex];

  let promptText = '';
  let goalText = '';
  let promptColor = '#000000';
  let goalColor = '#ffffff';

  if (trialState === 'waiting') {
    promptText = 'Press & Hold';
    promptColor = '#000000';
  } else if (trialState === 'stimulus') {
    if (step.trialType === 'go') {
      goalText = 'GO';
      goalColor = '#ffffff';
    } else {
      goalText = 'NO GO';
      goalColor = '#ffffff';
    }
  }

  els.tutorialPromptText.innerText = promptText;
  els.tutorialPromptText.style.color = promptColor;

  els.tutorialGoalText.innerText = goalText;
  els.tutorialGoalText.style.color = goalColor;
  els.tutorialGoalText.style.opacity = goalText ? '1' : '0';
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
  STATE.trialErrorShown = false;
  STATE.trialCompleted = false;

  els.tutorialPromptText.innerText = '';
  els.tutorialGoalText.innerText = '';
  els.tutorialGoalText.style.opacity = '0';

  setupTutorialTrial(step);
  updateTutorialUI();
}

function updateTutorialButtonPosition(xFactor, yFactor) {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const btnRadius = 64;
  
  const startY = (CONFIG.startCircleVerticalPercent / 100) * screenHeight;
  const goalY = startY - CONFIG.goalDistancePx;
  
  const minAbsX = btnRadius + CONFIG.edgePaddingPx;
  const maxAbsX = screenWidth - btnRadius - CONFIG.edgePaddingPx;
  const availableWidth = maxAbsX - minAbsX;
  
  if (availableWidth <= 0) return;
  
  const normX = (xFactor + 1) / 2;
  let targetAbsX = minAbsX + (normX * availableWidth);
  
  const horizontalOffset = (CONFIG.circlesHorizontalOffsetPercent / 100) * screenWidth;
  targetAbsX += horizontalOffset;
  
  targetAbsX = Math.max(minAbsX, Math.min(maxAbsX, targetAbsX));
  
  const screenCenterX = screenWidth / 2;
  const screenCenterY = screenHeight / 2;
  
  const translateX = targetAbsX - screenCenterX;
  const translateYStart = startY - screenCenterY;
  const translateYGoal = goalY - screenCenterY;
  
  els.tutorialButton.style.transform = `translate(${translateX}px, ${translateYStart}px)`;
  els.tutorialGoalCircle.style.transform = `translate(${translateX}px, ${translateYGoal}px)`;
}

function updateTutorialButtonAppearance() {
  const btn = els.tutorialButton;
  btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none z-10 transition-transform duration-300 ease-out`;

  if (STATE.trialState === 'waiting') {
    btn.classList.add('hover:scale-105', 'active:scale-95');
  } else if (STATE.trialState === 'holding') {
    btn.classList.add('scale-95');
  } else if (STATE.trialState === 'stimulus') {
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
    trialIndex: STATE.currentTrialIndex + 1,
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
  if (record.goalX != null && record.goalY != null) {
    console.log(`Goal Position: (${Math.round(record.goalX)}, ${Math.round(record.goalY)})`);
  }
  console.groupEnd();
}

// ================= CSV EXPORT =================

function downloadCSV() {
  const headers = [
    'Phase', 'Trial Index', 'Trial Type', 'Is Correct', 'Result Type', 'Error Category',
    'Reaction Time (ms)', 'Recontact Time (ms)',
    'Movement Onset Time (ms)', 'Total Movement Time (ms)', 'Peak Velocity Time (ms)',
    'Response Time (ms)', 'Peak Velocity (px/s)', 'Path Length (px)', 'Direction Reversals',
    'Start X', 'Start Y', 'Goal X', 'Goal Y', 'End X', 'End Y', 'Max NO-GO Displacement (px)',
    'Touch X', 'Touch Y', 'Timestamp'
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
    trial.movementOnsetTimeMs || '',
    trial.totalMovementTimeMs || '',
    trial.peakVelocityTimeMs || '',
    trial.responseTimeMs || '',
    trial.peakVelocityPxPerSec || '',
    trial.pathLengthPx || '',
    trial.directionReversals || '',
    trial.startX || '',
    trial.startY || '',
    trial.goalX || '',
    trial.goalY || '',
    trial.endX || '',
    trial.endY || '',
    trial.maxNoGoDisplacementPx || '',
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
    'Phase', 'Trial', 'Type', 'Correct', 'Result', 'Error',
    'RT (ms)', 'Recontact (ms)',
    'MOT (ms)', 'Move Time (ms)', 'TPV (ms)', 'Resp Time (ms)',
    'PV (px/s)', 'Path (px)', 'Reversals',
    'Start (x,y)', 'Goal (x,y)', 'End (x,y)', 'Max NO-GO Disp (px)',
    'Touch X', 'Touch Y', 'Timestamp'
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
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.rt ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.recontactTime ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.movementOnsetTimeMs ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.totalMovementTimeMs ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.peakVelocityTimeMs ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.responseTimeMs ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.peakVelocityPxPerSec ? trial.peakVelocityPxPerSec.toFixed(1) : ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.pathLengthPx ? trial.pathLengthPx.toFixed(1) : ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.directionReversals ?? ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.startX != null ? `(${Math.round(trial.startX)}, ${Math.round(trial.startY)})` : ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.goalX != null ? `(${Math.round(trial.goalX)}, ${Math.round(trial.goalY)})` : ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.endX != null ? `(${Math.round(trial.endX)}, ${Math.round(trial.endY)})` : ''}</td>`;
    tableHTML += `<td class="border border-slate-600 px-4 py-2">${trial.maxNoGoDisplacementPx ? trial.maxNoGoDisplacementPx.toFixed(1) : ''}</td>`;
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
  const dashboardWindow = window.open('dashboard.html', '_blank');

  if (dashboardWindow) {
    dashboardWindow.addEventListener('load', () => {
      dashboardWindow.postMessage({ type: 'GONOGO_DATA', data: STATE.allTrials }, '*');
    });
  }
}

// ================= FLOW CONTROL =================

function init() {
  showMenuPhase('welcome');
  setupButtonListeners();
  setPromptTextPosition();

  window.addEventListener('touchmove', handleGlobalMove, { passive: false });
  window.addEventListener('mousemove', handleGlobalMove);

  console.log('App Initialized.');
  console.log('Configuration:', CONFIG);
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
  console.log('==== PHASE COMPLETE ====');
  console.log('Phase:', STATE.isPractice ? 'Practice' : 'Real Study');
  console.log('Total Slips:', STATE.slipCount);
  console.table(STATE.currentPhaseTrials);

  els.taskUi.classList.add('hidden');
  els.menuOverlay.classList.remove('hidden');

  if (STATE.isPractice) {
    showMenuPhase('real-intro');
  } else {
    showMenuPhase('complete');
  }
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
  STATE.trialCompleted = false;
  STATE.trialErrorShown = false;

  els.promptText.innerText = '';
  els.goalText.innerText = '';
  els.goalText.style.opacity = '0';

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

function completeGoSwipeTrial() {
  if (STATE.trialCompleted || STATE.trialErrorShown) return;
  
  STATE.trialCompleted = true;
  clearTimeout(goTimeout);
  
  const metrics = getSwipeMetricsForLog();
  logMetric({
    trialType: 'go',
    isCorrect: true,
    resultType: 'Success',
    errorCategory: 'None',
    ...metrics
  });
  setTrialState('feedback');
  advanceTrial();
}

function completeNoGoReachedGoalError() {
  if (STATE.trialCompleted || STATE.trialErrorShown) return;
  
  STATE.trialErrorShown = true;
  clearTimeout(noGoTimeout);
  
  const metrics = getSwipeMetricsForLog();
  logMetric({
    trialType: 'nogo',
    isCorrect: false,
    resultType: 'Mistake',
    errorCategory: 'Failed Inhibition (Reached Goal)',
    ...metrics,
    maxNoGoDisplacementPx: STATE.swipe.maxDisplacement
  });
  
  showRetryModal('You reached the goal during a NO GO trial. Remember: NO GO means keep holding. Let\'s try again!');
}

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
      errorCategory: 'Partial Release Slip',
      rt: STATE.noGoSlipStartTime - STATE.stimulusOnsetTime,
      recontactTime: timeToReapply,
      movementOnsetTimeMs: null,
      totalMovementTimeMs: null,
      peakVelocityTimeMs: null,
      responseTimeMs: null,
      peakVelocityPxPerSec: null,
      pathLengthPx: STATE.swipe.pathLength,
      directionReversals: STATE.swipe.directionReversals,
      startX: STATE.swipe.baseX,
      startY: STATE.swipe.baseY,
      goalX: STATE.swipe.goalX,
      goalY: STATE.swipe.goalY,
      endX: STATE.swipe._lastX,
      endY: STATE.swipe._lastY,
      maxNoGoDisplacementPx: STATE.swipe.maxDisplacement
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
    STATE.trialCompleted = false;
    STATE.trialErrorShown = false;
    setTrialState('holding');

    const delay = STATE.currentTrialConfig.delay;

    stimulusTimeout = setTimeout(() => {
      STATE.stimulusOnsetTime = Date.now();
      STATE.noGoSlipStartTime = null;

      resetSwipeTracking(STATE.lastInput.x, STATE.lastInput.y);

      setTrialState('stimulus');
      runStimulusLogic();
    }, delay);
  }
}

function handlePressEnd() {
  STATE.isHolding = false;
  const releaseTime = Date.now();

  if (STATE.trialErrorShown || STATE.trialCompleted) {
    return;
  }

  if (STATE.trialState === 'holding') {
    clearTimeout(stimulusTimeout);

    STATE.trialErrorShown = true;

    logMetric({
      trialType: 'pending',
      isCorrect: false,
      resultType: 'Mistake',
      errorCategory: 'Early Release',
      rt: null,
      movementOnsetTimeMs: null,
      totalMovementTimeMs: null,
      peakVelocityTimeMs: null,
      responseTimeMs: null,
      peakVelocityPxPerSec: null,
      pathLengthPx: null,
      directionReversals: null,
      startX: null,
      startY: null,
      goalX: null,
      goalY: null,
      endX: null,
      endY: null,
      maxNoGoDisplacementPx: null
    });

    showRetryModal('You lifted your finger before seeing the instruction. Please keep holding until you see GO or NO GO. Let\'s try again!');
  } else if (STATE.trialState === 'stimulus') {
    if (STATE.currentTrialConfig.type === 'go') {
      if (STATE.swipe.completed) {
        return;
      }

      clearTimeout(goTimeout);
      
      STATE.trialErrorShown = true;

      logMetric({
        trialType: 'go',
        isCorrect: false,
        resultType: 'Mistake',
        errorCategory: 'Lifted Before Reaching Goal',
        rt: null,
        movementOnsetTimeMs: null,
        totalMovementTimeMs: null,
        peakVelocityTimeMs: null,
        responseTimeMs: null,
        peakVelocityPxPerSec: null,
        pathLengthPx: STATE.swipe.pathLength,
        directionReversals: STATE.swipe.directionReversals,
        startX: STATE.swipe.baseX,
        startY: STATE.swipe.baseY,
        goalX: STATE.swipe.goalX,
        goalY: STATE.swipe.goalY,
        endX: STATE.swipe._lastX,
        endY: STATE.swipe._lastY,
        maxNoGoDisplacementPx: null
      });

      showRetryModal('Keep your finger on the screen and swipe up to touch the orange goal circle when you see GO. Let\'s try again!');
    } else {
      STATE.noGoSlipStartTime = releaseTime;
    }
  }
}

function runStimulusLogic() {
  if (STATE.currentTrialConfig.type === 'go') {
    goTimeout = setTimeout(() => {
      if (STATE.trialCompleted || STATE.trialErrorShown) return;
      
      STATE.trialErrorShown = true;
      
      logMetric({
        trialType: 'go',
        isCorrect: false,
        resultType: 'Mistake',
        errorCategory: 'Did Not Reach Goal',
        rt: null,
        movementOnsetTimeMs: null,
        totalMovementTimeMs: null,
        peakVelocityTimeMs: null,
        responseTimeMs: null,
        peakVelocityPxPerSec: null,
        pathLengthPx: STATE.swipe.pathLength,
        directionReversals: STATE.swipe.directionReversals,
        startX: STATE.swipe.baseX,
        startY: STATE.swipe.baseY,
        goalX: STATE.swipe.goalX,
        goalY: STATE.swipe.goalY,
        endX: STATE.swipe._lastX,
        endY: STATE.swipe._lastY,
        maxNoGoDisplacementPx: null
      });

      showRetryModal('Too slow! Please swipe up to touch the orange goal circle when you see GO.');
    }, 5000);
  } else {
    noGoTimeout = setTimeout(() => {
      if (STATE.isHolding && !STATE.trialErrorShown && !STATE.trialCompleted) {
        evaluateNoGoTrial(true);
      } else if (!STATE.trialErrorShown && !STATE.trialCompleted) {
        evaluateNoGoTrial(false);
      }
    }, 5000);
  }
}

function evaluateNoGoTrial(finalSuccess) {
  if (STATE.trialCompleted || STATE.trialErrorShown) return;
  
  if (finalSuccess) {
    STATE.trialCompleted = true;
    
    logMetric({
      trialType: 'nogo',
      isCorrect: true,
      resultType: 'Success',
      errorCategory: 'None',
      rt: null,
      movementOnsetTimeMs: null,
      totalMovementTimeMs: null,
      peakVelocityTimeMs: null,
      responseTimeMs: null,
      peakVelocityPxPerSec: null,
      pathLengthPx: STATE.swipe.pathLength,
      directionReversals: STATE.swipe.directionReversals,
      startX: STATE.swipe.baseX,
      startY: STATE.swipe.baseY,
      goalX: STATE.swipe.goalX,
      goalY: STATE.swipe.goalY,
      endX: STATE.swipe._lastX,
      endY: STATE.swipe._lastY,
      maxNoGoDisplacementPx: STATE.swipe.maxDisplacement
    });

    setTrialState('feedback');
    advanceTrial();
  } else {
    STATE.trialErrorShown = true;
    
    logMetric({
      trialType: 'nogo',
      isCorrect: false,
      resultType: 'Mistake',
      errorCategory: 'Failed Inhibition',
      rt: STATE.noGoSlipStartTime ? STATE.noGoSlipStartTime - STATE.stimulusOnsetTime : null,
      movementOnsetTimeMs: null,
      totalMovementTimeMs: null,
      peakVelocityTimeMs: null,
      responseTimeMs: null,
      peakVelocityPxPerSec: null,
      pathLengthPx: STATE.swipe.pathLength,
      directionReversals: STATE.swipe.directionReversals,
      startX: STATE.swipe.baseX,
      startY: STATE.swipe.baseY,
      goalX: STATE.swipe.goalX,
      goalY: STATE.swipe.goalY,
      endX: STATE.swipe._lastX,
      endY: STATE.swipe._lastY,
      maxNoGoDisplacementPx: STATE.swipe.maxDisplacement
    });

    showRetryModal('You lifted your finger! Remember: NO GO means keep holding. Let\'s try again!');
  }
}

function advanceTrial() {
  clearAllTimeouts();
  
  STATE.currentTrialIndex++;

  const sequence = getCurrentSequence();

  if (STATE.currentTrialIndex >= sequence.length) {
    feedbackTimeout = setTimeout(onComplete, 1500);
  } else {
    feedbackTimeout = setTimeout(() => {
      clearAllTimeouts();
      
      setTrialState('waiting');

      STATE.currentTrialConfig = null;
      STATE.currentRT = null;
      STATE.noGoSlipStartTime = null;

      els.promptText.innerText = '';
      els.goalText.innerText = '';
      els.goalText.style.opacity = '0';

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

function onComplete() {
  clearAllTimeouts();
  onTaskComplete();
}

// ================= POSITIONING LOGIC =================

function updateButtonPosition(xFactor, yFactor) {
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const btnRadius = 64;
  
  const startY = (CONFIG.startCircleVerticalPercent / 100) * screenHeight;
  const goalY = startY - CONFIG.goalDistancePx;
  
  const minAbsX = btnRadius + CONFIG.edgePaddingPx;
  const maxAbsX = screenWidth - btnRadius - CONFIG.edgePaddingPx;
  const availableWidth = maxAbsX - minAbsX;
  
  if (availableWidth <= 0) return;
  
  const normX = (xFactor + 1) / 2;
  let targetAbsX = minAbsX + (normX * availableWidth);
  
  const horizontalOffset = (CONFIG.circlesHorizontalOffsetPercent / 100) * screenWidth;
  targetAbsX += horizontalOffset;
  
  targetAbsX = Math.max(minAbsX, Math.min(maxAbsX, targetAbsX));
  
  const screenCenterX = screenWidth / 2;
  const screenCenterY = screenHeight / 2;
  
  const translateX = targetAbsX - screenCenterX;
  const translateYStart = startY - screenCenterY;
  const translateYGoal = goalY - screenCenterY;
  
  els.gameButton.style.transform = `translate(${translateX}px, ${translateYStart}px)`;
  els.goalCircle.style.transform = `translate(${translateX}px, ${translateYGoal}px)`;
}

function setPromptTextPosition() {
  if (els.promptText) {
    els.promptText.style.top = CONFIG.promptTextTopPx + 'px';
  }
  if (els.tutorialPromptText) {
    els.tutorialPromptText.style.top = CONFIG.promptTextTopPx + 'px';
  }
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

// ================= UI UPDATE =================

function updateUI() {
  const { trialState, currentTrialConfig } = STATE;
  const btn = els.gameButton;

  let promptText = '';
  let goalText = '';
  let promptColor = '#000000';
  let goalColor = '#ffffff';

  if (trialState === 'waiting') {
    promptText = 'Press & Hold';
    promptColor = '#000000';
  } else if (trialState === 'stimulus') {
    if (currentTrialConfig.type === 'go') {
      goalText = 'GO';
      goalColor = '#ffffff';
    } else {
      goalText = 'NO GO';
      goalColor = '#ffffff';
    }
  } else if (trialState === 'feedback') {
    promptText = '';
  }

  els.promptText.innerText = promptText;
  els.promptText.style.color = promptColor;

  els.goalText.innerText = goalText;
  els.goalText.style.color = goalColor;
  els.goalText.style.opacity = goalText ? '1' : '0';

  btn.className = `w-32 h-32 rounded-full bg-blue-500 shadow-2xl absolute cursor-pointer focus:outline-none touch-none z-10 transition-transform duration-300 ease-out`;

  if (trialState === 'waiting') {
    btn.classList.add('hover:scale-105', 'active:scale-95');
  } else if (trialState === 'holding') {
    btn.classList.add('scale-95');
  } else if (trialState === 'stimulus') {
    btn.classList.add('scale-100');
  }
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
  btn.addEventListener('mouseleave', () => {
    if (STATE.isHolding) end();
  });
}

init();
