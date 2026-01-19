
export enum Priority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    DONE = 'DONE'
}

export enum EnergyLevel {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

export enum HabitFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY'
}

export enum SuggestionStatus {
    PROPOSED = 'PROPOSED',
    ACCEPTED = 'ACCEPTED',
    REJECTED = 'REJECTED'
}

export enum PlanType {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY'
}

export enum GoalStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    PAUSED = 'PAUSED',
    AT_RISK = 'AT_RISK'
}

export enum GoalType {
    GLOBAL = 'GLOBAL',
    SITUATIONAL = 'SITUATIONAL'
}

export enum KPIType {
    QUANTITATIVE = 'QUANTITATIVE',
    FREQUENCY = 'FREQUENCY',
    OUTCOME = 'OUTCOME'
}

export enum MapNodeType {
    GOAL = 'GOAL',
    SUBGOAL = 'SUBGOAL',
    STEP = 'STEP',
    HABIT = 'HABIT',
    CURRENT_SELF = 'CURRENT_SELF',
    FUTURE_SELF = 'FUTURE_SELF',
    NOTE = 'NOTE',
    LIMITATION = 'LIMITATION'
}

export enum MapEdgeType {
    CAUSES = 'CAUSES',
    BLOCKS = 'BLOCKS',
    REQUIRES = 'REQUIRES',
    LEADS_TO = 'LEADS_TO'
}

export enum MapNodeHealth {
    HEALTHY = 'HEALTHY',
    AT_RISK = 'AT_RISK',
    STAGNANT = 'STAGNANT'
}

export enum AnalysisRuleId {
    VISION_GAP = 'VISION_GAP',
    ORPHAN_NODE = 'ORPHAN_NODE',
    HOLLOW_GOAL = 'HOLLOW_GOAL'
}

export enum RecurrenceFrequency {
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY'
}

export type MapActionType = 'INIT' | 'ADD_NODE' | 'MOVE_NODE' | 'EDIT_CONTENT' | 'CONNECT' | 'DISCONNECT' | 'DELETE_NODE';

export type TimerStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'FINISHED';
export type FocusMode = 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

