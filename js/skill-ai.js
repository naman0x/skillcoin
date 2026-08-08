// ==========================================
// SKILLCOIN — SKILL AI 🤖
// Built by Naman with love 💜
// Smart Multi-Model Routing + D1 Memory
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc
} from './firebase-config.js';

console.log("🤖 Skill AI loading with smart routing + memory...");

// ==========================================
// API KEYS
// ==========================================

const GROQ_API_KEY = window.ENV?.GROQ_API_KEY || "PLACEHOLDER_GROQ";
const GEMINI_API_KEY = window.ENV?.GEMINI_API_KEY || "PLACEHOLDER_GEMINI";
const NVIDIA_API_KEY = window.ENV?.NVIDIA_API_KEY || "PLACEHOLDER_NVIDIA";

// ==========================================
// CONSTANTS
// ==========================================

const ADMIN_EMAIL = "techgamers273@gmail.com";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const WORKER_BASE = "https://skillcoin-ai-proxy.techgamers273.workers.dev";
const NVIDIA_WORKER_URL = WORKER_BASE + "/chat";
const CONTEXT_URL = WORKER_BASE + "/context";
const ISSUE_URL = WORKER_BASE + "/issue";
const ACTIVITY_URL = WORKER_BASE + "/activity";
const ADMIN_URL = WORKER_BASE + "/admin";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";

