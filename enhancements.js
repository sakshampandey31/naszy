/* ============================================================
   NASZY ADVANCED ENHANCEMENTS
   - Focus Score & Daily Analytics
   - Productivity Heatmap
   - Spaced Repetition System
   - Streak Animations
   - Advanced UX Features
============================================================ */

// ── FOCUS SCORE SYSTEM ────────────────────────────────────
function calculateFocusScore() {
  const today = new Date().toDateString();
  const dailyData = ST.dailyStats ? ST.dailyStats[today] : null;
  
  if (!dailyData) {
    return { score: 0, level: 'Rest Day' };
  }

  // Factors: sessions completed, consistency, streak, time spent
  const sessionScore = Math.min(dailyData.sessions * 10, 40);
  const timeScore = Math.min((dailyData.hours / 8) * 40, 40); // Max score at 8h/day
  const consistencyBonus = ST.streak > 3 ? 20 : ST.streak > 7 ? 40 : 0;
  
  const totalScore = sessionScore + timeScore + consistencyBonus;
  
  let level = 'Rest Day';
  if (totalScore >= 100) level = '🔥 Peak Focus';
  else if (totalScore >= 80) level = '✨ Great Day';
  else if (totalScore >= 50) level = '💪 Good Session';
  else if (totalScore > 0) level = '👌 Active';

  return { score: Math.min(totalScore, 100), level };
}

// ── PRODUCTIVITY HEATMAP (GitHub-style) ────────────────────
function generateProductivityHeatmap() {
  const today = new Date();
  const weeks = [];
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  // Generate last 12 weeks
  for (let w = 12; w > 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + (7 * (12 - w)) + d);
      const dateStr = date.toDateString();
      const data = ST.dailyStats ? ST.dailyStats[dateStr] : null;
      
      week.push({
        date: dateStr,
        hours: data ? data.hours : 0,
        sessions: data ? data.sessions : 0,
        intensity: data ? Math.min((data.hours / 8) * 4, 4) : 0
      });
    }
    weeks.push(week);
  }

  return weeks;
}

// ── SPACED REPETITION ALGORITHM (Leitner System) ──────────
function getCardDifficulty(card) {
  const now = Date.now();
  const lastReview = card.lastReviewed || 0;
  const daysAgo = (now - lastReview) / (1000 * 60 * 60 * 24);

  // Intervals: 1, 3, 7, 14, 30 days
  const intervals = [1, 3, 7, 14, 30];
  const box = card.box || 0;
  
  if (box >= intervals.length) return 'mastered';
  
  const dueDate = new Date(lastReview);
  dueDate.setDate(dueDate.getDate() + intervals[box]);

  return {
    box: card.box || 0,
    daysUntilReview: Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))),
    isDue: now > dueDate,
    nextInterval: intervals[Math.min(box + 1, intervals.length - 1)]
  };
}

function updateCardBox(card, difficulty) {
  if (!card) return;
  
  // Easy = move forward, Hard = reset
  if (difficulty === 'easy') {
    card.box = (card.box || 0) + 1;
    card.box = Math.min(card.box, 4); // Max box is 4
  } else if (difficulty === 'hard') {
    card.box = 0;
  } else if (difficulty === 'ok') {
    // Stay in current box
  }
  
  card.lastReviewed = Date.now();
  card.reviewCount = (card.reviewCount || 0) + 1;
}

// ── STREAK FIRE ANIMATION ────────────────────────────────
function animateStreakGain() {
  const streak = $('streak-val');
  if (!streak) return;

  // Add confetti effect
  createConfetti(50);
  
  // Animate streak number
  streak.style.animation = 'none';
  setTimeout(() => {
    streak.style.animation = 'popIn 0.6s var(--spring) forwards';
  }, 10);
}

