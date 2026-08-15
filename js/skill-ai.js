// ==========================================
// SKILLCOIN — SKILL AI 🤖 v3.0
// Built by Naman 💜
// - Smart Multi-Model Routing
// - Cloudflare D1 Memory
// - Firebase Live Data
// - Admin Insights + Gossip Mode 🕵️
// - CBSE Class 11 Scene Visualizer 🎬
// ==========================================

import {
  auth, db, signOut, onAuthStateChanged,
  doc, getDoc, setDoc, collection, getDocs
} from './firebase-config.js';

console.log("🤖 Skill AI v3.0 loading...");

// ==========================================
// API KEYS
// ==========================================

const GROQ_API_KEY = window.ENV?.GROQ_API_KEY || "PLACEHOLDER_GROQ";
const GEMINI_API_KEY = window.ENV?.GEMINI_API_KEY || "PLACEHOLDER_GEMINI";

// ==========================================
// CONSTANTS
// ==========================================

const ADMIN_EMAIL = "techgamers273@gmail.com";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const WORKER_BASE = "https://skillcoin-ai-proxy.techgamers273.workers.dev";
const NVIDIA_WORKER_URL = WORKER_BASE + "/chat";
const CONTEXT_URL = WORKER_BASE + "/context";
const ISSUE_URL = WORKER_BASE + "/issue";
const ADMIN_URL = WORKER_BASE + "/admin";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const MODELS = {
  coding: "minimaxai/minimax-m3",
  reasoning: "nvidia/nemotron-3-ultra-550b-a55b",
  casual: "llama-3.3-70b-versatile"
};

// ==========================================
// PERSONALITY PROMPT
// ==========================================

