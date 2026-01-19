
import React, { useState, useEffect, useRef } from 'react';
import { GoalEntity, GoalStatus, GoalKPI, KPIType, Priority, EnergyLevel, TaskEntity, TaskStatus, GoalType, RoadmapNode } from '../types';
import { Plan } from '../domain/models';
import { useGoalDetailViewModel } from '../hooks/viewmodels';
import { GoalRepository, TaskRepository } from '../data/repositories';
import { UseCases } from '../domain/usecases';
import { TaskMapper } from '../data/mappers';
import { 
    Plus, Minus, Target, ArrowRight, Calendar, BarChart3, Activity, 
    CheckCircle2, Circle, AlertTriangle, ArrowLeft, Edit2, 
    Trash2, Play, Battery, Flag, Zap, Repeat, Layout, Clock, Anchor, FileText, Link, X, Map as MapIcon, UserCircle2, Check, Settings, Info, Save, GripVertical
} from 'lucide-react';

// --- HELPERS ---

const uuid = () => crypto.randomUUID();

const getStatusColor = (status: GoalStatus) => {
    switch(status) {
        case GoalStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
        case GoalStatus.COMPLETED: return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
        case GoalStatus.PAUSED: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        case GoalStatus.AT_RISK: return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800';
    }
};

const getStatusLabel = (status: GoalStatus) => {
    switch(status) {
        case GoalStatus.ACTIVE: return 'Active';
        case GoalStatus.COMPLETED: return 'Done';
        case GoalStatus.PAUSED: return 'Paused';
        case GoalStatus.AT_RISK: return 'At Risk';
    }
};

const getPriorityColor = (p: Priority) => {
    switch(p) {
        case Priority.HIGH: return 'text-rose-500 border-rose-500/30';
        case Priority.MEDIUM: return 'text-amber-500 border-amber-500/30';
        case Priority.LOW: return 'text-emerald-500 border-emerald-500/30';
    }
};

const getEnergyColor = (e: EnergyLevel) => {
    switch(e) {
        case EnergyLevel.HIGH: return 'text-rose-400';
        case EnergyLevel.MEDIUM: return 'text-amber-400';
        case EnergyLevel.LOW: return 'text-emerald-400';
    }
};

// --- SUB-COMPONENTS ---

const FUTURE_SELF_PRESETS = ["Доход", "Дисциплина", "Свобода", "Окружение", "Здоровье", "Навыки", "Энергия"];

