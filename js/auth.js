// ==========================================
// SKILLCOIN - Auth Logic (Login & Signup)
// ==========================================

import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  GoogleAuthProvider,
  signInWithPopup
} from './firebase-config.js';

console.log("🚀 auth.js loaded!");

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

  console.log("📄 Page loaded, initializing...");

  initToasts();

  const isLoginPage = window.location.pathname.includes('login');
  const isDashboard = window.location.pathname.includes('dashboard');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log("👤 User is logged in:", user.email);
      
      // ⚠️ FIX: Check if we are currently signing up.
      // If yes, let the signup handler do the redirect instead of this listener!
      const isSigningUp = sessionStorage.getItem('isSigningUp');
      
      if (isLoginPage && !isSigningUp) {
        console.log("➡️ Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 500);
      }
    } else {
      console.log("👤 No user logged in");
      if (isDashboard) {
        window.location.href = 'login.html';
      }
    }
  });

  if (isLoginPage) {
    console.log("🔐 On login page, setting up forms...");
    initTabs();
    initForms();
    initPasswordToggles();
    initPasswordStrength();
    checkURLMode();
  }

});

// ==========================================
// TAB SWITCHING
// ==========================================

function initTabs() {
  const tabs = document.querySelectorAll('.auth-tab');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-switch');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
  });

  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.remove('active');
  });

  const targetForm = document.getElementById(tabName + 'Form');
  if (targetForm) targetForm.classList.add('active');
}

// ==========================================
// URL MODE CHECK
// ==========================================

function checkURLMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');
  if (mode === 'signup') switchTab('signup');
}

// ==========================================
// PASSWORD TOGGLE
// ==========================================

function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });
}

// ==========================================
// PASSWORD STRENGTH
// ==========================================

function initPasswordStrength() {
  const passwordInput = document.getElementById('signupPassword');
  if (!passwordInput) return;

  passwordInput.addEventListener('input', () => {
    const value = passwordInput.value;
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');
    if (!strengthFill || !strengthText) return;

    strengthFill.className = 'strength-fill';

    if (value.length === 0) {
      strengthFill.style.width = '0%';
      strengthText.textContent = 'Password strength';
      return;
    }

    let strength = 0;
    if (value.length >= 6) strength++;
    if (value.length >= 10) strength++;
    if (/[A-Z]/.test(value)) strength++;
    if (/[0-9]/.test(value)) strength++;
    if (/[^A-Za-z0-9]/.test(value)) strength++;

    if (strength <= 2) {
      strengthFill.classList.add('weak');
      strengthText.textContent = '⚠️ Weak password';
      strengthText.style.color = 'var(--red)';
    } else if (strength <= 3) {
      strengthFill.classList.add('medium');
      strengthText.textContent = '🟡 Medium password';
      strengthText.style.color = 'var(--gold)';
    } else {
      strengthFill.classList.add('strong');
      strengthText.textContent = '✅ Strong password!';
      strengthText.style.color = 'var(--green)';
    }
  });
}

// ==========================================
// FORMS
// ==========================================

function initForms() {
  initLoginForm();
  initSignupForm();
  initGoogleAuth();
}


// ---- LOGIN ----
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("🔐 Login attempt started...");

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    setButtonLoading(btn, true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ Logged in:", user.email);

      await handleDailyLogin(user.uid);
      showToast('success', 'Welcome back! 👋', 'Redirecting...');

      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    } catch (error) {
      console.error("❌ Login error:", error);
      setButtonLoading(btn, false);
      showToast('error', 'Login Failed!', getErrorMessage(error.code));
    }
  });
}

