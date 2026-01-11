import { 
    UserEntity, TaskEntity, SessionEntity, HabitEntity, 
    SuggestionEntity, PlanEntity, PlanEntryEntity, ReportEntity, TagEntity, GoalEntity,
    TaskStatus, Priority, EnergyLevel, HabitFrequency, SuggestionStatus, PlanType,
    MapNodeEntity, MapEdgeEntity, LifeMapEntity
} from '../types';
import { SEED_HABITS, SEED_PLANS, SEED_PLAN_ENTRIES, SEED_SESSIONS, SEED_SUGGESTIONS, SEED_TAGS, SEED_TASKS } from '../constants';

const DB_PREFIX = 'chronos_db_v2_';
const TABLES = {
    USERS: `${DB_PREFIX}users`,
    TASKS: `${DB_PREFIX}tasks`,
    SESSIONS: `${DB_PREFIX}sessions`,
    HABITS: `${DB_PREFIX}habits`,
    SUGGESTIONS: `${DB_PREFIX}suggestions`,
    PLANS: `${DB_PREFIX}plans`,
    PLAN_ENTRIES: `${DB_PREFIX}plan_entries`,
    REPORTS: `${DB_PREFIX}reports`,
    TAGS: `${DB_PREFIX}tags`,
    GOALS: `${DB_PREFIX}goals`,
    LIFE_MAPS: `${DB_PREFIX}maps`,
    MAP_NODES: `${DB_PREFIX}map_nodes`,
    MAP_EDGES: `${DB_PREFIX}map_edges`
};

class GenericDao<T extends { id: string }> {
    constructor(private tableName: string) {}

    getAll(): T[] {
        try {
            const data = localStorage.getItem(this.tableName);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error(`[DB] Error reading ${this.tableName}`, e);
            return [];
        }
    }

    getById(id: string): T | undefined {
        return this.getAll().find(item => String(item.id) === String(id));
    }

    insert(item: T): void {
        const items = this.getAll();
        // Prevent duplicate IDs
        if (items.some(i => i.id === item.id)) {
            this.update(item);
            return;
        }
        items.push(item);
        this.save(items);
    }

    update(item: T): void {
        const items = this.getAll();
        const index = items.findIndex(i => i.id === item.id);
        if (index !== -1) {
            items[index] = { ...items[index], ...item };
            this.save(items);
        } else {
            this.insert(item);
        }
    }

    delete(id: string): boolean {
        const targetId = String(id);
        const items = this.getAll();
        const filtered = items.filter(i => String(i.id) !== targetId);
        if (filtered.length !== items.length) {
            this.save(filtered);
            return true;
        }
        return false;
    }

    save(items: T[]): void {
        if (!Array.isArray(items)) {
            console.error(`[DB] Critical: Attempted to save non-array data to ${this.tableName}`);
            return;
        }
        try {
            localStorage.setItem(this.tableName, JSON.stringify(items));
            // Verify write
            const verify = localStorage.getItem(this.tableName);
            if (!verify && items.length > 0) {
                throw new Error("Storage write verification failed");
            }
        } catch (e) {
            console.error(`[DB] Write error for ${this.tableName}`, e);
            alert("Ошибка сохранения данных. Возможно, память устройства переполнена.");
        }
    }
}

class TaskDao extends GenericDao<TaskEntity> {
    getByUserId(userId: string): TaskEntity[] {
        return this.getAll().filter(t => t.userId === userId);
    }
}

class SessionDao extends GenericDao<SessionEntity> {
    getByTaskId(taskId: string): SessionEntity[] {
        return this.getAll().filter(s => s.taskId === taskId);
    }
}

class PlanDao extends GenericDao<PlanEntity> {
    getActivePlan(userId: string, type: PlanType): PlanEntity | undefined {
        return this.getAll()
            .filter(p => p.userId === userId && p.type === type)
            .sort((a, b) => b.createdAt - a.createdAt)[0];
    }
}

class PlanEntryDao extends GenericDao<PlanEntryEntity> {
    getByPlanId(planId: string): PlanEntryEntity[] {
        return this.getAll().filter(e => e.planId === planId);
    }
}

class MapNodeDao extends GenericDao<MapNodeEntity> {
    getByMapId(mapId: string): MapNodeEntity[] {
        return this.getAll().filter(n => n.mapId === mapId);
    }
}

class MapEdgeDao extends GenericDao<MapEdgeEntity> {
    getByMapId(mapId: string): MapEdgeEntity[] {
        return this.getAll().filter(e => e.mapId === mapId);
    }
}

export const DatabaseService = {
    users: new GenericDao<UserEntity>(TABLES.USERS),
    tasks: new TaskDao(TABLES.TASKS),
    sessions: new SessionDao(TABLES.SESSIONS),
    habits: new GenericDao<HabitEntity>(TABLES.HABITS),
    suggestions: new GenericDao<SuggestionEntity>(TABLES.SUGGESTIONS),
    plans: new PlanDao(TABLES.PLANS),
    planEntries: new PlanEntryDao(TABLES.PLAN_ENTRIES),
    reports: new GenericDao<ReportEntity>(TABLES.REPORTS),
    tags: new GenericDao<TagEntity>(TABLES.TAGS),
    goals: new GenericDao<GoalEntity>(TABLES.GOALS),
    maps: new GenericDao<LifeMapEntity>(TABLES.LIFE_MAPS),
    mapNodes: new MapNodeDao(TABLES.MAP_NODES),
    mapEdges: new MapEdgeDao(TABLES.MAP_EDGES),

    init: () => {
        const initialized = localStorage.getItem(`${DB_PREFIX}initialized`);
        if (!initialized) {
            DatabaseService.tags.save(SEED_TAGS);
            DatabaseService.tasks.save(SEED_TASKS);
            DatabaseService.habits.save(SEED_HABITS);
            DatabaseService.suggestions.save(SEED_SUGGESTIONS);
            DatabaseService.sessions.save(SEED_SESSIONS);
            DatabaseService.plans.save(SEED_PLANS);
            DatabaseService.planEntries.save(SEED_PLAN_ENTRIES);
            localStorage.setItem(`${DB_PREFIX}initialized`, 'true');
        }
    },

    getUserDashboardMetrics: (userId: string) => {
        const tasks = DatabaseService.tasks.getByUserId(userId);
        const pending = tasks.filter(t => t.status !== TaskStatus.DONE).length;
        const sessions = DatabaseService.sessions.getAll().filter(s => s.userId === userId);
        const totalFocusMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
        return { pendingTasks: pending, totalFocusMinutes };
    }
};