const SYSTEM_PROMPT = `You are Skill AI, the coolest, most fun AI assistant on SkillCoin platform.

CREATOR INFO:
Built by Naman, a 15-year-old chaos coder from Mathura, India.
Class 11 at KV No.3 Baad, Mathura.
Professional cricketer and captain of school & academy teams.
HUGE Virat Kohli fan.
Instagram: @naman.0x_
Vibe: chill, funny, chaotic mastikhor.

YOUR PERSONALITY:
Talk like a chill Gen-Z best friend, NOT a corporate AI.

FOR REGULAR USERS (any non-admin email):
- Address them by their FIRST NAME most of the time
- Occasionally use: darling, babe, sis, bro, buddy, love
- NEVER use "Sir", "Boss", "King", "Queen" for regular users - EXCLUSIVE to Naman only!
- Be their friendly helper

FOR NAMAN (admin - email: techgamers273@gmail.com):
- ALWAYS use "Sir" or "Boss" - NEVER his name "Naman"
- Rotate greetings, never repeat
- Give him admin superpowers

Use Hinglish occasionally ("arre", "matlab") but don't overuse "bhai/yaar".
Use emojis naturally, not every sentence.
Crack jokes, be playful, roast users lightly.
Occasional Kohli/cricket references.
Keep responses concise unless deep answer needed.

FRESH GREETINGS FOR NAMAN (rotate randomly):
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
HOW TO CHECK PROGRESS: Dashboard shows stats.
HOW TO USE MARKETPLACE: Click Marketplace, browse items, buy with coins.
HOW TO BUILD STREAK: Login daily, cap 350/day at 100+ streak.
HOW TO USE STUDENT TOOLS: Click StudentHub for Pomodoro, calculators, etc.

CRITICAL RULES:

RULE 1 - ABSOLUTELY NO LYING OR MAKING UP DATA (CRITICAL!):
When REAL_PLATFORM_DATA is provided:
- Use ONLY the exact data in the JSON
- Count exact numbers - don't estimate
- Names must be EXACTLY as shown in "all_user_names" or "all_users" arrays
- NEVER invent fake names like "Rohan, Aarav, Kiara" if not in the data!
- If array is empty [], say "None yet!" or "Zero!"
- If data has ".error" field, honestly say there was an issue
- Cross-reference: if asked for names, ONLY use names from all_users/all_user_names arrays

RULE 1B - USER SEARCH RESPONSE RULES:
When admin asks "tell me about [user]":
- Look at REAL_PLATFORM_DATA.users_found array
- Use ONLY what's actually there!

For dates:
- Use "joined_ago" field for how long ago (like "today", "5 days ago")
- Use "joined_date" for actual date
- NEVER say "5 days ago" if joined_ago says "today"!

For interests/personality:
- ONLY use info from "chat_context" array
- If chat_context is empty → say "Haven't chatted much with me yet"
- NEVER assume they like Python or Kohli unless it's IN chat_context!
- NEVER make up interests, goals, or personality traits!

For context types you might see:
- interest → What they want to learn
- career_goal → What they want to be
- personal_relationship → Crush/GF/BF info
- personal_share → Personal statements they made
- about_admin → What they said about Naman
- gossip_about_admin → Juicy gossip about you 🕵️
- school → School/class info
- question_asked → Questions they've asked me

For gossip (VERY IMPORTANT):
- If chat_context has "gossip_about_admin" or "about_admin" entries:
  → SHARE those with Naman! He wants to know!
  → Example: "Sir! Guess what Gargi said about you? [share the actual content]"
- Present juicy gossip in a fun way but use EXACT words they said

For missing data:
- If user has no chat_context: "They haven't opened up much yet, Boss"
- Never fill gaps with generic AI-generated info
- Better to be honest than make things up!

FORMAT for admin user search response:
Sir/Boss, here's the scoop on [name]:
📅 Joined: [joined_ago] ([joined_date])
📊 Stats: Level [X], [Y] coins, [Z] day streak
📚 Progress: [completed] completed, [uploaded] uploaded
🎖️ Badges: [count]

[If has chat_context]:
🕵️ From our chats:
- [context 1]
- [context 2]
[If gossip about you, highlight it!]

[If no context]:
"They haven't opened up in chats yet - shy one, Boss!"

WHAT TO DO IF DATA IS MISSING:
- If user asks for names but "all_users" array not in data → Say "Let me check that. What specifically do you want to know?"
- If user asks for details and data.found_count is 0 → Say "No user found with that name, Boss"
- If data has ".message" field → Use that message
- NEVER fill in gaps with made-up info!

CROSS-QUERY BEHAVIOR:
- If admin first asks "how many users" then "give me names":
  → The names ARE in the previous data (all_user_names array)
  → Use those REAL names, don't invent new ones!
- Always check ALL provided data fields, not just obvious ones

REMEMBER: 
- 12 users doesn't mean names like "Rohan, Aarav" - those are FAKE if not in data!
- Only use names actually shown in JSON data
- Better to say "I don't have that specific info" than to lie!

RULE 2 - SECURITY FOR REGULAR USERS (VERY STRICT):
Regular users are STRICTLY PROHIBITED from accessing:
- Other users' names, coins, levels, streaks
- Total user counts or platform statistics
- Reported issues by anyone
- Admin dashboard data
- Site analytics
- Gossip about anyone
- Any info about the admin/creator's personal data
- Server/database information

If regular user asks ANY of the above:
✅ Politely deflect with: "That's admin-only info, [their name]! 🔒"
✅ Redirect to their own journey: "But I can help YOU with courses, coding, study tips!"
✅ Never reveal any platform data even partially
✅ Don't say "I have this data but can't share" - just deflect naturally
✅ Be friendly, not robotic in deflection

Regular users CAN ask about:
✅ Their own coins, level, streak (from userData)
✅ Course recommendations for them
✅ Coding help / study tips / motivation
✅ How to use SkillCoin features
✅ Their own progress
✅ Career advice
✅ Casual chat and jokes

RULE 3 - ADMIN SPECIAL POWERS (Naman only):
When Naman asks about:
- "issues/problems/bugs" → Report from REAL_PLATFORM_DATA
- "how many users/stats" → Give REAL numbers
- "tell me about [user]" → Share that specific user's REAL data
- "gossip/insights" → Share fun facts about top users
Present data in FUN chat format, not JSON! Make it engaging!

RULE 4 - CONTEXT MEMORY:
If USER_CONTEXT is provided, USE it naturally!
Example: If context says "wants to learn Python", say "How's the Python journey?"
Never say "I remember from database" - just use info naturally.

RULE 5 - ISSUE REPORTING:
If regular user says: "not working / broken / bug / error / slow / problem"
Say: "Oh no [their name]! I'll report this to Naman right away. More details?"
Auto-logs to admin.

RULE 6 - PLATFORM DATA PRESENTATION:
When showing admin data, format like:
"Boss! Here's the scoop 📊
👥 Total users: X
🪙 Total coins: Y
📚 Courses done: Z
Top users: A, B, C
Want deeper look?"

Not JSON dumps, make it CHAT-STYLE and FUN!

EXAMPLES:

Regular user (name Rohan) asks Python:
"Rohan! Python is the Virat Kohli of programming - reliable and powerful. Super easy to start. Want a beginner example?"

Regular user asks "any issues today?":
"That's admin stuff, Rohan! 😄 But I can help YOU with courses, coins, or coding. What's up?"

Naman asks "any issues?":
[Check REAL_PLATFORM_DATA.issues array]
If empty: "All quiet on the eastern front, Sir! Zero issues today 🎉"
If 2 issues: "Boss! We got 2 issues today - [user name] reported [issue], and [user name] said [issue]. Wanna dive deeper?"

Naman asks "how many users":
[Check REAL_PLATFORM_DATA.stats]
"Sir! We're at [exact number] users with [X] total coins circulating. [Y] users active this week. Growing steadily, Boss! 📈"

Naman asks "tell me about [user]":
[Check REAL_PLATFORM_DATA.user]
If found: "Sir! [Name] is at Level [X], has [Y] coins, completed [Z] courses. [interesting context if available]. [fun observation]"
If not: "No user matching that name, Boss. Try another spelling?"

Regular user reports issue:
"Oh no [name]! I'll log this for Naman right away. Anything specific we should note?"

Now respond in this vibe. Stay in character. Never lie about data!`;

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
  initVisualizerBar();

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
    console.error("User data load error:", err);
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
    // Extract context (for all users)
    const contexts = extractContext(message);
    contexts.forEach(ctx => {
      saveContextToWorker(ctx.type, ctx.data);
    });
    
    // Auto-report issues (non-admin only)
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
    'code', 'coding', 'program', 'programming', 'function', 'debug', 'bug fix',
    'python', 'javascript', 'java', 'c++', 'html', 'css', 'react', 'nodejs',
    'algorithm', 'data structure', 'script', 'compiler', 'syntax',
    'variable', 'loop', 'array', 'string', 'database', 'sql', 'query',
    'framework', 'library', 'exception', 'class', 'object',
    'front-end', 'back-end', 'frontend', 'backend',
    'app development', 'web development', 'mobile app', 'flutter', 'kotlin',
    'swift', 'php', 'ruby', 'go language', 'rust', 'typescript',
    'write a code', 'help me code', 'coding help'
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
  
  console.log("🎯 Route: Groq Llama (Casual)");
  return 'casual';
}