const GoalComposer: React.FC<{ initialGoal?: GoalEntity, onClose: () => void, onSave: (g: Partial<GoalEntity>) => void }> = ({ initialGoal, onClose, onSave }) => {
    const [title, setTitle] = useState(initialGoal?.title || '');
    const [desc, setDesc] = useState(initialGoal?.description || '');
    const [reason, setReason] = useState(initialGoal?.reason || '');
    const [startDate, setStartDate] = useState(initialGoal?.startDate ? new Date(initialGoal.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(initialGoal?.endDate ? new Date(initialGoal.endDate).toISOString().split('T')[0] : new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
    const [priority, setPriority] = useState<Priority>(initialGoal?.priority || Priority.HIGH);
    const [energy, setEnergy] = useState<EnergyLevel>(initialGoal?.energyLevel || EnergyLevel.HIGH);
    const [futureTags, setFutureTags] = useState<string[]>(initialGoal?.futureSelfTags || []);
    const [customTag, setCustomTag] = useState('');

    const toggleFutureTag = (tag: string) => {
        if (futureTags.includes(tag)) setFutureTags(futureTags.filter(t => t !== tag));
        else setFutureTags([...futureTags, tag]);
    };

    const addCustomTag = () => {
        if (customTag.trim() && !futureTags.includes(customTag.trim())) {
            setFutureTags([...futureTags, customTag.trim()]);
            setCustomTag('');
        }
    };

    const handleSave = () => {
        onSave({ 
            title, 
            description: desc,
            reason: reason,
            startDate: new Date(startDate).getTime(),
            endDate: new Date(endDate).getTime(),
            priority,
            energyLevel: energy,
            futureSelfTags: futureTags
        });
    };
    
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h3 className="text-lg font-bold text-white mb-4">{initialGoal ? 'Edit Goal' : 'New Goal'}</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Title</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1" autoFocus />
                    </div>
                    
                    <div>
                        <label className="text-xs text-slate-400 uppercase font-bold">Vision / Description</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none border border-slate-700 focus:border-indigo-500 h-24 mt-1 resize-none" />
                    </div>

                    <div>
                        <label className="text-xs text-indigo-400 uppercase font-bold flex items-center gap-1"><Anchor size={12} /> WHY (Зачем мне это?)</label>
                        <input 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            placeholder="Ваш личный якорь..." 
                            className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none border border-indigo-500/30 focus:border-indigo-500 mt-1 placeholder:text-slate-600" 
                        />
                    </div>

                    <div>
                        <label className="text-xs text-emerald-400 uppercase font-bold flex items-center gap-1 mb-2"><UserCircle2 size={12} /> Вклад в Будущее Я (Life Map)</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {FUTURE_SELF_PRESETS.map(tag => (
                                <button 
                                    key={tag}
                                    onClick={() => toggleFutureTag(tag)}
                                    className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                                        futureTags.includes(tag) 
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' 
                                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-emerald-500/30'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input 
                                value={customTag}
                                onChange={e => setCustomTag(e.target.value)}
                                placeholder="+ Свой тег"
                                className="flex-1 bg-slate-800 px-3 py-2 rounded-lg text-sm text-white outline-none border border-slate-700"
                                onKeyDown={e => e.key === 'Enter' && addCustomTag()}
                            />
                            <button onClick={addCustomTag} disabled={!customTag.trim()} className="bg-slate-700 px-3 rounded-lg text-white disabled:opacity-50"><Plus size={16} /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold">Start</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1 text-sm" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold">Deadline</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none border border-slate-700 focus:border-indigo-500 mt-1 text-sm" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold">Priority</label>
                            <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none border border-slate-700 mt-1 text-sm">
                                <option value={Priority.HIGH}>HIGH</option>
                                <option value={Priority.MEDIUM}>MEDIUM</option>
                                <option value={Priority.LOW}>LOW</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-slate-400 uppercase font-bold">Energy</label>
                            <select value={energy} onChange={e => setEnergy(e.target.value as EnergyLevel)} className="w-full bg-slate-800 p-2.5 rounded-xl text-white outline-none border border-slate-700 mt-1 text-sm">
                                <option value={EnergyLevel.HIGH}>HIGH</option>
                                <option value={EnergyLevel.MEDIUM}>MEDIUM</option>
                                <option value={EnergyLevel.LOW}>LOW</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-800 rounded-xl">Cancel</button>
                    <button onClick={handleSave} disabled={!title.trim()} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50">Save</button>
                </div>
            </div>
        </div>
    );
};

// --- STAGE EDITOR ---
const StageEditor: React.FC<{ 
    stage: RoadmapNode, 
    onClose: () => void, 
    onSave: (updates: Partial<RoadmapNode>) => void,
    onDelete: () => void 
}> = ({ stage, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState(stage.title);
    const [desc, setDesc] = useState(stage.description || '');
    const [deadline, setDeadline] = useState(stage.deadline ? new Date(stage.deadline).toISOString().split('T')[0] : '');

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Settings size={20} className="text-indigo-500" /> Настройка этапа
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Название этапа</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500" autoFocus />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Описание / Заметки</label>
                        <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Что нужно достичь на этом этапе?" className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500 h-24 resize-none" />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1"><Calendar size={12}/> Дедлайн этапа</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-slate-800 border border-slate-700 p-3 rounded-xl text-white outline-none focus:border-indigo-500" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-8">
                    <button onClick={onDelete} className="py-3 bg-rose-900/20 text-rose-500 font-bold rounded-xl border border-rose-900/50 hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2"><Trash2 size={18}/> Удалить</button>
                    <button onClick={() => onSave({ title, description: desc, deadline: deadline ? new Date(deadline).getTime() : undefined })} className="py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"><Save size={18}/> Сохранить</button>
                </div>
            </div>
        </div>
    );
};

const KPICard: React.FC<{ kpi: GoalKPI, onUpdate: (id: string, val: number) => void, onDelete: (id: string) => void, compact?: boolean }> = ({ kpi, onUpdate, onDelete, compact }) => {
    const progress = Math.min(100, (kpi.current / kpi.target) * 100);
    return (
        <div className={`bg-slate-800/50 border border-slate-700/50 rounded-lg flex items-center justify-between group ${compact ? 'p-2' : 'p-3'}`}>
            <div className="flex-1 min-w-0 mr-3">
                <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-300 truncate">{kpi.title}</span>
                    <span className="font-mono text-indigo-300">{kpi.current} / {kpi.target} {kpi.unit}</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all" style={{ width: `${progress}%` }} />
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onUpdate(kpi.id, Math.max(0, kpi.current - 1))} className="p-1 text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600"><Minus size={12} /></button>
                <button onClick={() => onUpdate(kpi.id, kpi.current + 1)} className="p-1 text-slate-400 hover:text-white bg-slate-700 rounded hover:bg-slate-600"><Plus size={12} /></button>
                <button onClick={() => onDelete(kpi.id)} className="p-1 text-slate-500 hover:text-rose-500 ml-1"><Trash2 size={14} /></button>
            </div>
        </div>
    );
};

const GoalReportModal: React.FC<{ report: any, onClose: () => void }> = ({ report, onClose }) => {
    if (!report) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-bold text-white">Goal Report</h3>
                    <button onClick={onClose}><X size={24} className="text-slate-500" /></button> 
                </div>
                <div className="space-y-4 text-slate-300 text-sm">
                    <div className="p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
                        <div className="font-bold text-indigo-400 mb-1">Summary</div>
                        {report.summary}
                    </div>
                    <div>
                        <div className="font-bold text-white mb-2">Insights</div>
                        <ul className="list-disc pl-5 space-y-1">
                            {report.insights?.map((i: string, idx: number) => <li key={idx}>{i}</li>)}
                        </ul>
                    </div>
                    <div>
                        <div className="font-bold text-white mb-2">Next Steps</div>
                        <div className="space-y-2">
                            {report.nextSteps?.map((step: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800 rounded-lg">
                                    <span className="text-[10px] bg-slate-700 px-2 rounded uppercase font-bold text-slate-400">{step.type}</span>
                                    <span>{step.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-full mt-6 py-3 bg-indigo-600 text-white font-bold rounded-xl">Close</button>
            </div>
        </div>
    );
};

const PlanPickerModal: React.FC<{ plans: Plan[], onPick: (planId: string) => void, onClose: () => void }> = ({ plans, onPick, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-white">Select a Plan</h3><button onClick={onClose}><X size={18} className="text-slate-500 hover:text-white" /></button></div>
                <div className="space-y-2">
                    {plans.length === 0 && <p className="text-slate-500 text-sm">No plans available.</p>}
                    {plans.map(plan => (
                        <button key={plan.id} onClick={() => onPick(plan.id)} className="w-full text-left p-3 rounded-xl bg-slate-800 hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-500 transition-all group">
                            <div className="text-sm font-bold text-white group-hover:text-indigo-400">{plan.title}</div>
                            <div className="text-[10px] text-slate-500 mt-1 uppercase flex gap-2"><span>{plan.type}</span><span>{new Date(plan.periodStart).toLocaleDateString()}</span></div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- GOAL DETAIL VIEW ---

export const GoalBlueprint: React.FC<{
    goalId: string;
    userId: string;
    onBack: () => void;
    onNavigate: (view: any) => void;
}> = ({ goalId, userId, onBack, onNavigate }) => {
    
    const { 
        goal, tasks, report, analysis, loading, generatingReport, runningAnalysis, availablePlans,
        addStage, addTaskToStage, startSession, generateReport, runAnalysis, 
        deleteGoal, updateGoal, refresh, linkPlanToStage, unlinkPlanFromStage, completeStage
    } = useGoalDetailViewModel(userId, goalId);
    
    const [isAddStageOpen, setIsAddStageOpen] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState('');
    const [activeEditingStageId, setActiveEditingStageId] = useState<string | null>(null);
    
    const [isAddKPIOpen, setIsAddKPIOpen] = useState(false);
    const [newKPITitle, setNewKPITitle] = useState('');
    const [newKPITarget, setNewKPITarget] = useState('');
    const [newKPIUnit, setNewKPIUnit] = useState('');
    const [newKPIStageId, setNewKPIStageId] = useState<string>('');
    const [linkingStageId, setLinkingStageId] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [addingTaskToStageId, setAddingTaskToStageId] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState('');

    // --- DRAG & DROP REORDER LOGIC ---
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [dropOverTaskId, setDropOverTaskId] = useState<string | null>(null);
    const longPressTimer = useRef<any>(null);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);

    const handleTaskPointerDown = (e: React.PointerEvent, taskId: string) => {
        if (e.button !== 0) return;
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        
        const pointerX = e.clientX;
        const pointerY = e.clientY;
        const pointerId = e.pointerId;
        const target = e.currentTarget as HTMLElement;
        touchStartPos.current = { x: pointerX, y: pointerY };

        longPressTimer.current = setTimeout(() => {
            setDraggingTaskId(taskId);
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            
            // CRITICAL: Must use captured 'target' and 'pointerId' here
            if (target && typeof target.setPointerCapture === 'function') {
                try {
                    target.setPointerCapture(pointerId);
                } catch (err) {
                    console.warn("Could not set pointer capture", err);
                }
            }
        }, 500); 
    };

    const handleTaskPointerMove = (e: React.PointerEvent) => {
        if (longPressTimer.current && touchStartPos.current && !draggingTaskId) {
            const dist = Math.sqrt(
                Math.pow(e.clientX - touchStartPos.current.x, 2) + 
                Math.pow(e.clientY - touchStartPos.current.y, 2)
            );
            if (dist > 15) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
            }
        }

        if (!draggingTaskId) return;

        const element = document.elementFromPoint(e.clientX, e.clientY);
        const targetTaskEl = element?.closest('[data-task-id]');
        if (targetTaskEl) {
            const overId = targetTaskEl.getAttribute('data-task-id');
            if (overId && overId !== draggingTaskId) {
                setDropOverTaskId(overId);
            }
        } else {
            setDropOverTaskId(null);
        }
    };

    const handleTaskPointerUp = async (e: React.PointerEvent) => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        
        if (draggingTaskId && goal) {
            if (dropOverTaskId && draggingTaskId !== dropOverTaskId) {
                const newLinkedIds = [...goal.linkedTasksIds];
                const dragIdx = newLinkedIds.indexOf(draggingTaskId);
                const dropIdx = newLinkedIds.indexOf(dropOverTaskId);

                if (dragIdx !== -1 && dropIdx !== -1) {
                    newLinkedIds.splice(dragIdx, 1);
                    newLinkedIds.splice(dropIdx, 0, draggingTaskId);
                    await updateGoal({ linkedTasksIds: newLinkedIds });
                }
            }
            
            if (e.currentTarget instanceof HTMLElement && e.currentTarget.hasPointerCapture(e.pointerId)) {
                try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                } catch (err) {
                    // Ignore errors on release
                }
            }
        }

        setDraggingTaskId(null);
        setDropOverTaskId(null);
        touchStartPos.current = null;
    };

    // --- OTHER LOGIC ---

    const handleAddStage = async () => { if (!newStageTitle.trim()) return; await addStage(newStageTitle); setNewStageTitle(''); setIsAddStageOpen(false); };

    const handleDeleteStage = async (stageId: string) => {
        if (!goal) return;
        if (!window.confirm("Удалить этот этап? Задачи останутся, но будут отвязаны от этапа.")) return;
        const stageTasks = tasks.filter(t => t.stageId === stageId);
        for (const task of stageTasks) { await UseCases.updateTask.execute(TaskMapper.toDomain({ ...task, stageId: undefined })); }
        const updatedRoadmap = goal.roadmap.filter(r => r.id !== stageId);
        await updateGoal({ roadmap: updatedRoadmap });
        setActiveEditingStageId(null);
    };

    const handleUpdateStage = async (stageId: string, updates: Partial<RoadmapNode>) => {
        if (!goal) return;
        const updatedRoadmap = goal.roadmap.map(r => r.id === stageId ? { ...r, ...updates } : r);
        await updateGoal({ roadmap: updatedRoadmap });
        setActiveEditingStageId(null);
    };

    const handleCompleteStage = async (stageId: string) => { if (window.confirm("Завершить весь этап? Все связанные задачи и KPI будут отмечены как выполненные.")) await completeStage(stageId); };
    const handleInitAddTask = (stageId: string) => { setAddingTaskToStageId(stageId); setNewTaskTitle(''); };
    const handleCommitAddTask = async () => { if (!newTaskTitle.trim() || !addingTaskToStageId) return; await addTaskToStage(addingTaskToStageId, newTaskTitle.trim()); setNewTaskTitle(''); };
    const handleCancelAddTask = () => { setAddingTaskToStageId(null); setNewTaskTitle(''); };
    const handleToggleTask = async (taskId: string) => { await UseCases.toggleTask.execute(taskId); refresh(); };
    const handleDeleteGoal = async () => { if (window.confirm("Вы уверены? Это удалит цель. Задачи будут отвязаны.")) { await deleteGoal(); onBack(); } };
    const handleStatusChange = async (status: GoalStatus) => { await updateGoal({ status }); setIsStatusMenuOpen(false); };
    const handleStartSession = async () => { const targetTaskId = await startSession(); if (targetTaskId) onNavigate({ type: 'FOCUS', taskId: targetTaskId }); else alert("Не удалось создать сессию."); };
    const handleAddKPI = async () => { if (!goal || !newKPITitle.trim()) return; const newKPI: GoalKPI = { id: uuid(), title: newKPITitle.trim(), target: parseFloat(newKPITarget) || 0, current: 0, unit: newKPIUnit.trim() || 'ед.', type: KPIType.QUANTITATIVE, stageId: newKPIStageId || undefined }; await updateGoal({ kpis: [...goal.kpis, newKPI] }); setNewKPITitle(''); setNewKPITarget(''); setNewKPIUnit(''); setNewKPIStageId(''); setIsAddKPIOpen(false); };
    const handleUpdateKPI = async (kpiId: string, val: number) => { if (!goal) return; const kpis = goal.kpis.map(k => k.id === kpiId ? { ...k, current: val } : k); await updateGoal({ kpis }); };
    const handleDeleteKPI = async (kpiId: string) => { if (!goal) return; if (!window.confirm("Delete KPI?")) return; await updateGoal({ kpis: goal.kpis.filter(k => k.id !== kpiId) }); };
    const handleReportClick = async () => { await generateReport(); setShowReportModal(true); };
    const handleSaveEdit = async (updates: Partial<GoalEntity>) => { await updateGoal(updates); setIsEditing(false); };
    const handlePlanLink = async (planId: string) => { if (linkingStageId) { await linkPlanToStage(linkingStageId, planId); setLinkingStageId(null); } };
    const handleNavigateToPlan = (planId: string) => { const plan = availablePlans.find(p => p.id === planId); if (plan) onNavigate({ type: 'PLAN_EDITOR', planId: plan.id, planType: plan.type, periodStart: plan.periodStart }); };
    const handleShowInMap = () => { if (!goal) return; onNavigate({ type: 'LIFE_MAP', focusGoalId: goal.id }); };

    if (loading || !goal) return <div className="h-full bg-slate-950 flex items-center justify-center text-slate-500">Loading Goal...</div>;

    const generalKPIs = goal.kpis.filter(k => !k.stageId);
    const editingStage = activeEditingStageId ? goal.roadmap.find(r => r.id === activeEditingStageId) : null;

    return (
        <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden relative" onContextMenu={e => e.preventDefault()}>
            {showReportModal && report && <GoalReportModal report={report} onClose={() => setShowReportModal(false)} />}
            {isEditing && <GoalComposer initialGoal={goal} onClose={() => setIsEditing(false)} onSave={handleSaveEdit} />}
            {linkingStageId && <PlanPickerModal plans={availablePlans} onPick={handlePlanLink} onClose={() => setLinkingStageId(null)} />}
            {editingStage && <StageEditor stage={editingStage} onClose={() => setActiveEditingStageId(null)} onSave={(u) => handleUpdateStage(editingStage.id, u)} onDelete={() => handleDeleteStage(editingStage.id)} />}

            <div className="px-4 py-4 flex items-center gap-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 border-b border-white/5">
                <button onClick={onBack} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><ArrowLeft size={20} /></button>
                <div className="flex-1 flex flex-col">
                    <h1 className="text-xl font-bold truncate">{goal.title}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <div className="relative">
                            <button onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${getStatusColor(goal.status)}`}>{getStatusLabel(goal.status)} <Edit2 size={8} /></button>
                            {isStatusMenuOpen && ( <div className="absolute top-6 left-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 p-1 w-32 animate-in fade-in zoom-in-95"> {[GoalStatus.ACTIVE, GoalStatus.PAUSED, GoalStatus.AT_RISK, GoalStatus.COMPLETED].map(s => ( <button key={s} onClick={() => handleStatusChange(s)} className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-700 ${goal.status === s ? 'text-white bg-slate-700' : 'text-slate-400'}`}> {getStatusLabel(s)} </button> ))} </div> )}
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getEnergyColor(goal.energyLevel)}`}><Battery size={10} /> {goal.energyLevel} Energy</div>
                        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${getPriorityColor(goal.priority)}`}><Flag size={10} /> {goal.priority}</div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleShowInMap} className="p-2 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-400 rounded-full transition-colors"><MapIcon size={18} /></button>
                    <button onClick={handleReportClick} disabled={generatingReport} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs font-bold text-slate-300 transition-colors flex items-center gap-2"> {generatingReport ? <div className="w-3 h-3 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <Calendar size={14} />} REPORT </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32 no-scrollbar">
                <div className="bg-slate-800/50 p-5 rounded-3xl border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Target size={100} /></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-end mb-2"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">общий прогресс</span><span className="text-3xl font-bold">{goal.progress}%</span></div>
                        <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden mb-3"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${goal.progress}%` }} /></div>
                        <div className="text-xs text-slate-500 font-mono"> {tasks.filter(t => t.status === TaskStatus.DONE).length} / {tasks.length} tasks done </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {goal.reason && ( <div className="bg-indigo-900/20 border border-indigo-500/30 p-4 rounded-2xl flex gap-3 items-start animate-in fade-in"> <div className="bg-indigo-500/20 p-2 rounded-lg text-indigo-400 mt-0.5"><Anchor size={18} /></div> <div> <div className="font-bold text-indigo-400 text-xs uppercase tracking-wider mb-1">Якорь (WHY)</div> <p className="text-sm italic text-indigo-100 font-medium leading-relaxed">"{goal.reason}"</p> </div> </div> )}
                    {goal.futureSelfTags && goal.futureSelfTags.length > 0 && ( <div className="bg-emerald-900/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-3 animate-in fade-in"> <div className="text-emerald-500 shrink-0"><UserCircle2 size={18} /></div> <div className="flex-1 overflow-hidden"> <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Ведёт к версии:</div> <div className="flex flex-wrap gap-1"> {goal.futureSelfTags.map(tag => ( <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium"> {tag} </span> ))} </div> </div> </div> )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Activity size={16} /> Ключевые Показатели (KPI)</h3><button onClick={() => setIsAddKPIOpen(!isAddKPIOpen)} className="text-xs text-indigo-400 font-bold hover:text-white transition-colors">{isAddKPIOpen ? 'Отмена' : '+ Добавить'}</button></div>
                    {isAddKPIOpen && ( <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4 animate-in fade-in slide-in-from-top-2"> <div className="space-y-3"> <input value={newKPITitle} onChange={e => setNewKPITitle(e.target.value)} placeholder="Название KPI" className="w-full bg-slate-800 p-3 rounded-xl text-sm outline-none border border-transparent focus:border-indigo-500" /> <div className="flex gap-3"> <input type="number" value={newKPITarget} onChange={e => setNewKPITarget(e.target.value)} placeholder="Цель" className="flex-1 bg-slate-800 p-3 rounded-xl text-sm outline-none" /> <input value={newKPIUnit} onChange={e => setNewKPIUnit(e.target.value)} placeholder="Ед." className="w-24 bg-slate-800 p-3 rounded-xl text-sm outline-none" /> </div> <select value={newKPIStageId} onChange={e => setNewKPIStageId(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-sm outline-none border border-transparent focus:border-indigo-500 text-slate-300"> <option value="">Без привязки к этапу</option> {goal.roadmap.map(stage => <option key={stage.id} value={stage.id}>{stage.title}</option>)} </select> <button onClick={handleAddKPI} disabled={!newKPITitle} className="w-full py-3 bg-indigo-600 rounded-xl font-bold text-sm disabled:opacity-50">Сохранить KPI</button> </div> </div> )}
                    {generalKPIs.length > 0 && <div className="space-y-3">{generalKPIs.map(kpi => (<KPICard key={kpi.id} kpi={kpi} onUpdate={handleUpdateKPI} onDelete={handleDeleteKPI} />))}</div>}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Layout size={16} /> Этапы и Задачи</h3></div>
                    <div className="space-y-6 relative pl-4 border-l border-slate-800 ml-3">
                        {goal.roadmap.map((stage, index) => {
                            const stageTasks = tasks.filter(t => t.stageId === stage.id);
                            // Sort based on their order in goal.linkedTasksIds
                            stageTasks.sort((a, b) => {
                                const idxA = goal.linkedTasksIds.indexOf(a.id);
                                const idxB = goal.linkedTasksIds.indexOf(b.id);
                                return idxA - idxB;
                            });

                            const doneCount = stageTasks.filter(t => t.status === TaskStatus.DONE).length;
                            const isDone = stageTasks.length > 0 && doneCount === stageTasks.length;
                            const stageKPIs = goal.kpis.filter(k => k.stageId === stage.id);
                            const linkedPlan = availablePlans.find(p => p.id === stage.linkedPlanId);
                            
                            return (
                                <div key={stage.id} className="relative pl-6 animate-in slide-in-from-left-4" style={{animationDelay: `${index * 100}ms`}}>
                                    <div className={`absolute -left-[27px] top-0 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center z-10 shadow-lg ${isDone ? 'bg-emerald-500' : 'bg-indigo-900'}`}>
                                        {isDone ? <CheckCircle2 size={16} className="text-white" /> : <span className="text-xs font-bold text-indigo-300">{index + 1}</span>}
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-4 group">
                                        <div 
                                            onClick={() => setActiveEditingStageId(stage.id)}
                                            className="p-4 border-b border-slate-800/50 flex justify-between items-start cursor-pointer hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-lg text-white mb-1 truncate flex items-center gap-2">{stage.title} <Settings size={12} className="opacity-0 group-hover:opacity-100 text-slate-500" /></div>
                                                {stage.description && <p className="text-xs text-slate-400 line-clamp-1 mb-1 italic">{stage.description}</p>}
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-500">{doneCount}/{stageTasks.length} задач</span>
                                                    {stage.deadline && <span className="text-[10px] text-indigo-400 font-bold flex items-center gap-1"><Clock size={10}/> {new Date(stage.deadline).toLocaleDateString()}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                {!isDone && (
                                                    <button onClick={() => handleCompleteStage(stage.id)} className="text-[10px] font-bold px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors flex items-center gap-1"> <Check size={12} /> OK </button>
                                                )}
                                                {!stage.linkedPlanId ? (
                                                    <button onClick={() => setLinkingStageId(stage.id)} className="text-slate-500 hover:text-indigo-400 transition-colors p-2 rounded-full hover:bg-white/5"><Link size={16} /></button>
                                                ) : (
                                                    <button onClick={() => unlinkPlanFromStage(stage.id)} className="text-emerald-500 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-white/5"><Link size={16} /></button>
                                                )}
                                            </div>
                                        </div>

                                        {linkedPlan && (
                                            <div onClick={() => handleNavigateToPlan(linkedPlan.id)} className="bg-indigo-900/30 border-b border-indigo-500/20 p-3 flex items-center justify-between cursor-pointer hover:bg-indigo-900/50 transition-colors group/plan">
                                                <div className="flex items-center gap-2"> <FileText size={16} className="text-indigo-400" /> <div> <div className="text-xs font-bold text-indigo-300 uppercase">{linkedPlan.type} Plan</div> <div className="text-sm font-medium text-white">{linkedPlan.title}</div> </div> </div> <ArrowRight size={16} className="text-indigo-500 group-hover/plan:translate-x-1 transition-transform" />
                                            </div>
                                        )}

                                        {stageKPIs.length > 0 && (
                                            <div className="p-3 border-b border-slate-800/50 bg-indigo-900/10 space-y-2">
                                                <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1"><Activity size={10} /> Метрики этапа</div>
                                                {stageKPIs.map(kpi => <KPICard key={kpi.id} kpi={kpi} onUpdate={handleUpdateKPI} onDelete={handleDeleteKPI} compact={true} />)}
                                            </div>
                                        )}
                                        <div className="p-2 space-y-1 bg-black/20 relative" onPointerMove={handleTaskPointerMove} onPointerUp={handleTaskPointerUp}>
                                            {stageTasks.map((task) => (
                                                <div 
                                                    key={task.id} 
                                                    data-task-id={task.id}
                                                    onPointerDown={(e) => handleTaskPointerDown(e, task.id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl transition-all group/task cursor-grab active:cursor-grabbing relative select-none touch-none ${
                                                        draggingTaskId === task.id ? 'bg-indigo-600/40 opacity-50 scale-[1.02] shadow-2xl z-50 ring-2 ring-indigo-500 pointer-events-none' : 
                                                        dropOverTaskId === task.id ? 'border-t-4 border-indigo-500 pt-5 bg-indigo-900/20' : 'hover:bg-slate-800/50'
                                                    }`}
                                                >
                                                    <div className="shrink-0 text-slate-600 group-hover/task:text-indigo-400 transition-colors">
                                                        <GripVertical size={16} />
                                                    </div>
                                                    <div 
                                                        onClick={(e) => { e.stopPropagation(); if(!draggingTaskId) handleToggleTask(task.id); }}
                                                        className={`shrink-0 transition-colors p-1 -m-1 ${task.status === TaskStatus.DONE ? 'text-emerald-500' : 'text-slate-600 group-hover/task:text-slate-400'}`}
                                                    >
                                                        {task.status === TaskStatus.DONE ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0" onClick={() => !draggingTaskId && onNavigate({ type: 'TASK_EDIT', taskId: task.id, returnToGoalId: goal.id })}>
                                                        <span className={`text-sm truncate block ${task.status === TaskStatus.DONE ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{task.title}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover/task:opacity-100 transition-opacity">
                                                        {task.priority === Priority.HIGH && <span className="text-[9px] bg-rose-900/50 text-rose-400 px-1.5 py-0.5 rounded font-bold">HIGH</span>}
                                                    </div>
                                                    
                                                    {/* Drop Indicator (When dragging) */}
                                                    {dropOverTaskId === task.id && (
                                                        <div className="absolute -top-1 left-0 right-0 h-1 bg-indigo-500 rounded-full animate-pulse" />
                                                    )}
                                                </div>
                                            ))}
                                            {addingTaskToStageId === stage.id ? (
                                                <div className="p-2 border-t border-slate-800/50 animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-xl border border-indigo-500/50">
                                                        <input autoFocus value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCommitAddTask(); if (e.key === 'Escape') handleCancelAddTask(); }} placeholder="Название новой задачи..." className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500" />
                                                        <button onClick={handleCommitAddTask} disabled={!newTaskTitle.trim()} className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-500"><Plus size={16} /></button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => handleInitAddTask(stage.id)} className="w-full py-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 hover:bg-indigo-900/10 rounded-xl transition-colors border-t border-slate-800/50 mt-1"><Plus size={16} /> Добавить Задачу</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div className="relative pl-6 pt-2">
                            <div className="absolute -left-[21px] top-4 w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-950 z-10" />
                            {!isAddStageOpen ? (
                                <button onClick={() => setIsAddStageOpen(true)} className="text-sm font-bold text-slate-500 hover:text-white flex items-center gap-2 transition-colors py-2 px-4 rounded-xl border border-dashed border-slate-800 hover:border-slate-600 w-full"><Plus size={18} /> Добавить Этап</button>
                            ) : (
                                <div className="bg-slate-900 border border-indigo-500/50 p-4 rounded-2xl animate-in fade-in">
                                    <input value={newStageTitle} onChange={e => setNewStageTitle(e.target.value)} placeholder="Название этапа..." className="w-full bg-transparent border-b border-slate-700 pb-2 text-white outline-none placeholder:text-slate-600 mb-3" autoFocus onKeyDown={e => e.key === 'Enter' && handleAddStage()} />
                                    <div className="flex justify-end gap-3"><button onClick={() => setIsAddStageOpen(false)} className="text-xs font-bold text-slate-500">Отмена</button><button onClick={handleAddStage} className="text-xs font-bold text-indigo-400">Сохранить</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent z-30 pb-safe pt-10 flex gap-3">
                <button onClick={handleStartSession} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"><Play size={20} fill="currentColor" /> Старт сессии</button>
                <div className="flex gap-2">
                    <button onClick={() => setIsEditing(true)} className="w-14 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl flex items-center justify-center transition-colors"><Edit2 size={20} /></button>
                    <button onClick={handleDeleteGoal} className="w-14 bg-slate-800 hover:bg-rose-900/50 text-slate-300 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-colors"><Trash2 size={20} /></button>
                </div>
            </div>
        </div>
    );
};

export const Goals: React.FC<{ userId: string, initialGoalId?: string, onNavigate: (view: any) => void, labels: any }> = ({ userId, initialGoalId, onNavigate, labels }) => {
    const [goals, setGoals] = useState<GoalEntity[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const refresh = () => { setGoals(GoalRepository.getAll(userId)); };
    useEffect(() => { refresh(); }, [userId]);

    const handleCreate = async (data: Partial<GoalEntity>) => {
        const newGoal: GoalEntity = {
            id: uuid(),
            ownerId: userId,
            title: data.title || 'New Goal',
            description: data.description,
            reason: data.reason,
            startDate: data.startDate || Date.now(),
            endDate: data.endDate || Date.now() + 30 * 86400000,
            priority: data.priority || Priority.MEDIUM,
            energyLevel: data.energyLevel || EnergyLevel.MEDIUM,
            type: GoalType.GLOBAL,
            status: GoalStatus.ACTIVE,
            progress: 0,
            tags: [],
            futureSelfTags: data.futureSelfTags || [],
            kpis: [],
            roadmap: [],
            linkedTasksIds: [],
            linkedHabitsIds: [],
            experienceIds: [],
            repairTokensUsed: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        GoalRepository.create(newGoal);
        setIsCreating(false);
        refresh();
    };

    if (initialGoalId) { 
        return <GoalBlueprint 
            goalId={initialGoalId} 
            userId={userId} 
            onBack={() => { onNavigate('GOALS'); refresh(); }} 
            onNavigate={onNavigate} 
        />; 
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {isCreating && <GoalComposer onClose={() => setIsCreating(false)} onSave={handleCreate} />}
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{labels.goals || "Goals"}</h1>
                <button onClick={() => setIsCreating(true)} className="p-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors"><Plus size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {goals.length === 0 && ( <div className="text-center py-20 text-slate-400"> <Target size={48} className="mx-auto mb-3 opacity-50" /> <p>No goals set.</p> <button onClick={() => setIsCreating(true)} className="text-indigo-500 font-bold mt-2">Create First Goal</button> </div> )}
                {goals.map(goal => (
                    <div key={goal.id} onClick={() => onNavigate({ type: 'GOAL_DETAIL', goalId: goal.id })} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">{goal.title}</h3>
                                <div className="flex items-center gap-2 mt-1"> <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(goal.status)}`}>{getStatusLabel(goal.status)}</span> <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getPriorityColor(goal.priority)}`}>{goal.priority}</span> </div>
                            </div>
                            <div className="text-2xl font-bold text-slate-200 dark:text-slate-700">{goal.progress}%</div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden mb-2"><div className="bg-indigo-500 h-full" style={{ width: `${goal.progress}%` }} /></div>
                        <div className="flex justify-between items-center text-xs text-slate-500"> <span className="flex items-center gap-1"><Calendar size={12} /> {Math.ceil((goal.endDate - Date.now()) / 86400000)} days left</span> <span>{goal.roadmap.length} stages</span> </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
