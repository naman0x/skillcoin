// ==========================================
// SKILLCOIN — Admin Panel Logic
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, collection, getDocs
} from './firebase-config.js';

console.log("👑 admin.js loaded!");

const ADMIN_EMAIL = "techgamers273@gmail.com";
let currentUser = null;
let allUsers = [];
let allCourses = [];
let selectedUserId = null;

document.addEventListener('DOMContentLoaded', () => {
  initToasts();
  initSidebar();
  initLogout();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    
    // Check admin
    if (user.email !== ADMIN_EMAIL) {
      showAccessDenied();
      return;
    }
    
    // Admin access granted!
    console.log("👑 Admin access granted!");
    document.getElementById('adminMain').style.display = 'block';
    
    await loadAdminData();
    initTabs();
    initSearch();
    initEditModal();
    hideLoader();
  });
});

function showAccessDenied() {
  document.getElementById('accessDenied').style.display = 'flex';
  document.getElementById('adminMain').style.display = 'none';
  document.querySelector('.sidebar').style.display = 'none';
  hideLoader();
}

// ==========================================
// LOAD ADMIN DATA
// ==========================================

async function loadAdminData() {
  try {
    // Load users
    const usersSnap = await getDocs(collection(db, 'users'));
    allUsers = [];
    usersSnap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));
    
    // Load courses
    const coursesSnap = await getDocs(collection(db, 'courses'));
    allCourses = [];
    coursesSnap.forEach(d => allCourses.push({ id: d.id, ...d.data() }));
    
    console.log(`✅ Loaded ${allUsers.length} users, ${allCourses.length} courses`);
    
    renderStats();
    renderUsers();
    renderCourses();
    renderAnalytics();
  } catch (err) {
    console.error(err);
    showToast('error', 'Error!', 'Could not load admin data');
  }
}

function renderStats() {
  const totalCoins = allUsers.reduce((sum, u) => sum + (u.skillCoins || 0), 0);
  const activeStreaks = allUsers.filter(u => (u.streak || 0) > 0).length;
  
  setText('totalUsers', allUsers.length);
  setText('totalCoursesAdmin', allCourses.length);
  setText('totalCoinsCirc', formatNumber(totalCoins));
  setText('activeStreaks', activeStreaks);
}

// ==========================================
// USERS TABLE
// ==========================================

