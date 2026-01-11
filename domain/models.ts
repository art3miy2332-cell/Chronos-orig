
import { Priority, EnergyLevel, TaskStatus, HabitFrequency, SuggestionStatus, PlanType, RecurrenceRule } from '../types';

export { PlanType };

// --- Result & Error Types ---

export type RepoError = 
    | { type: 'NOT_FOUND', message: string }
    | { type: 'VALIDATION_ERROR', message: string }
    | { type: 'DATABASE_ERROR', message: string, cause?: any }
    | { type: 'CONFLICT', message: string }
    | { type: 'UNAUTHORIZED', message: string }
    | { type: 'UNKNOWN', message: string };

export type RepoResult<T> = 
    | { success: true, data: T, error?: undefined }
    | { success: false, error: RepoError, data?: undefined };

export const Result = {
    success: <T>(data: T): RepoResult<T> => ({ success: true, data }),
    error: <T>(error: RepoError): RepoResult<T> => ({ success: false, error }),
    // Helpers
    notFound: <T>(msg: string): RepoResult<T> => ({ success: false, error: { type: 'NOT_FOUND', message: msg } }),
    validation: <T>(msg: string): RepoResult<T> => ({ success: false, error: { type: 'VALIDATION_ERROR', message: msg } }),
    dbError: <T>(msg: string, cause?: any): RepoResult<T> => ({ success: false, error: { type: 'DATABASE_ERROR', message: msg, cause } })
};

// --- Domain Models ---

export interface User {
    id: string;
    displayName: string;
    email: string;
    preferredLanguage: 'EN' | 'RU';
    aiTonePreference: 'Formal' | 'Casual' | 'Coach';
    isGuest: boolean;
}

export interface Task {
    id: string;
    userId: string;
    title: string;
    description: string;
    tags: string[];
    priority: Priority;
    estimateMinutes: number;
    deadline?: number;
    
    // Calendar props
    plannedAt?: number;
    durationMinutes?: number;
    recurrence?: RecurrenceRule;
    parentTaskId?: string;

    energyLevel: EnergyLevel;
    status: TaskStatus;
    createdAt: number;
    doneAt?: number;
    createdBy: 'USER' | 'AI';
    suggestedFromId?: string;
    
    // Goal Linking
    goalId?: string | null;
    stageId?: string | null;
}

export interface Session {
    id: string;
    taskId: string;
    userId: string;
    startTs: number;
    endTs?: number; // Nullable if currently running
    durationMinutes: number;
    interruptionsCount: number;
    notes?: string;
}

export interface Habit {
    id: string;
    userId: string;
    title: string;
    description: string;
    frequency: HabitFrequency;
    importance: Priority;
    streak: number;
    history: number[]; // timestamps
    repairTokensRemaining: number;
    reminderTime?: string;
    durationMinutes?: number;
    active: boolean;
    lastDoneAt?: number;
    createdAt: number;
    
    // Goal Linking
    goalId?: string | null;
}

export interface Suggestion {
    id: string;
    userId: string;
    context: string;
    text: string;
    explanation: string;
    confidence: number;
    estimateMinutes: number;
    tags: string[];
    status: SuggestionStatus;
    createdAt: number;
    acceptedAt?: number;
    linkedTaskId?: string;
    linkedPlanEntryId?: string;
    type: string;
    rejectionReason?: string;
}

export interface Plan {
    id: string;
    userId: string;
    type: PlanType;
    periodStart: number;
    periodEnd: number;
    title: string;
    createdAt: number;
    structureJson?: string;
}

export interface PlanEntry {
    id: string;
    planId: string;
    category: string;
    content: string;
    userNote?: string;
    status: 'PENDING' | 'DONE' | 'DRAFT';
    createdAt: number;
    updatedAt: number;
}

export interface SyncQueueItem {
    id: string;
    entityType: 'TASK' | 'SESSION' | 'HABIT' | 'USER' | 'SUGGESTION';
    entityId: string;
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    payloadJson: string;
    createdAt: number;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
}
