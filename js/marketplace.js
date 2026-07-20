// ==========================================
// SKILLCOIN — Marketplace Logic
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

console.log("🏪 marketplace.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let userData = null;
let currentCategory = 'all';
let currentSearch = '';
let selectedItem = null;

// ==========================================
// MARKETPLACE ITEMS
// ==========================================

const ITEMS = [
  // Notes & PDFs
  { id: 'notes_physics', category: 'notes', name: 'Physics Complete Notes', desc: 'Full syllabus PDF with formulas', price: 100, icon: 'fas fa-atom', color: 'blue', tag: null },
  { id: 'notes_chemistry', category: 'notes', name: 'Chemistry Cheat Sheet', desc: 'Quick reference guide', price: 80, icon: 'fas fa-flask', color: 'green', tag: null },
  { id: 'notes_maths', category: 'notes', name: 'Maths Formula Book', desc: 'All formulas in one place', price: 120, icon: 'fas fa-square-root-alt', color: 'purple', tag: 'premium' },
  { id: 'notes_coding', category: 'notes', name: 'Coding Interview Prep', desc: 'DSA questions & answers', price: 150, icon: 'fas fa-code', color: 'red', tag: 'premium' },

  // Badges
  { id: 'badge_star', category: 'badges', name: 'Rising Star Badge', desc: 'Show off your progress!', price: 150, icon: 'fas fa-star', color: 'gold', tag: null },
  { id: 'badge_crown', category: 'badges', name: 'Golden Crown', desc: 'A royal touch to your profile', price: 300, icon: 'fas fa-crown', color: 'gold', tag: 'premium' },
  { id: 'badge_fire', category: 'badges', name: 'Fire Streak Badge', desc: 'For the dedicated learners', price: 200, icon: 'fas fa-fire', color: 'red', tag: null },
  { id: 'badge_gem', category: 'badges', name: 'Diamond Elite', desc: 'The rarest badge!', price: 500, icon: 'fas fa-gem', color: 'blue', tag: 'limited' },

  // Themes
  { id: 'theme_ocean', category: 'themes', name: 'Ocean Blue Theme', desc: 'Cool blue vibes', price: 250, icon: 'fas fa-water', color: 'blue', tag: null },
  { id: 'theme_sunset', category: 'themes', name: 'Sunset Orange', desc: 'Warm sunset colors', price: 250, icon: 'fas fa-sun', color: 'orange', tag: null },
  { id: 'theme_neon', category: 'themes', name: 'Neon Purple', desc: 'Cyberpunk aesthetic', price: 300, icon: 'fas fa-magic', color: 'purple', tag: 'new' },
  { id: 'theme_matrix', category: 'themes', name: 'Matrix Green', desc: 'Hacker mode activated', price: 350, icon: 'fas fa-terminal', color: 'green', tag: 'new' },

  // Avatar Frames
  { id: 'frame_gold', category: 'avatars', name: 'Golden Frame', desc: 'Shine bright!', price: 200, icon: 'fas fa-circle-notch', color: 'gold', tag: null },
  { id: 'frame_neon', category: 'avatars', name: 'Neon Ring', desc: 'Glowing avatar frame', price: 250, icon: 'fas fa-ring', color: 'purple', tag: null },
  { id: 'frame_animated', category: 'avatars', name: 'Animated Frame', desc: 'Rotating rainbow effect', price: 400, icon: 'fas fa-sync', color: 'pink', tag: 'premium' },
  { id: 'frame_royal', category: 'avatars', name: 'Royal Frame', desc: 'Only for kings & queens 👑', price: 500, icon: 'fas fa-chess-king', color: 'gold', tag: 'limited' },

  // Power-Ups
  { id: 'power_double_xp', category: 'power-ups', name: '2x XP Boost (24hr)', desc: 'Earn double XP for a day', price: 300, icon: 'fas fa-bolt', color: 'gold', tag: null },
  { id: 'power_double_coins', category: 'power-ups', name: '2x Coins (12hr)', desc: 'Double coin rewards', price: 400, icon: 'fas fa-coins', color: 'gold', tag: 'premium' },
  { id: 'power_streak_freeze', category: 'power-ups', name: 'Streak Freeze', desc: 'Save your streak for 1 day', price: 150, icon: 'fas fa-snowflake', color: 'blue', tag: null },
  { id: 'power_ai_boost', category: 'power-ups', name: 'AI Boost (100 msgs)', desc: 'Extra AI conversations', price: 200, icon: 'fas fa-robot', color: 'teal', tag: 'new' }
];

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();
  initCategories();
  initSearch();
  initModal();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      renderItems();
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
    const balance = isAdmin ? '∞' : formatNumber(userData.skillCoins || 0);
    setText('coinAmount', balance);
    setText('heroBalance', `${balance} Coins`);
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// RENDER ITEMS
// ==========================================

function renderItems() {
  const grid = document.getElementById('itemsGrid');
  if (!grid) return;
  
  let items = ITEMS;
  
  // Filter category
  if (currentCategory !== 'all') {
    items = items.filter(i => i.category === currentCategory);
  }
  
  // Filter search
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    items = items.filter(i => 
      i.name.toLowerCase().includes(q) ||
      i.desc.toLowerCase().includes(q)
    );
  }
  
  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
        <h3>No items found</h3>
        <p>Try a different category or search</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = items.map(item => createItemCard(item)).join('');
  
  // Add click listeners
  document.querySelectorAll('.item-buy-btn:not(.owned):not(.no-coins)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-item-id');
      openPurchaseModal(id);
    });
  });
}