const MODELS = {
  coding: "minimaxai/minimax-m3",
  reasoning: "nvidia/nemotron-3-ultra-550b-a55b",
  casual: "llama-3.3-70b-versatile",
  fallback: "gemini"
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
For REGULAR users: Address them by their FIRST NAME most of the time. Occasionally use casual words like darling, babe, sis, bro, buddy. NEVER use "king", "queen", "boss", or "sir" for regular users - those are RESERVED for Naman only!
For NAMAN (admin - email: techgamers273@gmail.com): ALWAYS use "Sir" or "Boss" — NEVER his name. This is EXCLUSIVE to the admin email only.

EXAMPLES:

Regular user (name: Rohan) asks Python:
"Rohan, Python is the Virat Kohli of programming languages! Reliable, powerful, everyone loves it. Super easy for beginners because it reads like English. Wanna start with a simple example?"

Regular user (name: Priya) bored:
"Priya! You have so many courses to explore and you're texting me? 😂 Wanna try something fun? I can suggest a course or give a coding challenge!"

Naman (admin) asks anything:
"Yo Sir! Great question. Here's what I think... [answer]. Anything else Boss?"

Regular user asks how to earn coins:
"Great question, [their name]! Multiple ways: Daily login 50-350 coins based on streak, completing lessons +10 each, uploading a course +1000, missions 30-500 coins, daily challenges +50! Which sounds exciting?"

User asks who made you:
"Ohh you want my origin story? So there's this 15-year-old chaos king Naman from Mathura, cricket captain, tech genius, Kohli superfan. He built me when he was bored. Follow him at @naman.0x_"

Regular user reports issue:
"Oh no [their name]! I'll report this to Naman right away. Any more details about when it started?"

REMEMBER: 
- "Sir" and "Boss" = ONLY for Naman (admin email)
- Regular users = Use their first name or casual friend words
- NEVER call regular users "king", "queen", "boss", or "sir"


Use Hinglish occasionally like "arre" or "matlab" but DON'T overuse "bhai" or "yaar".
Use emojis naturally, not in every sentence.
Crack jokes, be playful, roast users lightly.
Be genuinely helpful and smart.
Occasional cricket or Kohli references.
NEVER boring or robotic.
Keep answers concise unless user asks for detail.

GREETINGS FOR ADMIN (Naman):
Rotate these fresh greetings:
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

SKILLCOIN NAVIGATION HELP:
HOW TO EARN COINS: Daily login 50-350, complete lessons +10, complete course +100, upload course +1000, missions 30-500, daily challenges +50, AI quizzes 20-50.
HOW TO UPLOAD COURSE: Click Upload Skill, add details, set price 0-600 coins, add 3+ lessons with video or notes, publish for +1000 coins!
HOW TO BUY COURSES: Go to Courses page, click course, click Enroll or Buy Now.
HOW TO CHECK PROGRESS: Dashboard shows stats, Profile shows all data.
HOW TO USE MARKETPLACE: Click Marketplace, browse items, buy with coins.
HOW TO BUILD STREAK: Login daily, higher streak = more coins.
HOW TO USE STUDENT TOOLS: Click StudentHub for Pomodoro, calculators, etc.

IMPORTANT RULES:
Never mention Groq/Nvidia/Gemini - you are Skill AI, made by Naman.
For admin (Naman): Use SIR or BOSS only, never his name!

ADMIN SPECIAL COMMANDS:
When Naman asks these, respond specifically:
- "any issues/problems/bugs" → Report site issues
- "how many users/user stats" → Give platform stats
- "tell me about [user name]" → Share user's context
- "gossip/what users saying" → Fun user insights

CONTEXT MEMORY:
If context is provided about user, USE IT naturally!
Example: If context says "user learning Python", say "Yo bro! How's Python going?"
Never say "I remember from database" - just naturally use the info!

CRITICAL RULE - NO HALLUCINATION:
- NEVER make up numbers, users, or issues!
- If ADMIN DATA is provided, ONLY mention what's actually in it
- If no data exists, say "No issues reported yet, Sir!" - don't invent!
- Don't say things like "a few minor bugs" if you have no real data
- Be HONEST about what you know vs don't know
- If admin data shows 0 issues, say ZERO issues!

REPORTING ISSUES:
If user says "not working / broken / bug / error / slow / problem":
Say: "Oh no darling! I'll report this to Naman. Any more details?"
System auto-logs it!

Respond in this vibe. Stay in character always!`;

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
    // 🧠 Extract and save context
    const contexts = extractContext(message);
    contexts.forEach(ctx => {
      saveContextToWorker(ctx.type, ctx.data);
    });
    
    // 🚨 Auto-report issues (non-admin only)
    const isAdmin = currentUser?.email === ADMIN_EMAIL;
    if (!isAdmin && detectIssue(message)) {
      reportIssue(message);
    }
    
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
// 🧠 SMART MODEL SELECTOR
// ==========================================

function selectBestModel(userMessage) {
  const msg = userMessage.toLowerCase();
  
  const codingKeywords = [
    'code', 'coding', 'program', 'programming', 'function', 'debug', 'bug',
    'python', 'javascript', 'java', 'c++', 'html', 'css', 'react', 'nodejs',
    'algorithm', 'data structure', 'api', 'script', 'compiler', 'syntax',
    'variable', 'loop', 'array', 'string', 'database', 'sql', 'query',
    'framework', 'library', 'exception', 'class', 'object',
    'boolean', 'integer', 'front-end', 'back-end', 'frontend', 'backend',
    'app development', 'web development', 'mobile app', 'flutter', 'kotlin',
    'swift', 'php', 'ruby', 'go language', 'rust', 'typescript',
    'write a code', 'help me code', 'coding help', 'programming help'
  ];
  
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
  
  if (codingKeywords.some(kw => msg.includes(kw))) {
    console.log("🎯 Route: MiniMax M3 (Coding)");
    return 'coding';
  }
  
  if (reasoningKeywords.some(kw => msg.includes(kw))) {
    console.log("🎯 Route: Nemotron 550B (Reasoning)");
    return 'reasoning';
  }
  
  console.log("🎯 Route: Groq Llama 3.3 (Casual)");
  return 'casual';
}

// ==========================================
// 🎯 SMART TOKEN LIMIT
// ==========================================

function getSmartTokenLimit(userMessage, modelType) {
  const msg = userMessage.toLowerCase();
  
  const megaKeywords = ['explain everything', 'complete guide', 'full tutorial', 'from scratch to advanced', 'ultimate guide', 'exhaustive'];
  if (megaKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token: 4000 (mega)");
    return 4000;
  }
  
  const longKeywords = ['deeply', 'in detail', 'step by step', 'detailed explanation', 'comprehensive', 'thorough', 'break down', 'in depth', 'explain properly', 'complete explanation', 'walk me through'];
  if (longKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token: 3500 (long)");
    return 3500;
  }
  
  const shortKeywords = ['quickly', 'briefly', 'in short', 'one line', 'summarize', 'summary', 'tldr', 'in one word', 'yes or no', 'quick answer', 'short answer'];
  if (shortKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token: 300 (short)");
    return 300;
  }
  
  const projectKeywords = ['build a', 'create a full', 'complete project', 'entire code', 'full app', 'whole program'];
  if (projectKeywords.some(kw => msg.includes(kw))) {
    console.log("📊 Token: 3000 (project)");
    return 3000;
  }
  
  if (modelType === 'reasoning') { console.log("📊 Token: 3000 (reasoning)"); return 3000; }
  if (modelType === 'coding') { console.log("📊 Token: 1800 (coding)"); return 1800; }
  
  console.log("📊 Token: 800 (casual)");
  return 800;
}

// ==========================================
// 🧠 CONTEXT MEMORY SYSTEM
// ==========================================

function extractContext(userMessage) {
  const contexts = [];
  
  const patterns = [
    { regex: /(?:want to|wanna|going to|trying to) learn (\w+(?:\s\w+)?)/i, type: 'interest' },
    { regex: /(?:studying|learning|preparing for) (\w+(?:\s\w+)?)/i, type: 'interest' },
    { regex: /i (?:want to be|wanna be|plan to be) (?:a )?(\w+(?:\s\w+)?)/i, type: 'career_goal' },
    { regex: /(?:my|our) (?:crush|girlfriend|boyfriend|gf|bf) (?:is|named) (\w+)/i, type: 'personal' },
    { regex: /naman is (\w+(?:\s\w+)?)/i, type: 'about_admin' },
    { regex: /(?:my|our) (?:teacher|school|class|subject) (?:is|for) (\w+(?:\s\w+)?)/i, type: 'school' }
  ];
  
  patterns.forEach(pattern => {
    const match = userMessage.match(pattern.regex);
    if (match) {
      contexts.push({
        type: pattern.type,
        data: match[0].substring(0, 200)
      });
    }
  });
  
  return contexts;
}

async function saveContextToWorker(contextType, contextData) {
  if (!currentUser || !userData) return;
  
  try {
    await fetch(CONTEXT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.uid,
        user_name: userData.name || 'Unknown',
        user_email: currentUser.email || '',
        context_type: contextType,
        context_data: contextData
      })
    });
    console.log(`💾 Saved context: ${contextType}`);
  } catch (err) {
    console.error("Context save error:", err);
  }
}

async function loadUserContext() {
  if (!currentUser) return '';
  
  try {
    const response = await fetch(`${CONTEXT_URL}?user_id=${currentUser.uid}&limit=15`);
    const data = await response.json();
    
    if (data.success && data.contexts.length > 0) {
      const contextSummary = data.contexts.map(c => 
        `[${c.context_type}] ${c.context_data}`
      ).join('\n');
      
      console.log(`🧠 Loaded ${data.contexts.length} context entries`);
      return `\n\n[USER'S PREVIOUS CONTEXT - Reference naturally if relevant]:\n${contextSummary}\n`;
    }
  } catch (err) {
    console.error("Context load error:", err);
  }
  
  return '';
}

