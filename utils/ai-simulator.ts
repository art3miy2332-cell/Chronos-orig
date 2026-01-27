import { SuggestionStatus, Diagnostics, DailyInsight, WeeklyInsight, MonthlyInsight, ChatMessage, WeeklyPlanData, MonthlyPlanData, PlanTask, UserEntity, Priority, GoalEntity, GoalAnalysis, GoalReviewReport } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

const GoalReviewSchema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "Short summary (1-2 sentences)" },
        insights: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3 key data-backed insights"
        },
        recommendations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 actionable recommendations"
        },
        nextSteps: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['TASK', 'HABIT', 'ADJUSTMENT'] }
                }
            },
            description: "Micro-plan for next period"
        },
        uiBlock: { type: Type.STRING, description: "Human-friendly text for UI display (3-5 lines)" }
    },
    required: ['summary', 'insights', 'recommendations', 'nextSteps', 'uiBlock']
};

const GoalRiskSchema = {
    type: Type.OBJECT,
    properties: {
        realisticPercent: { type: Type.NUMBER, description: "Probability of success 0-100" },
        riskLevel: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
        riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
        topRecommendations: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING },
                    impactEstimate: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
                }
            }
        }
    },
    required: ['realisticPercent', 'riskLevel', 'riskFactors', 'topRecommendations']
};

const PlanReviewSchema = {
    type: Type.OBJECT,
    properties: {
        reviewCard: {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.NUMBER, description: "Score 0-100 based on completion" },
                mainCritique: { type: Type.STRING, description: "One sentence summary of performance in Russian" },
                wins: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 1-3 positive achievements in Russian" },
                leaks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 1-3 negative points/distractions in Russian" }
            },
            required: ['score', 'mainCritique', 'wins', 'leaks']
        }
    },
    required: ['reviewCard']
};

