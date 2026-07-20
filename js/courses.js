// ==========================================
// SKILLCOIN — Courses Page Logic
// ==========================================

import {
  auth,
  db,
  signOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  serverTimestamp
} from './firebase-config.js';

console.log("📚 courses.js loaded!");

// Global State
let currentUser = null;
let userData = null;
let allCourses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentSort = 'popular';
let currentLevel = 'all';
let currentSearch = '';

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Courses page loaded");

  initToasts();
  initSidebar();
  initLogout();
  initFilters();
  initSearch();
  initSeedButton();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      await loadUserData();
      await loadCourses();
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
// SMART CACHE WITH 30-MIN EXPIRY ⚡
// Saves 95% database reads!
// ==========================================

async function loadCourses() {
  try {
    const CACHE_KEY = 'skillcoin_courses_cache';
    const CACHE_TIME_KEY = 'skillcoin_courses_time';
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
    
    const cachedCourses = sessionStorage.getItem(CACHE_KEY);
    const cachedTime = sessionStorage.getItem(CACHE_TIME_KEY);
    const now = Date.now();
    const cacheAge = cachedTime ? (now - parseInt(cachedTime)) : Infinity;
    
    // Use cache if fresh (less than 30 mins old)
    if (cachedCourses && cacheAge < CACHE_DURATION) {
      const minutesOld = Math.floor(cacheAge / 60000);
      const secondsOld = Math.floor((cacheAge % 60000) / 1000);
      allCourses = JSON.parse(cachedCourses);
      console.log(`⚡ CACHE HIT: ${allCourses.length} courses (${minutesOld}m ${secondsOld}s old, 0 DB reads!) 🎉`);
    } else {
      // Cache expired or empty → Fetch fresh
      console.log("📥 Cache expired/empty, fetching fresh courses from Firestore...");
      const coursesRef = collection(db, 'courses');
      const snapshot = await getDocs(coursesRef);
      
      allCourses = [];
      snapshot.forEach(docSnap => {
        allCourses.push({ id: docSnap.id, ...docSnap.data() });
      });
      
      // Save to cache with current timestamp
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(allCourses));
      sessionStorage.setItem(CACHE_TIME_KEY, now.toString());
      console.log(`✅ Fresh load: ${allCourses.length} courses (cached for 30 mins)`);
    }
    
    setText('totalCourses', allCourses.length);
    
    if (allCourses.length === 0) {
      showSeedNotice();
    } else {
      hideSeedNotice();
      applyFilters();
    }
  } catch (err) {
    console.error("❌ Error loading courses:", err);
    showToast('error', 'Error!', 'Could not load courses');
  }
}

// ==========================================
// SEED DATA (Add 20 Sample Courses)
// ==========================================

