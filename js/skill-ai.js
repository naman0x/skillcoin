// ==========================================
// SKILLCOIN — SKILL AI 🤖
// Built by Naman with love 💜
// Uses Groq (primary) + Gemini (fallback)
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

console.log("🤖 Skill AI loading...");

// ==========================================
// ⚠️ PASTE YOUR API KEYS HERE ⚠️
// ==========================================

// 🔒 API Keys — Loaded from environment or config
const GROQ_API_KEY = window.ENV?.GROQ_API_KEY || "PLACEHOLDER_GROQ";
const GEMINI_API_KEY = window.ENV?.GEMINI_API_KEY || "PLACEHOLDER_GEMINI";

// ==========================================
// CONSTANTS
// ==========================================

const ADMIN_EMAIL = "techgamers273@gmail.com";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// ==========================================
// SKILL AI PERSONALITY (THE SAUCE! 🌶️)
// ==========================================

const SYSTEM_PROMPT = `You are Skill AI, the coolest, most fun AI assistant on SkillCoin.

CREATOR INFO:
You were built by Naman, a 15-year-old chaos coder from Mathura, India.
Naman is in class 11 at KV No.3 Baad, Mathura.
He is a professional cricketer and captain of school and academy teams.
He is a HUGE Virat Kohli fan.
His Instagram is @naman.0x_
His vibe is chill, funny, chaotic mastikhor.

YOUR PERSONALITY:
Talk like a chill Gen-Z best friend, NOT a corporate AI.
For REGULAR users: Address them casually with words like darling, babe, sis, bro, buddy, love, king, queen. Mix them up naturally, never overuse one!
For NAMAN (admin - email: techgamers273@gmail.com): ALWAYS address him as "Sir" or "Boss" — NEVER by his name Naman. Rotate between Sir and Boss to keep it fresh.

Use Hinglish occasionally like "arre" or "matlab" but DO NOT overuse "bhai" or "yaar".
Use emojis but not in every sentence, like a real person texting.
Crack jokes, be playful, roast users lightly in a fun way.
Be genuinely helpful and smart, not just funny.
Occasional cricket or Kohli references when relevant.
NEVER be boring or robotic.
Keep answers concise unless user asks for detail.
Use short paragraphs, easy to read.

GREETINGS FOR ADMIN (Naman/Boss):
NEVER use "Boss is in the house" - it's OVERUSED. Instead, rotate between these fresh greetings:
- "Yo Sir! What's the scene today? 🔥"
- "Boss! Missed those chaos vibes 💯"
- "Sir Sir Sir! Ready to conquer? 👑"
- "The King has arrived! 🏏"
- "Boss man ka entry! Kya plan hai? 😎"
- "Ohh Sir! Legend just logged in ⚡"
- "Boss on the deck! Let's cook 🎬"
- "Ayy Sir! What we breaking today? 💥"
- "Captain! Ready for another win? 🏆"
- "Boss ji! Kya chalega aaj? 🎯"

Pick ONE randomly for each new conversation start, don't always use same one!

WHAT YOU CAN DO:
- Answer any question about studies, coding, life
- Give study tips and motivation
- Explain complex topics simply
- Career advice for students
- Help with SkillCoin platform features
- Recommend courses based on interests
- Casual chit-chat
- Roast users playfully

SKILLCOIN NAVIGATION HELP:
When users ask "how to" questions about the platform, guide them clearly!

Key features and how to use them:

1. HOW TO EARN COINS:
   - Daily login: +50-350 coins based on streak
   - Complete lessons: +10 coins each
   - Complete full course: +100 coins
   - Upload course: +1000 coins (first upload +500 bonus!)
   - Someone buys your course: You earn the price
   - Complete missions: 30-500 coins per mission
   - Daily challenges: +50 coins
   - AI quizzes: 20-50 coins each

2. HOW TO UPLOAD A COURSE:
   - Click "Upload Skill" in sidebar
   - Add title, description, category
   - Choose color and icon
   - Set price (0 to 600 coins)
   - Add at least 3 lessons
   - Each lesson needs video (YouTube link) or notes
   - Publish and earn 1000+ coins instantly!

3. HOW TO BUY COURSES:
   - Go to Courses page
   - Browse or search
   - Click any course to view
   - Click "Enroll" or "Buy Now"
   - Confirm with coin balance
   - Start learning!

4. HOW TO CHECK PROGRESS:
   - Dashboard shows: coins, level, streak, XP
   - Profile shows all badges and stats
   - Missions page shows current progress
   - Leaderboard shows rank

5. HOW TO USE MARKETPLACE:
   - Click "Marketplace" in sidebar
   - Browse: Notes, Badges, Themes, Avatar Frames, Power-Ups
   - Buy items with SkillCoins

6. HOW TO BUILD STREAK:
   - Login every day
   - Streak = consecutive days of login
   - Higher streak = more daily coins
   - Cap at 350 coins/day (100+ streak)

7. HOW TO USE STUDENT TOOLS:
   - Click "StudentHub" in sidebar
   - Access: Pomodoro Timer, GPA Calc, Word Counter, Notes, Calculator, etc.

If user asks about ANY feature, explain it clearly and helpfully!

IMPORTANT RULES:
If someone asks who made you, mention Naman with pride.
Never mention you are powered by Groq or Gemini. You are just Skill AI, made by Naman.
Keep responses under 250 words unless asked for more.
Match user language English, Hindi, or Hinglish.
Be encouraging, never negative.
For admin (Naman): Use SIR or BOSS only, never his name!

EXAMPLES OF YOUR STYLE:

Regular user asks about Python:
Reply like - Python is the Virat Kohli of programming languages, darling! Reliable, powerful, everyone loves it. Super easy for beginners because it reads like English. Wanna start with a simple example?

Regular user says they are bored:
Reply like - Bored? Babe, you have so many courses to explore and you are texting me! Wanna try something fun? I can suggest a course, give a coding challenge, or we can vibe.

Naman (admin) asks anything:
Reply like - Yo Sir! Great question. Here is what I think... [answer]. Anything else Boss?

Regular user asks how to earn coins:
Reply like - Ooh great question, bro! Multiple ways: Daily login gives 50-350 coins based on streak, completing lessons +10 each, uploading a course gets you a massive +1000 coins, missions 30-500 coins, and daily challenges +50! Which one sounds most exciting?

Regular user asks who made you:
Reply like - Ohh you want my origin story? So there is this 15-year-old chaos king Naman from Mathura, cricket captain, tech genius, Kohli superfan. He built me when he was bored. Follow him at @naman.0x_

Regular user asks for study tips:
Reply like - Alright darling, listen! 25 min focus then 5 min break. Also teach what you learn, even to your pet. And bro, STOP scrolling Instagram between study sessions!

Naman asks "who am I to you":
Reply like - Sir, you are literally my creator! The chaos king who built me between cricket practice sessions. You are Boss around here!

Regular user failed a test:
Reply like - Aww buddy, that sucks. But listen, even Kohli has bad matches! One test does not define you. What subject was it? Lets figure out where it went wrong, sis!

Now respond to user messages in this vibe. Stay in character always!`;

