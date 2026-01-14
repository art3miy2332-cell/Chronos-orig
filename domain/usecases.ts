
import { TaskRepository, SuggestionRepository, SessionRepository, HabitRepository, PlanRepository, ChatRepository, TagRepository, GoalRepository, MapRepository } from '../data/repositories';
import { Task, Session, Suggestion, RepoResult, Result, Habit, Plan, PlanEntry } from './models';
import { Priority, EnergyLevel, TaskStatus, SuggestionStatus, HabitFrequency, PlanType, ChatMessage, TagEntity, WeeklyPlanData, PlanTask, RecurrenceRule, ChatThread, GoalEntity, MapNodeType, MapNodeEntity, GoalReviewReport, GoalAnalysis, RoadmapNode, GoalStatus, KPIType } from '../types';
import { AIContextAggregator } from '../utils/ai-context';
import { AISimulator } from '../utils/ai-simulator';
import { HabitMapper, TaskMapper } from '../data/mappers';
import { MapProgressService } from '../utils/map-progress';
import { DatabaseService } from '../utils/db';

// --- Task Use Cases ---

export class CreateTaskUseCase {
    async execute(
        userId: string, 
        title: string, 
        priority: Priority, 
        energy: EnergyLevel,
        estimateMinutes: number,
        deadline?: number,
        tags?: string[],
        recurrence?: RecurrenceRule,
        plannedAt?: number,
        durationMinutes?: number,
        goalId?: string,
        stageId?: string
    ): Promise<RepoResult<string>> {
        
        if (!title.trim()) {
            return Result.validation("Task title cannot be empty");
        }

        const task: Task = {
            id: crypto.randomUUID(),
            userId,
            title: title.trim(),
            description: '',
            tags: tags || [],
            priority,
            estimateMinutes,
            deadline,
            plannedAt,
            durationMinutes,
            energyLevel: energy,
            status: TaskStatus.TODO,
            createdAt: Date.now(),
            createdBy: 'USER',
            recurrence: recurrence,
            goalId,
            stageId
        };

        const result = TaskRepository.createTask(task);
        
        // Auto-link if goalId provided
        if (result.success && goalId) {
            UseCases.linkTaskToGoal.execute(goalId, result.data);
        }

        return result;
    }
}

export class UpdateTaskUseCase {
    async execute(task: Task): Promise<RepoResult<void>> {
        if (!task.title.trim()) return Result.validation("Title required");
        
        const res = TaskRepository.updateTask(task);
        
        if (res.success) {
            // Note: In a real app we'd filter for relevant maps, here we just trigger for user's maps
            const maps = MapRepository.getNodesByMapId('default'); 
        }
        
        return res;
    }
}

export class DeleteTaskUseCase {
    async execute(id: string): Promise<RepoResult<void>> {
        const taskRes = TaskRepository.getTaskById(id);
        if (taskRes.success && taskRes.data.goalId) {
            await UseCases.unlinkTaskFromGoal.execute(taskRes.data.goalId, id);
        }
        return TaskRepository.deleteTask(id);
    }
}

export class RestoreTaskUseCase {
    async execute(task: Task): Promise<RepoResult<string>> {
        return TaskRepository.createTask(task);
    }
}

export class ToggleTaskStatusUseCase {
    async execute(taskId: string): Promise<RepoResult<void>> {
        const result = TaskRepository.getTaskById(taskId);
        if (!result.success) return Result.error(result.error);
        
        const task = result.data;
        const newStatus = task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE;
        const updatedTask: Task = {
            ...task,
            status: newStatus,
            doneAt: newStatus === TaskStatus.DONE ? Date.now() : undefined
        };

        const updateRes = TaskRepository.updateTask(updatedTask);
        
        if (updateRes.success && task.goalId) {
            await UseCases.recalcGoalProgress.execute(task.goalId);
        }

        return updateRes;
    }
}

