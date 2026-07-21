// ==========================================
// SKILLCOIN — Course View Logic
// ==========================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp
} from './firebase-config.js';

console.log("📖 course-view.js loaded!");

// Global State
let currentUser = null;
let userData = null;
let courseData = null;
let courseId = null;
let enrollmentData = null;
let currentLessonIndex = 0;
let isEnrolled = false;

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Course view page loaded");

  // Get course ID from URL
  const params = new URLSearchParams(window.location.search);
  courseId = params.get('id');

  if (!courseId) {
    showToast('error', 'Error!', 'No course ID provided');
    setTimeout(() => window.location.href = 'courses.html', 2000);
    return;
  }

  initToasts();
  initSidebar();
  initLogout();
  initModals();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      await loadCourse();
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
    setText('coinAmount', formatNumber(userData.skillCoins || 0));
    setText('topInitial', initial);
  } catch (err) {
    console.error("Error loading user:", err);
  }
}

// ==========================================
// LOAD COURSE
// ==========================================

async function loadCourse() {
  try {
    console.log("📥 Loading course:", courseId);

    const courseRef = doc(db, 'courses', courseId);
    const courseSnap = await getDoc(courseRef);

    if (!courseSnap.exists()) {
      showToast('error', 'Error!', 'Course not found!');
      setTimeout(() => window.location.href = 'courses.html', 2000);
      return;
    }

    courseData = { id: courseSnap.id, ...courseSnap.data() };
    console.log("✅ Course loaded:", courseData.title);

    // Check enrollment
    await checkEnrollment();

    // Render course
    renderCourseHero();
    renderLessonsList();
    renderLessonContent(0);

    // Update page title
    document.title = `${courseData.title} — SkillCoin`;

  } catch (err) {
    console.error("❌ Error loading course:", err);
    showToast('error', 'Error!', 'Could not load course');
  }
}

// ==========================================
// CHECK ENROLLMENT
// ==========================================

async function checkEnrollment() {
  try {
    const enrollRef = doc(db, 'enrollments', `${currentUser.uid}_${courseId}`);
    const enrollSnap = await getDoc(enrollRef);

    if (enrollSnap.exists()) {
      isEnrolled = true;
      enrollmentData = enrollSnap.data();
      console.log("✅ User is enrolled");
    } else {
      isEnrolled = false;
      enrollmentData = null;
      console.log("❌ User is not enrolled");
    }
  } catch (err) {
    console.error("Error checking enrollment:", err);
  }
}

// ==========================================
// RENDER COURSE HERO
// ==========================================

function renderCourseHero() {
  const hero = document.getElementById('courseHero');
  if (!hero) return;

  const isFree = courseData.price === 0;
  const priceHTML = isFree
    ? `<span class="hero-price-value free"><i class="fas fa-gift"></i> FREE</span>`
    : `<span class="hero-price-value"><i class="fas fa-coins"></i> ${courseData.price}</span>`;

  const enrollBtnText = isEnrolled
    ? `<i class="fas fa-check"></i> Enrolled ✅`
    : isFree
      ? `<i class="fas fa-unlock"></i> Enroll Free`
      : `<i class="fas fa-coins"></i> Buy for ${courseData.price} Coins`;

  const enrollBtnClass = isEnrolled ? 'btn btn-primary hero-enroll-btn enrolled' : 'btn btn-primary hero-enroll-btn';

  hero.innerHTML = `
    <div class="hero-info">
      <div class="hero-category">
        <i class="fas fa-tag"></i>
        ${capitalize(courseData.category)}
      </div>
      <h1 class="hero-title">${courseData.title}</h1>
      <p class="hero-desc">${courseData.description}</p>

      <div class="hero-meta">
        <span class="hero-meta-item rating">
          <i class="fas fa-star"></i>
          ${courseData.rating} Rating
        </span>
        <span class="hero-meta-item">
          <i class="fas fa-users"></i>
          ${formatNumber(courseData.students)} Students
        </span>
        <span class="hero-meta-item">
          <i class="fas fa-play-circle"></i>
          ${courseData.lessons} Lessons
        </span>
        <span class="hero-meta-item">
          <i class="fas fa-clock"></i>
          ${courseData.duration}
        </span>
        <span class="hero-meta-item">
          <i class="fas fa-signal"></i>
          ${capitalize(courseData.level)}
        </span>
      </div>

      <div class="hero-author">
        <div class="hero-author-avatar">
          ${courseData.author.charAt(0).toUpperCase()}
        </div>
        <div class="hero-author-info">
          <strong>${courseData.author}</strong>
          <span>Course Creator</span>
        </div>
      </div>
    </div>

    <div class="hero-visual">
      <div class="hero-thumb ${courseData.color}">
        <i class="${courseData.icon}"></i>
      </div>
      <div class="hero-price-box">
        <span class="hero-price-label">Course Price</span>
        ${priceHTML}
      </div>
      <button class="${enrollBtnClass}" id="enrollBtn" ${isEnrolled ? 'disabled' : ''}>
        ${enrollBtnText}
      </button>
    </div>
  `;

  // Enroll button
  const enrollBtn = document.getElementById('enrollBtn');
  if (enrollBtn && !isEnrolled) {
    enrollBtn.addEventListener('click', () => openPurchaseModal());
  }
}