const SAMPLE_COURSES = [
  {
    title: "Python for Absolute Beginners",
    description: "Learn Python from scratch. No coding experience required!",
    category: "programming",
    level: "beginner",
    price: 150,
    author: "SkillCoin Team",
    icon: "fab fa-python",
    color: "purple",
    rating: 4.9,
    students: 1240,
    lessons: 24,
    duration: "8 hours",
    featured: true,
    tags: ["python", "coding", "beginner"]
  },
  {
    title: "JavaScript Mastery",
    description: "Master modern JavaScript ES6+ features and build real projects.",
    category: "programming",
    level: "intermediate",
    price: 250,
    author: "SkillCoin Team",
    icon: "fab fa-js",
    color: "gold",
    rating: 4.8,
    students: 2130,
    lessons: 40,
    duration: "12 hours",
    featured: true,
    tags: ["javascript", "web", "es6"]
  },
  {
    title: "UI/UX Design Fundamentals",
    description: "Learn design thinking, user research and prototyping basics.",
    category: "design",
    level: "beginner",
    price: 200,
    author: "SkillCoin Team",
    icon: "fas fa-paint-brush",
    color: "teal",
    rating: 4.7,
    students: 890,
    lessons: 20,
    duration: "6 hours",
    featured: false,
    tags: ["ui", "ux", "design"]
  },
  {
    title: "Digital Marketing 101",
    description: "Start your digital marketing career with this complete guide.",
    category: "marketing",
    level: "beginner",
    price: 0,
    author: "SkillCoin Team",
    icon: "fas fa-bullhorn",
    color: "red",
    rating: 4.6,
    students: 650,
    lessons: 15,
    duration: "5 hours",
    featured: false,
    tags: ["marketing", "digital", "seo"]
  },
  {
    title: "React.js Complete Guide",
    description: "Build modern web apps with React, hooks, and Redux.",
    category: "programming",
    level: "intermediate",
    price: 250,
    author: "SkillCoin Team",
    icon: "fab fa-react",
    color: "blue",
    rating: 4.9,
    students: 3200,
    lessons: 50,
    duration: "15 hours",
    featured: true,
    tags: ["react", "javascript", "web"]
  },
  {
    title: "Graphic Design with Figma",
    description: "Master Figma for stunning UI/UX and graphic designs.",
    category: "design",
    level: "beginner",
    price: 180,
    author: "SkillCoin Team",
    icon: "fab fa-figma",
    color: "pink",
    rating: 4.8,
    students: 1100,
    lessons: 25,
    duration: "8 hours",
    featured: false,
    tags: ["figma", "design", "ui"]
  },
  {
    title: "Business Strategy Basics",
    description: "Learn how successful businesses plan and execute strategies.",
    category: "business",
    level: "intermediate",
    price: 220,
    author: "SkillCoin Team",
    icon: "fas fa-briefcase",
    color: "gold",
    rating: 4.5,
    students: 780,
    lessons: 18,
    duration: "6 hours",
    featured: false,
    tags: ["business", "strategy"]
  },
  {
    title: "English Speaking Mastery",
    description: "Speak English confidently in any situation.",
    category: "language",
    level: "beginner",
    price: 0,
    author: "SkillCoin Team",
    icon: "fas fa-language",
    color: "green",
    rating: 4.7,
    students: 4500,
    lessons: 30,
    duration: "10 hours",
    featured: true,
    tags: ["english", "speaking"]
  },
  {
    title: "Data Science with Python",
    description: "Learn data analysis, visualization, and machine learning.",
    category: "programming",
    level: "advanced",
    price: 250,
    author: "SkillCoin Team",
    icon: "fas fa-chart-line",
    color: "purple",
    rating: 4.9,
    students: 1890,
    lessons: 45,
    duration: "18 hours",
    featured: true,
    tags: ["data", "python", "ml"]
  },
  {
    title: "SEO Complete Course",
    description: "Rank #1 on Google with proven SEO techniques.",
    category: "marketing",
    level: "intermediate",
    price: 180,
    author: "SkillCoin Team",
    icon: "fas fa-search",
    color: "orange",
    rating: 4.6,
    students: 920,
    lessons: 22,
    duration: "7 hours",
    featured: false,
    tags: ["seo", "marketing", "google"]
  },
  {
    title: "Photography Basics",
    description: "Take stunning photos with any camera or smartphone.",
    category: "lifestyle",
    level: "beginner",
    price: 100,
    author: "SkillCoin Team",
    icon: "fas fa-camera",
    color: "teal",
    rating: 4.7,
    students: 1350,
    lessons: 20,
    duration: "6 hours",
    featured: false,
    tags: ["photo", "camera"]
  },
  {
    title: "Physics for Class 12",
    description: "Complete physics for board exams and competitive tests.",
    category: "science",
    level: "intermediate",
    price: 0,
    author: "SkillCoin Team",
    icon: "fas fa-atom",
    color: "blue",
    rating: 4.8,
    students: 2100,
    lessons: 60,
    duration: "20 hours",
    featured: false,
    tags: ["physics", "science", "school"]
  },
  {
    title: "Chemistry Made Easy",
    description: "Understand chemistry concepts with clear explanations.",
    category: "science",
    level: "intermediate",
    price: 0,
    author: "SkillCoin Team",
    icon: "fas fa-flask",
    color: "green",
    rating: 4.7,
    students: 1700,
    lessons: 55,
    duration: "18 hours",
    featured: false,
    tags: ["chemistry", "science"]
  },
  {
    title: "Freelancing Success Guide",
    description: "Start earning as a freelancer from day one.",
    category: "business",
    level: "beginner",
    price: 150,
    author: "SkillCoin Team",
    icon: "fas fa-laptop-house",
    color: "gold",
    rating: 4.8,
    students: 1450,
    lessons: 18,
    duration: "6 hours",
    featured: false,
    tags: ["freelance", "business"]
  },
  {
    title: "HTML & CSS from Scratch",
    description: "Build beautiful websites with HTML5 and CSS3.",
    category: "programming",
    level: "beginner",
    price: 0,
    author: "SkillCoin Team",
    icon: "fab fa-html5",
    color: "orange",
    rating: 4.9,
    students: 5200,
    lessons: 30,
    duration: "10 hours",
    featured: true,
    tags: ["html", "css", "web"]
  },
  {
    title: "Yoga for Beginners",
    description: "Start your yoga journey with easy poses and breathing.",
    category: "lifestyle",
    level: "beginner",
    price: 80,
    author: "SkillCoin Team",
    icon: "fas fa-spa",
    color: "pink",
    rating: 4.9,
    students: 2800,
    lessons: 15,
    duration: "5 hours",
    featured: false,
    tags: ["yoga", "health", "wellness"]
  },
  {
    title: "Spanish for Travel",
    description: "Learn essential Spanish for your next trip.",
    category: "language",
    level: "beginner",
    price: 120,
    author: "SkillCoin Team",
    icon: "fas fa-globe",
    color: "red",
    rating: 4.6,
    students: 890,
    lessons: 20,
    duration: "7 hours",
    featured: false,
    tags: ["spanish", "language", "travel"]
  },
  {
    title: "Node.js Backend Development",
    description: "Build scalable backend APIs with Node.js and Express.",
    category: "programming",
    level: "advanced",
    price: 250,
    author: "SkillCoin Team",
    icon: "fab fa-node-js",
    color: "green",
    rating: 4.8,
    students: 1650,
    lessons: 42,
    duration: "14 hours",
    featured: false,
    tags: ["node", "backend", "api"]
  },
  {
    title: "Social Media Marketing",
    description: "Grow your brand on Instagram, TikTok, and YouTube.",
    category: "marketing",
    level: "beginner",
    price: 200,
    author: "SkillCoin Team",
    icon: "fas fa-hashtag",
    color: "pink",
    rating: 4.7,
    students: 1980,
    lessons: 25,
    duration: "8 hours",
    featured: true,
    tags: ["social", "marketing", "instagram"]
  },
  {
    title: "Mindfulness & Meditation",
    description: "Reduce stress and improve focus through meditation.",
    category: "lifestyle",
    level: "beginner",
    price: 0,
    author: "SkillCoin Team",
    icon: "fas fa-brain",
    color: "purple",
    rating: 4.9,
    students: 3400,
    lessons: 12,
    duration: "4 hours",
    featured: false,
    tags: ["meditation", "mindfulness"]
  }
];