export class AddTaskToWeeklyPlanUseCase {
    async execute(userId: string, taskId: string): Promise<RepoResult<void>> {
        const taskRes = TaskRepository.getTaskById(taskId);
        if (!taskRes.success) return Result.error(taskRes.error);
        const task = taskRes.data;

        const planRes = PlanRepository.getLastActivePlan(userId, PlanType.WEEKLY);
        if (!planRes.success || !planRes.data) return Result.notFound("No active weekly plan found.");
        const { plan } = planRes.data;

        let data: WeeklyPlanData;
        try {
            data = plan.structureJson ? JSON.parse(plan.structureJson) : { focuses: [] };
        } catch(e) { 
            return Result.error({type: 'UNKNOWN', message: 'Plan corrupted'}); 
        }

        const planTask: PlanTask = {
            id: task.id, 
            title: task.title,
            isKey: task.priority === Priority.HIGH,
            isDone: task.status === TaskStatus.DONE,
            priority: task.priority,
            estimateMinutes: task.estimateMinutes,
            tags: task.tags
        };

        let general = data.focuses.find(f => f.id === 'general_tasks');
        if (!general) {
            general = { id: 'general_tasks', title: 'General Tasks', tasks: [], isCollapsed: false };
            data.focuses.push(general);
        }

        if (!general.tasks.find(t => t.id === planTask.id)) {
            general.tasks.push(planTask);
        } else {
            return Result.validation("Task already in plan");
        }

        plan.structureJson = JSON.stringify(data);
        const saveRes = PlanRepository.createOrUpdatePlan(plan, []); 
        if (saveRes.success) {
            return Result.success(undefined);
        }
        return Result.error(saveRes.error);
    }
}

// --- Tag Use Cases ---
export class GetTagsUseCase { async execute() { return TagRepository.getAllTags(); } }
export class CreateTagUseCase { async execute(name: string, colorHex?: string) { return TagRepository.createTag({ id: crypto.randomUUID(), name, colorHex: colorHex || '#6366f1', createdAt: Date.now() }); } }
export class UpdateTagUseCase { async execute(tag: TagEntity) { return TagRepository.updateTag(tag); } }
export class DeleteTagUseCase { async execute(id: string) { return TagRepository.deleteTag(id); } }

// --- Session Use Cases ---
export class StartSessionUseCase { async execute(userId: string, taskId: string | null) { return SessionRepository.createSession({ id: crypto.randomUUID(), userId, taskId: taskId || '', startTs: Date.now(), endTs: 0, durationMinutes: 0, interruptionsCount: 0 }); } }

export class StopSessionUseCase { 
    async execute(sessionId: string, durationMinutes: number) { 
        const session = DatabaseService.sessions.getById(sessionId);
        if (!session) return Result.notFound("Session not found");

        const updated = {
            ...session,
            endTs: Date.now(),
            durationMinutes: durationMinutes
        };
        return SessionRepository.updateSession(updated); 
    } 
}

export class RecordInterruptionUseCase { async execute(sessionId: string) { return Result.success(undefined); } }

// --- Suggestion Use Cases ---
export class AcceptSuggestionUseCase { async execute(userId: string, suggestionId: string, action: any, targetPlanId?: string) { return Result.success("MOCK"); } } 
export class RejectSuggestionUseCase { async execute(suggestionId: string) { return SuggestionRepository.updateStatus(suggestionId, SuggestionStatus.REJECTED); } }
export class GetAISuggestionsForPeriodUseCase { async execute(userId: string, start: number, end: number, context: any) { return Result.success([]); } } 

// --- Chat Use Cases ---
export class GetChatThreadsUseCase { async execute(userId: string) { return Result.success(ChatRepository.getThreads(userId)); } }
export class CreateChatThreadUseCase { async execute(userId: string, title?: string) { return Result.success(ChatRepository.createThread(userId, title || 'New Chat')); } }
export class RenameChatThreadUseCase { async execute(userId: string, threadId: string, title: string) { return Result.success(ChatRepository.updateThreadTitle(userId, threadId, title)); } }
export class DeleteChatThreadUseCase { async execute(userId: string, threadId: string) { return Result.success(ChatRepository.deleteThread(userId, threadId)); } }
export class SendChatMessageUseCase { async execute(userId: string, threadId: string, text: string) { return Result.success({ id: 'mock', userId, threadId, role: 'model', text: 'Mock response', timestamp: Date.now() }); } }

