
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
    TaskEntity, TagEntity, Priority, EnergyLevel, TaskStatus, RecurrenceRule, 
    GoalEntity, HabitEntity, HabitFrequency, SuggestionStatus, SuggestionEntity,
    PlanType, PlanEntity, PlanEntryEntity, ChatThread, ChatMessage, 
    GoalReviewReport, GoalAnalysis, TimerState, FocusConfig, FocusMode, WeeklyPlanData,
    DailyInsight, WeeklyInsight, MonthlyInsight, GoalKPI, KPIType
} from '../types';
import { Plan } from '../domain/models';
import { 
    TaskRepository, TagRepository, SuggestionRepository, HabitRepository, 
    PlanRepository, ChatRepository, GoalRepository, SessionRepository 
} from '../data/repositories';
import { UseCases } from '../domain/usecases';
import { BackgroundTimer } from '../utils/background-timer';
import { TaskMapper, HabitMapper } from '../data/mappers';
import { DatabaseService } from '../utils/db';
import { AIContextAggregator } from '../utils/ai-context';
import { AISimulator } from '../utils/ai-simulator';

// --- TASK VIEW MODELS ---

export const useTasksViewModel = (userId: string) => {
    const [tasks, setTasks] = useState<TaskEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'DONE'>('ACTIVE');
    const [filterTag, setFilterTag] = useState<string | null>(null);
    const [filterGoal, setFilterGoal] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [undoState, setUndoState] = useState<{ type: 'DELETE' | 'UPDATE', task: TaskEntity } | null>(null);

    const refresh = useCallback(() => {
        setLoading(true);
        const res = TaskRepository.getTasksForUser(userId);
        if (res.success) {
            let filtered = res.data;
            
            // Status Filter
            if (filterStatus === 'ACTIVE') filtered = filtered.filter(t => t.status !== TaskStatus.DONE);
            else if (filterStatus === 'DONE') filtered = filtered.filter(t => t.status === TaskStatus.DONE);

            // Tag Filter
            if (filterTag) filtered = filtered.filter(t => t.tags.includes(filterTag));

            // Goal Filter
            if (filterGoal) filtered = filtered.filter(t => !!t.goalId);

            // Search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                filtered = filtered.filter(t => t.title.toLowerCase().includes(q));
            }

            // Sort: Priority DESC, then Deadline ASC, then Created DESC
            filtered.sort((a, b) => {
                const pMap = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
                if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
                if (a.deadline && b.deadline) return a.deadline - b.deadline;
                if (a.deadline) return -1;
                if (b.deadline) return 1;
                return b.createdAt - a.createdAt;
            });

            setTasks(filtered);
        } else {
            setError(res.error?.message || 'Failed to load tasks');
        }
        setLoading(false);
    }, [userId, filterStatus, filterTag, filterGoal, searchQuery]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const quickCreateTask = async (title: string) => {
        const res = await UseCases.createTask.execute(userId, title, Priority.MEDIUM, EnergyLevel.MEDIUM, 30);
        if (res.success) refresh();
        else setError(res.error?.message || 'Failed to create task');
    };

    const toggleTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const updated = { ...task, status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE };
            setTasks(tasks.map(t => t.id === id ? updated : t));
            
            const res = await UseCases.toggleTask.execute(id);
            if (!res.success) refresh();
        }
    };

    const deleteTask = async (id: string) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            setUndoState({ type: 'DELETE', task });
            setTasks(tasks.filter(t => t.id !== id));
            await UseCases.deleteTask.execute(id);
            setTimeout(() => setUndoState(null), 5000);
        }
    };

    const undoLastAction = async () => {
        if (undoState) {
            if (undoState.type === 'DELETE') {
                await UseCases.restoreTask.execute(TaskMapper.toDomain(undoState.task));
            }
            setUndoState(null);
            refresh();
        }
    };

    const scheduleTask = async (id: string, date: number, duration: number, recurrence?: RecurrenceRule) => {
        const task = tasks.find(t => t.id === id);
        if (task) {
            const updated = { ...task, plannedAt: date, durationMinutes: duration, recurrence };
            await UseCases.updateTask.execute(TaskMapper.toDomain(updated));
            refresh();
        }
    };

    return {
        tasks, loading, error,
        filterStatus, setFilterStatus,
        filterTag, setFilterTag,
        filterGoal, setFilterGoal,
        searchQuery, setSearchQuery,
        quickCreateTask, toggleTask, deleteTask, scheduleTask,
        undoState, undoLastAction, clearUndo: () => setUndoState(null)
    };
};