function createConfetti(count) {
  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      left: ${Math.random() * 100}vw;
      top: -10px;
      width: 8px;
      height: 8px;
      background: linear-gradient(135deg, #3B82F6, #60a5fa);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9000;
      animation: confettiFall ${2 + Math.random()} forwards ease-in;
    `;
    
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
}

if (!document.querySelector('style#confetti-anim')) {
  const style = document.createElement('style');
  style.id = 'confetti-anim';
  style.textContent = `
    @keyframes confettiFall {
      to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// ── SMART STUDY TIME SUGGESTIONS ─────────────────────────
function getSmartStudySuggestion() {
  const hour = new Date().getHours();
  
  const suggestions = {
    morning: { time: '6-8 AM', reason: 'Peak mental clarity', emoji: '🌅' },
    midday: { time: '12-1 PM', reason: 'Second wind', emoji: '☀️' },
    afternoon: { time: '3-5 PM', reason: 'Energy peak', emoji: '⚡' },
    evening: { time: '7-9 PM', reason: 'Focused learning', emoji: '🌙' },
    night: { time: '10 PM-12 AM', reason: 'Deep work mode', emoji: '🦉' }
  };

  if (hour >= 6 && hour < 10) return suggestions.morning;
  if (hour >= 10 && hour < 12) return suggestions.midday;
  if (hour >= 12 && hour < 17) return suggestions.afternoon;
  if (hour >= 17 && hour < 21) return suggestions.evening;
  return suggestions.night;
}

// ── AUTO-SAVE INDICATOR ────────────────────────────────────
function showAutoSaveIndicator() {
  const indicator = $('saveIndicator');
  if (!indicator) return;

  indicator.textContent = '💾 Saving...';
  indicator.style.color = 'var(--blue-light)';
  indicator.style.opacity = '1';

  setTimeout(() => {
    indicator.textContent = '✓ Saved';
    indicator.style.color = 'var(--t4)';
  }, 500);

  setTimeout(() => {
    indicator.style.opacity = '0.6';
  }, 2000);
}

// ── DAILY AFFIRMATIONS & MOTIVATIONAL QUOTES ──────────────
const AFFIRMATIONS = [
  'Every small step forward counts. Progress over perfection.',
  'Your future self will thank you for studying today.',
  'Focus is power. You are in control of your attention.',
  'Challenges are opportunities to grow stronger.',
  'Consistency beats intensity. Show up every day.',
  'Your brain gets stronger with every study session.',
  'Success is a marathon, not a sprint. Pace yourself.',
  'You\'re exactly where you need to be right now.',
  'Learning today, leading tomorrow.',
  'Breathe. Focus. Succeed.',
];

function getRandomAffirmation() {
  return AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
}

function displayDailyAffirmation() {
  const mantra = $('dailyMantra');
  if (mantra) {
    mantra.style.animation = 'fadeUp 0.6s var(--ease) both';
    mantra.textContent = getRandomAffirmation();
  }
}

// ── ADVANCED GOAL TRACKING ────────────────────────────────
function trackGoalProgress() {
  if (!ST.goals) return;

  const completedGoals = ST.goals.filter(g => g.done).length;
  const allGoals = ST.goals.length;
  const completion = allGoals > 0 ? (completedGoals / allGoals) * 100 : 0;

  // Unlock achievements based on goal completion
  if (completion === 100 && allGoals > 0) {
    unlock('perfect');
  }

  return { completed: completedGoals, total: allGoals, percentage: completion };
}

// ── TIME-BASED GREETINGS ────────────────────────────────
function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  const streak = ST.streak || 0;

  if (hour < 6) return `Evening scholar. Time to rest. 🌙`;
  if (hour < 12) return `Rise and shine! ${streak > 0 ? `You're on a ${streak}-day streak 🔥` : 'Let\'s build momentum today.'}`;
  if (hour < 17) return `Afternoon focus incoming! ${streak > 3 ? `Great work maintaining your streak! 🏆` : `Let's write a great story today.`}`;
  if (hour < 21) return `Prime study hours. Let's make them count. 💪`;
  return `Night owl mode? Your brain is ready. 🦉`;
}

// ── SESSION RECORDING & REPLAY ──────────────────────────
function recordStudySession(duration, subject, intensity) {
  if (!ST.sessions) ST.sessions = [];

  const session = {
    id: Date.now(),
    date: new Date().toISOString(),
    duration: duration,
    subject: subject || 'General Study',
    intensity: intensity || 'normal', // low, normal, high
    focus: 100, // Will be calculated based on interruptions
    achievements: []
  };

  ST.sessions.push(session);
  updateDailyStats(duration);
  saveState();

  return session;
}

function updateDailyStats(addHours) {
  const today = new Date().toDateString();
  if (!ST.dailyStats) ST.dailyStats = {};

  if (!ST.dailyStats[today]) {
    ST.dailyStats[today] = { hours: 0, sessions: 0 };
  }

  ST.dailyStats[today].hours += addHours;
  ST.dailyStats[today].sessions += 1;

  // Check for streak
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  if (ST.dailyStats[yesterdayStr] && ST.dailyStats[yesterdayStr].hours > 0) {
    // Streak continues
  } else if (ST.dailyStats[today].sessions === 1) {
    // First session today - check if this breaks or continues streak
    ST.streak = (ST.streak || 0) + 1;
  }

  saveState();
}

// ── BROWSER NOTIFICATIONS ────────────────────────────────
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendDesktopNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      icon: '🎓',
      badge: '✨',
      ...options
    });
  }
}