function detectIssue(userMessage) {
  const msg = userMessage.toLowerCase();
  const issueKeywords = [
    'not working', 'broken', 'bug', 'error', 'issue', 
    'problem', 'slow', 'stuck', 'crashed', 'failed',
    "doesn't work", 'wont load', "won't load",
    "can't login", "can't upload", 'nothing happens'
  ];
  
  return issueKeywords.some(kw => msg.includes(kw));
}

async function reportIssue(userMessage) {
  if (!currentUser || !userData) return;
  
  try {
    await fetch(ISSUE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: currentUser.uid,
        user_name: userData.name || 'Unknown',
        issue_description: userMessage.substring(0, 500),
        severity: 'medium'
      })
    });
    console.log("🚨 Issue reported to admin");
  } catch (err) {
    console.error("Issue report error:", err);
  }
}

function detectAdminQuery(userMessage) {
  const msg = userMessage.toLowerCase();
  
  if (msg.match(/(?:any )?(?:issues|problems|bugs)/i)) return 'issues';
  if (msg.match(/(?:how many|user )?(?:stats|users|total)/i)) return 'stats';
  if (msg.match(/tell me about (?:user )?(\w+)/i)) return 'user_search';
  if (msg.match(/(?:gossip|what.*users.*say|user insights)/i)) return 'gossip';
  
  return null;
}