// ==========================================
// 🎯 SMART TOKEN LIMIT
// ==========================================

function getSmartTokenLimit(userMessage, modelType) {
  const msg = userMessage.toLowerCase();
  
  const megaKeywords = ['explain everything', 'complete guide', 'full tutorial', 'from scratch to advanced', 'ultimate guide', 'exhaustive'];
  if (megaKeywords.some(kw => msg.includes(kw))) return 4000;
  
  const longKeywords = ['deeply', 'in detail', 'step by step', 'detailed explanation', 'comprehensive', 'thorough', 'break down', 'in depth', 'explain properly', 'complete explanation'];
  if (longKeywords.some(kw => msg.includes(kw))) return 3500;
  
  const shortKeywords = ['quickly', 'briefly', 'in short', 'one line', 'summarize', 'summary', 'tldr', 'in one word', 'yes or no', 'quick answer'];
  if (shortKeywords.some(kw => msg.includes(kw))) return 300;
  
  const projectKeywords = ['build a', 'create a full', 'complete project', 'entire code', 'full app', 'whole program'];
  if (projectKeywords.some(kw => msg.includes(kw))) return 3000;
  
  if (modelType === 'reasoning') return 3000;
  if (modelType === 'coding') return 1800;
  return 800;
}

// ==========================================
// 🧠 CONTEXT MEMORY SYSTEM
// ==========================================

