// ==========================================
// SKILLCOIN — Missions Logic
// ==========================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from './firebase-config.js';

console.log("🎯 missions.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;
let currentTab = 'daily';
let allMissions = {};

// ==========================================
// MISSIONS DATA
// ==========================================

const MISSIONS = {
  daily: [
    { id: 'd_login', icon: 'fas fa-sign-in-alt', color: 'purple', name: 'Daily Login', desc: 'Login to SkillCoin today', reward: 10, target: 1, autoComplete: true },
    { id: 'd_lessons', icon: 'fas fa-book-reader', color: 'teal', name: 'Complete 2 Lessons', desc: 'Finish any 2 lessons today', reward: 30, target: 2 },
    { id: 'd_quiz', icon: 'fas fa-brain', color: 'gold', name: 'Take an AI Quiz', desc: 'Test your knowledge with Skill AI', reward: 20, target: 1 },
    { id: 'd_browse', icon: 'fas fa-search', color: 'blue', name: 'Explore Courses', desc: 'Browse the course library', reward: 10, target: 1, autoComplete: true },
    { id: 'd_ai_chat', icon: 'fas fa-comments', color: 'red', name: 'Chat with Skill AI', desc: 'Have a conversation with AI', reward: 15, target: 1 },
    { id: 'd_review', icon: 'fas fa-star', color: 'green', name: 'Rate a Course', desc: 'Review any course you completed', reward: 15, target: 1 }
  ],
  weekly: [
    { id: 'w_course', icon: 'fas fa-flag-checkered', color: 'purple', name: 'Complete 1 Course', desc: 'Finish any full course this week', reward: 200, target: 1 },
    { id: 'w_streak', icon: 'fas fa-fire', color: 'red', name: '7-Day Streak', desc: 'Maintain login streak of 7 days', reward: 300, target: 7 },
    { id: 'w_upload', icon: 'fas fa-upload', color: 'gold', name: 'Upload a Skill', desc: 'Share your knowledge - upload a course', reward: 500, target: 1 },
    { id: 'w_coins', icon: 'fas fa-coins', color: 'teal', name: 'Earn 500 Coins', desc: 'Earn 500 SkillCoins this week', reward: 200, target: 500 },
    { id: 'w_missions', icon: 'fas fa-tasks', color: 'green', name: 'Complete 5 Daily Missions', desc: 'Finish 5 daily missions in the week', reward: 250, target: 5 }
  ],
  special: [
    { id: 's_first_login', icon: 'fas fa-star', color: 'gold', name: 'First Login', desc: 'Welcome to SkillCoin!', reward: 100, target: 1, autoComplete: true },
    { id: 's_profile', icon: 'fas fa-user-check', color: 'purple', name: 'Complete Your Profile', desc: 'Fill in all profile information', reward: 50, target: 1 },
    { id: 's_first_enroll', icon: 'fas fa-graduation-cap', color: 'teal', name: 'First Enrollment', desc: 'Enroll in your first course', reward: 75, target: 1 },
    { id: 's_first_complete', icon: 'fas fa-trophy', color: 'gold', name: 'First Course Completed', desc: 'Complete your first full course', reward: 150, target: 1 },
    { id: 's_level_5', icon: 'fas fa-shield-alt', color: 'red', name: 'Reach Level 5', desc: 'Level up to level 5', reward: 200, target: 5 },
    { id: 's_level_10', icon: 'fas fa-crown', color: 'gold', name: 'Reach Level 10', desc: 'Become a SkillCoin Master', reward: 500, target: 10 }
  ]
};

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initTabs();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      loadMissions();
      startResetTimer();
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
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    setText('coinAmount', isAdmin ? '∞' : formatNumber(userData.skillCoins || 0));
    setText('topInitial', initial);
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// LOAD MISSIONS
// ==========================================

function loadMissions() {
  const completed = userData.missionsDone || [];
  const today = new Date().toDateString();
  
  // Check daily missions reset
  const lastReset = userData.lastMissionReset;
  if (lastReset !== today) {
    // Reset daily missions in state
    allMissions = {
      daily: MISSIONS.daily.map(m => ({ ...m, progress: getMissionProgress(m, completed, true), completed: false, claimed: false })),
      weekly: MISSIONS.weekly.map(m => ({ ...m, progress: getMissionProgress(m, completed), completed: completed.includes(m.id), claimed: completed.includes(m.id) })),
      special: MISSIONS.special.map(m => ({ ...m, progress: getMissionProgress(m, completed), completed: completed.includes(m.id), claimed: completed.includes(m.id) }))
    };
  } else {
    allMissions = {
      daily: MISSIONS.daily.map(m => ({ ...m, progress: getMissionProgress(m, completed), completed: completed.includes(`${m.id}_${today}`), claimed: completed.includes(`${m.id}_${today}`) })),
      weekly: MISSIONS.weekly.map(m => ({ ...m, progress: getMissionProgress(m, completed), completed: completed.includes(m.id), claimed: completed.includes(m.id) })),
      special: MISSIONS.special.map(m => ({ ...m, progress: getMissionProgress(m, completed), completed: completed.includes(m.id), claimed: completed.includes(m.id) }))
    };
  }

  // Auto-complete missions
  autoCompleteMissions();
  
  // Update stats
  updateStats();
  
  // Render current tab
  renderMissions();
}

function getMissionProgress(mission, completed, isDaily = false) {
  // Real progress based on user data
  const today = new Date().toDateString();
  
  switch(mission.id) {
    case 'd_login':
    case 'd_browse':
    case 's_first_login':
      return 1;
    
    case 'w_streak':
      return userData.streak || 0;
    
    case 's_level_5':
    case 's_level_10':
      return userData.level || 1;
    
    case 'w_course':
    case 's_first_complete':
      return userData.completedCourses?.length || 0;
    
    case 's_first_enroll':
      return userData.purchasedCourses?.length || 0;
    
    case 'w_upload':
      return userData.uploadedCourses?.length || 0;
    
    default:
      return completed.includes(mission.id) || completed.includes(`${mission.id}_${today}`) ? mission.target : 0;
  }
}

async function autoCompleteMissions() {
  const today = new Date().toDateString();
  let completed = userData.missionsDone || [];
  let updated = false;
  
  // Auto-complete simple missions
  const autoMissions = ['d_login', 'd_browse', 's_first_login'];
  for (const id of autoMissions) {
    const key = id.startsWith('d_') ? `${id}_${today}` : id;
    if (!completed.includes(key)) {
      completed.push(key);
      updated = true;
    }
  }
  
  if (updated) {
    userData.missionsDone = completed;
    await setDoc(doc(db, 'users', currentUser.uid), {
      missionsDone: completed,
      lastMissionReset: today
    }, { merge: true });
  }
}

function updateStats() {
  const completed = userData.missionsDone || [];
  const today = new Date().toDateString();
  
  const totalCompleted = completed.length;
  const dailyCompleted = completed.filter(m => m.includes(today)).length;
  
  // Calculate coins from missions (estimate)
  const allMissionsList = [...MISSIONS.daily, ...MISSIONS.weekly, ...MISSIONS.special];
  let coinsEarned = 0;
  completed.forEach(id => {
    const cleanId = id.split('_' + today)[0];
    const mission = allMissionsList.find(m => m.id === cleanId);
    if (mission) coinsEarned += mission.reward;
  });
  
  setText('totalCompleted', totalCompleted);
  setText('totalEarned', coinsEarned);
  setText('dailyCount', `${dailyCompleted}/6`);
  setText('dailyTabCount', MISSIONS.daily.length);
  setText('weeklyTabCount', MISSIONS.weekly.length);
  setText('specialTabCount', MISSIONS.special.length);
}

// ==========================================
// RENDER MISSIONS
// ==========================================

function renderMissions() {
  const container = document.getElementById('missionsContainer');
  if (!container) return;
  
  const missions = allMissions[currentTab] || [];
  
  container.innerHTML = missions.map(m => createMissionCard(m, currentTab)).join('');
  
  // Add claim listeners
  document.querySelectorAll('.mission-claim-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-mission-id');
      claimMission(id);
    });
  });
}

