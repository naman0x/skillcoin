// ==========================================
// SKILLCOIN — Settings Logic
// ==========================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateProfile
} from './firebase-config.js';

console.log("⚙️ settings.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initTabs();
  initForms();
  initThemes();

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
    
    // Fill form
    document.getElementById('settingName').value = name;
    document.getElementById('settingEmail').value = currentUser.email;
    document.getElementById('settingBio').value = userData.bio || '';
    setText('bioCount', (userData.bio || '').length);
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// TABS
// ==========================================

function initTabs() {
  document.querySelectorAll('.settings-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const section = item.getAttribute('data-section');
      
      document.querySelectorAll('.settings-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
      const target = document.querySelector(`.settings-section[data-section="${section}"]`);
      if (target) target.classList.add('active');
    });
  });
}

// ==========================================
// FORMS
// ==========================================

function initForms() {
  // Bio counter
  const bio = document.getElementById('settingBio');
  if (bio) {
    bio.addEventListener('input', () => {
      setText('bioCount', bio.value.length);
    });
  }
  
  // Save account
  document.getElementById('saveAccountBtn')?.addEventListener('click', saveAccount);
  
  // Change password
  document.getElementById('changePasswordBtn')?.addEventListener('click', changePassword);
  
  // Save notifications
  document.getElementById('saveNotifBtn')?.addEventListener('click', saveNotifications);
  
  // Danger buttons
  document.getElementById('resetBtn')?.addEventListener('click', resetProgress);
  document.getElementById('deleteAccountBtn')?.addEventListener('click', deleteAccount);
}

async function saveAccount() {
  const name = document.getElementById('settingName').value.trim();
  const bio = document.getElementById('settingBio').value.trim();
  
  if (!name) {
    showToast('error', 'Name Required!', 'Please enter your name');
    return;
  }
  
  try {
    // Update Firebase Auth display name
    await updateProfile(auth.currentUser, { displayName: name });
    
    // Update Firestore
    await setDoc(doc(db, 'users', currentUser.uid), {
      name: name,
      bio: bio
    }, { merge: true });
    
    userData.name = name;
    userData.bio = bio;
    
    showToast('success', '✅ Saved!', 'Your account has been updated');
    
    // Update sidebar
    setText('sidebarName', name);
    setText('sidebarInitial', name.charAt(0).toUpperCase());
    setText('topInitial', name.charAt(0).toUpperCase());
  } catch (err) {
    console.error(err);
    showToast('error', 'Error!', 'Could not save changes');
  }
}

async function changePassword() {
  const current = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  
  if (!current || !newPass || !confirm) {
    showToast('error', 'All Fields Required!', 'Please fill all password fields');
    return;
  }
  
  if (newPass.length < 6) {
    showToast('error', 'Too Short!', 'Password must be at least 6 characters');
    return;
  }
  
  if (newPass !== confirm) {
    showToast('error', 'Mismatch!', 'New passwords do not match');
    return;
  }
  
  showToast('info', 'Coming Soon!', 'Password change will be available soon 🔒');
}

async function saveNotifications() {
  const prefs = {
    daily: document.getElementById('notif_daily').checked,
    coins: document.getElementById('notif_coins').checked,
    courses: document.getElementById('notif_courses').checked,
    missions: document.getElementById('notif_missions').checked,
    leaderboard: document.getElementById('notif_leaderboard').checked
  };
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      notificationPrefs: prefs
    }, { merge: true });
    
    showToast('success', '✅ Saved!', 'Notification preferences updated');
  } catch (err) {
    showToast('error', 'Error!', 'Could not save preferences');
  }
}

// ==========================================
// THEMES
// ==========================================

function initThemes() {
  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const theme = opt.getAttribute('data-theme');
      
      if (theme !== 'dark') {
        showToast('info', '🌙 Coming Soon!', `${theme === 'light' ? 'Light' : 'Auto'} theme coming soon!`);
        return;
      }
      
      document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      showToast('success', '✨ Theme Set!', 'Dark mode activated');
    });
  });
}

// ==========================================
// DANGER
// ==========================================

async function resetProgress() {
  const confirm1 = confirm('⚠️ Are you sure? This will reset ALL your progress!');
  if (!confirm1) return;
  
  const confirm2 = confirm('This CANNOT be undone. Really reset?');
  if (!confirm2) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      skillCoins: 100,
      xp: 0,
      level: 1,
      streak: 0,
      completedCourses: [],
      completedChallenges: [],
      purchasedCourses: [],
      unlockedResources: [],
      missionsDone: [],
      totalCoinsEarned: 100,
      totalCoinsSpent: 0
    }, { merge: true });
    
    showToast('success', '🔄 Reset Complete!', 'Your progress has been reset');
    setTimeout(() => window.location.href = 'dashboard.html', 2000);
  } catch (err) {
    showToast('error', 'Error!', 'Could not reset progress');
  }
}

async function deleteAccount() {
  const confirm1 = confirm('⚠️ DELETE YOUR ACCOUNT?\nAll data will be lost forever!');
  if (!confirm1) return;
  
  const confirm2 = confirm('Type OK in next dialog to confirm');
  if (!confirm2) return;
  
  const final = prompt('Type "DELETE" to confirm account deletion:');
  if (final !== 'DELETE') {
    showToast('info', 'Cancelled', 'Account deletion cancelled');
    return;
  }
  
  showToast('info', 'Coming Soon!', 'Account deletion coming soon. Contact developer for now.');
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