// ==========================================
// RENDER LESSONS LIST
// ==========================================

function renderLessonsList() {
  const list = document.getElementById('lessonsList');
  const countEl = document.getElementById('lessonsCount');
  if (!list) return;

  const lessons = courseData.lessonsList || [];
  const completedLessons = enrollmentData?.completedLessons || [];

  setText('lessonsCount', `${lessons.length} lessons • ${courseData.duration}`);

  // Update progress
  updateProgress(completedLessons.length, lessons.length);

  list.innerHTML = lessons.map((lesson, index) => {
    const isCompleted = completedLessons.includes(lesson.id);
    const isActive = index === currentLessonIndex;
    const isLocked = !isEnrolled && index > 0;

    return `
      <div class="lesson-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''} ${isLocked ? 'locked' : ''}"
           data-index="${index}"
           onclick="${isLocked ? 'showLockedToast()' : `selectLesson(${index})`}">
        <div class="lesson-num">
          <i class="fas fa-check"></i>
          <span>${index + 1}</span>
        </div>
        <div class="lesson-info">
          <span class="lesson-info-title">${lesson.title}</span>
          <span class="lesson-info-time">
            <i class="fas fa-clock"></i>
            ${lesson.duration}
            ${isLocked ? '🔒' : ''}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// RENDER LESSON CONTENT
// ==========================================

function renderLessonContent(index) {
  const contentArea = document.getElementById('contentArea');
  if (!contentArea) return;

  const lessons = courseData.lessonsList || [];
  const lesson = lessons[index];
  if (!lesson) return;

  currentLessonIndex = index;

  const completedLessons = enrollmentData?.completedLessons || [];
  const isCompleted = completedLessons.includes(lesson.id);
  const isLocked = !isEnrolled && index > 0;

  if (isLocked) {
    contentArea.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; min-height:400px; flex-direction:column; gap:20px; padding:40px; text-align:center;">
        <div style="font-size:4rem;">🔒</div>
        <h2>Enroll to Access</h2>
        <p style="color:var(--text-muted);">Purchase this course to unlock all lessons</p>
        <button class="btn btn-primary btn-large" onclick="openPurchaseModal()">
          <i class="fas fa-unlock"></i>
          ${courseData.price === 0 ? 'Enroll Free' : `Buy for ${courseData.price} Coins`}
        </button>
      </div>
    `;
    return;
  }

  const hasNext = index < lessons.length - 1;
  const hasPrev = index > 0;
  const hasVideo = lesson.hasVideo || lesson.videoId;
  const hasNotes = lesson.hasNotes || lesson.notes;

  // Build video section
  let videoSection = '';
  if (hasVideo && lesson.videoId) {
    videoSection = `
      <div class="lesson-video-wrapper">
        <iframe 
          src="https://www.youtube.com/embed/${lesson.videoId}?rel=0&modestbranding=1"
          title="${escapeHtml(lesson.title)}"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          referrerpolicy="strict-origin-when-cross-origin">
        </iframe>
      </div>
    `;
  } else {
    videoSection = `
      <div class="lesson-video-placeholder-wrap">
        <div class="lesson-video-placeholder-inner">
          <i class="fas fa-book-open" style="font-size:3rem;color:var(--primary);margin-bottom:12px;"></i>
          <h3>${hasNotes ? 'Read the notes below 📝' : 'No content yet'}</h3>
          <p>${hasNotes ? 'This lesson uses text notes' : 'Content coming soon!'}</p>
        </div>
      </div>
    `;
  }

  // Build notes section
  let notesSection = '';
  if (hasNotes && lesson.notes) {
    notesSection = `
      <div class="lesson-notes-view">
        <div class="notes-view-header">
          <h3><i class="fas fa-sticky-note"></i> Lesson Notes</h3>
        </div>
        <div class="notes-view-content">
          ${lesson.notes}
        </div>
      </div>
    `;
  }

  // Build tabs (only if both video and notes exist)
  let tabsSection = '';
  let contentSection = '';
  
  if (hasVideo && hasNotes) {
    // Both exist - show tabs
    tabsSection = `
      <div class="content-tabs">
        <button class="content-tab-btn active" data-tab="video">
          <i class="fas fa-video"></i> Video
        </button>
        <button class="content-tab-btn" data-tab="notes">
          <i class="fas fa-sticky-note"></i> Notes
        </button>
      </div>
    `;
    contentSection = `
      <div class="content-view-video active">
        ${videoSection}
      </div>
      <div class="content-view-notes">
        ${notesSection}
      </div>
    `;
  } else if (hasVideo) {
    // Only video
    contentSection = `
      <div class="content-view-video active">
        ${videoSection}
      </div>
    `;
  } else if (hasNotes) {
    // Only notes
    contentSection = `
      <div class="content-view-notes active">
        ${notesSection}
      </div>
    `;
  } else {
    // Nothing - show placeholder
    contentSection = `
      <div class="lesson-video-placeholder-wrap">
        <div class="lesson-video-placeholder-inner">
          <i class="fas fa-info-circle" style="font-size:3rem;color:var(--text-muted);margin-bottom:12px;"></i>
          <h3>No content added yet</h3>
          <p>The instructor hasn't added video or notes for this lesson</p>
        </div>
      </div>
    `;
  }

  contentArea.innerHTML = `
    ${tabsSection}
    <div class="lesson-content-wrapper">
      ${contentSection}
    </div>

    <div class="lesson-content-info">
      <div class="lesson-content-header">
        <div class="lesson-content-title">
          <h2>${escapeHtml(lesson.title)}</h2>
          <div class="lesson-content-meta">
            <span><i class="fas fa-clock"></i> ${lesson.duration}</span>
            <span><i class="fas fa-list"></i> Lesson ${index + 1} of ${lessons.length}</span>
            ${isCompleted ? '<span style="color:var(--green)"><i class="fas fa-check-circle"></i> Completed</span>' : ''}
          </div>
        </div>
        <button class="complete-lesson-btn ${isCompleted ? 'completed' : ''}"
                id="completeLessonBtn"
                onclick="completeLesson(${lesson.id})"
                ${isCompleted ? 'disabled' : ''}>
          ${isCompleted
            ? '<i class="fas fa-check"></i> Completed!'
            : `<i class="fas fa-check"></i> Mark Complete <span class="reward-tag">+10 🪙</span>`
          }
        </button>
      </div>

      <div class="lesson-actions">
        <button class="lesson-action-btn ai-btn" onclick="window.location.href='skill-ai.html'">
          <i class="fas fa-robot"></i>
          Ask Skill AI
        </button>
        <button class="nav-lesson-btn" onclick="selectLesson(${index - 1})" ${!hasPrev ? 'disabled' : ''}>
          <i class="fas fa-arrow-left"></i>
          Previous
        </button>
        <button class="nav-lesson-btn" onclick="selectLesson(${index + 1})" ${!hasNext ? 'disabled' : ''}>
          Next
          <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    </div>
  `;

  // Initialize tabs if both exist
  if (hasVideo && hasNotes) {
    initContentTabs();
  }
}

// ==========================================
// CONTENT TABS SWITCHER
// ==========================================
function initContentTabs() {
  const tabs = document.querySelectorAll('.content-tab-btn');
  const videoView = document.querySelector('.content-view-video');
  const notesView = document.querySelector('.content-view-notes');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      if (target === 'video') {
        videoView?.classList.add('active');
        notesView?.classList.remove('active');
      } else {
        notesView?.classList.add('active');
        videoView?.classList.remove('active');
      }
    });
  });
}