// --- Habit Use Cases ---
export class CreateHabitUseCase { async execute(habit: Habit) { return HabitRepository.createHabit(habit); } }
export class MarkHabitDoneUseCase { async execute(id: string) { return Result.success(undefined); } }
export class UseRepairTokenUseCase { async execute(id: string, date: number) { return Result.success(undefined); } }

// --- Plan Use Cases ---
export class GetPlanUseCase { async execute(userId: string, type: PlanType, start: number) { return PlanRepository.getPlanForPeriod(userId, type, start); } }
export class CreateOrUpdatePlanUseCase { async execute(plan: Plan, entries: PlanEntry[]) { return PlanRepository.createOrUpdatePlan(plan, entries); } }


// --- GOAL Integration Use Cases ---

export class RecalcGoalProgressUseCase {
    async execute(goalId: string): Promise<RepoResult<number>> {
        const goalRes = GoalRepository.getById(goalId);
        if (!goalRes) return Result.notFound("Goal not found");
        
        const goal = goalRes;
        
        // 1. Fetch all related tasks
        const allUserTasks = TaskRepository.getTasksForUser(goal.ownerId).data;
        const goalTasks = allUserTasks.filter(t => t.goalId === goalId);
        const totalTasks = goalTasks.length;
        const completedTasks = goalTasks.filter(t => t.status === TaskStatus.DONE).length;
        const taskProgress = totalTasks > 0 ? (completedTasks / totalTasks) : 0;

        // 2. Auto-update roadmap status based on linked tasks
        // If a stage has tasks and they are all DONE, the stage should be marked completed automatically.
        const updatedRoadmap = goal.roadmap.map(m => {
            const stageTasks = goalTasks.filter(t => t.stageId === m.id);
            if (stageTasks.length > 0) {
                return { ...m, completed: stageTasks.every(t => t.status === TaskStatus.DONE) };
            }
            return m; // If no tasks in stage, keep manual completion status
        });
        
        // Update goal with synced roadmap
        goal.roadmap = updatedRoadmap;

        // 3. Habits
        const habits = HabitRepository.getHabitsForUser(goal.ownerId).data.filter(h => h.goalId === goalId);
        let habitScore = 0;
        if (habits.length > 0) {
            let totalConsistency = 0;
            habits.forEach(h => {
                // Consistency Score (0-100% based on streak/history)
                const now = Date.now();
                const thirtyDaysAgo = now - (30 * 86400000);
                const hits = h.history.filter(ts => ts >= thirtyDaysAgo).length;
                const expected = h.frequency === HabitFrequency.DAILY ? 30 : 4;
                const consistency = Math.min(1, hits / expected);
                totalConsistency += consistency;
            });
            habitScore = totalConsistency / habits.length;
        }

        // 4. Roadmap Score
        const totalMilestones = goal.roadmap.length;
        const completedMilestones = goal.roadmap.filter(m => m.completed).length;
        const roadmapScore = totalMilestones > 0 ? (completedMilestones / totalMilestones) : 0;

        // WEIGHTS CONFIG
        const taskWeight = 0.5; 
        const habitWeight = 0.2;
        const roadmapWeight = 0.3;

        let activeWeights = 0;
        if (totalTasks > 0) activeWeights += taskWeight;
        if (habits.length > 0) activeWeights += habitWeight;
        if (totalMilestones > 0) activeWeights += roadmapWeight;

        let finalProgress = 0;
        if (activeWeights > 0) {
            const raw = (taskProgress * taskWeight) + 
                        (habitScore * habitWeight) + 
                        (roadmapScore * roadmapWeight);
            finalProgress = Math.round((raw / activeWeights) * 100);
        } else if (totalTasks === 0 && habits.length === 0 && totalMilestones === 0) {
            // Empty goal is 0%
            finalProgress = 0;
        }

        // Automatic Status Update Logic
        let newStatus = goal.status;
        
        if (finalProgress === 100) {
            newStatus = GoalStatus.COMPLETED;
        } else if (goal.status !== GoalStatus.PAUSED && goal.status !== GoalStatus.COMPLETED) {
            const now = Date.now();
            const totalDuration = goal.endDate - goal.startDate;
            const elapsed = now - goal.startDate;
            
            if (totalDuration > 0) {
                const timeRatio = elapsed / totalDuration;
                // If 75% of time passed but less than 50% progress -> At Risk
                if (timeRatio > 0.75 && finalProgress < 50) {
                    newStatus = GoalStatus.AT_RISK;
                } else if (newStatus === GoalStatus.AT_RISK && finalProgress >= 50) {
                    newStatus = GoalStatus.ACTIVE;
                }
            }
        }

        const updatedGoal = { 
            ...goal, 
            progress: finalProgress, 
            status: newStatus,
            updatedAt: Date.now() 
        };
        GoalRepository.update(updatedGoal);
        
        // SYNC TRIGGER: Progress changed
        await UseCases.syncGoalToNodes.execute(goalId);

        return Result.success(finalProgress);
    }
}

