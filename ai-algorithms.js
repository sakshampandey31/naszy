/* ============================================================================
   NASZY AI ALGORITHMS & MACHINE LEARNING CORE
   ============================================================================
   Advanced Features:
   • Predictive Study Optimization (when & what to study)
   • Smart Content Recommendations
   • Anomaly Detection & Pattern Recognition
   • Adaptive Difficulty Adjustment
   • Intelligent Spaced Repetition v2
   • Success Prediction Model
   • Study Session Replay & Analysis
   ============================================================================ */

class NaszyAI {
  constructor() {
    this.modelCache = new Map();
    this.predictions = {};
    this.patterns = {};
    this.anomalies = [];
    this.memoCache = new Map(); // Memoization cache
    this.lastUpdateTime = 0;
    this.initModels();
  }

  // ── MEMOIZATION HELPER ──────────────────────────────────────────
  memoize(fn, key, ttl = 300000) { // 5 min default TTL
    if (this.memoCache.has(key)) {
      const cached = this.memoCache.get(key);
      if (Date.now() - cached.time < ttl) {
        return cached.value;
      }
    }
    const result = fn();
    this.memoCache.set(key, { value: result, time: Date.now() });
    return result;
  }

  // ── INITIALIZATION ──────────────────────────────────────────────
  initModels() {
    this.lastUpdateTime = Date.now();
    this.patterns = {
      peakHours: this.detectPeakStudyHours(),
      dayPatterns: this.analyzeDayPatterns(),
      focusDuration: this.calculateOptimalFocusDuration(),
      subjectAffinities: this.computeSubjectAffinities()
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1: PREDICTIVE STUDY OPTIMIZATION
  // ══════════════════════════════════════════════════════════════════

  /**
   * Predicts the best time to study based on historical data
   * Uses time-series analysis to find optimal study windows
   */
  predictOptimalStudyTime() {
    return this.memoize(() => {
      const dailyStats = ST?.dailyStats || {};
      
      // Early return if insufficient data
      if (Object.keys(dailyStats).length < 3) {
        return {
          optimal: [],
          current: new Date().getHours(),
          recommendation: 14,
          confidence: 0
        };
      }

      const hourlyPerformance = {};
      
      // Build hourly performance matrix (optimized loop)
      for (const dayData of Object.values(dailyStats)) {
        if (!dayData.date) continue;
        const hour = new Date(dayData.date).getHours();
        if (!hourlyPerformance[hour]) {
          hourlyPerformance[hour] = { sessions: 0, focus: 0, retention: 0 };
        }
        hourlyPerformance[hour].sessions += dayData.sessions || 0;
        hourlyPerformance[hour].focus += dayData.focusScore || 0;
        hourlyPerformance[hour].retention += dayData.cardsCompleted || 0;
      }

      // Calculate weighted score and sort in one pass
      const scores = Object.entries(hourlyPerformance)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          score: (data.sessions * 0.3 + data.focus * 0.4 + data.retention * 0.3) * 100,
          frequency: data.sessions
        }))
        .sort((a, b) => b.score - a.score);

      return {
        optimal: scores.slice(0, 3),
        current: new Date().getHours(),
        recommendation: scores.length > 0 ? scores[0].hour : 14,
        confidence: Math.min(100, (scores[0]?.frequency || 0) * 10)
      };
    }, 'optimalStudyTime', 600000); // 10 min cache
  }

  /**
   * Detects peak study hours from historical data using moving average
   */
  detectPeakStudyHours() {
    return this.memoize(() => {
      const dailyStats = ST?.dailyStats || {};
      const hours = Array(24).fill(0);

      // Single pass through data (optimized)
      for (const data of Object.values(dailyStats)) {
        if (data.sessions && data.sessions > 0) {
          const hour = new Date(data.date).getHours();
          hours[hour] += data.sessions * ((data.focusScore || 50) / 100);
        }
      }

      // Apply moving average smoothing (window size 3)
      return hours.map((h, i) => {
        const prev = hours[i - 1] || 0;
        const next = hours[i + 1] || 0;
        return (prev + h + next) / 3;
      });
    }, 'peakStudyHours', 600000);
  }

  /**
   * Analyzes day-of-week patterns
   */
  analyzeDayPatterns() {
    const dailyStats = ST?.dailyStats || {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStats = Array(7).fill(null).map(() => ({ sessions: 0, focus: 0, streak: 0 }));

    Object.entries(dailyStats).forEach(([dateStr, data]) => {
      const dayOfWeek = new Date(dateStr).getDay();
      dayStats[dayOfWeek].sessions += data.sessions || 0;
      dayStats[dayOfWeek].focus += data.focusScore || 0;
    });

    return days.map((day, i) => ({
      day,
      avgSessions: dayStats[i].sessions / 4, // Rough estimate per week
      avgFocus: dayStats[i].focus / 4,
      recommendation: dayStats[i].sessions > 1 ? 'High productivity' : 'Low productivity'
    }));
  }

  /**
   * Calculates optimal focus session duration based on performance
   */
  calculateOptimalFocusDuration() {
    const dailyStats = ST?.dailyStats || {};
    const durations = { short: 0, medium: 0, long: 0 };
    const retention = { short: 0, medium: 0, long: 0 };

    Object.values(dailyStats).forEach(data => {
      const avgDuration = (data.totalMinutes || 0) / Math.max(data.sessions || 1, 1);
      
      if (avgDuration < 20) {
        durations.short += 1;
        retention.short += data.cardsCompleted || 0;
      } else if (avgDuration < 40) {
        durations.medium += 1;
        retention.medium += data.cardsCompleted || 0;
      } else {
        durations.long += 1;
        retention.long += data.cardsCompleted || 0;
      }
    });

    const scores = {
      short: durations.short > 0 ? retention.short / durations.short : 0,
      medium: durations.medium > 0 ? retention.medium / durations.medium : 0,
      long: durations.long > 0 ? retention.long / durations.long : 0
    };

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { optimal: best[0], scores };
  }

  /**
   * Predicts success probability for upcoming study session
   * Uses weather-like scoring system (0-100%)
   */
  predictSessionSuccess() {
    const optimalTime = this.predictOptimalStudyTime();
    const currentHour = new Date().getHours();
    const streak = ST?.streak || 0;
    const focusScore = ST?.focusScore || 50;
    
    // Calculate factors
    const timeAlignment = 100 * Math.max(0, 1 - Math.abs(optimalTime.recommendation - currentHour) / 12);
    const streakBonus = Math.min(50, streak * 5);
    const focusBonus = focusScore;
    const dayOfWeek = new Date().getDay();
    const dayPattern = this.patterns.dayPatterns[dayOfWeek];
    const dayBonus = (dayPattern?.avgFocus || 50) * 0.5;

    const probability = Math.min(100,
      (timeAlignment * 0.3 + streakBonus * 0.2 + focusBonus * 0.25 + dayBonus * 0.25)
    );

    return {
      probability: Math.round(probability),
      factors: {
        time: Math.round(timeAlignment),
        streak: Math.round(streakBonus),
        focus: Math.round(focusBonus),
        dayPattern: Math.round(dayBonus)
      },
      recommendation: probability > 70 ? '✨ Perfect time to study!' : 
                     probability > 50 ? '👍 Good time to study' :
                     '💪 Take it slowly today'
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2: SMART CONTENT RECOMMENDATION ENGINE
  // ══════════════════════════════════════════════════════════════════

  /**
   * Recommends next topic/subject to study based on performance
   */
  recommendNextStudyTopic() {
    return this.memoize(() => {
      const decks = ST?.decks || {};
      const recommendations = [];

      // Single pass with memoized difficulty calculation
      for (const [deckId, deck] of Object.entries(decks)) {
        const cards = deck.cards || [];
        let dueCardCount = 0;
        
        // Optimized: count due cards without creating filter array
        for (const card of cards) {
          if (this.getSmartCardDifficulty(card).isDue) {
            dueCardCount++;
          }
        }

        const completionRate = deck.cardsCompleted ? 
          (deck.cardsCompleted / Math.max(cards.length, 1)) * 100 : 0;

        const priority = (dueCardCount * 0.5) + (100 - Math.min(100, completionRate)) * 0.3;
        
        recommendations.push({
          deckId,
          name: deck.name,
          dueCards: dueCardCount,
          completionRate: Math.round(completionRate),
          priority: Math.round(priority),
          reason: dueCardCount > 5 ? 'Many cards due' : 
                 completionRate < 30 ? 'Progress behind' : 'Review recommended'
        });
      }

      return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 3);
    }, 'studyTopics', 900000); // 15 min cache
  }

  /**
   * Computes subject affinities - which topics the user excels at
   */
  computeSubjectAffinities() {
    const decks = ST?.decks || {};
    const affinities = {};

    Object.entries(decks).forEach(([deckId, deck]) => {
      const cards = deck.cards || [];
      const correctCount = cards.filter(c => c.lastDifficulty === 'easy').length;
      const successRate = (correctCount / Math.max(cards.length, 1)) * 100;

      affinities[deck.name] = {
        strength: Math.round(successRate),
        totalCards: cards.length,
        reviews: cards.filter(c => c.lastReviewed).length,
        skillLevel: successRate > 80 ? 'Expert' :
                   successRate > 60 ? 'Proficient' :
                   successRate > 40 ? 'Learning' : 'Beginner'
      };
    });

    return affinities;
  }

  /**
   * Get personalized learning path recommendations
   */
  generateLearningPath() {
    return this.memoize(() => {
      const recommendations = this.recommendNextStudyTopic();
      const affinities = this.computeSubjectAffinities();
      const optimalTime = this.predictOptimalStudyTime();

      // Pre-filter weak and strong areas (more efficient)
      const weakAreas = [];
      const strongAreas = [];
      
      for (const [subject, data] of Object.entries(affinities)) {
        const entry = { subject, ...data };
        if (data.skillLevel === 'Beginner') weakAreas.push(entry);
        if (data.skillLevel === 'Expert') strongAreas.push(entry);
      }

      return {
        immediate: recommendations[0],
        shortTerm: recommendations.slice(1, 3),
        weakAreas,
        strongAreas,
        nextSessionTime: optimalTime.recommendation,
        estimatedDailyGoal: Math.round((recommendations[0]?.dueCards || 20) / 5 * 25) + ' min'
      };
    }, 'learningPath', 1800000); // 30 min cache (time-dependent recommendations)
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3: INTELLIGENT SPACED REPETITION v2
  // ══════════════════════════════════════════════════════════════════

  /**
   * Advanced spaced repetition with SM-2 algorithm hybrid
   * Combines Leitner + SuperMemo for optimal retention
   */
  getSmartCardDifficulty(card) {
    const now = Date.now();
    const lastReview = card.lastReviewed || 0;
    const difficulty = card.lastDifficulty || 'ok';
    
    // Calculate ease factor (SM-2 style)
    let easeFactor = card.easeFactor || 2.5;
    
    if (difficulty === 'hard') {
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    } else if (difficulty === 'ok') {
      easeFactor = easeFactor;
    } else if (difficulty === 'easy') {
      easeFactor = Math.min(2.5, easeFactor + 0.1);
    }

    // Calculate interval
    const previousInterval = card.interval || 1;
    let nextInterval = 1;
    
    if (card.repetitions === undefined || card.repetitions === 0) {
      nextInterval = 1;
    } else if (card.repetitions === 1) {
      nextInterval = 3;
    } else {
      nextInterval = Math.round(previousInterval * easeFactor);
    }

    // Calculate next review date
    const nextReviewDate = new Date(lastReview);
    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

    return {
      box: card.box || 0,
      interval: nextInterval,
      easeFactor: Math.round(easeFactor * 100) / 100,
      nextReviewDate,
      daysUntilReview: Math.ceil((nextReviewDate - now) / (1000 * 60 * 60 * 24)),
      isDue: now > nextReviewDate,
      priority: this.calculateCardPriority(card, nextReviewDate, now),
      confidence: Math.min(100, (card.repetitions || 1) * 25)
    };
  }

  calculateCardPriority(card, nextReview, now) {
    const daysOverdue = (now - nextReview) / (1000 * 60 * 60 * 24);
    const baseScore = Math.max(0, daysOverdue * 20);
    const difficultyMultiplier = card.lastDifficulty === 'hard' ? 1.5 : 1;
    return Math.round(baseScore * difficultyMultiplier);
  }

  /**
   * Smart card update following SM-2 algorithm
   */
  updateSmartCard(card, difficulty) {
    const now = Date.now();
    
    // Initialize if needed
    if (card.repetitions === undefined) {
      card.repetitions = 0;
      card.easeFactor = 2.5;
      card.interval = 1;
    }

    if (difficulty === 'hard') {
      card.repetitions = 0;
      card.easeFactor = Math.max(1.3, card.easeFactor - 0.2);
    } else if (difficulty === 'ok' || difficulty === 'medium') {
      card.repetitions += 0.5;
      // easeFactor stays same
    } else if (difficulty === 'easy') {
      card.repetitions += 1;
      card.easeFactor = Math.min(2.5, card.easeFactor + 0.1);
    }

    // Update interval
    let nextInterval = 1;
    if (card.repetitions < 1) {
      nextInterval = 1;
    } else if (card.repetitions < 2) {
      nextInterval = 3;
    } else {
      nextInterval = Math.round(card.interval * card.easeFactor);
    }

    card.interval = nextInterval;
    card.lastReviewed = now;
    card.lastDifficulty = difficulty;
    card.box = Math.floor(Math.log2(Math.max(card.interval, 1)) + 1);

    return card;
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 4: ANOMALY DETECTION & PATTERN RECOGNITION
  // ══════════════════════════════════════════════════════════════════

  /**
   * Detects unusual patterns in study behavior
   */
  detectAnomalies() {
    return this.memoize(() => {
      const dailyStats = ST?.dailyStats || {};
      const stats = Object.values(dailyStats).slice(-30); // Last 30 days
      
      if (stats.length < 7) return { anomalies: [], status: 'insufficient_data' };

      const avgSessions = stats.reduce((sum, s) => sum + (s.sessions || 0), 0) / stats.length;
      const avgHours = stats.reduce((sum, s) => sum + (s.hours || 0), 0) / stats.length;
      const stdDevSessions = this.calculateStdDev(stats.map(s => s.sessions || 0));
      
      const anomalies = [];
      const threshold = 2; // Z-score threshold

      // Single pass detection (more efficient)
      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        const zScoreSessions = (stat.sessions - avgSessions) / Math.max(stdDevSessions, 1);
        
        if (Math.abs(zScoreSessions) > threshold) {
          anomalies.push({
            date: stat.date,
            type: zScoreSessions > 0 ? 'overperformance' : 'underperformance',
            severity: Math.round(Math.abs(zScoreSessions) * 10),
            sessions: stat.sessions,
            avgExpected: Math.round(avgSessions),
            reason: zScoreSessions > 0 ? '🚀 Exceptional session!' : '😴 Less active than usual'
          });
        }
      }

      return {
        anomalies,
        avgSessions: Math.round(avgSessions * 10) / 10,
        avgHours: Math.round(avgHours * 10) / 10,
        trend: this.calculateTrend(stats.map(s => s.sessions || 0)),
        consistency: 100 - Math.min(100, (stdDevSessions / Math.max(avgSessions, 1)) * 50)
      };
    }, 'anomalies', 300000); // 5 min cache (time-sensitive data)
  }

  calculateStdDev(values) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  calculateTrend(values) {
    if (values.length < 2) return 'neutral';
    const first = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(values.length / 2);
    const last = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(values.length / 2);
    
    const change = ((last - first) / Math.max(first, 1)) * 100;
    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5: ADAPTIVE DIFFICULTY ADJUSTMENT
  // ══════════════════════════════════════════════════════════════════

  /**
   * Adjusts deck difficulty based on user performance
   */
  suggestDifficultyAdjustment(deckId) {
    const deck = ST?.decks?.[deckId];
    if (!deck) return null;

    const cards = deck.cards || [];
    const easyCount = cards.filter(c => c.lastDifficulty === 'easy').length;
    const hardCount = cards.filter(c => c.lastDifficulty === 'hard').length;
    const totalReviewed = cards.filter(c => c.lastReviewed).length;

    if (totalReviewed < 10) return { suggestion: 'Need more data', difficulty: 'current' };

    const easyRate = easyCount / totalReviewed;
    const hardRate = hardCount / totalReviewed;

    let suggestion = 'current';
    if (easyRate > 0.7) {
      suggestion = 'increase';  // Material too easy
    } else if (hardRate > 0.5) {
      suggestion = 'decrease';  // Material too hard
    }

    return {
      suggestion,
      easyRate: Math.round(easyRate * 100),
      hardRate: Math.round(hardRate * 100),
      recommendation: suggestion === 'increase' ? 
        'Consider more challenging material' : 
        suggestion === 'decrease' ? 
        'Break content into smaller sections' : 
        'Difficulty is well-balanced'
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 6: SUCCESS PREDICTION & SESSION ANALYTICS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Predicts success for specific card based on historical performance
   */
  predictCardSuccess(card) {
    const reviews = card.repetitions || 0;
    const easeFactor = card.easeFactor || 2.5;
    const consistency = card.lastDifficulty === 'easy' ? 0.9 : 
                      card.lastDifficulty === 'ok' ? 0.5 : 0.2;

    const successProbability = Math.min(0.95,
      (reviews / 10) * 0.3 +
      ((easeFactor - 1.3) / 1.2) * 0.4 +
      consistency * 0.3
    );

    return {
      probability: Math.round(successProbability * 100),
      confidence: Math.min(100, reviews * 10),
      level: successProbability > 0.7 ? 'High' : 
             successProbability > 0.4 ? 'Medium' : 'Low'
    };
  }

  /**
   * Analyzes session quality and provides insights
   */
  analyzeSessionQuality(sessionData) {
    const {
      duration,
      cardsCompleted,
      correctCount,
      avgResponseTime,
      focusLevel
    } = sessionData;

    const accuracy = (correctCount / Math.max(cardsCompleted, 1)) * 100;
    const cardsPerMinute = cardsCompleted / Math.max(duration / 60, 1);
    const efficiency = cardsPerMinute * (accuracy / 100);

    return {
      accuracy: Math.round(accuracy),
      cardsPerMinute: Math.round(cardsPerMinute * 10) / 10,
      efficiency: Math.round(efficiency * 10) / 10,
      avgResponseTime: Math.round(avgResponseTime),
      qualityScore: Math.round(
        efficiency * 20 +
        (accuracy / 5) +
        (100 - Math.min(100, avgResponseTime / 100)) * 0.2
      ),
      grade: efficiency > 5 ? 'S' : efficiency > 3 ? 'A' : efficiency > 1.5 ? 'B' : 'C',
      insights: [
        accuracy > 80 ? '✨ High accuracy' : '📚 Keep practicing',
        cardsPerMinute > 3 ? '⚡ Fast pace' : '🎯 Steady pace',
        focusLevel > 0.8 ? '🎯 Great focus' : '💭 Take breaks'
      ]
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 7: UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Generate comprehensive study insights
   */
  generateStudyInsights() {
    const anomalies = this.detectAnomalies();
    const learning = this.generateLearningPath();
    const sessionSuccess = this.predictSessionSuccess();
    const recommendations = this.recommendNextStudyTopic();

    return {
      session: sessionSuccess,
      learningPath: learning,
      recommendations,
      anomalies: anomalies.anomalies.slice(0, 3),
      trend: anomalies.trend,
      consistency: Math.round(anomalies.consistency),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Export AI model state for persistence
   */
  serialize() {
    return {
      patterns: this.patterns,
      predictions: this.predictions,
      anomalies: this.anomalies
    };
  }

  /**
   * Import AI model state
   */
  deserialize(data) {
    if (data?.patterns) this.patterns = data.patterns;
    if (data?.predictions) this.predictions = data.predictions;
    if (data?.anomalies) this.anomalies = data.anomalies;
  }
}

// Global instance
const naszyAI = new NaszyAI();

// Helper function for UI integration
function getAIRecommendations() {
  return {
    studyTime: naszyAI.predictOptimalStudyTime(),
    learningPath: naszyAI.generateLearningPath(),
    sessionSuccess: naszyAI.predictSessionSuccess(),
    insights: naszyAI.generateStudyInsights()
  };
}