// ==========================================
// HELPER
// ==========================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================
// SELECT LESSON
// ==========================================

window.selectLesson = function(index) {
  const lessons = courseData.lessonsList || [];
  if (index < 0 || index >= lessons.length) return;

  currentLessonIndex = index;
  renderLessonContent(index);

  // Update active state in sidebar
  document.querySelectorAll('.lesson-item').forEach((item, i) => {
    item.classList.toggle('active', i === index);
  });

  // Scroll to top on mobile
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ==========================================
// PLAY LESSON
// ==========================================

window.playLesson = function() {
  showToast('info', 'Playing! ▶️', 'Video player coming in next update!');
};

// ==========================================
// COMPLETE LESSON
// ==========================================

window.completeLesson = async function(lessonId) {
  if (!isEnrolled) {
    openPurchaseModal();
    return;
  }

  const btn = document.getElementById('completeLessonBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner spin"></i> Saving...';
  }

  try {
    const completedLessons = enrollmentData?.completedLessons || [];

    if (completedLessons.includes(lessonId)) {
      showToast('info', 'Already Done!', 'You already completed this lesson!');
      return;
    }

    const newCompleted = [...completedLessons, lessonId];
    const total = courseData.lessonsList?.length || 0;
    const progress = Math.round((newCompleted.length / total) * 100);

    // Update enrollment
    const enrollRef = doc(db, 'enrollments', `${currentUser.uid}_${courseId}`);
    await setDoc(enrollRef, {
      completedLessons: newCompleted,
      progress: progress,
      lastAccessed: serverTimestamp()
    }, { merge: true });

    // Award coins (+10 per lesson)
    const newCoins = (userData.skillCoins || 0) + 10;
    const newXP = (userData.xp || 0) + 15;
    const newLevel = calculateLevel(newXP);
    const newTotalEarned = (userData.totalCoinsEarned || 0) + 10;

        // Track daily lesson completion for missions
    const today = new Date().toDateString();
    const lastLessonDate = userData.lastLessonCompletedDate;
    let dailyLessonsCompleted = userData.dailyLessonsCompleted || 0;
    
    if (lastLessonDate !== today) {
      // New day, reset counter
      dailyLessonsCompleted = 1;
    } else {
      dailyLessonsCompleted++;
    }

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      skillCoins: newCoins,
      xp: newXP,
      level: newLevel,
      totalCoinsEarned: newTotalEarned,
      dailyLessonsCompleted: dailyLessonsCompleted,
      lastLessonCompletedDate: today
    }, { merge: true });

    userData.dailyLessonsCompleted = dailyLessonsCompleted;
    userData.lastLessonCompletedDate = today;

    // Update local state
    userData.skillCoins = newCoins;
    userData.xp = newXP;
    userData.level = newLevel;
    if (!enrollmentData) enrollmentData = {};
    enrollmentData.completedLessons = newCompleted;

    // Update UI
    setText('coinAmount', formatNumber(newCoins));
    updateProgress(newCompleted.length, total);

    // Show reward
    showToast('coin', '+10 SkillCoins! 🪙', `Lesson completed! ${progress}% done!`);

    // Update button
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Completed!';
      btn.classList.add('completed');
    }

    // Update lessons list
    const lessonItem = document.querySelector(`.lesson-item[data-index="${currentLessonIndex}"]`);
    if (lessonItem) lessonItem.classList.add('completed');

    // Check if course completed
    if (newCompleted.length === total) {
      setTimeout(() => {
        completeCourse();
      }, 1500);
    } else {
      // Auto go to next lesson after 2s
      setTimeout(() => {
        if (currentLessonIndex < total - 1) {
          selectLesson(currentLessonIndex + 1);
        }
      }, 2000);
    }

  } catch (err) {
    console.error("❌ Error completing lesson:", err);
    showToast('error', 'Error!', 'Could not save progress');
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> Mark Complete <span class="reward-tag">+10 🪙</span>';
    }
  }
};