async function seedCourses() {
  const btn = document.getElementById('seedBtn');
  if (!btn) return;

  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner spin"></i> Loading Courses...';
  btn.disabled = true;

  try {
    console.log("🌱 Seeding courses...");
    
    for (let i = 0; i < SAMPLE_COURSES.length; i++) {
      const course = SAMPLE_COURSES[i];
      const courseId = `course_${Date.now()}_${i}`;
      const courseRef = doc(db, 'courses', courseId);
      
      await setDoc(courseRef, {
        ...course,
        authorId: 'skillcoin_official',
        thumbnail: '',
        createdAt: serverTimestamp(),
        lessonsList: generateLessonsList(course.lessons)
      });
    }

    console.log("✅ 20 courses added to Firestore!");
    showToast('success', '🎉 Success!', '20 sample courses loaded!');

    // Reload courses
    await loadCourses();
  } catch (err) {
    console.error("❌ Seeding error:", err);
    showToast('error', 'Error!', 'Failed to load courses');
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function generateLessonsList(count) {
  const lessons = [];
  for (let i = 1; i <= count; i++) {
    lessons.push({
      id: i,
      title: `Lesson ${i}`,
      duration: `${Math.floor(Math.random() * 15) + 5} min`,
      completed: false
    });
  }
  return lessons;
}

function initSeedButton() {
  const btn = document.getElementById('seedBtn');
  if (btn) {
    btn.addEventListener('click', seedCourses);
  }
}

function showSeedNotice() {
  const notice = document.getElementById('seedNotice');
  const grid = document.getElementById('coursesGrid');
  const info = document.getElementById('resultsInfo');
  if (notice) notice.style.display = 'block';
  if (grid) grid.innerHTML = '';
  if (info) info.style.display = 'none';
}

function hideSeedNotice() {
  const notice = document.getElementById('seedNotice');
  const info = document.getElementById('resultsInfo');
  if (notice) notice.style.display = 'none';
  if (info) info.style.display = 'flex';
}

// ==========================================
// RENDER COURSES
// ==========================================

function renderCourses(courses) {
  const grid = document.getElementById('coursesGrid');
  const emptyState = document.getElementById('emptyState');
  const resultsCount = document.getElementById('resultsCount');

  if (!grid) return;

  if (courses.length === 0) {
    grid.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    if (resultsCount) resultsCount.innerHTML = 'No courses found';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (resultsCount) {
    resultsCount.innerHTML = `Showing <strong>${courses.length}</strong> of <strong>${allCourses.length}</strong> courses`;
  }

  grid.innerHTML = courses.map(course => createCourseCard(course)).join('');

  // Add click listeners
  document.querySelectorAll('.course-card').forEach(card => {
    card.addEventListener('click', () => {
      const courseId = card.getAttribute('data-id');
      openCourse(courseId);
    });
  });
}

function createCourseCard(course) {
  const isEnrolled = userData?.purchasedCourses?.includes(course.id) || false;
  const isFree = course.price === 0;

  const priceHTML = isFree
    ? `<span class="course-card-price free">FREE</span>`
    : `<span class="course-card-price paid"><i class="fas fa-coins"></i> ${course.price}</span>`;

  const btnHTML = isEnrolled
    ? `<button class="course-card-btn enrolled"><i class="fas fa-check"></i> Enrolled</button>`
    : `<button class="course-card-btn">${isFree ? 'Enroll' : 'Buy Now'} <i class="fas fa-arrow-right"></i></button>`;

  const featuredBadge = course.featured
    ? `<div class="course-featured"><i class="fas fa-crown"></i> Featured</div>`
    : '';

  const levelBadge = `<div class="course-level-badge">${capitalize(course.level)}</div>`;

  return `
    <div class="course-card" data-id="${course.id}">
      <div class="course-card-thumb ${course.color}">
        ${levelBadge}
        ${featuredBadge}
        <i class="${course.icon}"></i>
      </div>
      <div class="course-card-body">
        <span class="course-card-category">${capitalize(course.category)}</span>
        <h3 class="course-card-title">${course.title}</h3>
        <div class="course-card-author">
          <i class="fas fa-user-circle"></i>
          <span>${course.author}</span>
        </div>
        <div class="course-card-meta">
          <span class="rating"><i class="fas fa-star"></i> ${course.rating}</span>
          <span class="students"><i class="fas fa-users"></i> ${formatNumber(course.students)}</span>
          <span class="lessons"><i class="fas fa-play-circle"></i> ${course.lessons}</span>
        </div>
      </div>
      <div class="course-card-footer">
        ${priceHTML}
        ${btnHTML}
      </div>
    </div>
  `;
}

// ==========================================
// FILTERS
// ==========================================

function initFilters() {
  // Category tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-category');
      applyFilters();
    });
  });

  // Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      applyFilters();
    });
  }

  // Level
  const levelSelect = document.getElementById('levelSelect');
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      currentLevel = levelSelect.value;
      applyFilters();
    });
  }
}

