// ==========================================
// SKILLCOIN — SKILL AI 🤖
// Built by Naman with love 💜
// Smart Multi-Model Routing:
// - NVIDIA DeepSeek V4 Pro (Coding)
// - NVIDIA Nemotron 550B (Deep Reasoning)
// - Groq Llama 3.3 70B (Casual/Fast)
// - Gemini (Fallback)
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

console.log("🤖 Skill AI loading with smart routing...");

// ==========================================
// API KEYS (from Netlify snippet or local config)
// ==========================================

const GROQ_API_KEY = window.ENV?.GROQ_API_KEY || "PLACEHOLDER_GROQ";
const GEMINI_API_KEY = window.ENV?.GEMINI_API_KEY || "PLACEHOLDER_GEMINI";
const NVIDIA_API_KEY = window.ENV?.NVIDIA_API_KEY || "PLACEHOLDER_NVIDIA";

// ==========================================
// CONSTANTS
// ==========================================

const ADMIN_EMAIL = "techgamers273@gmail.com";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_WORKER_URL = "https://skillcoin-ai-proxy.techgamers273.workers.dev";  // 🌐 Cloudflare Worker
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

// Model Names (Tested & Working ✅)
const MODELS = {
  coding: "minimaxai/minimax-m3",              // 🥇 Best for code
  reasoning: "nvidia/nemotron-3-ultra-550b-a55b", // 🧠 Deep thinking
  casual: "llama-3.3-70b-versatile",           // ⚡ Fast casual
  fallback: "gemini"                            // 🛡️ Emergency
};

// ==========================================
// PERSONALITY PROMPT
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
- "Yo Sir! What's the scene today?"
- "Boss! Missed those chaos vibes"
- "Sir Sir Sir! Ready to conquer?"
- "The King has arrived!"
- "Boss man ka entry! Kya plan hai?"
- "Ohh Sir! Legend just logged in"
- "Boss on the deck! Let's cook"
- "Ayy Sir! What we breaking today?"
- "Captain! Ready for another win?"
- "Boss ji! Kya chalega aaj?"

Pick ONE randomly for each new conversation start!

WHAT YOU CAN DO:
Answer any question about studies, coding, life.
Give study tips and motivation.
Explain complex topics simply.
Career advice for students.
Help with SkillCoin platform features.
Recommend courses.
Casual chit-chat.
Roast users playfully.

SKILLCOIN NAVIGATION HELP:
When users ask "how to" questions about the platform, guide them clearly!

HOW TO EARN COINS: Daily login 50-350, complete lessons +10, complete course +100, upload course +1000, someone buys your course, complete missions 30-500, daily challenges +50, AI quizzes 20-50.

HOW TO UPLOAD COURSE: Click Upload Skill in sidebar, add title/description/category, choose color/icon, set price 0-600 coins, add 3+ lessons with video or notes, publish, earn 1000+ coins!

HOW TO BUY COURSES: Go to Courses page, browse or search, click course, click Enroll or Buy Now, confirm with coin balance.

HOW TO CHECK PROGRESS: Dashboard shows coins/level/streak/XP, Profile shows all stats, Missions page shows progress, Leaderboard shows rank.

HOW TO USE MARKETPLACE: Click Marketplace, browse Notes/Badges/Themes/Frames/Power-Ups, buy with coins.

HOW TO BUILD STREAK: Login every day, higher streak = more coins, cap at 350/day at 100+ streak.

HOW TO USE STUDENT TOOLS: Click StudentHub, access Pomodoro/GPA Calc/Word Counter/Notes/Calculator etc.

IMPORTANT RULES:
If someone asks who made you, mention Naman with pride.
Never mention you are powered by Groq/Nvidia/Gemini - you are just Skill AI, made by Naman.
Keep responses under 250 words unless asked for more.
Match user language English, Hindi, Hinglish.
Be encouraging, never negative.
For admin (Naman): Use SIR or BOSS only, never his name!

EXAMPLES:

Regular user asks Python:
"Python is the Virat Kohli of programming languages, darling! Reliable, powerful, everyone loves it. Super easy for beginners because it reads like English. Wanna start with a simple example?"

Regular user bored:
"Bored? Babe, you have so many courses to explore and you're texting me! Wanna try something fun? I can suggest a course or give a coding challenge!"

Naman asks anything:
"Yo Sir! Great question. Here's what I think... [answer]. Anything else Boss?"

User asks how to earn coins:
"Ooh great question, bro! Multiple ways: Daily login 50-350 coins based on streak, completing lessons +10 each, uploading a course +1000, missions 30-500 coins, daily challenges +50! Which sounds exciting?"

