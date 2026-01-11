
import React, { useState, useEffect } from 'react';
import { PlanType, MonthlyPlanData, FocusModule, PlanTask, PlanKPI, PlanCheckpoint, PlanExperience, Priority, TagEntity } from '../types';
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, Bot, Sparkles, Target, Activity, Calendar, Zap, AlertTriangle, List, Shield, PenTool, X, CheckSquare, Square, LayoutList, Clock, Tag, FlaskConical, ArrowRight, TrendingDown, Flag, XCircle } from 'lucide-react';
import { PlanRepository } from '../data/repositories';
import { AISimulator } from '../utils/ai-simulator';
import { useTagsViewModel } from '../hooks/viewmodels';

interface MonthlyPlanBuilderProps {
    userId: string;
    planId?: string;
    periodStart: number;
    onNavigateBack: () => void;
    labels: any;
}

// --- SUB COMPONENTS ---

const GeneralTasksCard: React.FC<{
    tasks: PlanTask[];
    onUpdate: (tasks: PlanTask[]) => void;
    availableTags: TagEntity[];
    onCreateTag: (name: string) => Promise<TagEntity | null>;
}> = ({ tasks, onUpdate, availableTags, onCreateTag }) => {
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const addTask = () => {
        const newTask: PlanTask = { id: crypto.randomUUID(), title: '', isKey: false, isDone: false, priority: Priority.MEDIUM, estimateMinutes: 30, tags: [] };
        onUpdate([...tasks, newTask]); setExpandedTaskId(newTask.id);
    };
    const updateTask = (taskId: string, updates: Partial<PlanTask>) => onUpdate(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    const removeTask = (taskId: string) => onUpdate(tasks.filter(t => t.id !== taskId));
    const toggleTaskTags = (taskId: string, tag: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        const currentTags = task.tags || [];
        updateTask(taskId, { tags: currentTags.includes(tag) ? currentTags.filter(t => t !== tag) : [...currentTags, tag] });
    };
    const handleCreateTag = async (taskId: string, tagName: string) => {
        if (!tagName.trim()) return;
        const existing = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (existing) toggleTaskTags(taskId, existing.name);
        else { const newTag = await onCreateTag(tagName); if (newTag) toggleTaskTags(taskId, newTag.name); }
    };
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
            <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                <LayoutList size={18} className="text-slate-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300 flex-1">Главные Задачи (Tasks)</span>
            </div>
            <div className="p-3 space-y-2">
                {tasks.length === 0 && <div className="text-xs text-slate-400 italic py-2 text-center">Нет задач.</div>}
                {tasks.map(task => {
                    const isExpanded = expandedTaskId === task.id;
                    return (
                        <div key={task.id} className={`group border rounded-lg transition-all ${isExpanded ? 'bg-slate-50 dark:bg-slate-900 border-indigo-200 dark:border-slate-600 shadow-sm' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                            <div className="flex items-center gap-2 p-2">
                                 <button onClick={() => updateTask(task.id, { isDone: !task.isDone })} className={task.isDone ? 'text-emerald-500' : 'text-slate-300'}>{task.isDone ? <CheckSquare size={18} /> : <Square size={18} />}</button>
                                 <div className="flex-1 min-w-0" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                                    <div className="flex items-center gap-2"><input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} placeholder="Задача..." className={`bg-transparent text-sm outline-none w-full cursor-pointer ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`} /></div>
                                    {!isExpanded && task.tags && task.tags.length > 0 && <div className="flex gap-1 mt-1">{task.tags.map(tagName => { const tagEntity = availableTags.find(t => t.name === tagName); return (<span key={tagName} className="text-[9px] px-1 rounded text-white" style={{ backgroundColor: tagEntity?.colorHex || '#94a3b8' }}>{tagName}</span>); })}</div>}
                                 </div>
                                 <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="text-slate-300 hover:text-indigo-500">{isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
                            </div>
                            {isExpanded && (
                                <div className="p-3 pt-0 border-t border-slate-100 dark:border-slate-800 mt-1">
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                         <div><label className="text-[10px] font-bold text-slate-400 uppercase">Приоритет</label><div className="flex gap-1 mt-1">{[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (<button key={p} onClick={() => updateTask(task.id, { priority: p })} className={`flex-1 text-[10px] py-1 rounded border ${task.priority === p ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800' : 'border-slate-100 dark:border-slate-700 text-slate-500'}`}>{p[0]}</button>))}</div></div>
                                         <div><label className="text-[10px] font-bold text-slate-400 uppercase">Оценка (мин)</label><div className="flex items-center gap-2 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1"><Clock size={12} className="text-slate-400" /><input type="number" value={task.estimateMinutes} onChange={(e) => updateTask(task.id, { estimateMinutes: parseInt(e.target.value) || 0 })} className="w-full text-xs bg-transparent outline-none dark:text-white" /></div></div>
                                    </div>
                                    <div className="mt-3"><label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Tag size={10} /> Теги</label><div className="flex flex-wrap gap-1 mt-1">{availableTags.map(tag => (<button key={tag.id} onClick={() => toggleTaskTags(task.id, tag.name)} className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1 ${task.tags?.includes(tag.name) ? 'text-white' : 'bg-slate-50 border-slate-100 text-slate-500 dark:bg-slate-800 dark:border-slate-700'}`} style={task.tags?.includes(tag.name) ? { backgroundColor: tag.colorHex, borderColor: tag.colorHex } : {}}><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.tags?.includes(tag.name) ? 'white' : tag.colorHex }} />{tag.name}</button>))}<input placeholder="+ Новый" className="text-[10px] bg-transparent outline-none min-w-[50px] px-2 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-indigo-500 dark:text-white" onKeyDown={(e) => { if (e.key === 'Enter') { handleCreateTag(task.id, e.currentTarget.value); e.currentTarget.value = ''; } }} /></div></div>
                                    <div className="mt-3 flex justify-end"><button onClick={() => removeTask(task.id)} className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1"><Trash2 size={12} /> Удалить</button></div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <button onClick={addTask} className="text-xs font-bold text-indigo-500 flex items-center gap-1 mt-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-2 py-1 rounded w-fit"><Plus size={14} /> Добавить</button>
            </div>
        </div>
    );
};

const ExperienceCard: React.FC<{
    experience: PlanExperience;
    onUpdate: (e: PlanExperience) => void;
    onRemove: () => void;
}> = ({ experience, onUpdate, onRemove }) => {
    return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
            <div className="p-4 border-b border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400"><FlaskConical size={20} /></div>
                <div className="flex-1"><div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mb-1">ЭКСПЕРИМЕНТ</div><input value={experience.title} onChange={(e) => onUpdate({ ...experience, title: e.target.value })} placeholder="Например: Заменить рилсы на чтение" className="w-full bg-transparent font-bold text-lg text-slate-900 dark:text-white outline-none placeholder:text-slate-400" /></div>
                <button onClick={onRemove} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={18} /></button>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Гипотеза</label><textarea value={experience.hypothesis} onChange={(e) => onUpdate({ ...experience, hypothesis: e.target.value })} placeholder="Если я сделаю X, то получу Y..." className="w-full bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2 text-sm outline-none resize-none h-16 dark:text-white" /></div>
                    <div className="w-24"><label className="text-[10px] font-bold text-slate-400 uppercase">Длительность</label><div className="flex items-center gap-1 mt-1"><input type="number" value={experience.duration} onChange={(e) => onUpdate({ ...experience, duration: parseInt(e.target.value) || 14 })} className="w-full bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2 text-center font-bold dark:text-white" /><span className="text-xs text-slate-500 font-bold">дн.</span></div></div>
                </div>
                <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Метрика успеха (KPI)</label><div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-800 rounded-lg p-2"><input value={experience.kpiMetric} onChange={(e) => onUpdate({ ...experience, kpiMetric: e.target.value })} placeholder="Название метрики (мин. чтения)" className="flex-1 bg-transparent text-sm font-medium dark:text-white outline-none" /><div className="flex items-center gap-2 text-sm"><input type="number" value={experience.kpiBaseline} onChange={(e) => onUpdate({ ...experience, kpiBaseline: parseFloat(e.target.value) || 0 })} className="w-10 text-center bg-slate-100 dark:bg-slate-800 rounded dark:text-white" placeholder="0" /><ArrowRight size={14} className="text-indigo-400" /><input type="number" value={experience.kpiTarget} onChange={(e) => onUpdate({ ...experience, kpiTarget: parseFloat(e.target.value) || 0 })} className="w-10 text-center bg-indigo-100 dark:bg-indigo-900/50 rounded font-bold text-indigo-700 dark:text-indigo-300" placeholder="Цель" /></div></div></div>
            </div>
        </div>
    );
};

const StrategicFocusCard: React.FC<{
    module: FocusModule;
    onUpdate: (m: FocusModule) => void;
    onRemove: () => void;
}> = ({ module, onUpdate, onRemove }) => {
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
    const addBigTask = () => { const newTask: PlanTask = { id: crypto.randomUUID(), title: '', isKey: true, isDone: false, priority: Priority.HIGH, estimateMinutes: 0, tags: [], steps: [] }; onUpdate({ ...module, tasks: [...module.tasks, newTask] }); setExpandedTaskId(newTask.id); };
    const updateTask = (taskId: string, updates: Partial<PlanTask>) => { onUpdate({ ...module, tasks: module.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) }); };
    const removeTask = (taskId: string) => { onUpdate({ ...module, tasks: module.tasks.filter(t => t.id !== taskId) }); };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
            <div className="p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                <Zap size={20} className="text-purple-500" />
                <div className="flex-1"><input value={module.title} onChange={(e) => onUpdate({ ...module, title: e.target.value })} placeholder="Название Ключевого Фокуса" className="w-full bg-transparent font-bold text-lg text-slate-800 dark:text-slate-200 outline-none placeholder:text-slate-400" /></div>
                <button onClick={onRemove} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={18} /></button>
            </div>
            <div className="p-3 space-y-3">
                {module.tasks.length === 0 && <div className="text-sm text-slate-400 italic py-2 text-center border-2 border-dashed border-slate-100 dark:border-slate-700 rounded-lg">Добавьте ключевые проекты</div>}
                {module.tasks.map(task => {
                    const isExpanded = expandedTaskId === task.id;
                    return (
                        <div key={task.id} className={`group border rounded-xl transition-all ${isExpanded ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'}`}>
                            <div className="flex items-center gap-3 p-3">
                                <button onClick={() => updateTask(task.id, { isDone: !task.isDone })} className={task.isDone ? 'text-emerald-500' : 'text-slate-300 hover:text-purple-500'}>{task.isDone ? <CheckSquare size={20} /> : <Square size={20} />}</button>
                                <div className="flex-1 min-w-0" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}><input value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })} placeholder="Проект / Задача..." className={`bg-transparent text-sm outline-none w-full cursor-pointer font-medium ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`} /></div>
                                <button onClick={() => setExpandedTaskId(isExpanded ? null : task.id)} className="text-slate-300 hover:text-indigo-500">{isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
                            </div>
                            {isExpanded && (
                                <div className="p-3 pt-0 pl-10 border-t border-dashed border-slate-200 dark:border-slate-700">
                                    <div className="mt-2 space-y-2">
                                        <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-slate-400 uppercase">Этапы (Steps)</span><button onClick={() => { if (task.title.length > 3) { const steps = ["Неделя 1: Анализ", "Неделя 2: Драфт", "Неделя 3: Финал"]; updateTask(task.id, { steps }); } }} className="text-[10px] text-purple-600 font-bold flex items-center gap-1 hover:underline"><Sparkles size={10} /> AI Разбив</button></div>
                                        {task.steps?.map((step, idx) => (<div key={idx} className="flex gap-2 items-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300" /><input value={step} onChange={(e) => { const newSteps = [...(task.steps || [])]; newSteps[idx] = e.target.value; updateTask(task.id, { steps: newSteps }); }} className="flex-1 bg-transparent text-xs text-slate-600 dark:text-slate-400 outline-none border-b border-transparent focus:border-purple-200" /><button onClick={() => updateTask(task.id, { steps: task.steps?.filter((_, i) => i !== idx) })} className="text-slate-300 hover:text-rose-500"><X size={12} /></button></div>))}
                                        <button onClick={() => updateTask(task.id, { steps: [...(task.steps || []), "Новый этап"] })} className="text-xs text-slate-400 hover:text-purple-600 flex items-center gap-1 mt-1"><Plus size={12} /> Добавить этап</button>
                                    </div>
                                    <div className="mt-3 flex justify-end"><button onClick={() => removeTask(task.id)} className="text-xs text-rose-400 hover:text-rose-600 flex items-center gap-1"><Trash2 size={12} /> Удалить блок</button></div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <button onClick={addBigTask} className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-purple-600 hover:border-purple-200 text-sm font-bold flex items-center justify-center gap-2 transition-colors"><Plus size={16} /> Добавить Ключевой Проект</button>
            </div>
        </div>
    );
};

// --- NEW MODULES ---

const KPIsCard: React.FC<{
    kpis: PlanKPI[];
    onUpdate: (kpis: PlanKPI[]) => void;
}> = ({ kpis, onUpdate }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={14} /> Метрики / KPIs
                </label>
                <button 
                    onClick={() => onUpdate([...kpis, { id: crypto.randomUUID(), title: '', target: 10, current: 0, unit: 'ед.', isDone: false }])}
                    className="text-indigo-600"
                >
                    <Plus size={16} />
                </button>
            </div>
            {kpis.map((kpi, idx) => (
                <div key={kpi.id} className="flex items-center gap-2">
                    <input 
                        value={kpi.title}
                        onChange={(e) => {
                            const newKpis = [...kpis];
                            newKpis[idx].title = e.target.value;
                            onUpdate(newKpis);
                        }}
                        placeholder="Название метрики..."
                        className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none"
                    />
                    <input 
                        type="number"
                        value={kpi.target}
                        onChange={(e) => {
                            const newKpis = [...kpis];
                            newKpis[idx].target = parseFloat(e.target.value);
                            onUpdate(newKpis);
                        }}
                        className="w-16 shrink-0 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm text-center dark:text-white outline-none"
                        placeholder="Цель"
                    />
                    <button 
                        onClick={() => onUpdate(kpis.filter(k => k.id !== kpi.id))}
                        className="text-slate-300 hover:text-rose-500 shrink-0"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            {kpis.length === 0 && <div className="text-xs text-slate-400 italic text-center py-2">Добавьте измеримые цели</div>}
        </div>
    );
};

const DropsCard: React.FC<{
    drops: string[];
    onUpdate: (drops: string[]) => void;
}> = ({ drops, onUpdate }) => {
    return (
        <div className="bg-rose-50 dark:bg-rose-900/10 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 space-y-3">
            <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-2">
                    <TrendingDown size={14} /> Что убрать (Drops)
                </label>
                <button 
                    onClick={() => onUpdate([...drops, ""])}
                    className="text-rose-600"
                >
                    <Plus size={16} />
                </button>
            </div>
            {drops.map((drop, idx) => (
                <div key={idx} className="flex items-center gap-2">
                    <XCircle size={16} className="text-rose-400 shrink-0" />
                    <input 
                        value={drop}
                        onChange={(e) => {
                            const newDrops = [...drops];
                            newDrops[idx] = e.target.value;
                            onUpdate(newDrops);
                        }}
                        placeholder="От чего отказаться..."
                        className="flex-1 min-w-0 bg-white dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none border border-rose-100 dark:border-rose-900/30"
                    />
                    <button 
                        onClick={() => onUpdate(drops.filter((_, i) => i !== idx))}
                        className="text-rose-300 hover:text-rose-600 shrink-0"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
            {drops.length === 0 && <div className="text-xs text-rose-300 italic text-center py-2">Список "Не делать" пуст</div>}
        </div>
    );
};

const CheckpointsCard: React.FC<{
    checkpoints: PlanCheckpoint[];
    periodStart: number;
    onUpdate: (cp: PlanCheckpoint[]) => void;
}> = ({ checkpoints, periodStart, onUpdate }) => {
    
    const initCheckpoints = () => {
        // Create 4 weekly checkpoints
        const newCps = [];
        for(let i=1; i<=4; i++) {
            newCps.push({
                id: crypto.randomUUID(),
                title: `Неделя ${i}: Спринт`,
                date: periodStart + (i * 7 * 86400000),
                isDone: false
            });
        }
        onUpdate(newCps);
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex justify-between items-center">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Flag size={14} /> Чекпоинты (Недели)
                </label>
                {checkpoints.length === 0 && (
                    <button onClick={initCheckpoints} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                        Авто-заполнить
                    </button>
                )}
            </div>
            {checkpoints.map((cp, idx) => (
                <div key={cp.id} className="flex items-center gap-2">
                    <div className="text-xs font-bold text-slate-400 w-6 shrink-0">W{idx+1}</div>
                    <input 
                        type="date"
                        value={new Date(cp.date).toISOString().split('T')[0]}
                        onChange={(e) => {
                            const newCps = [...checkpoints];
                            newCps[idx].date = new Date(e.target.value).getTime();
                            onUpdate(newCps);
                        }}
                        className="bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none w-32 shrink-0"
                    />
                    <input 
                        value={cp.title}
                        onChange={(e) => {
                            const newCps = [...checkpoints];
                            newCps[idx].title = e.target.value;
                            onUpdate(newCps);
                        }}
                        placeholder="Фокус недели..."
                        className="flex-1 min-w-0 bg-slate-50 dark:bg-slate-900 p-2 rounded text-sm dark:text-white outline-none"
                    />
                </div>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

export const MonthlyPlanBuilder: React.FC<MonthlyPlanBuilderProps> = ({ userId, planId, periodStart, onNavigateBack, labels }) => {
    
    const [title, setTitle] = useState('План на месяц');
    const [data, setData] = useState<MonthlyPlanData>({
        mainGoal: '',
        focuses: [],
        generalTasks: [],
        experiences: [],
        kpis: [],
        barriers: [],
        checkpoints: []
    });
    const [loading, setLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const { tags: availableTags, createTag } = useTagsViewModel();

    useEffect(() => {
        if (planId) {
            setLoading(true);
            const res = PlanRepository.getPlanById(planId);
            if (res.success && res.data.plan.structureJson) {
                setTitle(res.data.plan.title);
                try {
                    const parsed = JSON.parse(res.data.plan.structureJson);
                    setData({
                        mainGoal: parsed.mainGoal || '',
                        focuses: parsed.focuses || [],
                        generalTasks: parsed.generalTasks || [],
                        experiences: parsed.experiences || [],
                        kpis: parsed.kpis || [],
                        barriers: parsed.barriers || [],
                        checkpoints: parsed.checkpoints || []
                    });
                } catch(e) { console.error(e); }
            }
            setLoading(false);
        }
    }, [planId]);

    const handleSave = async () => {
        const plan = {
            id: planId || crypto.randomUUID(),
            userId,
            type: PlanType.MONTHLY,
            periodStart,
            periodEnd: periodStart + 2592000000,
            title,
            createdAt: Date.now(),
            structureJson: JSON.stringify(data)
        };
        await PlanRepository.createOrUpdatePlan(plan, []); 
        onNavigateBack();
    };

    const handleAiDraft = async () => {
        setAiLoading(true);
        const res = await AISimulator.generateResponse("GENERATE_MONTHLY_PLAN_STRUCTURE", { userProfile: { coachingProfile: {} } });
        if (res.suggestionPayload) {
            try {
                const parsed = JSON.parse(res.suggestionPayload);
                setData(parsed);
                setTitle("AI Черновик");
            } catch (e) { alert("Ошибка генерации."); }
        }
        setAiLoading(false);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></button>
                <div className="flex gap-2">
                    <button onClick={handleAiDraft} disabled={aiLoading} className="px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg flex items-center gap-2 font-bold text-xs" title="Создать драфт">
                        <Bot size={16} className={aiLoading ? 'animate-spin' : ''} />
                        AI Черновик
                    </button>
                </div>
                <button onClick={handleSave} className="text-indigo-600 font-bold flex items-center gap-1"><Save size={18} /> {labels.save}</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                {/* Main Goal */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Target size={14} /> Главная Цель Месяца</label>
                    <textarea value={data.mainGoal} onChange={(e) => setData({ ...data, mainGoal: e.target.value })} placeholder="Чего мы должны достичь любой ценой?" className="w-full bg-white dark:bg-slate-800 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 outline-none focus:border-indigo-500 text-lg font-bold dark:text-white resize-none h-24" />
                </div>

                {/* Key Focuses */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Zap size={14} /> Ключевые Фокусы (Стратегия)</label><button onClick={() => setData(prev => ({...prev, focuses: [...prev.focuses, { id: crypto.randomUUID(), title: '', tasks: [] }]}))} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Plus size={14} /> Добавить</button></div>
                    {data.focuses.map((focus) => (
                        <StrategicFocusCard 
                            key={focus.id}
                            module={focus}
                            onUpdate={(u) => setData(prev => ({ ...prev, focuses: prev.focuses.map(f => f.id === u.id ? u : f) }))}
                            onRemove={() => setData(prev => ({ ...prev, focuses: prev.focuses.filter(f => f.id !== focus.id) }))}
                        />
                    ))}
                </div>

                {/* General Tasks */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><LayoutList size={14} /> Отдельные Задачи</label>
                    <GeneralTasksCard 
                        tasks={data.generalTasks}
                        onUpdate={(t) => setData(prev => ({ ...prev, generalTasks: t }))}
                        availableTags={availableTags}
                        onCreateTag={createTag}
                    />
                </div>

                {/* KPIs & Drops Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <KPIsCard 
                        kpis={data.kpis} 
                        onUpdate={(k) => setData(prev => ({ ...prev, kpis: k }))} 
                    />
                    <DropsCard 
                        drops={data.barriers} 
                        onUpdate={(d) => setData(prev => ({ ...prev, barriers: d }))} 
                    />
                </div>

                {/* Checkpoints */}
                <CheckpointsCard 
                    checkpoints={data.checkpoints} 
                    periodStart={periodStart}
                    onUpdate={(cp) => setData(prev => ({ ...prev, checkpoints: cp }))} 
                />

                {/* Experiments */}
                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex justify-between items-end"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><FlaskConical size={14} /> Эксперименты</label><button onClick={() => setData(prev => ({...prev, experiences: [...prev.experiences, { id: crypto.randomUUID(), title: '', duration: 14, hypothesis: '', kpiMetric: '', kpiBaseline: 0, kpiTarget: 0, action: '' }]}))} className="text-xs font-bold text-purple-600 flex items-center gap-1"><Plus size={14} /> Добавить</button></div>
                    {data.experiences.map((exp) => (
                        <ExperienceCard 
                            key={exp.id}
                            experience={exp}
                            onUpdate={(u) => setData(prev => ({ ...prev, experiences: prev.experiences.map(e => e.id === u.id ? u : e) }))}
                            onRemove={() => setData(prev => ({ ...prev, experiences: prev.experiences.filter(e => e.id !== exp.id) }))}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};