export const useTagsViewModel = () => {
    const [tags, setTags] = useState<TagEntity[]>([]);

    useEffect(() => {
        const res = TagRepository.getAllTags();
        if (res.success) setTags(res.data);
    }, []);

    const createTag = async (name: string, color?: string) => {
        const res = await UseCases.createTag.execute(name, color);
        if (res.success) {
            setTags([...tags, res.data]);
            return res.data;
        }
        return null;
    };

    return { tags, createTag };
};

export const useTaskEditViewModel = (userId: string, taskId?: string, initialTitle?: string, initialPlannedAt?: number) => {
    const [task, setTask] = useState<Partial<TaskEntity>>({
        title: initialTitle || '',
        priority: Priority.MEDIUM,
        energyLevel: EnergyLevel.MEDIUM,
        estimateMinutes: 60,
        tags: [],
        plannedAt: initialPlannedAt,
        durationMinutes: 60,
        showOnDashboard: true
    });
    const [availableTags, setAvailableTags] = useState<TagEntity[]>([]);
    const [availableGoals, setAvailableGoals] = useState<GoalEntity[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const tagsRes = TagRepository.getAllTags();
        if (tagsRes.success) setAvailableTags(tagsRes.data);
        const goals = GoalRepository.getAll(userId);
        setAvailableGoals(goals);

        if (taskId) {
            setLoading(true);
            const res = TaskRepository.getTaskById(taskId);
            if (res.success) setTask(res.data);
            else setError("Task not found");
            setLoading(false);
        }
    }, [taskId, userId]);

    const createNewTag = async (name: string, color: string) => {
        const res = await UseCases.createTag.execute(name, color);
        if (res.success) {
            setAvailableTags([...availableTags, res.data]);
            const currentTags = task.tags || [];
            setTask({ ...task, tags: [...currentTags, res.data.name] });
        }
    };

    const saveTask = async () => {
        if (!task.title?.trim()) {
            setError("Title required");
            return false;
        }
        setSaving(true);
        let res;
        if (taskId) {
            const existingRes = TaskRepository.getTaskById(taskId);
            if (existingRes.success) {
                const updated = { ...existingRes.data, ...task };
                res = await UseCases.updateTask.execute(TaskMapper.toDomain(updated as TaskEntity));
            } else {
                res = { success: false, error: { message: "Task not found" } };
            }
        } else {
            res = await UseCases.createTask.execute(
                userId,
                task.title,
                task.priority!,
                task.energyLevel!,
                task.estimateMinutes!,
                task.deadline,
                task.tags,
                task.recurrence,
                task.plannedAt,
                task.durationMinutes,
                task.goalId || undefined,
                undefined,
                task.showOnDashboard
            );
        }
        setSaving(true); // Should stay true during save process
        if (res.success) {
            setSaving(false);
            return true;
        }
        setSaving(false);
        setError(res.error?.message || "Save failed");
        return false;
    };

    const deleteTask = async () => {
        if (!taskId) return false;
        await UseCases.deleteTask.execute(taskId);
        return true;
    };

    return {
        task, setTask, availableTags, availableGoals,
        createNewTag,
        updateTag: (t: TagEntity) => { TagRepository.updateTag(t); setAvailableTags(prev => prev.map(x => x.id === t.id ? t : x)); },
        deleteTag: (id: string) => { TagRepository.deleteTag(id); setAvailableTags(prev => prev.filter(x => x.id !== id)); },
        loading, saving, error, saveTask, deleteTask
    };
};

export const useTaskDetailViewModel = (taskId: string) => {
    const [task, setTask] = useState<TaskEntity | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [linkedSuggestion, setLinkedSuggestion] = useState<SuggestionEntity | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setLoading(true);
        const tRes = TaskRepository.getTaskById(taskId);
        if (tRes.success) {
            setTask(tRes.data);
            const sRes = SessionRepository.getSessionsForTask(taskId);
            if (sRes.success) setSessions(sRes.data);
            if (tRes.data.suggestedFromId) {
                const suggRes = SuggestionRepository.getSuggestionById(tRes.data.suggestedFromId);
                if (suggRes.success) setLinkedSuggestion(suggRes.data);
            }
        }
        setLoading(false);
    }, [taskId]);

    useEffect(() => { refresh(); }, [refresh]);

    const toggleDone = async () => {
        await UseCases.toggleTask.execute(taskId);
        refresh();
    };

    const deleteTask = async () => {
        const res = await UseCases.deleteTask.execute(taskId);
        return res.success;
    };

    return { task, sessions, linkedSuggestion, loading, toggleDone, deleteTask };
};

