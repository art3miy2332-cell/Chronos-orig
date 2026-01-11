
import React, { useState, useEffect, useRef } from 'react';
import { Priority, EnergyLevel, TaskStatus, TaskEntity, RecurrenceRule, RecurrenceFrequency } from '../types';
import { useTasksViewModel, useTagsViewModel } from '../hooks/viewmodels';
import { Plus, Trash2, Calendar, CheckCircle2, Circle, Search, Play, RotateCcw, X, Settings2, AlertCircle, Target, Layers } from 'lucide-react';
import { GoalRepository } from '../data/repositories';

interface TasksProps {
    userId: string;
    onNavigate: (view: any) => void;
    labels: any;
}

const ScheduleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    task: TaskEntity | null;
    onSave: (date: number, duration: number, recurrence?: RecurrenceRule) => void;
}> = ({ isOpen, onClose, task, onSave }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState('09:00');
    const [duration, setDuration] = useState(60);
    const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);
    
    useEffect(() => {
        if (task && isOpen) {
            const d = task.plannedAt ? new Date(task.plannedAt) : new Date();
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
            setDuration(task.durationMinutes || task.estimateMinutes || 60);
            setRecurrence(task.recurrence);
        }
    }, [task, isOpen]);

    if (!isOpen || !task) return null;

    const handleSave = () => {
        const [h, m] = time.split(':').map(Number);
        const start = new Date(date);
        start.setHours(h, m, 0, 0);
        onSave(start.getTime(), duration, recurrence);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-sm rounded-3xl p-6 animate-spring-in bg-white dark:bg-slate-900">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Запланировать</h3>
                        <p className="text-xs text-slate-500 truncate max-w-[200px] mt-1">{task.title}</p>
                    </div>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                
                {/* Inputs */}
                <div className="space-y-4 mb-6">
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none dark:text-white font-medium" />
                    <div className="flex gap-4">
                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1 p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-none outline-none dark:text-white font-medium" />
                        <div className="flex-1 flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4">
                            <input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value)||15)} className="w-full bg-transparent outline-none font-bold dark:text-white" />
                            <span className="text-xs text-slate-400">мин</span>
                        </div>
                    </div>
                </div>

                <button onClick={handleSave} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-transform">
                    Сохранить
                </button>
            </div>
        </div>
    );
};