function applyFilters() {
  let result = [...allCourses];

  // Category filter
  if (currentCategory !== 'all') {
    result = result.filter(c => c.category === currentCategory);
  }

  // Level filter
  if (currentLevel !== 'all') {
    result = result.filter(c => c.level === currentLevel);
  }

  // Search filter
  if (currentSearch) {
    const query = currentSearch.toLowerCase();
    result = result.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(query)))
    );
  }

  // Sort
  switch (currentSort) {
    case 'newest':
      result.reverse();
      break;
    case 'rating':
      result.sort((a, b) => b.rating - a.rating);
      break;
    case 'price-low':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      result.sort((a, b) => b.price - a.price);
      break;
    case 'free':
      result.sort((a, b) => a.price - b.price);
      break;
    case 'popular':
    default:
      result.sort((a, b) => b.students - a.students);
      break;
  }

  filteredCourses = result;
  renderCourses(filteredCourses);
}

// ==========================================
// SEARCH
// ==========================================

function initSearch() {
  const search = document.getElementById('courseSearch');
  if (!search) return;

  let timeout;
  search.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      currentSearch = e.target.value.trim();
      applyFilters();
    }, 300);
  });
}

// ==========================================
// OPEN COURSE
// ==========================================

function openCourse(courseId) {
  window.location.href = `course-view.html?id=${courseId}`;
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
  return str.charAt(0).toUpperCase() + str.slice(1);
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