// --- HABIT VIEW MODELS ---

export const useHabitsViewModel = (userId: string) => {
    const [habits, setHabits] = useState<HabitEntity[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setLoading(true);
        const res = HabitRepository.getHabitsForUser(userId);
        if (res.success) setHabits(res.data);
        setLoading(false);
    }, [userId]);

    useEffect(() => { refresh(); }, [refresh]);

    const markDone = async (id: string) => {
        const habit = habits.find(h => h.id === id);
        if (habit) {
            const todayStart = new Date().setHours(0,0,0,0);
            const isAlreadyDoneToday = habit.history.some(ts => new Date(ts).setHours(0,0,0,0) === todayStart);

            let updated: HabitEntity;
            if (isAlreadyDoneToday) {
                // Если уже сделано сегодня - удаляем эту запись (toggle off)
                const newHistory = habit.history.filter(ts => new Date(ts).setHours(0,0,0,0) !== todayStart);
                updated = { 
                    ...habit, 
                    history: newHistory, 
                    streak: Math.max(0, habit.streak - 1),
                    lastDoneAt: newHistory.length > 0 ? Math.max(...newHistory) : undefined
                };
            } else {
                // Если еще не сделано - добавляем запись (toggle on)
                const now = Date.now();
                updated = { 
                    ...habit, 
                    lastDoneAt: now, 
                    streak: habit.streak + 1, 
                    history: [...habit.history, now] 
                };
            }

            setHabits(habits.map(h => h.id === id ? updated : h));
            const domHabit = HabitMapper.toDomain(updated);
            await HabitRepository.updateHabit(domHabit);
            if (habit.goalId) await UseCases.recalcGoalProgress.execute(habit.goalId);
        }
    };

    const decrementHabit = async (id: string) => {
        const habit = habits.find(h => h.id === id);
        if (habit && habit.history.length > 0) {
            const newHistory = [...habit.history];
            newHistory.pop(); // Удаляем последнюю отметку
            const updated: HabitEntity = {
                ...habit,
                history: newHistory,
                streak: Math.max(0, habit.streak - 1),
                lastDoneAt: newHistory.length > 0 ? Math.max(...newHistory) : undefined
            };
            setHabits(habits.map(h => h.id === id ? updated : h));
            await HabitRepository.updateHabit(HabitMapper.toDomain(updated));
            if (habit.goalId) await UseCases.recalcGoalProgress.execute(habit.goalId);
        }
    };

    const deleteHabit = async (id: string) => {
        await HabitRepository.deleteHabit(id);
        refresh();
    };

    return { habits, loading, markDone, decrementHabit, deleteHabit };
};

export const useHabitEditViewModel = (userId: string, habitId?: string) => {
    const [habit, setHabit] = useState<Partial<HabitEntity>>({
        title: '',
        frequency: HabitFrequency.DAILY,
        importance: Priority.MEDIUM,
        streak: 0,
        repairTokensRemaining: 1,
        active: true
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (habitId) {
            setLoading(true);
            const res = HabitRepository.getHabitById(habitId);
            if (res.success) setHabit(res.data);
            setLoading(false);
        }
    }, [habitId]);

    const saveHabit = async () => {
        if (!habit.title?.trim()) {
            setError("Title required");
            return false;
        }
        setSaving(true);
        let res;
        if (habitId) {
            const domHabit = HabitMapper.toDomain(habit as HabitEntity);
            res = await HabitRepository.updateHabit(domHabit);
        } else {
            const newHabit = {
                ...habit,
                id: crypto.randomUUID(),
                userId,
                createdAt: Date.now(),
                history: []
            };
            res = await UseCases.createHabit.execute(HabitMapper.toDomain(newHabit as HabitEntity));
        }
        setSaving(false);
        if (res.success) return true;
        setError(res.error?.message || "Failed");
        return false;
    };

    const deleteHabit = async () => {
        if (habitId) await HabitRepository.deleteHabit(habitId);
    };

    return { habit, setHabit, loading, saving, error, saveHabit, deleteHabit };
};