// ==========================================
// COMPLETE COURSE
// ==========================================

async function completeCourse() {
  try {
    console.log("🏆 Course completed!");

    const alreadyCompleted = userData.completedCourses?.includes(courseId);
    if (alreadyCompleted) {
      showCompletionModal();
      return;
    }

    // Award +100 coins for course completion
    const bonusCoins = 100;
    const newCoins = (userData.skillCoins || 0) + bonusCoins;
    const newTotalEarned = (userData.totalCoinsEarned || 0) + bonusCoins;
    const newCompleted = [...(userData.completedCourses || []), courseId];

    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      skillCoins: newCoins,
      totalCoinsEarned: newTotalEarned,
      completedCourses: newCompleted
    }, { merge: true });

    // Update enrollment
    const enrollRef = doc(db, 'enrollments', `${currentUser.uid}_${courseId}`);
    await setDoc(enrollRef, {
      completed: true,
      completedAt: serverTimestamp()
    }, { merge: true });

    userData.skillCoins = newCoins;
    userData.completedCourses = newCompleted;
    setText('coinAmount', formatNumber(newCoins));

    showCompletionModal();

  } catch (err) {
    console.error("❌ Course completion error:", err);
  }
}

// ==========================================
// PURCHASE MODAL
// ==========================================

window.openPurchaseModal = function() {
  const modal = document.getElementById('purchaseModal');
  if (!modal) return;

  const price = courseData.price;
  const balance = userData.skillCoins || 0;
  const afterBalance = balance - price;
  const isFree = price === 0;

  setText('purchaseTitle', isFree ? 'Enroll For Free!' : 'Buy This Course');
  setText('purchaseDesc', isFree
    ? 'Enroll and start learning immediately!'
    : 'Use your SkillCoins to unlock this course');
  setText('purchasePrice', isFree ? 'FREE 🎁' : `${price} 🪙`);
  setText('purchaseBalance', `${balance} 🪙`);
  setText('purchaseAfter', isFree ? `${balance} 🪙` : `${afterBalance} 🪙`);

  if (!isFree && afterBalance < 0) {
    const confirmBtn = document.getElementById('confirmPurchase');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<i class="fas fa-times"></i> Not Enough Coins!';
    }
    showToast('error', 'Not Enough Coins!', `You need ${Math.abs(afterBalance)} more coins!`);
  }

  modal.classList.add('active');
};

