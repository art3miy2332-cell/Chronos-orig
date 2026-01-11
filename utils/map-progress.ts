
import { 
    MapNodeEntity, MapEdgeEntity, MapNodeType, MapNodeProgress, MapNodeHealth,
    TaskEntity, HabitEntity, TaskStatus, HabitFrequency 
} from '../types';

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

        // 1. Calculate Leafs (STEPS, HABITS) first
        // In a DAG, we should technically do topological sort, but for simplicity we iterate levels.
        // We will implement a memoized recursive calculator.
        
        const cache = new Map<string, MapNodeProgress>();
        const visiting = new Set<string>(); // Cycle detection

        const getProgress = (nodeId: string): MapNodeProgress => {
            if (cache.has(nodeId)) return cache.get(nodeId)!;
            
            // Cycle detection: If we are currently visiting this node in the recursion stack, return placeholder
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
                    // Standalone Habit Node
                    progress = calculateHabitNodeProgress(node, context);
                } else if (node.type === MapNodeType.GOAL || node.type === MapNodeType.SUBGOAL) {
                    progress = calculateGoalProgress(node, context, getProgress);
                } else if (node.type === MapNodeType.FUTURE_SELF) {
                    progress = calculateFutureSelfProgress(node, context, getProgress);
                } else if (node.type === MapNodeType.NOTE) {
                    // Notes do not contribute to progress
                    progress = createEmptyProgress();
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

/**
 * STEP PROGRESS
 * Binary logic based on Linked Task.
 */
function calculateStepProgress(node: MapNodeEntity, ctx: Context): MapNodeProgress {
    let value = 0;
    let lastActivity = node.meta.createdAt;

    if (node.references.taskId) {
        const task = ctx.tasks.find(t => t.id === node.references.taskId);
        if (task) {
            value = task.status === TaskStatus.DONE ? 100 : 0;
            // Use doneAt if done, otherwise updatedAt, otherwise createdAt
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

/**
 * HABIT NODE PROGRESS
 * Consistency Score (rolling 30 days).
 */
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

/**
 * GOAL PROGRESS (Aggregator)
 * Weighted average of:
 * 1. Children Nodes (60%)
 * 2. Direct Linked Tasks (20%)
 * 3. Linked Habits (20%)
 */
function calculateGoalProgress(
    node: MapNodeEntity, 
    ctx: Context, 
    getter: (id: string) => MapNodeProgress
): MapNodeProgress {
    
    // 1. Children Nodes (Subgoals, Steps) - EXCLUDING NOTES
    const childEdges = ctx.edges.filter(e => e.sourceNodeId === node.id && (e.relationType === 'CAUSES' || e.relationType === 'LEADS_TO'));
    const childrenIds = childEdges.map(e => e.targetNodeId);
    
    let childrenSum = 0;
    let childrenCount = 0;
    let maxChildrenActivity = node.meta.createdAt;

    childrenIds.forEach(childId => {
        const childNode = ctx.nodes.find(n => n.id === childId);
        // Explicitly exclude NOTES from calculation
        if (childNode && childNode.type !== MapNodeType.NOTE) {
            const p = getter(childId);
            childrenSum += p.value;
            childrenCount++;
            if (p.lastActivity > maxChildrenActivity) maxChildrenActivity = p.lastActivity;
        }
    });

    const childrenScore = childrenCount > 0 ? childrenSum / childrenCount : 0;

    // 2. Direct Linked Tasks (not nodes, but tasks linked via ID ref in GoalEntity)
    // Note: MapNode doesn't store task lists directly usually, but GoalEntity does.
    // We need to look up GoalEntity to get linkedTasksIds if we want that precision.
    // However, for Map logic, we usually rely on graph topology (Children Steps).
    // Let's stick to GRAPH TOPOLOGY for simplicity + any tasks linked directly to this Node if mapped.
    
    // If the node represents a GoalEntity, we might want to check that entity.
    let directTasksScore = 0;
    let habitsScore = 0;
    let habitsCount = 0;

    if (node.references.goalId) {
        // Look up Habits linked to this Goal
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

    // WEIGHTS
    // If no habits, redistribute weight to children
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
            taskCompletion: 0 // abstracted into children usually
        }
    };
}

/**
 * FUTURE SELF PROGRESS
 * Average of all top-level Goals connected to it.
 */
function calculateFutureSelfProgress(
    node: MapNodeEntity, 
    ctx: Context, 
    getter: (id: string) => MapNodeProgress
): MapNodeProgress {
    
    // Incoming edges to Future Self (Goals leading to it)
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
    
    // Count completions in window
    const hits = habit.history.filter(ts => ts >= thirtyDaysAgo).length;
    
    // Expected hits
    // Daily: 30
    // Weekly: 4
    const expected = habit.frequency === HabitFrequency.DAILY ? 30 : 4;
    
    // Cap at 100% (extra credit doesn't push > 100)
    return Math.min(100, Math.round((hits / expected) * 100));
}

function calculateHealth(lastActivityTs: number): MapNodeHealth {
    const now = Date.now();
    const diffDays = (now - lastActivityTs) / 86400000;

    if (diffDays <= 7) return MapNodeHealth.HEALTHY;
    if (diffDays <= 14) return MapNodeHealth.AT_RISK;
    return MapNodeHealth.STAGNANT;
}
