

import React from 'react';
import { Priority, HabitFrequency } from '../types';
import { useHabitEditViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Save, AlertCircle, Clock, RotateCcw, Hourglass, Trash2 } from 'lucide-react';

interface HabitFormProps {
    userId: string;
    habitId?: string;
    onNavigateBack: () => void;
    labels: any;
}

export const HabitForm: React.FC<HabitFormProps> = ({ userId, habitId, onNavigateBack, labels }) => {
    const { habit, setHabit, loading, saving, error, saveHabit, deleteHabit } = useHabitEditViewModel(userId, habitId);

    const handleSave = async () => {
        const success = await saveHabit();
        if (success) onNavigateBack();
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this habit?")) {
            await deleteHabit();
            onNavigateBack();
        }
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
             <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">
                    {habitId ? labels.editHabit : labels.newHabit}
                </h1>
                <div className="flex gap-2">
                    {habitId && (
                        <button onClick={handleDelete} className="text-rose-500 hover:text-rose-600 p-2">
                            <Trash2 size={20} />
                        </button>
                    )}
                    <button onClick={handleSave} disabled={saving} className="text-indigo-600 font-semibold disabled:opacity-50">
                        {saving ? '...' : labels.save}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {error && (
                    <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.taskTitle}</label>
                    <input 
                        value={habit.title || ''}
                        onChange={(e) => setHabit({ ...habit, title: e.target.value })}
                        placeholder="e.g., Read 10 pages"
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                        autoFocus
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.taskDesc}</label>
                    <textarea 
                        value={habit.description || ''}
                        onChange={(e) => setHabit({ ...habit, description: e.target.value })}
                        className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white resize-none h-24"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.frequency}</label>
                        <select 
                            value={habit.frequency}
                            onChange={(e) => setHabit({ ...habit, frequency: e.target.value as HabitFrequency })}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                        >
                            <option value={HabitFrequency.DAILY}>Daily</option>
                            <option value={HabitFrequency.WEEKLY}>Weekly</option>
                        </select>
                     </div>

                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.priority}</label>
                        <select 
                            value={habit.importance}
                            onChange={(e) => setHabit({ ...habit, importance: e.target.value as Priority })}
                            className="w-full p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                        >
                            <option value={Priority.HIGH}>High</option>
                            <option value={Priority.MEDIUM}>Medium</option>
                            <option value={Priority.LOW}>Low</option>
                        </select>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.reminder}</label>
                        <div className="relative">
                            <Clock className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="time"
                                value={habit.reminderTime || ''}
                                onChange={(e) => setHabit({ ...habit, reminderTime: e.target.value })}
                                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                            />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (min)</label>
                        <div className="relative">
                            <Hourglass className="absolute left-3 top-3.5 text-slate-400" size={18} />
                            <input 
                                type="number"
                                placeholder="15"
                                value={habit.durationMinutes || ''}
                                onChange={(e) => setHabit({ ...habit, durationMinutes: parseInt(e.target.value) || 15 })}
                                className="w-full pl-10 pr-3 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <RotateCcw size={12} /> {labels.repairToken}
                    </label>
                    <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setHabit({ ...habit, repairTokensRemaining: Math.max(0, (habit.repairTokensRemaining || 0) - 1) })}
                            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                        >
                            -
                        </button>
                        <span className="font-bold text-xl dark:text-white">{habit.repairTokensRemaining}</span>
                        <button 
                             onClick={() => setHabit({ ...habit, repairTokensRemaining: (habit.repairTokensRemaining || 0) + 1 })}
                             className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold"
                        >
                            +
                        </button>
                    </div>
                    <p className="text-xs text-slate-400">Tokens allow you to fix missed days.</p>
                </div>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Save size={20} />
                    {labels.save}
                </button>
            </div>
        </div>
    );
};