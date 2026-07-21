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

const ADMIN_EMAIL = "techgamers273@gmail.com";

let currentUser = null;
let userData = null;
let isAdmin = false;
let selectedColor = 'purple';
let selectedIcon = 'fas fa-book';
let lessonCount = 0;

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Upload page loaded");

  initToasts();
  initSidebar();
  initLogout();
  initFormListeners();
  initThumbnailPicker();
  initPriceControls();
  initAddLessonButton();
  addInitialLessons();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      isAdmin = (user.email === ADMIN_EMAIL);
      if (isAdmin) console.log("👑 ADMIN MODE!");
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
    setText('coinAmount', isAdmin ? '∞' : formatNumber(userData.skillCoins || 0));
    setText('topInitial', initial);

    const hasUploaded = userData.uploadedCourses && userData.uploadedCourses.length > 0;
    if (!hasUploaded) {
      const bonusEl = document.getElementById('firstUploadBonus');
      if (bonusEl) bonusEl.style.display = 'inline';
    }
  } catch (err) {
    console.error(err);
  }
}

function initFormListeners() {
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

  const category = document.getElementById('courseCategory');
  const level = document.getElementById('courseLevel');

  if (category) category.addEventListener('change', () => { updateSummary(); updateSteps(); });
  if (level) level.addEventListener('change', () => { updateSummary(); updateSteps(); });

  const form = document.getElementById('uploadForm');
  if (form) form.addEventListener('submit', handleFormSubmit);
}

function initThumbnailPicker() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.getAttribute('data-color');
      updateThumbnailPreview();
    });
  });

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
  if (preview) preview.className = `thumbnail-preview-inner ${selectedColor}`;
  if (iconEl) iconEl.className = selectedIcon;
}

function initPriceControls() {
  const range = document.getElementById('priceRange');
  const input = document.getElementById('coursePrice');

  if (range && input) {
    range.addEventListener('input', () => {
      input.value = range.value;
      updateSummary();
    });

    input.addEventListener('input', () => {
      let val = parseInt(input.value) || 0;
      if (val > 600) val = 600;
      if (val < 0) val = 0;
      input.value = val;
      range.value = val;
      updateSummary();
    });

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

  document.querySelectorAll('.price-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const price = btn.getAttribute('data-price');
      if (range) range.value = price;
      if (input) input.value = price;
      updateSummary();
    });
  });
}

function initAddLessonButton() {
  const addBtn = document.getElementById('addLessonBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addLesson);
  }
}

