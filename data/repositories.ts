
import { DatabaseService } from '../utils/db';
import { SyncRepository } from './sync';
import { TaskMapper, SessionMapper, SuggestionMapper, HabitMapper } from './mappers';
import { Task, Session, Suggestion, RepoResult, Result, Plan, PlanEntry, Habit } from '../domain/models';
import { TaskEntity, SessionEntity, SuggestionEntity, SuggestionStatus, TaskStatus, HabitEntity, PlanType, PlanEntity, PlanEntryEntity, ChatMessage, TagEntity, ChatThread, GoalEntity, MapNodeEntity, MapEdgeEntity } from '../types';

// --- Analytics Tracker ---
export class AnalyticsTracker {
    track(event: string, payload?: any) {
        console.log(`[Analytics] ${event}`, payload);
    }
}

// --- Repositories ---

export class LocalChatRepository {
    getThreads(userId: string): ChatThread[] {
        const threads = JSON.parse(localStorage.getItem('chronos_chats') || '[]');
        return threads.filter((t: any) => t.userId === userId);
    }
    
    createThread(userId: string, title: string): ChatThread {
        const threads = JSON.parse(localStorage.getItem('chronos_chats') || '[]');
        const newThread: ChatThread = { id: crypto.randomUUID(), userId, title, createdAt: Date.now(), updatedAt: Date.now() };
        threads.unshift(newThread);
        localStorage.setItem('chronos_chats', JSON.stringify(threads));
        return newThread;
    }

    updateThreadTitle(userId: string, threadId: string, title: string): void {
        const threads = JSON.parse(localStorage.getItem('chronos_chats') || '[]');
        const idx = threads.findIndex((t:any) => t.id === threadId);
        if (idx !== -1) {
            threads[idx].title = title;
            localStorage.setItem('chronos_chats', JSON.stringify(threads));
        }
    }

    deleteThread(userId: string, threadId: string): void {
        const threads = JSON.parse(localStorage.getItem('chronos_chats') || '[]');
        const newThreads = threads.filter((t:any) => t.id !== threadId);
        localStorage.setItem('chronos_chats', JSON.stringify(newThreads));
    }

    getMessages(threadId: string): ChatMessage[] {
        const msgs = JSON.parse(localStorage.getItem('chronos_messages') || '[]');
        return msgs.filter((m: any) => m.threadId === threadId).sort((a:any,b:any) => a.timestamp - b.timestamp);
    }

    addMessage(userId: string, msg: ChatMessage): void {
        const msgs = JSON.parse(localStorage.getItem('chronos_messages') || '[]');
        msgs.push(msg);
        localStorage.setItem('chronos_messages', JSON.stringify(msgs));
    }

    getAllRecentMessages(userId: string, limit: number): ChatMessage[] {
        const msgs = JSON.parse(localStorage.getItem('chronos_messages') || '[]');
        return msgs.filter((m:any) => m.userId === userId).sort((a:any, b:any) => b.timestamp - a.timestamp).slice(0, limit);
    }
}

export class LocalTagRepository {
    getAllTags(): RepoResult<TagEntity[]> {
        return Result.success(DatabaseService.tags.getAll());
    }
    createTag(tag: TagEntity): RepoResult<TagEntity> {
        DatabaseService.tags.insert(tag);
        return Result.success(tag);
    }
    updateTag(tag: TagEntity): RepoResult<void> {
        DatabaseService.tags.update(tag);
        return Result.success(undefined);
    }
    deleteTag(id: string): RepoResult<void> {
        DatabaseService.tags.delete(id);
        return Result.success(undefined);
    }
}

export class LocalTaskRepository {
    createTask(task: Task): RepoResult<string> {
        const entity = TaskMapper.toEntity(task);
        DatabaseService.tasks.insert(entity);
        return Result.success(entity.id);
    }
    updateTask(task: Task): RepoResult<void> {
        const entity = TaskMapper.toEntity(task);
        DatabaseService.tasks.update(entity);
        return Result.success(undefined);
    }
    deleteTask(id: string): RepoResult<void> {
        DatabaseService.tasks.delete(id);
        return Result.success(undefined);
    }
    getTaskById(id: string): RepoResult<Task> {
        const entity = DatabaseService.tasks.getById(id);
        if (!entity) return Result.notFound("Task not found");
        return Result.success(TaskMapper.toDomain(entity));
    }
    getTasksForUser(userId: string): RepoResult<TaskEntity[]> {
        return Result.success(DatabaseService.tasks.getByUserId(userId));
    }
}

export class LocalSessionRepository {
    createSession(session: SessionEntity): RepoResult<string> {
        DatabaseService.sessions.insert(session);
        return Result.success(session.id);
    }
    updateSession(session: SessionEntity): RepoResult<void> {
        DatabaseService.sessions.update(session);
        return Result.success(undefined);
    }
    getSessionsForTask(taskId: string): RepoResult<SessionEntity[]> {
        return Result.success(DatabaseService.sessions.getByTaskId(taskId));
    }
}

export class LocalSuggestionRepository {
    getSuggestionById(id: string): RepoResult<SuggestionEntity> {
        const s = DatabaseService.suggestions.getById(id);
        return s ? Result.success(s) : Result.notFound("Suggestion not found");
    }
    updateStatus(id: string, status: SuggestionStatus): RepoResult<void> {
        const s = DatabaseService.suggestions.getById(id);
        if (s) {
            s.status = status;
            DatabaseService.suggestions.update(s);
            return Result.success(undefined);
        }
        return Result.notFound("Suggestion not found");
    }
    getSuggestionsForUser(userId: string): RepoResult<SuggestionEntity[]> {
        return Result.success(DatabaseService.suggestions.getAll().filter(s => s.userId === userId));
    }
}