export const useHabitDetailViewModel = (habitId: string) => {
    const [habit, setHabit] = useState<HabitEntity | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(() => {
        setLoading(true);
        const res = HabitRepository.getHabitById(habitId);
        if (res.success) setHabit(res.data);
        setLoading(false);
    }, [habitId]);

    useEffect(() => { refresh(); }, [refresh]);

    const markDone = async () => {
        if (!habit) return;
        const todayStart = new Date().setHours(0,0,0,0);
        const isAlreadyDoneToday = habit.history.some(ts => new Date(ts).setHours(0,0,0,0) === todayStart);

        let updated: HabitEntity;
        if (isAlreadyDoneToday) {
            const newHistory = habit.history.filter(ts => new Date(ts).setHours(0,0,0,0) !== todayStart);
            updated = { 
                ...habit, 
                history: newHistory, 
                streak: Math.max(0, habit.streak - 1),
                lastDoneAt: newHistory.length > 0 ? Math.max(...newHistory) : undefined
            };
        } else {
            const now = Date.now();
            updated = { 
                ...habit, 
                lastDoneAt: now, 
                streak: habit.streak + 1, 
                history: [...habit.history, now] 
            };
        }

        setHabit(updated);
        await HabitRepository.updateHabit(HabitMapper.toDomain(updated));
        if (habit.goalId) await UseCases.recalcGoalProgress.execute(habit.goalId);
    };

    const useRepairToken = async (date: number) => {
        if (!habit || habit.repairTokensRemaining <= 0) return;
        const updated = { 
            ...habit, 
            repairTokensRemaining: habit.repairTokensRemaining - 1,
            history: [...habit.history, date].sort() 
        };
        setHabit(updated);
        await HabitRepository.updateHabit(HabitMapper.toDomain(updated));
    };

    const deleteHabit = async () => {
        await HabitRepository.deleteHabit(habitId);
    };

    return { habit, loading, markDone, useRepairToken, deleteHabit };
};

// --- FOCUS VIEW MODEL ---

export const useFocusViewModel = (userId?: string, taskId?: string) => {
    const [state, setState] = useState<TimerState>(BackgroundTimer.getState());
    const [config, setConfig] = useState<FocusConfig>(BackgroundTimer.getConfig());

    useEffect(() => {
        if (userId) BackgroundTimer.setUserId(userId);
        const unsub = BackgroundTimer.subscribe((s) => setState(s));
        return () => unsub();
    }, [userId, taskId]);

    const startTimer = (tid?: string) => BackgroundTimer.startSession(tid || taskId);
    const pauseTimer = () => BackgroundTimer.pause();
    const resumeTimer = () => BackgroundTimer.resume();
    const stopTimer = (save: boolean) => BackgroundTimer.stop(save);
    const skipTimer = () => BackgroundTimer.skip();
    
    const updateConfig = (c: FocusConfig) => {
        BackgroundTimer.updateConfig(c);
        setConfig(c);
    };

    return {
        state,
        config,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        skipTimer,
        updateConfig
    };
};

// --- CHAT VIEW MODEL ---

