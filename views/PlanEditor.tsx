
import React, { useState, useEffect } from 'react';
import { PlanType, SphereTracker, SpherePlanData, HabitEntity } from '../types';
import { useChecklistViewModel, useHabitsViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Save, Plus, Trash2, Tag, Grid, Target, Calendar, Link2, X } from 'lucide-react';
import { PlanRepository } from '../data/repositories';

interface PlanEditorProps {
    userId: string;
    planId?: string;
    planType: PlanType;
    periodStart: number;
    onNavigateBack: () => void;
    labels: any;
}

export const PlanEditor: React.FC<PlanEditorProps> = ({ userId, planId, planType, periodStart, onNavigateBack, labels }) => {
    const [title, setTitle] = useState(planType === PlanType.SPHERES ? 'Трекер Сфер' : (planType === PlanType.WEEKLY ? 'План на неделю' : 'Цели месяца'));
    const [entries, setEntries] = useState<any[]>([]);
    const [trackers, setTrackers] = useState<SphereTracker[]>([]);
    const { savePlan } = useChecklistViewModel(userId);
    const { habits } = useHabitsViewModel(userId);

    useEffect(() => {
        if (planId) {
            const res = PlanRepository.getPlanById(planId);
            if (res.success) {
                setTitle(res.data.plan.title);
                if (planType === PlanType.SPHERES && res.data.plan.structureJson) {
                    const data: SpherePlanData = JSON.parse(res.data.plan.structureJson);
                    setTrackers(data.trackers || []);
                } else {
                    setEntries(res.data.entries);
                }
            }
        } else {
            if (planType === PlanType.SPHERES) {
                setTrackers([{
                    id: crypto.randomUUID(),
                    title: 'Тренировки',
                    targetCount: 30,
                    startDate: Date.now(),
                    endDate: Date.now() + 90 * 24 * 60 * 60 * 1000,
                    manualIndices: [],
                    habitId: null
                }]);
            } else {
                setEntries([{ id: crypto.randomUUID(), category: 'Focus', content: '', status: 'PENDING' }]);
            }
        }
    }, [planId, planType]);

    const handleSave = async () => {
        const newPlan: any = {
            id: planId || crypto.randomUUID(),
            userId,
            type: planType,
            periodStart,
            periodEnd: periodStart + (planType === PlanType.WEEKLY ? 604800000 : 2592000000),
            title,
            createdAt: Date.now()
        };

        if (planType === PlanType.SPHERES) {
            newPlan.structureJson = JSON.stringify({ trackers });
            await savePlan(newPlan, []);
        } else {
            const validEntries = entries
                .filter(e => e.content?.trim())
                .map(e => ({
                    id: e.id || crypto.randomUUID(),
                    planId: newPlan.id,
                    category: e.category || 'General',
                    content: e.content!,
                    status: e.status || 'PENDING',
                    userNote: e.userNote,
                    createdAt: e.createdAt || Date.now(),
                    updatedAt: Date.now()
                }));
            await savePlan(newPlan, validEntries);
        }
        onNavigateBack();
    };

    const addTracker = () => {
        setTrackers([...trackers, {
            id: crypto.randomUUID(),
            title: 'Новая Сфера',
            targetCount: 10,
            startDate: Date.now(),
            endDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
            manualIndices: [],
            habitId: null
        }]);
    };

    const removeTracker = (id: string) => setTrackers(trackers.filter(t => t.id !== id));
    
    const updateTracker = (id: string, updates: Partial<SphereTracker>) => {
        setTrackers(trackers.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">
                    {planType === PlanType.SPHERES ? 'Настройка Сфер' : labels.planEditor}
                </h1>
                <button onClick={handleSave} className="text-indigo-600 font-bold">
                    {labels.save}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {planType === PlanType.SPHERES ? (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-400 uppercase">Активные отслеживания</span>
                            <button onClick={addTracker} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                                <Plus size={14} /> Добавить сферу
                            </button>
                        </div>

                        {trackers.map((t, idx) => (
                            <div key={t.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 animate-in slide-in-from-bottom-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Название сферы</label>
                                        <input 
                                            value={t.title} 
                                            onChange={e => updateTracker(t.id, { title: e.target.value })}
                                            className="bg-transparent font-bold text-lg outline-none w-full dark:text-white"
                                            placeholder="Напр. Тренировки"
                                        />
                                    </div>
                                    <button onClick={() => removeTracker(t.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Цель (раз)</label>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                                            <Target size={16} className="text-indigo-500" />
                                            <input 
                                                type="number" 
                                                value={t.targetCount}
                                                onChange={e => updateTracker(t.id, { targetCount: parseInt(e.target.value) || 0 })}
                                                className="bg-transparent font-bold outline-none w-full dark:text-white"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Связать с привычкой</label>
                                        <select 
                                            value={t.habitId || ''} 
                                            onChange={e => updateTracker(t.id, { habitId: e.target.value || null })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs font-bold dark:text-white outline-none"
                                        >
                                            <option value="">Без привязки (вручную)</option>
                                            {habits.map(h => <option key={h.id} value={h.id}>{h.title}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Начало</label>
                                        <input 
                                            type="date" 
                                            value={new Date(t.startDate).toISOString().split('T')[0]}
                                            onChange={e => updateTracker(t.id, { startDate: new Date(e.target.value).getTime() })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs dark:text-white outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Завершение</label>
                                        <input 
                                            type="date" 
                                            value={new Date(t.endDate).toISOString().split('T')[0]}
                                            onChange={e => updateTracker(t.id, { endDate: new Date(e.target.value).getTime() })}
                                            className="w-full bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-xs dark:text-white outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full text-xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 outline-none dark:text-white" />
                        <div className="flex justify-between items-center"><label className="text-xs font-bold text-slate-400 uppercase">{labels.addEntry}</label><button onClick={() => setEntries([...entries, { id: crypto.randomUUID(), category: 'General', content: '', status: 'PENDING' }])} className="text-indigo-600 text-sm font-bold flex items-center gap-1"><Plus size={16} /> Добавить</button></div>
                        {entries.map((entry) => (
                            <div key={entry.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-3"><div className="flex-1 space-y-2"><input value={entry.content} onChange={(e) => setEntries(entries.map(x => x.id === entry.id ? { ...x, content: e.target.value } : x))} placeholder="Текст задачи..." className="w-full bg-transparent outline-none font-medium dark:text-white" /><div className="flex items-center gap-2"><Tag size={14} className="text-slate-400" /><input value={entry.category} onChange={(e) => setEntries(entries.map(x => x.id === entry.id ? { ...x, category: e.target.value } : x))} className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 outline-none w-24" /></div></div><button onClick={() => setEntries(entries.filter(x => x.id !== entry.id))} className="text-slate-300 hover:text-rose-500"><Trash2 size={18} /></button></div>
                        ))}
                    </div>
                )}
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                 <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                    <Save size={20} /> {labels.savePlan}
                </button>
            </div>
        </div>
    );
};
