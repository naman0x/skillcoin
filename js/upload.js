// ==========================================
// SKILLCOIN — Upload Course Logic
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

console.log("📤 upload.js loaded!");

// ==========================================
// ADMIN EMAIL (Your email = special powers!)
// ==========================================
const ADMIN_EMAIL = "techgamers273@gmail.com";

// Global State
let currentUser = null;
let userData = null;
let isAdmin = false;
let selectedColor = 'purple';
let selectedIcon = 'fas fa-book';
let lessonCount = 0;

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Upload page loaded");

  initToasts();
  initSidebar();
  initLogout();
  initFormListeners();
  initThumbnailPicker();
  initPriceControls();
  initLessonsEditor();
  addInitialLessons();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      isAdmin = (user.email === ADMIN_EMAIL);
      
      if (isAdmin) {
        console.log("👑 ADMIN MODE ACTIVATED!");
      }
      
      await loadUserData();
      hideLoader();
    } else {
      window.location.href = 'login.html';
    }
  });
});

// ==========================================
// LOAD USER DATA
// ==========================================

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
    setText('coinAmount', isAdmin ? '∞' : formatNumber(userData.skillCoins || 0));
    setText('topInitial', initial);

    // Check if first upload for bonus
    const hasUploaded = userData.uploadedCourses && userData.uploadedCourses.length > 0;
    if (!hasUploaded) {
      const bonusEl = document.getElementById('firstUploadBonus');
      if (bonusEl) bonusEl.style.display = 'inline';
    }
  } catch (err) {
    console.error("Error loading user:", err);
  }
}

// ==========================================
// FORM LISTENERS
// ==========================================

function initFormListeners() {
  // Character counters
  const titleInput = document.getElementById('courseTitle');
  const descInput = document.getElementById('courseDesc');

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      setText('titleCount', titleInput.value.length);
      updateSummary();
      updateSteps();
    });
  }

  if (descInput) {
    descInput.addEventListener('input', () => {
      setText('descCount', descInput.value.length);
      updateSteps();
    });
  }

  // Category & level dropdowns
  const category = document.getElementById('courseCategory');
  const level = document.getElementById('courseLevel');

  if (category) {
    category.addEventListener('change', () => {
      updateSummary();
      updateSteps();
    });
  }

  if (level) {
    level.addEventListener('change', () => {
      updateSummary();
      updateSteps();
    });
  }

  // Form submit
  const form = document.getElementById('uploadForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
}

// ==========================================
// THUMBNAIL PICKER
// ==========================================

function initThumbnailPicker() {
  // Color options
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.getAttribute('data-color');
      updateThumbnailPreview();
    });
  });

  // Icon options
  document.querySelectorAll('.icon-btn-picker').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.icon-btn-picker').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedIcon = btn.getAttribute('data-icon');
      updateThumbnailPreview();
    });
  });
}

function updateThumbnailPreview() {
  const preview = document.getElementById('thumbnailPreview');
  const iconEl = document.getElementById('previewIcon');

  if (preview) {
    preview.className = `thumbnail-preview-inner ${selectedColor}`;
  }

  if (iconEl) {
    iconEl.className = selectedIcon;
  }
}

// ==========================================
// PRICE CONTROLS
// ==========================================

function initPriceControls() {
  const range = document.getElementById('priceRange');
  const input = document.getElementById('coursePrice');

  if (range && input) {
    // Range → Input
    range.addEventListener('input', () => {
      input.value = range.value;
      updateSummary();
    });

    // Input → Range
    input.addEventListener('input', () => {
      let val = parseInt(input.value) || 0;
      if (val > 600) val = 600;
      if (val < 0) val = 0;
      input.value = val;
      range.value = val;
      updateSummary();
    });

    // Enforce max on blur
    input.addEventListener('blur', () => {
      let val = parseInt(input.value) || 0;
      if (val > 600) {
        input.value = 600;
        range.value = 600;
        showToast('info', 'Max Price!', 'Maximum course price is 600 coins!');
      }
      updateSummary();
    });
  }

  // Price presets
  document.querySelectorAll('.price-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const price = btn.getAttribute('data-price');
      if (range) range.value = price;
      if (input) input.value = price;
      updateSummary();
    });
  });
}

// ==========================================
// LESSONS EDITOR
// ==========================================

function initLessonsEditor() {
  const addBtn = document.getElementById('addLessonBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addLesson);
  }
}

function addInitialLessons() {
  // Start with 3 lessons
  for (let i = 0; i < 3; i++) {
    addLesson();
  }
}