function renderUsers(filter = '') {
  const table = document.getElementById('usersTable');
  if (!table) return;
  
  let users = [...allUsers].sort((a, b) => (b.skillCoins || 0) - (a.skillCoins || 0));
  
  if (filter) {
    const q = filter.toLowerCase();
    users = users.filter(u => 
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }
  
  if (users.length === 0) {
    table.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted);">No users found</td></tr>`;
    return;
  }
  
  table.innerHTML = users.map(u => {
    const initial = (u.name || 'U').charAt(0).toUpperCase();
    const isYou = u.email === ADMIN_EMAIL;
    return `
      <tr>
        <td>
          <div class="user-cell">
            <div class="user-cell-avatar ${isYou ? 'admin-cell' : ''}">${initial}</div>
            <div>
              <span class="user-cell-name">${escapeHtml(u.name || 'Anonymous')}</span>
              ${isYou ? '<span class="user-cell-you">👑 YOU</span>' : ''}
            </div>
          </div>
        </td>
        <td style="color:var(--text-muted);font-size:0.82rem;">${escapeHtml(u.email || '')}</td>
        <td>Lvl ${u.level || 1}</td>
        <td class="coin-cell">🪙 ${formatNumber(u.skillCoins || 0)}</td>
        <td class="streak-cell">🔥 ${u.streak || 0}</td>
        <td>
          <div class="actions-cell">
            <button class="action-btn edit" onclick="window.editUser('${u.uid}')">
              <i class="fas fa-edit"></i> Edit
            </button>
            ${!isYou ? `<button class="action-btn delete" onclick="window.deleteUser('${u.uid}', '${escapeHtml(u.name)}')">
              <i class="fas fa-trash"></i> Delete
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.editUser = function(uid) {
  const user = allUsers.find(u => u.uid === uid);
  if (!user) return;
  
  selectedUserId = uid;
  setText('editUserName', `Editing: ${user.name} (${user.email})`);
  document.getElementById('editCoins').value = user.skillCoins || 0;
  document.getElementById('editLevel').value = user.level || 1;
  document.getElementById('editStreak').value = user.streak || 0;
  document.getElementById('editUserModal').classList.add('active');
};

window.deleteUser = async function(uid, name) {
  const confirm1 = confirm(`⚠️ Delete user "${name}"?\nAll their data will be lost!`);
  if (!confirm1) return;
  
  const confirm2 = prompt('Type "DELETE" to confirm:');
  if (confirm2 !== 'DELETE') {
    showToast('info', 'Cancelled', 'User deletion cancelled');
    return;
  }
  
  try {
    // Delete from Firestore
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
    
    allUsers = allUsers.filter(u => u.uid !== uid);
    renderUsers();
    renderStats();
    showToast('success', '✅ Deleted!', `User ${name} data marked as deleted`);
  } catch (err) {
    showToast('error', 'Error!', 'Could not delete user');
  }
};

function initEditModal() {
  document.getElementById('saveUserEdit')?.addEventListener('click', async () => {
    if (!selectedUserId) return;
    
    const coins = parseInt(document.getElementById('editCoins').value) || 0;
    const level = parseInt(document.getElementById('editLevel').value) || 1;
    const streak = parseInt(document.getElementById('editStreak').value) || 0;
    
    try {
      await setDoc(doc(db, 'users', selectedUserId), {
        skillCoins: coins,
        level: level,
        streak: streak
      }, { merge: true });
      
      // Update local
      const user = allUsers.find(u => u.uid === selectedUserId);
      if (user) {
        user.skillCoins = coins;
        user.level = level;
        user.streak = streak;
      }
      
      document.getElementById('editUserModal').classList.remove('active');
      showToast('success', '✅ Updated!', 'User data updated');
      renderUsers();
      renderStats();
    } catch (err) {
      showToast('error', 'Error!', 'Could not update user');
    }
  });
  
  document.getElementById('editUserModal').addEventListener('click', (e) => {
    if (e.target.id === 'editUserModal') {
      document.getElementById('editUserModal').classList.remove('active');
    }
  });
}

// ==========================================
// COURSES
// ==========================================

function renderCourses(filter = '') {
  const grid = document.getElementById('coursesAdminGrid');
  if (!grid) return;
  
  let courses = [...allCourses];
  
  if (filter) {
    const q = filter.toLowerCase();
    courses = courses.filter(c => 
      (c.title || '').toLowerCase().includes(q) ||
      (c.author || '').toLowerCase().includes(q)
    );
  }
  
  if (courses.length === 0) {
    grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px;">No courses found</p>`;
    return;
  }
  
  grid.innerHTML = courses.map(c => `
    <div class="admin-course-item">
      <div class="admin-course-visual ${c.color || 'purple'}">
        <i class="${c.icon || 'fas fa-book'}"></i>
      </div>
      <div class="admin-course-info">
        <div class="admin-course-title">${escapeHtml(c.title)}</div>
        <div class="admin-course-meta">
          <span>👥 ${c.students || 0}</span>
          <span>💰 ${c.price || 0}</span>
          <span>${c.featured ? '⭐' : ''}</span>
        </div>
        <div class="admin-course-actions">
          <button class="action-btn edit" onclick="window.toggleFeature('${c.id}')">
            <i class="fas fa-star"></i> ${c.featured ? 'Unfeature' : 'Feature'}
          </button>
          <button class="action-btn delete" onclick="window.deleteCourse('${c.id}', '${escapeHtml(c.title)}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.toggleFeature = async function(courseId) {
  const course = allCourses.find(c => c.id === courseId);
  if (!course) return;
  
  try {
    const newFeatured = !course.featured;
    await setDoc(doc(db, 'courses', courseId), { featured: newFeatured }, { merge: true });
    course.featured = newFeatured;
    renderCourses();
    showToast('success', '✅ Updated!', `Course ${newFeatured ? 'featured' : 'unfeatured'}`);
  } catch (err) {
    showToast('error', 'Error!', 'Could not update course');
  }
};

window.deleteCourse = async function(courseId, title) {
  const confirm1 = confirm(`⚠️ Delete "${title}"?\nThis cannot be undone!`);
  if (!confirm1) return;
  
  try {
    // Mark as deleted (soft delete)
    await setDoc(doc(db, 'courses', courseId), { 
      deleted: true, 
      deletedAt: new Date().toISOString() 
    }, { merge: true });
    
    allCourses = allCourses.filter(c => c.id !== courseId);
    renderCourses();
    renderStats();
    showToast('success', '✅ Deleted!', `Course "${title}" removed`);
  } catch (err) {
    showToast('error', 'Error!', 'Could not delete course');
  }
};

// ==========================================
// ANALYTICS
// ==========================================

function renderAnalytics() {
  const totalEarned = allUsers.reduce((s, u) => s + (u.totalCoinsEarned || 0), 0);
  const totalSpent = allUsers.reduce((s, u) => s + (u.totalCoinsSpent || 0), 0);
  const avgLevel = allUsers.length > 0 
    ? (allUsers.reduce((s, u) => s + (u.level || 1), 0) / allUsers.length).toFixed(1)
    : 0;
  const topStreak = Math.max(...allUsers.map(u => u.streak || 0), 0);
  const freeCourses = allCourses.filter(c => c.price === 0).length;
  const paidCourses = allCourses.filter(c => c.price > 0).length;
  const totalEnrollments = allUsers.reduce((s, u) => s + (u.purchasedCourses?.length || 0), 0);
  
  setText('anSignups', allUsers.length);
  setText('anCoinsEarned', formatNumber(totalEarned));
  setText('anCoinsSpent', formatNumber(totalSpent));
  setText('anAvgLevel', avgLevel);
  setText('anTopStreak', topStreak);
  setText('anFreeCourses', freeCourses);
  setText('anPaidCourses', paidCourses);
  setText('anEnrollments', totalEnrollments);
}

// ==========================================
// TABS
// ==========================================

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.querySelector(`.admin-section[data-section="${target}"]`)?.classList.add('active');
    });
  });
}

function initSearch() {
  document.getElementById('userSearchAdmin')?.addEventListener('input', (e) => {
    renderUsers(e.target.value.trim());
  });
  
  document.getElementById('courseSearchAdmin')?.addEventListener('input', (e) => {
    renderCourses(e.target.value.trim());
  });
}

// ==========================================
// HELPERS
// ==========================================

function escapeHtml(str) {
  if (!str) return '';
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