// ---- SIGNUP ----
function initSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("📝 Signup attempt started...");

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;
    const btn = document.getElementById('signupBtn');

    if (!name) {
      showToast('error', 'Name Required', 'Please enter your full name!');
      return;
    }
    if (password !== confirm) {
      showToast('error', 'Password Mismatch!', 'Passwords do not match!');
      return;
    }
    if (!agreeTerms) {
      showToast('error', 'Terms Required', 'Please agree to the terms first!');
      return;
    }

    setButtonLoading(btn, true);
    
    // Set signup flag so listener doesn't steal focus and redirect early
    sessionStorage.setItem('isSigningUp', 'true');

    try {
      console.log("🔨 Creating Firebase account...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("✅ Firebase account created:", user.uid);

      await updateProfile(user, { displayName: name });
      console.log("✅ Display name updated");

      console.log("💾 Saving to Firestore...");
      await createUserProfile(user, name);
      console.log("✅ Profile saved!");

      showToast('coin', '🎉 Account Created!', '+100 Welcome Coins added!');

      // Signup complete, remove flag and redirect
      sessionStorage.removeItem('isSigningUp');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 2000);
    } catch (error) {
      console.error("❌ Signup error:", error);
      sessionStorage.removeItem('isSigningUp');
      setButtonLoading(btn, false);
      showToast('error', 'Signup Failed!', getErrorMessage(error.code));
    }
  });
}

// ==========================================
// GOOGLE SIGN-IN / SIGN-UP
// ==========================================

function initGoogleAuth() {
  const loginBtn = document.getElementById('googleLoginBtn');
  const signupBtn = document.getElementById('googleSignupBtn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', handleGoogleAuth);
  }
  
  if (signupBtn) {
    signupBtn.addEventListener('click', handleGoogleAuth);
  }
}

async function handleGoogleAuth() {
  console.log("🔍 Google sign-in started...");
  
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // Set signup flag
    sessionStorage.setItem('isSigningUp', 'true');
    
    // Open Google popup
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log("✅ Google auth success:", user.email);
    
    // Check if user already exists in Firestore
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // New user - create profile
      console.log("📝 Creating new user profile...");
      await createUserProfile(user, user.displayName || 'Learner');
      showToast('coin', '🎉 Welcome!', 'Account created! +100 coins added!');
    } else {
      // Existing user - just login
      console.log("👤 Existing user, logging in...");
      await handleDailyLogin(user.uid);
      showToast('success', 'Welcome back!', 'Redirecting...');
    }
    
    // Redirect
    sessionStorage.removeItem('isSigningUp');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1500);
    
  } catch (error) {
    console.error("❌ Google auth error:", error);
    sessionStorage.removeItem('isSigningUp');
    
    let errorMsg = 'Could not sign in with Google';
    
    if (error.code === 'auth/popup-closed-by-user') {
      errorMsg = 'Sign-in cancelled';
    } else if (error.code === 'auth/popup-blocked') {
      errorMsg = 'Popup blocked! Please allow popups.';
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      errorMsg = 'Account exists with different method. Try email login!';
    }
    
    showToast('error', 'Sign-in Failed', errorMsg);
  }
}
// ==========================================
// CREATE USER PROFILE
// ==========================================

async function createUserProfile(user, name) {
  const userRef = doc(db, 'users', user.uid);

  const userData = {
    uid: user.uid,
    name: name,
    email: user.email,
    avatar: '',
    skillCoins: 100,
    xp: 0,
    level: 1,
    streak: 0,
    lastLoginDate: '',
    completedCourses: [],
    completedChallenges: [],
    unlockedResources: [],
    badges: ['first_login'],
    uploadedCourses: [],
    purchasedCourses: [],
    totalCoinsEarned: 100,
    totalCoinsSpent: 0,
    joinedDate: serverTimestamp(),
    lastSeen: serverTimestamp(),
    missionsDone: [],
    quizzesTaken: 0,
    referralCode: generateReferralCode(name),
    settings: { theme: 'dark', notifications: true }
  };

  try {
    await setDoc(userRef, userData);
    console.log("✅ Firestore write successful!");
  } catch (error) {
    console.error("❌ Firestore write failed:", error);
    throw error;
  }

  localStorage.setItem('skillcoin_user', JSON.stringify({
    uid: user.uid,
    name: name,
    email: user.email
  }));
}

