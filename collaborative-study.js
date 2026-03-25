/* ============================================================================
   COLLABORATIVE STUDY SYSTEM
   ============================================================================
   Features:
   • Real-time collaborative sessions (WebRTC/WebSocket ready)
   • Study group management
   • Shared notes & flashcards
   • Progress tracking across groups
   • Synchronized study sessions
   • Peer accountability system
   • Study buddy matching
   ============================================================================ */

class CollaborativeStudy {
  constructor() {
    this.groups = new Map();
    this.sessions = new Map();
    this.peers = new Map();
    this.events = new Map();
    this.initEventSystem();
  }

  // ── EVENT SYSTEM ──────────────────────────────────────────
  initEventSystem() {
    this.eventEmitter = {
      listeners: {},
      on: (event, listener) => {
        if (!this.eventEmitter.listeners[event]) {
          this.eventEmitter.listeners[event] = [];
        }
        this.eventEmitter.listeners[event].push(listener);
      },
      off: (event, listener) => {
        if (!this.eventEmitter.listeners[event]) return;
        this.eventEmitter.listeners[event] = 
          this.eventEmitter.listeners[event].filter(l => l !== listener);
      },
      emit: (event, data) => {
        if (!this.eventEmitter.listeners[event]) return;
        this.eventEmitter.listeners[event].forEach(listener => listener(data));
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // STUDY GROUP MANAGEMENT
  // ══════════════════════════════════════════════════════════════════

  /**
   * Create a new study group
   */
  createStudyGroup(name, description = '', maxMembers = 10) {
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const group = {
      id: groupId,
      name,
      description,
      members: [{ id: this.getCurrentUserId(), role: 'admin', joinedAt: Date.now() }],
      maxMembers,
      createdAt: Date.now(),
      sharedResources: {
        notes: [],
        decks: [],
        sessions: []
      },
      settings: {
        isPrivate: true,
        allowInvitesOnly: false,
        defaultSession: '25/5' // Pomodoro
      },
      stats: {
        totalStudyTime: 0,
        totalSessions: 0,
        averageFocus: 0
      }
    };

    this.groups.set(groupId, group);
    this.eventEmitter.emit('group:created', group);
    return group;
  }

  /**
   * Invite member to group
   */
  inviteMemberToGroup(groupId, userEmail) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');

    if (group.members.length >= group.maxMembers) {
      throw new Error('Group is full');
    }

    const invitation = {
      id: `inv_${Date.now()}`,
      groupId,
      userEmail,
      status: 'pending',
      createdAt: Date.now(),
      invitedBy: this.getCurrentUserId()
    };

    if (!group.invitations) group.invitations = [];
    group.invitations.push(invitation);

    // In real app, send notification email
    this.eventEmitter.emit('invitation:sent', invitation);
    return invitation;
  }

  /**
   * Accept group invitation
   */
  acceptGroupInvitation(invitationId) {
    for (const group of this.groups.values()) {
      const invitation = group.invitations?.find(i => i.id === invitationId);
      if (invitation) {
        const member = {
          id: this.getCurrentUserId(),
          email: invitation.userEmail,
          role: 'member',
          joinedAt: Date.now()
        };
        group.members.push(member);
        invitation.status = 'accepted';

        this.eventEmitter.emit('member:joined', { group: group.id, member });
        return group;
      }
    }
  }

  /**
   * Leave study group
   */
  leaveStudyGroup(groupId) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');

    const userId = this.getCurrentUserId();
    group.members = group.members.filter(m => m.id !== userId);

    this.eventEmitter.emit('member:left', { groupId, userId });
    return true;
  }

  /**
   * Get group progress summary
   */
  getGroupProgress(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return null;

    const memberData = [];
    let totalFocus = 0;
    let totalTime = 0;

    // Single pass through members (optimized)
    for (const member of group.members) {
      const stats = this.getMemberStats(member.id);
      memberData.push({
        userId: member.id,
        role: member.role,
        joinedAt: member.joinedAt,
        stats
      });
      totalFocus += stats.focusScore || 0;
      totalTime += stats.totalMinutes || 0;
    }

    const avgFocus = totalFocus / Math.max(memberData.length, 1);

    return {
      groupId,
      memberCount: group.members.length,
      members: memberData,
      aggregatedStats: {
        averageFocus: Math.round(avgFocus),
        totalStudyTime: Math.round(totalTime),
        totalSessions: group.stats.totalSessions,
        groupStreak: this.calculateGroupStreak(groupId)
      }
    };
  }

  // ══════════════════════════════════════════════════════════════════
  // SHARED RESOURCES
  // ══════════════════════════════════════════════════════════════════

  /**
   * Share note with group
   */
  shareNoteWithGroup(groupId, noteId, noteData) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');

    const sharedNote = {
      id: `shared_${noteId}`,
      originalId: noteId,
      title: noteData.title,
      content: noteData.content,
      owner: this.getCurrentUserId(),
      sharedAt: Date.now(),
      editable: noteData.editable ?? true,
      contributors: [this.getCurrentUserId()]
    };

    group.sharedResources.notes.push(sharedNote);
    this.eventEmitter.emit('resource:shared', { groupId, type: 'note', resource: sharedNote });
    return sharedNote;
  }

