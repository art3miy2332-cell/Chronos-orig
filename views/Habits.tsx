

import React from 'react';
import { useHabitsViewModel } from '../hooks/viewmodels';
import { Plus, Flame, CheckCircle2, Circle, Settings, Activity, Trash2 } from 'lucide-react';
import { Habit } from '../domain/models';

interface HabitsProps {
    userId: string;
    onNavigate: (view: any) => void;
    labels: any;
}

export const Habits: React.FC<HabitsProps> = ({ userId, onNavigate, labels }) => {
    const { habits, loading, markDone, deleteHabit } = useHabitsViewModel(userId);

    const isDoneToday = (habit: Habit) => {
        if (!habit.lastDoneAt) return false;
        const today = new Date().setHours(0,0,0,0);
        const last = new Date(habit.lastDoneAt).setHours(0,0,0,0);
        return today === last;
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        e.preventDefault(); // Prevent any parent handlers
        if (window.confirm("Удалить эту привычку?")) {
            await deleteHabit(id);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{labels.habitsTitle}</h2>
                <button 
                    onClick={() => onNavigate('HABIT_CREATE')}
                    className="p-2 bg-indigo-600 text-white rounded-lg shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                </button>
            </div>

            {/* Summary */}
            <div className="p-4 grid grid-cols-2 gap-3">
                 <div className="bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl p-4 text-white shadow-lg shadow-orange-500/20">
                    <div className="flex items-center gap-2 mb-1 opacity-90">
                        <Flame size={16} />
                        <span className="text-xs font-bold uppercase">{labels.longestStreak}</span>
                    </div>
                    <div className="text-3xl font-bold">
                        {Math.max(0, ...habits.map(h => h.streak))} <span className="text-sm font-normal opacity-80">days</span>
                    </div>
                 </div>
                 <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-1 text-indigo-500">
                        <Activity size={16} />
                        <span className="text-xs font-bold uppercase">{labels.completionRate}</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900 dark:text-white">
                        {habits.length > 0 ? Math.round(habits.filter(h => isDoneToday(h)).length / habits.length * 100) : 0}%
                    </div>
                 </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4 pt-0">
                {loading && <div className="text-center py-10 text-slate-400">Loading...</div>}
                
                <div className="grid grid-cols-2 gap-3">
                    {habits.map(habit => {
                        const done = isDoneToday(habit);
                        return (
                            <div 
                                key={habit.id}
                                onClick={() => onNavigate({ type: 'HABIT_DETAIL', habitId: habit.id })}
                                className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between min-h-[140px] relative group"
                            >
                                {/* Delete Button (Top Right) */}
                                <button
                                    onClick={(e) => handleDelete(e, habit.id)}
                                    className="absolute top-2 right-2 p-2 bg-white/80 dark:bg-slate-900/80 rounded-full text-slate-300 hover:text-rose-500 shadow-sm z-30 transition-all hover:scale-110"
                                >
                                    <Trash2 size={16} />
                                </button>

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className={`p-1.5 rounded-lg ${done ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                            <Activity size={16} />
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-500 font-bold text-sm mr-8">
                                            <Flame size={14} fill="currentColor" />
                                            {habit.streak}
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-slate-900 dark:text-white leading-tight mb-1 pr-4">{habit.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{habit.description || 'No description'}</p>
                                </div>
                                
                                <button 
                                    onClick={(e) => { e.stopPropagation(); markDone(habit.id); }}
                                    className={`mt-4 w-full py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors ${
                                        done 
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' 
                                        : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
                                    }`}
                                >
                                    {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                    {done ? 'Done' : 'Mark'}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