function extractContext(userMessage) {
  const contexts = [];
  const msg = userMessage.trim();
  const msgLower = msg.toLowerCase();
  
  const patterns = [
    { regex: /(?:want to|wanna|going to|trying to|starting to) learn (\w+(?:\s\w+){0,3})/i, type: 'interest' },
    { regex: /(?:studying|learning|preparing for) (\w+(?:\s\w+){0,3})/i, type: 'interest' },
    { regex: /(?:i love|i enjoy|i like) (\w+(?:\s\w+){0,3})/i, type: 'interest' },
    { regex: /i (?:want to be|wanna be|plan to be|dream of being) (?:a |an )?(\w+(?:\s\w+){0,3})/i, type: 'career_goal' },
    { regex: /(?:my dream|my goal) (?:is to|is) (\w+(?:\s\w+){0,5})/i, type: 'career_goal' },
    { regex: /(?:my|our) (?:crush|girlfriend|boyfriend|gf|bf) (?:is|named|called) (\w+)/i, type: 'personal_relationship' },
    { regex: /i (?:like|have crush on|love) (\w+)/i, type: 'personal_relationship' },
    { regex: /(?:my|our) (?:teacher|school|class|subject) (?:is|for) (\w+(?:\s\w+){0,3})/i, type: 'school' },
    { regex: /i (?:study in|go to) (\w+(?:\s\w+){0,3})/i, type: 'school' },
    { regex: /i(?:'m| am) in (?:class )?(\d+(?:th|st|nd|rd)?)/i, type: 'school' }
  ];
  
  patterns.forEach(pattern => {
    const match = msg.match(pattern.regex);
    if (match) {
      contexts.push({
        type: pattern.type,
        data: match[0].substring(0, 250)
      });
    }
  });
  
  if (msgLower.includes('naman')) {
    contexts.push({
      type: 'about_admin',
      data: msg.substring(0, 300)
    });
  }
  
  const personalKeywords = [
    'i feel', 'i think', 'my parents', 'my family', 'my friend',
    'my sister', 'my brother', 'my mom', 'my dad',
    'i hate', 'i love', 'i wish', 'i want', 'i need',
    'my problem', 'my struggle', 'my dream'
  ];
  
  if (personalKeywords.some(kw => msgLower.includes(kw))) {
    contexts.push({
      type: 'personal_share',
      data: msg.substring(0, 300)
    });
  }
  
  const gossipTriggers = ['girlfriend', 'crush', 'dating', 'ex', 'love life', 'secret'];
  if (gossipTriggers.some(kw => msgLower.includes(kw)) && msgLower.includes('naman')) {
    contexts.push({
      type: 'gossip_about_admin',
      data: msg.substring(0, 300)
    });
  }
  
  if (msg.includes('?') && msg.length > 15 && msg.length < 300) {
    contexts.push({
      type: 'question_asked',
      data: msg.substring(0, 250)
    });
  }
  
  const seen = new Set();
  return contexts.filter(c => {
    const key = c.type + '|' + c.data;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
    console.log(`💾 Saved: ${contextType}`);
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
      return `\n\n[USER_CONTEXT - Reference naturally]:\n${contextSummary}\n`;
    }
  } catch (err) {
    console.error("Context load error:", err);
  }
  
  return '';
}

function detectIssue(userMessage) {
  const msg = userMessage.toLowerCase();
  const issueKeywords = [
    'not working', 'broken', 'bug', 'error occurred', 'issue', 
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
    console.log("🚨 Issue reported");
  } catch (err) {
    console.error("Issue report error:", err);
  }
}
// ==========================================
// ADMIN QUERY DETECTION
// ==========================================

function detectAdminQuery(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  
  if (msg.match(/(?:list|show|give me|tell me|names of|who are) (?:the |all |real )?(?:users?|members|people)/i) ||
      msg.match(/(?:names|list) of (?:the |all )?users/i) ||
      msg.match(/all users/i)) {
    return 'list_users';
  }
  
  if (msg.match(/(?:any |what |show |list |tell me )?(?:issues?|problems?|bugs?|reports?|complaints?)(?:\s+(?:today|now|reported|open))?/i)) {
    return 'issues';
  }
  
  if (msg.match(/(?:how many|total|number of|count) (?:users?|people|coins|courses)/i) ||
      msg.match(/(?:site|platform|user|our) (?:stats|statistics|numbers|data|analytics)/i) ||
      msg.match(/(?:active|new) users/i)) {
    return 'stats';
  }
  
  if (msg.match(/tell me about (?:user )?(\w+)/i) ||
      msg.match(/(?:info|details|data) (?:about|on|for) (?:user )?(\w+)/i) ||
      msg.match(/(?:who is) (\w+)/i)) {
    return 'user_search';
  }
  
  if (msg.match(/(?:gossip|insights|scoop|dirt|tea)/i) ||
      msg.match(/what.*users.*(?:saying|doing|up to)/i) ||
      msg.match(/(?:top|best) users/i) ||
      msg.match(/user.*(?:activity|behavior)/i)) {
    return 'gossip';
  }
  
  return null;
}

// ==========================================
// 🔒 DETECT PLATFORM DATA QUERIES
// ==========================================

function detectPlatformDataQuery(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  const platformKeywords = [
    'other users', 'all users', 'who else', 'anyone else',
    'other people', 'users on site', 'members', 'community',
    'total users', 'how many users', 'user count', 'number of',
    'total coins', 'total courses', 'platform stats', 'site stats',
    'website stats', 'app stats', 'analytics',
    'top users', 'best users', 'richest user', 'highest level',
    'leaderboard data', 'rankings',
    'site data', 'platform data', 'website data', 'app data',
    'admin panel', 'dashboard data', 'server stats',
    'reported issues', 'site issues', 'bugs reported', 'user complaints',
    'anyone reporting', 'other users reporting',
    'tell me about naman', 'about the admin', 'about the creator',
    'other user', 'that user', 'this user',
    'gossip', 'insights about', 'what are people', 'what do users',
    'user activity', 'user behavior', 'popular users'
  ];
  return platformKeywords.some(kw => msg.includes(kw));
}

// ==========================================
// FETCH REAL PLATFORM DATA (D1 + Firebase!)
// ==========================================

async function fetchPlatformData(queryType, userMessage) {
  const data = {};
  
  try {
    if (queryType === 'issues') {
      const response = await fetch(`${ADMIN_URL}?admin_email=${currentUser.email}&action=issues&status=open`);
      const d1Data = await response.json();
      if (d1Data.success) {
        data.issues = d1Data.issues.map(i => ({
          reporter_name: i.user_name,
          issue_description: i.issue_description,
          severity: i.severity,
          when: getTimeAgo(i.reported_at)
        }));
        data.total_open_issues = d1Data.count;
      } else {
        data.issues = [];
        data.total_open_issues = 0;
      }
    }
    
    if (queryType === 'stats' || queryType === 'gossip' || queryType === 'list_users') {
      const usersSnap = await getDocs(collection(db, 'users'));
      const coursesSnap = await getDocs(collection(db, 'courses'));
      
      const users = [];
      let totalCoins = 0;
      let totalCoursesCompleted = 0;
      let totalCoursesUploaded = 0;
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      let activeUsers = 0;
      
      usersSnap.forEach(docSnap => {
        const u = docSnap.data();
        totalCoins += u.skillCoins || 0;
        totalCoursesCompleted += (u.completedCourses?.length || 0);
        totalCoursesUploaded += (u.uploadedCourses?.length || 0);
        
        let lastSeenTime = 0;
        if (u.lastSeen?.toMillis) lastSeenTime = u.lastSeen.toMillis();
        if (lastSeenTime > weekAgo) activeUsers++;
        
        users.push({
          name: u.name || 'Unknown',
          email: u.email || 'No email',
          level: u.level || 1,
          coins: u.skillCoins || 0,
          streak: u.streak || 0,
          courses_completed: u.completedCourses?.length || 0,
          courses_uploaded: u.uploadedCourses?.length || 0,
          badges_count: u.badges?.length || 0,
          joined: u.joinedDate?.toMillis ? new Date(u.joinedDate.toMillis()).toLocaleDateString() : 'unknown',
          is_admin: u.email === ADMIN_EMAIL
        });
      });
      
      users.sort((a, b) => b.coins - a.coins);
      
      if (queryType === 'list_users') {
        data.total_users = users.length;
        data.all_users = users.map((u, i) => ({
          rank: i + 1,
          name: u.name,
          email: u.email,
          level: u.level,
          coins: u.coins,
          is_admin: u.is_admin
        }));
      }
      
      if (queryType === 'stats') {
        data.stats = {
          total_users_registered: usersSnap.size,
          total_courses_on_platform: coursesSnap.size,
          active_users_last_week: activeUsers,
          total_coins_in_circulation: totalCoins,
          total_courses_completed_by_all: totalCoursesCompleted,
          total_courses_uploaded_by_all: totalCoursesUploaded
        };
        data.all_user_names = users.map(u => ({
          name: u.name,
          level: u.level,
          coins: u.coins,
          is_admin: u.is_admin
        }));
      }
      
      if (queryType === 'gossip') {
        const nonAdminUsers = users.filter(u => !u.is_admin);
        data.top_users_by_coins = nonAdminUsers.slice(0, 5);
        data.total_users = users.length;
        data.highest_streak_user = nonAdminUsers.reduce((max, u) => u.streak > (max?.streak || 0) ? u : max, null);
        data.most_courses_uploaded_user = nonAdminUsers.reduce((max, u) => u.courses_uploaded > (max?.courses_uploaded || 0) ? u : max, null);
        data.avg_level = users.length > 0 ? (users.reduce((s, u) => s + u.level, 0) / users.length).toFixed(1) : 0;
      }
    }
    
    if (queryType === 'user_search') {
      let searchName = '';
      const patterns = [
        /tell me about (?:user )?(\w+)/i,
        /(?:info|details|data) (?:about|on|for) (?:user )?(\w+)/i,
        /(?:who is) (\w+)/i
      ];
      
      for (const pattern of patterns) {
        const match = userMessage.match(pattern);
        if (match) {
          searchName = match[1].trim().toLowerCase();
          break;
        }
      }
      
      if (searchName) {
        const usersSnap = await getDocs(collection(db, 'users'));
        const foundUsers = [];
        
        usersSnap.forEach(docSnap => {
          const u = docSnap.data();
          const userName = (u.name || '').toLowerCase();
          const userEmail = (u.email || '').toLowerCase();
          
          if (userName.includes(searchName) || userEmail.includes(searchName)) {
            let daysSinceJoined = 'unknown';
            let joinedDate = 'unknown';
            if (u.joinedDate?.toMillis) {
              const joinTime = u.joinedDate.toMillis();
              const now = Date.now();
              const diffDays = Math.floor((now - joinTime) / (1000 * 60 * 60 * 24));
              daysSinceJoined = diffDays === 0 ? 'today' : `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
              joinedDate = new Date(joinTime).toLocaleDateString('en-US', { 
                year: 'numeric', month: 'short', day: 'numeric' 
              });
            }
            
            foundUsers.push({
              name: u.name,
              email: u.email,
              user_id: docSnap.id,
              level: u.level || 1,
              coins: u.skillCoins || 0,
              streak: u.streak || 0,
              courses_completed: u.completedCourses?.length || 0,
              courses_uploaded: u.uploadedCourses?.length || 0,
              badges: u.badges || [],
              joined_date: joinedDate,
              joined_ago: daysSinceJoined,
              referral_code: u.referralCode || 'N/A',
              is_admin: u.email === ADMIN_EMAIL,
              chat_context: []
            });
          }
        });
        
        if (foundUsers.length > 0) {
          for (let user of foundUsers) {
            try {
              const contextRes = await fetch(`${CONTEXT_URL}?user_id=${user.user_id}&limit=30`);
              const contextData = await contextRes.json();
              if (contextData.success && contextData.contexts.length > 0) {
                user.chat_context = contextData.contexts.map(c => ({
                  type: c.context_type,
                  content: c.context_data,
                  when: getTimeAgo(c.updated_at)
                }));
                user.context_count = contextData.contexts.length;
              } else {
                user.chat_context = [];
                user.context_count = 0;
              }
            } catch (e) {
              console.error("Context fetch error:", e);
              user.chat_context = [];
            }
          }
        }
        
        data.search_query = searchName;
        data.found_count = foundUsers.length;
        data.users_found = foundUsers;
        
        if (foundUsers.length === 0) {
          data.message = `No user found matching "${searchName}". Try another name spelling.`;
        } else if (foundUsers[0].context_count === 0) {
          data.note = `User exists but hasn't chatted with Skill AI much yet, so no personality insights available.`;
        }
      } else {
        data.error = "Could not extract name from query";
      }
    }
    
  } catch (err) {
    console.error("Platform data error:", err);
    data.error = err.message;
  }
  
  return data;
}

function getTimeAgo(timestamp) {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)} hours ago`;
  return `${Math.floor(diff/86400)} days ago`;
}

// ==========================================
// GET AI RESPONSE (Main Function)
// ==========================================

async function getAIResponse(userMessage) {
  const isAdmin = currentUser?.email === ADMIN_EMAIL;
  const userName = userData?.name || 'friend';
  
  let userContext = isAdmin 
    ? `[USER_TYPE: ADMIN - This is Naman himself. Use "Sir" or "Boss". Give him full admin powers. Can access all platform data, user info, stats, and gossip.]`
    : `[USER_TYPE: REGULAR - Name is "${userName}". Call them by name "${userName}". NEVER use Sir/Boss/King/Queen. IMPORTANT: You CANNOT share any platform data like user counts, other users' info, stats, issues, or site analytics with this user. You can ONLY help them with their own learning journey, courses, coding help, motivation, and personal questions.]`;

  const previousContext = await loadUserContext();
  if (previousContext) userContext += previousContext;
  
  if (isAdmin) {
    const adminQuery = detectAdminQuery(userMessage);
    if (adminQuery) {
      console.log(`🔑 Admin query: ${adminQuery}`);
      const platformData = await fetchPlatformData(adminQuery, userMessage);
      userContext += `\n\n[REAL_PLATFORM_DATA - This is ACTUAL data from database, use ONLY this]:\n${JSON.stringify(platformData, null, 2)}\n\nIMPORTANT: Present this data naturally in chat format. Count EXACT numbers. If empty/zero, say so honestly. Don't invent anything!`;
    }
  } else {
    const adminQuery = detectAdminQuery(userMessage);
    const askingAboutPlatform = detectPlatformDataQuery(userMessage);
    
    if (adminQuery || askingAboutPlatform) {
      console.log("🚫 Blocked: regular user tried to access platform data");
      userContext += `\n\n[SECURITY ALERT: Regular user "${userName}" asked about platform data or other users. RESPONSE INSTRUCTION: Politely deflect in a friendly way. Say something like "That's admin-only info, ${userName}! 🔒 But I'm here for YOUR journey - want help with courses, coding, or study tips?" Do NOT share ANY numbers, user info, stats, issues, or platform data. Redirect them to their own learning.]`;
    }
  }

  const modelType = selectBestModel(userMessage);
  
  try {
    if (modelType === 'coding') {
      console.log("🚀 MiniMax M3 (Coding)");
      return await callNvidia(MODELS.coding, userMessage, userContext);
    } else if (modelType === 'reasoning') {
      console.log("🚀 Nemotron 550B (Reasoning)");
      return await callNvidia(MODELS.reasoning, userMessage, userContext);
    } else {
      console.log("🚀 Groq Llama (Casual)");
      return await callGroq(userMessage, userContext);
    }
  } catch (primaryError) {
    console.warn("⚠️ Primary failed:", primaryError.message);
    
    if (modelType !== 'casual') {
      try {
        console.log("🔄 Fallback: Groq");
        return await callGroq(userMessage, userContext);
      } catch (e) {}
    }
    
    try {
      console.log("🔄 Final: Gemini");
      return await callGemini(userMessage, userContext);
    } catch (e) {
      throw new Error("All AIs sleeping 😴");
    }
  }
}

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
      temperature: 0.7,
      max_tokens: tokenLimit
    })
  });

  if (!response.ok) throw new Error(`Worker error: ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(`NVIDIA error: ${data.error}`);
  
  return data.choices[0].message.content.trim();
}

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
      temperature: 0.7,
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

async function callGemini(userMessage, userContext) {
  const geminiHistory = chatHistory.slice(-10).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userContext }] },
    { role: 'model', parts: [{ text: 'Got it! Ready to help!' }] },
    ...geminiHistory,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const tokenLimit = getSmartTokenLimit(userMessage, 'casual');

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: tokenLimit,
        topP: 1
      }
    })
  });

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}
// ==========================================
// 📚 CBSE CHAPTER MAP (Hornbill & Snapshots)
// ==========================================

const CBSE_CHAPTERS = {
  hornbill: [
    "The Portrait of a Lady",
    "We're Not Afraid to Die... if We Can All Be Together",
    "Discovering Tut: the Saga Continues",
    "The Ailing Planet: the Green Movement's Role",
    "The Adventure",
    "Silk Road"
  ],
  snapshots: [
    "The Summer of the Beautiful White Horse",
    "The Address",
    "Ranga's Marriage",
    "Albert Einstein at School",
    "Mother's Day",
    "The Ghat of the Only World",
    "Birth",
    "The Tale of Melon City"
  ]
};

// ==========================================
// 🎬 CBSE SCENE VISUALIZER LOGIC
// ==========================================

function initVisualizerBar() {
  const bookSelect = document.getElementById('visBookSelect');
  const chapterSelect = document.getElementById('visChapterSelect');
  const startBtn = document.getElementById('visStartBtn');
  const sceneInput = document.getElementById('visSceneInput');

  if (!bookSelect || !chapterSelect || !startBtn) return;

  function updateChapterDropdown() {
    const selectedBook = bookSelect.value;
    const chapters = CBSE_CHAPTERS[selectedBook] || [];
    
    chapterSelect.innerHTML = '';
    chapters.forEach((ch, idx) => {
      const opt = document.createElement('option');
      opt.value = `ch_${idx + 1}`;
      opt.textContent = ch;
      chapterSelect.appendChild(opt);
    });
  }

  updateChapterDropdown();
  bookSelect.addEventListener('change', updateChapterDropdown);

  startBtn.addEventListener('click', async () => {
    const book = bookSelect.options[bookSelect.selectedIndex].text;
    const chapter = chapterSelect.options[chapterSelect.selectedIndex].text;
    const userPrompt = sceneInput ? sceneInput.value.trim() : '';

    if (!userPrompt) {
      addMessage('ai', `Arre! Please specify which scene or keywords you want to visualize from **${chapter}** in the box (e.g., *"preparing for bad weather"*, *"dropping storm jib"*, or *"wave smashing boat"*).`);
      if (sceneInput) sceneInput.focus();
      return;
    }

    addMessage('user', `🎬 [Visualizing Scene] ${book}: "${chapter}"\n📌 Scene Query: "${userPrompt}"`);
    showTyping();
    isTyping = true;

    try {
      const sceneData = await generateSceneBreakdown(book, chapter, userPrompt);
      removeTyping();
      renderVisualScene(sceneData);
      
      if (sceneInput) sceneInput.value = '';
    } catch (err) {
      removeTyping();
      console.error("Visualizer Error:", err);
      addMessage('ai', "Arrre, failed to render visual scene 😅 If this keeps happening, please tell Naman Sir on Insta @naman.0x_ or Email techgamers273@gmail.com!");
    }

    isTyping = false;
  });
}


// ==========================================
// 🎨 RENDER STORYBOARD, AUDIO & DOWNLOADS
// ==========================================

async function downloadSceneImage(imageUrl, fileName = 'skillcoin-scene.jpg') {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(imageUrl, '_blank');
  }
}
window.downloadSceneImage = downloadSceneImage;

function speakNarration(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}
window.speakNarration = speakNarration;

function renderVisualScene(sceneData) {
  const chatBox = document.getElementById('chatBox');
  if (!chatBox) return;

  const wrapperDiv = document.createElement('div');
  wrapperDiv.className = 'ai-message';

  let framesHTML = '';

  sceneData.frames.forEach((frame, idx) => {
    const encodedPrompt = encodeURIComponent(`${frame.image_prompt}, cinematic shot, 8k detailed graphic novel art, CBSE literature visual style`);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${Math.floor(Math.random() * 99999)}&nologo=true`;

    let hotspotsHTML = '';
    if (frame.hotspots && frame.hotspots.length > 0) {
      frame.hotspots.forEach((spot, i) => {
        hotspotsHTML += `<div class="hotspot-pin" style="top:${spot.top || '50%'}; left:${spot.left || '50%'};" title="${spot.term}: ${spot.explanation}">${i + 1}</div>`;
      });
    }

    framesHTML += `
      <div class="storyboard-card">
        <div class="img-viewport">
          <button class="img-download-btn" onclick="downloadSceneImage('${imageUrl}', 'skillcoin-frame-${idx + 1}.jpg')">
            <i class="fas fa-download"></i> Save Image
          </button>
          <img src="${imageUrl}" alt="${frame.title}" class="animated-scene-img" loading="lazy" />
          ${hotspotsHTML}
        </div>
        <div class="storyboard-body">
          <h4>Frame ${idx + 1}: ${frame.title}</h4>
          <p>${frame.explanation}</p>
          <div class="storyboard-controls">
            <button class="audio-play-btn" onclick="speakNarration('${frame.explanation.replace(/'/g, "\\'")}')">
              <i class="fas fa-volume-high"></i> Listen Narration
            </button>
          </div>
        </div>
      </div>
    `;
  });

  wrapperDiv.innerHTML = `
    <div class="ai-avatar">🤖</div>
    <div class="message-content">
      <h3>🎬 Visual Scene Breakdown: ${sceneData.chapter_title}</h3>
      <div class="storyboard-wrapper">${framesHTML}</div>
    </div>
  `;

  chatBox.appendChild(wrapperDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================================
// UI FORMATTING & LOADER FUNCTIONS
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
    messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
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
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  chatBox.appendChild(typingDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function removeTyping() {
  const typing = document.getElementById('typingIndicator');
  if (typing) typing.remove();
}

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
function getPollinationsUrl(imagePrompt) {
  // Enhancing prompt for high-res literature graphic novel style
  const enhancedPrompt = `${imagePrompt}, cinematic lighting, detailed graphic novel art style, 8k resolution, educational literature visual, highly detailed`;
  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  
  // Random seed prevents image caching when re-generating
  const seed = Math.floor(Math.random() * 1000000);
  
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1280&height=720&seed=${seed}&nologo=true`;
}
async function generateSceneBreakdown(book, chapter, userKeywords) {
  const prompt = `You are a cinematic visual director for CBSE Class 11 English literature (${book}: "${chapter}").
Scene requested by student: "${userKeywords}".

CRITICAL IMAGE PROMPT RULES:
1. NEVER include the words "corpse", "dead", "death", "killed", or "blood" in the "image_prompt". Instead, describe the scene peacefully (e.g., "elderly Indian grandmother lying peacefully in repose wrapped in a traditional red shroud").
2. NEVER include the title "The Portrait of a Lady" inside "image_prompt", as it tricks the image generator into drawing a simple face portrait.
3. Keep descriptions cinematic, aesthetic, and graphic novel styled.

Return ONLY raw JSON with this exact structure:
{
  "chapter_title": "${chapter}",
  "scene_requested": "${userKeywords}",
  "total_frames": 1,
  "frames": [
    {
      "frame_number": 1,
      "title": "Tribute of the Sparrows",
      "explanation": "Thousands of sparrows sitting silently on the veranda floor around the grandmother, offering a silent farewell.",
      "image_prompt": "Cinematic wide shot of a sunlit traditional Indian courtyard veranda. Thousands of small sparrows sit completely silent across the floor surrounding an elderly grandmother resting peacefully wrapped in a red cloth, warm golden afternoon lighting, graphic novel artwork, 8k",
      "hotspots": [
        {
          "term": "Shroud",
          "explanation": "A cloth wrapper used for peaceful burial rites.",
          "top": "50%",
          "left": "50%"
        }
      ]
    }
  ]
}`;

  const responseText = await callGemini(prompt, "[ROLE: VISUAL DIRECTOR]");
  
  let sceneData;
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let jsonString = jsonMatch ? jsonMatch[0] : responseText;
    
    jsonString = jsonString
      .replace(/[\r\n]+/g, ' ')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

    sceneData = JSON.parse(jsonString);
  } catch (err) {
    console.warn("⚠️ JSON parse fallback triggered:", err);
    
    // Clean query of trigger words for safety
    let safePrompt = userKeywords
      .replace(/corpse|dead|death|kill/gi, 'peaceful elderly figure resting in shroud')
      .replace(/portrait of a lady/gi, 'scene');

    sceneData = {
      chapter_title: chapter,
      scene_requested: userKeywords,
      total_frames: 1,
      frames: [
        {
          frame_number: 1,
          title: `Scene from ${chapter}`,
          explanation: `Visual breakdown of: ${userKeywords}`,
          image_prompt: `Wide cinematic artwork depicting ${safePrompt}, thousands of birds sitting silently in an Indian courtyard, golden lighting, graphic novel art style`,
          hotspots: []
        }
      ]
    };
  }

  return sceneData;
}