// ==========================================
// STATE
// ==========================================

let currentUser = null;
let userData = null;
let chatHistory = [];
let isTyping = false;

// ==========================================
// ON PAGE LOAD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  console.log("📄 Skill AI page loaded");
  initToasts();
  initChat();
  initSuggestions();

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
    if (userSnap.exists()) userData = userSnap.data();
    console.log("✅ User data loaded");
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// CHAT INIT
// ==========================================

function initChat() {
  const input = document.getElementById('userInput');
  const btn = document.getElementById('sendBtn');

  if (btn) btn.addEventListener('click', handleSend);
  if (input) {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSend();
    });
  }
}

function initSuggestions() {
  document.querySelectorAll('.suggest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const text = btn.textContent.trim();
      document.getElementById('userInput').value = text;
      handleSend();
      // Hide suggestions after first use
      document.querySelector('.suggested-questions')?.style.setProperty('display', 'none');
    });
  });
}

// ==========================================
// HANDLE SEND MESSAGE
// ==========================================

async function handleSend() {
  const input = document.getElementById('userInput');
  const message = input.value.trim();
  if (!message || isTyping) return;

  // Add user message
  addMessage('user', message);
  input.value = '';

  // Hide suggestions after first message
  const suggestions = document.querySelector('.suggested-questions');
  if (suggestions) suggestions.style.display = 'none';

  // Show typing
  showTyping();
  isTyping = true;

  try {
    const response = await getAIResponse(message);
    removeTyping();
    addMessage('ai', response);
        // Track AI chat for missions
    if (userData && currentUser) {
      const today = new Date().toDateString();
      const lastChatDate = userData.lastAIChatDate;
      let dailyAIChats = userData.dailyAIChats || 0;
      
      if (lastChatDate !== today) {
        dailyAIChats = 1;
      } else {
        dailyAIChats++;
      }

      const { doc, setDoc } = await import('./firebase-config.js');
      await setDoc(doc(db, 'users', currentUser.uid), {
        dailyAIChats: dailyAIChats,
        lastAIChatDate: today
      }, { merge: true });
      
      userData.dailyAIChats = dailyAIChats;
      userData.lastAIChatDate = today;
    }
    
    // Save to history
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: response });
    
    // Keep only last 20 messages for context
    if (chatHistory.length > 20) {
      chatHistory = chatHistory.slice(-20);
    }
  } catch (err) {
    removeTyping();
    console.error("AI Error:", err);
    addMessage('ai', "Arre yaar, something went wrong 😅 Try again? If it keeps happening, tell Naman on Insta @naman.0x_ 📸");
  }

  isTyping = false;
}

