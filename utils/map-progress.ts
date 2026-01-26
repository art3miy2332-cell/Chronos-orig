
import { 
    MapNodeEntity, MapEdgeEntity, MapNodeType, MapNodeProgress, MapNodeHealth,
    TaskEntity, HabitEntity, TaskStatus, HabitFrequency, SpherePlanData, PlanType 
} from '../types';
import { DatabaseService } from './db';

interface Context {
    tasks: TaskEntity[];
    habits: HabitEntity[];
    edges: MapEdgeEntity[];
    nodes: MapNodeEntity[];
}

export const MapProgressService = {

    /**
     * Entry point to recalculate the entire map's progress
     */
    recalculateMap: (nodes: MapNodeEntity[], edges: MapEdgeEntity[], tasks: TaskEntity[], habits: HabitEntity[]): MapNodeEntity[] => {
        const context: Context = { nodes, edges, tasks, habits };
        const updatedNodes = [...nodes];

        // 1. Calculate Leafs (STEPS, HABITS, QUANTITATIVE_PLAN) first
        const cache = new Map<string, MapNodeProgress>();
        const visiting = new Set<string>(); // Cycle detection

        const getProgress = (nodeId: string): MapNodeProgress => {
            if (cache.has(nodeId)) return cache.get(nodeId)!;
            
            // Cycle detection
            if (visiting.has(nodeId)) {
                return createEmptyProgress();
            }

            const node = updatedNodes.find(n => n.id === nodeId);
            if (!node) return createEmptyProgress();

            visiting.add(nodeId);

            let progress: MapNodeProgress;

            try {
                if (node.type === MapNodeType.STEP) {
                    progress = calculateStepProgress(node, context);
                } else if (node.type === MapNodeType.HABIT) {
                    progress = calculateHabitNodeProgress(node, context);
                } else if (node.type === MapNodeType.QUANTITATIVE_PLAN) {
                    progress = calculateQuantitativePlanProgress(node, context);
                } else if (node.type === MapNodeType.GOAL || node.type === MapNodeType.SUBGOAL) {
                    progress = calculateGoalProgress(node, context, getProgress);
                } else if (node.type === MapNodeType.FUTURE_SELF) {
                    progress = calculateFutureSelfProgress(node, context, getProgress);
                } else {
                    progress = createEmptyProgress();
                }
            } finally {
                visiting.delete(nodeId);
            }

            cache.set(nodeId, progress);
            return progress;
        };

        // Execute for all nodes
        updatedNodes.forEach(node => {
            node.progressData = getProgress(node.id);
        });

        return updatedNodes;
    }
};

// --- ALGORITHMS ---

function createEmptyProgress(): MapNodeProgress {
    return {
        value: 0,
        health: MapNodeHealth.STAGNANT,
        lastActivity: 0,
        metrics: { habitConsistency: 0, taskCompletion: 0, childrenProgress: 0 }
    };
}

function calculateStepProgress(node: MapNodeEntity, ctx: Context): MapNodeProgress {
    let value = 0;
    let lastActivity = node.meta.createdAt;

    if (node.references.taskId) {
        const task = ctx.tasks.find(t => t.id === node.references.taskId);
        if (task) {
            value = task.status === TaskStatus.DONE ? 100 : 0;
            lastActivity = task.doneAt || task.updatedAt || task.createdAt;
        }
    }

    return {
        value,
        health: calculateHealth(lastActivity),
        lastActivity,
        metrics: { habitConsistency: 0, taskCompletion: value, childrenProgress: 0 }
    };
}

function calculateHabitNodeProgress(node: MapNodeEntity, ctx: Context): MapNodeProgress {
    if (!node.references.habitId) return createEmptyProgress();
    
    const habit = ctx.habits.find(h => h.id === node.references.habitId);
    if (!habit) return createEmptyProgress();

    const consistency = calculateHabitConsistency(habit);
    const lastActivity = habit.lastDoneAt || habit.createdAt;

    return {
        value: consistency,
        health: calculateHealth(lastActivity),
        lastActivity,
        metrics: { habitConsistency: consistency, taskCompletion: 0, childrenProgress: 0 }
    };
}