// ==========================================
// DAILY LOGIN
// ==========================================

async function handleDailyLogin(uid) {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const userData = userSnap.data();
    const today = new Date().toDateString();
    const lastLogin = userData.lastLoginDate;

    localStorage.setItem('skillcoin_user', JSON.stringify({
      uid: userData.uid,
      name: userData.name,
      email: userData.email
    }));

    if (lastLogin === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    let newStreak = 1;
    if (lastLogin === yesterdayStr) {
      newStreak = (userData.streak || 0) + 1;
    }

    const dailyReward = calculateDailyReward(newStreak);
    const newCoins = (userData.skillCoins || 0) + dailyReward;
    const newTotalEarned = (userData.totalCoinsEarned || 0) + dailyReward;

    await setDoc(userRef, {
      lastLoginDate: today,
      streak: newStreak,
      skillCoins: newCoins,
      totalCoinsEarned: newTotalEarned,
      lastSeen: serverTimestamp()
    }, { merge: true });

    setTimeout(() => {
      showToast('coin', `🔥 Day ${newStreak} Streak!`, `+${dailyReward} SkillCoins!`);
    }, 2000);
  } catch (error) {
    console.log('Daily login error:', error);
  }
}

// ==========================================
// HELPERS
// ==========================================

function setButtonLoading(btn, isLoading) {
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  if (isLoading) {
    if (text) text.style.display = 'none';
    if (loader) loader.style.display = 'inline-flex';
    btn.disabled = true;
  } else {
    if (text) text.style.display = 'inline-flex';
    if (loader) loader.style.display = 'none';
    btn.disabled = false;
  }
}

function getErrorMessage(code) {
  const errors = {
    'auth/user-not-found': 'No account found with this email!',
    'auth/wrong-password': 'Incorrect password!',
    'auth/email-already-in-use': 'Email already registered!',
    'auth/weak-password': 'Password must be at least 6 characters!',
    'auth/invalid-email': 'Please enter a valid email!',
    'auth/too-many-requests': 'Too many attempts! Try later.',
    'auth/network-request-failed': 'Network error!',
    'auth/invalid-credential': 'Invalid email or password!',
  };
  return errors[code] || 'Something went wrong!';
}

function generateReferralCode(name) {
  const prefix = name.slice(0, 3).toUpperCase();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefix}-${random}`;
}

function calculateDailyReward(streak) {
  if (streak <= 7) return 50 + (5 * streak);
  else if (streak <= 30) return 50 + (4 * streak);
  else if (streak <= 100) return 50 + (3 * streak);
  else return 350;
}

// ==========================================
// TOASTS
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
// ==========================================
// ADMIN SIDEBAR INJECTION
// (Adds "Admin Panel" link for admin only)
// ==========================================

const ADMIN_EMAIL_CHECK = "techgamers273@gmail.com";

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL_CHECK) {
    injectAdminLink();
  }
});

function injectAdminLink() {
  // Wait a bit for sidebar to load
  setTimeout(() => {
    const navSections = document.querySelectorAll('.nav-section');
    if (navSections.length === 0) return;
    
    // Check if admin link already exists
    if (document.querySelector('.sidebar-link[href="admin.html"]')) return;
    
    // Add to the last nav section (Account)
    const lastSection = navSections[navSections.length - 1];
    if (!lastSection) return;
    
    const adminLink = document.createElement('a');
    adminLink.href = 'admin.html';
    adminLink.className = 'sidebar-link admin-link-inject';
    adminLink.innerHTML = `
      <i class="fas fa-crown"></i>
      <span>Admin Panel</span>
      <span class="nav-badge" style="background:linear-gradient(135deg,#FFD700,#E6C200);color:white;">👑</span>
    `;
    
    // Highlight if we are ON admin page
    if (window.location.pathname.includes('admin.html')) {
      adminLink.classList.add('active');
    }
    
    lastSection.appendChild(adminLink);
    console.log("👑 Admin link injected!");
  }, 500);
}