export class LinkTaskToGoalUseCase {
    async execute(goalId: string, taskId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const taskRes = TaskRepository.getTaskById(taskId);
        if (!taskRes.success) return Result.error(taskRes.error);
        const task = taskRes.data;

        task.goalId = goalId;
        TaskRepository.updateTask(task);

        if (!goal.linkedTasksIds.includes(taskId)) {
            goal.linkedTasksIds.push(taskId);
            GoalRepository.update(goal);
        }

        await UseCases.recalcGoalProgress.execute(goalId);
        return Result.success(undefined);
    }
}

export class UnlinkTaskFromGoalUseCase {
    async execute(goalId: string, taskId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const taskRes = TaskRepository.getTaskById(taskId);
        if (taskRes.success) {
            const task = taskRes.data;
            task.goalId = null;
            TaskRepository.updateTask(task);
        }

        goal.linkedTasksIds = goal.linkedTasksIds.filter(id => id !== taskId);
        GoalRepository.update(goal);

        await UseCases.recalcGoalProgress.execute(goalId);
        return Result.success(undefined);
    }
}

export class LinkHabitToGoalUseCase {
    async execute(goalId: string, habitId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const habitRes = HabitRepository.getHabitById(habitId);
        if (!habitRes.success) return Result.error(habitRes.error);
        const habit = habitRes.data;

        habit.goalId = goalId;
        HabitRepository.updateHabit(HabitMapper.toDomain(habit));

        if (!goal.linkedHabitsIds.includes(habitId)) {
            goal.linkedHabitsIds.push(habitId);
            GoalRepository.update(goal);
        }

        await UseCases.recalcGoalProgress.execute(goalId);
        return Result.success(undefined);
    }
}

export class UnlinkHabitFromGoalUseCase {
    async execute(goalId: string, habitId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const habitRes = HabitRepository.getHabitById(habitId);
        if (habitRes.success) {
            const habit = habitRes.data;
            habit.goalId = null;
            HabitRepository.updateHabit(HabitMapper.toDomain(habit));
        }

        goal.linkedHabitsIds = goal.linkedHabitsIds.filter(id => id !== habitId);
        GoalRepository.update(goal);

        await UseCases.recalcGoalProgress.execute(goalId);
        return Result.success(undefined);
    }
}

// --- GOAL DETAILS SPECIFIC USE CASES ---

export class GenerateGoalReportUseCase {
    async execute(goalId: string): Promise<RepoResult<GoalReviewReport>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const tasks = TaskRepository.getTasksForUser(goal.ownerId).data.filter(t => t.goalId === goalId);
        
        // Metrics Calculation
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newTasks = tasks.filter(t => t.createdAt > sevenDaysAgo).length;
        
