
import React, { useState, useEffect } from 'react';
import { PlanType, WeeklyPlanData, FocusModule, PlanTask, PlanKPI, PlanCheckpoint, Priority, TaskEntity, TaskStatus, TagEntity } from '../types';
import { ArrowLeft, Save, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Bot, Sparkles, Target, Activity, Calendar, Zap, AlertTriangle, CheckSquare, Square, LayoutList, Search, X, Tag, Clock } from 'lucide-react';
import { PlanRepository, TaskRepository } from '../data/repositories';
import { AISimulator } from '../utils/ai-simulator';
import { useTagsViewModel } from '../hooks/viewmodels';

interface WeeklyPlanBuilderProps {
    userId: string;
    planId?: string;
    periodStart: number;
    onNavigateBack: () => void;
    labels: any;
}

// --- SUB-COMPONENTS ---

const FocusModuleCard: React.FC<{
    module: FocusModule;
    onUpdate: (m: FocusModule) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isGeneral?: boolean;
    availableTags: TagEntity[];
    onCreateTag: (name: string) => Promise<TagEntity | null>;
}> = ({ module, onUpdate, onRemove, onMoveUp, onMoveDown, isGeneral, availableTags, onCreateTag }) => {
    
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const tasks = module.tasks || [];

    const addTask = () => {
        const newTask: PlanTask = {
            id: crypto.randomUUID(),
            title: '',
            isKey: false,
            isDone: false,
            priority: Priority.MEDIUM,
            estimateMinutes: 30,
            tags: []
        };
        onUpdate({ ...module, tasks: [...tasks, newTask] });
        setExpandedTaskId(newTask.id); // Auto-expand new task
    };

    const updateTask = (taskId: string, updates: Partial<PlanTask>) => {
        onUpdate({
            ...module,
            tasks: tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        });
    };

    const removeTask = (taskId: string) => {
        onUpdate({
            ...module,
            tasks: tasks.filter(t => t.id !== taskId)
        });
    };

    const toggleTaskTags = (taskId: string, tag: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        const tags = task.tags || [];
        if (tags.includes(tag)) {
            updateTask(taskId, { tags: tags.filter(t => t !== tag) });
        } else {
            updateTask(taskId, { tags: [...tags, tag] });
        }
    };

    const handleCreateTag = async (taskId: string, tagName: string) => {
        if (!tagName.trim()) return;
        // Check if exists
        const existing = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (existing) {
            toggleTaskTags(taskId, existing.name);
        } else {
            const newTag = await onCreateTag(tagName);
            if (newTag) toggleTaskTags(taskId, newTag.name);
        }
    };

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm overflow-hidden animate-in slide-in-from-bottom-2 ${isGeneral ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}`}>
            {/* Header */}
            <div className={`p-3 border-b flex items-center gap-2 ${isGeneral ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700'}`}>
                {!isGeneral && (
                    <div className="flex flex-col gap-0.5">
                        <button onClick={onMoveUp} className="text-slate-400 hover:text-indigo-500"><ChevronUp size={14} /></button>
                        <button onClick={onMoveDown} className="text-slate-400 hover:text-indigo-500"><ChevronDown size={14} /></button>
                    </div>
                )}
                <div className="flex-1">
                    {isGeneral ? (
                        <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                             <LayoutList size={18} /> Общие Задачи
                        </div>
                    ) : (
                        <input 
                            value={module.title}
                            onChange={(e) => onUpdate({ ...module, title: e.target.value })}
                            placeholder="Название Фокуса"
                            className="w-full bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400"
                        />
                    )}
                </div>
                {!isGeneral && (
                    <button 
                        onClick={() => onUpdate({ ...module, isCollapsed: !module.isCollapsed })}
                        className="text-slate-400 p-1"
                    >
                        {module.isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                    </button>
                )}
                {!isGeneral && (
                    <button onClick={onRemove} className="text-slate-300 hover:text-rose-500 p-1">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            {/* Tasks */}
            {!module.isCollapsed && (
                <div className="p-3 space-y-2">
                    {tasks.length === 0 && (
                        <div className="text-xs text-slate-400 italic py-2 text-center">Нет задач в этом блоке</div>
                    )}
                    {tasks.map(task => {
                        const isExpanded = expandedTaskId === task.id;
                        return (
                            <div key={task.id} className={`group border rounded-lg transition-all ${isExpanded ? 'bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-slate-600 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                                {/* Task Row Header */}
                                <div className="flex items-center gap-2 p-2">
                                     <button 
                                        onClick={() => updateTask(task.id, { isDone: !task.isDone })}
                                        className={task.isDone ? 'text-emerald-500' : 'text-slate-300'}
                                     >
                                        {task.isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                                     </button>
                                     
                                     <div className="flex-1 min-w-0" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                value={task.title}
                                                onChange={(e) => updateTask(task.id, { title: e.target.value })}
                                                placeholder="Задача..."
                                                className={`bg-transparent text-sm outline-none w-full cursor-pointer ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`}
                                            />
                                        </div>
                                        {/* Row Tags Preview */}
                                        {!isExpanded && task.tags && task.tags.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {task.tags.map(tagName => {
                                                    const tagEntity = availableTags.find(t => t.name === tagName);
                                                    return (
                                                        <span 
                                                            key={tagName} 
                                                            className="text-[9px] px-1 rounded text-white"
                                                            style={{ backgroundColor: tagEntity?.colorHex || '#94a3b8' }}
                                                        >
                                                            {tagName}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                     </div>

                                     <button 
                                        onClick={() => updateTask(task.id, { isKey: !task.isKey })}
                                        className={`p-1 rounded ${task.isKey ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'text-slate-200 hover:text-amber-400'}`}
                                        title="Важная задача"
                                     >
                                        <Zap size={14} fill={task.isKey ? 'currentColor' : 'none'} />
                                     </button>
                                     <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="text-slate-300 hover:text-indigo-500">
                                         {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                     </button>
                                </div>
                                
                                {/* Expanded Rich Editor */}
                                {isExpanded && (
                                    <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800 mt-1">
                                        <div className="grid grid-cols-2 gap-3 mt-3">
                                             <div>
                                                 <label className="text-[10px] font-bold text-slate-400 uppercase">Приоритет</label>
                                                 <div className="flex gap-1 mt-1">
                                                     {[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (
                                                         <button 
                                                            key={p} 
                                                            onClick={() => updateTask(task.id, { priority: p })}
                                                            className={`flex-1 text-[10px] py-1 rounded border ${task.priority === p ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                                         >
                                                             {p[0]}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>
                                             <div>
                                                 <label className="text-[10px] font-bold text-slate-400 uppercase">Оценка (мин)</label>
                                                 <div className="flex items-center gap-2 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1">
                                                     <Clock size={12} className="text-slate-400" />
                                                     <input 
                                                        type="number" 
                                                        value={task.estimateMinutes}
                                                        onChange={(e) => updateTask(task.id, { estimateMinutes: parseInt(e.target.value) || 0 })}
                                                        className="w-full text-xs bg-transparent outline-none dark:text-white"
                                                     />
                                                 </div>
                                             </div>
                                        </div>
                                        
                                        <div className="mt-3">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Tag size={10} /> Теги</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {availableTags.map(tag => (
                                                    <button 
                                                        key={tag.id}
                                                        onClick={() => toggleTaskTags(task.id, tag.name)}
                                                        className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${task.tags?.includes(tag.name) ? 'text-white' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`}
                                                        style={task.tags?.includes(tag.name) ? { backgroundColor: tag.colorHex, borderColor: tag.colorHex } : {}}
                                                    >
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.tags?.includes(tag.name) ? 'white' : tag.colorHex }} />
                                                        {tag.name}
                                                    </button>
                                                ))}
                                                <input 
                                                    placeholder="+ Новый"
                                                    className="text-[10px] bg-transparent outline-none min-w-[50px] px-2 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:text-white"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleCreateTag(task.id, e.currentTarget.value);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="mt-3 flex justify-end">
                                            <button 
                                                onClick={() => removeTask(task.id)}
                                                className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Удалить
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={addTask} className="text-xs font-bold text-indigo-500 flex items-center gap-1 mt-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded w-fit">
                        <Plus size={14} /> Добавить
                    </button>
                </div>
            )}
        </div>
    );
};

// --- TASK PICKER MODAL ---

const TaskPicker: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tasks: TaskEntity[];
    onPick: (task: TaskEntity) => void;
}> = ({ isOpen, onClose, tasks, onPick }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Бэклог Задач</h3>
                    <button onClick={onClose}><X className="text-slate-400" /></button>
                </div>
                <div className="overflow-y-auto p-2 space-y-1 flex-1">
                    {(tasks || []).length === 0 && (
                        <div className="p-4 text-center text-slate-400">Нет активных задач в бэклоге.</div>
                    )}
                    {(tasks || []).map(t => (
                        <button 
                            key={t.id}
                            onClick={() => onPick(t)}
                            className="w-full text-left p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors"
                        >
                            <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{t.title}</div>
                                <div className="text-[10px] text-slate-400 uppercase">{t.priority} • {t.estimateMinutes}м</div>
                            </div>
                            <Plus size={18} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const WeeklyPlanBuilder: React.FC<WeeklyPlanBuilderProps> = ({ userId, planId, periodStart, onNavigateBack, labels }) => {
    
    // State
    const [title, setTitle] = useState('План Недели');
    const [data, setData] = useState<WeeklyPlanData>({
        mainGoal: '',
        focuses: [], 
        kpis: [],
        checkpoints: []
    });
    
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    
    // Backlog State
    const [backlog, setBacklog] = useState<TaskEntity[]>([]);
    const [isPickerOpen, setIsPickerOpen] = useState(false);

    // Hooks
    const { tags: availableTags, createTag } = useTagsViewModel();

    // Init Logic
    useEffect(() => {
        // Load Plan
        if (planId) {
            setLoading(true);
            const res = PlanRepository.getPlanById(planId);
            if (res.success && res.data.plan.structureJson) {
                setTitle(res.data.plan.title);
                try {
                    const parsed = JSON.parse(res.data.plan.structureJson);
                    // Defensive merge to ensure focuses is always an array
                    setData({
                        mainGoal: parsed.mainGoal || '',
                        focuses: Array.isArray(parsed.focuses) ? parsed.focuses : [],
                        kpis: Array.isArray(parsed.kpis) ? parsed.kpis : [],
                        checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : []
                    });
                } catch(e) { 
                    console.error(e); 
                    setData(prev => ({ ...prev }));
                }
            } else if (res.success) {
                setTitle(res.data.plan.title);
            }
            setLoading(false);
        } else {
             // New Plan Seed
             setData({
                 mainGoal: '',
                 focuses: [
                     { id: 'f1', title: 'Фокус 1', tasks: [] }
                 ],
                 kpis: [],
                 checkpoints: [
                     { id: 'c1', title: 'Экватор недели', date: periodStart + 86400000 * 2, isDone: false }
                 ]
             });
        }

        // Load Backlog
        const tasksRes = TaskRepository.getTasksForUser(userId);
        if (tasksRes.success) {
            setBacklog(tasksRes.data.filter(t => t.status !== TaskStatus.DONE));
        }
    }, [planId, periodStart, userId]);

    // --- LOGIC ---

    const handleSave = async () => {
        const plan = {
            id: planId || crypto.randomUUID(),
            userId,
            type: PlanType.WEEKLY,
            periodStart,
            periodEnd: periodStart + 604800000,
            title,
            createdAt: Date.now(),
            structureJson: JSON.stringify(data)
        };
        await PlanRepository.createOrUpdatePlan(plan, []); 
        onNavigateBack();
    };

    const updateFocus = (updated: FocusModule) => {
        setData(prev => ({
            ...prev,
            focuses: (prev.focuses || []).map(f => f.id === updated.id ? updated : f)
        }));
    };

    const addFocus = () => {
        setData(prev => ({
            ...prev,
            focuses: [...(prev.focuses || []), { id: crypto.randomUUID(), title: 'Новый Фокус', tasks: [] }]
        }));
    };

    const moveFocus = (index: number, direction: -1 | 1) => {
        const focuses = data.focuses || [];
        const strategic = focuses.filter(f => f.id !== 'general_tasks');
        const general = focuses.find(f => f.id === 'general_tasks');
        
        if (index + direction < 0 || index + direction >= strategic.length) return;
        
        const temp = strategic[index];
        strategic[index] = strategic[index + direction];
        strategic[index + direction] = temp;
        
        setData(prev => ({
             ...prev, 
             focuses: general ? [...strategic, general] : strategic 
        }));
    };

    const removeFocus = (id: string) => {
        setData(prev => ({
            ...prev,
            focuses: (prev.focuses || []).filter(f => f.id !== id)
        }));
    };

    // --- BACKLOG LOGIC ---

    const ensureGeneralModule = () => {
        const focuses = data.focuses || [];
        const existing = focuses.find(f => f.id === 'general_tasks');
        if (existing) return existing;
        
        const newGeneral: FocusModule = {
            id: 'general_tasks',
            title: 'Общие Задачи',
            tasks: [],
            isCollapsed: false
        };
        setData(prev => ({ ...prev, focuses: [...(prev.focuses || []), newGeneral] }));
        return newGeneral;
    };

    const handleImportTask = (taskEntity: TaskEntity) => {
        const newTask: PlanTask = {
            id: crypto.randomUUID(),
            title: taskEntity.title,
            isKey: false,
            isDone: false,
            priority: taskEntity.priority,
            estimateMinutes: taskEntity.estimateMinutes,
            tags: taskEntity.tags || []
        };

        setData(prev => {
            const focuses = prev.focuses || [];
            const hasGeneral = focuses.find(f => f.id === 'general_tasks');
            if (hasGeneral) {
                return {
                    ...prev,
                    focuses: focuses.map(f => f.id === 'general_tasks' ? { ...f, tasks: [...(f.tasks || []), newTask] } : f)
                };
            } else {
                 return {
                    ...prev,
                    focuses: [...focuses, { 
                        id: 'general_tasks', 
                        title: 'Общие Задачи', 
                        tasks: [newTask],
                        isCollapsed: false 
                    }]
                };
            }
        });
        
        setIsPickerOpen(false);
    };

    // --- AI GENERATORS ---

    const handleAiDraft = async () => {
        setAiLoading(true);
        const res = await AISimulator.generateResponse("GENERATE_WEEKLY_PLAN_STRUCTURE", { userProfile: { coachingProfile: {} } });
        if (res.suggestionPayload) {
            try {
                const parsed = JSON.parse(res.suggestionPayload);
                setData({
                    mainGoal: parsed.mainGoal || '',
                    focuses: Array.isArray(parsed.focuses) ? parsed.focuses : [],
                    kpis: Array.isArray(parsed.kpis) ? parsed.kpis : [],
                    checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : []
                });
                setTitle("Черновик AI");
            } catch (e) {
                alert("Ошибка генерации плана.");
            }
        }
        setAiLoading(false);
    };

    const handleAiOptimize = async () => {
        setAiLoading(true);
        const currentJson = JSON.stringify(data);
        const res = await AISimulator.generateResponse(`OPTIMIZE_PLAN:${currentJson}`, { userProfile: { coachingProfile: {} } });
        if (res.suggestionPayload) {
             try {
                const parsed = JSON.parse(res.suggestionPayload);
                setData({
                    mainGoal: parsed.mainGoal || '',
                    focuses: Array.isArray(parsed.focuses) ? parsed.focuses : [],
                    kpis: Array.isArray(parsed.kpis) ? parsed.kpis : [],
                    checkpoints: Array.isArray(parsed.checkpoints) ? parsed.checkpoints : []
                });
                alert(res.text);
            } catch (e) { alert("Ошибка оптимизации."); }
        }
        setAiLoading(false);
    };

    const handleAiCritique = async () => {
        setAiLoading(true);
        const currentJson = JSON.stringify(data);
        const res = await AISimulator.generateResponse(`CRITIQUE_PLAN:${currentJson}`, { userProfile: { coachingProfile: {} } });
        alert(res.text);
        setAiLoading(false);
    };

    // Filter focuses for UI separation
    const strategicFocuses = (data.focuses || []).filter(f => f.id !== 'general_tasks');
    const generalTasksModule = (data.focuses || []).find(f => f.id === 'general_tasks') || { id: 'general_tasks', title: 'Общие Задачи', tasks: [] };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                
                <div className="flex gap-2">
                    <button onClick={handleAiDraft} disabled={aiLoading} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg" title="Создать драфт">
                        <Bot size={20} className={aiLoading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={handleAiOptimize} disabled={aiLoading} className="p-2 bg-emerald-50 dark:bg-indigo-900/20 text-emerald-600 rounded-lg" title="Оптимизировать">
                        <Sparkles size={20} />
                    </button>
                    <button onClick={handleAiCritique} disabled={aiLoading} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg" title="Критика">
                        <AlertTriangle size={20} />
                    </button>
                </div>

                <button onClick={handleSave} className="text-indigo-600 font-bold flex items-center gap-1">
                    <Save size={18} /> {labels.save}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                
                {/* Main Goal */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Target size={14} /> {labels.mainGoal}
                    </label>
                    <textarea 
                        value={data.mainGoal}
                        onChange={(e) => setData({ ...data, mainGoal: e.target.value })}
                        placeholder="Какая главная цель этой недели?"
                        className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-lg font-bold dark:text-white resize-none h-24"
                    />
                </div>

                {/* Focus Modules */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Zap size={14} /> {labels.focusAreas}
                        </label>
                        <button onClick={addFocus} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <Plus size={14} /> {labels.addFocus || "Добавить фокус"}
                        </button>
                    </div>

                    {strategicFocuses.map((focus, index) => (
                        <FocusModuleCard 
                            key={focus.id}
                            module={focus}
                            onUpdate={updateFocus}
                            onRemove={() => removeFocus(focus.id)}
                            onMoveUp={() => moveFocus(index, -1)}
                            onMoveDown={() => moveFocus(index, 1)}
                            availableTags={availableTags}
                            onCreateTag={createTag}
                        />
                    ))}
                    
                    {strategicFocuses.length === 0 && (
                        <div className="text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400">
                            Нет стратегических фокусов.
                        </div>
                    )}
                </div>

                {/* TASKS BLOCK */}
                <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <LayoutList size={14} /> {labels.generalTasks}
                        </label>
                        <button 
                            onClick={() => setIsPickerOpen(true)}
                            className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded"
                        >
                            <Search size={14} /> {labels.pickFromBacklog}
                        </button>
                    </div>

                    <FocusModuleCard 
                        module={generalTasksModule}
                        onUpdate={(updated) => {
                             const focuses = data.focuses || [];
                             const exists = focuses.find(f => f.id === 'general_tasks');
                             if (exists) updateFocus(updated);
                             else setData(prev => ({ ...prev, focuses: [...(prev.focuses || []), updated] }));
                        }}
                        onRemove={() => {}} 
                        onMoveUp={() => {}} 
                        onMoveDown={() => {}}
                        isGeneral={true}
                        availableTags={availableTags}
                        onCreateTag={createTag}
                    />
                </div>

                {/* KPI Section */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} /> {labels.kpis || "KPIs"}
                        </label>
                        <button 
                            onClick={() => setData(prev => ({...prev, kpis: [...(prev.kpis || []), { id: crypto.randomUUID(), title: '', target: 10, current: 0, unit: 'count', isDone: false }] }))}
                            className="text-indigo-600"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    {(data.kpis || []).map((kpi, idx) => (
                        <div key={kpi.id} className="flex items-center gap-2">
                            <input 
                                value={kpi.title}
                                onChange={(e) => {
                                    const newKpis = [...(data.kpis || [])];
                                    newKpis[idx].title = e.target.value;
                                    setData({...data, kpis: newKpis});
                                }}
                                placeholder="Метрика..."
                                className="flex-1 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none"
                            />
                            <input 
                                type="number"
                                value={kpi.target}
                                onChange={(e) => {
                                    const newKpis = [...(data.kpis || [])];
                                    newKpis[idx].target = parseFloat(e.target.value);
                                    setData({...data, kpis: newKpis});
                                }}
                                className="w-16 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm text-center dark:text-white outline-none"
                            />
                            <button 
                                onClick={() => setData(prev => ({...prev, kpis: (prev.kpis || []).filter(k => k.id !== kpi.id)}))}
                                className="text-slate-300 hover:text-rose-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

                 {/* Checkpoints Section */}
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex justify-between items-center">
                         <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Calendar size={14} /> {labels.checkpoints}
                        </label>
                        <button 
                            onClick={() => setData(prev => ({...prev, checkpoints: [...(prev.checkpoints || []), { id: crypto.randomUUID(), title: 'Review', date: periodStart, isDone: false }] }))}
                            className="text-indigo-600"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    {(data.checkpoints || []).map((cp, idx) => (
                        <div key={cp.id} className="flex items-center gap-2">
                            <input 
                                type="date"
                                value={new Date(cp.date).toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const newCps = [...(data.checkpoints || [])];
                                    newCps[idx].date = new Date(e.target.value).getTime();
                                    setData({...data, checkpoints: newCps});
                                }}
                                className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none"
                            />
                            <input 
                                value={cp.title}
                                onChange={(e) => {
                                    const newCps = [...(data.checkpoints || [])];
                                    newCps[idx].title = e.target.value;
                                    setData({...data, checkpoints: newCps});
                                }}
                                placeholder="Название..."
                                className="flex-1 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none"
                            />
                            <button 
                                onClick={() => setData(prev => ({...prev, checkpoints: (prev.checkpoints || []).filter(k => k.id !== cp.id)}))}
                                className="text-slate-300 hover:text-rose-500"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>

            </div>
            
            <TaskPicker 
                isOpen={isPickerOpen} 
                onClose={() => setIsPickerOpen(false)} 
                tasks={backlog} 
                onPick={handleImportTask} 
            />
        </div>
    );
};