function calculateQuantitativePlanProgress(node: MapNodeEntity, ctx: Context): MapNodeProgress {
    if (!node.references.sphereTrackerId) return createEmptyProgress();
    
    // Find tracker in Sphere Plans
    const plans = DatabaseService.plans.getAll().filter(p => p.type === PlanType.SPHERES);
    let foundTracker = null;
    
    for (const plan of plans) {
        if (plan.structureJson) {
            try {
                const data: SpherePlanData = JSON.parse(plan.structureJson);
                const tracker = data.trackers.find(t => t.id === node.references.sphereTrackerId);
                if (tracker) { foundTracker = tracker; break; }
            } catch(e) {}
        }
    }

    if (!foundTracker) return createEmptyProgress();

    const habit = foundTracker.habitId ? ctx.habits.find(h => h.id === foundTracker!.habitId) : null;
    const habitCredits = habit 
        ? habit.history.filter(ts => ts >= foundTracker!.startDate && ts <= foundTracker!.endDate).length 
        : 0;
    
    const totalFilled = (foundTracker.manualIndices?.length || 0) + habitCredits;
    const progress = Math.min(100, Math.round((totalFilled / foundTracker.targetCount) * 100));
    
    const lastActivity = habit?.lastDoneAt || node.meta.createdAt;

    return {
        value: progress,
        health: calculateHealth(lastActivity),
        lastActivity,
        metrics: { habitConsistency: 0, taskCompletion: 0, childrenProgress: 0 }
    };
}

function calculateGoalProgress(
    node: MapNodeEntity, 
    ctx: Context, 
    getter: (id: string) => MapNodeProgress
): MapNodeProgress {
    
    const childEdges = ctx.edges.filter(e => e.sourceNodeId === node.id && (e.relationType === 'CAUSES' || e.relationType === 'LEADS_TO'));
    const childrenIds = childEdges.map(e => e.targetNodeId);
    
    let childrenSum = 0;
    let childrenCount = 0;
    let maxChildrenActivity = node.meta.createdAt;

    childrenIds.forEach(childId => {
        const childNode = ctx.nodes.find(n => n.id === childId);
        if (childNode && childNode.type !== MapNodeType.NOTE) {
            const p = getter(childId);
            childrenSum += p.value;
            childrenCount++;
            if (p.lastActivity > maxChildrenActivity) maxChildrenActivity = p.lastActivity;
        }
    });

    const childrenScore = childrenCount > 0 ? childrenSum / childrenCount : 0;

    let habitsScore = 0;
    let habitsCount = 0;

    if (node.references.goalId) {
        const goalHabits = ctx.habits.filter(h => h.goalId === node.references.goalId);
        habitsCount = goalHabits.length;
        if (habitsCount > 0) {
            let totalHabitConsistency = 0;
            goalHabits.forEach(h => {
                const c = calculateHabitConsistency(h);
                totalHabitConsistency += c;
                if ((h.lastDoneAt || 0) > maxChildrenActivity) maxChildrenActivity = h.lastDoneAt!;
            });
            habitsScore = totalHabitConsistency / habitsCount;
        }
    }

    const wChildren = habitsCount > 0 ? 0.7 : 1.0;
    const wHabits = habitsCount > 0 ? 0.3 : 0;

    const totalValue = (childrenScore * wChildren) + (habitsScore * wHabits);

    return {
        value: Math.round(totalValue),
        health: calculateHealth(maxChildrenActivity),
        lastActivity: maxChildrenActivity,
        metrics: {
            childrenProgress: childrenScore,
            habitConsistency: habitsScore,
            taskCompletion: 0
        }
    };
}

function calculateFutureSelfProgress(
    node: MapNodeEntity, 
    ctx: Context, 
    getter: (id: string) => MapNodeProgress
): MapNodeProgress {
    const incomingEdges = ctx.edges.filter(e => e.targetNodeId === node.id);
    if (incomingEdges.length === 0) return createEmptyProgress();

    let sum = 0;
    let validCount = 0;
    let maxActivity = 0;

    incomingEdges.forEach(e => {
        const sourceNode = ctx.nodes.find(n => n.id === e.sourceNodeId);
        if (sourceNode && sourceNode.type !== MapNodeType.NOTE) {
            const p = getter(e.sourceNodeId);
            sum += p.value;
            validCount++;
            if (p.lastActivity > maxActivity) maxActivity = p.lastActivity;
        }
    });

    const avg = validCount > 0 ? sum / validCount : 0;

    return {
        value: Math.round(avg),
        health: calculateHealth(maxActivity),
        lastActivity: maxActivity,
        metrics: { childrenProgress: avg, habitConsistency: 0, taskCompletion: 0 }
    };
}

// --- HELPER FUNCTIONS ---

function calculateHabitConsistency(habit: HabitEntity): number {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 86400000);
    const hits = habit.history.filter(ts => ts >= thirtyDaysAgo).length;
    const expected = habit.frequency === HabitFrequency.DAILY ? 30 : 4;
    return Math.min(100, Math.round((hits / expected) * 100));
}

function calculateHealth(lastActivityTs: number): MapNodeHealth {
    const now = Date.now();
    const diffDays = (now - lastActivityTs) / 86400000;
    if (diffDays <= 7) return MapNodeHealth.HEALTHY;
    if (diffDays <= 14) return MapNodeHealth.AT_RISK;
    return MapNodeHealth.STAGNANT;
}
