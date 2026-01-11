
import { 
    TaskEntity, Priority, TaskStatus, HabitEntity, SuggestionEntity, 
    TagEntity, SessionEntity, PlanEntity, PlanEntryEntity, 
    EnergyLevel, HabitFrequency, SuggestionStatus, PlanType
} from './types';

export const SEED_TAGS: TagEntity[] = [
    { id: 't1', name: 'Работа', colorHex: '#4F46E5', createdAt: Date.now() },
    { id: 't2', name: 'Учеба', colorHex: '#059669', createdAt: Date.now() },
    { id: 't3', name: 'Здоровье', colorHex: '#E11D48', createdAt: Date.now() }
];

export const SEED_TASKS: TaskEntity[] = [
    {
        id: '1',
        userId: 'demo-user-id',
        title: 'Проверить квартальный отчет',
        description: 'Сверить финансовые метрики за Q3.',
        tags: ['Работа'],
        priority: Priority.HIGH,
        estimateMinutes: 60,
        energyLevel: EnergyLevel.HIGH,
        status: TaskStatus.TODO,
        deadline: Date.now() + 86400000,
        createdAt: Date.now() - 100000,
        createdBy: 'USER'
    },
    {
        id: '2',
        userId: 'demo-user-id',
        title: 'Синхронизация с командой',
        description: 'Еженедельный созвон с мобильной разработкой.',
        tags: ['Работа'],
        priority: Priority.MEDIUM,
        estimateMinutes: 30,
        energyLevel: EnergyLevel.MEDIUM,
        status: TaskStatus.DONE,
        createdAt: Date.now() - 200000,
        doneAt: Date.now() - 50000,
        createdBy: 'USER'
    },
    {
        id: '3',
        userId: 'demo-user-id',
        title: 'Читать "Атомные привычки"',
        description: 'Прочитать 4 главу.',
        tags: ['Учеба', 'Здоровье'],
        priority: Priority.LOW,
        estimateMinutes: 45,
        energyLevel: EnergyLevel.LOW,
        status: TaskStatus.IN_PROGRESS,
        createdAt: Date.now(),
        createdBy: 'AI',
        suggestedFromId: 's1'
    }
];

export const SEED_HABITS: HabitEntity[] = [
    {
        id: 'h1',
        userId: 'demo-user-id',
        title: 'Утренняя пробежка',
        description: '30 минут кардио',
        frequency: HabitFrequency.DAILY,
        importance: Priority.HIGH,
        streak: 5,
        history: [Date.now() - 86400000 * 1, Date.now() - 86400000 * 2, Date.now() - 86400000 * 3, Date.now() - 86400000 * 4, Date.now() - 86400000 * 5],
        repairTokensRemaining: 1,
        active: true,
        lastDoneAt: Date.now() - 86400000 * 1,
        createdAt: Date.now() - 500000
    },
    {
        id: 'h2',
        userId: 'demo-user-id',
        title: 'Читать 30 минут',
        frequency: HabitFrequency.DAILY,
        importance: Priority.MEDIUM,
        streak: 12,
        history: [],
        repairTokensRemaining: 1,
        active: true,
        createdAt: Date.now() - 500000
    }
];

export const SEED_SUGGESTIONS: SuggestionEntity[] = [
    {
        id: 's1',
        userId: 'demo-user-id',
        context: 'Обнаружена высокая нагрузка',
        text: 'Разбить "Квартальный отчет"',
        explanation: 'Задача выглядит крупной (60 мин). Может разобьем на "Сбор данных" и "Анализ"?',
        confidence: 0.89,
        estimateMinutes: 5,
        tags: ['Продуктивность'],
        status: SuggestionStatus.PROPOSED,
        createdAt: Date.now(),
        type: 'TASK_OPTIMIZATION'
    },
    {
        id: 's2',
        userId: 'demo-user-id',
        context: 'Низкая энергия',
        text: 'Запланировать блок фокуса',
        explanation: 'У вас 3 важных задачи. Рекомендую 90 минут фокуса в 10:00.',
        confidence: 0.92,
        estimateMinutes: 0,
        tags: ['Планирование'],
        status: SuggestionStatus.PROPOSED,
        createdAt: Date.now(),
        type: 'SCHEDULING'
    },
    {
        id: 's3',
        userId: 'demo-user-id',
        context: 'Планирование недели',
        text: 'Обзор целей Q3',
        explanation: 'Начало недели. Хорошее время сверить задачи с целями квартала.',
        confidence: 0.85,
        estimateMinutes: 15,
        tags: ['Планирование'],
        status: SuggestionStatus.PROPOSED,
        createdAt: Date.now(),
        type: 'CHECKLIST_GENERATION'
    }
];

