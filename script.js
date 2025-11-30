// script.js - Updated: top-right theme toggle (minimal) + red End Exam button
// Question Bank now loaded dynamically from questions.json (50 questions on frontend topics)

// Quiz Engine Module
let quizQuestions = [];
let currentIndex = 0;
let userAnswers = new Array(15).fill(null);
let timeLeft = 1800; // 30 minutes in seconds
let timerInterval;

// Randomly select 15 questions from provided bank
function selectQuestions(questionBank) {
    const indices = [...Array(questionBank.length).keys()].sort(() => Math.random() - 0.5);
    return indices.slice(0, 15).map(idx => questionBank[idx]);
}

// Process loaded JSON data to match expected structure
// IMPORTANT: Do NOT add A/B/C/D prefixes here — keep raw option text and let renderer add labels once
function processQuestions(data) {
    return data.map(q => ({
        text: q.question,
        // keep raw option text (no "A: " prefix)
        options: q.options.map(opt => opt),
        // normalize answer: if JSON uses letters ("A","B",...) convert to indices 0..3, otherwise keep numeric index
        correct: (function(ans){
            if (typeof ans === 'string') {
                const letter = ans.trim().toUpperCase();
                if (letter.length > 0 && letter.charCodeAt(0) >= 65 && letter.charCodeAt(0) <= 90) {
                    return letter.charCodeAt(0) - 65;
                }
                // fallback: try parseInt
                const parsed = parseInt(ans, 10);
                return Number.isFinite(parsed) ? parsed : null;
            }
            return typeof ans === 'number' ? ans : null;
        })(q.answer)
        // Ignore id and tags as they're not used in the quiz logic
    }));
}

// Helper to escape HTML tags in option text so they display as plain text
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;  // This safely escapes < > & etc.
}

// Load questions from JSON asynchronously
async function loadQuestions() {
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error(`Failed to load questions: ${response.statusText}`);
        }
        const data = await response.json();
        return processQuestions(data);
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please check if questions.json is in the correct location.');
        return [];
    }
}

// Load current question into UI
function loadQuestion() {
    const q = quizQuestions[currentIndex];
    if (!q) return; // safety

    const qNumEl = document.getElementById('qNum');
    const qTextEl = document.getElementById('qText');
    if (qNumEl) qNumEl.textContent = currentIndex + 1;
    if (qTextEl) qTextEl.textContent = q.text;

    const optionsDiv = document.getElementById('options');
    if (optionsDiv) {
        // Build options: renderer adds "A: " label once
        optionsDiv.innerHTML = q.options.map((opt, i) => {
            const label = String.fromCharCode(65 + i) + ': ';
            // escape option text to show literal < > rather than render HTML
            const escapedOpt = escapeHtml(opt);
            return `<div class="form-check">
                        <input class="form-check-input" type="radio" name="answer" id="opt${i}" value="${i}">
                        <label class="form-check-label" for="opt${i}">${label}${escapedOpt}</label>
                    </div>`;
        }).join('');
    }

    console.log(`Loaded options for Q${currentIndex + 1}:`, q.options);

    // Restore saved answer
    if (userAnswers[currentIndex] !== null) {
        const restoreEl = document.getElementById(`opt${userAnswers[currentIndex]}`);
        if (restoreEl) restoreEl.checked = true;
    }

    // Update buttons
    const prevBtnEl = document.getElementById('prevBtn');
    const nextBtnEl = document.getElementById('nextBtn');
    const submitBtnEl = document.getElementById('submitBtn');
    if(prevBtnEl) prevBtnEl.disabled = currentIndex === 0;
    if(nextBtnEl) nextBtnEl.classList.toggle('d-none', currentIndex === 14);
    if(submitBtnEl) submitBtnEl.classList.toggle('d-none', currentIndex < 14);
}

// Save current answer
function saveAnswer() {
    const selected = document.querySelector('input[name="answer"]:checked');
    userAnswers[currentIndex] = selected ? parseInt(selected.value) : null;
}

// Navigation
function nextQuestion() {
    if (currentIndex < 14) {
        saveAnswer();
        currentIndex++;
        loadQuestion();
    }
}

function prevQuestion() {
    if (currentIndex > 0) {
        saveAnswer();
        currentIndex--;
        loadQuestion();
    }
}

// Timer
function startTimer() {
    // Clear any existing timer
    stopTimerIfAny();
    timerInterval = setInterval(() => {
        timeLeft--;
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        const timerEl = document.getElementById('timer');
        if (timerEl) timerEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            submitTest();
        }
    }, 1000);
}

// Helper: stops timer if running (used by End Exam)
function stopTimerIfAny(){
    try {
        if (typeof timerInterval !== 'undefined' && timerInterval !== null) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    } catch(e){}
}

