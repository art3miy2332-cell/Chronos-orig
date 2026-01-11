

import React, { useEffect, useState, useMemo } from 'react';
import { UserEntity, TaskEntity, TaskStatus, Priority } from '../types';
import { Sun, Calendar, PlayCircle, Zap, MessageSquare, RefreshCw, ArrowRight, Sparkles, Moon } from 'lucide-react';
import { DatabaseService } from '../utils/db';
import { CoachingManager } from '../utils/coaching-manager';

interface DashboardProps {
    user: UserEntity;
    tasks: TaskEntity[];
    onNavigate: (view: any) => void;
    labels: any;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, tasks, onNavigate, labels }) => {
    const metrics = DatabaseService.getUserDashboardMetrics(user.id);
    const pendingTasks = tasks.filter(t => t.status !== TaskStatus.DONE);
    const highPriorityCount = pendingTasks.filter(t => t.priority === Priority.HIGH).length;
    
    const [greeting, setGreeting] = useState(labels.goodMorning);
    const [greetingIcon, setGreetingIcon] = useState(<Sun size={24} className="text-amber-500" fill="currentColor" />);

    useEffect(() => {
        // Request geolocation access purely to satisfy permission requirements
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => console.log('Loc access granted', pos.coords),
                (err) => console.log('Loc access denied', err)
            );
        }

        const updateGreeting = () => {
            const h = new Date().getHours();
            // 06:00 - 12:00 Morning
            if (h >= 6 && h < 12) {
                setGreeting(labels.goodMorning);
                setGreetingIcon(<Sun size={24} className="text-amber-500" fill="currentColor" />);
            } 
            // 12:00 - 18:00 Day
            else if (h >= 12 && h < 18) {
                setGreeting(labels.goodAfternoon || "Good Afternoon");
                setGreetingIcon(<Sun size={24} className="text-yellow-500" fill="currentColor" />);
            } 
            // 18:00 - 00:00 Evening
            else if (h >= 18) {
                setGreeting(labels.goodEvening);
                setGreetingIcon(<Sun size={24} className="text-orange-500" fill="currentColor" />);
            } 
            // 00:00 - 06:00 Night
            else {
                setGreeting(labels.goodNight);
                setGreetingIcon(<Moon size={24} className="text-indigo-400" fill="currentColor" />);
            }
        };
        
        updateGreeting();
        const interval = setInterval(updateGreeting, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [labels]);

    // --- SMART INSIGHT GENERATOR ---
    const insightMessage = useMemo(() => {
        const count = pendingTasks.length;
        const name = user.displayName.split(' ')[0]; // First name only
        const hour = new Date().getHours();
        const productivePhase = user.coachingProfile?.productiveHours || 'MORNING'; // MORNING, AFTERNOON, NIGHT
        
        // Define phases
        const isMorning = hour >= 5 && hour < 12;
        const isDay = hour >= 12 && hour < 18;
        const isEvening = hour >= 18 && hour < 23;
        const isNight = hour >= 23 || hour < 5;

        // Is it the user's peak time right now?
        let isPeakTime = false;
        if (productivePhase === 'MORNING' && isMorning) isPeakTime = true;
        if (productivePhase === 'AFTERNOON' && isDay) isPeakTime = true;
        if (productivePhase === 'NIGHT' && (isEvening || isNight)) isPeakTime = true;

        const templates: string[] = [];

        // 1. High Load Scenarios (> 5 tasks)
        if (count >= 5) {
            if (isPeakTime) {
                templates.push(`У вас ${count} активных задач. Сейчас ваше пиковое время продуктивности. Предлагаю начать "Спринт" на 45 минут и закрыть самые сложные?`);
                templates.push(`${name}, список внушительный (${count}), но сейчас вы в лучшей форме. Давайте закроем 3 задачи из топа за час.`);
            } else if (isEvening) {
                templates.push(`Осталось ${count} задач. Вечер — время замедляться. Выберите 1 самую важную для завершения, а остальное перенесем?`);
                templates.push(`${count} задач на остаток дня. Чтобы не выгореть, рекомендую сделать только приоритетные, а рутину оставить на завтра.`);
            } else {
                templates.push(`В списке ${count} задач. Чтобы не распыляться, начните с одной самой "неприятной". Таймер на 25 минут поможет стартовать.`);
            }
        } 
        // 2. Moderate Load Scenarios (1-4 tasks)
        else if (count > 0) {
            if (highPriorityCount > 0) {
                templates.push(`У вас всего ${count} задач, но есть с высоким приоритетом. Разберемся с главным прямо сейчас?`);
                templates.push(`${name}, отличный темп. Осталось закрыть ${highPriorityCount} важных пункта. Запустим фокус-блок?`);
            } else {
                templates.push(`На сегодня ${count} небольших задач. Хороший день, чтобы поработать в спокойном ритме или уделить время обучению.`);
                templates.push(`Список почти пуст (${count}). Есть возможность завершить всё досрочно и отдохнуть.`);
            }
        } 
        // 3. Zero Tasks
        else {
            templates.push("Список задач пуст! Это отличное время, чтобы спланировать стратегию на неделю или просто восстановить силы.");
            templates.push("Чистый лист. Хотите добавить цель на завтра или почитать что-то полезное?");
        }

        // Add Habit Nudge occasionally
        if (hour < 10) {
            templates.push(`Доброе утро, ${name}. У вас ${count} задач. Начнем день с маленькой победы? Запустите таймер для первой задачи.`);
        }

        // Deterministic randomness based on hour + count to avoid flickering, but rotate enough
        const index = (hour + count + (new Date().getDate())) % templates.length;
        return templates[index];

    }, [pendingTasks.length, highPriorityCount, user.displayName, user.coachingProfile]);

    const forceReview = async (type: 'DAILY' | 'WEEKLY' | 'MONTHLY') => {
        if (type === 'DAILY') {
            const insight = await CoachingManager.generateDailyReview(user.id);
            onNavigate({ type: 'DAILY_REFLECTION', insight });
        } else if (type === 'WEEKLY') {
            const insight = await CoachingManager.generateWeeklyReview(user.id);
            onNavigate({ type: 'WEEKLY_REVIEW', insight });
        } else if (type === 'MONTHLY') {
            const insight = await CoachingManager.generateMonthlyReview(user.id);
            onNavigate({ type: 'MONTHLY_REVIEW', insight });
        }
    };

    return (
        <div className="p-6 space-y-6 pt-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {greeting},
                    </h1>
                    <h2 className="text-xl text-slate-500 dark:text-slate-400 font-medium">
                        {user.displayName || 'Guest'}
                    </h2>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100/50 dark:bg-slate-800/50 flex items-center justify-center backdrop-blur-md shadow-sm border border-amber-200/50 dark:border-slate-700/50">
                    {greetingIcon}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div 
                    onClick={() => onNavigate('TASKS')}
                    className="glass-card p-5 rounded-2xl shadow-sm active:scale-95 transition-all cursor-pointer group"
                >
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-500">
                            <Calendar size={18} />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-500 transition-colors">{labels.pendingTasks || "Tasks"}</span>
                    </div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{pendingTasks.length}</div>
                    <div className="text-xs text-slate-400 mt-1">{labels.pendingToday || "Pending today"}</div>
                </div>
                
                <div className="glass-card p-5 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/30 rounded-lg text-rose-500">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{labels.focus || "Focus"}</span>
                    </div>
                    <div className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">{metrics.totalFocusMinutes}<span className="text-lg font-medium text-slate-400 ml-1">m</span></div>
                    <div className="text-xs text-slate-400 mt-1">{labels.trackedTotal || "Tracked total"}</div>
                </div>
            </div>

            {/* AI Insight Card - DYNAMIC CONTENT */}
            <div className="relative overflow-hidden rounded-3xl shadow-lg shadow-indigo-500/20 group cursor-pointer transition-transform active:scale-[0.98]">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-600 opacity-100" />
                <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-white/20 blur-3xl rounded-full" />
                
                <div className="relative p-6 text-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                            <Sparkles size={14} className="text-yellow-300" fill="currentColor"/> 
                            <span className="text-[10px] font-bold uppercase tracking-wide">AI Insight</span>
                        </div>
                    </div>
                    <p className="text-indigo-50 text-sm leading-relaxed mb-6 font-medium min-h-[40px]">
                        "{insightMessage}"
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNavigate('FOCUS'); }}
                            className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-bold py-3 px-4 rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2"
                        >
                            <PlayCircle size={16} />
                            {labels.startFocusSession || "Start Focus"}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNavigate('AI_CHAT'); }}
                            className="bg-white text-indigo-600 hover:bg-indigo-50 text-xs font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
                        >
                            {labels.askCoach || "Ask AI"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">{labels.quickStart || "Quick Actions"}</h3>
                <div className="space-y-3">
                    <button 
                        onClick={() => onNavigate('TASK_CREATE')}
                        className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                            <MessageSquare size={22} />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-slate-900 dark:text-white">{labels.newTask || "New Task"}</div>
                            <div className="text-xs text-slate-500">{labels.captureIdea || "Capture an idea"}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <ArrowRight size={16} />
                        </div>
                    </button>

                     <button 
                        onClick={() => onNavigate('FOCUS')}
                        className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
                            <PlayCircle size={22} />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-slate-900 dark:text-white">{labels.startTimer || "Start Timer"}</div>
                            <div className="text-xs text-slate-500">{labels.pomodoro25 || "25 min Pomodoro"}</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                            <ArrowRight size={16} />
                        </div>
                    </button>

                    <button 
                        onClick={() => onNavigate('CALENDAR')}
                        className="w-full glass-panel p-4 rounded-2xl flex items-center gap-4 hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all group active:scale-[0.98]"
                    >
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                            <Calendar size={22} />
                        </div>
                        <div className="text-left flex-1">
                            <div className="font-bold text-slate-900 dark:text-white">{labels.calendarTitle || "Calendar"}</div>
                            <div className="text-xs text-slate-500">Расписание</div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <ArrowRight size={16} />
                        </div>
                    </button>
                </div>
            </div>

            {/* Developer Mode Tools */}
            {user.role === 'Developer' && (
                <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 opacity-50 hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-mono text-slate-400 mb-2">DEV TOOLS</p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => forceReview('DAILY')} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-bold">Daily Review</button>
                        <button onClick={() => forceReview('WEEKLY')} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-bold">Weekly Review</button>
                        <button onClick={() => forceReview('MONTHLY')} className="px-3 py-1 bg-slate-200 dark:bg-slate-800 rounded text-[10px] font-bold">Monthly Review</button>
                    </div>
                </div>
            )}
        </div>
    );
};