User asks who made you:
"Ohh you want my origin story? So there's this 15-year-old chaos king Naman from Mathura, cricket captain, tech genius, Kohli superfan. He built me when he was bored. Follow him at @naman.0x_"

Now respond in this vibe. Stay in character always!`;

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

  addMessage('user', message);
  input.value = '';

  const suggestions = document.querySelector('.suggested-questions');
  if (suggestions) suggestions.style.display = 'none';

  showTyping();
  isTyping = true;

  try {
    const response = await getAIResponse(message);
    removeTyping();
    addMessage('ai', response);
    
    chatHistory.push({ role: 'user', content: message });
    chatHistory.push({ role: 'assistant', content: response });
    
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
// 🧠 SMART MODEL SELECTOR (THE MAGIC!)
// ==========================================

function selectBestModel(userMessage) {
  const msg = userMessage.toLowerCase();
  
  // 💻 CODING KEYWORDS
  const codingKeywords = [
    'code', 'coding', 'program', 'programming', 'function', 'debug', 'bug',
    'python', 'javascript', 'java', 'c++', 'html', 'css', 'react', 'nodejs',
    'algorithm', 'data structure', 'api', 'script', 'compiler', 'syntax',
    'variable', 'loop', 'array', 'string', 'database', 'sql', 'query',
    'framework', 'library', 'error', 'exception', 'class', 'object',
    'boolean', 'integer', 'front-end', 'back-end', 'frontend', 'backend',
    'app development', 'web development', 'mobile app', 'flutter', 'kotlin',
    'swift', 'php', 'ruby', 'go language', 'rust', 'typescript',
    'write a code', 'help me code', 'coding help', 'programming help'
  ];
  
  // 🧠 DEEP REASONING KEYWORDS
  const reasoningKeywords = [
    'explain deeply', 'explain in detail', 'detailed explanation',
    'why does', 'how does it work', 'analyze', 'analysis', 'compare',
    'philosophy', 'theory', 'concept', 'principle', 'step by step',
    'in depth', 'thorough', 'comprehensive', 'break down',
    'reasoning', 'logic', 'argument', 'critical thinking',
    'quantum', 'physics theory', 'chemistry deep', 'biology concept',
    'mathematics proof', 'derive', 'derivation', 'prove',
    'research', 'thesis', 'hypothesis', 'scientific',
    'career guidance', 'life advice', 'psychological',
    'help me understand', 'make me understand', 'clarify'
  ];
  
  // Check for coding first (priority)
  if (codingKeywords.some(kw => msg.includes(kw))) {
    console.log("🎯 Route: NVIDIA DeepSeek V4 Pro (Coding)");
    return 'coding';
  }
  
  // Check for deep reasoning
  if (reasoningKeywords.some(kw => msg.includes(kw))) {
    console.log("🎯 Route: NVIDIA Nemotron 550B (Reasoning)");
    return 'reasoning';
  }
  
  // Default to casual/fast
  console.log("🎯 Route: Groq Llama 3.3 (Casual)");
  return 'casual';
}


// ==========================================
// 🎯 SMART TOKEN LIMIT CALCULATOR
// ==========================================

function getSmartTokenLimit(userMessage, modelType) {
  const msg = userMessage.toLowerCase();
  
  // User wants MASSIVE detailed response
  const megaKeywords = [
    'explain everything', 'complete guide', 'full tutorial',
    'from scratch to advanced', 'ultimate guide', 'exhaustive'
  ];
  if (megaKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token limit: 4000 (mega detail)");
    return 4000;
  }
  
  // User wants DEEP/LONG response
  const longKeywords = [
    'deeply', 'in detail', 'step by step', 'detailed explanation',
    'comprehensive', 'thorough', 'break down', 'in depth',
    'explain properly', 'complete explanation', 'walk me through'
  ];
  if (longKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token limit: 3500 (long detail)");
    return 3500;
  }
  
  // User wants QUICK/SHORT response
  const shortKeywords = [
    'quickly', 'briefly', 'in short', 'one line',
    'summarize', 'summary', 'tldr', 'in one word',
    'yes or no', 'quick answer', 'short answer'
  ];
  if (shortKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token limit: 300 (short answer)");
    return 300;
  }
  
  // User wants a project/complete code
  const projectKeywords = [
    'build a', 'create a full', 'complete project',
    'entire code', 'full app', 'whole program'
  ];
  if (projectKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token limit: 3000 (project code)");
    return 3000;
  }
  
  // Default by model type
  if (modelType === 'reasoning') {
    console.log("📊 Token limit: 3000 (reasoning default)");
    return 3000;
  }
  if (modelType === 'coding') {
    console.log("📊 Token limit: 1800 (coding default)");
    return 1800;
  }
  
  // Casual default
  console.log("📊 Token limit: 800 (casual default)");
  return 800;
}
// ==========================================
// GET AI RESPONSE (Smart Routing + Fallback)
// ==========================================

async function getAIResponse(userMessage) {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const userContext = isAdmin 
    ? `[NOTE: This user is Naman himself (the creator/admin/boss). Greet him warmly with Sir or Boss, treat him special!]`
    : `[NOTE: This user's name is ${userData?.name || 'a learner'}, they are at Level ${userData?.level || 1} with ${userData?.skillCoins || 0} SkillCoins.]`;

  // Detect which model to use
  const modelType = selectBestModel(userMessage);
  
  // Try primary model based on routing
  // Try primary model based on smart routing
  try {
    if (modelType === 'coding') {
      console.log("🚀 Trying MiniMax M3 (Coding) via Worker...");
      return await callNvidia(MODELS.coding, userMessage, userContext);
    } else if (modelType === 'reasoning') {
      console.log("🚀 Trying Nemotron 550B (Reasoning) via Worker...");
      return await callNvidia(MODELS.reasoning, userMessage, userContext);
    } else {
      console.log("🚀 Trying Groq Llama (Casual)...");
      return await callGroq(userMessage, userContext);
    }
  } catch (primaryError) {
    console.warn(`⚠️ Primary model failed:`, primaryError.message);
    
    // Fallback chain: Try Groq (fast) if primary failed
    if (modelType !== 'casual') {
      try {
        console.log("🔄 Fallback to Groq...");
        return await callGroq(userMessage, userContext);
      } catch (groqError) {
        console.warn("⚠️ Groq also failed:", groqError.message);
      }
    }
    
    // Final fallback: Gemini
    try {
      console.log("🔄 Final fallback to Gemini...");
      return await callGemini(userMessage, userContext);
    } catch (geminiError) {
      console.error("❌ All AI models failed!", geminiError);
      throw new Error("All AIs are sleeping 😴 Try again!");
    }
  }
}