// Helper: disable all inputs and navigation so user cannot change answers after ending
function disableExamControls() {
    // Disable answer radios
    const answerInputs = document.querySelectorAll('#options input[type="radio"]');
    answerInputs.forEach(inp => inp.disabled = true);

    // Disable navigation buttons and submit button
    const buttons = document.querySelectorAll('#prevBtn, #nextBtn, #submitBtn, #startBtn');
    buttons.forEach(b => {
        if (b) b.disabled = true;
    });

    // Disable End Exam button to prevent repeated calls
    const endBtn = document.getElementById('end-exam-btn');
    if (endBtn) endBtn.disabled = true;
}

// Submit and calculate results
function submitTest() {
    saveAnswer();
    stopTimerIfAny();

    let correct = 0;
    let attempted = 0;
    userAnswers.forEach((ans, i) => {
        if (ans !== null && quizQuestions[i]) {
            attempted++;
            // Only count correct if correct is a valid index
            if (typeof quizQuestions[i].correct === 'number' && ans === quizQuestions[i].correct) correct++;
        }
    });
    const wrong = attempted - correct;
    const percentage = Math.round((correct / 15) * 100);

    // Update results UI
    const attemptedEl = document.getElementById('attempted');
    const correctEl = document.getElementById('correct');
    const wrongEl = document.getElementById('wrong');
    const percentageEl = document.getElementById('percentage');
    const progressBarEl = document.getElementById('progressBar');

    if (attemptedEl) attemptedEl.textContent = attempted;
    if (correctEl) correctEl.textContent = correct;
    if (wrongEl) wrongEl.textContent = wrong;
    if (percentageEl) percentageEl.textContent = percentage + '%';
    if (progressBarEl) {
        progressBarEl.style.width = percentage + '%';
        progressBarEl.setAttribute('aria-valuenow', percentage);
    }

    // Switch sections
    const quizSection = document.getElementById('quiz');
    const resultsSection = document.getElementById('results');
    if (quizSection) quizSection.classList.add('d-none');
    if (resultsSection) resultsSection.classList.remove('d-none');

    // disable further interaction
    disableExamControls();
}

// END EXAM: ends exam immediately (same behavior as submit but invoked at any time)
function endExam() {
    if (!confirm('Are you sure you want to end the exam now? You will not be able to change answers.')) return;

    saveAnswer();
    stopTimerIfAny();

    submitTest();
}

// THEME: apply / persist theme
function applyTheme(theme) {
    try {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
        localStorage.setItem('exam-theme', theme);

        const themeCheckbox = document.getElementById('theme-toggle-checkbox');
        if (themeCheckbox) themeCheckbox.checked = (theme === 'dark');
        const knob = document.querySelector('#theme-toggle-topright .knob');
        if (knob) knob.textContent = (theme === 'dark') ? '🌙' : '☀️';
    } catch (e) {}
}

function initThemeFromStorage(){
    const saved = localStorage.getItem('exam-theme') || 'light';
    applyTheme(saved);
}