// ── ANALYTICS CALCULATIONS ────────────────────────────────
function calculateStudyAnalytics() {
  if (!ST.dailyStats) return { weekHours: 0, weekSessions: 0 };

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    week.push(date.toDateString());
  }

  let weekHours = 0;
  let weekSessions = 0;

  week.forEach(day => {
    const data = ST.dailyStats[day];
    if (data) {
      weekHours += data.hours;
      weekSessions += data.sessions;
    }
  });

  return {
    weekHours: weekHours.toFixed(1),
    weekSessions: weekSessions,
    avgSession: weekSessions > 0 ? (weekHours / weekSessions).toFixed(1) : 0,
    bestDay: week.length > 0 ? week[0] : '—'
  };
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl shortcuts
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrl = isMac ? e.metaKey : e.ctrlKey;

    if (ctrl && e.key === 'k') { e.preventDefault(); openCmd(); }
    if (ctrl && e.key === ',') { e.preventDefault(); showPage('settings'); }
    if (ctrl && e.key === '1') { e.preventDefault(); showPage('home'); }
    if (ctrl && e.key === '2') { e.preventDefault(); showPage('timer'); }
    if (ctrl && e.key === '3') { e.preventDefault(); showPage('flashcards'); }
    if (ctrl && e.key === '4') { e.preventDefault(); showPage('notes'); }
    if (ctrl && e.key === '5') { e.preventDefault(); showPage('achievements'); }
    if (ctrl && e.key === '6') { e.preventDefault(); showPage('analytics'); }
    if (ctrl && e.key === '7') { e.preventDefault(); showPage('inspiration'); }
    
    // Escape to exit overlays
    if (e.key === 'Escape') {
      if ($('cmd-bg').classList.contains('open')) closeCmd();
      if ($('deck-modal').classList.contains('open')) closeDeckModal();
      if ($('focus-overlay').classList.contains('on')) exitFocusMode();
    }
  });

  requestNotificationPermission();
}

// Initialize on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupKeyboardShortcuts);
} else {
  setupKeyboardShortcuts();
}

// Auto-save every 30 seconds
setInterval(() => {
  if (document.hidden) return;
  saveState();
  showAutoSaveIndicator();
}, 30000);

// Update clock and affirmation daily
setInterval(updateClock, 1000);
setInterval(() => {
  if (new Date().getHours() === 0 && new Date().getMinutes() === 0) {
    displayDailyAffirmation();
  }
}, 60000);
