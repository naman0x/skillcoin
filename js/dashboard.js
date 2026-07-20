// ==========================================
// SKILLCOIN - Dashboard Logic
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

console.log("🎨 dashboard.js loaded!");

// Global user data
let currentUser = null;
let userData = null;

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Dashboard page loaded");

  initToasts();
  initSidebar();
  initLogout();

  // Wait for Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("👤 User authenticated:", user.email);
      currentUser = user;
      await loadUserData();
    } else {
      console.log("❌ No user, redirecting to login...");
      window.location.href = 'login.html';
    }
  });
});

// ==========================================
// LOAD USER DATA FROM FIRESTORE
// ==========================================

async function loadUserData() {
  try {
    console.log("📥 Loading user data from Firestore...");

    const userRef = doc(db, 'users', currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error("❌ User document doesn't exist!");
      showToast('error', 'Error!', 'User data not found');
      return;
    }

    userData = userSnap.data();
    console.log("✅ User data loaded:", userData);

    // Handle daily login reward
    await handleDailyLogin();

    // Update UI
    updateDashboardUI();

    // Hide loading screen
    setTimeout(() => {
      hideLoader();
    }, 800);

  } catch (error) {
    console.error("❌ Error loading data:", error);
    showToast('error', 'Error!', 'Could not load your data');
    hideLoader();
  }
}

// ==========================================
// UPDATE DASHBOARD UI
// ==========================================

function updateDashboardUI() {
  console.log("🎨 Updating UI with user data...");

  const name = userData.name || 'Learner';
  const firstName = name.split(' ')[0];
  const initial = name.charAt(0).toUpperCase();

  // Sidebar
  setText('sidebarName', name);
  setText('sidebarLevel', `Level ${userData.level || 1}`);
  setText('sidebarInitial', initial);

  // Top Bar
  setText('coinAmount', formatNumber(userData.skillCoins || 0));
  setText('topInitial', initial);

  // Welcome Section
  setText('welcomeName', firstName);
  setText('welcomeStreak', `${userData.streak || 0} Day Streak`);
  setText('welcomeMessage', getWelcomeMessage());

  // Level Progress
  const level = userData.level || 1;
  const xp = userData.xp || 0;
  const currentLevelXP = (level - 1) * 500;
  const nextLevelXP = level * 500;
  const progressXP = xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const percentage = (progressXP / neededXP) * 100;

  setText('levelNumber', level);
  setText('currentXP', progressXP);
  setText('neededXP', neededXP);
  
  const levelFill = document.getElementById('levelFill');
  if (levelFill) levelFill.style.width = percentage + '%';

  // Stats Cards
  setText('statCoins', formatNumber(userData.skillCoins || 0));
  setText('statCourses', userData.completedCourses?.length || 0);
  setText('statStreak', `${userData.streak || 0} days`);
  setText('statRank', userData.rank ? `#${userData.rank}` : '#---');

  // Streak Card
  setText('streakDays', userData.streak || 0);
  const todayReward = calculateDailyReward(userData.streak || 1);
  setText('todayReward', `+${todayReward} 🪙`);

  console.log("✅ UI updated!");
}

// ==========================================
// HANDLE DAILY LOGIN REWARD
// ==========================================

async function handleDailyLogin() {
  try {
    const today = new Date().toDateString();
    const lastLogin = userData.lastLoginDate || '';

    // Already logged in today? Skip.
    if (lastLogin === today) {
      console.log("✅ Already logged in today");
      return;
    }

    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let newStreak = 1;
    if (lastLogin === yesterdayStr) {
      // Continued streak
      newStreak = (userData.streak || 0) + 1;
    } else if (lastLogin === '') {
      // First login ever
      newStreak = 1;
    } else {
      // Streak broken
      newStreak = 1;
    }

    // Calculate reward
    const dailyReward = calculateDailyReward(newStreak);
    const newCoins = (userData.skillCoins || 0) + dailyReward;
    const newTotalEarned = (userData.totalCoinsEarned || 0) + dailyReward;

    // Update Firestore
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      lastLoginDate: today,
      streak: newStreak,
      skillCoins: newCoins,
      totalCoinsEarned: newTotalEarned,
      lastSeen: serverTimestamp()
    }, { merge: true });

    // Update local data
    userData.streak = newStreak;
    userData.skillCoins = newCoins;
    userData.lastLoginDate = today;
    userData.totalCoinsEarned = newTotalEarned;

    console.log(`✅ Daily reward: +${dailyReward} coins (Day ${newStreak} streak)`);

    // Show popup after loader hides
    setTimeout(() => {
      showDailyRewardPopup(dailyReward, newStreak);
    }, 1500);

  } catch (error) {
    console.error("❌ Daily login error:", error);
  }
}