function createMissionCard(mission, type) {
  const isClaimable = mission.progress >= mission.target && !mission.claimed;
  const isDone = mission.claimed;
  const progressPercent = Math.min((mission.progress / mission.target) * 100, 100);
  
  let rewardSection = '';
  if (isDone) {
    rewardSection = `<div class="mission-completed-badge"><i class="fas fa-check"></i> Claimed</div>`;
  } else if (isClaimable) {
    rewardSection = `
      <div class="mission-reward-badge"><i class="fas fa-coins"></i> +${mission.reward}</div>
      <button class="mission-claim-btn" data-mission-id="${mission.id}">
        <i class="fas fa-gift"></i> Claim!
      </button>
    `;
  } else {
    rewardSection = `<div class="mission-reward-badge"><i class="fas fa-coins"></i> +${mission.reward}</div>`;
  }
  
  return `
    <div class="mission-card ${isDone ? 'completed' : ''} ${isClaimable ? 'claimable' : ''}">
      <div class="mission-icon-big ${mission.color}">
        <i class="${mission.icon}"></i>
      </div>
      <div class="mission-details">
        <div class="mission-header">
          <span class="mission-name">${mission.name}</span>
          <span class="mission-type-badge ${type}">${type}</span>
        </div>
        <p class="mission-desc">${mission.desc}</p>
        <div class="mission-progress-wrap">
          <div class="mission-progress-bar">
            <div class="mission-progress-fill ${progressPercent >= 100 ? 'done' : ''}" style="width: ${progressPercent}%"></div>
          </div>
          <span class="mission-progress-text">${Math.min(mission.progress, mission.target)} / ${mission.target}</span>
        </div>
      </div>
      <div class="mission-reward-section">
        ${rewardSection}
      </div>
    </div>
  `;
}