export const AISimulator = {
    generateGoalReview: async (goal: GoalEntity, metrics: any, period: 'WEEK' | 'MONTH'): Promise<GoalReviewReport | null> => {
        if (!process.env.API_KEY) {
            return {
                period,
                summary: "Simulation: Good progress on tasks, but habit consistency dropped.",
                insights: [
                    "Completed 80% of high priority tasks.",
                    "Focus sessions averaged only 25 mins.",
                    "Habit streak broken twice."
                ],
                recommendations: [
                    "Increase focus block duration to 45m.",
                    "Move habit to morning.",
                    "Review blocked tasks."
                ],
                nextSteps: [
                    { title: "Schedule Deep Work", type: "TASK" },
                    { title: "Adjust Habit Trigger", type: "ADJUSTMENT" }
                ],
                uiBlock: "You're moving forward! Tasks are getting done, but let's tighten up the routine to maintain momentum.",
                generatedAt: Date.now()
            };
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `
        Ты — Chronos Strategy Engine.
        
        ВХОДНЫЕ ДАННЫЕ (Период: ${period}):
        1. ЦЕЛЬ: "${goal.title}"
        2. ОПИСАНИЕ: "${goal.description}"
        3. WHY (Причина/Якорь): "${goal.reason || 'Не указано'}"
        4. МЕТРИКИ:
           - Completed Tasks: ${metrics.completedTasks} / ${metrics.totalTasks}
           - Tasks Added This Week: ${metrics.newTasks}
           - Session Minutes: ${metrics.sessionMinutes}
           - KPI Current Values: ${JSON.stringify(goal.kpis)} (Note KPI Types: QUANTITATIVE, FREQUENCY, OUTCOME)
           - Roadmap Stages Done: ${metrics.stagesDone} / ${metrics.totalStages}
        
        ЗАДАЧА:
        Сгенерируй отчёт. 
        Учти типы KPI. Если OUTCOME (Результативный) не достигнут, дай совет как дожать. Если FREQUENCY (Частота) низкая, предложи расписание.
        ВАЖНО: Используй поле "WHY" (Якорь) в тексте отчёта (в uiBlock или insights), чтобы напомнить пользователю, почему это важно, особенно если прогресс низкий.
        Пример: "Ты отклонился от цели, но помни: [Reason]..."
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: GoalReviewSchema,
                    temperature: 0.5
                }
            });

            if (response.text) {
                const report = JSON.parse(response.text);
                return { ...report, period, generatedAt: Date.now() };
            }
            return null;
        } catch (e) {
            console.error("AI Review Failed", e);
            return null;
        }
    },

    assessGoalRisk: async (goal: GoalEntity, context: any): Promise<GoalAnalysis | null> => {
        if (!process.env.API_KEY) {
            return {
                realisticPercent: 85,
                riskLevel: 'LOW',
                riskFactors: ["Time constraints on weekends", "Dependence on external factors"],
                topRecommendations: [
                    { text: "Schedule deep work blocks", impactEstimate: "High" },
                    { text: "Break down stage 3 further", impactEstimate: "Medium" }
                ],
                lastAnalyzedAt: Date.now()
            };
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
        Analyze the feasibility of this goal.
        Goal: ${goal.title}
        Description: ${goal.description}
        Deadline: ${new Date(goal.endDate).toLocaleDateString()}
        
        Current Progress: ${goal.progress}%
        Stages: ${goal.roadmap.length}
        Tasks Linked: ${context.tasksCount}
        KPIs: ${JSON.stringify(goal.kpis)}
        Time Remaining: ${Math.round((goal.endDate - Date.now()) / (1000 * 60 * 60 * 24))} days
        User Activity: ${context.activityLevel} (Focus min/day)
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: GoalRiskSchema,
                    temperature: 0.4
                }
            });

            if (response.text) {
                const analysis = JSON.parse(response.text);
                return { ...analysis, lastAnalyzedAt: Date.now() };
            }
            return null;
        } catch (e) {
            console.error("AI Risk Assessment Failed", e);
            return null;
        }
    },

    generateResponse: async (prompt: string, context: any, history: ChatMessage[] = []): Promise<{ text: string, suggestionPayload?: string, suggestionType?: string, diagnostics?: Diagnostics }> => {
        
        if (prompt === "SYSTEM_INIT_ONBOARDING") {
             const name = context.userProfile?.displayName;
             const greeting = name ? `Привет, ${name}.` : "Привет.";
             
             return {
                 text: `${greeting} Я Chronos — твой персональный коуч по продуктивности и системе жизни.
Я не просто помогаю планировать задачи — я помогаю выстроить устойчивый ритм, убрать хаос и двигаться к реальным результатам.

Чтобы работать с тобой точно и по делу, мне важно понять тебя, твою реальность и твои слабые места.
Ответь, пожалуйста, на несколько вопросов — честно, без «как надо».

1) **Сколько тебе лет?**
2) **Чем ты сейчас занимаешься?** (Учёба, работа, проекты, спорт — что занимает основную часть времени.)
3) **Главные цели:** Какие 2–3 цели для тебя самые важные на ближайшие 3–12 месяцев? (Не мечты, а то, что реально хочешь изменить.)
4) **Барьеры:** Что сейчас больше всего мешает твоей продуктивности? (Лень, прокрастинация, расфокус, отсутствие структуры, низкая энергия, тревожность, перегруз?)
5) **Привычки:** Какие уже есть, а какие хочешь внедрить?
6) **Ритм дня:** Как обычно проходит твой день? Во сколько встаёшь, когда работаешь, когда чаще всего «проваливаешься»?
7) **Энергия:** Оцени свой текущий уровень энергии по шкале от 0 до 10. Почему именно так?
8) **Триггеры:** Что чаще всего выбивает тебя из ритма и заставляет откладывать дела?
9) **Месячный спринт:** Какой результат ты хочешь увидеть уже через месяц? (Небольшой, но ощутимый.)
10) **Видение:** Каким ты хочешь видеть себя через год? (Образ жизни, уровень дисциплины, результаты.)

Отвечай так, как чувствуешь.
На основе твоих ответов я подстрою стиль общения, нагрузку, рекомендации и стратегию работы именно под тебя.

