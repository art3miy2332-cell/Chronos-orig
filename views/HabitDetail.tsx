
import React from 'react';
import { useHabitDetailViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Edit2, Trash2, CheckCircle2, RotateCcw, Flame } from 'lucide-react';
import { HabitEntity } from '../types';

interface HabitDetailProps {
    habitId: string;
    onNavigateBack: () => void;
    onNavigateEdit: () => void;
    labels: any;
}

export const HabitDetail: React.FC<HabitDetailProps> = ({ habitId, onNavigateBack, onNavigateEdit, labels }) => {
    const { habit, loading, markDone, useRepairToken, deleteHabit } = useHabitDetailViewModel(habitId);

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!habit) return <div className="p-10 text-center text-rose-500">Habit not found</div>;

    const handleDelete = async () => {
        if (window.confirm("Delete this habit?")) {
            await deleteHabit();
            onNavigateBack();
        }
    };

    // Helper to generate last 30 days
    const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        d.setHours(0,0,0,0);
        return d.getTime();
    });

    const isCompleted = (ts: number) => {
        // Simple check if timestamp exists in history (approximate matching to day)
        return habit.history.some(h => {
             const hDate = new Date(h).setHours(0,0,0,0);
             return hDate === ts;
        });
    };

    const handleRepair = (ts: number) => {
        if (window.confirm(labels.repairConfirm)) {
            useRepairToken(ts);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
             <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex gap-2">
                    <button onClick={onNavigateEdit} className="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                        <Edit2 size={20} />
                    </button>
                    <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-rose-600 transition-colors">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{habit.title}</h1>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full font-bold">
                        <Flame size={18} fill="currentColor" />
                        {habit.streak} {labels.streak}
                    </div>
                </div>

                {/* Main Action */}
                <button 
                    onClick={markDone}
                    disabled={isCompleted(new Date().setHours(0,0,0,0))}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 text-white rounded-2xl shadow-lg shadow-emerald-500/30 transition-all font-bold text-lg flex items-center justify-center gap-2"
                >
                    <CheckCircle2 size={24} />
                    {isCompleted(new Date().setHours(0,0,0,0)) ? 'Completed Today' : labels.markHabitDone}
                </button>

                {/* Heatmap */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{labels.heatmap}</h3>
                    <div className="grid grid-cols-7 gap-2">
                        {days.map(ts => {
                            const completed = isCompleted(ts);
                            const isToday = ts === new Date().setHours(0,0,0,0);
                            return (
                                <div 
                                    key={ts} 
                                    onClick={() => !completed && !isToday ? handleRepair(ts) : null}
                                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors cursor-pointer relative group ${
                                        completed 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                                    } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
                                >
                                    {new Date(ts).getDate()}
                                    
                                    {!completed && !isToday && habit.repairTokensRemaining > 0 && (
                                        <div className="absolute inset-0 bg-indigo-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-md">
                                            <RotateCcw size={12} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{labels.tokensLeft}</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {habit.repairTokensRemaining} <RotateCcw size={16} className="text-indigo-500" />
                        </div>
                     </div>
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">{labels.totalCompletions}</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {habit.history.length}
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
};