export const Tasks: React.FC<TasksProps> = ({ userId, onNavigate, labels }) => {
    const { 
        tasks, loading, error, quickCreateTask, toggleTask, deleteTask, scheduleTask,
        setFilterStatus, setSearchQuery, setFilterTag, setFilterGoal,
        filterStatus, filterTag, filterGoal,
        undoState, undoLastAction, clearUndo
    } = useTasksViewModel(userId);

    const { tags } = useTagsViewModel();
    const [quickTitle, setQuickTitle] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [schedulingTask, setSchedulingTask] = useState<TaskEntity | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Goal Cache
    const [goalCache, setGoalCache] = useState<Record<string, {title: string, stageTitle?: string}>>({});

    useEffect(() => {
        // Build Goal Cache for rendering badges
        const cache: Record<string, {title: string, stageTitle?: string}> = {};
        const goals = GoalRepository.getAll(userId);
        goals.forEach(g => {
            g.roadmap.forEach(r => {
                // Not ideal complexity but fine for MVP scale
                cache[r.id] = { title: g.title, stageTitle: r.title }; // Map stageID -> info
            });
            // Also map goalId directly
            if (!cache[g.id]) cache[g.id] = { title: g.title };
        });
        setGoalCache(cache);
    }, [userId, tasks]); // Refresh cache when tasks change (maybe overkill, but safe) or on mount

    const getGoalContext = (task: TaskEntity) => {
        if (task.stageId && goalCache[task.stageId]) {
            // Task linked to Stage
            const info = goalCache[task.stageId];
            return { goalTitle: info.title, stageTitle: info.stageTitle };
        } else if (task.goalId && goalCache[task.goalId]) {
            // Task linked to Goal directly
            return { goalTitle: goalCache[task.goalId].title };
        } else if (task.goalId) {
            // Fallback if cache miss
            const g = GoalRepository.getById(task.goalId);
            return g ? { goalTitle: g.title } : null;
        }
        return null;
    };

    // Enable mouse wheel scrolling for filters
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (el) {
            const onWheel = (e: WheelEvent) => {
                if (e.deltaY === 0) return;
                e.preventDefault();
                el.scrollLeft += e.deltaY;
            };
            el.addEventListener('wheel', onWheel, { passive: false });
            return () => el.removeEventListener('wheel', onWheel);
        }
    }, []);

    const handleQuickAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (quickTitle.trim()) {
            await quickCreateTask(quickTitle);
            setQuickTitle('');
        }
    };

    const handleFullAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (quickTitle.trim()) {
            onNavigate({ type: 'TASK_EDIT', initialTitle: quickTitle });
        } else {
            onNavigate('TASK_CREATE');
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, taskId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm(labels.deleteConfirm || "Delete task?")) {
            deleteTask(taskId);
        }
    };

    const getPriorityColor = (p: Priority) => {
        switch (p) {
            case Priority.HIGH: return 'text-rose-500 bg-rose-50 dark:bg-rose-900/20';
            case Priority.MEDIUM: return 'text-amber-500 bg-amber-50 dark:bg-amber-900/20';
            case Priority.LOW: return 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
        }
    };

    return (
        <div className="h-full flex flex-col pt-4">
            {/* Header */}
            <div className="px-6 mb-4 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.tasks}</h1>
                <button 
                    onClick={() => setIsSearchOpen(!isSearchOpen)}
                    className={`p-3 rounded-xl transition-all ${isSearchOpen ? 'bg-indigo-100 text-indigo-600' : 'bg-white/50 dark:bg-slate-800/50 text-slate-500'}`}
                >
                    <Search size={20} />
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mx-6 mb-4 p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 rounded-xl flex items-center gap-2 text-sm font-medium animate-in slide-in-from-top-2">
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Search Bar */}
            {isSearchOpen && (
                <div className="px-6 mb-4 animate-spring-up">
                    <input 
                        autoFocus
                        placeholder={labels.searchPlaceholder}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full glass-panel p-4 rounded-xl outline-none dark:text-white"
                    />
                </div>
            )}

            {/* Filters (Horizontal Scroll) */}
            <div 
                ref={scrollContainerRef}
                className="px-6 mb-4 flex gap-3 overflow-x-auto no-scrollbar pb-2 touch-pan-x"
            >
                {(['ACTIVE', 'DONE', 'ALL'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                            filterStatus === status 
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                            : 'bg-white/50 dark:bg-slate-800/50 text-slate-500 backdrop-blur-sm'
                        }`}
                    >
                        {status === 'ACTIVE' ? labels.filterActive : status === 'DONE' ? labels.filterDone : labels.filterAll}
                    </button>
                ))}
                
                <button
                    onClick={() => setFilterGoal(!filterGoal)}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1 ${
                        filterGoal
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white/50 dark:bg-slate-800/50 text-slate-500 backdrop-blur-sm'
                    }`}
                >
                    <Target size={14} /> {labels.filterGoals || "Goals"}
                </button>

                {tags.map(tag => (
                    <button
                        key={tag.id}
                        onClick={() => setFilterTag(filterTag === tag.name ? null : tag.name)}
                        className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1 flex-shrink-0 ${
                            filterTag === tag.name
                            ? 'bg-white/80 dark:bg-slate-800/80 border-transparent shadow-sm'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 bg-transparent'
                        }`}
                        style={filterTag === tag.name ? { color: tag.colorHex, borderColor: tag.colorHex } : {}}
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.colorHex }} />
                        {tag.name}
                    </button>
                ))}
            </div>

            {/* Task List */}
            <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-3">
                {loading && <div className="text-center py-10 text-slate-400">Loading...</div>}
                
                {!loading && tasks.length === 0 && (
                    <div className="text-center py-20 opacity-50 flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 size={32} className="text-slate-300" />
                        </div>
                        <p className="text-slate-400 font-medium">No tasks found</p>
                    </div>
                )}

                {tasks.map((task, index) => {
                    const goalContext = getGoalContext(task);
                    return (
                        <div 
                            key={task.id}
                            onClick={() => onNavigate({ type: 'TASK_DETAIL', taskId: task.id })}
                            className={`glass-panel p-4 rounded-2xl flex items-start gap-4 transition-all active:scale-[0.98] animate-spring-up cursor-pointer group ${
                                task.status === TaskStatus.DONE ? 'opacity-50 grayscale' : ''
                            }`}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <button 
                                onClick={(e) => { e.stopPropagation(); toggleTask(task.id); }}
                                className={`mt-1 transition-colors ${task.status === TaskStatus.DONE ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}
                            >
                                {task.status === TaskStatus.DONE ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                                <h3 className={`font-semibold text-slate-900 dark:text-white truncate ${task.status === TaskStatus.DONE ? 'line-through' : ''}`}>
                                    {task.title}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                    {goalContext && (
                                        <span className="flex items-center gap-1 text-[10px] text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded-md font-bold truncate max-w-[200px] border border-indigo-100 dark:border-indigo-900/30">
                                            <Target size={10} /> 
                                            {goalContext.goalTitle}
                                            {goalContext.stageTitle && (
                                                <> <span className="opacity-50 mx-0.5">/</span> {goalContext.stageTitle} </>
                                            )}
                                        </span>
                                    )}
                                    {(task.plannedAt || task.deadline) && (
                                        <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                            <Calendar size={10} />
                                            {task.plannedAt ? new Date(task.plannedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : new Date(task.deadline!).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); setSchedulingTask(task); }}
                                    className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                                >
                                    <Calendar size={18} />
                                </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onNavigate({ type: 'FOCUS', taskId: task.id }); }} 
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                                >
                                    <Play size={18} />
                                </button>
                                <button 
                                    onClick={(e) => handleDeleteClick(e, task.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full pointer-events-auto"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Quick Add */}
            <div className="absolute bottom-6 left-6 right-6 z-40">
                <form 
                    onSubmit={handleQuickAdd} 
                    className="glass-heavy p-2 rounded-2xl flex items-center gap-2 shadow-2xl transition-all focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:scale-[1.02]"
                >
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30">
                        <Plus size={24} />
                    </div>
                    <input 
                        value={quickTitle}
                        onChange={(e) => setQuickTitle(e.target.value)}
                        placeholder="Add a new task..."
                        className="flex-1 bg-transparent h-12 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 font-medium px-2"
                    />
                    <div className="flex gap-1">
                        <button type="button" onClick={handleFullAdd} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Settings2 size={18} />
                        </button>
                        <button 
                            type="submit" 
                            disabled={!quickTitle.trim()}
                            className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        >
                            Add
                        </button>
                    </div>
                </form>
            </div>

            {/* Undo Toast */}
            {undoState && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-spring-in w-full max-w-sm px-4">
                    <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center justify-between gap-4">
                        <span className="text-sm font-medium">
                            {undoState.type === 'DELETE' ? 'Task deleted' : 'Task updated'}
                        </span>
                        <div className="flex items-center gap-3">
                            <button onClick={undoLastAction} className="text-indigo-400 font-bold text-sm flex items-center gap-1 hover:underline">
                                <RotateCcw size={14} /> Undo
                            </button>
                            <button onClick={clearUndo} className="text-slate-500 hover:text-white">
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ScheduleModal 
                isOpen={!!schedulingTask}
                onClose={() => setSchedulingTask(null)}
                task={schedulingTask}
                onSave={(d, dur, r) => scheduleTask(schedulingTask!.id, d, dur, r)}
            />
        </div>
    );
};