function initModals() {
  // Purchase modal
  const closePurchase = document.getElementById('closePurchase');
  const cancelPurchase = document.getElementById('cancelPurchase');
  const confirmPurchase = document.getElementById('confirmPurchase');

  if (closePurchase) closePurchase.addEventListener('click', () => {
    document.getElementById('purchaseModal').classList.remove('active');
  });

  if (cancelPurchase) cancelPurchase.addEventListener('click', () => {
    document.getElementById('purchaseModal').classList.remove('active');
  });

  if (confirmPurchase) confirmPurchase.addEventListener('click', () => {
    document.getElementById('purchaseModal').classList.remove('active');
    enrollInCourse();
  });

  // Completion modal
  const closeCompletion = document.getElementById('closeCompletion');
  if (closeCompletion) closeCompletion.addEventListener('click', () => {
    document.getElementById('completionModal').classList.remove('active');
    window.location.href = 'courses.html';
  });

  // Mobile lessons toggle
  const mobileLessonsBtn = document.getElementById('mobileLessonsBtn');
  const lessonsSidebar = document.getElementById('lessonsSidebar');
  const lessonsToggle = document.getElementById('lessonsToggle');

  if (mobileLessonsBtn) {
    mobileLessonsBtn.addEventListener('click', () => {
      lessonsSidebar.classList.add('active');
    });
  }

  if (lessonsToggle) {
    lessonsToggle.addEventListener('click', () => {
      lessonsSidebar.classList.remove('active');
    });
  }

  // Close on outside click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
}