// ==========================================
// CLAIM MISSION
// ==========================================

async function claimMission(missionId) {
  const today = new Date().toDateString();
  const isDaily = MISSIONS.daily.some(m => m.id === missionId);
  const key = isDaily ? `${missionId}_${today}` : missionId;
  
  const allList = [...MISSIONS.daily, ...MISSIONS.weekly, ...MISSIONS.special];
  const mission = allList.find(m => m.id === missionId);
  if (!mission) return;
  
  const completed = userData.missionsDone || [];
  if (completed.includes(key)) {
    showToast('info', 'Already Claimed!', 'You already got this reward!');
    return;
  }
  
  try {
    const isAdmin = currentUser.email === ADMIN_EMAIL;
    completed.push(key);
    
    const updates = { missionsDone: completed };
    
    if (!isAdmin) {
      const newCoins = (userData.skillCoins || 0) + mission.reward;
      const newTotal = (userData.totalCoinsEarned || 0) + mission.reward;
      updates.skillCoins = newCoins;
      updates.totalCoinsEarned = newTotal;
      userData.skillCoins = newCoins;
      setText('coinAmount', formatNumber(newCoins));
    }
    
    userData.missionsDone = completed;
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    
    showToast('coin', `🎉 +${mission.reward} Coins!`, `${mission.name} claimed!`);
    
    loadMissions();
  } catch (err) {
    console.error(err);
    showToast('error', 'Error!', 'Could not claim reward');
  }
}

// ==========================================
// TABS
// ==========================================

function initTabs() {
  document.querySelectorAll('.mission-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.mission-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.getAttribute('data-tab');
      renderMissions();
    });
  });
}

// ==========================================
// RESET TIMER
// ==========================================

function startResetTimer() {
  updateTimer();
  setInterval(updateTimer, 1000);
}

function updateTimer() {
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);
  const diff = tomorrow - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  setText('dailyResetTime', `${hours}h ${mins}m`);
}

// ==========================================
// HELPERS
// ==========================================

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
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 400);
  }
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