**Когда будешь готов — начинаем.**`
             };
        }

        if (!process.env.API_KEY) {
            if (prompt.startsWith("GENERATE_WEEKLY_PLAN_STRUCTURE")) {
                const mockPlan: WeeklyPlanData = {
                    mainGoal: "Launch MVP",
                    focuses: [{ id: "f1", title: "Backend Setup", tasks: [{ id: "t1", title: "DB Schema", isKey: true, isDone: false, priority: Priority.HIGH, estimateMinutes: 60, tags: [] }] }],
                    kpis: [{ id: "k1", title: "Tasks Done", target: 10, current: 0, unit: "tasks", isDone: false }],
                    checkpoints: []
                };
                return { text: "Here is a draft plan.", suggestionPayload: JSON.stringify(mockPlan) };
            }
            if (prompt.startsWith("GENERATE_MONTHLY_PLAN_STRUCTURE")) {
                const mockPlan: MonthlyPlanData = {
                    mainGoal: "Scale User Base",
                    focuses: [{ id: "f1", title: "Marketing Push", tasks: [] }],
                    generalTasks: [],
                    experiences: [],
                    kpis: [],
                    barriers: [],
                    checkpoints: []
                };
                return { text: "Here is a monthly draft.", suggestionPayload: JSON.stringify(mockPlan) };
            }
            if (prompt.startsWith("GENERATE_PLAN_REVIEW")) {
                 const mockReview = {
                    reviewCard: {
                        score: 78,
                        mainCritique: "Неплохой прогресс, но внимание распыляется. Среда выбила из колеи.",
                        wins: ["Закрыта главная цель недели", "Стрик привычек сохранен", "Высокий фокус утром"],
                        leaks: ["Много мелких задач", "Поздний отход ко сну", "Пропущенная тренировка"]
                    }
                };
                return { text: "Вот обзор вашего плана.", suggestionPayload: JSON.stringify(mockReview) };
            }
            if (prompt.startsWith("DEEP_PLAN_REVIEW")) {
                return { text: "Я вижу ваш план. Основная проблема — отсутствие буфера времени. Рекомендую добавить 20% к оценке каждой задачи." };
            }
            
            return {
                text: "I am running in offline simulation mode. I can help you plan your week or review your goals.",
                diagnostics: { cpu: 10, memory: 20 }
            };
        }
        
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        let customSchema = undefined;
        let responseMimeType = undefined;

        if (prompt.startsWith("GENERATE_PLAN_REVIEW")) {
            customSchema = PlanReviewSchema;
            responseMimeType = 'application/json';
        } else if (prompt.startsWith("DEEP_PLAN_REVIEW:::")) {
             const payload = prompt.split(":::")[1];
             prompt = `
             [SYSTEM: DEEP PLAN ANALYSIS MODE]
             User Data (Plan): ${payload}
             
             TASK: Act as a senior productivity coach. Analyze the plan above provided by the user.
             1. Point out 1 major strength.
             2. Identify 1 critical flaw (e.g. too many tasks, vague goals, lack of focus).
             3. Ask 1 probing question to help them refine it.
             
             Keep it concise, conversational, and encouraging but firm. Russian language.
             `;
        }

        const userProfile = context.userProfile || {};
        const tone = userProfile.aiTonePreference || 'Coach';
        const motivation = userProfile.coachingProfile?.motivationStyle || 'ANALYTICAL';

        let stylePrompt = "";
        
        if (tone === 'Formal') stylePrompt += "STYLE: Professional, concise, no emojis. ";
        else if (tone === 'Casual') stylePrompt += "STYLE: Friendly, warm, use emojis, conversational. ";
        else stylePrompt += "STYLE: Coach-like, authoritative yet supportive. ";

        if (motivation === 'TOUGH_LOVE') stylePrompt += "APPROACH: Direct, strict, accountability-focused. No excuses. ";
        else if (motivation === 'GENTLE_SUPPORT') stylePrompt += "APPROACH: Empathetic, patient, encouraging. Focus on well-being. ";
        else stylePrompt += "APPROACH: Analytical, data-driven, logical. ";

        const fullPrompt = `
        Role: Productivity Coach (Chronos).
        Language: Russian (Always).
        
        USER PROFILE:
        - Name: ${userProfile.displayName}
        - Role: ${userProfile.role || 'General User'}
        - Main Goal: ${userProfile.coachingProfile?.mainGoal || 'Not set'}
        - Key Obstacle: ${userProfile.coachingProfile?.biggestObstacle || 'Not set'}
        
        BASE SETTINGS:
        ${stylePrompt}
        
        ADAPTIVE BEHAVIOR RULES (CRITICAL):
        1. **Contextual Mirroring**: Analyze the user's latest messages in chat history. 
           - If they write short, punchy sentences, respond concisely. 
           - If they write detailed, reflective paragraphs, provide deeper analysis.
           - If they use technical jargon (based on their Role: ${userProfile.role}), mirror it where appropriate.
        2. **Dynamic Empathy**: Even if your style is "Tough Love", if the user expresses burnout or despair in the history, switch temporarily to "Supportive" before pivoting back to action.
        3. **Formatting**: Adapt formatting to the user. If they use lists, use lists. If they chat casually, avoid heavy markdown structure.
        
        Context: ${JSON.stringify(context)}
        Chat History: ${JSON.stringify(history.map(h => ({ role: h.role, text: h.text })))}
        
        User Request: ${prompt}
        
        Constraints:
        1. Output strictly in Russian.
        2. If user asks for a structured plan (Weekly/Monthly), output JSON in 'suggestionPayload'.
        3. If request is GENERATE_PLAN_REVIEW, output valid JSON.
        `;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: fullPrompt,
                config: {
                    responseMimeType: responseMimeType,
                    responseSchema: customSchema
                }
            });
            
            let text = response.text || "";
            let payload = undefined;
            
            if (customSchema || responseMimeType === 'application/json') {
                payload = text;
                text = "Анализ готов.";
            } else if (text.includes("```json")) {
                const match = text.match(/```json\n([\s\S]*?)\n```/);
                if (match) {
                    payload = match[1];
                    text = "Я создал структуру на основе вашего контекста.";
                }
            }

            return { text, suggestionPayload: payload };
        } catch (e) {
            console.error("AI Error", e);
            return { text: "Error connecting to AI service." };
        }
    }
};