function addLesson() {
  const editor = document.getElementById('lessonsEditor');
  if (!editor) return;

  lessonCount++;
  const lessonId = lessonCount;

  const lessonEl = document.createElement('div');
  lessonEl.className = 'lesson-editor-item';
  lessonEl.setAttribute('data-lesson-id', lessonId);
  
  lessonEl.innerHTML = `
    <span class="lesson-editor-num">${document.querySelectorAll('.lesson-editor-item').length + 1}</span>
    <input 
      type="text" 
      class="lesson-editor-input" 
      placeholder="Lesson title (e.g., Introduction to Python)"
      required
    />
    <input 
      type="text" 
      class="lesson-editor-duration" 
      placeholder="10 min"
      value="10 min"
    />
    <button type="button" class="lesson-editor-remove" onclick="removeLesson(${lessonId})">
      <i class="fas fa-times"></i>
    </button>
  `;

  editor.appendChild(lessonEl);
  updateLessonNumbers();
  updateLessonsCount();
  updateSummary();
  updateSteps();
}

window.removeLesson = function(id) {
  const item = document.querySelector(`[data-lesson-id="${id}"]`);
  if (!item) return;

  const total = document.querySelectorAll('.lesson-editor-item').length;
  if (total <= 3) {
    showToast('info', 'Minimum Lessons', 'You need at least 3 lessons!');
    return;
  }

  item.remove();
  updateLessonNumbers();
  updateLessonsCount();
  updateSummary();
  updateSteps();
};

function updateLessonNumbers() {
  document.querySelectorAll('.lesson-editor-item').forEach((item, i) => {
    const num = item.querySelector('.lesson-editor-num');
    if (num) num.textContent = i + 1;
  });
}

function updateLessonsCount() {
  const count = document.querySelectorAll('.lesson-editor-item').length;
  setText('totalLessons', count);
}

// ==========================================
// SUMMARY UPDATE
// ==========================================

function updateSummary() {
  const title = document.getElementById('courseTitle')?.value || 'Not set';
  const category = document.getElementById('courseCategory')?.value || 'Not set';
  const level = document.getElementById('courseLevel')?.value || 'Not set';
  const price = document.getElementById('coursePrice')?.value || '0';
  const lessons = document.querySelectorAll('.lesson-editor-item').length;

  setText('summaryTitle', title || 'Not set');
  setText('summaryCategory', capitalize(category));
  setText('summaryLevel', capitalize(level));
  setText('summaryLessons', `${lessons} lessons`);
  setText('summaryPrice', price === '0' ? 'FREE 🎁' : `${price} 🪙`);
}

// ==========================================
// STEPS UPDATE
// ==========================================

function updateSteps() {
  const title = document.getElementById('courseTitle')?.value.trim();
  const desc = document.getElementById('courseDesc')?.value.trim();
  const category = document.getElementById('courseCategory')?.value;
  const level = document.getElementById('courseLevel')?.value;
  const lessons = document.querySelectorAll('.lesson-editor-item').length;

  const step1Done = title && desc;
  const step2Done = step1Done && category && level;
  const step3Done = step2Done && lessons >= 3;
  const step4Done = step3Done;

  const steps = document.querySelectorAll('.step-indicator');
  if (steps[0]) steps[0].classList.toggle('completed', step1Done);
  if (steps[1]) {
    steps[1].classList.toggle('active', step1Done && !step2Done);
    steps[1].classList.toggle('completed', step2Done);
  }
  if (steps[2]) {
    steps[2].classList.toggle('active', step2Done && !step3Done);
    steps[2].classList.toggle('completed', step3Done);
  }
  if (steps[3]) {
    steps[3].classList.toggle('active', step3Done);
  }
}

// ==========================================
// FORM SUBMIT
// ==========================================

