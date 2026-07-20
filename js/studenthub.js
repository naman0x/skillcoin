// ==========================================
// SKILLCOIN — StudentHub Logic
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

console.log("🎓 studenthub.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;
let pomodoroInterval = null;
let pomodoroTime = 25 * 60;
let pomodoroRunning = false;
let currentPomodoroMode = 'focus';

const QUOTES = [
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Self-belief and hard work will always earn you success.", author: "Virat Kohli 🏏" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Anonymous" },
  { text: "Great things never come from comfort zones.", author: "Anonymous" },
  { text: "Dream bigger. Do bigger.", author: "Anonymous" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "George Lorimer" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "Chase the vision, not the money.", author: "Tony Hsieh" }
];

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initTools();
  initModal();
  initQuote();
  initSearch();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      hideLoader();
    } else {
      window.location.href = 'login.html';
    }
  });
});

async function loadUserData() {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;
    userData = userSnap.data();
    const name = userData.name || 'Learner';
    const initial = name.charAt(0).toUpperCase();
    setText('sidebarName', name);
    setText('sidebarInitial', initial);
    setText('sidebarLevel', `Level ${userData.level || 1}`);
    setText('topInitial', initial);
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    setText('coinAmount', isAdmin ? '∞' : formatNumber(userData.skillCoins || 0));
  } catch (err) { console.error(err); }
}

// ==========================================
// TOOLS
// ==========================================

function initTools() {
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      const tool = card.getAttribute('data-tool');
      openTool(tool);
    });
  });
}

function initSearch() {
  const search = document.getElementById('toolSearch');
  if (!search) return;
  search.addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('.tool-card').forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(q) ? 'block' : 'none';
    });
  });
}

// ==========================================
// MODAL
// ==========================================

function initModal() {
  document.getElementById('closeToolModal')?.addEventListener('click', closeModal);
  document.getElementById('toolModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'toolModal') closeModal();
  });
}

function closeModal() {
  const modal = document.getElementById('toolModal');
  if (modal) modal.classList.remove('active');
  if (pomodoroInterval) {
    clearInterval(pomodoroInterval);
    pomodoroInterval = null;
    pomodoroRunning = false;
  }
}

function openTool(tool) {
  const modal = document.getElementById('toolModal');
  const body = document.getElementById('toolModalBody');
  if (!modal || !body) return;

  switch (tool) {
    case 'pomodoro': body.innerHTML = pomodoroTemplate(); initPomodoro(); break;
    case 'gpa': body.innerHTML = gpaTemplate(); initGPA(); break;
    case 'percentage': body.innerHTML = percentageTemplate(); initPercentage(); break;
    case 'age': body.innerHTML = ageTemplate(); initAge(); break;
    case 'unit': body.innerHTML = unitTemplate(); initUnit(); break;
    case 'word': body.innerHTML = wordTemplate(); initWord(); break;
    case 'calc': body.innerHTML = calcTemplate(); initCalc(); break;
    case 'notes': body.innerHTML = notesTemplate(); initNotes(); break;
  }

  modal.classList.add('active');
}

// ==========================================
// POMODORO
// ==========================================

function pomodoroTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon red"><i class="fas fa-stopwatch"></i></div>
      <h2>Pomodoro Timer 🍅</h2>
      <p>Focus 25 mins, break 5 mins. Repeat!</p>
    </div>
    <div class="pomodoro-display">
      <div class="pomodoro-time" id="pomodoroTime">25:00</div>
      <div class="pomodoro-label" id="pomodoroLabel">Focus Time</div>
    </div>
    <div class="pomodoro-controls">
      <button class="pom-btn start" id="pomStart"><i class="fas fa-play"></i> Start</button>
      <button class="pom-btn pause" id="pomPause" style="display:none;"><i class="fas fa-pause"></i> Pause</button>
      <button class="pom-btn reset" id="pomReset"><i class="fas fa-redo"></i> Reset</button>
    </div>
    <div class="pomodoro-modes">
      <button class="pom-mode active" data-mode="focus">🎯 Focus (25m)</button>
      <button class="pom-mode" data-mode="short">☕ Short (5m)</button>
      <button class="pom-mode" data-mode="long">🌴 Long (15m)</button>
    </div>
  `;
}

function initPomodoro() {
  pomodoroTime = 25 * 60;
  currentPomodoroMode = 'focus';
  updatePomodoroDisplay();

  document.getElementById('pomStart')?.addEventListener('click', startPomodoro);
  document.getElementById('pomPause')?.addEventListener('click', pausePomodoro);
  document.getElementById('pomReset')?.addEventListener('click', resetPomodoro);

  document.querySelectorAll('.pom-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pom-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      currentPomodoroMode = mode;
      pomodoroTime = mode === 'focus' ? 25 * 60 : mode === 'short' ? 5 * 60 : 15 * 60;
      resetPomodoro();
    });
  });
}

function startPomodoro() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;
  document.getElementById('pomStart').style.display = 'none';
  document.getElementById('pomPause').style.display = 'inline-flex';
  pomodoroInterval = setInterval(() => {
    pomodoroTime--;
    updatePomodoroDisplay();
    if (pomodoroTime <= 0) {
      clearInterval(pomodoroInterval);
      pomodoroRunning = false;
      showToast('success', '🎉 Time Up!', 'Great job! Take a break!');
      resetPomodoro();
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  document.getElementById('pomStart').style.display = 'inline-flex';
  document.getElementById('pomPause').style.display = 'none';
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  pomodoroRunning = false;
  pomodoroTime = currentPomodoroMode === 'focus' ? 25 * 60 : currentPomodoroMode === 'short' ? 5 * 60 : 15 * 60;
  updatePomodoroDisplay();
  const startBtn = document.getElementById('pomStart');
  const pauseBtn = document.getElementById('pomPause');
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (pauseBtn) pauseBtn.style.display = 'none';
}

function updatePomodoroDisplay() {
  const mins = Math.floor(pomodoroTime / 60);
  const secs = pomodoroTime % 60;
  setText('pomodoroTime', `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`);
  setText('pomodoroLabel', currentPomodoroMode === 'focus' ? '🎯 Focus Time' : currentPomodoroMode === 'short' ? '☕ Short Break' : '🌴 Long Break');
}

// ==========================================
// GPA CALCULATOR
// ==========================================

function gpaTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon purple"><i class="fas fa-chart-line"></i></div>
      <h2>GPA Calculator 📊</h2>
      <p>Calculate your Grade Point Average</p>
    </div>
    <div class="tool-form">
      <div class="gpa-subjects" id="gpaSubjects"></div>
      <button class="gpa-add" id="gpaAdd"><i class="fas fa-plus"></i> Add Subject</button>
      <button class="tool-btn" id="gpaCalc"><i class="fas fa-calculator"></i> Calculate GPA</button>
      <div class="tool-result" id="gpaResult" style="display:none;">
        <div class="tool-result-label">Your GPA</div>
        <div class="tool-result-value" id="gpaValue">0.00</div>
      </div>
    </div>
  `;
}

function initGPA() {
  addGPARow(); addGPARow(); addGPARow();
  document.getElementById('gpaAdd')?.addEventListener('click', addGPARow);
  document.getElementById('gpaCalc')?.addEventListener('click', calculateGPA);
}

