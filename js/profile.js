// ==========================================
// SKILLCOIN — Profile Logic
// ==========================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  collection,
  getDocs
} from './firebase-config.js';

console.log("👤 profile.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;

// ==========================================
// ALL BADGES DEFINITION
// ==========================================

const ALL_BADGES = [
  { id: 'first_login', emoji: '🎉', name: 'Welcome!' },
  { id: 'week_warrior', emoji: '🔥', name: '7 Day Streak' },
  { id: 'monthly_master', emoji: '👑', name: '30 Day Streak' },
  { id: 'first_course', emoji: '📚', name: 'First Course' },
  { id: 'scholar', emoji: '🎓', name: '5 Courses Done' },
  { id: 'expert', emoji: '💎', name: '10 Courses Done' },
  { id: 'coin_collector', emoji: '🪙', name: '1k Coins' },
  { id: 'coin_hoarder', emoji: '💰', name: '5k Coins' },
  { id: 'creator', emoji: '✍️', name: 'First Upload' },
  { id: 'teacher', emoji: '👨‍🏫', name: '5 Uploads' },
  { id: 'entrepreneur', emoji: '💼', name: 'First Sale' },
  { id: 'quiz_master', emoji: '🧠', name: 'Quiz Master' }
];

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initShare();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      renderProfile();
      await loadCourses();
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
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// RENDER PROFILE
// ==========================================

function renderProfile() {
  const isAdmin = currentUser.email === ADMIN_EMAIL;
  const name = userData.name || 'User';
  const initial = name.charAt(0).toUpperCase();
  
  // Hero
  setText('profileName', name);
  setText('profileInitial', initial);
  setText('profileLevel', userData.level || 1);
  setText('profileEmail', currentUser.email);
  setText('profileStreak', userData.streak || 0);
  setText('profileReferral', userData.referralCode || 'N/A');
  
  // Custom bio for admin (you!)
  if (isAdmin) {
    setText('profileBio', "Yo! I'm Naman 👋 | 15-year-old chaos coder from Mathura 🇮🇳 | Building SkillCoin between cricket sessions 🏏 | Kohli fan for life 👑 | Turning caffeine into code ☕💻");
    document.getElementById('verifiedBadge').style.display = 'inline-flex';
    document.getElementById('profileAvatar')?.classList.add('admin-avatar');
  } else {
    const bios = [
      "Learning something new every day! 🚀",
      "Grinding for those SkillCoins 💰",
      "Just a learner earning knowledge ✨",
      "On my way to becoming a legend 🏆",
      "Coding my way to the top 💻"
    ];
    setText('profileBio', bios[Math.floor(Math.random() * bios.length)]);
  }
  
  // Joined date
  if (userData.joinedDate) {
    const date = userData.joinedDate.toDate ? userData.joinedDate.toDate() : new Date(userData.joinedDate);
    const formatted = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    setText('profileJoined', formatted);
    setText('aboutJoined', formatted);
  } else {
    setText('profileJoined', 'Recently');
    setText('aboutJoined', 'Recently');
  }
  
  // XP Progress
  const xp = userData.xp || 0;
  const level = userData.level || 1;
  const currentLevelXP = (level - 1) * 500;
  const nextLevelXP = level * 500;
  const progressXP = xp - currentLevelXP;
  const neededXP = nextLevelXP - currentLevelXP;
  const percentage = (progressXP / neededXP) * 100;
  
  setText('profileXP', progressXP);
  setText('profileXPNeeded', neededXP);
  const xpFill = document.getElementById('profileXPFill');
  if (xpFill) xpFill.style.width = percentage + '%';
  
  // Stats
  setText('statsBalance', isAdmin ? '∞' : formatNumber(userData.skillCoins || 0));
  setText('statsEarned', formatNumber(userData.totalCoinsEarned || 0));
  setText('statsSpent', formatNumber(userData.totalCoinsSpent || 0));
  setText('statsCompleted', userData.completedCourses?.length || 0);
  setText('statsUploaded', userData.uploadedCourses?.length || 0);
  setText('statsBadges', userData.badges?.length || 0);
  
  // About
  setText('aboutUsername', name);
  setText('aboutEmail', currentUser.email);
  setText('aboutLevel', userData.level || 1);
  setText('aboutStreak', `${userData.streak || 0} days`);
  setText('aboutReferral', userData.referralCode || 'N/A');
  
  // Badges
  renderBadges();
  
  // Activity
  renderActivity();
}

function renderBadges() {
  const grid = document.getElementById('badgesGrid');
  if (!grid) return;
  
  const earned = userData.badges || [];
  setText('badgeCountText', `${earned.length} earned`);
  
  grid.innerHTML = ALL_BADGES.map(badge => {
    const isEarned = earned.includes(badge.id);
    return `
      <div class="badge-item ${isEarned ? 'earned' : 'locked'}" title="${badge.name}">
        <span class="badge-emoji">${badge.emoji}</span>
        <span class="badge-name">${badge.name}</span>
      </div>
    `;
  }).join('');
}

function renderActivity() {
  const timeline = document.getElementById('activityTimeline');
  if (!timeline) return;
  
  const activities = [];
  
  if (userData.badges?.length > 0) {
    activities.push({
      icon: 'fas fa-medal',
      title: `Earned ${userData.badges.length} badge${userData.badges.length > 1 ? 's' : ''}`,
      time: 'Recently'
    });
  }
  
  if (userData.completedCourses?.length > 0) {
    activities.push({
      icon: 'fas fa-check-circle',
      title: `Completed ${userData.completedCourses.length} course${userData.completedCourses.length > 1 ? 's' : ''}`,
      time: 'Recently'
    });
  }
  
  if (userData.uploadedCourses?.length > 0) {
    activities.push({
      icon: 'fas fa-upload',
      title: `Uploaded ${userData.uploadedCourses.length} course${userData.uploadedCourses.length > 1 ? 's' : ''}`,
      time: 'Recently'
    });
  }
  
  activities.push({
    icon: 'fas fa-coins',
    title: `Total earned: ${formatNumber(userData.totalCoinsEarned || 0)} coins`,
    time: 'Lifetime'
  });
  
  activities.push({
    icon: 'fas fa-fire',
    title: `${userData.streak || 0} day login streak`,
    time: 'Currently'
  });
  
  activities.push({
    icon: 'fas fa-user-plus',
    title: 'Joined SkillCoin 🎉',
    time: 'Start of journey'
  });
  
  timeline.innerHTML = activities.map(a => `
    <div class="timeline-item">
      <div class="timeline-icon"><i class="${a.icon}"></i></div>
      <div class="timeline-info">
        <span class="timeline-title">${a.title}</span>
        <span class="timeline-time">${a.time}</span>
      </div>
    </div>
  `).join('');
}

// ==========================================
// LOAD COURSES
// ==========================================

async function loadCourses() {
  const list = document.getElementById('myCoursesList');
  if (!list) return;
  
  const uploaded = userData.uploadedCourses || [];
  const purchased = userData.purchasedCourses || [];
  const allCourseIds = [...new Set([...uploaded, ...purchased])];
  
  if (allCourseIds.length === 0) {
    list.innerHTML = `
      <div class="empty-mini">
        <i class="fas fa-book"></i>
        <p>No courses yet. Start exploring!</p>
      </div>
    `;
    return;
  }
  
  try {
    const coursesRef = collection(db, 'courses');
    const snapshot = await getDocs(coursesRef);
    const myCourses = [];
    
    snapshot.forEach(docSnap => {
      if (allCourseIds.includes(docSnap.id)) {
        myCourses.push({ id: docSnap.id, ...docSnap.data() });
      }
    });
    
    if (myCourses.length === 0) {
      list.innerHTML = `<div class="empty-mini"><i class="fas fa-book"></i><p>No courses found</p></div>`;
      return;
    }
    
    list.innerHTML = myCourses.slice(0, 5).map(c => {
      const isUploaded = uploaded.includes(c.id);
      const badge = isUploaded 
        ? '<span class="my-course-badge uploaded">Uploaded</span>' 
        : '<span class="my-course-badge purchased">Enrolled</span>';
      
      return `
        <div class="my-course-item" onclick="window.location.href='course-view.html?id=${c.id}'">
          <div class="my-course-icon ${c.color || 'purple'}">
            <i class="${c.icon || 'fas fa-book'}"></i>
          </div>
          <div class="my-course-info">
            <span class="my-course-title">${escapeHtml(c.title)}</span>
            <span class="my-course-type">${capitalize(c.category || 'Course')}</span>
          </div>
          ${badge}
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="empty-mini"><p>Could not load courses</p></div>`;
  }
}

// ==========================================
// SHARE PROFILE
// ==========================================

function initShare() {
  document.getElementById('shareBtn')?.addEventListener('click', () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `${userData.name}'s SkillCoin Profile`,
        text: `Check out my SkillCoin profile! I'm at Level ${userData.level} with ${userData.skillCoins} coins! 🪙`,
        url: url
      }).catch(() => copyLink(url));
    } else {
      copyLink(url);
    }
  });
}

function copyLink(url) {
  navigator.clipboard.writeText(url).then(() => {
    showToast('success', '🔗 Link Copied!', 'Share it with your friends!');
  }).catch(() => {
    showToast('info', 'Copy this URL', url);
  });
}

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
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