// Create and inject minimalist slide button (top-right) + style End Exam button red
function enhanceThemeAndEndButtonUI() {
    // inject CSS once
    const styleId = 'exam-ui-enhancements';
    if (!document.getElementById(styleId)) {
        const css = `
/* Fixed top-right theme toggle */
#theme-toggle-topright {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 99999;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 36px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,245,245,0.85));
  box-shadow: 0 6px 18px rgba(2,6,23,0.12);
  padding: 4px;
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(0,0,0,0.04);
}

/* dark theme variant for the container (subtle) */
[data-theme="dark"] #theme-toggle-topright {
  background: linear-gradient(180deg, rgba(20,20,20,0.85), rgba(10,10,10,0.9));
  box-shadow: 0 6px 18px rgba(0,0,0,0.6);
}

/* knob inside */
#theme-toggle-topright .knob {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #fff;
  display: grid;
  place-items: center;
  transition: transform .22s cubic-bezier(.2,.9,.2,1), background .15s;
  box-shadow: 0 6px 12px rgba(11,102,255,0.08);
  font-size: 14px;
}

/* move knob to right in dark mode */
[data-theme="dark"] #theme-toggle-topright .knob {
  transform: translateX(28px);
  background: #111;
  color: #fff;
  box-shadow: 0 6px 12px rgba(0,0,0,0.6);
}

/* hide native checkbox */
#theme-toggle-topright input[type="checkbox"]{
  position: absolute;
  opacity: 0;
  pointer-events: none;
  width: 1px;
  height: 1px;
}

/* End Exam button styling (red) */
#end-exam-btn {
  background: linear-gradient(180deg,#d64545,#c13030);
  color: #fff;
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(193,40,40,0.18);
  cursor: pointer;
  transition: transform .08s ease, box-shadow .12s ease, filter .08s ease;
}

#end-exam-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

#end-exam-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 4px 12px rgba(193,40,40,0.16);
}

#end-exam-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* small responsive tweak so it doesn't overlap content on narrower screens */
@media (max-width: 480px) {
  #theme-toggle-topright { right: 10px; top: 10px; width: 58px; }
  #theme-toggle-topright .knob { width: 24px; height: 24px; }
}
        `;
        const style = document.createElement('style');
        style.id = styleId;
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // Hide/remove the existing label + select if present to remove headline
    const examControls = document.getElementById('exam-controls');
    if (examControls) {
        examControls.parentElement && examControls.parentElement.removeChild(examControls);
    }

    // Create a fixed top-right simple toggle if not already present
    if (!document.getElementById('theme-toggle-topright')) {
        const wrapper = document.createElement('button');
        wrapper.id = 'theme-toggle-topright';
        wrapper.setAttribute('aria-label', 'Toggle dark theme');
        wrapper.setAttribute('title', 'Toggle theme');
        wrapper.className = 'theme-toggle-topright';
        wrapper.innerHTML = `
            <span class="knob" aria-hidden="true">☀️</span>
            <input type="checkbox" id="theme-toggle-checkbox" aria-hidden="true">
        `;
        document.body.appendChild(wrapper);

        const checkbox = document.getElementById('theme-toggle-checkbox');
        const knob = wrapper.querySelector('.knob');

        const saved = localStorage.getItem('exam-theme') || 'light';
        if (checkbox) checkbox.checked = saved === 'dark';
        if (saved === 'dark') wrapper.setAttribute('aria-pressed', 'true');

        function updateKnobIcon() {
            const isDark = (localStorage.getItem('exam-theme') || 'light') === 'dark';
            if (knob) knob.textContent = isDark ? '🌙' : '☀️';
        }
        updateKnobIcon();

        wrapper.addEventListener('click', (e) => {
            e.preventDefault();
            const isNowDark = !(localStorage.getItem('exam-theme') === 'dark');
            applyTheme(isNowDark ? 'dark' : 'light');
            if (checkbox) checkbox.checked = isNowDark;
            wrapper.setAttribute('aria-pressed', isNowDark ? 'true' : 'false');
            updateKnobIcon();
        });

        wrapper.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                wrapper.click();
            }
            if (e.key === 'ArrowRight') {
                applyTheme('dark');
                if (checkbox) checkbox.checked = true;
                wrapper.setAttribute('aria-pressed', 'true');
                updateKnobIcon();
            }
            if (e.key === 'ArrowLeft') {
                applyTheme('light');
                if (checkbox) checkbox.checked = false;
                wrapper.setAttribute('aria-pressed', 'false');
                updateKnobIcon();
            }
        });

        wrapper.tabIndex = 0;
    }

    // Ensure end-exam button is styled red (CSS already targets #end-exam-btn)
    const endBtn = document.getElementById('end-exam-btn');
    if (endBtn) {
        endBtn.classList.remove('btn', 'btn-secondary', 'btn-outline-secondary', 'btn-danger', 'btn-primary', 'btn-success');
        endBtn.setAttribute('type', 'button');
    }
}

// Expose a function that computes score (so End Exam could call it if needed)
function calculateScore() {
    let correct = 0;
    let attempted = 0;
    userAnswers.forEach((ans, i) => {
        if (ans !== null && quizQuestions[i]) {
            attempted++;
            if (typeof quizQuestions[i].correct === 'number' && ans === quizQuestions[i].correct) correct++;
        }
    });
    return { score: correct, total: 15, attempted };
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startBtn');
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const endBtn = document.getElementById('end-exam-btn');

    // Option change listener (for real-time save on select)
    const optionsContainer = document.getElementById('options');
    if (optionsContainer) {
        optionsContainer.addEventListener('change', (e) => {
            if (e.target && e.target.name === 'answer') saveAnswer();
        });
    }

    // Enhance UI (minimal top-right toggle + end button styling)
    enhanceThemeAndEndButtonUI();

    // Theme init
    initThemeFromStorage();

    if (startBtn) {
        startBtn.addEventListener('click', async () => {
            // Load questions asynchronously
            const loadedQuestions = await loadQuestions();
            if (loadedQuestions.length === 0) {
                return;
            }

            quizQuestions = selectQuestions(loadedQuestions);
            currentIndex = 0;
            userAnswers = new Array(15).fill(null);
            timeLeft = 1800;
            const startSection = document.getElementById('start');
            const quizSection = document.getElementById('quiz');
            if (startSection) startSection.classList.add('d-none');
            if (quizSection) quizSection.classList.remove('d-none');
            loadQuestion();
            startTimer();

            // Ensure start button cannot be restarted mid-quiz
            startBtn.disabled = true;
        });
    }

    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (prevBtn) prevBtn.addEventListener('click', prevQuestion);
    if (submitBtn) submitBtn.addEventListener('click', submitTest);

    if (endBtn) endBtn.addEventListener('click', endExam);

    // Expose functions on window for debugging or integration with other scripts
    window.endExamNow = endExam;
    window.applyExamTheme = applyTheme;
    window.calculateScore = calculateScore;
});