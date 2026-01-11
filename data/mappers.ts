
import { TaskEntity, SessionEntity, HabitEntity, SuggestionEntity, UserEntity } from '../types';
import { Task, Session, Habit, Suggestion, User } from '../domain/models';

export const TaskMapper = {
    toDomain: (entity: TaskEntity): Task => ({
        ...entity,
        description: entity.description || '',
        tags: entity.tags || [],
        deadline: entity.deadline,
        doneAt: entity.doneAt,
        suggestedFromId: entity.suggestedFromId || undefined,
        plannedAt: entity.plannedAt,
        durationMinutes: entity.durationMinutes,
        recurrence: entity.recurrence,
        parentTaskId: entity.parentTaskId,
        stageId: entity.stageId
    }),
    toEntity: (domain: Task): TaskEntity => ({
        ...domain,
        description: domain.description,
        deadline: domain.deadline,
        doneAt: domain.doneAt,
        suggestedFromId: domain.suggestedFromId || null,
        plannedAt: domain.plannedAt || undefined,
        durationMinutes: domain.durationMinutes || undefined,
        recurrence: domain.recurrence || undefined,
        parentTaskId: domain.parentTaskId || undefined,
        stageId: domain.stageId || null
    })
};

export const SessionMapper = {
    toDomain: (entity: SessionEntity): Session => ({
        ...entity,
        notes: entity.notes,
        endTs: entity.endTs > 0 ? entity.endTs : undefined
    }),
    toEntity: (domain: Session): SessionEntity => ({
        ...domain,
        notes: domain.notes || undefined,
        endTs: domain.endTs || 0
    })
};

export const HabitMapper = {
    toDomain: (entity: HabitEntity): Habit => ({
        ...entity,
        description: entity.description || '',
        lastDoneAt: entity.lastDoneAt,
        reminderTime: entity.reminderTime,
        durationMinutes: entity.durationMinutes
    }),
    toEntity: (domain: Habit): HabitEntity => ({
        ...domain,
        description: domain.description,
        lastDoneAt: domain.lastDoneAt || undefined,
        reminderTime: domain.reminderTime || undefined,
        durationMinutes: domain.durationMinutes || undefined
    })
};

export const SuggestionMapper = {
    toDomain: (entity: SuggestionEntity): Suggestion => ({
        ...entity,
        acceptedAt: entity.acceptedAt,
        linkedTaskId: entity.linkedTaskId
    }),
    toEntity: (domain: Suggestion): SuggestionEntity => ({
        ...domain,
        acceptedAt: domain.acceptedAt,
        linkedTaskId: domain.linkedTaskId,
        type: domain.type as any
    })
};

export const UserMapper = {
    toDomain: (entity: UserEntity): User => ({
        id: entity.id,
        displayName: entity.displayName,
        email: entity.email,
        preferredLanguage: entity.preferredLanguage,
        aiTonePreference: entity.aiTonePreference,
        isGuest: entity.isGuest
    }),
    // Usually we don't map Domain -> Entity for User fully because Entity has auth data
    toEntityPartial: (domain: User): Partial<UserEntity> => ({
        displayName: domain.displayName,
        preferredLanguage: domain.preferredLanguage,
        aiTonePreference: domain.aiTonePreference
    })
};