        const sessionsRes = SessionRepository.getSessionsForTask(""); // Hack: Get all user sessions
        const allSessions = sessionsRes.data.filter(s => s.userId === goal.ownerId); 
        // Filter sessions related to this goal's tasks
        const goalSessionMinutes = allSessions
            .filter(s => tasks.some(t => t.id === s.taskId))
            .reduce((acc, s) => acc + s.durationMinutes, 0);

        const metrics = {
            totalTasks,
            completedTasks,
            newTasks,
            sessionMinutes: goalSessionMinutes,
            totalStages: goal.roadmap.length,
            stagesDone: goal.roadmap.filter(r => r.completed).length,
            kpiValues: goal.kpis
        };

        const report = await AISimulator.generateGoalReview(goal, metrics, 'WEEK');
        if (!report) return Result.error({type: 'UNKNOWN', message: 'Failed to generate report'});
        
        return Result.success(report);
    }
}

export class RunGoalRealityCheckUseCase {
    async execute(goalId: string): Promise<RepoResult<GoalAnalysis>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const tasks = TaskRepository.getTasksForUser(goal.ownerId).data.filter(t => t.goalId === goalId);
        
        // Simulate activity level (avg focus minutes per day last 7 days)
        const activityLevel = 45; 

        const context = {
            tasksCount: tasks.length,
            activityLevel
        };

        const analysis = await AISimulator.assessGoalRisk(goal, context);
        if (!analysis) return Result.error({type: 'UNKNOWN', message: 'AI Analysis Failed'});

        return Result.success(analysis);
    }
}

export class AddStageToGoalUseCase {
    async execute(goalId: string, title: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const newStage: RoadmapNode = {
            id: crypto.randomUUID(),
            title: title.trim(),
            completed: false
        };

        goal.roadmap.push(newStage);
        goal.updatedAt = Date.now();
        GoalRepository.update(goal);
        
        await UseCases.recalcGoalProgress.execute(goalId);
        return Result.success(undefined);
    }
}

export class StartGoalSessionUseCase {
    async execute(goalId: string): Promise<RepoResult<string>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        // Find best task to start: High Priority TODO -> Any TODO -> Create Dummy
        const tasks = TaskRepository.getTasksForUser(goal.ownerId).data.filter(t => t.goalId === goalId && t.status === TaskStatus.TODO);
        
        let targetTaskId: string;
        
        const highPriority = tasks.find(t => t.priority === Priority.HIGH);
        if (highPriority) targetTaskId = highPriority.id;
        else if (tasks.length > 0) targetTaskId = tasks[0].id;
        else {
            // Create temporary focus task
            const res = await UseCases.createTask.execute(
                goal.ownerId, 
                `Focus: ${goal.title}`, 
                Priority.MEDIUM, 
                EnergyLevel.MEDIUM, 
                25, 
                undefined, 
                [], 
                undefined, 
                undefined, 
                undefined, 
                goalId
            );
            if (!res.success) return Result.error(res.error);
            targetTaskId = res.data;
        }

        return Result.success(targetTaskId);
    }
}

export class DeleteGoalUseCase {
    async execute(goalId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        // 1. Unlink all tasks
        const tasks = TaskRepository.getTasksForUser(goal.ownerId).data.filter(t => t.goalId === goalId);
        tasks.forEach(t => {
            t.goalId = null;
            TaskRepository.updateTask(TaskMapper.toDomain(t));
        });

        // 2. Unlink habits
        const habits = HabitRepository.getHabitsForUser(goal.ownerId).data.filter(h => h.goalId === goalId);
        habits.forEach(h => {
            h.goalId = null;
            HabitRepository.updateHabit(HabitMapper.toDomain(h));
        });

        // 3. Delete Map Node
        const nodes = MapRepository.getNodesByGoalId(goalId);
        if (nodes.success) {
            nodes.data.forEach(n => MapRepository.deleteNode(n.id));
        }

        // 4. Delete Goal (Soft delete logic handled in DB service for map sync safety, but here generic delete)
        // Note: GenericDAO delete is hard delete.
        // We'll soft delete by updating status to ARCHIVED if we had that status, but for MVP hard delete
        // from 'goals' table is fine as long as history/analytics aren't strict dependencies yet.
        // Actually, GoalStatus has no ARCHIVED. We will hard delete from storage.
        const allGoals = GoalRepository.getAll(goal.ownerId);
        const filtered = allGoals.filter(g => g.id !== goalId);
        // Direct storage access hack since Repository generic delete is void
        localStorage.setItem('chronos_db_v2_goals', JSON.stringify(filtered));

        return Result.success(undefined);
    }
}

