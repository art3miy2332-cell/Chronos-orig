


import React from 'react';
import { useTaskDetailViewModel } from '../hooks/viewmodels';
import { ArrowLeft, PlayCircle, CheckCircle2, Circle, Trash2, Edit2, Clock, Zap, Calendar, Sparkles } from 'lucide-react';
import { TaskStatus, SessionEntity } from '../types';

interface TaskDetailProps {
    taskId: string;
    onNavigateBack: () => void;
    onNavigateEdit: () => void;
    labels: any;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onNavigateBack, onNavigateEdit, labels }) => {
    const { task, sessions, linkedSuggestion, loading, toggleDone, deleteTask } = useTaskDetailViewModel(taskId);

    if (loading) return <div className="p-10 text-center">Loading...</div>;
    if (!task) return <div className="p-10 text-center text-rose-500">Task not found</div>;

    const handleDelete = async () => {
        if (window.confirm(labels.deleteConfirm)) {
            const success = await deleteTask();
            if (success) {
                onNavigateBack();
            } else {
                alert("Failed to delete task. Please try again.");
            }
        }
    };

    const totalTimeSpent = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
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
                
                {/* Status & Title */}
                <div>
                     <button 
                        onClick={toggleDone}
                        className={`flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                            task.status === TaskStatus.DONE 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                        {task.status === TaskStatus.DONE ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                        {task.status === TaskStatus.DONE ? 'Completed' : 'Mark Complete'}
                    </button>

                    <h1 className={`text-2xl font-bold text-slate-900 dark:text-white leading-tight ${task.status === TaskStatus.DONE ? 'line-through decoration-slate-400 opacity-60' : ''}`}>
                        {task.title}
                    </h1>
                </div>

                {/* Linked Suggestion Badge */}
                {linkedSuggestion && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex gap-3">
                        <Sparkles className="text-indigo-500 shrink-0" size={20} />
                        <div>
                            <div className="text-xs font-bold text-indigo-500 uppercase tracking-wide mb-1">{labels.linkedSuggestion}</div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{linkedSuggestion.explanation}"</p>
                        </div>
                    </div>
                )}

                {/* Meta Grid */}
                <div className="grid grid-cols-2 gap-4">
                     <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Time Spent</div>
                        <div className="text-lg font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                            {totalTimeSpent} <span className="text-xs font-normal text-slate-500">/ {task.estimateMinutes} min</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                                className="bg-indigo-500 h-full rounded-full" 
                                style={{ width: `${Math.min(100, (totalTimeSpent / task.estimateMinutes) * 100)}%` }} 
                            />
                        </div>
                     </div>

                     <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                            <Zap size={16} className="text-amber-500" />
                            <span>{task.energyLevel} Energy</span>
                        </div>
                        {task.deadline && (
                             <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                <Calendar size={16} className="text-indigo-500" />
                                <span>{new Date(task.deadline).toLocaleDateString()}</span>
                            </div>
                        )}
                     </div>
                </div>

                {/* Description */}
                {task.description && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Description</h3>
                        <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{task.description}</p>
                    </div>
                )}

                {/* Session History */}
                <div>
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Recent Sessions</h3>
                     {sessions.length === 0 ? (
                         <p className="text-sm text-slate-400 italic">No focus sessions recorded yet.</p>
                     ) : (
                         <div className="space-y-2">
                             {sessions.map(s => (
                                 <div key={s.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                     <div className="flex items-center gap-3">
                                         <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full text-indigo-600">
                                             <Clock size={16} />
                                         </div>
                                         <div>
                                             <div className="text-sm font-medium dark:text-white">{new Date(s.startTs).toLocaleDateString()}</div>
                                             <div className="text-xs text-slate-400">{new Date(s.startTs).toLocaleTimeString()}</div>
                                         </div>
                                     </div>
                                     <span className="font-mono font-bold text-slate-900 dark:text-white">{s.durationMinutes}m</span>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>
            </div>

            {/* Sticky Action Button */}
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                 <button className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2">
                    <PlayCircle size={20} />
                    {labels.startFocus}
                </button>
            </div>
        </div>
    );
};