export const useAIChatViewModel = (userId: string) => {
    const [threads, setThreads] = useState<ChatThread[]>([]);
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [state, setState] = useState<{ messages: ChatMessage[], isLoading: boolean }>({ messages: [], isLoading: false });
    const [historyLoaded, setHistoryLoaded] = useState(false);

    useEffect(() => {
        let t = ChatRepository.getThreads(userId);
        if (t.length === 0) {
            const initialThread = ChatRepository.createThread(userId, 'Start');
            t = [initialThread];
        }
        setThreads(t);
        if (t.length > 0) {
            selectThread(t[0].id);
        }
        setHistoryLoaded(true);
    }, [userId]);

    const selectThread = (threadId: string) => {
        setCurrentThreadId(threadId);
        const msgs = ChatRepository.getMessages(threadId);
        setState({ messages: msgs, isLoading: false });
    };

    const createThread = async () => {
        const t = ChatRepository.createThread(userId, `New Chat ${new Date().toLocaleTimeString()}`);
        setThreads([t, ...threads]);
        selectThread(t.id);
        return t;
    };

    const renameThread = async (id: string, title: string) => {
        ChatRepository.updateThreadTitle(userId, id, title);
        setThreads(threads.map(t => t.id === id ? { ...t, title } : t));
    };

    const deleteThread = async (id: string) => {
        ChatRepository.deleteThread(userId, id);
        const newThreads = threads.filter(t => t.id !== id);
        setThreads(newThreads);
        if (currentThreadId === id) {
            if (newThreads.length > 0) selectThread(newThreads[0].id);
            else {
                setState({ messages: [], isLoading: false });
                setCurrentThreadId(null);
            }
        }
    };

    const sendMessage = async (text: string, scenario?: string) => {
        let threadId = currentThreadId;
        if (!threadId) {
            const t = await createThread();
            threadId = t.id;
        }

        const effectiveText = scenario && text.startsWith(scenario) ? text : (scenario ? `${scenario}:::${text}` : text);

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            userId,
            threadId,
            role: 'user',
            text: effectiveText,
            timestamp: Date.now()
        };

        const newHistory = [...state.messages, userMsg];
        setState({ messages: newHistory, isLoading: true });
        
        ChatRepository.addMessage(userId, userMsg);
        const context = AIContextAggregator.gatherContext(userId, 'ALL');
        
        try {
            const aiResponse = await AISimulator.generateResponse(effectiveText, context, newHistory);
            const botMsg: ChatMessage = {
                id: crypto.randomUUID(),
                userId,
                threadId: threadId!,
                role: 'model',
                text: aiResponse.text,
                timestamp: Date.now()
            };
            ChatRepository.addMessage(userId, botMsg);
            setState(prev => ({ messages: [...prev.messages, botMsg], isLoading: false }));
        } catch (error) {
             const errorMsg: ChatMessage = {
                id: crypto.randomUUID(),
                userId,
                threadId: threadId!,
                role: 'system',
                text: "Ошибка соединения с AI.",
                timestamp: Date.now()
            };
            ChatRepository.addMessage(userId, errorMsg);
            setState(prev => ({ messages: [...prev.messages, errorMsg], isLoading: false }));
        }
    };

    return {
        state,
        threads,
        currentThreadId,
        historyLoaded,
        createThread,
        renameThread,
        deleteThread,
        selectThread,
        sendMessage
    };
};

// --- CHECKLIST & PLAN VIEW MODELS ---

export const useChecklistViewModel = (userId: string) => {
    const [planType, setPlanType] = useState<PlanType>(PlanType.WEEKLY);
    const [periodStart, setPeriodStart] = useState<number>(() => {
        const now = new Date();
        now.setHours(0,0,0,0);
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(now.setDate(diff)).getTime();
    });
    
    const [plan, setPlan] = useState<PlanEntity | null>(null);
    const [entries, setEntries] = useState<PlanEntryEntity[]>([]);
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        const res = await UseCases.getPlan.execute(userId, planType, periodStart);
        if (res.success && res.data) {
            setPlan(res.data.plan as PlanEntity);
            setEntries(res.data.entries as PlanEntryEntity[]);
        } else {
            setPlan(null);
            setEntries([]);
        }
        setLoading(false);
    }, [userId, planType, periodStart]);

    useEffect(() => { refresh(); }, [refresh]);

    const nextPeriod = () => {
        const d = new Date(periodStart);
        if (planType === PlanType.WEEKLY) d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        setPeriodStart(d.getTime());
    };

    const prevPeriod = () => {
        const d = new Date(periodStart);
        if (planType === PlanType.WEEKLY) d.setDate(d.getDate() - 7);
        else d.setMonth(d.getMonth() - 1);
        setPeriodStart(d.getTime());
    };

    const savePlan = async (newPlan: PlanEntity, newEntries: PlanEntryEntity[]) => {
        await UseCases.createOrUpdatePlan.execute(newPlan, newEntries);
        refresh();
    };

    const generateBasicReview = async () => {
        if (!plan) return null;
        const range = planType === PlanType.WEEKLY ? 'WEEK' : 'MONTH';
        const context = AIContextAggregator.gatherContext(userId, range);
        const planContext = { ...context, currentPlanTitle: plan.title, planStructure: plan.structureJson ? JSON.parse(plan.structureJson) : null };
        const prompt = `GENERATE_PLAN_REVIEW for ${planType}`;
        const response = await AISimulator.generateResponse(prompt, planContext);
        try { return JSON.parse(response.suggestionPayload || '{}'); } catch (e) { return null; }
    };

    return {
        plan, entries, loading, periodStart, planType,
        setPlanType, nextPeriod, prevPeriod, savePlan, generateBasicReview
    };
};