  /**
   * Share flashcard deck with group
   */
  shareDeckWithGroup(groupId, deckId, deckData) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');

    const sharedDeck = {
      id: `shared_${deckId}`,
      originalId: deckId,
      name: deckData.name,
      cardCount: deckData.cards?.length || 0,
      owner: this.getCurrentUserId(),
      sharedAt: Date.now(),
      collaborative: true,
      progress: {
        completed: 0,
        inProgress: 0,
        notStarted: deckData.cards?.length || 0
      }
    };

    group.sharedResources.decks.push(sharedDeck);
    this.eventEmitter.emit('resource:shared', { groupId, type: 'deck', resource: sharedDeck });
    return sharedDeck;
  }

  // ══════════════════════════════════════════════════════════════════
  // COLLABORATIVE SESSIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Start collaborative study session
   */
  startCollaborativeSession(groupId, sessionConfig) {
    const group = this.groups.get(groupId);
    if (!group) throw new Error('Group not found');

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      groupId,
      startedAt: Date.now(),
      startedBy: this.getCurrentUserId(),
      participants: [this.getCurrentUserId()],
      duration: sessionConfig.duration || 25,
      deckId: sessionConfig.deckId,
      type: sessionConfig.type || 'synchronized', // 'synchronized' or 'independent'
      state: 'active',
      synchronization: {
        enabled: true,
        participants: {},
        progress: {}
      },
      metrics: {
        totalFocus: 0,
        averageAccuracy: 0,
        challengesSolved: []
      }
    };

    this.sessions.set(sessionId, session);
    group.sharedResources.sessions.push(sessionId);
    this.eventEmitter.emit('session:started', session);
    return session;
  }

  /**
   * Join collaborative session
   */
  joinCollaborativeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    if (session.state !== 'active') throw new Error('Session is not active');

    const userId = this.getCurrentUserId();
    if (!session.participants.includes(userId)) {
      session.participants.push(userId);
      session.synchronization.participants[userId] = {
        joinedAt: Date.now(),
        progress: 0,
        focusScore: 0
      };

      this.eventEmitter.emit('participant:joined', { sessionId, userId });
    }

    return session;
  }

  /**
   * Update session progress (synchronized)
   */
  updateSessionProgress(sessionId, userId, progress) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (session.synchronization.enabled) {
      session.synchronization.participants[userId] = progress;
      session.synchronization.progress[userId] = {
        updated: Date.now(),
        ...progress
      };

      this.eventEmitter.emit('progress:updated', { sessionId, userId, progress });
    }
  }

  /**
   * End collaborative session
   */
  endCollaborativeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.state = 'completed';
    session.endedAt = Date.now();
    session.duration = (session.endedAt - session.startedAt) / 60000; // minutes

    // Calculate session stats
    const stats = this.calculateSessionStats(session);
    session.finalStats = stats;

    this.eventEmitter.emit('session:ended', { sessionId, stats });
    return session;
  }

  /**
   * Calculate session statistics
   */
  calculateSessionStats(session) {
    const participants = Object.entries(session.synchronization.participants);
    const avgFocus = participants.length > 0 ?
      participants.reduce((sum, [_, p]) => sum + (p.focusScore || 0), 0) / participants.length : 0;

    return {
      totalParticipants: session.participants.length,
      sessionDuration: session.duration,
      averageFocus: Math.round(avgFocus),
      completionRate: Math.round(
        participants.reduce((sum, [_, p]) => sum + (p.progress || 0), 0) / 
        Math.max(participants.length * 100, 1) * 100
      ),
      engagementScore: this.calculateEngagementScore(session)
    };
  }

  calculateEngagementScore(session) {
    const participants = session.participants.length;
    const duration = session.duration || 1;
    const activeParticipants = Object.keys(session.synchronization.participants).length;
    
    return Math.round((activeParticipants / Math.max(participants, 1)) * 100);
  }

  // ══════════════════════════════════════════════════════════════════
  // STUDY BUDDY SYSTEM
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get study buddy recommendations based on compatibility
   */
  getStudyBuddyRecommendations() {
    const currentUser = this.getCurrentUser();
    const recommendations = [];

    ST.users?.forEach((user) => {
      if (user.id === currentUser.id) return;

      const compatibility = this.calculateCompatibility(currentUser, user);
      
      if (compatibility.score > 60) {
        recommendations.push({
          userId: user.id,
          name: user.name,
          compatibilityScore: compatibility.score,
          reasons: compatibility.reasons,
          commonInterests: compatibility.subjects
        });
      }
    });

    return recommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore).slice(0, 5);
  }

  /**
   * Calculate compatibility between users
   */
  calculateCompatibility(user1, user2) {
    let score = 0;
    const reasons = [];
    const subjects = [];

    // Check study time alignment
    const user1Peak = naszyAI?.patterns?.peakHours || [];
    const user2Peak = naszyAI?.patterns?.peakHours || [];
    const commonHours = user1Peak.filter((_, i) => user2Peak[i] === user1Peak[i]).length;
    if (commonHours > 4) {
      score += 25;
      reasons.push('Similar peak study hours');
    }

    // Check common subjects
    const user1Subjects = Object.keys(user1.subjectAffinities || {});
    const user2Subjects = Object.keys(user2.subjectAffinities || {});
    const commonSubjects = user1Subjects.filter(s => user2Subjects.includes(s));
    if (commonSubjects.length > 0) {
      score += Math.min(commonSubjects.length * 10, 30);
      reasons.push(`Common interests: ${commonSubjects.join(', ')}`);
      subjects.push(...commonSubjects);
    }

    // Check study streak similarity
    const streakDiff = Math.abs((user1.streak || 0) - (user2.streak || 0));
    if (streakDiff < 5) {
      score += 20;
      reasons.push('Similar commitment level');
    }

    // Check focus score
    const focusDiff = Math.abs((user1.focusScore || 0) - (user2.focusScore || 0));
    if (focusDiff < 20) {
      score += 15;
      reasons.push('Similar focus patterns');
    }

    return { score: Math.min(score, 100), reasons, subjects };
  }

  /**
   * Request study buddy partnership
   */
  requestStudyBuddy(partnerId) {
    const request = {
      id: `buddy_${Date.now()}`,
      fromUserId: this.getCurrentUserId(),
      toUserId: partnerId,
      status: 'pending',
      createdAt: Date.now()
    };

    if (!this.peers.has(partnerId)) {
      this.peers.set(partnerId, []);
    }
    this.peers.get(partnerId).push(request);

    this.eventEmitter.emit('buddy:requested', request);
    return request;
  }

  /**
   * Accept buddy partnership
   */
  acceptStudyBuddy(requestId) {
    for (const requests of this.peers.values()) {
      const request = requests.find(r => r.id === requestId);
      if (request) {
        request.status = 'accepted';
        request.acceptedAt = Date.now();

        // Create buddy pair
        const buddyPair = {
          id: `pair_${Date.now()}`,
          user1: request.fromUserId,
          user2: request.toUserId,
          createdAt: Date.now(),
          metrics: {
            sharedSessions: 0,
            averageEngagement: 0,
            successRate: 0
          }
        };

        this.eventEmitter.emit('buddy:accepted', { request, pair: buddyPair });
        return buddyPair;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ══════════════════════════════════════════════════════════════════

  /**
   * Get member statistics
   */
  getMemberStats(userId) {
    // This would fetch from ST or database
    return {
      focusScore: 65,
      totalMinutes: 450,
      sessionsCompleted: 18
    };
  }

  /**
   * Calculate group streak
   */
  calculateGroupStreak(groupId) {
    const group = this.groups.get(groupId);
    if (!group) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if group had activity today and yesterday, etc.
    for (let i = 0; i < 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      
      const hasActivity = group.sharedResources.sessions?.some(sessionId => {
        const session = this.sessions.get(sessionId);
        return session && new Date(session.startedAt).toDateString() === checkDate.toDateString();
      });

      if (hasActivity) streak++;
      else break;
    }

    return streak;
  }

  /**
   * Get current user ID (mock)
   */
  getCurrentUserId() {
    return ST?.currentUserId || 'user_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get current user (mock)
   */
  getCurrentUser() {
    return {
      id: this.getCurrentUserId(),
      name: 'Current User',
      focusScore: ST?.focusScore || 50,
      streak: ST?.streak || 0,
      subjectAffinities: naszyAI?.patterns?.subjectAffinities || {}
    };
  }

  /**
   * Get all user groups
   */
  getUserGroups() {
    const userId = this.getCurrentUserId();
    return Array.from(this.groups.values()).filter(g =>
      g.members.some(m => m.id === userId)
    );
  }

  /**
   * Get user's active sessions
   */
  getUserSessions() {
    const userId = this.getCurrentUserId();
    return Array.from(this.sessions.values()).filter(s =>
      s.participants.includes(userId) && s.state === 'active'
    );
  }

  /**
   * Get collaboration statistics
   */
  getCollaborationStats() {
    return {
      totalGroups: this.groups.size,
      activeSessions: Array.from(this.sessions.values()).filter(s => s.state === 'active').length,
      totalParticipants: new Set(Array.from(this.sessions.values()).flatMap(s => s.participants)).size,
      totalStudyTime: Array.from(this.sessions.values())
        .filter(s => s.state === 'completed')
        .reduce((sum, s) => sum + (s.duration || 0), 0)
    };
  }
}

// Global instance
const collaboration = new CollaborativeStudy();

// Export for use
window.collaboration = collaboration;