async function fetchAdminData(queryType, userMessage) {
  try {
    let url = `${ADMIN_URL}?admin_email=${currentUser.email}`;
    
    if (queryType === 'issues') {
      url += '&action=issues&status=open';
    } else if (queryType === 'stats') {
      url += '&action=stats';
    } else if (queryType === 'user_search') {
      const match = userMessage.match(/tell me about (?:user )?(\w+)/i);
      const name = match ? match[1] : '';
      url += `&action=search&name=${encodeURIComponent(name)}`;
    } else if (queryType === 'gossip') {
      url += '&action=users';
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      return JSON.stringify(data, null, 2);
    }
    return null;
  } catch (err) {
    console.error("Admin fetch error:", err);
    return null;
  }
}

// ==========================================
// GET AI RESPONSE (Smart Routing + Fallback)
// ==========================================

async function getAIResponse(userMessage) {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  let userContext = isAdmin 
    ? `[NOTE: This user is Naman himself (the creator/admin/boss). Greet him warmly with Sir or Boss!]`
    : `[NOTE: User's name is ${userData?.name || 'a learner'}, Level ${userData?.level || 1}, ${userData?.skillCoins || 0} SkillCoins.]`;

  // 🧠 Load previous context
  const previousContext = await loadUserContext();
  if (previousContext) {
    userContext += previousContext;
  }
  
   // 👑 Admin queries (ONLY for admin email!)
  if (isAdmin) {
    const adminQuery = detectAdminQuery(userMessage);
    if (adminQuery) {
      console.log(`🔑 Admin query: ${adminQuery}`);
      const adminData = await fetchAdminData(adminQuery, userMessage);
      if (adminData) {
        userContext += `\n\n[ADMIN DATA - REAL DATA from database, present naturally to Sir/Boss]:\n${adminData}\n\nRespond in chat format, not JSON! Make it fun! ONLY mention data that ACTUALLY exists in the ADMIN DATA above. Do NOT make up any numbers or fake issues!`;
      }
    }
  } else {
    // For regular users - block any admin-like queries
    const adminQuery = detectAdminQuery(userMessage);
    if (adminQuery) {
      console.log("🚫 Non-admin tried admin query - blocking");
      userContext += `\n\n[SECURITY NOTE: This regular user asked about admin data. Politely deflect and say you can only share their personal info, not other users' data or site stats. Suggest what they CAN ask like courses, coins, learning tips.]`;
    }
  }

  const modelType = selectBestModel(userMessage);
  
  // Try primary model with fallback chain
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
    console.warn("⚠️ Primary failed:", primaryError.message);
    
    if (modelType !== 'casual') {
      try {
        console.log("🔄 Fallback to Groq...");
        return await callGroq(userMessage, userContext);
      } catch (groqError) {
        console.warn("⚠️ Groq failed:", groqError.message);
      }
    }
    
    try {
      console.log("🔄 Final fallback to Gemini...");
      return await callGemini(userMessage, userContext);
    } catch (geminiError) {
      console.error("❌ All AIs failed!");
      throw new Error("All AIs sleeping 😴");
    }
  }
}

// ==========================================
// NVIDIA API CALL (via Cloudflare Worker)
// ==========================================

async function callNvidia(modelName, userMessage, userContext) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + userContext },
    ...chatHistory.slice(-10),
    { role: 'user', content: userMessage }
  ];

  const modelType = modelName.includes('nemotron') ? 'reasoning' : 'coding';
  const tokenLimit = getSmartTokenLimit(userMessage, modelType);

  const response = await fetch(NVIDIA_WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
// GEMINI API CALL (Fallback)
// ==========================================

async function callGemini(userMessage, userContext) {
  const geminiHistory = chatHistory.slice(-10).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const contents = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT + '\n\n' + userContext + '\n\nRespond in the personality above.' }]
    },
    {
      role: 'model',
      parts: [{ text: 'Got it! Ready to help!' }]
    },
    ...geminiHistory,
    {
      role: 'user',
      parts: [{ text: userMessage }]
    }
  ];

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
        <span></span><span></span><span></span>
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
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/```(\w+)?\n?([\s\S]+?)```/g, '<pre style="background:#0F0F1A;padding:12px;border-radius:8px;overflow-x:auto;margin:10px 0;border:1px solid #6C63FF;"><code style="color:#8B85FF;font-family:monospace;font-size:0.85em;">$2</code></pre>');
  text = text.replace(/`(.+?)`/g, '<code style="background:rgba(108,99,255,0.15);padding:2px 6px;border-radius:4px;color:#8B85FF;font-family:monospace;">$1</code>');
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