async function handleFormSubmit(e) {
  e.preventDefault();
  console.log("🚀 Publishing course...");

  const btn = document.getElementById('publishBtn');

  // Collect data
  const title = document.getElementById('courseTitle').value.trim();
  const description = document.getElementById('courseDesc').value.trim();
  const category = document.getElementById('courseCategory').value;
  const level = document.getElementById('courseLevel').value;
  const priceRaw = document.getElementById('coursePrice').value;
  const price = parseInt(priceRaw) || 0;
  const tagsRaw = document.getElementById('courseTags').value.trim();
  const agreed = document.getElementById('agreeUpload').checked;

  // Validation
  if (!title) {
    showToast('error', 'Title Required!', 'Please add a course title');
    return;
  }
  if (title.length < 10) {
    showToast('error', 'Title Too Short!', 'Title must be at least 10 characters');
    return;
  }
  if (!description) {
    showToast('error', 'Description Required!', 'Please add a description');
    return;
  }
  if (description.length < 30) {
    showToast('error', 'Description Too Short!', 'Description must be at least 30 characters');
    return;
  }
  if (!category) {
    showToast('error', 'Category Required!', 'Please select a category');
    return;
  }
  if (!level) {
    showToast('error', 'Level Required!', 'Please select difficulty level');
    return;
  }
  if (price > 600) {
    showToast('error', 'Price Too High!', 'Maximum price is 600 coins');
    return;
  }
  if (!agreed) {
    showToast('error', 'Agreement Required!', 'Please agree to community guidelines');
    return;
  }

  // Collect lessons
  const lessonElements = document.querySelectorAll('.lesson-editor-item');
  if (lessonElements.length < 3) {
    showToast('error', 'More Lessons Needed!', 'Minimum 3 lessons required');
    return;
  }

  const lessonsList = [];
  let lessonsValid = true;

  lessonElements.forEach((item, i) => {
    const titleInput = item.querySelector('.lesson-editor-input');
    const durationInput = item.querySelector('.lesson-editor-duration');
    const lessonTitle = titleInput?.value.trim();
    const duration = durationInput?.value.trim() || '10 min';

    if (!lessonTitle) {
      lessonsValid = false;
      titleInput.style.borderColor = 'var(--red)';
    } else {
      lessonsList.push({
        id: i + 1,
        title: lessonTitle,
        duration: duration,
        completed: false
      });
    }
  });

  if (!lessonsValid) {
    showToast('error', 'Empty Lessons!', 'Please fill in all lesson titles');
    return;
  }

  // Tags
  const tags = tagsRaw
    ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
    : [category];

  // Loading state
  setButtonLoading(btn, true);

  try {
    // Create course document
    const courseId = `course_${Date.now()}_${currentUser.uid.slice(0, 6)}`;
    const courseRef = doc(db, 'courses', courseId);

    const courseData = {
      title: title,
      description: description,
      category: category,
      level: level,
      price: price,
      author: userData.name,
      authorId: currentUser.uid,
      authorEmail: currentUser.email,
      icon: selectedIcon,
      color: selectedColor,
      thumbnail: '',
      rating: 5.0,
      students: 0,
      lessons: lessonsList.length,
      duration: `${lessonsList.length * 10} mins`,
      featured: isAdmin,
      tags: tags,
      lessonsList: lessonsList,
      createdAt: serverTimestamp(),
      isUserUploaded: true
    };

    console.log("💾 Saving course to Firestore...", courseData);
    await setDoc(courseRef, courseData);
    console.log("✅ Course saved!");
        console.log("✅ Course saved!");
    
    // 🧹 Clear cache so uploader sees new course immediately
    sessionStorage.removeItem('skillcoin_courses_cache');
    sessionStorage.removeItem('skillcoin_courses_time');
    console.log("🧹 Course cache cleared - fresh data on next load!");

    // Award coins
    const isFirstUpload = !userData.uploadedCourses || userData.uploadedCourses.length === 0;
    const baseReward = 1000;
    const bonusReward = isFirstUpload ? 500 : 0;
    const totalReward = baseReward + bonusReward;

    // Admin gets no coin changes (already unlimited)
    if (!isAdmin) {
      const newCoins = (userData.skillCoins || 0) + totalReward;
      const newTotalEarned = (userData.totalCoinsEarned || 0) + totalReward;
      const newUploaded = [...(userData.uploadedCourses || []), courseId];

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        skillCoins: newCoins,
        totalCoinsEarned: newTotalEarned,
        uploadedCourses: newUploaded
      }, { merge: true });

      userData.skillCoins = newCoins;
      userData.uploadedCourses = newUploaded;
    } else {
      // Just track uploaded courses for admin
      const newUploaded = [...(userData.uploadedCourses || []), courseId];
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        uploadedCourses: newUploaded
      }, { merge: true });
      userData.uploadedCourses = newUploaded;
    }

    console.log("✅ Rewards distributed!");

    // Show success modal
    setText('earnedCoins', `+${totalReward}`);
    document.getElementById('successModal').classList.add('active');

    // Show toast
    setTimeout(() => {
      if (isFirstUpload) {
        showToast('coin', '🎉 First Upload Bonus!', `+${totalReward} coins earned!`);
      } else {
        showToast('coin', '🎉 Course Published!', `+${totalReward} SkillCoins earned!`);
      }
    }, 500);

  } catch (err) {
    console.error("❌ Upload error:", err);
    showToast('error', 'Upload Failed!', 'Could not publish course. Try again!');
    setButtonLoading(btn, false);
  }
}

// ==========================================
// SIDEBAR & LOGOUT
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

// ==========================================
// HELPERS
// ==========================================

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

function capitalize(str) {
  if (!str || str === 'Not set') return 'Not set';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