function addInitialLessons() {
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
    <div class="lesson-header-row">
      <span class="lesson-editor-num">${document.querySelectorAll('.lesson-editor-item').length + 1}</span>
      <input 
        type="text" 
        class="lesson-title-input" 
        placeholder="Lesson title (e.g., Introduction to Python)"
        required
      />
      <button type="button" class="lesson-editor-remove" onclick="removeLesson(${lessonId})">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="lesson-content-tabs">
      <button type="button" class="lesson-tab-btn active" data-tab="video">
        <i class="fas fa-video"></i> Video
      </button>
      <button type="button" class="lesson-tab-btn" data-tab="notes">
        <i class="fas fa-sticky-note"></i> Notes
      </button>
    </div>

    <div class="lesson-video-section active">
      <label>
        <i class="fab fa-youtube"></i>
        YouTube Video URL (Optional)
      </label>
      <input 
        type="url" 
        class="video-url-input" 
        placeholder="https://www.youtube.com/watch?v=..."
      />
      <span class="video-url-hint">
        Paste YouTube link. Formats: <code>youtube.com/watch?v=ID</code> or <code>youtu.be/ID</code>
      </span>
    </div>

    <div class="lesson-notes-section">
      <label>
        <i class="fas fa-sticky-note"></i>
        Lesson Notes (Optional)
      </label>
      <div class="notes-toolbar">
        <button type="button" class="toolbar-btn" data-cmd="bold" title="Bold"><i class="fas fa-bold"></i></button>
        <button type="button" class="toolbar-btn" data-cmd="italic" title="Italic"><i class="fas fa-italic"></i></button>
        <button type="button" class="toolbar-btn" data-cmd="underline" title="Underline"><i class="fas fa-underline"></i></button>
        <div class="toolbar-divider"></div>
        <button type="button" class="toolbar-btn" data-cmd="formatBlock" data-val="h2" title="Heading"><i class="fas fa-heading"></i></button>
        <button type="button" class="toolbar-btn" data-cmd="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
        <button type="button" class="toolbar-btn" data-cmd="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
      </div>
      <div 
        class="notes-editor" 
        contenteditable="true"
        data-placeholder="Type your lesson notes here..."
      ></div>
    </div>

    <div class="lesson-duration-wrap">
      <label><i class="fas fa-clock"></i> Duration:</label>
      <input 
        type="text" 
        class="lesson-duration-input" 
        placeholder="10 min"
        value="10 min"
      />
    </div>

    <div class="lesson-empty-warning">
      ⚠️ Please add a video URL or notes for this lesson!
    </div>
  `;

  editor.appendChild(lessonEl);
  
  initLessonTabs(lessonEl);
  initNotesToolbar(lessonEl);
  
  updateLessonNumbers();
  updateLessonsCount();
  updateSummary();
  updateSteps();
}

function initLessonTabs(lessonEl) {
  const tabs = lessonEl.querySelectorAll('.lesson-tab-btn');
  const videoSection = lessonEl.querySelector('.lesson-video-section');
  const notesSection = lessonEl.querySelector('.lesson-notes-section');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const target = tab.getAttribute('data-tab');
      if (target === 'video') {
        videoSection.classList.add('active');
        notesSection.classList.remove('active');
      } else {
        notesSection.classList.add('active');
        videoSection.classList.remove('active');
      }
    });
  });
}

function initNotesToolbar(lessonEl) {
  const toolbar = lessonEl.querySelector('.notes-toolbar');
  const editor = lessonEl.querySelector('.notes-editor');
  
  if (!toolbar || !editor) return;

  toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.getAttribute('data-cmd');
      const val = btn.getAttribute('data-val') || null;
      editor.focus();
      document.execCommand(cmd, false, val);
      
      const notesTab = lessonEl.querySelector('[data-tab="notes"]');
      if (notesTab && editor.innerHTML.trim()) {
        notesTab.classList.add('has-content');
      }
    });
  });

  editor.addEventListener('input', () => {
    const notesTab = lessonEl.querySelector('[data-tab="notes"]');
    if (notesTab) {
      if (editor.innerHTML.trim()) {
        notesTab.classList.add('has-content');
      } else {
        notesTab.classList.remove('has-content');
      }
    }
  });

  const videoInput = lessonEl.querySelector('.video-url-input');
  if (videoInput) {
    videoInput.addEventListener('input', () => {
      const videoTab = lessonEl.querySelector('[data-tab="video"]');
      if (videoTab) {
        if (videoInput.value.trim()) {
          videoTab.classList.add('has-content');
        } else {
          videoTab.classList.remove('has-content');
        }
      }
    });
  }
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

async function handleFormSubmit(e) {
  e.preventDefault();
  console.log("🚀 Publishing course...");

  const btn = document.getElementById('publishBtn');

  const title = document.getElementById('courseTitle').value.trim();
  const description = document.getElementById('courseDesc').value.trim();
  const category = document.getElementById('courseCategory').value;
  const level = document.getElementById('courseLevel').value;
  const priceRaw = document.getElementById('coursePrice').value;
  const price = parseInt(priceRaw) || 0;
  const tagsRaw = document.getElementById('courseTags').value.trim();
  const agreed = document.getElementById('agreeUpload').checked;

  if (!title) return showToast('error', 'Title Required!', 'Please add a course title');
  if (title.length < 10) return showToast('error', 'Title Too Short!', 'Title must be at least 10 characters');
  if (!description) return showToast('error', 'Description Required!', 'Please add a description');
  if (description.length < 30) return showToast('error', 'Description Too Short!', 'Description must be at least 30 characters');
  if (!category) return showToast('error', 'Category Required!', 'Please select a category');
  if (!level) return showToast('error', 'Level Required!', 'Please select difficulty level');
  if (price > 600) return showToast('error', 'Price Too High!', 'Maximum price is 600 coins');
  if (!agreed) return showToast('error', 'Agreement Required!', 'Please agree to community guidelines');

  const lessonElements = document.querySelectorAll('.lesson-editor-item');
  if (lessonElements.length < 3) return showToast('error', 'More Lessons Needed!', 'Minimum 3 lessons required');

  const lessonsList = [];
  let lessonsValid = true;
  let lessonsHaveContent = true;

  lessonElements.forEach((item, i) => {
    const titleInput = item.querySelector('.lesson-title-input');
    const durationInput = item.querySelector('.lesson-duration-input');
    const videoInput = item.querySelector('.video-url-input');
    const notesEditor = item.querySelector('.notes-editor');
    const warningEl = item.querySelector('.lesson-empty-warning');
    
    const lessonTitle = titleInput?.value.trim();
    const duration = durationInput?.value.trim() || '10 min';
    const videoUrl = videoInput?.value.trim() || '';
    const notes = notesEditor?.innerHTML.trim() || '';
    const videoId = extractYouTubeId(videoUrl);

    if (!lessonTitle) {
      lessonsValid = false;
      titleInput.style.borderColor = 'var(--red)';
    }

    if (!videoId && !notes) {
      lessonsHaveContent = false;
      if (warningEl) warningEl.classList.add('show');
    } else {
      if (warningEl) warningEl.classList.remove('show');
    }

    if (lessonTitle) {
      lessonsList.push({
        id: i + 1,
        title: lessonTitle,
        duration: duration,
        completed: false,
        videoUrl: videoUrl,
        videoId: videoId,
        notes: notes,
        hasVideo: !!videoId,
        hasNotes: !!notes
      });
    }
  });

  if (!lessonsValid) return showToast('error', 'Empty Lessons!', 'Please fill in all lesson titles');
  if (!lessonsHaveContent) return showToast('error', 'Empty Lessons!', 'Each lesson needs a video URL or notes!');

  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t) : [category];

  setButtonLoading(btn, true);

  try {
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

    console.log("💾 Saving course...");
    await setDoc(courseRef, courseData);
    console.log("✅ Course saved!");
    
    sessionStorage.removeItem('skillcoin_courses_cache');
    sessionStorage.removeItem('skillcoin_courses_time');
    console.log("🧹 Cache cleared!");

    const isFirstUpload = !userData.uploadedCourses || userData.uploadedCourses.length === 0;
    const baseReward = 1000;
    const bonusReward = isFirstUpload ? 500 : 0;
    const totalReward = baseReward + bonusReward;

    if (!isAdmin) {
      const newCoins = (userData.skillCoins || 0) + totalReward;
      const newTotalEarned = (userData.totalCoinsEarned || 0) + totalReward;
      const newUploaded = [...(userData.uploadedCourses || []), courseId];

      await setDoc(doc(db, 'users', currentUser.uid), {
        skillCoins: newCoins,
        totalCoinsEarned: newTotalEarned,
        uploadedCourses: newUploaded
      }, { merge: true });

      userData.skillCoins = newCoins;
      userData.uploadedCourses = newUploaded;
    } else {
      const newUploaded = [...(userData.uploadedCourses || []), courseId];
      await setDoc(doc(db, 'users', currentUser.uid), {
        uploadedCourses: newUploaded
      }, { merge: true });
      userData.uploadedCourses = newUploaded;
    }

    setText('earnedCoins', `+${totalReward}`);
    document.getElementById('successModal').classList.add('active');

    setTimeout(() => {
      if (isFirstUpload) {
        showToast('coin', '🎉 First Upload Bonus!', `+${totalReward} coins!`);
      } else {
        showToast('coin', '🎉 Published!', `+${totalReward} SkillCoins!`);
      }
    }, 500);

  } catch (err) {
    console.error("❌ Upload error:", err);
    showToast('error', 'Upload Failed!', 'Could not publish course. Try again!');
    setButtonLoading(btn, false);
  }
}

function extractYouTubeId(url) {
  if (!url) return '';
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return '';
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