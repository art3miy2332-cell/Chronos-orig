
import { DatabaseService } from './db';
import { TaskStatus, Priority } from '../types';
import { ChatRepository } from '../data/repositories';

export const AIContextAggregator = {
    // Range: 'DAY' | 'WEEK' | 'MONTH' | 'ALL'
    gatherContext: (userId: string, range: 'DAY' | 'WEEK' | 'MONTH' | 'ALL' = 'ALL') => {
        const now = Date.now();
        let startTime = 0;
        
        switch (range) {
            case 'DAY': startTime = now - 86400000; break;
            case 'WEEK': startTime = now - 7 * 86400000; break;
            case 'MONTH': startTime = now - 30 * 86400000; break;
            case 'ALL': default: startTime = 0; break;
        }

        // 1. User Profile
        const users = DatabaseService.users.getAll();
        const user = users.find(u => u.id === userId);

        // 2. Tasks Summary
        const tasks = DatabaseService.tasks.getByUserId(userId);
        
        // Filter by range logic
        const createdInRange = tasks.filter(t => t.createdAt >= startTime);
        const doneInRange = tasks.filter(t => t.status === TaskStatus.DONE && t.doneAt && t.doneAt >= startTime);
        const activeTasks = tasks.filter(t => t.status !== TaskStatus.DONE);
        
        // Tags distribution
        const tagCounts: Record<string, number> = {};
        doneInRange.forEach(t => t.tags.forEach(tag => tagCounts[tag] = (tagCounts[tag] || 0) + 1));
        const topTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([tag, count]) => ({ tag, count }));

        // 3. Habits Summary
        const habits = DatabaseService.habits.getAll().filter(h => h.userId === userId);
        // Analyze habit performance in range
        const habitsPerformance = habits.map(h => {
            const hits = h.history.filter(ts => ts >= startTime).length;
            return { title: h.title, hits, streak: h.streak };
        });

        // 4. Sessions (Focus)
        const sessions = DatabaseService.sessions.getAll().filter(s => s.userId === userId);
        const sessionsInRange = sessions.filter(s => s.startTs >= startTime);
        const totalFocusMin = sessionsInRange.reduce((acc, s) => acc + s.durationMinutes, 0);

        // 5. Active Plans (New)
        // Get the most recent Weekly/Monthly plan to compare against
        const plans = DatabaseService.plans.getAll().filter(p => p.userId === userId);
        const entries = DatabaseService.planEntries.getAll().filter(e => plans.some(p => p.id === e.planId));
        
        // Structure plans for context
        const planContext = plans.map(p => {
            let structuredData = null;
            if (p.structureJson) {
                try {
                    structuredData = JSON.parse(p.structureJson);
                } catch(e) {
                    console.warn("Failed to parse plan structure", e);
                }
            }

            const pEntries = entries.filter(e => e.planId === p.id);
            return {
                type: p.type,
                title: p.title,
                structuredData: structuredData, // Pass the full JSON structure (Goals, KPIs, Focuses)
                completedItems: pEntries.filter(e => e.status === 'DONE').map(e => e.content),
                pendingItems: pEntries.filter(e => e.status === 'PENDING').map(e => e.content)
            };
        });

        // 6. Global Chat Memory (The "Brain")
        // Get last 40 messages from ALL threads to form short-term global memory
        const globalHistory = ChatRepository.getAllRecentMessages(userId, 40);

        return {
            userProfile: {
                id: user?.id,
                displayName: user?.displayName || 'User', // Added Name
                preferredLanguage: user?.preferredLanguage,
                aiTonePreference: user?.aiTonePreference,
                role: user?.role,
                // Inject Deep Coaching Data - FIX: Default to ANALYTICAL (Balanced) to avoid unwanted softness
                coachingProfile: user?.coachingProfile || {
                    mainGoal: 'Productivity',
                    biggestObstacle: 'Unknown',
                    productiveHours: 'MORNING',
                    motivationStyle: 'ANALYTICAL'
                }
            },
            period: range,
            tasksSummary: {
                created: createdInRange.length,
                completed: doneInRange.length,
                activeTotal: activeTasks.length,
                completionRate: (createdInRange.length + activeTasks.length) > 0 ? doneInRange.length / (createdInRange.length + activeTasks.length) : 0,
                topTags
            },
            habitsSummary: habitsPerformance,
            sessionsSummary: {
                totalSessions: sessionsInRange.length,
                totalFocusMin
            },
            plans: planContext,
            globalChatHistory: globalHistory, // Added Cross-Thread Context
            currentTimestamp: Date.now()
        };
    }
};