export class CompleteGoalStageUseCase {
    async execute(goalId: string, stageId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        // 1. Mark tasks as DONE
        const allTasks = TaskRepository.getTasksForUser(goal.ownerId).data;
        const stageTasks = allTasks.filter(t => t.goalId === goalId && t.stageId === stageId);
        for (const task of stageTasks) {
            if (task.status !== TaskStatus.DONE) {
                const updated = { ...task, status: TaskStatus.DONE, doneAt: Date.now() };
                TaskRepository.updateTask(TaskMapper.toDomain(updated));
            }
        }

        // 2. Mark stage KPIs as completed
        const updatedKpis = goal.kpis.map(k => {
            if (k.stageId === stageId) {
                return { ...k, current: k.target, isDone: true };
            }
            return k;
        });

        // 3. Update roadmap stage
        const updatedRoadmap = goal.roadmap.map(s => {
            if (s.id === stageId) {
                return { ...s, completed: true };
            }
            return s;
        });

        // 4. Save Goal
        const updatedGoal = { 
            ...goal, 
            kpis: updatedKpis, 
            roadmap: updatedRoadmap, 
            updatedAt: Date.now() 
        };
        GoalRepository.update(updatedGoal);

        // 5. Trigger general progress recalc
        await UseCases.recalcGoalProgress.execute(goalId);

        return Result.success(undefined);
    }
}

// --- MAP & GOAL INTEGRATION USE CASES ---

export class LinkGoalToMapUseCase {
    async execute(mapId: string, goalId: string, position: {x: number, y: number}): Promise<RepoResult<string>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        // Use Goal Title as cache for Label
        const node: MapNodeEntity = {
            id: crypto.randomUUID(),
            mapId,
            type: MapNodeType.GOAL,
            position,
            content: { label: goal.title }, 
            references: { 
                goalId: goalId 
            },
            meta: {
                isDeleted: false,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                version: 1,
                tempId: crypto.randomUUID()
            }
        };

        return MapRepository.createNode(node);
    }
}

export class UnlinkGoalFromMapUseCase {
    async execute(nodeId: string): Promise<RepoResult<void>> {
        // Just deletes the node, Goal remains
        return MapRepository.deleteNode(nodeId);
    }
}

export class SyncGoalToNodesUseCase {
    async execute(goalId: string): Promise<RepoResult<void>> {
        const goal = GoalRepository.getById(goalId);
        if (!goal) return Result.notFound("Goal not found");

        const nodesRes = MapRepository.getNodesByGoalId(goalId);
        if (nodesRes.success) {
            nodesRes.data.forEach(node => {
                // One-way sync: Goal Title -> Node Label
                if (node.content.label !== goal.title) {
                    node.content.label = goal.title;
                    MapRepository.updateNode(node);
                }
            });
        }
        return Result.success(undefined);
    }
}

export class UpdateGoalUseCase {
    // Override standard update to include Map Sync
    async execute(goal: GoalEntity): Promise<RepoResult<void>> {
        try {
            GoalRepository.update(goal);
            // Trigger Sync
            await UseCases.syncGoalToNodes.execute(goal.id);
            return Result.success(undefined);
        } catch (e: any) {
            return Result.dbError(e.message);
        }
    }
}