function createItemCard(item) {
  const isAdmin = currentUser.email === ADMIN_EMAIL;
  const owned = userData.unlockedResources?.includes(item.id) || false;
  const canAfford = isAdmin || (userData.skillCoins || 0) >= item.price;
  
  let tagHTML = '';
  if (item.tag) {
    tagHTML = `<div class="item-tag ${item.tag}">${item.tag}</div>`;
  }
  
  let ownedBadge = '';
  if (owned) {
    ownedBadge = `<div class="item-owned-badge"><i class="fas fa-check"></i> Owned</div>`;
  }
  
  let btnHTML = '';
  if (owned) {
    btnHTML = `<button class="item-buy-btn owned"><i class="fas fa-check"></i> Owned</button>`;
  } else if (!canAfford) {
    btnHTML = `<button class="item-buy-btn no-coins"><i class="fas fa-lock"></i> Need More</button>`;
  } else {
    btnHTML = `<button class="item-buy-btn" data-item-id="${item.id}"><i class="fas fa-shopping-cart"></i> Buy</button>`;
  }
  
  return `
    <div class="item-card ${owned ? 'owned' : ''}">
      <div class="item-visual ${item.color}">
        ${tagHTML}
        ${ownedBadge}
        <i class="${item.icon}"></i>
      </div>
      <div class="item-info">
        <span class="item-category">${item.category.replace('-', ' ')}</span>
        <h3 class="item-name">${item.name}</h3>
        <p class="item-desc">${item.desc}</p>
        <div class="item-footer">
          <span class="item-price"><i class="fas fa-coins"></i> ${item.price}</span>
          ${btnHTML}
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// CATEGORIES
// ==========================================

function initCategories() {
  document.querySelectorAll('.market-cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.market-cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-category');
      renderItems();
    });
  });
}

// ==========================================
// SEARCH
// ==========================================

function initSearch() {
  const search = document.getElementById('marketSearch');
  if (!search) return;
  let timeout;
  search.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      renderItems();
    }, 300);
  });
}

// ==========================================
// PURCHASE MODAL
// ==========================================

function openPurchaseModal(itemId) {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item) return;
  
  selectedItem = item;
  const balance = userData.skillCoins || 0;
  const after = balance - item.price;
  const isAdmin = currentUser.email === ADMIN_EMAIL;
  
  setText('purchaseTitle', 'Confirm Purchase');
  setText('purchaseDesc', `Get ${item.name} instantly!`);
  setText('purchaseItemName', item.name);
  setText('purchasePrice', `${item.price} 🪙`);
  setText('purchaseBalance', isAdmin ? '∞ 🪙' : `${balance} 🪙`);
  setText('purchaseAfter', isAdmin ? '∞ 🪙' : `${after} 🪙`);
  
  const iconWrap = document.getElementById('purchaseModalIcon');
  if (iconWrap) {
    iconWrap.innerHTML = `<i class="${item.icon}"></i>`;
  }
  
  document.getElementById('purchaseModal').classList.add('active');
}

function initModal() {
  document.getElementById('closePurchase')?.addEventListener('click', () => {
    document.getElementById('purchaseModal').classList.remove('active');
  });
  
  document.getElementById('cancelPurchase')?.addEventListener('click', () => {
    document.getElementById('purchaseModal').classList.remove('active');
  });
  
  document.getElementById('confirmPurchase')?.addEventListener('click', confirmPurchase);
  
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
}

async function confirmPurchase() {
  if (!selectedItem) return;
  
  const isAdmin = currentUser.email === ADMIN_EMAIL;
  const balance = userData.skillCoins || 0;
  
  if (!isAdmin && balance < selectedItem.price) {
    showToast('error', 'Not Enough Coins!', `You need ${selectedItem.price - balance} more coins`);
    return;
  }
  
  try {
    const unlocked = [...(userData.unlockedResources || []), selectedItem.id];
    const updates = { unlockedResources: unlocked };
    
    if (!isAdmin) {
      const newCoins = balance - selectedItem.price;
      const newSpent = (userData.totalCoinsSpent || 0) + selectedItem.price;
      updates.skillCoins = newCoins;
      updates.totalCoinsSpent = newSpent;
      userData.skillCoins = newCoins;
      setText('coinAmount', formatNumber(newCoins));
      setText('heroBalance', `${formatNumber(newCoins)} Coins`);
    }
    
    userData.unlockedResources = unlocked;
    await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
    
    document.getElementById('purchaseModal').classList.remove('active');
    showToast('success', '🎉 Purchase Complete!', `${selectedItem.name} unlocked!`);
    
    renderItems();
  } catch (err) {
    console.error(err);
    showToast('error', 'Error!', 'Could not complete purchase');
  }
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
