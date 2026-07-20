// ==========================================
// SKILLCOIN — Leaderboard Logic
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

console.log("🏆 leaderboard.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;
let allUsers = [];
let currentFilter = 'all-time';

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initFilters();
  initSearch();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      await loadLeaderboard();
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
// LOAD LEADERBOARD
// ==========================================

async function loadLeaderboard() {
  try {
    console.log("📥 Loading users...");
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    allUsers = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      allUsers.push({
        uid: docSnap.id,
        name: data.name || 'Anonymous',
        email: data.email || '',
        skillCoins: data.skillCoins || 0,
        totalCoinsEarned: data.totalCoinsEarned || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        xp: data.xp || 0,
        badges: data.badges || []
      });
    });
    
    console.log(`✅ Loaded ${allUsers.length} users`);
    renderLeaderboard();
  } catch (err) {
    console.error("❌ Error loading leaderboard:", err);
    showToast('error', 'Error!', 'Could not load rankings');
  }
}

// ==========================================
// RENDER LEADERBOARD
// ==========================================

function renderLeaderboard() {
  // Sort users based on filter
  let sortedUsers = [...allUsers];
  
  switch (currentFilter) {
    case 'weekly':
      // Use totalCoinsEarned as approximation for weekly
      sortedUsers.sort((a, b) => b.totalCoinsEarned - a.totalCoinsEarned);
      break;
    case 'monthly':
      sortedUsers.sort((a, b) => b.totalCoinsEarned - a.totalCoinsEarned);
      break;
    case 'streak':
      sortedUsers.sort((a, b) => b.streak - a.streak);
      break;
    case 'all-time':
    default:
      sortedUsers.sort((a, b) => b.skillCoins - a.skillCoins);
      break;
  }
  
  // Render podium (top 3)
  renderPodium(sortedUsers);
  
  // Render your rank
  renderYourRank(sortedUsers);
  
  // Render full list
  renderFullList(sortedUsers);
}

function renderPodium(users) {
  // Top 3 users
  const gold = users[0];
  const silver = users[1];
  const bronze = users[2];
  
  if (gold) {
    setText('p1Name', gold.name);
    setText('p1Coins', formatNumber(getFilterValue(gold)));
    setText('p1Initial', gold.name.charAt(0).toUpperCase());
  }
  
  if (silver) {
    setText('p2Name', silver.name);
    setText('p2Coins', formatNumber(getFilterValue(silver)));
    setText('p2Initial', silver.name.charAt(0).toUpperCase());
  } else {
    setText('p2Name', 'Empty');
    setText('p2Coins', '0');
    setText('p2Initial', '?');
  }
  
  if (bronze) {
    setText('p3Name', bronze.name);
    setText('p3Coins', formatNumber(getFilterValue(bronze)));
    setText('p3Initial', bronze.name.charAt(0).toUpperCase());
  } else {
    setText('p3Name', 'Empty');
    setText('p3Coins', '0');
    setText('p3Initial', '?');
  }
}

function renderYourRank(users) {
  const yourIndex = users.findIndex(u => u.uid === currentUser.uid);
  const rank = yourIndex + 1;
  
  setText('yourRankNum', rank > 0 ? `#${rank}` : '#--');
  setText('yourRankName', userData.name || 'You');
  setText('yourRankLevel', userData.level || 1);
  setText('yourRankStreak', userData.streak || 0);
  setText('yourRankCoins', formatNumber(getFilterValue(userData)));
  
  const avatar = document.getElementById('yourRankAvatar');
  if (avatar) avatar.textContent = (userData.name || 'U').charAt(0).toUpperCase();
}

function renderFullList(users) {
  const list = document.getElementById('rankingsList');
  const count = document.getElementById('rankingsCount');
  if (!list) return;
  
  setText('rankingsCount', `${users.length} users`);
  
  if (users.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fas fa-users" style="font-size: 3rem; opacity: 0.3;"></i>
        <p style="margin-top: 12px;">No users yet</p>
      </div>
    `;
    return;
  }
  
  list.innerHTML = users.map((user, index) => createRankItem(user, index + 1)).join('');
}

function createRankItem(user, rank) {
  const isYou = user.uid === currentUser.uid;
  const isAdmin = user.email === ADMIN_EMAIL;
  const initial = user.name.charAt(0).toUpperCase();
  
  const badges = [];
  if (isYou) badges.push('<span class="rank-badge-you">You</span>');
  if (isAdmin) badges.push('<span class="rank-badge-admin"><i class="fas fa-crown"></i> Dev</span>');
  
  const value = getFilterValue(user);
  
  return `
    <div class="rank-item ${isYou ? 'you' : ''} ${isAdmin ? 'admin' : ''}">
      <div class="rank-number ${rank <= 3 ? 'top' : ''}">${rank}</div>
      <div class="rank-avatar ${isAdmin ? 'admin-avatar' : ''}">${initial}</div>
      <div class="rank-details">
        <div class="rank-name-wrap">
          <span class="rank-name">${escapeHtml(user.name)}</span>
          ${badges.join('')}
        </div>
        <div class="rank-stats">
          <span class="rs-level"><i class="fas fa-shield-alt"></i> Lvl ${user.level}</span>
          <span class="rs-streak"><i class="fas fa-fire"></i> ${user.streak} day</span>
        </div>
      </div>
      <div class="rank-coins">
        <i class="fas fa-coins"></i>
        ${formatNumber(value)}
      </div>
    </div>
  `;
}

function getFilterValue(user) {
  switch (currentFilter) {
    case 'weekly':
    case 'monthly':
      return user.totalCoinsEarned || 0;
    case 'streak':
      return user.streak || 0;
    default:
      return user.skillCoins || 0;
  }
}

// ==========================================
// FILTERS
// ==========================================

function initFilters() {
  document.querySelectorAll('.lb-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lb-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderLeaderboard();
    });
  });
}

// ==========================================
// SEARCH
// ==========================================

function initSearch() {
  const search = document.getElementById('userSearch');
  if (!search) return;
  let timeout;
  search.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const q = e.target.value.trim().toLowerCase();
      const list = document.getElementById('rankingsList');
      if (!list) return;
      
      list.querySelectorAll('.rank-item').forEach(item => {
        const name = item.querySelector('.rank-name')?.textContent.toLowerCase() || '';
        item.style.display = name.includes(q) ? 'flex' : 'none';
      });
    }, 300);
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