export interface CurrentSelfData {
    metrics: {
        averageEnergy: number;
        completionRate: number;
        focusCapacityMin: number;
    };
    constraints: {
        availableHoursDaily: number;
        financialRunway?: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    audit: {
        weaknesses: string[];
        blockers: string[];
        lastCheck: number;
    };
}

export interface FutureSelfData {
    horizon: {
        targetDate: number;
        label: string;
    };
    identity: {
        roleTitle: string;
        incomeTarget?: string;
        locationTarget?: string;
        tags?: string[]; 
    };
    requirements: {
        skills: string[];
        traits: string[];
    };
    gapMetrics?: {
        feasibilityScore: number;
    };
}

export interface UserEntity {
    id: string;
    displayName: string;
    email: string;
    passwordHash?: string;
    createdAt: number;
    updatedAt: number;
    lastLoginAt: number;
    preferredLanguage: 'EN' | 'RU';
    aiTonePreference: 'Formal' | 'Casual' | 'Coach';
    isGuest: boolean;
    theme: 'light' | 'dark';
    notifications: boolean;
    onboardingCompleted: boolean;
    coachingProfile: CoachingProfile;
    role?: string;
    lastDailyReview?: number;
    lastWeeklyReview?: number;
    lastMonthlyReview?: number;
    calendarSettings?: CalendarSettings;
}

export interface CoachingProfile {
    mainGoal: string;
    biggestObstacle: string;
    productiveHours: 'MORNING' | 'AFTERNOON' | 'NIGHT';
    motivationStyle: 'ANALYTICAL' | 'GENTLE_SUPPORT' | 'TOUGH_LOVE';
}

export interface TaskEntity {
    id: string;
    userId: string;
    title: string;
    description?: string;
    tags: string[];
    priority: Priority;
    estimateMinutes: number;
    energyLevel: EnergyLevel;
    status: TaskStatus;
    deadline?: number;
    createdAt: number;
    updatedAt?: number;
    doneAt?: number;
    createdBy: 'USER' | 'AI';
    suggestedFromId?: string | null;
    plannedAt?: number;
    durationMinutes?: number;
    recurrence?: RecurrenceRule;
    parentTaskId?: string;
    goalId?: string | null;
    stageId?: string | null;
    showOnDashboard?: boolean;
}

export interface HabitEntity {
    id: string;
    userId: string;
    title: string;
    description?: string;
    frequency: HabitFrequency;
    importance: Priority;
    streak: number;
    history: number[];
    repairTokensRemaining: number;
    active: boolean;
    lastDoneAt?: number;
    createdAt: number;
    reminderTime?: string;
    durationMinutes?: number;
    goalId?: string | null;
}

export interface SuggestionEntity {
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
    type: string;
    rejectionReason?: string;
}

export interface TagEntity {
    id: string;
    name: string;
    colorHex: string;
    createdAt: number;
}

export interface SessionEntity {
    id: string;
    userId: string;
    taskId: string;
    startTs: number;
    endTs: number;
    durationMinutes: number;
    interruptionsCount: number;
    notes?: string;
}

export interface PlanEntity {
    id: string;
    userId: string;
    type: PlanType;
    periodStart: number;
    periodEnd: number;
    title: string;
    createdAt: number;
    updatedAt?: number;
    structureJson?: string;
}

export interface PlanEntryEntity {
    id: string;
    planId: string;
    category: string;
    content: string;
    status: 'PENDING' | 'DONE' | 'DRAFT';
    createdAt: number;
    updatedAt: number;
    userNote?: string;
}

export interface RecurrenceRule {
    freq: RecurrenceFrequency;
    interval: number;
    daysOfWeek?: number[];
    endCondition: 'NEVER' | 'DATE';
    endValue?: number;
    excludedDates?: number[];
}

export interface ChatMessage {
    id: string;
    userId: string;
    threadId: string;
    role: 'user' | 'model' | 'system';
    text: string;
    timestamp: number;
    suggestionId?: string;
}

export interface ChatThread {
    id: string;
    userId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

export type ChatScenario = 'DEEP_PLAN_REVIEW' | string;

export interface GoalKPI {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    type: KPIType;
    isDone?: boolean;
    stageId?: string;
}

export interface RoadmapNode {
    id: string;
    title: string;
    description?: string;
    deadline?: number;
    completed: boolean;
    linkedPlanId?: string;
}

export interface GoalEntity {
    id: string;
    ownerId: string;
    title: string;
    description?: string;
    reason?: string;
    priority: Priority;
    energyLevel: EnergyLevel;
    type: GoalType;
    status: GoalStatus;
    startDate: number;
    endDate: number;
    progress: number;
    tags: string[];
    futureSelfTags?: string[];
    kpis: GoalKPI[];
    roadmap: RoadmapNode[];
    linkedTasksIds: string[];
    linkedHabitsIds: string[];
    experienceIds: string[];
    repairTokensUsed: number;
    createdAt: number;
    updatedAt: number;
}

export interface SyncMeta {
    isDeleted: boolean;
    createdAt: number;
    updatedAt: number;
    version: number;
    tempId: string;
}

export interface MapNodeProgress {
    value: number;
    health: MapNodeHealth;
    lastActivity: number;
    metrics: {
        habitConsistency: number;
        taskCompletion: number;
        childrenProgress: number;
    };
}

export interface MapNodeEntity {
    id: string;
    mapId: string;
    type: MapNodeType;
    position: { x: number, y: number };
    content: {
        label: string;
        description?: string;
        currentSelfData?: CurrentSelfData;
        futureSelfData?: FutureSelfData;
    };
    references: {
        goalId?: string;
        taskId?: string;
        habitId?: string;
    };
    progressData?: MapNodeProgress;
    meta: SyncMeta;
}

export interface MapEdgeEntity {
    id: string;
    mapId: string;
    sourceNodeId: string;
    targetNodeId: string;
    relationType: MapEdgeType;
    meta: SyncMeta;
}

export interface LifeMapEntity {
    id: string;
    userId: string;
    viewport: { x: number, y: number, zoom: number };
    updatedAt: number;
}

export interface GraphAnalysisResult {
    score: number;
    criticalPathExists: boolean;
    issues: MapIssue[];
    stats: {
        orphanCount: number;
        goalCount: number;
        activeNodes: number;
    };
    lastAnalyzed: number;
}

export interface MapIssue {
    ruleId: AnalysisRuleId;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    targetNodeId?: string;
    message: string;
    recommendation: string;
}

export interface MapSnapshot {
    id: string;
    mapId: string;
    timestamp: number;
    nodes: MapNodeEntity[];
    edges: MapEdgeEntity[];
    actionType: MapActionType;
    description?: string;
}

export interface MapEvolutionMetrics {
    nodeCountDelta: number;
    complexityScore: number;
    growthTrend: 'STAGNANT' | 'GROWING' | 'SIMPLIFYING' | 'CHAOTIC';
    lastMajorPivot: number;
}

export interface FocusConfig {
    focusDurationMin: number;
    shortBreakDurationMin: number;
    longBreakDurationMin: number;
    longBreakInterval: number;
}

export interface TimerState {
    status: TimerStatus;
    mode: FocusMode;
    timeLeft: number;
    totalDuration: number;
    interruptions: number;
    pomodorosCompleted: number;
    taskId?: string;
    taskTitle?: string;
    sessionId?: string;
}

export interface PlanTask {
    id: string;
    title: string;
    isKey: boolean;
    isDone: boolean;
    priority: Priority;
    estimateMinutes: number;
    tags: string[];
    steps?: string[];
}

export interface PlanKPI {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string;
    isDone: boolean;
}

export interface PlanCheckpoint {
    id: string;
    title: string;
    date: number;
    isDone: boolean;
}

export interface PlanExperience {
    id: string;
    title: string;
    duration: number;
    hypothesis: string;
    kpiMetric: string;
    kpiBaseline: number;
    kpiTarget: number;
    action: string;
}

export interface WeeklyPlanData {
    mainGoal: string;
    focuses: FocusModule[];
    kpis: PlanKPI[];
    checkpoints: PlanCheckpoint[];
}

export interface MonthlyPlanData {
    mainGoal: string;
    focuses: FocusModule[];
    generalTasks: PlanTask[];
    experiences: PlanExperience[];
    kpis: PlanKPI[];
    barriers: string[];
    checkpoints: PlanCheckpoint[];
}

export interface FocusModule {
    id: string;
    title: string;
    tasks: PlanTask[];
    isCollapsed?: boolean;
}

export interface DailyInsight {
    summary: string;
    wins: string[];
    leaks: string[];
    ritual: string;
    score: number;
    planForTomorrow: { title: string, priority: Priority }[];
}

export interface WeeklyInsight {
    summary: string;
    results: string[];
    kpi: { completionRate: number, focusHours: number, habitConsistency: number };
    wins: string[];
    leaks: string[];
    whatToDrop: string[];
    whatToAmplify: string[];
    nextWeekGoal: string;
    nextWeekFocuses: { title: string, sessionsCount: number, estimateHours: number }[];
    checkpoints: string[];
}

export interface MonthlyInsight {
    bigChanges: string[];
    achievements: string[];
    habitAdjustments: string[];
    mainGoal: string;
    strategicFocus: string;
}

export interface GoalReviewReport {
    period: 'WEEK' | 'MONTH';
    summary: string;
    insights: string[];
    recommendations: string[];
    nextSteps: { title: string, type: 'TASK' | 'HABIT' | 'ADJUSTMENT' }[];
    uiBlock: string;
    generatedAt: number;
}

export interface GoalAnalysis {
    realisticPercent: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    riskFactors: string[];
    topRecommendations: { text: string, impactEstimate: 'High' | 'Medium' | 'Low' }[];
    lastAnalyzedAt: number;
}

export interface CalendarSettings {
    viewMode: 'DAY' | 'WEEK' | 'MONTH';
    workingHoursStart: number;
    workingHoursEnd: number;
    hideNonWorkingHours: boolean;
    showHabits: boolean;
    showCompleted: boolean;
    timezone?: string;
}

export interface NotificationSettings {
    enabled: boolean;
    sound: boolean;
}

export interface ReportEntity {
    id: string;
    userId: string;
    type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    content: string;
    createdAt: number;
}

export interface Diagnostics {
    cpu?: number;
    memory?: number;
}

export type ViewState = 
    | 'DASHBOARD' | 'LIFE_MAP' | 'CALENDAR' | 'TASKS' | 'TASK_CREATE' | 'FOCUS' | 'AI_CHAT' | 'HABITS' | 'HABIT_CREATE' | 'CHECKLISTS' | 'GOALS' | 'SUGGESTION_LOG' | 'SETTINGS' | 'DEV' | 'AUTH_LOGIN' | 'AUTH_REGISTER' | 'ONBOARDING'
    | { type: 'TASK_EDIT', taskId?: string, initialTitle?: string, returnToGoalId?: string }
    | { type: 'TASK_CREATE', initialPlannedAt?: number }
    | { type: 'TASK_DETAIL', taskId: string, returnToGoalId?: string }
    | { type: 'FOCUS', taskId?: string }
    | { type: 'HABIT_EDIT', habitId?: string }
    | { type: 'HABIT_DETAIL', habitId: string }
    | { type: 'PLAN_EDITOR', planId?: string, planType: PlanType, periodStart: number }
    | { type: 'AI_DRAFTS', periodStart: number, planType: PlanType }
    | { type: 'AI_CHAT', scenario?: ChatScenario, payload?: string }
    | { type: 'DAILY_REFLECTION', insight: DailyInsight }
    | { type: 'WEEKLY_REVIEW', insight: WeeklyInsight }
    | { type: 'MONTHLY_REVIEW', insight: MonthlyInsight }
    | { type: 'LIFE_MAP', focusGoalId?: string }
    | { type: 'GOAL_DETAIL', goalId: string };
