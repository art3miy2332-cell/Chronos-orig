
import React from 'react';
import { MonthlyInsight } from '../../types';
import { CoachingManager } from '../../utils/coaching-manager';
import { Check, Zap, TrendingUp, Target, Calendar } from 'lucide-react';

interface Props {
    userId: string;
    insight: MonthlyInsight;
    onComplete: () => void;
}

export const MonthlyReview: React.FC<Props> = ({ userId, insight, onComplete }) => {
    
    const achievements = insight?.achievements || [];
    const habitAdjustments = insight?.habitAdjustments || [];

    const handleCommit = async () => {
        await CoachingManager.commitMonthly(userId, insight);
        onComplete();
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Standard Header (No Poster) */}
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-10">
                 <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                    <Calendar size={20} />
                 </div>
                 <div>
                    <h1 className="font-bold text-lg text-slate-900 dark:text-white">Обзор Месяца</h1>
                    <p className="text-xs text-slate-500">Результаты и выводы</p>
                 </div>
            </div>

            {/* Standard List Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                
                {/* 1. Achievements Section */}
                {achievements.length > 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <Zap size={14} className="text-amber-500" /> Ключевые победы
                        </h3>
                        <div className="space-y-3">
                            {achievements.map((a, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <span className="text-emerald-500 font-bold text-sm mt-0.5">•</span>
                                    <span className="text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">{a}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-400 text-sm italic">Нет данных о победах</div>
                )}

                {/* 2. Habits Section */}
                {habitAdjustments.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                            <TrendingUp size={14} className="text-indigo-500" /> Работа с привычками
                        </h3>
                        <ul className="space-y-2">
                             {habitAdjustments.map((a, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 pl-3 border-l-2 border-slate-100 dark:border-slate-700">
                                    {a}
                                </li>
                             ))}
                        </ul>
                    </div>
                )}

                {/* 3. Main Outcome/Focus */}
                <div className="bg-gradient-to-r from-indigo-50 to-white dark:from-indigo-900/20 dark:to-slate-800 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                    <h3 className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Target size={14} /> Главный вывод
                    </h3>
                    <div className="text-lg font-bold text-slate-900 dark:text-white mb-1 leading-tight">
                        {insight?.strategicFocus || "Продолжаем движение"}
                    </div>
                    {insight?.mainGoal && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-indigo-100 dark:border-slate-700">
                            В контексте цели: <span className="font-medium">{insight.mainGoal}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Standard Footer Button */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                <button 
                    onClick={handleCommit}
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Check size={18} />
                    Завершить обзор
                </button>
            </div>
        </div>
    );
};
