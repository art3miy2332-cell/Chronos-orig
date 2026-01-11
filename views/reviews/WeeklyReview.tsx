


import React from 'react';
import { WeeklyInsight } from '../../types';
import { CoachingManager } from '../../utils/coaching-manager';
import { TrendingUp, Target, AlertTriangle, CheckCircle2, TrendingDown, Flag, XCircle, ArrowUpCircle, ArrowDownCircle, Calendar } from 'lucide-react';

interface Props {
    userId: string;
    insight: WeeklyInsight;
    onComplete: () => void;
}

export const WeeklyReview: React.FC<Props> = ({ userId, insight, onComplete }) => {
    
    // Safe access
    const results = insight?.results || [];
    const wins = insight?.wins || [];
    const leaks = insight?.leaks || [];
    const kpi = insight?.kpi || { completionRate: 0, focusHours: 0, habitConsistency: 0 };
    
    // New Fields
    const whatToDrop = insight?.whatToDrop || [];
    const whatToAmplify = insight?.whatToAmplify || [];
    const nextWeekGoal = insight?.nextWeekGoal || "Focus";
    const nextWeekFocuses = insight?.nextWeekFocuses || [];
    const checkpoints = insight?.checkpoints || [];

    const handleCommit = async () => {
        await CoachingManager.commitWeekly(userId, insight);
        onComplete();
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 flex flex-col">
            <div className="bg-indigo-600 p-6 pb-12 text-white">
                <h1 className="text-2xl font-bold mb-1">Итоги Недели</h1>
                <p className="opacity-80 text-sm">Честный разбор. Реальный план.</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 -mt-8 space-y-4 pb-6 no-scrollbar">
                
                {/* 1. FACTS SECTION */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-lg shadow-black/5 dark:shadow-black/20">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Факты</h3>
                    
                    {/* KPI Grid */}
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(kpi.completionRate * 100)}%</div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">План</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{kpi.focusHours}ч</div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Фокус</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-2">
                            <div className="text-xl font-bold text-slate-900 dark:text-white">{Math.round(kpi.habitConsistency * 100)}%</div>
                            <div className="text-[9px] uppercase font-bold text-slate-400">Привычки</div>
                        </div>
                    </div>

                    {/* Result List */}
                    <ul className="space-y-2">
                        {results.map((res, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />
                                {res}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 2. CRITIQUE SECTION (The Good & The Bad) */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Wins */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-emerald-500 shadow-sm">
                        <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                            <TrendingUp size={16} /> Что сработало
                        </h3>
                        <ul className="space-y-2">
                            {wins.map((w, i) => (
                                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                    {w}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Leaks */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border-l-4 border-rose-500 shadow-sm">
                        <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
                            <AlertTriangle size={16} /> Где просели
                        </h3>
                        <ul className="space-y-2">
                            {leaks.map((l, i) => (
                                <li key={i} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                                    <XCircle size={14} className="text-rose-500 mt-0.5 shrink-0" />
                                    {l}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* 3. STRATEGY ADJUSTMENT */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Стратегия</h3>
                    <div className="space-y-4">
                        {/* Drop */}
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                <ArrowDownCircle size={14} className="text-rose-400" /> УБРАТЬ (DROP)
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {whatToDrop.map((item, i) => (
                                    <span key={i} className="text-xs bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 px-2 py-1 rounded-md border border-rose-100 dark:border-rose-900/30">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Amplify */}
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                                <ArrowUpCircle size={14} className="text-emerald-400" /> УСИЛИТЬ (AMPLIFY)
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {whatToAmplify.map((item, i) => (
                                    <span key={i} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. BLUEPRINT (Next Week) */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                    <h3 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                         <Target size={14} /> План следующей недели
                    </h3>
                    
                    {/* Main Goal */}
                    <div className="mb-4">
                        <div className="text-xl font-bold text-slate-900 dark:text-white leading-tight">"{nextWeekGoal}"</div>
                    </div>

                    {/* Key Focuses */}
                    <div className="space-y-2 mb-4">
                        {nextWeekFocuses.map((f, i) => (
                            <div key={i} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200">{f.title}</div>
                                    <div className="text-[10px] text-slate-400">{f.sessionsCount} сессий</div>
                                </div>
                                <div className="text-xs font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                                    {f.estimateHours}ч
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Checkpoints */}
                    <div className="flex flex-wrap gap-2">
                         {checkpoints.map((cp, i) => (
                            <div key={i} className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white/50 dark:bg-black/20 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                                <Flag size={10} /> {cp}
                            </div>
                         ))}
                    </div>
                </div>

                <button 
                    onClick={handleCommit}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-colors flex items-center justify-center gap-2"
                >
                    <Calendar size={18} /> Принять план
                </button>
            </div>
        </div>
    );
};