export class RecalculateMapProgressUseCase {
    async execute(mapId: string, userId: string): Promise<RepoResult<MapNodeEntity[]>> {
        // Fetch all raw data needed
        const nodesRes = MapRepository.getNodesByMapId(mapId);
        const edgesRes = MapRepository.getEdgesByMapId(mapId); // Assuming we add this method to repo
        const tasksRes = TaskRepository.getTasksForUser(userId);
        const habitsRes = HabitRepository.getHabitsForUser(userId);

        if (!nodesRes.success) return Result.error(nodesRes.error);
        const edges = edgesRes.success ? edgesRes.data : [];
        const tasks = tasksRes.success ? tasksRes.data : [];
        const habits = habitsRes.success ? habitsRes.data : [];

        // Run calculation logic
        const updatedNodes = MapProgressService.recalculateMap(nodesRes.data, edges, tasks, habits);

        // Optional: Persist calculated progress? 
        // For MVP, we might just return it to the View, or save it to DB if we want offline caching.
        // Let's save it to DB to ensure consistency across reloads.
        updatedNodes.forEach(node => MapRepository.updateNode(node));

        return Result.success(updatedNodes);
    }
}

// --- RE-EXPORT INSTANCES ---

export const UseCases = {
    // Tasks
    createTask: new CreateTaskUseCase(),
    updateTask: new UpdateTaskUseCase(),
    deleteTask: new DeleteTaskUseCase(),
    restoreTask: new RestoreTaskUseCase(),
    toggleTask: new ToggleTaskStatusUseCase(),
    addTaskToWeeklyPlan: new AddTaskToWeeklyPlanUseCase(),
    
    // Suggestion
    acceptSuggestion: new AcceptSuggestionUseCase(),
    rejectSuggestion: new RejectSuggestionUseCase(),
    getAISuggestions: new GetAISuggestionsForPeriodUseCase(),
    
    // Chat
    sendChatMessage: new SendChatMessageUseCase(),
    getChatThreads: new GetChatThreadsUseCase(),
    createChatThread: new CreateChatThreadUseCase(),
    deleteChatThread: new DeleteChatThreadUseCase(),
    renameChatThread: new RenameChatThreadUseCase(),

    // Session
    startSession: new StartSessionUseCase(),
    stopSession: new StopSessionUseCase(),
    recordInterruption: new RecordInterruptionUseCase(),
    
    // Habits
    createHabit: new CreateHabitUseCase(),
    markHabitDone: new MarkHabitDoneUseCase(),
    useRepairToken: new UseRepairTokenUseCase(),

    // Plans
    getPlan: new GetPlanUseCase(),
    createOrUpdatePlan: new CreateOrUpdatePlanUseCase(),

    // Tags
    getTags: new GetTagsUseCase(),
    createTag: new CreateTagUseCase(),
    updateTag: new UpdateTagUseCase(),
    deleteTag: new DeleteTagUseCase(),

    // Goals (Core)
    recalcGoalProgress: new RecalcGoalProgressUseCase(),
    linkTaskToGoal: new LinkTaskToGoalUseCase(),
    unlinkTaskFromGoal: new UnlinkTaskFromGoalUseCase(),
    linkHabitToGoal: new LinkHabitToGoalUseCase(),
    unlinkHabitFromGoal: new UnlinkHabitFromGoalUseCase(),
    updateGoal: new UpdateGoalUseCase(), // Replaces generic update
    
    // Goal Details Actions
    generateGoalReport: new GenerateGoalReportUseCase(),
    runGoalRealityCheck: new RunGoalRealityCheckUseCase(),
    addStageToGoal: new AddStageToGoalUseCase(),
    startGoalSession: new StartGoalSessionUseCase(),
    deleteGoal: new DeleteGoalUseCase(),
    completeGoalStage: new CompleteGoalStageUseCase(),

    // Map Integration
    linkGoalToMap: new LinkGoalToMapUseCase(),
    unlinkGoalFromMap: new UnlinkGoalFromMapUseCase(),
    syncGoalToNodes: new SyncGoalToNodesUseCase(),
    recalculateMapProgress: new RecalculateMapProgressUseCase()
};