export const useAIDraftViewModel = (userId: string) => {
    const [suggestions, setSuggestions] = useState<SuggestionEntity[]>([]);
    const [loading, setLoading] = useState(false);
    const fetchDrafts = async (start: number, type: PlanType) => {
        setLoading(true);
        setTimeout(() => {
            setSuggestions([{ id: 's1', userId, context: 'Analysis', text: 'Focus: Deep Work', explanation: 'Fragmented time.', confidence: 0.9, estimateMinutes: 0, tags: ['Strategy'], status: SuggestionStatus.PROPOSED, createdAt: Date.now(), type: 'PLAN_FOCUS' }]);
            setLoading(false);
        }, 1000);
    };
    const acceptSuggestion = async (id: string, action: string, targetId?: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };
    const rejectSuggestion = async (id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };
    return { suggestions, loading, fetchDrafts, acceptSuggestion, rejectSuggestion };
};

// --- GOAL DETAIL VIEW MODEL ---

export const useGoalDetailViewModel = (userId: string, goalId: string) => {
    const [goal, setGoal] = useState<GoalEntity | null>(null);
    const [tasks, setTasks] = useState<TaskEntity[]>([]);
    const [report, setReport] = useState<GoalReviewReport | null>(null);
    const [analysis, setAnalysis] = useState<GoalAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [runningAnalysis, setRunningAnalysis] = useState(false);
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

    const refresh = useCallback(() => {
        const g = GoalRepository.getById(goalId);
        if (g) setGoal(g);
        const tRes = TaskRepository.getTasksForUser(userId);
        if (tRes.success) setTasks(tRes.data.filter(t => t.goalId === goalId));
        const pRes = PlanRepository.getAllPlans(userId);
        if (pRes.success) setAvailablePlans(pRes.data);
        setLoading(false);
    }, [goalId, userId]);

    useEffect(() => { refresh(); }, [refresh]);

    const addStage = async (title: string) => {
        const res = await UseCases.addStageToGoal.execute(goalId, title);
        if (res.success) refresh();
    };

    const addTaskToStage = async (stageId: string, title: string) => {
        const res = await UseCases.createTask.execute(userId, title, Priority.MEDIUM, EnergyLevel.MEDIUM, 30, undefined, [], undefined, undefined, undefined, goalId, stageId);
        if (res.success) { await UseCases.recalcGoalProgress.execute(goalId); refresh(); }
    };

    const startSession = async () => {
        const res = await UseCases.startGoalSession.execute(goalId);
        return res.success ? res.data : null;
    };

    const generateReport = async () => {
        setGeneratingReport(true);
        const res = await UseCases.generateGoalReport.execute(goalId);
        if (res.success) setReport(res.data);
        setGeneratingReport(false);
    };

    const runAnalysis = async () => {
        setRunningAnalysis(true);
        const res = await UseCases.runGoalRealityCheck.execute(goalId);
        if (res.success) setAnalysis(res.data);
        setRunningAnalysis(false);
    };

    const deleteGoal = async () => { await UseCases.deleteGoal.execute(goalId); };
    const updateGoal = async (updates: Partial<GoalEntity>) => { if (!goal) return; const updated = { ...goal, ...updates }; await UseCases.updateGoal.execute(updated as GoalEntity); refresh(); };
    const linkPlanToStage = async (stageId: string, planId: string) => { await UseCases.linkPlanToStage.execute(goalId, stageId, planId); refresh(); };
    const unlinkPlanFromStage = async (stageId: string, planId: string) => { await UseCases.unlinkPlanFromStage.execute(goalId, stageId, planId); refresh(); };
    const completeStage = async (stageId: string) => { const res = await UseCases.completeGoalStage.execute(goalId, stageId); if (res.success) refresh(); return res.success; };

    return { goal, tasks, report, analysis, loading, generatingReport, runningAnalysis, availablePlans, refresh, addStage, addTaskToStage, startSession, generateReport, runAnalysis, deleteGoal, updateGoal, linkPlanToStage, unlinkPlanFromStage, completeStage };
};