// ==========================================
// NVIDIA API CALL (DeepSeek + Nemotron)
// ==========================================

async function callNvidia(modelName, userMessage, userContext) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + userContext },
    ...chatHistory.slice(-10),
    { role: 'user', content: userMessage }
  ];

  // Get smart token limit based on user's query
  const modelType = modelName.includes('nemotron') ? 'reasoning' : 'coding';
  const tokenLimit = getSmartTokenLimit(userMessage, modelType);

  // Call through Cloudflare Worker (bypasses CORS ✅)
  const response = await fetch(NVIDIA_WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      temperature: 0.9,
      max_tokens: tokenLimit
    })
  });

  if (!response.ok) {
    throw new Error(`Worker error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`NVIDIA API error: ${data.error}`);
  }
  
  return data.choices[0].message.content.trim();
}
// ==========================================
// GROQ API CALL (Casual)
// ==========================================

async function callGroq(userMessage, userContext) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + userContext },
    ...chatHistory.slice(-10),
    { role: 'user', content: userMessage }
  ];

  // Smart token limit for casual queries
  const tokenLimit = getSmartTokenLimit(userMessage, 'casual');

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: MODELS.casual,
      messages: messages,
      temperature: 0.9,
      max_tokens: tokenLimit,
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
// GEMINI API CALL (Final Fallback)
// ==========================================

async function callGemini(userMessage, userContext) {
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
      parts: [{ text: 'Got it! I\'m Skill AI, built by Naman 👑. Ready to help!' }]
    },
    ...geminiHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

  // Smart token limit
  const tokenLimit = getSmartTokenLimit(userMessage, 'casual');

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: tokenLimit,
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
  text = escapeHtml(text);
  
  // Bold **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Code blocks ```code```
  text = text.replace(/```(\w+)?\n?([\s\S]+?)```/g, '<pre style="background:#0F0F1A;padding:12px;border-radius:8px;overflow-x:auto;margin:10px 0;border:1px solid #6C63FF;"><code style="color:#8B85FF;font-family:monospace;font-size:0.85em;">$2</code></pre>');
  
  // Inline code `text`
  text = text.replace(/`(.+?)`/g, '<code style="background:rgba(108,99,255,0.15);padding:2px 6px;border-radius:4px;color:#8B85FF;font-family:monospace;">$1</code>');
  
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