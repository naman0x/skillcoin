// ==========================================
// ADMIN LINK INJECTOR
// Adds Admin Panel link to sidebar for admin only
// ==========================================

import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const ADMIN_EMAIL = "techgamers273@gmail.com";

console.log("👑 admin-inject.js loaded");

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    console.log("👑 Admin detected, injecting link...");
    // Try multiple times in case sidebar loads slowly
    setTimeout(injectAdminLink, 500);
    setTimeout(injectAdminLink, 1500);
    setTimeout(injectAdminLink, 3000);
  }
});

function injectAdminLink() {
  // Don't add on admin page
  if (window.location.pathname.includes('admin.html')) return;
  
  // Check if already added
  if (document.querySelector('.admin-link-inject')) {
    console.log("👑 Admin link already exists");
    return;
  }
  
  const navContainer = document.querySelector('.sidebar-nav');
  if (!navContainer) {
    console.log("⚠️ Sidebar nav not found yet");
    return;
  }
  
  const adminSection = document.createElement('div');
  adminSection.className = 'nav-section';
  adminSection.innerHTML = `
    <span class="nav-section-title" style="color:#FFD700;">👑 Developer</span>
    <a href="admin.html" class="sidebar-link admin-link-inject" style="
      background: linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05));
      border: 1px solid rgba(255,215,0,0.3);
      color: #FFD700 !important;
      margin-bottom: 8px;
    ">
      <i class="fas fa-crown"></i>
      <span>Admin Panel</span>
    </a>
  `;
  
  navContainer.insertBefore(adminSection, navContainer.firstChild);
  console.log("✅ Admin panel link added to sidebar!");
}