// ==========================================
// DAILY REWARD POPUP
// ==========================================

function showDailyRewardPopup(reward, streak) {
  showToast(
    'coin',
    `🔥 Day ${streak} Streak!`,
    `You earned +${reward} SkillCoins! Come back tomorrow for more!`,
    6000
  );

  // Animate coin count
  animateCoinCount(reward);
}

// ==========================================
// ANIMATE COIN COUNT
// ==========================================

function animateCoinCount(addAmount) {
  const coinEl = document.getElementById('coinAmount');
  const statCoinsEl = document.getElementById('statCoins');
  if (!coinEl) return;

  const currentCoins = userData.skillCoins - addAmount;
  const newCoins = userData.skillCoins;
  const duration = 1500;
  const startTime = Date.now();

  function updateCount() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(currentCoins + (addAmount * easeProgress));

    coinEl.textContent = formatNumber(value);
    if (statCoinsEl) statCoinsEl.textContent = formatNumber(value);

    if (progress < 1) {
      requestAnimationFrame(updateCount);
    }
  }

  requestAnimationFrame(updateCount);
}

// ==========================================
// SIDEBAR
// ==========================================

function initSidebar() {
  const menuToggle = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      overlay.classList.toggle('active');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('active');
      overlay.classList.remove('active');
    });
  }
}

// ==========================================
// LOGOUT
// ==========================================

function initLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to logout?')) return;

    try {
      console.log("🚪 Logging out...");
      await signOut(auth);
      localStorage.removeItem('skillcoin_user');
      showToast('success', 'Logged out!', 'See you soon 👋');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    } catch (error) {
      console.error("❌ Logout error:", error);
      showToast('error', 'Error!', 'Failed to logout');
    }
  });
}

// ==========================================
// WELCOME MESSAGE (Time based)
// ==========================================

function getWelcomeMessage() {
  const hour = new Date().getHours();
  const streak = userData.streak || 0;
  const coins = userData.skillCoins || 0;

  const morningMsgs = [
    "Good morning! Start earning coins today 🌅",
    "Rise and grind! Let's earn some SkillCoins ☕",
    "A new day, new coins to earn! 🌞"
  ];

  const afternoonMsgs = [
    "Ready to earn more SkillCoins today?",
    "Great time to complete a mission! 💪",
    "Keep up the amazing work! ✨"
  ];

  const eveningMsgs = [
    "Evening productivity session? 🌙",
    "Last few coins before bed? 🎯",
    "Don't break your streak tonight! 🔥"
  ];

  let messages = afternoonMsgs;
  if (hour < 12) messages = morningMsgs;
  else if (hour >= 18) messages = eveningMsgs;

  return messages[Math.floor(Math.random() * messages.length)];
}

// ==========================================
// HIDE LOADER
// ==========================================

function hideLoader() {
  const loader = document.getElementById('dashboardLoader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 400);
  }
}

// ==========================================
// HELPERS
// ==========================================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function calculateDailyReward(streak) {
  if (streak <= 7) return 50 + (5 * streak);
  else if (streak <= 30) return 50 + (4 * streak);
  else if (streak <= 100) return 50 + (3 * streak);
  else return 350;
}

// ==========================================
// TOAST SYSTEM
// ==========================================

function initToasts() {
  if (!document.querySelector('.toast-container')) {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
}

function showToast(type, title, message, duration = 4000) {
  const container = document.querySelector('.toast-container');
  if (!container) return;

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    info: 'fa-info-circle',
    coin: 'fa-coins'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas ${icons[type] || icons.info}"></i>
    </div>
    <div class="toast-content">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.showToast = showToast;