export class LocalHabitRepository {
    createHabit(habit: Habit): RepoResult<string> {
        const entity = HabitMapper.toEntity(habit);
        DatabaseService.habits.insert(entity);
        return Result.success(entity.id);
    }
    updateHabit(habit: Habit): RepoResult<void> {
        const entity = HabitMapper.toEntity(habit);
        DatabaseService.habits.update(entity);
        return Result.success(undefined);
    }
    getHabitById(id: string): RepoResult<HabitEntity> {
        const h = DatabaseService.habits.getById(id);
        return h ? Result.success(h) : Result.notFound("Habit not found");
    }
    getHabitsForUser(userId: string): RepoResult<HabitEntity[]> {
        return Result.success(DatabaseService.habits.getAll().filter(h => h.userId === userId));
    }
    deleteHabit(id: string): RepoResult<void> {
        DatabaseService.habits.delete(id);
        return Result.success(undefined);
    }
}

export class LocalPlanRepository {
    getPlanForPeriod(userId: string, type: PlanType, start: number): RepoResult<{ plan: Plan, entries: PlanEntry[] } | null> {
        const plans = DatabaseService.plans.getAll();
        const plan = plans.find(p => p.userId === userId && p.type === type && p.periodStart === start);
        if (!plan) return Result.success(null);
        
        const entries = DatabaseService.planEntries.getByPlanId(plan.id);
        return Result.success({ 
            plan: { ...plan, structureJson: plan.structureJson }, 
            entries: entries.map(e => ({ ...e })) 
        });
    }
    
    getPlanById(id: string): RepoResult<{ plan: Plan, entries: PlanEntry[] }> {
        const plan = DatabaseService.plans.getById(id);
        if (!plan) return Result.notFound("Plan not found");
        const entries = DatabaseService.planEntries.getByPlanId(id);
        return Result.success({ plan, entries });
    }

    createOrUpdatePlan(plan: Plan, entries: PlanEntry[]): RepoResult<void> {
        const existing = DatabaseService.plans.getById(plan.id);
        if (existing) DatabaseService.plans.update(plan);
        else DatabaseService.plans.insert(plan);

        entries.forEach(e => {
            const ent = DatabaseService.planEntries.getById(e.id);
            if (ent) DatabaseService.planEntries.update(e);
            else DatabaseService.planEntries.insert(e);
        });
        
        return Result.success(undefined);
    }

    getLastActivePlan(userId: string, type: PlanType): RepoResult<{ plan: Plan } | null> {
        const plan = DatabaseService.plans.getActivePlan(userId, type);
        if (plan) return Result.success({ plan });
        return Result.success(null);
    }

    getAllPlans(userId: string): RepoResult<Plan[]> {
        const plans = DatabaseService.plans.getAll().filter(p => p.userId === userId);
        return Result.success(plans);
    }
}

export class LocalGoalRepository {
    getAll(userId: string): GoalEntity[] {
        return DatabaseService.goals.getAll().filter(g => g.ownerId === userId);
    }
    getById(id: string): GoalEntity | undefined {
        return DatabaseService.goals.getById(id);
    }
    create(goal: GoalEntity): void {
        DatabaseService.goals.insert(goal);
    }
    update(goal: GoalEntity): void {
        DatabaseService.goals.update(goal);
    }
}

// --- Map Repository ---
export class LocalMapRepository {
    // Nodes
    createNode(node: MapNodeEntity): RepoResult<string> {
        try {
            DatabaseService.mapNodes.insert(node);
            return Result.success(node.id);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }

    updateNode(node: MapNodeEntity): RepoResult<void> {
        try {
            DatabaseService.mapNodes.update(node);
            return Result.success(undefined);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }

    deleteNode(id: string): RepoResult<void> {
        try {
            DatabaseService.mapNodes.delete(id);
            // Also delete connected edges
            const edges = DatabaseService.mapEdges.getAll().filter(e => e.sourceNodeId === id || e.targetNodeId === id);
            edges.forEach(e => DatabaseService.mapEdges.delete(e.id));
            return Result.success(undefined);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }

    getNodesByMapId(mapId: string): RepoResult<MapNodeEntity[]> {
        try {
            const nodes = DatabaseService.mapNodes.getByMapId(mapId);
            return Result.success(nodes);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }

    getEdgesByMapId(mapId: string): RepoResult<MapEdgeEntity[]> {
        try {
            const edges = DatabaseService.mapEdges.getByMapId(mapId);
            return Result.success(edges);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }

    getNodesByGoalId(goalId: string): RepoResult<MapNodeEntity[]> {
        try {
            // Corrected property access: MapNodeEntity uses 'references' not 'data'
            const nodes = DatabaseService.mapNodes.getAll().filter(n => n.references && n.references.goalId === goalId);
            return Result.success(nodes);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }
}

// Singleton Instances
export const TaskRepository = new LocalTaskRepository();
export const SessionRepository = new LocalSessionRepository();
export const SuggestionRepository = new LocalSuggestionRepository();
export const HabitRepository = new LocalHabitRepository();
export const PlanRepository = new LocalPlanRepository();
export const ChatRepository = new LocalChatRepository();
export const TagRepository = new LocalTagRepository();
export const GoalRepository = new LocalGoalRepository();
export const MapRepository = new LocalMapRepository();