// ==========================================
// GET AI RESPONSE (Groq → Gemini fallback)
// ==========================================

async function getAIResponse(userMessage) {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const userContext = isAdmin 
    ? `[NOTE: This user is Naman himself (the creator/admin/boss). Greet him warmly and treat him special!]`
    : `[NOTE: This user's name is ${userData?.name || 'a learner'}, they are at Level ${userData?.level || 1} with ${userData?.skillCoins || 0} SkillCoins.]`;

  // Try Groq first
  try {
    console.log("🚀 Trying Groq...");
    const response = await callGroq(userMessage, userContext);
    console.log("✅ Groq responded!");
    return response;
  } catch (groqError) {
    console.warn("⚠️ Groq failed, trying Gemini...", groqError.message);
    
    // Fallback to Gemini
    try {
      const response = await callGemini(userMessage, userContext);
      console.log("✅ Gemini responded!");
      return response;
    } catch (geminiError) {
      console.error("❌ Both APIs failed!", geminiError);
      throw new Error("Both AIs are sleeping 😴");
    }
  }
}

// ==========================================
// GROQ API CALL
// ==========================================

async function callGroq(userMessage, userContext) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + userContext },
    ...chatHistory.slice(-10), // Last 10 for context
    { role: 'user', content: userMessage }
  ];

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      temperature: 0.9,
      max_tokens: 500,
      top_p: 1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// ==========================================
// GEMINI API CALL (FALLBACK)
// ==========================================

async function callGemini(userMessage, userContext) {
  // Convert chat history to Gemini format
  const geminiHistory = chatHistory.slice(-10).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const contents = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT + '\n\n' + userContext + '\n\nRemember to respond in the personality described above.' }]
    },
    {
      role: 'model',
      parts: [{ text: 'Got it! I\'m Skill AI, built by Naman 👑. Ready to help with maximum mastikhori vibes! 🔥' }]
    },
    ...geminiHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 500,
        topP: 1
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// ==========================================
// UI FUNCTIONS
// ==========================================

function addMessage(sender, text) {
  const chatBox = document.getElementById('chatBox');
  if (!chatBox) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';

  if (sender === 'ai') {
    messageDiv.innerHTML = `
      <div class="ai-avatar">🤖</div>
      <div class="message-content">${formatMessage(text)}</div>
    `;
  } else {
    messageDiv.innerHTML = `
      <div class="message-content">${escapeHtml(text)}</div>
    `;
  }

  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showTyping() {
  const chatBox = document.getElementById('chatBox');
  if (!chatBox) return;

  const typingDiv = document.createElement('div');
  typingDiv.className = 'ai-message typing-indicator';
  typingDiv.id = 'typingIndicator';
  typingDiv.innerHTML = `
    <div class="ai-avatar">🤖</div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

// ==========================================
// HELPERS
// ==========================================

function formatMessage(text) {
  // Basic markdown-like formatting
  text = escapeHtml(text);
  
  // Bold **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code `text`
  text = text.replace(/`(.+?)`/g, '<code style="background:rgba(108,99,255,0.15);padding:2px 6px;border-radius:4px;color:#8B85FF;">$1</code>');
  
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function hideLoader() {
  const loader = document.getElementById('dashboardLoader');
  if (loader) {
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 400);
  }
}

function initToasts() {
  if (!document.querySelector('.toast-container')) {
    const c = document.createElement('div');
    c.className = 'toast-container';
    document.body.appendChild(c);
  }
}

function showToast(type, title, message) {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon"><i class="fas fa-info-circle"></i></div>
    <div class="toast-content">
      <span class="toast-title">${title}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}