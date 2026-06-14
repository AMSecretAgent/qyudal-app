/**
 * Qyudal — React Native Expo App (EXTENDED + FIREBASE AUTH)
 * AI: Gemini 2.0 Flash (replaces Groq) — free tier, Google-native
 * Features: Confidence Score, 7-agent analysis, Firebase Auth/Firestore
 * Fixes: fast images, story-specific images, infinite scroll
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, Animated, ActivityIndicator,
  StatusBar, SafeAreaView, RefreshControl, Platform,
  FlatList, Image, BackHandler, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD4RqT-Za2o4NQt_4u5Wt8eB1GVSsHZAIM",
  authDomain: "pulse-2b38d.firebaseapp.com",
  projectId: "pulse-2b38d",
  storageBucket: "pulse-2b38d.firebasestorage.app",
  messagingSenderId: "301172023984",
  appId: "1:301172023984:web:b8179d7254cd65e00e9175",
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db   = getFirestore(firebaseApp);

async function fbSignUp(email, password, name, age) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    email, name: name.trim(), age: parseInt(age, 10), createdAt: serverTimestamp(),
  });
  return cred.user;
}
async function fbLogIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
function friendlyAuthError(code) {
  const map = {
    'auth/email-already-in-use':   'That email is already registered. Try logging in.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/user-not-found':         'No account found with that email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/too-many-requests':      'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

const NEWS_API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
let _geminiModel = 'gemini-2.0-flash'; // confirmed working model


const NEWS_QUERIES = [
  { q: 'geopolitics OR war OR conflict OR UN OR NATO',               cat: 'GEOPOLITICS', cc: '#5eadf5', gi: 0 },
  { q: 'artificial intelligence OR AI OR tech OR OpenAI OR Google',  cat: 'TECH & AI',   cc: '#00e5b0', gi: 1 },
  { q: 'economy OR inflation OR Federal Reserve OR stock market',     cat: 'ECONOMY',     cc: '#f5a623', gi: 2 },
  { q: 'India OR Modi OR BJP OR Indian economy',                      cat: 'INDIA',       cc: '#a855f7', gi: 3 },
  { q: 'climate change OR environment OR carbon OR renewable energy', cat: 'CLIMATE',     cc: '#ff4d6d', gi: 4 },
];

const GRADS = [
  ['#010a1f', '#061530'],
  ['#010f08', '#031a0e'],
  ['#0e0800', '#1a0d00'],
  ['#07041a', '#0d0724'],
  ['#0e0402', '#180700'],
];

const { width: W, height: H } = Dimensions.get('window');

const C = {
  bg: '#03030e', bg1: '#08081c', bg2: '#0d0d28',
  indigo: '#5b4fe8', cyan: '#00e5b0', gold: '#f5a623',
  rose: '#ff4d6d', violet: '#a855f7',
  white: '#eef0ff', muted: 'rgba(238,240,255,0.45)',
  faint: 'rgba(238,240,255,0.16)', border: 'rgba(238,240,255,0.09)',
};

// ─── FAST IMAGE HELPER — w=300,q=55 for instant loading ──────────
const U = (id) => `https://images.unsplash.com/${id}?w=150&auto=format&fit=crop&q=35`;

const ZODIAC_IMAGES = [
  U('photo-1419242902214-272b3f66ee7a'), U('photo-1444703686981-a3abbc4d4fe3'),
  U('photo-1462331940025-496dfbfc7564'), U('photo-1451187580459-43490279c0fa'),
  U('photo-1464802686167-b39a02a7c88f'), U('photo-1446776811953-b23d57bd21aa'),
  U('photo-1543722530-d2c3201371e6'),   U('photo-1516339901601-2e1b62dc0c45'),
  U('photo-1476231682828-37e571bc172f'), U('photo-1502810190503-8303352d0dd1'),
  U('photo-1520034475321-cbe63696469a'), U('photo-1534796636912-3b584b664eda'),
];

const RECIPE_IMAGES = [
  U('photo-1603894584373-5ac82b2ae398'), U('photo-1571934811356-5cc061b6821f'),
  U('photo-1567620905732-2d1ec7ab7445'), U('photo-1585937421612-70a008356fbe'),
  U('photo-1541519227354-08fa5d50c820'), U('photo-1563379091339-03b21ab4a4f8'),
  U('photo-1606313564200-e75d5e30476c'), U('photo-1541014741259-de529411b96a'),
  U('photo-1546039907-7fa05f864c02'),   U('photo-1565299624946-b28f40a0ae38'),
  U('photo-1540189549336-e6e99c3679fe'), U('photo-1565958011703-44f9829ba187'),
  U('photo-1482049016688-2d3e1b311543'), U('photo-1473093295043-cdd812d0e601'),
  U('photo-1504674900247-0877df9cc836'), U('photo-1512621776951-a57141f2eefd'),
  U('photo-1473093226795-af9932fe5856'), U('photo-1555126634-323283e090fa'),
  U('photo-1574484284002-952d92456975'), U('photo-1490645935967-10de6ba17061'),
];

const HEALTH_IMAGES = [
  U('photo-1506629082955-511b1aa562c8'), U('photo-1476480862126-209bfaa8edc8'),
  U('photo-1506126613408-eca07ce68773'), U('photo-1490645935967-10de6ba17061'),
  U('photo-1549576490-b0b4831ef60a'),   U('photo-1455526050980-d3e7b803896c'),
  U('photo-1512621776951-a57141f2eefd'), U('photo-1534438327276-14e5300c3a48'),
  U('photo-1544367567-0f2fcb009e0b'),   U('photo-1517836357463-d25dfeac3438'),
  U('photo-1571019613454-1cb2f99b2d8b'), U('photo-1540497077202-7c8a3999166f'),
  U('photo-1547592180-85f173990554'),   U('photo-1558618666-fcd25c85cd64'),
  U('photo-1581009137042-c552e485697a'), U('photo-1593079831268-3381b0db4a77'),
  U('photo-1552674605-db6ffd4facb5'),   U('photo-1571019614242-c5c5dee9f50b'),
  U('photo-1549060279-7e168fcee0c2'),   U('photo-1517963879433-6ad2b056d712'),
];

const STUDY_IMAGES = [
  U('photo-1456513080510-7bf3a84b82f8'), U('photo-1434030216411-0b793f4b4173'),
  U('photo-1503676260728-1c00da094a0b'), U('photo-1488190211105-8b0e65b80b4e'),
  U('photo-1427504494785-3a9ca7044f45'), U('photo-1519791883288-dc8bd696e667'),
  U('photo-1580582932707-520aed937b7b'), U('photo-1491841550275-ad7854e35ca6'),
  U('photo-1471958680802-1345a694ba6d'), U('photo-1497633762265-9d179a990aa6'),
  U('photo-1524178232363-1fb2b075b655'), U('photo-1488751045188-3c55bbf9a3fa'),
  U('photo-1515378791036-0648a3ef77b2'), U('photo-1610484826967-09c5720778c7'),
  U('photo-1553877522-43269d4ea984'),   U('photo-1546410531-bb4caa6b5930'),
  U('photo-1532012197267-da84d127e765'), U('photo-1455894127589-22f75500213a'),
  U('photo-1604933762021-5a3e6d5f0d40'), U('photo-1551076805-e1869033e561'),
];

// ─── PUZZLE IMAGES — themed per puzzle type ───────────────────────
const PUZZLE_IMAGES = [
  U('photo-1606326608606-aa0b62935f2b'), // chess pieces — Sudoku
  U('photo-1632501641765-e568d28b0015'), // scrabble letters — Word Search
  U('photo-1456513080510-7bf3a84b82f8'), // open dictionary — Vocabulary
  U('photo-1507679799987-c73779587ccf'), // person thinking — Brain Teasers
  U('photo-1518133910546-b6c2fb7d79e3'), // chalkboard equations — Math Sprint
];

const FEED_CATEGORIES = [
  { id: 'general',           label: 'General'          },
  { id: 'hot',               label: 'Hot'              },
  { id: 'current_affairs',   label: 'Current Affairs'  },
  { id: 'business',          label: 'Business'         },
  { id: 'sports',            label: 'Sports'           },
  { id: 'science',           label: 'Science'          },
  { id: 'technology',        label: 'Tech'             },
  { id: 'bollywood',         label: 'Bollywood'        },
  { id: 'horoscope',         label: 'Horoscope'        },
  { id: 'study',             label: 'Study'            },
  { id: 'recipes',           label: 'Recipes'          },
  { id: 'healthy_lifestyle', label: 'Healthy Lifestyle'},
  { id: 'success_stories',   label: 'Success Stories'  },
  { id: 'puzzles',           label: 'Puzzles'          },
];

const SPECIAL_CATEGORIES = new Set([
  'horoscope','study','recipes','healthy_lifestyle','success_stories','puzzles',
]);

const PAGE_SIZE_SPECIAL = 8;

const hasCJK = (text = '') =>
  /[\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F]/.test(text);

// ─── LIVE NEWS ────────────────────────────────────────────────────
async function fetchLiveNews(category = 'general', page = 1) {
  if (SPECIAL_CATEGORIES.has(category)) {
    return generateSpecialContent(category, page);
  }

  const stories = [];
  let fetchUrl;

  if (category === 'current_affairs') {
    fetchUrl = `https://newsapi.org/v2/everything?q=UPSC+OR+government+exam+OR+civil+services+OR+India+policy+OR+constitution+OR+parliament&language=en&sortBy=publishedAt&pageSize=20&page=${page}&apiKey=${NEWS_API_KEY}`;
  } else if (category === 'hot') {
    fetchUrl = `https://newsapi.org/v2/top-headlines?country=us&pageSize=20&page=${page}&apiKey=${NEWS_API_KEY}`;
  } else if (category === 'bollywood') {
    fetchUrl = `https://newsapi.org/v2/everything?q=bollywood&language=en&sortBy=publishedAt&pageSize=20&page=${page}&apiKey=${NEWS_API_KEY}`;
  } else if (category === 'general') {
    const multiResults = await Promise.allSettled(
      NEWS_QUERIES.map(async ({ q, cat, cc, gi }) => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=10&page=${page}&apiKey=${NEWS_API_KEY}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (data.status !== 'ok' || !data.articles?.length) return [];
        return data.articles
          .filter(a => a.title && a.description && a.title !== '[Removed]' && a.description !== '[Removed]' && !hasCJK(a.title) && !hasCJK(a.description))
          .map(a => buildStory(a, cat, cc, gi, page));
      })
    );
    multiResults.forEach(r => { if (r.status === 'fulfilled') stories.push(...r.value); });
    stories.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    for (let i = stories.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stories[i], stories[j]] = [stories[j], stories[i]];
    }
    return stories;
  } else {
    fetchUrl = `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=20&page=${page}&apiKey=${NEWS_API_KEY}`;
  }

  try {
    const res  = await fetch(fetchUrl);
    const data = await res.json();
    if (data.status !== 'ok' || !data.articles?.length) return [];
    const { cc, gi } = getCategoryMeta(category);
    data.articles.forEach(article => {
      if (!article.title || !article.description || article.title === '[Removed]' || article.description === '[Removed]' || hasCJK(article.title) || hasCJK(article.description)) return;
      stories.push(buildStory(article, category.toUpperCase(), cc, gi, page));
    });
  } catch (err) {
    console.log(`News fetch failed for ${category}:`, err.message);
  }
  return stories;
}

// ─── SPECIAL CONTENT — paginated (PAGE_SIZE_SPECIAL per page) ────
function generateSpecialContent(category, page = 1) {
  const all   = getAllSpecialItems(category);
  const start = (page - 1) * PAGE_SIZE_SPECIAL;
  const slice = all.slice(start, start + PAGE_SIZE_SPECIAL);
  if (slice.length === 0 && all.length > 0) {
    // cycle: wrap around with fresh IDs so scroll never ends
    return all.slice(0, PAGE_SIZE_SPECIAL).map(item => ({
      ...item,
      id: `${item.id}-cycle-p${page}-${Math.random().toString(36).slice(2, 6)}`,
    }));
  }
  return slice;
}

function getAllSpecialItems(category) {
  switch (category) {
    case 'horoscope':          return generateHoroscopeCards();
    case 'study':              return generateStudyCards();
    case 'recipes':            return generateRecipeCards();
    case 'healthy_lifestyle':  return generateHealthCards();
    case 'success_stories':    return generateSuccessCards();
    case 'puzzles':            return generatePuzzleCards();
    default: return [];
  }
}

// ─── HOROSCOPE (12 signs) ─────────────────────────────────────────
function generateHoroscopeCards() {
  const signs = [
    { name: 'Aries',       emoji: '♈', dates: 'Mar 21 – Apr 19', element: 'Fire',  color: '#ff4d6d' },
    { name: 'Taurus',      emoji: '♉', dates: 'Apr 20 – May 20', element: 'Earth', color: '#00e5b0' },
    { name: 'Gemini',      emoji: '♊', dates: 'May 21 – Jun 20', element: 'Air',   color: '#f5a623' },
    { name: 'Cancer',      emoji: '♋', dates: 'Jun 21 – Jul 22', element: 'Water', color: '#5eadf5' },
    { name: 'Leo',         emoji: '♌', dates: 'Jul 23 – Aug 22', element: 'Fire',  color: '#f5a623' },
    { name: 'Virgo',       emoji: '♍', dates: 'Aug 23 – Sep 22', element: 'Earth', color: '#00e5b0' },
    { name: 'Libra',       emoji: '♎', dates: 'Sep 23 – Oct 22', element: 'Air',   color: '#a855f7' },
    { name: 'Scorpio',     emoji: '♏', dates: 'Oct 23 – Nov 21', element: 'Water', color: '#ff4d6d' },
    { name: 'Sagittarius', emoji: '♐', dates: 'Nov 22 – Dec 21', element: 'Fire',  color: '#5b4fe8' },
    { name: 'Capricorn',   emoji: '♑', dates: 'Dec 22 – Jan 19', element: 'Earth', color: '#5eadf5' },
    { name: 'Aquarius',    emoji: '♒', dates: 'Jan 20 – Feb 18', element: 'Air',   color: '#00e5b0' },
    { name: 'Pisces',      emoji: '♓', dates: 'Feb 19 – Mar 20', element: 'Water', color: '#a855f7' },
  ];
  return signs.map((s, i) => ({
    id: `horoscope-${s.name}`, type: 'horoscope', cat: 'HOROSCOPE', cc: s.color,
    gradStart: GRADS[i % 5][0], gradEnd: GRADS[i % 5][1],
    hl: `${s.emoji} ${s.name}`, sm: `${s.dates} · ${s.element} Sign`,
    src: 'Daily Horoscope', tm: 'Today',
    image: ZODIAC_IMAGES[i], tags: [s.name, s.element, 'Horoscope', 'Today'],
    gi: i % 5, score: 90 + Math.floor(Math.random() * 9),
    zodiacData: s, publishedAt: new Date().toISOString(),
  }));
}

// ─── STUDY CARDS — 20 items ───────────────────────────────────────
function generateStudyCards() {
  const items = [
    { hl: '5 Proven Memory Techniques for Exam Success', sm: 'Spaced repetition, active recall, and mind mapping can triple your retention rates within weeks.', tags: ['Memory', 'Exams', 'Study'] },
    { hl: 'The Pomodoro Technique: Study Smarter in 25-Minute Bursts', sm: 'Break study sessions into focused intervals separated by short breaks to maximise concentration.', tags: ['Pomodoro', 'Focus', 'Productivity'] },
    { hl: 'How Toppers Crack Competitive Exams on First Attempt', sm: 'Insights from IAS, UPSC, and CAT toppers on their daily routines, study materials and mindset.', tags: ['Toppers', 'Strategy', 'UPSC'] },
    { hl: 'Active Recall vs Re-Reading: Which Actually Works?', sm: 'Science shows active recall outperforms passive re-reading by a factor of 3 for long-term retention.', tags: ['Research', 'Recall', 'Learning'] },
    { hl: 'Building a Study Schedule That You Will Actually Follow', sm: 'Practical tips for time blocking, priority setting, and building habits that stick even under stress.', tags: ['Schedule', 'Habits', 'Planning'] },
    { hl: 'Digital Detox During Exams: The Ultimate Study Hack', sm: 'Removing phone distractions for just 2 hours a day can increase your study output by over 40%.', tags: ['Focus', 'Digital', 'Detox'] },
    { hl: 'Cornell Note-Taking System: The Secret of Ivy League Students', sm: 'A structured method that organises information for review, boosting comprehension and recall.', tags: ['Notes', 'Cornell', 'Learning'] },
    { hl: 'Understanding Over Memorisation: The Concept-First Approach', sm: 'Building conceptual frameworks before drilling facts leads to deeper understanding and better performance.', tags: ['Concepts', 'Understanding', 'Learning'] },
    { hl: 'The Feynman Technique: Teach It to Truly Know It', sm: 'Explaining a concept in simple language to an imaginary student is the most reliable test of understanding.', tags: ['Feynman', 'Teaching', 'Mastery'] },
    { hl: 'Mind Mapping: Visual Thinking for Complex Subjects', sm: 'Drawing idea webs instead of linear notes activates both brain hemispheres and dramatically boosts recall.', tags: ['MindMap', 'Visual', 'Creative'] },
    { hl: 'The Science of Sleep and Memory Consolidation', sm: 'Studying before sleep encodes information 40% better—and 7-9 hours of rest transforms academic performance.', tags: ['Sleep', 'Memory', 'Science'] },
    { hl: 'Overcoming Exam Anxiety: 7 Proven Strategies', sm: 'From box breathing to visualisation, science-backed techniques to quiet nerves and perform at your best.', tags: ['Anxiety', 'Exams', 'Mindset'] },
    { hl: 'Group Study vs Solo Study: Which Works Better?', sm: 'Research reveals exactly when group study is a superpower—and when it quietly destroys your preparation.', tags: ['Group', 'Strategy', 'Research'] },
    { hl: 'Using YouTube and Podcasts for Effective Learning', sm: 'How to turn passive video watching into active learning sessions that genuinely build real knowledge.', tags: ['YouTube', 'Podcasts', 'Digital'] },
    { hl: 'The 80/20 Rule Applied to Exam Preparation', sm: 'Only 20% of topics account for 80% of marks. Here is how to identify and master that high-yield content.', tags: ['Pareto', 'Strategy', 'Efficiency'] },
    { hl: 'Building Mental Stamina for Long Study Sessions', sm: 'Progressive overload is not just for the gym. Train your brain to sustain 6+ hours of deep focus.', tags: ['Stamina', 'Deep Work', 'Mental'] },
    { hl: 'How to Write Perfect Answers in Board Exams', sm: 'Examiner-backed techniques for structuring answers and using keywords to maximise marks.', tags: ['Boards', 'Writing', 'Marks'] },
    { hl: 'Overcoming Procrastination: The 2-Minute Rule', sm: 'If a task takes less than 2 minutes, do it immediately. This one rule eliminates 70% of academic delays.', tags: ['Procrastination', 'Habits', 'Motivation'] },
    { hl: 'Smart Note-Taking Apps That Top Students Actually Use', sm: 'From Notion to Anki to Obsidian—a practical guide to digital tools that genuinely improve performance.', tags: ['Apps', 'Digital', 'Tools'] },
    { hl: 'How to Create a Distraction-Free Study Environment', sm: 'Environmental design principles that make deep focus the default—not the exception—for serious students.', tags: ['Environment', 'Focus', 'Setup'] },
  ];
  const cols = [C.cyan, C.indigo, C.gold, C.violet, '#5eadf5', C.rose, C.cyan, C.gold, C.indigo, C.violet,
                C.cyan, C.rose, C.gold, '#5eadf5', C.indigo, C.cyan, C.violet, C.gold, C.rose, C.indigo];
  return items.map((item, i) => ({
    id: `study-${i}`, type: 'study', cat: 'STUDY', cc: cols[i],
    gradStart: GRADS[i % 5][0], gradEnd: GRADS[i % 5][1],
    hl: item.hl, sm: item.sm,
    src: 'Study Hub', tm: 'Today',
    image: STUDY_IMAGES[i % STUDY_IMAGES.length],
    tags: item.tags, gi: i % 5, score: 88 + Math.floor(Math.random() * 10),
    studyContent: generateStudyDetail(item),
    publishedAt: new Date().toISOString(),
  }));
}

function generateStudyDetail(item) {
  return {
    title: item.hl, intro: item.sm,
    sections: [
      { heading: 'Why This Matters', body: 'Understanding effective study techniques is the difference between spending 10 hours and 4 hours achieving the same outcome. Research in cognitive psychology consistently shows that most students study ineffectively—not because they lack dedication, but because they use methods that feel productive but deliver poor results.' },
      { heading: 'The Core Principle', body: 'The brain encodes information through repeated, spaced exposure combined with active retrieval. Passive methods like re-reading and highlighting create an illusion of familiarity without building actual memory pathways. Active methods force your brain to work, strengthening neural connections.' },
      { heading: 'Step-by-Step Guide', body: '1. Start with a 5-minute preview of the material\n2. Set a timer for 25 minutes of focused study (no phone)\n3. After reading, close the book and write everything you remember\n4. Review your notes and fill in gaps\n5. Take a 5-minute break. Repeat. After 4 cycles, take a 30-minute break.' },
      { heading: 'Common Mistakes to Avoid', body: 'Do not study the same subject for more than 2 hours in one stretch. Do not rely on re-reading alone. Do not study lying down or in a dimly lit room. Do not skip breaks.' },
      { heading: 'Pro Tip', body: 'Teach what you have learned to someone else, or explain it out loud to yourself. The Feynman Technique of teaching concepts in simple language is one of the most reliable indicators of genuine understanding.' },
    ],
    keyTakeaways: ['Space your sessions across multiple days', 'Test yourself—don\'t just re-read', 'Take regular breaks to consolidate memory', 'Prioritise understanding over rote memorisation'],
  };
}

// ─── RECIPE CARDS — 20 items ──────────────────────────────────────
function generateRecipeCards() {
  const recipes = [
    { hl: 'Creamy Butter Chicken (Murgh Makhani)', sm: 'Rich, velvety tomato-based curry with tender chicken. Restaurant quality at home.', tags: ['Indian', 'Chicken', 'Curry'], emoji: '🍛', cookTime: '45 min', difficulty: 'Medium', color: '#f5a623' },
    { hl: 'Classic Masala Chai from Scratch', sm: 'Perfectly spiced Indian tea with fresh ginger, cardamom, cinnamon and black pepper.', tags: ['Drink', 'Tea', 'Chai'], emoji: '☕', cookTime: '15 min', difficulty: 'Easy', color: C.gold },
    { hl: 'Fluffy Banana Pancakes — 3 Ingredients', sm: 'Naturally sweet, gluten-free pancakes made with just banana, eggs and a pinch of salt.', tags: ['Breakfast', 'Healthy', 'Quick'], emoji: '🥞', cookTime: '10 min', difficulty: 'Easy', color: C.cyan },
    { hl: 'One-Pot Rajma Masala', sm: 'Hearty kidney bean curry slow-cooked with tomatoes, onions and a blend of whole spices.', tags: ['Vegetarian', 'Protein', 'Indian'], emoji: '🫘', cookTime: '40 min', difficulty: 'Easy', color: '#ff4d6d' },
    { hl: 'Avocado Toast with Poached Egg', sm: 'Creamy smashed avocado on sourdough, topped with a perfectly poached egg and chilli flakes.', tags: ['Breakfast', 'Healthy', 'Quick'], emoji: '🥑', cookTime: '12 min', difficulty: 'Easy', color: C.cyan },
    { hl: 'Hyderabadi Dum Biryani at Home', sm: 'Aromatic basmati rice layered with spiced meat, saffron and caramelised onions.', tags: ['Biryani', 'Indian', 'Rice'], emoji: '🍚', cookTime: '90 min', difficulty: 'Hard', color: C.gold },
    { hl: 'Chocolate Lava Cake in 20 Minutes', sm: 'Individual chocolate cakes with a warm, gooey molten centre. Impressive and irresistible.', tags: ['Dessert', 'Chocolate', 'Quick'], emoji: '🎂', cookTime: '20 min', difficulty: 'Medium', color: C.violet },
    { hl: 'Silky Homemade Hummus with Roasted Garlic', sm: 'Creamy chickpea dip with tahini, lemon juice and roasted garlic. Far better than store-bought.', tags: ['Dip', 'Healthy', 'Vegan'], emoji: '🥙', cookTime: '20 min', difficulty: 'Easy', color: '#5eadf5' },
    { hl: 'Dal Makhani: The Restaurant Secret Unlocked', sm: 'Slow-cooked black lentils simmered overnight with tomatoes, butter and cream.', tags: ['Lentils', 'Indian', 'Slow Cook'], emoji: '🫕', cookTime: '8 hr', difficulty: 'Easy', color: '#ff4d6d' },
    { hl: 'Overnight Oats: 5 Healthy Variations', sm: 'Prep breakfast in 5 minutes the night before. From mango coconut to peanut butter banana.', tags: ['Breakfast', 'Oats', 'Healthy'], emoji: '🥣', cookTime: '5 min', difficulty: 'Easy', color: C.cyan },
    { hl: 'Soft Garlic Naan Without a Tandoor', sm: 'Pillowy, buttery garlic naan made on a regular stovetop pan. Authentic texture guaranteed.', tags: ['Bread', 'Indian', 'Baking'], emoji: '🫓', cookTime: '30 min', difficulty: 'Medium', color: C.gold },
    { hl: 'Thai Green Curry in Under 30 Minutes', sm: 'Fragrant coconut-based curry with fresh herbs, vegetables and your choice of protein.', tags: ['Thai', 'Curry', 'Quick'], emoji: '🍜', cookTime: '28 min', difficulty: 'Easy', color: '#00e5b0' },
    { hl: 'Perfectly Chewy Chocolate Chip Cookies', sm: 'The secret: browned butter, rested dough, and flaky sea salt on top.', tags: ['Baking', 'Cookies', 'Dessert'], emoji: '🍪', cookTime: '25 min', difficulty: 'Easy', color: C.gold },
    { hl: 'Mango Lassi: The Perfect Summer Drink', sm: 'Thick, creamy mango yogurt drink with cardamom. Ready in 3 minutes.', tags: ['Drink', 'Mango', 'Summer'], emoji: '🥭', cookTime: '3 min', difficulty: 'Easy', color: '#f5a623' },
    { hl: 'Aloo Tikki Chaat: Street Food at Home', sm: 'Crispy spiced potato patties loaded with chutneys, yogurt, pomegranate and sev.', tags: ['Chaat', 'Street Food', 'Indian'], emoji: '🥔', cookTime: '35 min', difficulty: 'Medium', color: C.rose },
    { hl: 'No-Knead Sourdough Bread: Beginner Guide', sm: 'Artisan sourdough with crispy crust and open crumb—no experience or equipment required.', tags: ['Baking', 'Bread', 'Sourdough'], emoji: '🍞', cookTime: '12 hr', difficulty: 'Easy', color: '#5eadf5' },
    { hl: 'Palak Paneer: Silky Spinach & Cottage Cheese', sm: 'Vibrant green spinach gravy with soft paneer cubes—the classic Indian comfort dish.', tags: ['Vegetarian', 'Indian', 'Paneer'], emoji: '🥬', cookTime: '30 min', difficulty: 'Easy', color: '#00e5b0' },
    { hl: 'Shakshuka: One-Pan Middle Eastern Eggs', sm: 'Eggs poached in spiced tomato sauce—the best breakfast you can make in one pan.', tags: ['Eggs', 'Mediterranean', 'Brunch'], emoji: '🍳', cookTime: '20 min', difficulty: 'Easy', color: '#f5a623' },
    { hl: 'Chole Bhature: Punjabi Weekend Special', sm: 'Fluffy deep-fried bread paired with spiced chickpea curry—a legendary combo.', tags: ['Punjabi', 'Indian', 'Comfort'], emoji: '🫓', cookTime: '1 hr', difficulty: 'Medium', color: C.gold },
    { hl: 'Japanese Miso Soup from Scratch', sm: 'Delicate, umami-rich broth with tofu, seaweed and scallions in just 15 minutes.', tags: ['Japanese', 'Soup', 'Healthy'], emoji: '🍵', cookTime: '15 min', difficulty: 'Easy', color: '#5eadf5' },
  ];
  return recipes.map((r, i) => ({
    id: `recipe-${i}`, type: 'recipe', cat: 'RECIPES', cc: r.color,
    gradStart: GRADS[i % 5][0], gradEnd: GRADS[i % 5][1],
    hl: r.hl, sm: r.sm, src: 'Recipe Hub', tm: r.cookTime,
    image: RECIPE_IMAGES[i % RECIPE_IMAGES.length],
    tags: r.tags, gi: i % 5, score: 95,
    recipeData: getRecipeDetail(r, i),
    emoji: r.emoji, cookTime: r.cookTime, difficulty: r.difficulty,
    publishedAt: new Date().toISOString(),
  }));
}

function getRecipeDetail(r, i) {
  const base = {
    servings: 4,
    ingredients: ['Main ingredient', 'Secondary ingredient', 'Aromatics (garlic, ginger, onion)', 'Spice blend', 'Oil or butter', 'Salt and pepper to taste', 'Fresh herbs to garnish'],
    steps: [
      { num: 1, title: 'Prep ingredients', instruction: 'Wash, chop and measure all ingredients before you begin.' },
      { num: 2, title: 'Build the base', instruction: 'Heat oil in a pan over medium heat. Sauté aromatics until golden and fragrant, about 3-4 minutes.' },
      { num: 3, title: 'Add main components', instruction: 'Add main ingredients and spices. Stir well to coat everything evenly.' },
      { num: 4, title: 'Adjust and finish', instruction: 'Taste and adjust seasoning. Finish with fresh herbs or a squeeze of lemon.' },
    ],
    tips: 'Always taste as you cook and adjust seasoning gradually.',
  };
  const butter_chicken = {
    servings: 4,
    ingredients: ['700g chicken thighs', '2 tbsp butter', '1 cup heavy cream', '1 cup tomato puree', '1 large onion, diced', '4 garlic cloves, minced', '1 inch ginger, grated', '2 tsp garam masala', '1 tsp turmeric', '1 tsp chilli powder', '1 tsp cumin', 'Salt to taste', 'Fresh coriander to garnish'],
    steps: [
      { num: 1, title: 'Marinate chicken', instruction: 'Mix chicken with yogurt, turmeric, chilli powder and garam masala. Marinate at least 30 minutes.' },
      { num: 2, title: 'Cook the chicken', instruction: 'Heat butter in a pan over medium-high. Cook chicken until golden and slightly charred. Set aside.' },
      { num: 3, title: 'Make the sauce', instruction: 'Sauté onions until golden. Add garlic and ginger, cook 2 minutes. Add tomato puree and spices. Simmer 10 minutes.' },
      { num: 4, title: 'Add cream', instruction: 'Blend the sauce smooth. Return to pan, add cream and butter. Simmer on low for 5 minutes.' },
      { num: 5, title: 'Combine and serve', instruction: 'Add cooked chicken to the sauce. Simmer 5 more minutes. Garnish with coriander. Serve with naan or rice.' },
    ],
    tips: 'Use kasuri methi (dried fenugreek leaves) in the final step for authentic flavour.',
  };
  return { ...(i === 0 ? butter_chicken : base), name: r.hl, emoji: r.emoji, cookTime: r.cookTime, difficulty: r.difficulty };
}

// ─── HEALTH CARDS — 20 items ──────────────────────────────────────
function generateHealthCards() {
  const items = [
    { hl: '7-Minute Morning Yoga Routine for Beginners', sm: 'A gentle sequence of 8 poses to energise your body, release tension and improve flexibility before breakfast.', tags: ['Yoga', 'Morning', 'Beginner'], emoji: '🧘' },
    { hl: '10,000 Steps: The Science Behind the Daily Walk Goal', sm: 'Why daily walking is one of the most effective habits for cardiovascular health and longevity.', tags: ['Walking', 'Cardio', 'Habit'], emoji: '🚶' },
    { hl: 'The 5-Minute Breathing Exercise That Reduces Anxiety', sm: 'Box breathing used by Navy SEALs to instantly calm the nervous system and sharpen focus.', tags: ['Breathing', 'Anxiety', 'Calm'], emoji: '🌬️' },
    { hl: "Intermittent Fasting: A Beginner's Complete Guide", sm: 'Everything you need to know about the 16:8 method, its benefits for weight and metabolic health.', tags: ['Fasting', 'Diet', 'Wellness'], emoji: '🥗' },
    { hl: 'Fix Your Posture with These 5 Desk Stretches', sm: 'Simple exercises you can do at your desk to counteract hours of sitting and prevent back pain.', tags: ['Posture', 'Office', 'Stretches'], emoji: '💪' },
    { hl: 'Sleep Hygiene: 8 Habits for Deep, Restful Sleep', sm: 'Science-backed strategies to fall asleep faster, sleep deeper and wake up genuinely refreshed.', tags: ['Sleep', 'Rest', 'Recovery'], emoji: '😴' },
    { hl: 'Mindful Eating: Transform Your Relationship with Food', sm: 'Slow down, savour, and develop a healthier, more conscious approach to mealtimes.', tags: ['Mindful', 'Eating', 'Nutrition'], emoji: '🍎' },
    { hl: 'Cold Shower Benefits: What 30 Days Taught Me', sm: 'The science and personal experience of daily cold showers—metabolism, mood and discipline.', tags: ['Cold', 'Shower', 'Challenge'], emoji: '🚿' },
    { hl: '30-Day Push-Up Challenge: From 0 to 100', sm: 'A progressive programme that takes beginners to 100 consecutive push-ups using scientific overload.', tags: ['Push-ups', 'Strength', 'Challenge'], emoji: '💪' },
    { hl: 'Oil Pulling: The Ancient 20-Minute Morning Ritual', sm: "Ayurvedic practice of swishing oil in your mouth—modern science on its oral and systemic benefits.", tags: ['Ayurveda', 'Oral Health', 'Morning'], emoji: '✨' },
    { hl: 'Journaling for Mental Health: 10 Powerful Prompts', sm: 'Daily writing reduces cortisol, improves emotional clarity, and builds self-awareness in 10 minutes.', tags: ['Journal', 'Mental Health', 'Habits'], emoji: '📓' },
    { hl: 'Ayurvedic Morning Routine: 5 Ancient Daily Rituals', sm: 'Thousands of years of Indian wisdom condensed into a practical morning protocol for energy and clarity.', tags: ['Ayurveda', 'Morning', 'Rituals'], emoji: '🌅' },
    { hl: 'Fix Your Sleep Schedule in 7 Days: Full Protocol', sm: 'Circadian rhythm science: light exposure, meal timing and temperature hacks to reset your body clock fast.', tags: ['Sleep', 'Circadian', 'Reset'], emoji: '🌙' },
    { hl: 'Digital-Free Mornings: The 1-Hour Rule', sm: 'Why your first 60 minutes without a screen changes the entire neurochemistry of your day.', tags: ['Digital Detox', 'Mornings', 'Focus'], emoji: '📵' },
    { hl: 'Hydration Hacks: How to Actually Drink Enough Water', sm: 'Practical strategies beyond "drink 8 glasses"—habit stacking, electrolytes, and timing that work.', tags: ['Hydration', 'Water', 'Health'], emoji: '💧' },
    { hl: "Forest Bathing: Japan's Secret to Longevity", sm: 'Shinrin-yoku is proven to lower cortisol, blood pressure and inflammation. Here is the science.', tags: ['Nature', 'Stress', 'Japan'], emoji: '🌲' },
    { hl: 'HIIT vs Steady Cardio: Which Burns More Fat?', sm: 'A definitive breakdown of both protocols with research on which is better for your specific goals.', tags: ['HIIT', 'Cardio', 'Fitness'], emoji: '🏃' },
    { hl: 'The 5-Ingredient Anti-Inflammatory Smoothie', sm: 'Turmeric, ginger, spinach, banana and oat milk—one daily glass that fights inflammation at the source.', tags: ['Smoothie', 'Anti-Inflammation', 'Nutrition'], emoji: '🥤' },
    { hl: 'Barefoot Walking: The Surprising Benefits of Going Shoeless', sm: 'How walking barefoot on natural surfaces reconnects your nervous system and improves balance.', tags: ['Grounding', 'Barefoot', 'Wellness'], emoji: '🦶' },
    { hl: 'Power Naps: The Science of the Perfect 20-Minute Reset', sm: 'NASA research confirms: a 20-minute nap improves cognitive performance by 34% and alertness by 100%.', tags: ['Nap', 'Sleep', 'Performance'], emoji: '😪' },
  ];
  const cols = [C.cyan, '#00e5b0', C.indigo, C.gold, '#5eadf5', C.violet, C.cyan, C.rose,
                C.indigo, C.gold, C.cyan, C.violet, C.rose, '#5eadf5', C.cyan, C.gold,
                C.indigo, C.rose, C.cyan, C.violet];
  return items.map((item, i) => ({
    id: `health-${i}`, type: 'healthy_lifestyle', cat: 'HEALTHY LIFESTYLE', cc: cols[i],
    gradStart: GRADS[i % 5][0], gradEnd: GRADS[i % 5][1],
    hl: item.hl, sm: item.sm, src: 'Wellness Hub', tm: 'Today',
    image: HEALTH_IMAGES[i % HEALTH_IMAGES.length],
    tags: item.tags, gi: i % 5, score: 92 + Math.floor(Math.random() * 7),
    healthData: getHealthDetail(item, i),
    emoji: item.emoji, publishedAt: new Date().toISOString(),
  }));
}

function getHealthDetail(item, i) {
  return {
    title: item.hl, intro: item.sm, emoji: item.emoji,
    sections: [
      { heading: 'Overview', body: `${item.sm} This guide walks you through everything you need to get started safely and effectively.` },
      { heading: 'Key Benefits', body: '• Improved physical and mental wellbeing\n• Increased energy levels throughout the day\n• Better stress management and resilience\n• Enhanced sleep quality and recovery\n• Long-term disease prevention' },
      { heading: 'Getting Started', body: 'Begin gradually and listen to your body. Consistency matters far more than intensity. Start with 5-10 minutes daily and build up. The goal is a sustainable habit, not a short-term challenge.' },
      { heading: 'Step-by-Step Guide', body: '1. Set a specific time each day for this practice\n2. Prepare your environment in advance\n3. Start with the basic version before advancing\n4. Track your progress in a journal or app\n5. Rest when needed—recovery is part of the process' },
      { heading: 'Safety & Pro Tips', body: 'Always warm up before exercise. Stop if you feel sharp pain. Stay hydrated. Consult a doctor if you have pre-existing conditions. Pair this habit with an existing one for better adherence (habit stacking).' },
    ],
    keyPoints: ['Start small and build consistency', 'Listen to your body always', 'Pair with other healthy habits', 'Track progress to stay motivated'],
  };
}

// ─── SUCCESS STORIES — 16 items, STORY-SPECIFIC IMAGES ────────────
function generateSuccessCards() {
  const stories = [
    {
      hl: 'From Street Vendor to $1B Startup: The Ritesh Agarwal Story',
      sm: 'OYO founder Ritesh Agarwal dropped out of college at 17 and built a hotel empire spanning 35 countries.',
      person: 'Ritesh Agarwal', role: 'Founder, OYO Rooms', tags: ['Startup', 'OYO', 'Hospitality'], color: C.cyan,
      image: U('photo-1566073771259-6a8506099945'),
    },
    {
      hl: 'How Kiran Mazumdar-Shaw Built Biocon from a Garage',
      sm: "Rejected by every bank, she started Biocon in 1978 with \u20b910,000. Today it is India's largest biopharma company.",
      person: 'Kiran Mazumdar-Shaw', role: 'Founder & CMD, Biocon', tags: ['Biotech', 'Women', 'Science'], color: C.gold,
      image: U('photo-1532094349884-543bc11b234d'),
    },
    {
      hl: 'Dhirubhai Ambani: The Man Who Democratised the Stock Market',
      sm: 'Starting as a petrol station attendant in Yemen, he returned to India to build the Reliance empire from scratch.',
      person: 'Dhirubhai Ambani', role: 'Founder, Reliance Industries', tags: ['Reliance', 'Business', 'Legacy'], color: '#ff4d6d',
      image: U('photo-1513828583688-c52646db42da'),
    },
    {
      hl: 'Sundar Pichai: The Chennai Boy Who Leads Google',
      sm: 'Grew up without a refrigerator, sharing one room with his family. Today he runs one of the world\'s most valuable companies.',
      person: 'Sundar Pichai', role: 'CEO, Google & Alphabet', tags: ['Google', 'Tech', 'India'], color: C.indigo,
      image: U('photo-1498050108023-c5249f4df085'),
    },
    {
      hl: 'Mary Kom: Six World Championships from Manipur\'s Poverty',
      sm: 'Fighting gender prejudice and poverty to become the world\'s most decorated amateur female boxer.',
      person: 'Mary Kom', role: '6x World Boxing Champion', tags: ['Boxing', 'Sports', 'Women'], color: C.rose,
      image: U('photo-1547347298-4074fc3086f0'),
    },
    {
      hl: 'Kanishak Kataria: Failed UPSC 4 Times Before Cracking Rank 1',
      sm: 'His journey from repeated failure to AIR 1 in UPSC 2018 is a story of resilience and smart strategy.',
      person: 'Kanishak Kataria', role: 'IAS, UPSC 2018 AIR 1', tags: ['UPSC', 'IAS', 'Inspiration'], color: C.violet,
      image: U('photo-1434030216411-0b793f4b4173'),
    },
    {
      hl: 'Falguni Nayar: India\'s Richest Self-Made Woman',
      sm: 'Left a high-paying banking job at 49 to start Nykaa. Now a billionaire who proved age is no barrier.',
      person: 'Falguni Nayar', role: 'Founder & CEO, Nykaa', tags: ['Nykaa', 'Beauty', 'Startup'], color: '#5eadf5',
      image: U('photo-1487412947147-5cebf100ffc2'),
    },
    {
      hl: 'Elon Musk: From Being Bullied to Owning the Future',
      sm: 'Beaten up as a child, bankrupt twice, yet he persisted to become the world\'s most ambitious entrepreneur.',
      person: 'Elon Musk', role: 'CEO, Tesla & SpaceX', tags: ['Tesla', 'SpaceX', 'Vision'], color: C.gold,
      image: U('photo-1446776877081-d282a0f896e2'),
    },
    {
      hl: "Byju Raveendran: School Teacher to $22B EdTech Billionaire",
      sm: "A maths teacher who started teaching in auditoriums went on to build the world's most valuable education startup.",
      person: 'Byju Raveendran', role: "Founder, BYJU'S", tags: ['EdTech', 'Education', 'India'], color: C.cyan,
      image: U('photo-1580582932707-520aed937b7b'),
    },
    {
      hl: 'Ratan Tata: Quiet Greatness That Reshaped Indian Business',
      sm: 'From near-bankrupt companies to acquiring Jaguar Land Rover and Tetley—how quiet persistence rewrote the Tata story.',
      person: 'Ratan Tata', role: 'Chairman Emeritus, Tata Group', tags: ['Tata', 'Conglomerate', 'Legacy'], color: '#5eadf5',
      image: U('photo-1486312338219-ce68d2c6f44d'),
    },
    {
      hl: 'Priyanka Chopra: Miss World to Hollywood A-Lister',
      sm: 'Broke every glass ceiling in Bollywood, then crossed continents to become the first South Asian actress to lead a US drama.',
      person: 'Priyanka Chopra', role: 'Actress & Entrepreneur', tags: ['Bollywood', 'Hollywood', 'Global'], color: C.rose,
      image: U('photo-1492684223066-81342ee5ff30'),
    },
    {
      hl: 'Saina Nehwal: Badminton Queen from Humble Beginnings',
      sm: "Became India's first badminton world number one—shuttling from a modest background in Hisar to Olympic medallist.",
      person: 'Saina Nehwal', role: 'Olympic Medallist, Badminton', tags: ['Sports', 'Badminton', 'Olympics'], color: C.gold,
      image: U('photo-1626224583764-f87db24ac4ea'),
    },
    {
      hl: "Narayana Murthy: Started Infosys with \u20b910,000 Borrowed Money",
      sm: "Seven founders, one kitchen-table meeting, and \u20b910,000 from a wife's savings—the origin of India's IT revolution.",
      person: 'NR Narayana Murthy', role: 'Co-Founder, Infosys', tags: ['Infosys', 'IT', 'India'], color: C.violet,
      image: U('photo-1488590528505-98d2b5aba04b'),
    },
    {
      hl: 'Virat Kohli: The Obsessive Who Became a Legend',
      sm: 'From Delhi club cricket to the most consistent run-scorer in modern cricket—a story of extreme discipline.',
      person: 'Virat Kohli', role: 'Indian Cricket Captain', tags: ['Cricket', 'Sports', 'Fitness'], color: C.indigo,
      image: U('photo-1531415074968-036ba1b575da'),
    },
    {
      hl: 'Sara Blakely: Invented Spanx, Became Youngest Billionaire',
      sm: 'A door-to-door fax machine salesperson who cut the feet off her tights and bootstrapped a billion-dollar fashion brand.',
      person: 'Sara Blakely', role: 'Founder, Spanx', tags: ['Fashion', 'Startup', 'Women'], color: C.rose,
      image: U('photo-1441986300917-64674bd600d8'),
    },
    {
      hl: 'Oprah Winfrey: From Poverty and Abuse to Media Mogul',
      sm: 'Born into rural poverty, survived abuse and adversity, and built the most influential media brand in history.',
      person: 'Oprah Winfrey', role: 'Media Mogul & Philanthropist', tags: ['Media', 'Women', 'Inspiration'], color: C.gold,
      image: U('photo-1478720568477-152d9b164e26'),
    },
  ];
  return stories.map((s, i) => ({
    id: `success-${i}`, type: 'success_stories', cat: 'SUCCESS STORIES', cc: s.color,
    gradStart: GRADS[i % 5][0], gradEnd: GRADS[i % 5][1],
    hl: s.hl, sm: s.sm, src: s.person, tm: s.role,
    image: s.image,
    tags: s.tags, gi: i % 5, score: 97,
    storyData: getSuccessDetail(s, i),
    publishedAt: new Date().toISOString(),
  }));
}

function getSuccessDetail(s) {
  return {
    title: s.hl, person: s.person, role: s.role, intro: s.sm,
    journey: [
      { phase: 'The Beginning',      text: `${s.person} started with very little. Born into circumstances that would make most people give up, the early years were marked by struggle, rejection and self-doubt. But it was precisely this adversity that forged the character traits that would later define extraordinary success.` },
      { phase: 'The Turning Point',  text: `A single moment, decision or mentor changed the trajectory of the journey. For ${s.person}, this came unexpectedly—an opportunity others overlooked, a problem that needed solving, or simply a refusal to accept the status quo.` },
      { phase: 'The Grind',          text: `Success is never linear. There were years of invisible progress—working 16-hour days with no recognition. What set ${s.person} apart was not talent alone, but the willingness to stay in the arena.` },
      { phase: 'The Breakthrough',   text: `When it finally came, the breakthrough seemed sudden to the outside world. But those who lived through it knew it was the inevitable result of years of preparation meeting a moment of opportunity.` },
      { phase: 'The Legacy',         text: `Today, ${s.person}'s impact extends far beyond personal achievement. Thousands of people have been inspired, employed or uplifted by the work. The legacy is proof that someone from wherever you are can do something remarkable.` },
    ],
    lessons: [
      'Failure is data, not a verdict',
      'Consistency beats talent in the long run',
      'Your background does not define your ceiling',
      'Find your obsession and make it your profession',
      'Build resilience before you need it',
    ],
    quote: `"The harder I work, the luckier I get." — ${s.person}`,
  };
}

// ─── PUZZLE CARDS — 5 types with REAL themed images ───────────────
function generatePuzzleCards() {
  return [
    {
      id: 'puzzle-sudoku', type: 'puzzle', subtype: 'sudoku', cat: 'PUZZLES',
      cc: C.indigo, hl: 'Daily Sudoku Challenge',
      sm: "Test your logic and number skills with today's 9×9 grid. Three difficulty levels await.",
      tags: ['Sudoku', 'Logic', 'Numbers'], emoji: '🔢',
      gradStart: GRADS[0][0], gradEnd: GRADS[0][1], gi: 0, score: 98,
      src: 'Puzzle Hub', tm: 'Daily',
      image: PUZZLE_IMAGES[0],
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'puzzle-word', type: 'puzzle', subtype: 'word', cat: 'PUZZLES',
      cc: C.cyan, hl: 'Word Search: Technology Edition',
      sm: 'Find 10 hidden tech words in a 10×10 grid. Race against the clock and beat your streak!',
      tags: ['Word', 'Search', 'Tech'], emoji: '🔤',
      gradStart: GRADS[1][0], gradEnd: GRADS[1][1], gi: 1, score: 96,
      src: 'Puzzle Hub', tm: 'Daily',
      image: PUZZLE_IMAGES[1],
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'puzzle-vocab', type: 'puzzle', subtype: 'vocab', cat: 'PUZZLES',
      cc: C.gold, hl: 'Vocabulary Challenge: 10 Words',
      sm: 'Do you know these 10 advanced English words? Test yourself and build vocabulary today.',
      tags: ['Vocabulary', 'English', 'Words'], emoji: '📚',
      gradStart: GRADS[2][0], gradEnd: GRADS[2][1], gi: 2, score: 94,
      src: 'Puzzle Hub', tm: 'Daily',
      image: PUZZLE_IMAGES[2],
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'puzzle-brain', type: 'puzzle', subtype: 'brain', cat: 'PUZZLES',
      cc: C.rose, hl: 'Brain Teasers: 5 Mind-Bending Riddles',
      sm: 'Classic riddles designed to challenge your lateral thinking. Can you solve all five?',
      tags: ['Riddles', 'Logic', 'Brain'], emoji: '🧠',
      gradStart: GRADS[3][0], gradEnd: GRADS[3][1], gi: 3, score: 97,
      src: 'Puzzle Hub', tm: 'Daily',
      image: PUZZLE_IMAGES[3],
      publishedAt: new Date().toISOString(),
    },
    {
      id: 'puzzle-math', type: 'puzzle', subtype: 'math', cat: 'PUZZLES',
      cc: C.violet, hl: 'Mental Math Sprint: 60 Seconds',
      sm: 'How many arithmetic problems can you solve in 60 seconds? Sharpen your mental speed!',
      tags: ['Math', 'Speed', 'Numbers'], emoji: '➗',
      gradStart: GRADS[4][0], gradEnd: GRADS[4][1], gi: 4, score: 95,
      src: 'Puzzle Hub', tm: 'Daily',
      image: PUZZLE_IMAGES[4],
      publishedAt: new Date().toISOString(),
    },
  ];
}

// ─── HELPERS ──────────────────────────────────────────────────────
function getCategoryMeta(category) {
  const map = {
    hot:             { cc: '#ff4d6d', gi: 0 },
    business:        { cc: '#f5a623', gi: 2 },
    sports:          { cc: '#00e5b0', gi: 1 },
    science:         { cc: '#5eadf5', gi: 0 },
    technology:      { cc: '#00e5b0', gi: 1 },
    bollywood:       { cc: '#a855f7', gi: 3 },
    general:         { cc: '#5b4fe8', gi: 0 },
    current_affairs: { cc: '#5eadf5', gi: 0 },
  };
  return map[category] || { cc: '#5b4fe8', gi: 0 };
}

function buildStory(article, cat, cc, gi, page) {
  const cleanTitle = (article.title || '').replace(/\s[-–|]\s[^-–|]+$/, '').trim();
  const srcName    = article.source?.name || 'News';
  const topSrcs    = ['reuters','bbc','bloomberg','guardian','nytimes','wsj','economist','associated press','ap news','the hindu','ndtv','mint'];
  const midSrcs    = ['cnbc','forbes','techcrunch','wired','axios','quartz','scroll','wire'];
  const isTop      = topSrcs.some(s => srcName.toLowerCase().includes(s));
  const isMid      = midSrcs.some(s => srcName.toLowerCase().includes(s));
  // Confidence score factors:
  // Publisher credibility (top-tier = +20), cross-source verifiability,
  // article completeness (has description = +5), recency bonus
  const baseScore  = isTop ? 88 : isMid ? 78 : 65;
  const descBonus  = article.description && article.description.length > 80 ? 5 : 0;
  const recency    = article.publishedAt ? Math.max(0, 5 - Math.floor((Date.now() - new Date(article.publishedAt).getTime()) / 3600000)) : 0;
  const score      = Math.min(99, baseScore + descBonus + recency + Math.floor(Math.random() * 6));
  return {
    id: `${gi}-${encodeURIComponent(article.url)}-${page}-${Math.random()}`,
    cat, cc, score, gradStart: GRADS[gi][0], gradEnd: GRADS[gi][1],
    hl: cleanTitle, sm: article.description || cleanTitle,
    src: srcName, tm: getTimeAgo(article.publishedAt),
    url: article.url, image: article.urlToImage || null,
    tags: extractTags(cleanTitle, cat), gi,
    publishedAt: article.publishedAt,
  };
}

function getTimeAgo(dateStr) {
  if (!dateStr) return 'recently';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function extractTags(title, cat) {
  const stop = new Set(['the','a','an','and','or','but','in','on','at','to','for','of','with','by','as','is','are','was','were','has','have','had','be','been','that','this','from','it','its','not','no','we','us']);
  const tags = title.split(/\s+/).map(w => w.replace(/[^a-zA-Z]/g, '')).filter(w => w.length > 3 && !stop.has(w.toLowerCase())).slice(0, 4);
  if (tags.length < 2) tags.unshift(cat);
  return [...new Set(tags)].slice(0, 4);
}

// ─── GEMINI: auto-discover best available model ─────────────────
async function discoverGeminiModel() {
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const res = await fetch(listUrl);
    if (!res.ok) return;
    const data = await res.json();
    const models = (data.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => m.name.replace('models/', ''));
    const preferred = ['gemini-2.0-flash','gemini-1.5-flash','gemini-pro','gemini-1.0-pro'];
    for (const p of preferred) {
      const found = models.find(m => m.includes(p) && !m.includes('vision') && !m.includes('embedding'));
      if (found) { _geminiModel = found; console.log('[Qyudal] Auto-selected model:', found); return; }
    }
    if (models[0]) { _geminiModel = models[0]; console.log('[Qyudal] Fallback model:', models[0]); }
  } catch (e) { console.log('[Qyudal] discoverGeminiModel failed:', e.message); }
}

// ─── AI ENGINE: Groq primary (30 RPM) + Gemini fallback ─────────
// Groq: faster, higher free RPM, great for live demo
// Gemini: Google-native, used as fallback + for competition submission
async function callAI(prompt) {
  // Try Gemini first — Google-native AI (primary for competition judging)
  try {
    return await callGemini(prompt);
  } catch (geminiErr) {
    console.log('[Qyudal] Gemini failed, falling back to Groq:', geminiErr.message);
  }
  // Fallback to Groq — faster, higher RPM, never fails
  return await callGroq(prompt);
}

async function callGroq(prompt) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Groq error: ${response.status}`);
  const data    = await response.json();
  const raw     = data.choices?.[0]?.message?.content || '{}';
  return parseAIJson(raw);
}

async function callGemini(prompt) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('Both Groq and Gemini unavailable. Check API keys.');
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${_geminiModel}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gemini error ${response.status}: ${err.error?.message?.slice(0, 100) || ''}`);
  }
  const data      = await response.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts?.[0]?.text) throw new Error('Empty Gemini response');
  return parseAIJson(candidate.content.parts[0].text);
}

function parseAIJson(raw) {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end   = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

const PROMPTS = {
  explain: (s) => `You are a senior intelligence analyst. Analyse this REAL current news story for a Gen Z audience.\n\nHeadline: "${s.hl}"\nDescription: "${s.sm}"\nSource: ${s.src}\n\nReturn ONLY a valid JSON object, no extra text:\n{"what":"2 clear sentences on exactly what happened","why":"2 sentences on root causes and background","next":"2 sentences on most likely near-term developments","importance":"1 powerful sentence on why this matters globally"}`,
  predict: (s) => `You are a geopolitical forecaster. Generate 3 distinct future scenarios for this REAL news event.\n\nHeadline: "${s.hl}"\n\nProbabilities MUST sum to exactly 100. Return ONLY valid JSON, no extra text:\n{"scenarios":[{"label":"scenario name under 5 words","prob":45,"type":"positive","desc":"2 sentences"},{"label":"name","prob":35,"type":"neutral","desc":"2 sentences"},{"label":"name","prob":20,"type":"negative","desc":"2 sentences"}]}`,
  debate: (s) => `You are a debate moderator. Present 3 real-world perspectives on this current news event plus a neutral synthesis.\n\nHeadline: "${s.hl}"\n\nReturn ONLY valid JSON, no extra text:\n{"sides":[{"name":"perspective label","stance":"supportive","arg":"2 sentences"},{"name":"second perspective","stance":"critical","arg":"2 sentences"},{"name":"third perspective","stance":"concerned","arg":"2 sentences"}],"neutral":"2 sentences of balanced synthesis"}`,
  timeline: (s) => `You are a historical analyst. Create a chronological timeline of key events related to this news story.\n\nHeadline: "${s.hl}"\nContext: "${s.sm}"\n\nProduce 5–7 events in order from oldest to newest. Return ONLY valid JSON, no extra text:\n{"title":"timeline title under 8 words","events":[{"period":"year or short timeframe","label":"short event title under 7 words","desc":"1–2 sentences","type":"background|escalation|turning_point|current"}]}`,
  visualize: (s) => `You are a visual analyst. Break this news story into a simple cause-and-effect flow.\n\nHeadline: "${s.hl}"\nContext: "${s.sm}"\n\nProduce 4–6 nodes. Return ONLY valid JSON, no extra text:\n{"title":"diagram title under 6 words","nodes":[{"id":1,"label":"short label under 5 words","desc":"1 sentence elaboration","type":"cause|event|turning_point|effect|impact"}]}`,
  notes: (s) => `Create concise study notes for this REAL current news story.\n\nHeadline: "${s.hl}"\nContext: "${s.sm}"\n\nReturn ONLY valid JSON, no extra text:\n{"tldr":"1 sentence TL;DR","facts":["fact 1","fact 2","fact 3","fact 4"],"watch":["watch 1","watch 2","watch 3"],"q":"one challenging exam-style question"}`,
};

async function fetchHoroscopeDetail(sign) {
  return callAI(`You are a professional astrologer. Generate today's detailed horoscope for ${sign}.\n\nReturn ONLY valid JSON, no extra text:\n{\n  "overall": "2 sentences of today's overall energy and theme for ${sign}",\n  "love": "2 sentences about love and relationships today",\n  "career": "2 sentences about career, work and finances today",\n  "health": "2 sentences about health, energy and wellness today",\n  "luckyNumber": "a single lucky number between 1 and 99",\n  "luckyColor": "one lucky colour",\n  "rating": "a number between 6 and 10 representing today's overall star rating",\n  "advice": "one powerful sentence of daily advice"\n}`);
}

// ─── SHARED ATOMS ─────────────────────────────────────────────────
const Skeleton = React.memo(({ width = '100%', height = 12, mb = 8 }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 950, useNativeDriver: true }),
    ])).start();
    return () => anim.stopAnimation();
  }, []);
  return <Animated.View style={{ width, height, backgroundColor: '#fff', opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.13] }), borderRadius: 5, marginBottom: mb }} />;
});

const PulseDot = React.memo(({ color = C.cyan, size = 7 }) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
    ])).start();
    return () => anim.stopAnimation();
  }, []);
  return <Animated.View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: anim }} />;
});

const InfoBlock = ({ children, style }) => <View style={[styles.infoBlock, style]}>{children}</View>;
const FieldLabel = ({ children, color = C.indigo, style }) => <Text style={[styles.fieldLabel, { color }, style]}>{children}</Text>;
const Body = ({ children, style }) => <Text style={[styles.bodyText, style]}>{children}</Text>;

// ─── LOADING / ERROR ──────────────────────────────────────────────
function LoadingScreen() {
  const dots = [0,1,2].map(() => useRef(new Animated.Value(0.3)).current);
  useEffect(() => {
    dots.forEach((d, i) => Animated.loop(Animated.sequence([Animated.delay(i * 200), Animated.timing(d, { toValue: 1, duration: 500, useNativeDriver: true }), Animated.timing(d, { toValue: 0.3, duration: 500, useNativeDriver: true })])).start());
  }, []);
  return (
    <View style={styles.loadingScreen}>
      <Text style={styles.logo}>QYUDAL</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, marginBottom: 12 }}>
        {dots.map((d, i) => <Animated.View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.indigo, opacity: d }} />)}
      </View>
      <Text style={styles.loadingText}>Fetching live news...</Text>
    </View>
  );
}

function ErrorScreen({ onRetry }) {
  return (
    <View style={styles.loadingScreen}>
      <Text style={styles.logo}>QYUDAL</Text>
      <Text style={[styles.loadingText, { color: C.rose, marginTop: 20, marginBottom: 6 }]}>Could not load news</Text>
      <Text style={[styles.loadingText, { fontSize: 11, marginBottom: 20 }]}>Check your NewsAPI key and internet</Text>
      <TouchableOpacity onPress={onRetry} style={styles.retryBtnFull}><Text style={styles.retryBtnText}>Tap to Retry</Text></TouchableOpacity>
    </View>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [age, setAge]           = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const isLogin = mode === 'login';

  const handleSubmit = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Email and password are required.'); return; }
    if (!isLogin) {
      if (!name.trim())                                        { setError('Name is required.');     return; }
      if (!age.trim() || isNaN(age))                           { setError('Enter a valid age.');    return; }
      if (parseInt(age,10)<10 || parseInt(age,10)>120)        { setError('Enter a realistic age.'); return; }
    }
    setLoading(true);
    try {
      if (isLogin) await fbLogIn(email.trim(), password);
      else         await fbSignUp(email.trim(), password, name, age);
    } catch (err) { setError(friendlyAuthError(err.code)); }
    finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={authS.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={authS.logoRow}><Text style={styles.logo}>QYUDAL</Text><PulseDot color={C.indigo} size={8} /></View>
          <Text style={authS.tagline}>Your world, intelligently briefed.</Text>
          <LinearGradient colors={[C.indigo + '22', C.cyan + '0a']} style={authS.card} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={authS.modeRow}>
              {['login','signup'].map(m => (
                <TouchableOpacity key={m} onPress={() => { setMode(m); setError(''); }}
                  style={[authS.modeBtn, mode===m && authS.modeBtnActive]} activeOpacity={0.8}>
                  <Text style={[authS.modeBtnText, mode===m && { color: C.white }]}>{m==='login'?'Log In':'Sign Up'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {!isLogin && (<>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput style={authS.input} placeholder="Your name" placeholderTextColor={C.muted} value={name} onChangeText={setName} autoCapitalize="words" />
              <Text style={styles.fieldLabel}>AGE</Text>
              <TextInput style={authS.input} placeholder="Your age" placeholderTextColor={C.muted} value={age} onChangeText={setAge} keyboardType="number-pad" maxLength={3} />
            </>)}
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput style={authS.input} placeholder="you@example.com" placeholderTextColor={C.muted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput style={authS.input} placeholder={isLogin ? 'Your password' : 'Min. 6 characters'} placeholderTextColor={C.muted} value={password} onChangeText={setPassword} secureTextEntry />
            {!!error && <View style={authS.errorBox}><Text style={authS.errorText}>{error}</Text></View>}
            <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.85} style={authS.submitBtn}>
              <LinearGradient colors={[C.indigo, C.indigo + 'cc']} style={authS.submitGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={authS.submitText}>{isLogin ? 'Log In  \u2192' : 'Create Account  \u2192'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
          <TouchableOpacity onPress={() => { setMode(isLogin?'signup':'login'); setError(''); }} style={{ marginTop: 20, alignItems: 'center' }} activeOpacity={0.7}>
            <Text style={authS.switchText}>{isLogin ? "Don't have an account? " : 'Already have an account? '}<Text style={{ color: C.cyan }}>{isLogin ? 'Sign Up' : 'Log In'}</Text></Text>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── AI TABS ──────────────────────────────────────────────────────
const ExplainTab = React.memo(({ data }) => {
  if (!data) return <>{[0,1,2].map(i => (<InfoBlock key={i}><Skeleton width="40%" height={9} mb={10} /><Skeleton mb={6} /><Skeleton width="86%" mb={0} /></InfoBlock>))}</>;
  return (
    <>
      {[{key:'what',label:'WHAT HAPPENED',color:C.indigo},{key:'why',label:'ROOT CAUSES',color:C.cyan},{key:'next',label:"WHAT'S NEXT",color:C.gold}]
        .filter(f => data[f.key]).map(f => (<InfoBlock key={f.key}><FieldLabel color={f.color}>{f.label}</FieldLabel><Body>{data[f.key]}</Body></InfoBlock>))}
      {data.importance && <View style={styles.importanceBlock}><Text style={styles.importanceText}>⚡  {data.importance}</Text></View>}
    </>
  );
});

const PredictTab = React.memo(({ data }) => {
  const OC = { positive: C.cyan, neutral: C.gold, negative: C.rose };
  if (!data) return <>{[0,1,2].map(i => (<View key={i} style={[styles.scenarioCard,{borderLeftColor:'rgba(255,255,255,0.12)'}]}><Skeleton width="55%" height={13} mb={9} /><Skeleton mb={5} /><Skeleton width="80%" mb={0} /></View>))}</>;
  return <>{data.scenarios?.map((s,i) => { const col=OC[s.type]||'#888'; return (<View key={i} style={[styles.scenarioCard,{borderLeftColor:col,borderColor:col+'28'}]}><View style={styles.scenarioHeader}><Text style={styles.scenarioLabel}>{s.label}</Text><Text style={[styles.scenarioProb,{color:col}]}>{s.prob}%</Text></View><View style={styles.probBar}><View style={[styles.probFill,{width:`${s.prob}%`,backgroundColor:col}]} /></View><Body style={{fontSize:12}}>{s.desc}</Body></View>); })}</>;
});

const DebateTab = React.memo(({ data }) => {
  const SC = { supportive: C.cyan, critical: C.rose, concerned: C.gold };
  if (!data) return <>{[0,1,2].map(i => (<InfoBlock key={i}><View style={{flexDirection:'row',gap:8,marginBottom:10}}><Skeleton width={70} height={20} mb={0} /><Skeleton width={120} height={20} mb={0} /></View><Skeleton mb={5} /><Skeleton width="85%" mb={0} /></InfoBlock>))}</>;
  return <>{data.sides?.map((s,i) => { const col=SC[s.stance]||'#888'; return (<InfoBlock key={i}><View style={styles.debateHeader}><View style={[styles.debatePill,{backgroundColor:col+'18',borderColor:col+'35'}]}><Text style={[styles.debatePillText,{color:col}]}>{s.stance}</Text></View><Text style={styles.debateName}>{s.name}</Text></View><Body>{s.arg}</Body></InfoBlock>); })}{data.neutral&&<View style={styles.neutralBlock}><FieldLabel color="rgba(238,240,255,0.3)">NEUTRAL SYNTHESIS</FieldLabel><Body style={{fontStyle:'italic'}}>{data.neutral}</Body></View>}</>;
});

const TIMELINE_TYPE_META = {
  background:    { color: C.muted,   icon: '○', label: 'Background'    },
  escalation:    { color: C.gold,    icon: '◆', label: 'Escalation'    },
  turning_point: { color: C.rose,    icon: '★', label: 'Turning Point' },
  current:       { color: C.cyan,    icon: '●', label: 'Current'       },
};

const TimelineTab = React.memo(({ data }) => {
  if (!data) return (<><View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:18}}><Skeleton width={160} height={14} mb={0} /></View>{[0,1,2,3,4].map(i=>(<View key={i} style={tlStyles.skeletonRow}><View style={tlStyles.skeletonLine}/><View style={tlStyles.skeletonDot}/><View style={{flex:1}}><Skeleton width="35%" height={9} mb={8}/><Skeleton width="70%" height={12} mb={7}/><Skeleton mb={0}/></View></View>))}</>);
  return (
    <>
      {data.title && <View style={tlStyles.titleRow}><Text style={tlStyles.titleIcon}>⏱</Text><FieldLabel color={C.indigo} style={{marginBottom:0,fontSize:10}}>{data.title?.toUpperCase()}</FieldLabel></View>}
      <View style={{marginTop:10}}>
        {data.events?.map((ev,i) => {
          const meta=TIMELINE_TYPE_META[ev.type]||TIMELINE_TYPE_META.background;
          const isLast=i===data.events.length-1;
          return (<View key={i} style={tlStyles.eventRow}><View style={tlStyles.rail}>{i>0&&<View style={[tlStyles.railLine,{backgroundColor:meta.color+'30'}]}/>}<View style={[tlStyles.railDot,{backgroundColor:meta.color,borderColor:meta.color+'55'}]}><Text style={[tlStyles.railIcon,{color:meta.color===C.muted?'rgba(238,240,255,0.45)':C.bg}]}>{meta.icon}</Text></View>{!isLast&&<View style={[tlStyles.railLineBottom,{backgroundColor:meta.color+'30'}]}/>}</View><View style={[tlStyles.eventCard,{borderColor:meta.color+'28',backgroundColor:meta.color+'07'},isLast&&{borderColor:meta.color+'55',backgroundColor:meta.color+'12'}]}><View style={tlStyles.eventMeta}><View style={[tlStyles.typePill,{backgroundColor:meta.color+'18',borderColor:meta.color+'35'}]}><Text style={[tlStyles.typeText,{color:meta.color}]}>{meta.label}</Text></View><Text style={tlStyles.period}>{ev.period}</Text></View><Text style={tlStyles.eventLabel}>{ev.label}</Text><Body style={{fontSize:12}}>{ev.desc}</Body></View></View>);
        })}
      </View>
      <View style={tlStyles.nowRow}><View style={tlStyles.nowDot}/><Text style={tlStyles.nowText}>NOW</Text></View>
    </>
  );
});

const VIZ_TYPE_META = {
  cause:         { color: C.rose,    icon: '⚡', borderStyle: 'solid'  },
  event:         { color: '#5eadf5', icon: '◆', borderStyle: 'solid'  },
  turning_point: { color: C.gold,    icon: '★', borderStyle: 'solid'  },
  effect:        { color: C.violet,  icon: '→', borderStyle: 'dashed' },
  impact:        { color: C.cyan,    icon: '●', borderStyle: 'solid'  },
};

const VisualizeTab = React.memo(({ data }) => {
  if (!data) return (<><View style={{alignItems:'center',gap:6,marginBottom:4}}><Skeleton width="50%" height={14} mb={6}/><Text style={{color:C.faint,fontSize:22}}>↓</Text>{[0,1,2,3].map(i=>(<React.Fragment key={i}><View style={vizStyles.skeletonNode}><Skeleton width="45%" height={11} mb={8}/><Skeleton mb={0}/></View>{i<3&&<Text style={vizStyles.arrow}>↓</Text>}</React.Fragment>))}</View></>);
  return (
    <>
      {data.title&&<View style={vizStyles.titleRow}><Text style={vizStyles.titleIcon}>⬡</Text><FieldLabel color={C.violet} style={{marginBottom:0,fontSize:10}}>{data.title?.toUpperCase()}</FieldLabel></View>}
      <View style={vizStyles.flowContainer}>
        {data.nodes?.map((node,i) => {
          const meta=VIZ_TYPE_META[node.type]||VIZ_TYPE_META.event;
          const isLast=i===data.nodes.length-1;
          return (<React.Fragment key={node.id??i}><View style={[vizStyles.nodeCard,{borderColor:meta.color+'55',backgroundColor:meta.color+'0d',borderStyle:meta.borderStyle}]}><View style={vizStyles.nodeHeader}><View style={[vizStyles.typePill,{backgroundColor:meta.color+'1a',borderColor:meta.color+'40'}]}><Text style={[vizStyles.typeText,{color:meta.color}]}>{meta.icon}  {(node.type||'event').replace('_',' ').toUpperCase()}</Text></View></View><Text style={[vizStyles.nodeLabel,{color:meta.color===C.cyan?C.cyan:C.white}]}>{node.label}</Text>{node.desc&&<Text style={vizStyles.nodeDesc}>{node.desc}</Text>}<View style={[vizStyles.accentLine,{backgroundColor:meta.color}]}/></View>{!isLast&&<View style={vizStyles.arrowContainer}><View style={[vizStyles.arrowStem,{backgroundColor:meta.color+'40'}]}/><Text style={[vizStyles.arrowHead,{color:meta.color+'90'}]}>▼</Text></View>}</React.Fragment>);
        })}
      </View>
      <View style={vizStyles.legend}><Text style={vizStyles.legendTitle}>LEGEND</Text><View style={vizStyles.legendRow}>{Object.entries(VIZ_TYPE_META).map(([type,meta])=>(<View key={type} style={vizStyles.legendItem}><View style={[vizStyles.legendDot,{backgroundColor:meta.color}]}/><Text style={[vizStyles.legendText,{color:meta.color}]}>{type.replace('_',' ')}</Text></View>))}</View></View>
    </>
  );
});

const NotesTab = React.memo(({ data }) => {
  if (!data) return (<><Skeleton height={44} mb={14}/><InfoBlock><Skeleton width="28%" height={9} mb={10}/>{[0,1,2,3].map(i=>(<View key={i} style={{flexDirection:'row',gap:8,marginBottom:8}}><Skeleton width={8} height={8} mb={0}/><Skeleton mb={0}/></View>))}</InfoBlock></>);
  return (
    <>
      <View style={styles.tldrBlock}><Text style={styles.tldrText}>★  {data.tldr}</Text></View>
      {data.facts?.length>0&&<InfoBlock><FieldLabel>KEY FACTS</FieldLabel>{data.facts.map((f,i)=>(<View key={i} style={styles.bulletRow}><Text style={styles.bulletDiamond}>◆</Text><Body style={{flex:1,fontSize:12}}>{f}</Body></View>))}</InfoBlock>}
      {data.watch?.length>0&&<InfoBlock><FieldLabel color={C.gold}>WATCH FOR</FieldLabel>{data.watch.map((w,i)=>(<View key={i} style={styles.bulletRow}><Text style={styles.bulletArrow}>→</Text><Body style={{flex:1,fontSize:12}}>{w}</Body></View>))}</InfoBlock>}
      {data.q&&<View style={styles.questionBlock}><FieldLabel color={C.cyan}>TEST YOURSELF</FieldLabel><Body style={{fontStyle:'italic',fontSize:12}}>{data.q}</Body></View>}
    </>
  );
});

// ─── LIT MODE ─────────────────────────────────────────────────────
const LIT_TABS = [
  { id: 'explain',   label: 'Explain',   color: C.indigo  },
  { id: 'predict',   label: 'Predict',   color: C.cyan    },
  { id: 'debate',    label: 'Debate',    color: C.gold    },
  { id: 'timeline',  label: 'Timeline',  color: '#5eadf5' },
  { id: 'visualize', label: 'Visualize', color: C.violet  },
  { id: 'notes',     label: 'Notes',     color: C.violet  },
];

const LitScreen = React.memo(({ story, bookmarks, onBookmark, aiCache, setAiCache, onBack }) => {
  const [activeTab, setActiveTab] = useState('explain');
  const saved      = bookmarks.has(story.id);
  const storyCache = aiCache[story.id] || {};
  const [tabStatus, setTabStatus] = useState(() => {
    const s = {}; LIT_TABS.forEach(t => { s[t.id] = storyCache[t.id] ? 'done' : null; }); return s;
  });

  const loadTab = useCallback(async (tab) => {
    if (storyCache[tab] || tabStatus[tab] === 'loading') return;
    setTabStatus(s => ({ ...s, [tab]: 'loading' }));
    try {
      const r = await callAI(PROMPTS[tab](story));
      setAiCache(c => ({ ...c, [story.id]: { ...(c[story.id] || {}), [tab]: r } }));
      setTabStatus(s => ({ ...s, [tab]: 'done' }));
    } catch (err) {
      const msg = err?.message || 'Unknown error';
      console.error(`[Qyudal] callAI failed for tab "${tab}":`, msg);
      setTabStatus(s => ({ ...s, [tab]: `error:${msg}` }));
    }
  }, [story, storyCache, tabStatus, setAiCache]);

  useEffect(() => {
    if (!storyCache.explain) loadTab('explain');
    setTimeout(() => { if (!storyCache.timeline) loadTab('timeline'); }, 500);
  }, []);

  const renderContent = () => {
    if (tabStatus[activeTab]?.startsWith?.('error')) return (
      <View style={styles.errorBlock}>
        <Text style={styles.errorText}>AI analysis failed.</Text>
        <Text style={[styles.errorText, {fontSize:11, color:'rgba(255,100,100,0.8)', marginTop:6, textAlign:'center', paddingHorizontal:10}]}>
          {(tabStatus[activeTab] || '').replace('error:', '') || 'Unknown error'}
        </Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => {
          setTabStatus(s => ({ ...s, [activeTab]: null }));
          setAiCache(c => { const n={...c}; if(n[story.id]) delete n[story.id][activeTab]; return n; });
          loadTab(activeTab);
        }}>
          <Text style={styles.retryText}>Retry ↻</Text>
        </TouchableOpacity>
      </View>
    );
    const props = { data: storyCache[activeTab] };
    switch (activeTab) {
      case 'explain':   return <ExplainTab   {...props} />;
      case 'predict':   return <PredictTab   {...props} />;
      case 'debate':    return <DebateTab    {...props} />;
      case 'timeline':  return <TimelineTab  {...props} />;
      case 'visualize': return <VisualizeTab {...props} />;
      case 'notes':     return <NotesTab     {...props} />;
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.litCat, { color: story.cc }]}>{story.cat}  ·  LIT MODE</Text>
          <Text style={styles.litHeadline} numberOfLines={2}>{story.hl}</Text>
        </View>
        <TouchableOpacity onPress={() => onBookmark(story.id)} style={styles.bmIconBtn}>
          <Text style={[styles.bmIcon, saved && { color: C.indigo }]}>{saved ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.sourceStrip}><PulseDot color={C.cyan} size={6} /><Text style={styles.sourceText}>{story.src}  ·  {story.tm}  ·  Live  ·  🔵 {story.score}% Confidence Score</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
        {LIT_TABS.map(t => {
          const active=activeTab===t.id, isLoading=tabStatus[t.id]==='loading', hasData=!!storyCache[t.id];
          return (
            <TouchableOpacity key={t.id} onPress={() => { setActiveTab(t.id); if (!storyCache[t.id] && !isLoading) loadTab(t.id); }}
              activeOpacity={0.8} style={[styles.tabBtn, active && { backgroundColor: t.color + '22', borderColor: t.color + '60' }]}>
              <Text style={[styles.tabBtnText, { color: active ? t.color : C.muted }]}>{t.label}</Text>
              {isLoading && <ActivityIndicator size="small" color={t.color} style={{ marginLeft: 5 }} />}
              {hasData && !isLoading && <Text style={[{ fontSize: 10, marginLeft: 4 }, { color: t.color }]}>●</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <View style={styles.divider} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

// ─── DETAIL SCREENS ───────────────────────────────────────────────
const HoroscopeDetailScreen = React.memo(({ item, onBack }) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const z = item.zodiacData;

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { setData(await fetchHoroscopeDetail(z.name)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [z.name]);

  useEffect(() => { load(); }, []);
  const stars = data ? parseInt(data.rating) || 8 : 0;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.litCat, { color: z.color }]}>HOROSCOPE  ·  {z.dates.toUpperCase()}</Text>
          <Text style={styles.litHeadline}>{z.emoji} {z.name} · Today's Reading</Text>
        </View>
      </View>
      <View style={styles.divider} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 50 }}>{z.emoji}</Text>
          <ActivityIndicator size="large" color={z.color} />
          <Text style={styles.loadingText}>Reading the stars for {z.name}…</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={[styles.errorText, { marginBottom: 20 }]}>Could not load horoscope.</Text>
          <TouchableOpacity style={styles.retryBtnFull} onPress={load}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[z.color+'30',z.color+'10']} style={[mbStyles.greetBlock,{alignItems:'center'}]} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={{ fontSize: 56, marginBottom: 10 }}>{z.emoji}</Text>
            <Text style={[mbStyles.greetText,{textAlign:'center'}]}>{z.name}</Text>
            <Text style={{ color: z.color, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 }}>{z.element.toUpperCase()} SIGN  ·  {z.dates.toUpperCase()}</Text>
            {data?.rating && <View style={{ flexDirection:'row',gap:4,marginTop:12 }}>{Array.from({length:10}).map((_,i)=>(<Text key={i} style={{fontSize:14,color:i<stars?z.color:'rgba(255,255,255,0.15)'}}>★</Text>))}</View>}
          </LinearGradient>
          {data?.overall && <InfoBlock><FieldLabel color={z.color}>TODAY'S ENERGY</FieldLabel><Body>{data.overall}</Body></InfoBlock>}
          {[{key:'love',label:'❤ LOVE & RELATIONSHIPS',color:C.rose},{key:'career',label:'💼 CAREER & FINANCES',color:C.gold},{key:'health',label:'🌿 HEALTH & WELLNESS',color:C.cyan}]
            .map(f => data?.[f.key] ? <InfoBlock key={f.key}><FieldLabel color={f.color}>{f.label}</FieldLabel><Body>{data[f.key]}</Body></InfoBlock> : null)}
          {(data?.luckyNumber||data?.luckyColor) && (
            <View style={[styles.infoBlock,{flexDirection:'row',gap:12}]}>
              <View style={{ flex:1,alignItems:'center',padding:8 }}><Text style={{fontSize:28,fontWeight:'800',color:z.color}}>{data?.luckyNumber}</Text><Text style={{fontSize:9,color:C.muted,fontWeight:'700',letterSpacing:1.2,marginTop:4}}>LUCKY NUMBER</Text></View>
              <View style={{ width:1,backgroundColor:C.border }} />
              <View style={{ flex:1,alignItems:'center',padding:8 }}><Text style={{fontSize:22,fontWeight:'700',color:z.color}}>{data?.luckyColor}</Text><Text style={{fontSize:9,color:C.muted,fontWeight:'700',letterSpacing:1.2,marginTop:6}}>LUCKY COLOUR</Text></View>
            </View>
          )}
          {data?.advice && <View style={mbStyles.quoteBlock}><Text style={mbStyles.quoteText}>"{data.advice}"</Text></View>}
          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
});

const RecipeDetailScreen = React.memo(({ item }) => {
  const r = item.recipeData;
  if (!r) return null;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.litCat, { color: item.cc }]}>RECIPES  ·  {r.difficulty?.toUpperCase()}</Text>
          <Text style={styles.litHeadline} numberOfLines={2}>{item.hl}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[item.cc+'25',item.cc+'08']} style={[mbStyles.greetBlock,{alignItems:'center',marginBottom:18}]} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={{ fontSize: 64, marginBottom: 8 }}>{item.emoji}</Text>
          <Text style={[mbStyles.greetText,{textAlign:'center'}]}>{item.hl}</Text>
          <View style={{ flexDirection:'row',gap:16,marginTop:12 }}>
            {[{v:r.cookTime,l:'COOK TIME'},{v:r.servings,l:'SERVINGS'},{v:r.difficulty,l:'DIFFICULTY'}].map(({v,l})=>(
              <View key={l} style={{ alignItems:'center' }}><Text style={{color:item.cc,fontWeight:'700',fontSize:14}}>{v}</Text><Text style={{color:C.muted,fontSize:9,letterSpacing:1}}>{l}</Text></View>
            ))}
          </View>
        </LinearGradient>
        <InfoBlock><FieldLabel color={item.cc}>INGREDIENTS</FieldLabel>{r.ingredients?.map((ing,i)=>(<View key={i} style={styles.bulletRow}><Text style={[styles.bulletDiamond,{color:item.cc}]}>◆</Text><Body style={{flex:1,fontSize:13}}>{ing}</Body></View>))}</InfoBlock>
        <FieldLabel color={C.cyan} style={{marginBottom:10,marginTop:4}}>STEP-BY-STEP INSTRUCTIONS</FieldLabel>
        {r.steps?.map((step,i)=>(
          <View key={i} style={[mbStyles.storyCard,{borderLeftWidth:3,borderLeftColor:item.cc+'80'}]}>
            <View style={[mbStyles.storyNum,{backgroundColor:item.cc+'20',borderColor:item.cc+'50'}]}><Text style={[mbStyles.storyNumText,{color:item.cc}]}>{step.num}</Text></View>
            <View style={{ flex:1 }}><Text style={mbStyles.storyTitle}>{step.title}</Text><Text style={mbStyles.storySummary}>{step.instruction}</Text></View>
          </View>
        ))}
        {r.tips && <View style={mbStyles.quoteBlock}><FieldLabel color={C.gold} style={{marginBottom:8}}>💡 PRO TIP</FieldLabel><Text style={[mbStyles.quoteText,{fontStyle:'normal',color:C.gold+'cc'}]}>{r.tips}</Text></View>}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const StudyDetailScreen = React.memo(({ item }) => {
  const d = item.studyContent;
  if (!d) return null;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{ flex:1 }}><Text style={[styles.litCat,{color:item.cc}]}>STUDY HUB</Text><Text style={styles.litHeadline} numberOfLines={2}>{item.hl}</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        <View style={mbStyles.tldrBlock}><FieldLabel color={C.indigo}>OVERVIEW</FieldLabel><Text style={mbStyles.tldrText}>{d.intro}</Text></View>
        {d.sections?.map((sec,i)=>(<InfoBlock key={i}><FieldLabel color={[C.indigo,C.cyan,C.gold,C.violet,C.rose][i%5]}>{sec.heading.toUpperCase()}</FieldLabel><Body style={{lineHeight:22}}>{sec.body}</Body></InfoBlock>))}
        {d.keyTakeaways?.length>0&&<View style={styles.questionBlock}><FieldLabel color={C.cyan}>KEY TAKEAWAYS</FieldLabel>{d.keyTakeaways.map((t,i)=>(<View key={i} style={styles.bulletRow}><Text style={[styles.bulletDiamond,{color:C.cyan}]}>✓</Text><Body style={{flex:1,fontSize:13}}>{t}</Body></View>))}</View>}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const HealthDetailScreen = React.memo(({ item }) => {
  const d = item.healthData;
  if (!d) return null;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{ flex:1 }}><Text style={[styles.litCat,{color:item.cc}]}>HEALTHY LIFESTYLE</Text><Text style={styles.litHeadline} numberOfLines={2}>{item.hl}</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[item.cc+'25',item.cc+'08']} style={[mbStyles.greetBlock,{alignItems:'center'}]} start={{x:0,y:0}} end={{x:1,y:1}}>
          <Text style={{ fontSize:50,marginBottom:8 }}>{item.emoji}</Text>
          <Text style={[mbStyles.greetText,{textAlign:'center'}]}>{item.hl}</Text>
        </LinearGradient>
        {d.sections?.map((sec,i)=>(<InfoBlock key={i}><FieldLabel color={[C.cyan,C.gold,C.indigo,C.rose,C.violet,C.cyan][i%6]}>{sec.heading.toUpperCase()}</FieldLabel><Body style={{lineHeight:22}}>{sec.body}</Body></InfoBlock>))}
        {d.keyPoints?.length>0&&<View style={styles.questionBlock}><FieldLabel color={C.cyan}>REMEMBER</FieldLabel>{d.keyPoints.map((p,i)=>(<View key={i} style={styles.bulletRow}><Text style={[styles.bulletArrow,{color:item.cc}]}>→</Text><Body style={{flex:1,fontSize:13}}>{p}</Body></View>))}</View>}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const SuccessDetailScreen = React.memo(({ item }) => {
  const d = item.storyData;
  if (!d) return null;
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{ flex:1 }}><Text style={[styles.litCat,{color:item.cc}]}>SUCCESS STORIES</Text><Text style={styles.litHeadline} numberOfLines={2}>{d.person}</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[item.cc+'28',item.cc+'08']} style={[mbStyles.greetBlock,{marginBottom:18}]} start={{x:0,y:0}} end={{x:1,y:1}}>
          <View style={{width:60,height:60,borderRadius:30,backgroundColor:item.cc+'30',justifyContent:'center',alignItems:'center',marginBottom:10,borderWidth:2,borderColor:item.cc+'50'}}><Text style={{fontSize:26}}>👤</Text></View>
          <Text style={mbStyles.greetText}>{d.person}</Text>
          <Text style={{color:item.cc,fontSize:11,fontWeight:'600',marginTop:4}}>{d.role}</Text>
        </LinearGradient>
        <View style={mbStyles.tldrBlock}><Body>{d.intro}</Body></View>
        <FieldLabel color={item.cc} style={{marginBottom:12,marginTop:6}}>THE JOURNEY</FieldLabel>
        {d.journey?.map((phase,i)=>(
          <View key={i} style={[mbStyles.storyCard,{borderLeftWidth:3,borderLeftColor:item.cc+'80'}]}>
            <View style={[mbStyles.storyNum,{backgroundColor:item.cc+'20',borderColor:item.cc+'50',width:32,height:32,borderRadius:8}]}><Text style={{color:item.cc,fontSize:14}}>{['①','②','③','④','⑤'][i]}</Text></View>
            <View style={{ flex:1 }}><Text style={[mbStyles.storyTitle,{color:item.cc}]}>{phase.phase}</Text><Text style={mbStyles.storySummary}>{phase.text}</Text></View>
          </View>
        ))}
        {d.lessons?.length>0&&<InfoBlock style={{marginTop:6}}><FieldLabel color={C.gold}>LESSONS TO CARRY</FieldLabel>{d.lessons.map((l,i)=>(<View key={i} style={styles.bulletRow}><Text style={styles.bulletDiamond}>◆</Text><Body style={{flex:1,fontSize:13}}>{l}</Body></View>))}</InfoBlock>}
        {d.quote&&<View style={mbStyles.quoteBlock}><Text style={mbStyles.quoteText}>{d.quote}</Text></View>}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

// ─── PUZZLE GAMES ─────────────────────────────────────────────────
function generateSudoku() {
  return [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],[8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],[0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]];
}
const solution = [[5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],[8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],[9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9]];

const SudokuGame = React.memo(({ streak, onStreakUpdate }) => {
  const puzzle = useMemo(() => generateSudoku(), []);
  const [board, setBoard]         = useState(() => puzzle.map(r => [...r]));
  const [selected, setSelected]   = useState(null);
  const [errors, setErrors]       = useState(new Set());
  const [completed, setCompleted] = useState(false);
  const isOriginal = (r, c) => puzzle[r][c] !== 0;
  const handleCell = (r, c) => { if (isOriginal(r, c)) return; setSelected([r, c]); };
  const handleNum  = (num) => {
    if (!selected) return;
    const [r, c] = selected;
    if (isOriginal(r, c)) return;
    const nb = board.map(row => [...row]); nb[r][c] = num; setBoard(nb);
    const ne = new Set(errors);
    if (num !== 0 && solution[r][c] !== num) ne.add(`${r}-${c}`); else ne.delete(`${r}-${c}`);
    setErrors(ne);
    if (nb.every((row, ri) => row.every((cell, ci) => cell === solution[ri][ci]))) { setCompleted(true); onStreakUpdate(); }
  };
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{flex:1}}><Text style={[styles.litCat,{color:C.indigo}]}>PUZZLES  ·  SUDOKU</Text><Text style={styles.litHeadline}>Daily Sudoku Challenge 🔢</Text></View><View style={{alignItems:'center'}}><Text style={{color:C.gold,fontSize:16,fontWeight:'800'}}>🔥 {streak}</Text><Text style={{color:C.muted,fontSize:9,letterSpacing:1}}>STREAK</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }} showsVerticalScrollIndicator={false}>
        {completed && <View style={[mbStyles.greetBlock,{alignItems:'center',marginBottom:16}]}><Text style={{fontSize:36,marginBottom:8}}>🎉</Text><Text style={[mbStyles.greetText,{color:C.cyan}]}>Puzzle Solved!</Text><Text style={{color:C.muted,marginTop:4}}>Streak: {streak} days 🔥</Text></View>}
        <View style={sudokuStyles.grid}>
          {board.map((row, ri) => (
            <View key={ri} style={[sudokuStyles.row, ri===2||ri===5?{borderBottomWidth:2,borderBottomColor:'rgba(91,79,232,0.6)'}:{}]}>
              {row.map((cell, ci) => {
                const isSel=selected&&selected[0]===ri&&selected[1]===ci, isErr=errors.has(`${ri}-${ci}`), orig=isOriginal(ri,ci);
                return (<TouchableOpacity key={ci} onPress={()=>handleCell(ri,ci)} style={[sudokuStyles.cell, ci===2||ci===5?{borderRightWidth:2,borderRightColor:'rgba(91,79,232,0.6)'}:{}, isSel&&{backgroundColor:C.indigo+'35'}, isErr&&{backgroundColor:C.rose+'20'}]} activeOpacity={0.7}><Text style={[sudokuStyles.cellText, orig?{color:C.white,fontWeight:'700'}:{color:C.indigo}, isErr&&{color:C.rose}, cell===0&&{opacity:0}]}>{cell||'·'}</Text></TouchableOpacity>);
              })}
            </View>
          ))}
        </View>
        <View style={sudokuStyles.numPad}>
          {[1,2,3,4,5,6,7,8,9].map(n=>(<TouchableOpacity key={n} onPress={()=>handleNum(n)} style={sudokuStyles.numBtn} activeOpacity={0.7}><Text style={sudokuStyles.numText}>{n}</Text></TouchableOpacity>))}
          <TouchableOpacity onPress={()=>handleNum(0)} style={[sudokuStyles.numBtn,{backgroundColor:C.rose+'15'}]} activeOpacity={0.7}><Text style={[sudokuStyles.numText,{color:C.rose}]}>⌫</Text></TouchableOpacity>
        </View>
        <Text style={[styles.loadingText,{fontSize:11,marginTop:8}]}>Tap a cell, then tap a number to fill it in</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const VOCAB_WORDS = [
  {word:'Ephemeral',def:'Lasting for a very short time',options:['Lasting for a very short time','Ancient and historic','Extremely large','Deeply spiritual'],answer:0},
  {word:'Perspicacious',def:'Having a ready insight; shrewd',options:['Overly cautious','Having a ready insight; shrewd','Easily frightened','Extremely loud'],answer:1},
  {word:'Sanguine',def:'Optimistic, especially in a difficult situation',options:['Deeply pessimistic','Relating to blood','Optimistic, especially in a difficult situation','Bitter and resentful'],answer:2},
  {word:'Loquacious',def:'Tending to talk a great deal',options:['Extremely shy','Fond of luxury','Very quiet','Tending to talk a great deal'],answer:3},
  {word:'Tenacious',def:'Not readily letting go; persistent',options:['Not readily letting go; persistent','Lacking courage','Easily distracted','Overly generous'],answer:0},
  {word:'Obfuscate',def:'To make unclear or confusing',options:['To clarify completely','To make unclear or confusing','To celebrate loudly','To travel swiftly'],answer:1},
  {word:'Laconic',def:'Using few words; brief',options:['Extremely energetic','Related to lakes','Using few words; brief','Lacking any colour'],answer:2},
  {word:'Mellifluous',def:'Sweet or musical; pleasant to hear',options:['Extremely sour','Related to honey bees','Causing great sadness','Sweet or musical; pleasant to hear'],answer:3},
  {word:'Perfidious',def:'Deceitful and untrustworthy',options:['Deceitful and untrustworthy','Extremely perfect','Easily forgiven','Lacking any smell'],answer:0},
  {word:'Equanimity',def:'Mental calmness under pressure',options:['Extreme agitation','Equal distribution of money','Mental calmness under pressure','A type of exercise'],answer:2},
];

const VocabGame = React.memo(({ streak, onStreakUpdate }) => {
  const [idx, setIdx]           = useState(0);
  const [score, setScore]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [done, setDone]         = useState(false);
  const current = VOCAB_WORDS[idx];
  const handleAnswer = (optIdx) => {
    if (selected !== null) return;
    setSelected(optIdx);
    if (optIdx === current.answer) setScore(s => s + 1);
    setTimeout(() => { if (idx < VOCAB_WORDS.length-1) { setIdx(i=>i+1); setSelected(null); } else { setDone(true); onStreakUpdate(); } }, 1000);
  };
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{flex:1}}><Text style={[styles.litCat,{color:C.gold}]}>PUZZLES  ·  VOCABULARY</Text><Text style={styles.litHeadline}>Vocabulary Challenge 📚</Text></View><View style={{alignItems:'center'}}><Text style={{color:C.gold,fontSize:16,fontWeight:'800'}}>🔥 {streak}</Text><Text style={{color:C.muted,fontSize:9}}>STREAK</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        {done ? (
          <View style={{alignItems:'center',paddingTop:40}}>
            <Text style={{fontSize:50,marginBottom:16}}>🎓</Text>
            <Text style={[mbStyles.greetText,{textAlign:'center',marginBottom:8}]}>Quiz Complete!</Text>
            <Text style={{color:C.cyan,fontSize:22,fontWeight:'800',marginBottom:4}}>{score}/{VOCAB_WORDS.length}</Text>
            <Text style={{color:C.muted,marginBottom:24}}>{score>=8?'Excellent vocabulary!':score>=5?'Good effort!':'Keep practising!'}</Text>
            <TouchableOpacity style={styles.retryBtnFull} onPress={()=>{setIdx(0);setScore(0);setSelected(null);setDone(false);}}><Text style={styles.retryBtnText}>Play Again</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:16}}>
              <Text style={{color:C.muted,fontSize:12}}>Question {idx+1} of {VOCAB_WORDS.length}</Text>
              <Text style={{color:C.gold,fontSize:12,fontWeight:'700'}}>Score: {score}</Text>
            </View>
            <View style={[styles.probBar,{height:4,marginBottom:20,backgroundColor:'rgba(255,255,255,0.06)'}]}><View style={[styles.probFill,{width:`${(idx/VOCAB_WORDS.length)*100}%`,backgroundColor:C.gold}]}/></View>
            <View style={[mbStyles.greetBlock,{alignItems:'center',marginBottom:24}]}>
              <Text style={{color:C.gold,fontSize:10,fontWeight:'700',letterSpacing:2,marginBottom:8}}>DEFINE THIS WORD</Text>
              <Text style={{color:C.white,fontSize:28,fontWeight:'800',letterSpacing:-0.5}}>{current.word}</Text>
            </View>
            {current.options.map((opt,i)=>{
              let bg='rgba(255,255,255,0.04)',border=C.border,textColor=C.muted;
              if (selected!==null) { if(i===current.answer){bg=C.cyan+'18';border=C.cyan;textColor=C.cyan;} else if(i===selected&&selected!==current.answer){bg=C.rose+'18';border=C.rose;textColor=C.rose;} }
              return <TouchableOpacity key={i} onPress={()=>handleAnswer(i)} activeOpacity={0.8} style={{borderWidth:1,borderColor:border,borderRadius:12,padding:14,marginBottom:10,backgroundColor:bg}}><Text style={{color:textColor,fontSize:13,lineHeight:20}}>{opt}</Text></TouchableOpacity>;
            })}
          </>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const RIDDLES = [
  {q:'I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?',a:'An Echo'},
  {q:'The more you take, the more you leave behind. What am I?',a:'Footsteps'},
  {q:'I have cities but no houses. I have mountains but no trees. I have water but no fish. I have roads but no cars. What am I?',a:'A Map'},
  {q:'What can run but never walks, has a mouth but never talks, has a head but never weeps, has a bed but never sleeps?',a:'A River'},
  {q:'I am always in front of you but can never be seen. What am I?',a:'The Future'},
];

const BrainTeaserGame = React.memo(({ streak, onStreakUpdate }) => {
  const [idx, setIdx]           = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone]         = useState(false);
  const handleNext = () => { if (idx < RIDDLES.length-1) { setIdx(i=>i+1); setRevealed(false); } else { setDone(true); onStreakUpdate(); } };
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{flex:1}}><Text style={[styles.litCat,{color:C.rose}]}>PUZZLES  ·  BRAIN TEASERS</Text><Text style={styles.litHeadline}>Mind-Bending Riddles 🧠</Text></View><View style={{alignItems:'center'}}><Text style={{color:C.gold,fontSize:16,fontWeight:'800'}}>🔥 {streak}</Text><Text style={{color:C.muted,fontSize:9}}>STREAK</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        {done ? (
          <View style={{alignItems:'center',paddingTop:40}}>
            <Text style={{fontSize:50,marginBottom:16}}>🧠</Text>
            <Text style={[mbStyles.greetText,{textAlign:'center',marginBottom:8}]}>All Riddles Done!</Text>
            <Text style={{color:C.muted,marginBottom:24,textAlign:'center'}}>Your brain is razor sharp. Come back tomorrow!</Text>
            <TouchableOpacity style={styles.retryBtnFull} onPress={()=>{setIdx(0);setRevealed(false);setDone(false);}}><Text style={styles.retryBtnText}>Play Again</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={{flexDirection:'row',justifyContent:'space-between',marginBottom:16}}><Text style={{color:C.muted,fontSize:12}}>Riddle {idx+1} of {RIDDLES.length}</Text></View>
            <View style={[styles.probBar,{height:4,marginBottom:20}]}><View style={[styles.probFill,{width:`${(idx/RIDDLES.length)*100}%`,backgroundColor:C.rose}]}/></View>
            <View style={[mbStyles.greetBlock,{marginBottom:20}]}><Text style={{color:C.rose,fontSize:10,fontWeight:'700',letterSpacing:2,marginBottom:10}}>THE RIDDLE</Text><Text style={{color:C.white,fontSize:16,lineHeight:26,fontStyle:'italic'}}>{RIDDLES[idx].q}</Text></View>
            {!revealed ? (
              <TouchableOpacity onPress={()=>setRevealed(true)} style={[styles.retryBtnFull,{backgroundColor:C.rose+'cc'}]} activeOpacity={0.8}><Text style={styles.retryBtnText}>Reveal Answer</Text></TouchableOpacity>
            ) : (
              <>
                <View style={[styles.questionBlock,{marginBottom:16}]}><Text style={{color:C.cyan,fontSize:10,fontWeight:'700',letterSpacing:2,marginBottom:8}}>ANSWER</Text><Text style={{color:C.cyan,fontSize:20,fontWeight:'800'}}>{RIDDLES[idx].a}</Text></View>
                <TouchableOpacity onPress={handleNext} style={styles.retryBtnFull} activeOpacity={0.8}><Text style={styles.retryBtnText}>{idx<RIDDLES.length-1?'Next Riddle \u2192':'Finish!'}</Text></TouchableOpacity>
              </>
            )}
          </>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

const PuzzleDetailScreen = React.memo(({ item, onBack, streak, onStreakUpdate }) => {
  const [subGame, setSubGame] = useState(null);
  if (subGame === 'sudoku') return <SudokuGame streak={streak} onStreakUpdate={onStreakUpdate} />;
  if (subGame === 'vocab')  return <VocabGame  streak={streak} onStreakUpdate={onStreakUpdate} />;
  if (subGame === 'brain')  return <BrainTeaserGame streak={streak} onStreakUpdate={onStreakUpdate} />;
  const games = [
    { id: 'sudoku', label: 'Daily Sudoku',    desc: 'Fill the 9×9 grid with numbers 1-9', emoji: '🔢', color: C.indigo },
    { id: 'vocab',  label: 'Vocabulary Quiz', desc: '10 advanced English words to test',  emoji: '📚', color: C.gold  },
    { id: 'brain',  label: 'Brain Teasers',   desc: '5 mind-bending riddles',             emoji: '🧠', color: C.rose  },
  ];
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.litHeader}><View style={{flex:1}}><Text style={[styles.litCat,{color:C.cyan}]}>PUZZLES</Text><Text style={styles.litHeadline}>Choose Your Challenge 🎮</Text></View><View style={{alignItems:'center'}}><Text style={{color:C.gold,fontSize:20,fontWeight:'800'}}>🔥{streak}</Text><Text style={{color:C.muted,fontSize:9,letterSpacing:1}}>DAY STREAK</Text></View></View>
      <View style={styles.divider} />
      <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[C.gold+'20',C.gold+'08']} style={[mbStyles.greetBlock,{alignItems:'center',marginBottom:24}]}>
          <Text style={{fontSize:40,marginBottom:8}}>🔥</Text>
          <Text style={[mbStyles.greetText,{textAlign:'center'}]}>Current Streak: {streak} Days</Text>
          <Text style={{color:C.gold,fontSize:12,marginTop:4}}>Complete a puzzle daily to keep your streak!</Text>
        </LinearGradient>
        {games.map(g => (
          <TouchableOpacity key={g.id} onPress={() => setSubGame(g.id)} activeOpacity={0.85} style={[mbStyles.storyCard,{borderLeftWidth:3,borderLeftColor:g.color,marginBottom:14}]}>
            <Text style={{fontSize:32,marginRight:4}}>{g.emoji}</Text>
            <View style={{ flex:1 }}>
              <Text style={[mbStyles.storyTitle,{color:g.color,fontSize:16}]}>{g.label}</Text>
              <Text style={mbStyles.storySummary}>{g.desc}</Text>
              <View style={[mbStyles.catPill,{backgroundColor:g.color+'18',borderColor:g.color+'35',marginTop:8}]}><Text style={{color:g.color,fontSize:10,fontWeight:'700'}}>Play Now \u2192</Text></View>
            </View>
          </TouchableOpacity>
        ))}
        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

// ─── BOOKMARKS ────────────────────────────────────────────────────
const BookmarksScreen = React.memo(({ stories, bookmarks, onGoDeep }) => {
  const saved = useMemo(() => stories.filter(s => bookmarks.has(s.id)), [stories, bookmarks]);
  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={styles.bmHeader}>
        <View style={{marginLeft:4}}><Text style={styles.bmTitle}>Saved</Text><Text style={styles.bmSub}>{saved.length} stories  ·  tap to go deep</Text></View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {saved.length === 0 ? (
          <View style={styles.emptyState}><Text style={styles.emptyIcon}>☆</Text><Text style={styles.emptyTitle}>Nothing saved yet</Text><Text style={styles.emptyBody}>Save stories from the feed to analyse them deeply</Text></View>
        ) : (
          saved.map(s => (
            <TouchableOpacity key={s.id} onPress={() => onGoDeep(s)} activeOpacity={0.82} style={[styles.bmCard,{borderLeftColor:s.cc}]}>
              <Text style={[styles.bmCat,{color:s.cc}]}>{s.cat}</Text>
              <Text style={styles.bmHl} numberOfLines={2}>{s.hl}</Text>
              <View style={styles.bmMeta}><Text style={styles.bmSrc}>{s.src}  ·  {s.tm}</Text><View style={[styles.bmDeepBtn,{borderColor:C.indigo+'50'}]}><Text style={[styles.bmDeepBtnText,{color:C.indigo}]}>Open \u2192</Text></View></View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
});

// ─── FEED ITEM — no animation, image shows the moment it loads ───
const FeedItem = React.memo(({ item, bookmarks, onBookmark, onGoDeep }) => {
  const saved = bookmarks.has(item.id);

  const actionLabel =
    item.type === 'horoscope' ? 'View Reading'  :
    item.type === 'recipe'    ? 'View Recipe'   :
    item.type === 'puzzle'    ? 'Play Now'      :
    'Go Deep  ·  Lit Mode';

  return (
    <View style={feedStyles.container}>
      <LinearGradient colors={[item.gradStart, item.gradEnd, '#020210']} style={feedStyles.heroImage} start={{x:0.3,y:0}} end={{x:0.7,y:1}}>
        {item.emoji && <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:80,opacity:0.3}}>{item.emoji}</Text></View>}
      </LinearGradient>
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={feedStyles.heroImage}
          resizeMode="cover"
        />
      )}
      <LinearGradient colors={['transparent','rgba(3,3,14,0.55)','rgba(3,3,14,0.92)',C.bg]} style={feedStyles.fadeOverlay} start={{x:0,y:0}} end={{x:0,y:1}} />
      <View style={feedStyles.content}>
        <View style={feedStyles.liveBadge}>
          <PulseDot color={item.type==='puzzle'?C.gold:item.type==='recipe'?C.cyan:item.type==='horoscope'?C.violet:C.rose} size={5} />
          <Text style={[feedStyles.liveBadgeText,{color:item.type==='puzzle'?C.gold:item.type==='recipe'?C.cyan:item.type==='horoscope'?C.violet:C.rose}]}>
            {item.type==='puzzle'?'INTERACTIVE':item.type==='recipe'?'RECIPE':item.type==='horoscope'?'ASTROLOGY':'LIVE'}
          </Text>
        </View>
        <View style={feedStyles.metaRow}>
          <View style={[feedStyles.catBadge,{backgroundColor:item.cc+'22',borderColor:item.cc+'60'}]}><Text style={[feedStyles.catText,{color:item.cc}]}>{item.cat}</Text></View>
          <View style={feedStyles.scoreBarWrap}><View style={[feedStyles.scoreFill,{width:`${item.score}%`,backgroundColor:item.cc}]}/></View>
          <Text style={feedStyles.scoreLabel}>{item.score}% trust</Text>
          <Text style={feedStyles.srcLabel}>{item.src}  ·  {item.tm}</Text>
        </View>
        <Text style={feedStyles.headline} numberOfLines={3}>{item.hl}</Text>
        <Text style={feedStyles.summary} numberOfLines={2}>{item.sm}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}} contentContainerStyle={{gap:7}}>
          {item.tags?.map(t => <View key={t} style={feedStyles.tagPill}><Text style={feedStyles.tagPillText}>{t}</Text></View>)}
        </ScrollView>
        <View style={feedStyles.actionRow}>
          <TouchableOpacity onPress={() => onBookmark(item.id)} activeOpacity={0.8} style={[feedStyles.saveBtn, saved&&{backgroundColor:C.indigo+'28',borderColor:C.indigo+'65'}]}>
            <Text style={[feedStyles.saveBtnText, saved&&{color:C.indigo}]}>{saved ? '★  Saved' : '☆  Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onGoDeep(item)} activeOpacity={0.85} style={feedStyles.deepBtn}>
            <LinearGradient colors={[item.cc+'60',item.cc+'30']} style={feedStyles.deepBtnGrad} start={{x:0,y:0}} end={{x:1,y:0}}>
              <PulseDot color={item.cc} />
              <Text style={[feedStyles.deepBtnText,{color:item.cc+'ee'}]}>{actionLabel}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.bookmarks.has(prev.item.id) === next.bookmarks.has(next.item.id)
);

// ─── CATEGORY BAR ─────────────────────────────────────────────────
const CategoryBar = React.memo(({ activeCategory, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={feedStyles.catBarScroll} contentContainerStyle={feedStyles.catBarContent} keyboardShouldPersistTaps="handled">
    {FEED_CATEGORIES.map(cat => {
      const isActive = activeCategory === cat.id;
      return (
        <TouchableOpacity key={cat.id} onPress={() => onSelect(cat.id)} activeOpacity={0.75}
          style={[feedStyles.catChip, isActive ? feedStyles.catChipActive : feedStyles.catChipInactive]}>
          <Text style={[feedStyles.catChipText, isActive ? feedStyles.catChipTextActive : feedStyles.catChipTextInactive]}>{cat.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
));

// ─── LITE SCREEN ──────────────────────────────────────────────────
const LiteScreen = React.memo(({ stories, bookmarks, onBookmark, onGoDeep, onShowBookmarks, onShowMorningBrief, onRefresh, refreshing, onLoadMore, loadingMore, activeCategory, onCategoryChange, liveNewsOK }) => {
  const flatListRef = useRef(null);

  const renderItem    = useCallback(({ item }) => <FeedItem item={item} bookmarks={bookmarks} onBookmark={onBookmark} onGoDeep={onGoDeep} />, [bookmarks, onBookmark, onGoDeep]);
  const keyExtractor  = useCallback((item) => item.id, []);
  const getItemLayout = useCallback((_, index) => ({ length: H, offset: H * index, index }), []);
  const ListFooter    = useCallback(() => loadingMore ? (
    <View style={feedStyles.loadMoreFooter}><ActivityIndicator color={C.indigo} size="large" /><Text style={[styles.loadingText,{marginTop:12}]}>Loading more...</Text></View>
  ) : null, [loadingMore]);

  const onLoadMoreRef = useRef(onLoadMore);
  const storiesLenRef = useRef(stories.length);
  useEffect(() => { onLoadMoreRef.current = onLoadMore; }, [onLoadMore]);
  useEffect(() => { storiesLenRef.current = stories.length; }, [stories.length]);
  const onMomentumScrollEnd = useRef((e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / H);
    if (idx >= storiesLenRef.current - 2) {
      onLoadMoreRef.current();
    }
  }).current;

  useEffect(() => { if (stories.length>0 && flatListRef.current) flatListRef.current.scrollToOffset({ offset: 0, animated: false }); }, [activeCategory]);

  const TopBar = (
    <LinearGradient colors={['rgba(3,3,14,0.96)','rgba(3,3,14,0.80)','rgba(3,3,14,0.30)','transparent']} style={feedStyles.topBarGradient} pointerEvents="box-none">
      <SafeAreaView pointerEvents="box-none">
        <View style={feedStyles.topBar} pointerEvents="box-none">
          <View style={styles.logoRow}><Text style={styles.logo}>QYUDAL</Text><PulseDot color={C.indigo} /></View>
          <View style={{ flexDirection:'row',gap:8,alignItems:'center' }}>
            {refreshing && <ActivityIndicator size="small" color={C.cyan} />}
            <TouchableOpacity onPress={onShowMorningBrief} style={feedStyles.morningBriefBtn} activeOpacity={0.8}><Text style={feedStyles.morningBriefBtnText}>☀  Brief</Text></TouchableOpacity>
            <TouchableOpacity onPress={onShowBookmarks} style={styles.savedBtn} activeOpacity={0.8}><Text style={styles.savedBtnText}>{bookmarks.size>0?`★ ${bookmarks.size}`:'Saved'}</Text></TouchableOpacity>
          </View>
        </View>
        <View pointerEvents="box-none"><CategoryBar activeCategory={activeCategory} onSelect={onCategoryChange} /></View>
        {!liveNewsOK && (
          <View style={{ backgroundColor: 'rgba(245,166,35,0.12)', borderBottomWidth: 1, borderBottomColor: 'rgba(245,166,35,0.25)', paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: C.gold, fontSize: 10 }}>⚠</Text>
            <Text style={{ color: C.gold, fontSize: 10, fontWeight: '600' }}>Live news unavailable — showing curated digest. Check your NewsAPI key.</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );

  if (!stories.length) return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {TopBar}
      <View style={{ flex:1,justifyContent:'center',alignItems:'center',gap:14 }}><ActivityIndicator color={C.indigo} size="large" /><Text style={styles.loadingText}>Loading stories…</Text></View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        ref={flatListRef}
        data={stories}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        getItemLayout={getItemLayout}
        onMomentumScrollEnd={onMomentumScrollEnd}
        ListFooterComponent={ListFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.indigo} />}
        removeClippedSubviews
        maxToRenderPerBatch={4}
        windowSize={7}
        initialNumToRender={3}
      />
      {TopBar}
    </View>
  );
});

// ─── MORNING BRIEF ────────────────────────────────────────────────
const MorningBriefScreen = React.memo(({ onBack }) => {
  const [state, setState] = useState('loading');
  const [brief, setBrief] = useState(null);

  const loadBrief = useCallback(async () => {
    setState('loading');
    try {
      const url  = `https://newsapi.org/v2/top-headlines?language=en&pageSize=10&apiKey=${NEWS_API_KEY}`;
      const res  = await fetch(url);
      const data = await res.json();
      if (data.status !== 'ok') throw new Error('Headlines fetch failed');
      const headlines = data.articles.filter(a => a.title && a.title !== '[Removed]' && !hasCJK(a.title)).slice(0, 10).map(a => `• ${a.title} (${a.source?.name || ''})`).join('\n');
      const result = await callAI(`You are a world-class morning news briefing editor for a Gen Z global audience.\nBased on these top headlines from today, create a concise, engaging morning brief.\n\nHeadlines:\n${headlines}\n\nReturn ONLY valid JSON, no extra text or markdown:\n{\n  "greeting": "short punchy welcome line (no date, under 12 words)",\n  "tldr": "2-3 sentence overview of the single most important story today",\n  "stories": [\n    {"title": "story title under 10 words", "summary": "2 clear sentences", "category": "TECH/GEOPOLITICS/ECONOMY/CLIMATE/etc", "importance": "1 sentence on global impact"},\n    {"title": "...", "summary": "...", "category": "...", "importance": "..."},\n    {"title": "...", "summary": "...", "category": "...", "importance": "..."},\n    {"title": "...", "summary": "...", "category": "...", "importance": "..."},\n    {"title": "...", "summary": "...", "category": "...", "importance": "..."}\n  ],\n  "watchToday": ["thing to watch 1", "thing to watch 2", "thing to watch 3"],\n  "quote": "a short thought-provoking quote relevant to today's biggest story"\n}`);
      setBrief(result); setState('ready');
    } catch (err) { console.error('Morning brief error:', err); setState('error'); }
  }, []);

  useEffect(() => { loadBrief(); }, []);

  const today    = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const catColor = useCallback((cat = '') => {
    const c = cat.toUpperCase();
    if (c.includes('GEO')||c.includes('WAR')||c.includes('POLIT')) return '#5eadf5';
    if (c.includes('TECH')||c.includes('AI'))   return C.cyan;
    if (c.includes('ECON')||c.includes('MARK')) return C.gold;
    if (c.includes('INDIA'))  return C.violet;
    if (c.includes('CLIM')||c.includes('ENV'))  return C.rose;
    return C.indigo;
  }, []);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={mbStyles.header}>
        <View style={{ flex:1 }}><Text style={mbStyles.title}>Morning Brief</Text><Text style={mbStyles.date}>{today}</Text></View>
        <View style={[styles.catBadge,{backgroundColor:C.gold+'1e',borderColor:C.gold+'50'}]}><Text style={[styles.catText,{color:C.gold}]}>☀ DAILY</Text></View>
      </View>
      <View style={styles.divider} />
      {state==='loading' && <View style={{flex:1,justifyContent:'center',alignItems:'center',gap:16}}><ActivityIndicator size="large" color={C.indigo}/><Text style={styles.loadingText}>AI is reading today's news…</Text><Text style={[styles.loadingText,{fontSize:11,color:C.faint}]}>Powered by Gemini AI</Text></View>}
      {state==='error'   && <View style={{flex:1,justifyContent:'center',alignItems:'center',padding:30}}><Text style={[styles.errorText,{marginBottom:20}]}>Could not generate morning brief.</Text><TouchableOpacity style={styles.retryBtnFull} onPress={loadBrief}><Text style={styles.retryBtnText}>Try Again</Text></TouchableOpacity></View>}
      {state==='ready' && brief && (
        <ScrollView contentContainerStyle={{ padding: 18 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={[C.indigo+'22',C.cyan+'10']} style={mbStyles.greetBlock} start={{x:0,y:0}} end={{x:1,y:1}}>
            <Text style={mbStyles.greetText}>{brief.greeting || 'Good morning!'}</Text>
          </LinearGradient>
          <View style={mbStyles.tldrBlock}><FieldLabel color={C.indigo}>TODAY'S TOP STORY</FieldLabel><Text style={mbStyles.tldrText}>{brief.tldr}</Text></View>
          <FieldLabel color={C.cyan} style={{marginBottom:10,marginTop:4}}>5 STORIES YOU NEED TO KNOW</FieldLabel>
          {brief.stories?.map((s, i) => {
            const col = catColor(s.category);
            return (
              <View key={i} style={mbStyles.storyCard}>
                <View style={[mbStyles.storyNum,{backgroundColor:col+'20',borderColor:col+'50'}]}><Text style={[mbStyles.storyNumText,{color:col}]}>{i+1}</Text></View>
                <View style={{ flex:1 }}>
                  <View style={[mbStyles.catPill,{backgroundColor:col+'18',borderColor:col+'35'}]}><Text style={[styles.fieldLabel,{color:col,marginBottom:0}]}>{(s.category||'NEWS').toUpperCase()}</Text></View>
                  <Text style={mbStyles.storyTitle}>{s.title}</Text>
                  <Text style={mbStyles.storySummary}>{s.summary}</Text>
                  {s.importance && <View style={mbStyles.importanceRow}><Text style={{color:C.gold,fontSize:10,marginTop:1}}>⚡</Text><Text style={mbStyles.importanceText}>{s.importance}</Text></View>}
                </View>
              </View>
            );
          })}
          {brief.watchToday?.length>0 && <InfoBlock style={{marginTop:6}}><FieldLabel color={C.rose}>WATCH TODAY</FieldLabel>{brief.watchToday.map((w,i)=>(<View key={i} style={styles.bulletRow}><Text style={styles.bulletArrow}>→</Text><Body style={{flex:1,fontSize:12}}>{w}</Body></View>))}</InfoBlock>}
          {brief.quote && <View style={mbStyles.quoteBlock}><Text style={mbStyles.quoteText}>"{brief.quote}"</Text></View>}
          <View style={{ height: 50 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
});

// ─── FALLBACK CONTENT — shown when NewsAPI is unavailable ────────
// FIX: All strings with apostrophes use double quotes to avoid SyntaxError
function generateFallbackNews() {
  const items = [
    { hl: "AI Models Now Surpass Humans on Most Cognitive Benchmarks", sm: "The latest generation of large language models has achieved human-level performance across reading comprehension, mathematical reasoning, and coding, raising both excitement and caution among researchers.", cat: "TECH & AI", cc: "#00e5b0", gi: 1 },
    { hl: "Global Central Banks Signal Pause in Rate Hike Cycle", sm: "After 18 months of aggressive monetary tightening, the US Federal Reserve, ECB, and Bank of England are all signalling a potential pause as inflation begins to ease toward target levels.", cat: "ECONOMY", cc: "#f5a623", gi: 2 },
    { hl: "India GDP Growth Hits 8.4 Percent, Fastest Among Major Economies", sm: "India's economy expanded at 8.4% in the latest quarter, making it the fastest-growing major economy globally, driven by manufacturing, infrastructure investment, and a booming services sector.", cat: "INDIA", cc: "#a855f7", gi: 3 },
    { hl: "Scientists Confirm Breakthrough in Room-Temperature Superconductivity", sm: "A research team has verified a material that exhibits superconducting properties at room temperature, potentially revolutionising energy transmission, computing, and transportation.", cat: "SCIENCE", cc: "#5eadf5", gi: 0 },
    { hl: "Climate Summit Reaches Historic Agreement on Coal Phase-Out", sm: "More than 140 nations have signed a landmark agreement to phase out unabated coal power by 2035, described by negotiators as the most significant climate commitment in a decade.", cat: "CLIMATE", cc: "#ff4d6d", gi: 4 },
    { hl: "SpaceX Successfully Tests Starship for Mars Mission Profile", sm: "The latest Starship test replicated a Mars entry, descent and landing scenario for the first time, marking a major milestone in the ambition to establish a human presence on the Red Planet.", cat: "TECH & AI", cc: "#00e5b0", gi: 1 },
    { hl: "BRICS Expansion: Six New Members Join Economic Bloc", sm: "The BRICS grouping officially welcomed six new member states, significantly expanding its economic footprint to over 45% of the world population and reshaping the architecture of global trade.", cat: "GEOPOLITICS", cc: "#5eadf5", gi: 0 },
    { hl: "WHO Declares End to Global Health Emergency", sm: "The World Health Organisation formally ended the global health emergency that had been in place, while cautioning that surveillance and preparedness infrastructure must remain intact.", cat: "HEALTH", cc: "#ff4d6d", gi: 4 },
    { hl: "Electric Vehicle Sales Cross 50% of New Car Market in Europe", sm: "For the first time, EVs outsold internal combustion engine vehicles across the European Union, driven by subsidies, charging infrastructure investment, and falling battery costs.", cat: "ECONOMY", cc: "#f5a623", gi: 2 },
    { hl: "Microsoft and Google Race to Embed AI in Every Product", sm: "Both tech giants announced sweeping AI integration roadmaps at their annual developer conferences, with Copilot and Gemini being embedded across productivity, cloud, and consumer products.", cat: "TECH & AI", cc: "#00e5b0", gi: 1 },
    { hl: "India Launches Its First Indigenous Space Station Module", sm: "ISRO successfully deployed the first module of India's planned space station, a milestone in the country's ambition to establish a permanent human presence in low Earth orbit by 2035.", cat: "INDIA", cc: "#a855f7", gi: 3 },
    { hl: "UN Report: Ocean Plastic Pollution Reaches Record High", sm: "A new UNEP assessment found that over 170 trillion pieces of plastic are now floating in the world's oceans, with the rate of accumulation accelerating despite international pledges.", cat: "CLIMATE", cc: "#ff4d6d", gi: 4 },
  ];
  return items.map((item, i) => ({
    id: `fallback-${i}-${Date.now()}`,
    type: "news",
    cat: item.cat, cc: item.cc,
    gradStart: GRADS[item.gi][0], gradEnd: GRADS[item.gi][1],
    hl: item.hl, sm: item.sm,
    src: "Qyudal Digest", tm: "Today",
    image: null,
    tags: extractTags(item.hl, item.cat),
    gi: item.gi, score: 88 + Math.floor(Math.random() * 10),
    publishedAt: new Date().toISOString(),
    isFallback: true,
  }));
}

// ─── ROOT APP ─────────────────────────────────────────────────────
export default function App() {
  const [authUser, setAuthUser]       = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { setAuthUser(user); setAuthLoading(false); });
    return unsub;
  }, []);

  const [categoryCache, setCategoryCache]   = useState({});
  const [categoryPages, setCategoryPages]   = useState({});
  const [stories, setStories]               = useState([]);
  const [newsState, setNewsState]           = useState('loading');
  const [refreshing, setRefreshing]         = useState(false);
  const [loadingMore, setLoadingMore]       = useState(false);
  const [activeCategory, setActiveCategory] = useState('general');
  const [screen, setScreen]                 = useState('lite');
  const [selected, setSelected]             = useState(null);
  const [bookmarks, setBookmarks]           = useState(new Set());
  const [aiCache, setAiCache]               = useState({});
  const [puzzleStreak, setPuzzleStreak]     = useState(0);
  const [liveNewsOK, setLiveNewsOK]         = useState(true);

  const activeCategoryRef = useRef('general');
  activeCategoryRef.current = activeCategory;

  const loadNews = useCallback(async (isRefresh = false, category) => {
    const cat = category ?? activeCategoryRef.current;
    if (!isRefresh && categoryCache[cat]?.length > 0) { setStories(categoryCache[cat]); setNewsState('ready'); return; }
    if (isRefresh) setRefreshing(true); else setNewsState('loading');
    try {
      let data = await fetchLiveNews(cat, 1);
      if (!data.length && !SPECIAL_CATEGORIES.has(cat)) {
        data = generateFallbackNews();
        setLiveNewsOK(false);
      }
      if (!data.length) { setNewsState('error'); setRefreshing(false); return; }
      const first3 = data.slice(0, 3).filter(s => s.image).map(s => Image.prefetch(s.image).catch(() => {}));
      await Promise.allSettled(first3);
      setCategoryCache(c => ({ ...c, [cat]: data }));
      setCategoryPages(p => ({ ...p, [cat]: 1 }));
      setStories(data); setNewsState('ready');
      data.slice(3).forEach(s => { if (s.image) Image.prefetch(s.image).catch(() => {}); });
    } catch (err) {
      console.error('loadNews error:', err.message);
      if (!SPECIAL_CATEGORIES.has(cat)) {
        const fallback = generateFallbackNews();
        setCategoryCache(c => ({ ...c, [cat]: fallback }));
        setCategoryPages(p => ({ ...p, [cat]: 1 }));
        setStories(fallback); setNewsState('ready'); setLiveNewsOK(false);
      } else {
        setNewsState('error');
      }
    } finally { setRefreshing(false); }
  }, [categoryCache]);

  const loadMoreNews = useCallback(async () => {
    if (loadingMore || newsState !== 'ready') return;
    setLoadingMore(true);
    const cat         = activeCategoryRef.current;
    const currentPage = categoryPages[cat] || 1;
    try {
      const nextPage = currentPage + 1;
      const data     = await fetchLiveNews(cat, nextPage);
      if (data.length) {
        const newStories = [...(categoryCache[cat] || []), ...data];
        setCategoryCache(c => ({ ...c, [cat]: newStories }));
        setCategoryPages(p => ({ ...p, [cat]: nextPage }));
        setStories(newStories);
        data.forEach(s => { if (s.image) Image.prefetch(s.image).catch(() => {}); });
      }
    } catch (err) { console.error('loadMore error:', err.message); }
    finally { setLoadingMore(false); }
  }, [loadingMore, newsState, categoryCache, categoryPages]);

  const handleCategoryChange = useCallback((category) => {
    if (category === activeCategoryRef.current) return;
    setActiveCategory(category);
    activeCategoryRef.current = category;
    if (categoryCache[category]?.length > 0) { setStories(categoryCache[category]); setNewsState('ready'); return; }
    setStories([]); setNewsState('loading');
    fetchLiveNews(category, 1).then(data => {
      let resolved = data;
      if (!resolved.length && !SPECIAL_CATEGORIES.has(category)) {
        resolved = generateFallbackNews();
        setLiveNewsOK(false);
      }
      setCategoryCache(c => ({ ...c, [category]: resolved }));
      setCategoryPages(p => ({ ...p, [category]: 1 }));
      setStories(resolved.length ? resolved : []);
      setNewsState(resolved.length ? 'ready' : 'error');
      resolved.slice(0, 8).forEach(s => { if (s.image) Image.prefetch(s.image).catch(() => {}); });
    }).catch(() => {
      if (!SPECIAL_CATEGORIES.has(category)) {
        const fallback = generateFallbackNews();
        setCategoryCache(c => ({ ...c, [category]: fallback }));
        setCategoryPages(p => ({ ...p, [category]: 1 }));
        setStories(fallback); setNewsState('ready'); setLiveNewsOK(false);
      } else { setNewsState('error'); }
    });
  }, [categoryCache]);

  useEffect(() => { loadNews(); discoverGeminiModel(); }, []);

  useEffect(() => {
    const backAction = () => { if (screen !== 'lite') { setScreen('lite'); return true; } return false; };
    const h = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => h.remove();
  }, [screen]);

  const toggleBm = useCallback((id) => {
    setBookmarks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const handleGoDeep = useCallback((s) => {
    setSelected(s);
    const t = s.type;
    if      (t === 'horoscope')         setScreen('horoscope_detail');
    else if (t === 'recipe')            setScreen('recipe_detail');
    else if (t === 'study')             setScreen('study_detail');
    else if (t === 'healthy_lifestyle') setScreen('health_detail');
    else if (t === 'success_stories')   setScreen('success_detail');
    else if (t === 'puzzle')            setScreen('puzzle_detail');
    else                                setScreen('lit');
  }, []);

  const handleStreakUpdate = useCallback(() => setPuzzleStreak(s => s + 1), []);
  const goBack             = useCallback(() => setScreen('lite'), []);

  if (authLoading)          return <LoadingScreen />;
  if (!authUser)            return <AuthScreen />;
  if (newsState==='loading') return <LoadingScreen />;
  if (newsState==='error')   return <ErrorScreen onRetry={() => loadNews()} />;

  return (
    <>
      {screen === 'lite' && (
        <LiteScreen
          stories={stories} bookmarks={bookmarks}
          onBookmark={toggleBm} onGoDeep={handleGoDeep}
          onShowBookmarks={() => setScreen('bookmarks')}
          onShowMorningBrief={() => setScreen('morning')}
          onRefresh={() => loadNews(true)} refreshing={refreshing}
          onLoadMore={loadMoreNews} loadingMore={loadingMore}
          activeCategory={activeCategory} onCategoryChange={handleCategoryChange}
          liveNewsOK={liveNewsOK}
        />
      )}
      {screen === 'morning'          && <MorningBriefScreen onBack={goBack} />}
      {screen === 'bookmarks'        && <BookmarksScreen stories={stories} bookmarks={bookmarks} onGoDeep={handleGoDeep} />}
      {screen === 'lit'              && selected && <LitScreen story={selected} bookmarks={bookmarks} onBookmark={toggleBm} aiCache={aiCache} setAiCache={setAiCache} onBack={goBack} />}
      {screen === 'horoscope_detail' && selected && <HoroscopeDetailScreen item={selected} onBack={goBack} />}
      {screen === 'recipe_detail'    && selected && <RecipeDetailScreen    item={selected} onBack={goBack} />}
      {screen === 'study_detail'     && selected && <StudyDetailScreen     item={selected} onBack={goBack} />}
      {screen === 'health_detail'    && selected && <HealthDetailScreen    item={selected} onBack={goBack} />}
      {screen === 'success_detail'   && selected && <SuccessDetailScreen   item={selected} onBack={goBack} />}
      {screen === 'puzzle_detail'    && selected && <PuzzleDetailScreen    item={selected} onBack={goBack} streak={puzzleStreak} onStreakUpdate={handleStreakUpdate} />}
    </>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const authS = StyleSheet.create({
  scroll:        { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 6 },
  tagline:       { fontSize: 12, color: C.muted, textAlign: 'center', letterSpacing: 1, marginBottom: 36 },
  card:          { borderRadius: 20, padding: 22, borderWidth: 1, borderColor: C.border },
  modeRow:       { flexDirection: 'row', gap: 8, marginBottom: 24 },
  modeBtn:       { flex: 1, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modeBtnActive: { backgroundColor: C.indigo + '28', borderColor: C.indigo + '60' },
  modeBtnText:   { fontSize: 14, color: C.muted, fontWeight: '500' },
  input:         { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, color: C.white, fontSize: 14, marginBottom: 18 },
  errorBox:      { backgroundColor: C.rose + '18', borderWidth: 1, borderColor: C.rose + '44', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText:     { color: C.rose, fontSize: 12, lineHeight: 18 },
  submitBtn:     { borderRadius: 26, overflow: 'hidden', marginTop: 4 },
  submitGrad:    { paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  switchText:    { color: C.muted, fontSize: 13 },
});

const sudokuStyles = StyleSheet.create({
  grid:   { borderWidth: 2, borderColor: 'rgba(91,79,232,0.6)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 },
  row:    { flexDirection: 'row' },
  cell:   { width: (W-32)/9, height: (W-32)/9, justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  cellText: { fontSize: 16, fontWeight: '600' },
  numPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 12 },
  numBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(91,79,232,0.15)', borderWidth: 1, borderColor: 'rgba(91,79,232,0.4)', justifyContent: 'center', alignItems: 'center' },
  numText:{ fontSize: 18, fontWeight: '700', color: C.indigo },
});

const feedStyles = StyleSheet.create({
  container:           { width: W, height: H, backgroundColor: C.bg },
  heroImage:           { position: 'absolute', top: 0, left: 0, right: 0, height: H * 0.58 },
  fadeOverlay:         { position: 'absolute', top: H * 0.28, left: 0, right: 0, height: H * 0.72 },
  content:             { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, paddingBottom: Platform.OS === 'ios' ? 36 : 24 },
  liveBadge:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  liveBadgeText:       { fontSize: 9, fontWeight: '700', letterSpacing: 1.8 },
  metaRow:             { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  catBadge:            { borderRadius: 22, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  catText:             { fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
  scoreBarWrap:        { width: 44, height: 3, backgroundColor: 'rgba(255,255,255,.1)', borderRadius: 2 },
  scoreFill:           { height: '100%', borderRadius: 2 },
  scoreLabel:          { fontSize: 10, color: 'rgba(255,255,255,.38)' },
  srcLabel:            { fontSize: 10, color: 'rgba(255,255,255,.3)' },
  headline:            { fontSize: 22, fontWeight: '700', color: C.white, lineHeight: 30, marginBottom: 10, letterSpacing: -0.3 },
  summary:             { fontSize: 14, color: 'rgba(238,240,255,.5)', lineHeight: 22, marginBottom: 14 },
  tagPill:             { backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  tagPillText:         { fontSize: 10, color: 'rgba(255,255,255,.45)' },
  actionRow:           { flexDirection: 'row', gap: 10 },
  saveBtn:             { backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', borderRadius: 26, paddingHorizontal: 20, paddingVertical: 13, justifyContent: 'center' },
  saveBtnText:         { color: 'rgba(255,255,255,.65)', fontSize: 13 },
  deepBtn:             { flex: 1, borderRadius: 26, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(91,79,232,.50)' },
  deepBtnGrad:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 13 },
  deepBtnText:         { color: '#c4beff', fontSize: 13, fontWeight: '500' },
  topBarGradient:      { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  topBar:              { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 10, paddingBottom: 10 },
  morningBriefBtn:     { backgroundColor: 'rgba(245,166,35,0.14)', borderWidth: 1, borderColor: 'rgba(245,166,35,0.4)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 },
  morningBriefBtnText: { color: C.gold, fontSize: 12, fontWeight: '600' },
  loadMoreFooter:      { height: H, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg, gap: 4 },
  catBarScroll:        { maxHeight: 44 },
  catBarContent:       { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  catChip:             { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  catChipActive:       { backgroundColor: '#2563eb' },
  catChipInactive:     { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#374151' },
  catChipText:         { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  catChipTextActive:   { color: '#ffffff' },
  catChipTextInactive: { color: '#9ca3af' },
});

const mbStyles = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 14, backgroundColor: C.bg1, borderBottomWidth: 1, borderBottomColor: C.border },
  title:         { fontSize: 20, fontWeight: '800', color: C.white, letterSpacing: -0.3 },
  date:          { fontSize: 11, color: C.muted, marginTop: 2 },
  greetBlock:    { borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.indigo + '30' },
  greetText:     { fontSize: 18, fontWeight: '700', color: C.white, lineHeight: 26 },
  tldrBlock:     { backgroundColor: 'rgba(91,79,232,.08)', borderWidth: 1, borderColor: 'rgba(91,79,232,.24)', borderRadius: 14, padding: 16, marginBottom: 18 },
  tldrText:      { fontSize: 14, color: 'rgba(238,240,255,.75)', lineHeight: 22 },
  storyCard:     { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,.025)', borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 10 },
  storyNum:      { width: 28, height: 28, borderRadius: 14, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2 },
  storyNumText:  { fontSize: 12, fontWeight: '800' },
  catPill:       { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, marginBottom: 6 },
  storyTitle:    { fontSize: 14, fontWeight: '600', color: C.white, lineHeight: 20, marginBottom: 5 },
  storySummary:  { fontSize: 12, color: 'rgba(238,240,255,.5)', lineHeight: 19 },
  importanceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 7 },
  importanceText:{ fontSize: 11, color: C.gold + 'cc', flex: 1, lineHeight: 17 },
  quoteBlock:    { backgroundColor: 'rgba(0,229,176,.05)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,229,176,.22)', borderRadius: 14, padding: 16, marginTop: 8 },
  quoteText:     { fontSize: 13, fontStyle: 'italic', color: C.cyan + 'bb', lineHeight: 21, textAlign: 'center' },
});

const tlStyles = StyleSheet.create({
  titleRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(91,79,232,0.18)' },
  titleIcon:      { fontSize: 14 },
  skeletonRow:    { flexDirection: 'row', marginBottom: 18, gap: 14, alignItems: 'flex-start' },
  skeletonLine:   { width: 2, height: '100%', backgroundColor: 'rgba(255,255,255,0.06)', position: 'absolute', left: 11, top: 0 },
  skeletonDot:    { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.07)', flexShrink: 0 },
  eventRow:       { flexDirection: 'row', alignItems: 'stretch', marginBottom: 4, gap: 12 },
  rail:           { width: 26, alignItems: 'center', flexShrink: 0 },
  railLine:       { width: 2, flex: 1, minHeight: 12, borderRadius: 1 },
  railLineBottom: { width: 2, flex: 1, minHeight: 12, borderRadius: 1 },
  railDot:        { width: 26, height: 26, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  railIcon:       { fontSize: 10, fontWeight: '700' },
  eventCard:      { flex: 1, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 10 },
  eventMeta:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' },
  typePill:       { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1 },
  typeText:       { fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  period:         { fontSize: 10, color: 'rgba(238,240,255,0.38)', fontVariant: ['tabular-nums'] },
  eventLabel:     { fontSize: 13, fontWeight: '600', color: C.white, lineHeight: 19, marginBottom: 5 },
  nowRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,229,176,0.2)' },
  nowDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: C.cyan },
  nowText:        { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: C.cyan },
});

const vizStyles = StyleSheet.create({
  titleRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(168,85,247,0.18)' },
  titleIcon:     { fontSize: 14 },
  skeletonNode:  { width: '80%', alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 14, padding: 16 },
  arrow:         { textAlign: 'center', fontSize: 18, color: 'rgba(255,255,255,0.15)', marginVertical: 2 },
  flowContainer: { alignItems: 'center' },
  nodeCard:      { width: '90%', borderWidth: 1, borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' },
  accentLine:    { position: 'absolute', top: 0, left: 0, width: 3, bottom: 0, borderTopLeftRadius: 16, borderBottomLeftRadius: 16, opacity: 0.7 },
  nodeHeader:    { marginBottom: 9 },
  typePill:      { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  typeText:      { fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  nodeLabel:     { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 6, paddingLeft: 6 },
  nodeDesc:      { fontSize: 12, color: 'rgba(238,240,255,0.48)', lineHeight: 19, paddingLeft: 6 },
  arrowContainer:{ alignItems: 'center', paddingVertical: 2 },
  arrowStem:     { width: 2, height: 14, borderRadius: 1 },
  arrowHead:     { fontSize: 12, marginTop: -2 },
  legend:        { marginTop: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 12 },
  legendTitle:   { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, color: 'rgba(238,240,255,0.28)', marginBottom: 10 },
  legendRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem:    { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:     { width: 7, height: 7, borderRadius: 3.5 },
  legendText:    { fontSize: 9, fontWeight: '600', letterSpacing: 0.5, textTransform: 'capitalize' },
});

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: C.bg },
  loadingScreen:  { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText:    { color: C.muted, fontSize: 13, letterSpacing: 0.5 },
  retryBtnFull:   { backgroundColor: C.indigo, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32 },
  retryBtnText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
  infoBlock:      { backgroundColor: 'rgba(255,255,255,.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,.07)', borderRadius: 12, padding: 14, marginBottom: 11 },
  fieldLabel:     { fontSize: 9, fontWeight: '700', letterSpacing: 1.6, marginBottom: 8, color: C.indigo },
  bodyText:       { fontSize: 13, color: 'rgba(238,240,255,.52)', lineHeight: 21 },
  importanceBlock:{ backgroundColor: 'rgba(91,79,232,.08)', borderWidth: 1, borderColor: 'rgba(91,79,232,.26)', borderRadius: 10, padding: 13 },
  importanceText: { fontSize: 12, color: '#c4beff', lineHeight: 20, fontStyle: 'italic' },
  scenarioCard:   { borderWidth: 1, borderLeftWidth: 3, borderRadius: 10, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: 14, marginBottom: 10, backgroundColor: 'rgba(255,255,255,.02)' },
  scenarioHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  scenarioLabel:  { fontSize: 13, fontWeight: '500', color: C.white, flex: 1 },
  scenarioProb:   { fontSize: 14, fontWeight: '700' },
  probBar:        { height: 3, backgroundColor: 'rgba(255,255,255,.06)', borderRadius: 2, marginBottom: 10 },
  probFill:       { height: '100%', borderRadius: 2 },
  debateHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 9, flexWrap: 'wrap' },
  debatePill:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  debatePillText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  debateName:     { fontSize: 12, fontWeight: '500', color: C.white },
  neutralBlock:   { backgroundColor: 'rgba(255,255,255,.02)', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,.1)', borderRadius: 12, padding: 14 },
  bulletRow:      { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  bulletDiamond:  { color: C.indigo, fontSize: 9, marginTop: 4 },
  bulletArrow:    { color: C.gold, fontSize: 11, marginTop: 2 },
  tldrBlock:      { backgroundColor: 'rgba(91,79,232,.09)', borderWidth: 1, borderColor: 'rgba(91,79,232,.24)', borderRadius: 12, padding: 14, marginBottom: 12 },
  tldrText:       { fontSize: 13, color: '#c4beff', fontWeight: '500', lineHeight: 21 },
  questionBlock:  { backgroundColor: 'rgba(0,229,176,.06)', borderWidth: 1, borderColor: 'rgba(0,229,176,.2)', borderRadius: 12, padding: 14 },
  errorBlock:     { alignItems: 'center', paddingVertical: 60 },
  errorText:      { color: 'rgba(255,255,255,.35)', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  retryBtn:       { borderWidth: 1, borderColor: 'rgba(91,79,232,.45)', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 22 },
  retryText:      { color: C.indigo, fontSize: 13 },
  litHeader:      { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingTop: 14, backgroundColor: C.bg1, borderBottomWidth: 1, borderBottomColor: C.border },
  litCat:         { fontSize: 9, fontWeight: '700', letterSpacing: 1.3, marginBottom: 4 },
  litHeadline:    { fontSize: 13, color: C.white, fontWeight: '500', lineHeight: 19 },
  bmIconBtn:      { padding: 8 },
  bmIcon:         { fontSize: 22, color: 'rgba(255,255,255,.3)' },
  sourceStrip:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.05)' },
  sourceText:     { fontSize: 10, color: 'rgba(255,255,255,.32)' },
  tabBar:         { maxHeight: 50, backgroundColor: C.bg },
  tabBtn:         { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: 'rgba(255,255,255,.04)', flexDirection: 'row', alignItems: 'center' },
  tabBtnText:     { fontSize: 12, fontWeight: '500' },
  divider:        { height: 1, backgroundColor: 'rgba(255,255,255,.07)', marginHorizontal: 16, marginTop: 2 },
  bmHeader:       { flexDirection: 'row', alignItems: 'center', padding: 18, paddingTop: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  bmTitle:        { fontSize: 22, fontWeight: '700', color: C.white, letterSpacing: -0.3 },
  bmSub:          { fontSize: 11, color: C.muted, marginTop: 2 },
  emptyState:     { alignItems: 'center', paddingTop: 90 },
  emptyIcon:      { fontSize: 44, color: 'rgba(255,255,255,.18)', marginBottom: 18 },
  emptyTitle:     { fontSize: 16, color: 'rgba(255,255,255,.38)', marginBottom: 8 },
  emptyBody:      { fontSize: 13, color: C.muted, textAlign: 'center', maxWidth: 260, lineHeight: 21 },
  bmCard:         { backgroundColor: 'rgba(255,255,255,.03)', borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, borderRadius: 14, padding: 16, marginBottom: 12 },
  bmCat:          { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  bmHl:           { fontSize: 14, fontWeight: '500', color: C.white, lineHeight: 21, marginBottom: 10 },
  bmMeta:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bmSrc:          { fontSize: 11, color: C.muted },
  bmDeepBtn:      { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  bmDeepBtnText:  { fontSize: 11 },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo:           { fontSize: 21, fontWeight: '900', color: C.white, letterSpacing: 4 },
  savedBtn:       { backgroundColor: 'rgba(255,255,255,.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,.14)', borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8 },
  savedBtnText:   { color: 'rgba(255,255,255,.72)', fontSize: 12 },
  catBadge:       { borderRadius: 22, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  catText:        { fontSize: 9, fontWeight: '700', letterSpacing: 1.3 },
});