function addGPARow() {
  const container = document.getElementById('gpaSubjects');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'gpa-row';
  row.innerHTML = `
    <input type="text" placeholder="Subject" class="tool-input"/>
    <input type="number" placeholder="Credits" min="1" max="10" value="3" class="tool-input"/>
    <select class="tool-input">
      <option value="4.0">A (4.0)</option>
      <option value="3.7">A- (3.7)</option>
      <option value="3.3">B+ (3.3)</option>
      <option value="3.0">B (3.0)</option>
      <option value="2.7">B- (2.7)</option>
      <option value="2.3">C+ (2.3)</option>
      <option value="2.0">C (2.0)</option>
      <option value="1.0">D (1.0)</option>
      <option value="0.0">F (0.0)</option>
    </select>
    <button class="gpa-remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(row);
}

function calculateGPA() {
  const rows = document.querySelectorAll('.gpa-row');
  let totalPoints = 0, totalCredits = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input, select');
    const credits = parseFloat(inputs[1].value) || 0;
    const grade = parseFloat(inputs[2].value) || 0;
    totalPoints += credits * grade;
    totalCredits += credits;
  });
  const gpa = totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : 0;
  document.getElementById('gpaResult').style.display = 'block';
  setText('gpaValue', gpa);
}

// ==========================================
// PERCENTAGE
// ==========================================

function percentageTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon gold"><i class="fas fa-percent"></i></div>
      <h2>Percentage Calculator 💯</h2>
      <p>Calculate marks percentage</p>
    </div>
    <div class="tool-form">
      <div class="tool-input-row">
        <div class="tool-input-group">
          <label>Marks Obtained</label>
          <input type="number" id="pctObtained" placeholder="e.g. 450"/>
        </div>
        <div class="tool-input-group">
          <label>Total Marks</label>
          <input type="number" id="pctTotal" placeholder="e.g. 500"/>
        </div>
      </div>
      <button class="tool-btn" id="pctCalc"><i class="fas fa-percent"></i> Calculate</button>
      <div class="tool-result" id="pctResult" style="display:none;">
        <div class="tool-result-label">Your Percentage</div>
        <div class="tool-result-value" id="pctValue">0%</div>
      </div>
    </div>
  `;
}

function initPercentage() {
  document.getElementById('pctCalc')?.addEventListener('click', () => {
    const obtained = parseFloat(document.getElementById('pctObtained').value) || 0;
    const total = parseFloat(document.getElementById('pctTotal').value) || 0;
    if (total === 0) return showToast('error', 'Error!', 'Total marks cannot be 0');
    const pct = ((obtained / total) * 100).toFixed(2);
    document.getElementById('pctResult').style.display = 'block';
    setText('pctValue', `${pct}%`);
  });
}

// ==========================================
// AGE CALCULATOR
// ==========================================

function ageTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon teal"><i class="fas fa-birthday-cake"></i></div>
      <h2>Age Calculator 🎂</h2>
      <p>Calculate your exact age</p>
    </div>
    <div class="tool-form">
      <div class="tool-input-group">
        <label>Your Date of Birth</label>
        <input type="date" id="ageDob"/>
      </div>
      <button class="tool-btn" id="ageCalc"><i class="fas fa-calculator"></i> Calculate Age</button>
      <div class="tool-result" id="ageResult" style="display:none;">
        <div class="tool-result-label">Your Age</div>
        <div class="tool-result-value" id="ageValue">--</div>
      </div>
    </div>
  `;
}

function initAge() {
  document.getElementById('ageCalc')?.addEventListener('click', () => {
    const dob = document.getElementById('ageDob').value;
    if (!dob) return showToast('error', 'Error!', 'Please select your date of birth');
    const birth = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    if (days < 0) { months--; days += 30; }
    if (months < 0) { years--; months += 12; }
    document.getElementById('ageResult').style.display = 'block';
    setText('ageValue', `${years}y ${months}m ${days}d`);
  });
}

// ==========================================
// UNIT CONVERTER
// ==========================================

function unitTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon blue"><i class="fas fa-ruler-combined"></i></div>
      <h2>Unit Converter 📏</h2>
      <p>Convert between different units</p>
    </div>
    <div class="tool-form">
      <div class="tool-input-group">
        <label>Category</label>
        <select id="unitCat">
          <option value="length">📏 Length</option>
          <option value="weight">⚖️ Weight</option>
          <option value="temp">🌡️ Temperature</option>
        </select>
      </div>
      <div class="tool-input-row">
        <div class="tool-input-group">
          <label>From</label>
          <select id="unitFrom"></select>
          <input type="number" id="unitFromVal" placeholder="Value"/>
        </div>
        <div class="tool-input-group">
          <label>To</label>
          <select id="unitTo"></select>
          <input type="number" id="unitToVal" readonly/>
        </div>
      </div>
      <button class="tool-btn" id="unitCalc"><i class="fas fa-exchange-alt"></i> Convert</button>
    </div>
  `;
}

