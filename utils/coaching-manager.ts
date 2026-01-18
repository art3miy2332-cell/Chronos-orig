
import { AuthService } from './auth';
import { UserEntity, DailyInsight, WeeklyInsight, MonthlyInsight, ChatMessage, Priority, EnergyLevel, TaskStatus, PlanType } from '../types';
import { AIContextAggregator } from './ai-context';
import { AISimulator } from './ai-simulator';
import { ChatRepository, TaskRepository, PlanRepository } from '../data/repositories';
import { UseCases } from '../domain/usecases';

export const CoachingManager = {
    
    // Check if any reviews are due based on user timestamps
    checkPendingReviews: (user: UserEntity) => {
        const now = Date.now();
        const pending = {
            daily: false,
            weekly: false,
            monthly: false
        };

        // 1. Daily: Due if last review was before today's 6 PM and it is currently past 6 PM
        const lastDaily = user.lastDailyReview || 0;
        const hoursSinceLastDaily = (now - lastDaily) / 3600000;
        const currentHour = new Date().getHours();
        
        if (hoursSinceLastDaily > 20 && currentHour >= 18) {
            pending.daily = true;
        }

        // 2. Weekly: Trigger ONLY at the end of a weekly plan (User Request)
        const lastWeekly = user.lastWeeklyReview || 0;
        const planResWeekly = PlanRepository.getLastActivePlan(user.id, PlanType.WEEKLY);
        
        if (planResWeekly.success && planResWeekly.data) {
            const plan = planResWeekly.data.plan;
            const planEnd = plan.periodEnd;
            
            // Trigger if the plan has ended
            const isPlanConcluding = now >= planEnd;
            // Ensure we haven't reviewed THIS specific plan cycle yet
            const isAlreadyReviewed = lastWeekly >= plan.periodStart;

            if (isPlanConcluding && !isAlreadyReviewed) {
                pending.weekly = true;
            }
        }

        // 3. Monthly: Trigger ONLY at the end of a monthly plan
        const lastMonthly = user.lastMonthlyReview || 0;
        const planResMonthly = PlanRepository.getLastActivePlan(user.id, PlanType.MONTHLY);
        
        if (planResMonthly.success && planResMonthly.data) {
            const plan = planResMonthly.data.plan;
            const planEnd = plan.periodEnd;
            // Trigger on the last day of the plan or if the plan has already ended
            const isPlanConcluding = now >= (planEnd - 24 * 3600000);
            // Ensure we haven't reviewed THIS specific plan cycle yet
            const isAlreadyReviewed = lastMonthly >= plan.periodStart;

            if (isPlanConcluding && !isAlreadyReviewed) {
                pending.monthly = true;
            }
        }
        
        // Priority: Monthly > Weekly > Daily (Don't spam all at once)
        if (pending.monthly) return 'MONTHLY';
        if (pending.weekly) return 'WEEKLY';
        if (pending.daily) return 'DAILY';
        
        return null;
    },

    // Generators
    generateDailyReview: async (userId: string): Promise<DailyInsight> => {
        const context = AIContextAggregator.gatherContext(userId, 'DAY');
        const aiResponse = await AISimulator.generateResponse("GENERATE_DAILY_REVIEW", context);
        try {
            const raw = JSON.parse(aiResponse.suggestionPayload || '{}');
            return {
                summary: raw.summary || "Review generated.",
                wins: Array.isArray(raw.wins) ? raw.wins : [],
                leaks: Array.isArray(raw.leaks) ? raw.leaks : [],
                ritual: raw.ritual || "Plan your tomorrow.",
                score: typeof raw.score === 'number' ? raw.score : 0,
                planForTomorrow: Array.isArray(raw.planForTomorrow) ? raw.planForTomorrow : []
            };
        } catch (e) {
            console.error("Failed to parse Daily Review", e);
            return { summary: "Error generating review.", wins: [], leaks: [], ritual: "", score: 0, planForTomorrow: [] };
        }
    },

    generateWeeklyReview: async (userId: string): Promise<WeeklyInsight> => {
        const context = AIContextAggregator.gatherContext(userId, 'WEEK');
        const aiResponse = await AISimulator.generateResponse("GENERATE_WEEKLY_REVIEW", context);
        try {
            const raw = JSON.parse(aiResponse.suggestionPayload || '{}');
            return {
                summary: raw.summary || "Weekly review generated.",
                results: Array.isArray(raw.results) ? raw.results : [],
                kpi: raw.kpi || { completionRate: 0, focusHours: 0, habitConsistency: 0 },
                wins: Array.isArray(raw.wins) ? raw.wins : [],
                leaks: Array.isArray(raw.leaks) ? raw.leaks : [],
                whatToDrop: Array.isArray(raw.whatToDrop) ? raw.whatToDrop : [],
                whatToAmplify: Array.isArray(raw.whatToAmplify) ? raw.whatToAmplify : [],
                nextWeekGoal: raw.nextWeekGoal || "Focus on consistency.",
                nextWeekFocuses: Array.isArray(raw.nextWeekFocuses) ? raw.nextWeekFocuses : [],
                checkpoints: Array.isArray(raw.checkpoints) ? raw.checkpoints : []
            };
        } catch (e) {
            return { 
                summary: "Error.", 
                results: [], 
                kpi: { completionRate: 0, focusHours: 0, habitConsistency: 0 }, 
                wins: [], 
                leaks: [], 
                whatToDrop: [], 
                whatToAmplify: [], 
                nextWeekGoal: "", 
                nextWeekFocuses: [], 
                checkpoints: [] 
            };
        }
    },

    generateMonthlyReview: async (userId: string): Promise<MonthlyInsight> => {
        const context = AIContextAggregator.gatherContext(userId, 'MONTH');
        const aiResponse = await AISimulator.generateResponse("GENERATE_MONTHLY_REVIEW", context);
        try {
            const raw = JSON.parse(aiResponse.suggestionPayload || '{}');
            return {
                bigChanges: Array.isArray(raw.bigChanges) ? raw.bigChanges : [],
                achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
                habitAdjustments: Array.isArray(raw.habitAdjustments) ? raw.habitAdjustments : [],
                mainGoal: raw.mainGoal || "Keep going.",
                strategicFocus: raw.strategicFocus || "Execution"
            };
        } catch (e) {
            return { bigChanges: [], achievements: [], habitAdjustments: [], mainGoal: "", strategicFocus: "" };
        }
    },

    // Committers (Save results)
    
    commitDaily: async (userId: string, insight: DailyInsight) => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        // 1. Update User Timestamp
        const updatedUser = { ...user, lastDailyReview: Date.now() };
        AuthService.updateUser(updatedUser);

        // 2. Create tasks for tomorrow
        for (const task of (insight.planForTomorrow || [])) {
            await UseCases.createTask.execute(
                userId, 
                task.title, 
                task.priority, 
                EnergyLevel.MEDIUM, 
                30, 
                Date.now() + 86400000 // deadline
            );
        }

        // 3. Log to Chat (System Message)
        const threads = ChatRepository.getThreads(userId);
        const threadId = threads.length > 0 ? threads[0].id : 'main';

        const chatMsg: ChatMessage = {
            id: crypto.randomUUID(),
            userId,
            threadId,
            role: 'system',
            text: `Daily Reflection Logged: Score ${insight.score}/100`,
            timestamp: Date.now()
        };
        ChatRepository.addMessage(userId, chatMsg);
    },

    commitWeekly: async (userId: string, insight: WeeklyInsight) => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const updatedUser = { ...user, lastWeeklyReview: Date.now() };
        AuthService.updateUser(updatedUser);

        const threads = ChatRepository.getThreads(userId);
        const threadId = threads.length > 0 ? threads[0].id : 'main';

        const chatMsg: ChatMessage = {
            id: crypto.randomUUID(),
            userId,
            threadId,
            role: 'system',
            text: `Weekly Review Logged: Focus ${Math.round(insight.kpi.completionRate*100)}%`,
            timestamp: Date.now()
        };
        ChatRepository.addMessage(userId, chatMsg);
    },

    commitMonthly: async (userId: string, insight: MonthlyInsight) => {
        const user = AuthService.getCurrentUser();
        if (!user) return;

        const updatedUser = { ...user, lastMonthlyReview: Date.now() };
        AuthService.updateUser(updatedUser);

        const threads = ChatRepository.getThreads(userId);
        const threadId = threads.length > 0 ? threads[0].id : 'main';

        const chatMsg: ChatMessage = {
            id: crypto.randomUUID(),
            userId,
            threadId,
            role: 'system',
            text: `Monthly Strategy Logged: ${insight.strategicFocus}`,
            timestamp: Date.now()
        };
        ChatRepository.addMessage(userId, chatMsg);
    }
};