export const SEED_SESSIONS: SessionEntity[] = [
    {
        id: 'ses1',
        taskId: '2',
        userId: 'demo-user-id',
        startTs: Date.now() - 100000,
        endTs: Date.now() - 70000,
        durationMinutes: 30,
        interruptionsCount: 1,
        notes: 'Хорошая сессия'
    }
];

export const SEED_PLANS: PlanEntity[] = [
    {
        id: 'p1',
        userId: 'demo-user-id',
        type: PlanType.WEEKLY,
        periodStart: Date.now(), // Approximate 'current' week
        periodEnd: Date.now() + 604800000,
        title: 'Цели недели 42',
        createdAt: Date.now()
    }
];

export const SEED_PLAN_ENTRIES: PlanEntryEntity[] = [
    {
        id: 'pe1',
        planId: 'p1',
        category: 'Фокус',
        content: 'Завершить MVP прототип',
        status: 'PENDING',
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: 'pe2',
        planId: 'p1',
        category: 'Здоровье',
        content: 'Бегать 3 раза',
        status: 'DONE',
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];


// Localization Map
export const LABELS = {
    EN: {
        // Nav
        dashboard: "Dashboard",
        tasks: "Tasks",
        focus: "Focus",
        chat: "AI Coach",
        habits: "Habits",
        settings: "Profile",
        checklists: "Checklists",
        calendar: "Calendar",
        goals: "Goals",
        
        // Common
        welcome: "Welcome to Chronos",
        goodMorning: "Good Morning",
        goodAfternoon: "Good Afternoon",
        goodEvening: "Good Evening",
        goodNight: "Good Night",
        focusTime: "Focus Time",
        quickStart: "Quick Start",
        suggestions: "AI Suggestions",
        
        // Auth
        loginTitle: "Welcome Back",
        loginSubtitle: "Sign in to continue your productivity journey",
        registerTitle: "Create Account",
        registerSubtitle: "Start your privacy-focused journey today",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        displayName: "Display Name",
        loginBtn: "Log In",
        registerBtn: "Sign Up",
        guestBtn: "Continue as Guest",
        noAccount: "Don't have an account?",
        hasAccount: "Already have an account?",
        logout: "Log Out",
        guestMode: "Guest Mode",
        
        // Settings
        profile: "User Profile",
        language: "Language",
        theme: "Theme",
        aiTone: "AI Tone",
        notifications: "Notifications",
        save: "Save Changes",
        security: "Security",
        
        // Task Manager
        newTask: "New Task",
        editTask: "Edit Task",
        taskTitle: "Title",
        taskDesc: "Description",
        priority: "Priority",
        energy: "Energy",
        deadline: "Deadline",
        estimate: "Estimate (min)",
        tags: "Tags",
        createTaskBtn: "Create Task",
        saveTaskBtn: "Save Changes",
        filterAll: "All",
        filterActive: "Active",
        filterDone: "Done",
        filterGoals: "Goals",
        searchPlaceholder: "Search tasks...",
        sortDeadline: "Deadline",
        sortPriority: "Priority",
        sortCreated: "Newest",
        validationTitleRequired: "Title is required",
        validationEstimatePositive: "Estimate must be positive",
        validationDeadlineFuture: "Deadline must be in the future",
        startFocus: "Start Focus",
        markDone: "Mark Done",
        deleteConfirm: "Are you sure you want to delete this task?",
        delete: "Delete",
        undo: "Undo",
        linkedSuggestion: "Linked Suggestion",

        // Focus Timer
        timerIdle: "Ready to Focus?",
        timerRunning: "Stay Focused",
        timerPaused: "Paused",
        timerFinished: "Session Complete",
        startTimer: "Start",
        pauseTimer: "Pause",
        resumeTimer: "Resume",
        stopTimer: "Stop",
        skipBreak: "Skip Break",
        takeBreak: "Take Break",
        workingOn: "Working on",
        noTask: "No specific task",
        interruptions: "Interruptions",
        recordInterruption: "Record Interruption",
        sessionSummary: "Session Summary",
        minutesFocused: "minutes focused",
        saveSession: "Save Session",
        discardSession: "Discard",
        notesPlaceholder: "Session notes or goal...",

        // Habits
        habitsTitle: "Habit Tracker",
        streak: "Streak",
        longestStreak: "Best Streak",
        repairToken: "Repair Token",
        repairConfirm: "Use 1 Repair Token to fix this day?",
        tokensLeft: "Tokens left",
        reminder: "Reminder",
        frequency: "Frequency",
        heatmap: "History (Last 30 Days)",
        newHabit: "New Habit",
        editHabit: "Edit Habit",
        markHabitDone: "Mark Done",
        habitHistory: "Completion History",
        habitStats: "Statistics",
        completionRate: "Completion Rate",
        totalCompletions: "Total Done",
        useToken: "Use Token",

        // Checklists & AI Drafts
        checklistsTitle: "Weekly & Monthly Plans",
        weeklyPlan: "Weekly Plan",
        monthlyPlan: "Monthly Plan",
        generateAiDraft: "Generate AI Draft",
        aiDrafts: "AI Suggestions",
        suggestionLog: "Suggestion Log",
        planEditor: "Plan Editor",
        addEntry: "Add Entry",
        savePlan: "Save Plan",
        previewAi: "Preview AI Drafts",
        accept: "Accept",
        reject: "Reject",
        copyToDraft: "Copy to Draft",
        addToPlan: "Add to Plan",
        createTask: "Create Task",
        confidence: "Confidence",
        rejectReason: "Reason for rejection (optional)",
        noSuggestions: "No suggestions available for this context.",
        undoAction: "Undo last action",
        category: "Category",
        content: "Content",
        
        // Calendar
        calendarTitle: "Calendar",
        dayView: "Day",
        weekView: "Week",
        monthView: "Month",
        showWorkingHours: "Working Hours Only"
    },
    RU: {
        // Nav
        dashboard: "Главная",
        tasks: "Задачи",
        focus: "Фокус",
        chat: "AI Коуч",
        habits: "Привычки",
        settings: "Профиль",
        checklists: "Планы",
        calendar: "Календарь",
        goals: "Цели",

        // Common
        welcome: "Добро пожаловать в Chronos",
        goodMorning: "Доброе утро",
        goodAfternoon: "Добрый день",
        goodEvening: "Добрый вечер",
        goodNight: "Доброй ночи",
        focusTime: "Время фокуса",
        quickStart: "Быстрый старт",
        suggestions: "Предложения AI",
        pendingTasks: "Задач",
        pendingToday: "Осталось сегодня",
        trackedTotal: "Всего зафиксировано",
        aiInsightTitle: "Инсайт AI",
        startFocusSession: "Начать сессию",
        askCoach: "Спросить коуча",
        captureIdea: "Записать идею",
        pomodoro25: "Помодоро 25 мин",
        getAdvice: "Получить совет",

        // Auth
        loginTitle: "С возвращением",
        loginSubtitle: "Войдите, чтобы продолжить",
        registerTitle: "Создать аккаунт",
        registerSubtitle: "Начните свой путь к продуктивности",
        email: "Email",
        password: "Пароль",
        confirmPassword: "Подтвердите пароль",
        displayName: "Имя",
        loginBtn: "Войти",
        registerBtn: "Регистрация",
        guestBtn: "Войти как Гость",
        noAccount: "Нет аккаунта?",
        hasAccount: "Уже есть аккаунт?",
        logout: "Выйти",
        guestMode: "Режим Гостя",

        // Settings
        profile: "Профиль пользователя",
        language: "Язык",
        theme: "Тема",
        aiTone: "Тон AI",
        notifications: "Уведомления",
        save: "Сохранить",
        security: "Безопасность",

        // Task Manager
        newTask: "Новая задача",
        editTask: "Редактировать задачу",
        taskTitle: "Название",
        taskDesc: "Описание",
        priority: "Приоритет",
        energy: "Энергия",
        deadline: "Срок",
        estimate: "Оценка (мин)",
        tags: "Теги",
        createTaskBtn: "Создать задачу",
        saveTaskBtn: "Сохранить изменения",
        filterAll: "Все",
        filterActive: "Активные",
        filterDone: "Завершённые",
        filterGoals: "Цели",
        searchPlaceholder: "Поиск задач...",
        sortDeadline: "Срок",
        sortPriority: "Приоритет",
        sortCreated: "Новые",
        validationTitleRequired: "Название обязательно",
        validationEstimatePositive: "Оценка должна быть положительной",
        validationDeadlineFuture: "Срок должен быть в будущем",
        startFocus: "Начать фокус",
        markDone: "Выполнить",
        deleteConfirm: "Вы уверены, что хотите удалить задачу?",
        delete: "Удалить",
        undo: "Отменить",
        linkedSuggestion: "Из предложения AI",

        // Focus Timer
        timerIdle: "Готовы к фокусу?",
        timerRunning: "Фокусируйтесь",
        timerPaused: "Пауза",
        timerFinished: "Сессия завершена",
        startTimer: "Старт",
        pauseTimer: "Пауза",
        resumeTimer: "Продолжить",
        stopTimer: "Стоп",
        skipBreak: "Пропустить",
        takeBreak: "Перерыв",
        workingOn: "Задача",
        noTask: "Без задачи",
        interruptions: "Отвлечения",
        recordInterruption: "Записать отвлечение",
        sessionSummary: "Итоги сессии",
        minutesFocused: "минут фокуса",
        saveSession: "Сохранить",
        discardSession: "Удалить",
        notesPlaceholder: "Заметки или цель...",

        // Habits
        habitsTitle: "Трекер Привычек",
        streak: "Стрик",
        longestStreak: "Лучший стрик",
        repairToken: "Токен восстановления",
        repairConfirm: "Использовать 1 токен для восстановления?",
        tokensLeft: "Осталось токенов",
        reminder: "Напоминание",
        frequency: "Частота",
        heatmap: "История (30 дней)",
        newHabit: "Новая привычка",
        editHabit: "Редактировать",
        markHabitDone: "Отметить",
        habitHistory: "История выполнений",
        habitStats: "Статистика",
        completionRate: "Эффективность",
        totalCompletions: "Всего выполнено",
        useToken: "Использовать токен",

        // Checklists & AI Drafts
        checklistsTitle: "Еженедельные планы",
        weeklyPlan: "План на неделю",
        monthlyPlan: "План на месяц",
        generateAiDraft: "Сгенерировать (AI)",
        aiDrafts: "Предложения AI",
        suggestionLog: "История предложений",
        planEditor: "Редактор плана",
        addEntry: "Добавить пункт",
        savePlan: "Сохранить план",
        previewAi: "Предпросмотр AI",
        accept: "Принять",
        reject: "Отклонить",
        copyToDraft: "В черновик",
        addToPlan: "В план",
        createTask: "Создать задачу",
        confidence: "Уверенность",
        rejectReason: "Причина (опционально)",
        noSuggestions: "Нет предложений для этого контекста.",
        undoAction: "Отменить последнее действие",
        category: "Категория",
        content: "Содержание",
        // Builder specific
        pickFromBacklog: "Выбрать из бэклога",
        mainGoal: "Главная Цель",
        focusAreas: "Фокус-направления",
        generalTasks: "Общие Задачи",
        experiments: "Эксперименты",
        barriers: "Барьеры / Риски",
        checkpoints: "Чекпоинты",
        review: "Обзор",
        builder: "Конструктор",

        // Calendar
        calendarTitle: "Календарь",
        dayView: "День",
        weekView: "Неделя",
        monthView: "Месяц",
        showWorkingHours: "Только рабочее время"
    }
};