function showCompletionModal() {
  const modal = document.getElementById('completionModal');
  if (modal) modal.classList.add('active');
}

// ==========================================
// ENROLL IN COURSE
// ==========================================

async function enrollInCourse() {
  try {
    console.log("🎓 Enrolling in course...");

    const price = courseData.price;
    const balance = userData.skillCoins || 0;

    if (price > 0 && balance < price) {
      showToast('error', 'Not Enough Coins!', `You need ${price - balance} more coins!`);
      return;
    }

    // Deduct coins (if paid)
    if (price > 0) {
      const newCoins = balance - price;
      const newTotalSpent = (userData.totalCoinsSpent || 0) + price;

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        skillCoins: newCoins,
        totalCoinsSpent: newTotalSpent,
        purchasedCourses: [...(userData.purchasedCourses || []), courseId]
      }, { merge: true });

      userData.skillCoins = newCoins;
      userData.totalCoinsSpent = newTotalSpent;
      setText('coinAmount', formatNumber(newCoins));

      // Pay author coins
      if (courseData.authorId && courseData.authorId !== 'skillcoin_official') {
        await payAuthor(courseData.authorId, price, courseData.title);
      }
    } else {
      // Free course
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        purchasedCourses: [...(userData.purchasedCourses || []), courseId]
      }, { merge: true });
    }

    // Create enrollment document
    const enrollRef = doc(db, 'enrollments', `${currentUser.uid}_${courseId}`);
    await setDoc(enrollRef, {
      userId: currentUser.uid,
      courseId: courseId,
      courseTitle: courseData.title,
      enrolledAt: serverTimestamp(),
      completedLessons: [],
      progress: 0,
      completed: false
    });

    isEnrolled = true;
    enrollmentData = {
      completedLessons: [],
      progress: 0
    };

    showToast('success', '🎉 Enrolled!', `You are now enrolled in ${courseData.title}!`);

    // Refresh UI
    renderCourseHero();
    renderLessonsList();
    renderLessonContent(0);

  } catch (err) {
    console.error("❌ Enrollment error:", err);
    showToast('error', 'Error!', 'Could not enroll in course');
  }
}

// ==========================================
// PAY AUTHOR
// ==========================================

async function payAuthor(authorId, amount, courseTitle) {
  try {
    const authorRef = doc(db, 'users', authorId);
    const authorSnap = await getDoc(authorRef);
    if (!authorSnap.exists()) return;

    const authorData = authorSnap.data();
    const newCoins = (authorData.skillCoins || 0) + amount;
    const newTotal = (authorData.totalCoinsEarned || 0) + amount;

    await setDoc(authorRef, {
      skillCoins: newCoins,
      totalCoinsEarned: newTotal
    }, { merge: true });

    console.log(`✅ Author paid: +${amount} coins for "${courseTitle}"`);
  } catch (err) {
    console.error("❌ Error paying author:", err);
  }
}

// ==========================================
// UPDATE PROGRESS
// ==========================================

function updateProgress(completed, total) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const progressFill = document.getElementById('progressFill');
  const progressPercent = document.getElementById('progressPercent');
  const progressInfo = document.getElementById('progressInfo');

  if (progressFill) progressFill.style.width = percent + '%';
  if (progressPercent) progressPercent.textContent = percent + '%';
  if (progressInfo) progressInfo.textContent = `${completed} of ${total} lessons completed`;
}

// ==========================================
// SHOW LOCKED TOAST
// ==========================================

window.showLockedToast = function() {
  showToast('info', '🔒 Locked!', 'Enroll in this course to unlock all lessons!');
};

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
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function calculateLevel(xp) {
  return Math.floor(xp / 500) + 1;
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