function initUnit() {
  const units = {
    length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254, mile: 1609.34 },
    weight: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495 },
    temp: {} // special
  };
  const labels = {
    length: { m: 'Meter', km: 'Kilometer', cm: 'Centimeter', mm: 'Millimeter', ft: 'Feet', in: 'Inch', mile: 'Mile' },
    weight: { kg: 'Kilogram', g: 'Gram', mg: 'Milligram', lb: 'Pound', oz: 'Ounce' },
    temp: { c: 'Celsius', f: 'Fahrenheit', k: 'Kelvin' }
  };
  
  function updateUnits() {
    const cat = document.getElementById('unitCat').value;
    const from = document.getElementById('unitFrom');
    const to = document.getElementById('unitTo');
    from.innerHTML = to.innerHTML = '';
    Object.keys(labels[cat]).forEach(k => {
      from.innerHTML += `<option value="${k}">${labels[cat][k]}</option>`;
      to.innerHTML += `<option value="${k}">${labels[cat][k]}</option>`;
    });
    to.selectedIndex = 1;
  }
  
  document.getElementById('unitCat').addEventListener('change', updateUnits);
  updateUnits();
  
  document.getElementById('unitCalc').addEventListener('click', () => {
    const cat = document.getElementById('unitCat').value;
    const from = document.getElementById('unitFrom').value;
    const to = document.getElementById('unitTo').value;
    const val = parseFloat(document.getElementById('unitFromVal').value) || 0;
    let result;
    if (cat === 'temp') {
      let celsius = from === 'c' ? val : from === 'f' ? (val - 32) * 5/9 : val - 273.15;
      result = to === 'c' ? celsius : to === 'f' ? celsius * 9/5 + 32 : celsius + 273.15;
    } else {
      result = (val * units[cat][from]) / units[cat][to];
    }
    document.getElementById('unitToVal').value = result.toFixed(4);
  });
}

// ==========================================
// WORD COUNTER
// ==========================================

function wordTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon green"><i class="fas fa-font"></i></div>
      <h2>Word Counter 📝</h2>
      <p>Count words, characters, paragraphs</p>
    </div>
    <div class="tool-form">
      <div class="tool-input-group">
        <label>Type or paste your text</label>
        <textarea id="wordText" rows="6" placeholder="Start typing..."></textarea>
      </div>
      <div class="word-stats">
        <div class="word-stat"><span class="word-stat-value" id="wordWords">0</span><span class="word-stat-label">Words</span></div>
        <div class="word-stat"><span class="word-stat-value" id="wordChars">0</span><span class="word-stat-label">Characters</span></div>
        <div class="word-stat"><span class="word-stat-value" id="wordSentences">0</span><span class="word-stat-label">Sentences</span></div>
        <div class="word-stat"><span class="word-stat-value" id="wordParas">0</span><span class="word-stat-label">Paragraphs</span></div>
      </div>
    </div>
  `;
}

function initWord() {
  const text = document.getElementById('wordText');
  text?.addEventListener('input', () => {
    const t = text.value;
    setText('wordChars', t.length);
    setText('wordWords', t.trim() ? t.trim().split(/\s+/).length : 0);
    setText('wordSentences', t.trim() ? t.split(/[.!?]+/).filter(s => s.trim()).length : 0);
    setText('wordParas', t.trim() ? t.split(/\n+/).filter(p => p.trim()).length : 0);
  });
}

// ==========================================
// CALCULATOR
// ==========================================

function calcTemplate() {
  const btns = ['C','(',')','/','sin','7','8','9','*','cos','4','5','6','-','tan','1','2','3','+','log','0','.','^','=','√'];
  return `
    <div class="tool-header-modal">
      <div class="tool-icon pink"><i class="fas fa-calculator"></i></div>
      <h2>Scientific Calculator 🧮</h2>
      <p>Advanced calculations</p>
    </div>
    <div class="calc-display" id="calcDisplay">0</div>
    <div class="calc-buttons">
      ${btns.map(b => {
        let cls = 'calc-btn';
        if (['C'].includes(b)) cls += ' clear';
        else if (['=','√'].includes(b)) cls += ' op';
        else if (['+','-','*','/','(',')','^','sin','cos','tan','log'].includes(b)) cls += ' op';
        if (b === '=') cls += ' equals';
        return `<button class="${cls}" data-val="${b}">${b}</button>`;
      }).join('')}
    </div>
  `;
}

function initCalc() {
  let expr = '';
  const display = document.getElementById('calcDisplay');
  document.querySelectorAll('.calc-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.getAttribute('data-val');
      if (val === 'C') { expr = ''; display.textContent = '0'; }
      else if (val === '=') {
        try {
          let e = expr
            .replace(/\^/g, '**')
            .replace(/sin/g, 'Math.sin')
            .replace(/cos/g, 'Math.cos')
            .replace(/tan/g, 'Math.tan')
            .replace(/log/g, 'Math.log10')
            .replace(/√/g, 'Math.sqrt');
          const result = eval(e);
          display.textContent = result;
          expr = String(result);
        } catch { display.textContent = 'Error'; expr = ''; }
      } else if (['sin','cos','tan','log','√'].includes(val)) {
        expr += val + '(';
        display.textContent = expr;
      } else {
        expr += val;
        display.textContent = expr;
      }
    });
  });
}

// ==========================================
// NOTES
// ==========================================

function notesTemplate() {
  return `
    <div class="tool-header-modal">
      <div class="tool-icon orange"><i class="fas fa-sticky-note"></i></div>
      <h2>Quick Notes 📓</h2>
      <p>Saved to your cloud automatically</p>
    </div>
    <div class="tool-form">
      <div class="tool-input-group">
        <label>Add new note</label>
        <textarea id="noteInput" rows="3" placeholder="Type your note..."></textarea>
      </div>
      <button class="tool-btn" id="noteAdd"><i class="fas fa-save"></i> Save Note</button>
      <div style="margin-top:16px;">
        <label style="color:var(--text-muted);font-size:0.85rem;margin-bottom:10px;display:block;">Your Notes</label>
        <div class="notes-list" id="notesList"></div>
      </div>
    </div>
  `;
}

function initNotes() {
  renderNotes();
  document.getElementById('noteAdd')?.addEventListener('click', async () => {
    const input = document.getElementById('noteInput');
    const text = input.value.trim();
    if (!text) return showToast('error', 'Empty!', 'Please type something');
    const notes = userData.quickNotes || [];
    notes.unshift({ text, time: Date.now() });
    userData.quickNotes = notes;
    await setDoc(doc(db, 'users', currentUser.uid), { quickNotes: notes }, { merge: true });
    input.value = '';
    renderNotes();
    showToast('success', '✅ Saved!', 'Note saved to cloud');
  });
}

function renderNotes() {
  const list = document.getElementById('notesList');
  if (!list) return;
  const notes = userData.quickNotes || [];
  if (notes.length === 0) {
    list.innerHTML = '<div class="no-notes">No notes yet. Add your first note above!</div>';
    return;
  }
  list.innerHTML = notes.map((n, i) => `
    <div class="note-item">
      <span class="note-item-text">${escapeHtml(n.text)}</span>
      <button class="note-delete" onclick="window.deleteNote(${i})"><i class="fas fa-trash"></i></button>
    </div>
  `).join('');
}

window.deleteNote = async function(index) {
  const notes = userData.quickNotes || [];
  notes.splice(index, 1);
  userData.quickNotes = notes;
  await setDoc(doc(db, 'users', currentUser.uid), { quickNotes: notes }, { merge: true });
  renderNotes();
};

// ==========================================
// QUOTE
// ==========================================

function initQuote() {
  showRandomQuote();
  document.getElementById('refreshQuote')?.addEventListener('click', showRandomQuote);
}

function showRandomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  setText('dailyQuote', `"${q.text}"`);
  setText('quoteAuthor', `— ${q.author}`);
}

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function initSidebar() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (menuToggle) menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
  });
  if (overlay) overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
  });
}

function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    if (!confirm('Logout?')) return;
    await signOut(auth);
    localStorage.removeItem('skillcoin_user');
    window.location.href = 'login.html';
  });
}

function hideLoader() {
  const loader = document.getElementById('dashboardLoader');
  if (loader) { loader.classList.add('hidden'); setTimeout(() => loader.remove(), 400); }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function initToasts() {
  if (!document.querySelector('.toast-container')) {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
}

function showToast(type, title, message, duration = 4000) {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', coin: 'fa-coins' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas ${icons[type] || icons.info}"></i></div>
    <div class="toast-content">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.showToast = showToast;
