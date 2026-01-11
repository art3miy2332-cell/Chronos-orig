
import React, { useState, useEffect } from 'react';
import { PlanType, Plan, PlanEntry } from '../domain/models';
import { useChecklistViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Save, Plus, Trash2, Tag } from 'lucide-react';
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
    const [title, setTitle] = useState(planType === PlanType.WEEKLY ? 'План на неделю' : 'Цели месяца');
    const [entries, setEntries] = useState<Partial<PlanEntry>[]>([]);
    const { savePlan } = useChecklistViewModel(userId); // reusing VM logic or could implement local logic

    useEffect(() => {
        if (planId) {
            const res = PlanRepository.getPlanById(planId);
            if (res.success) {
                setTitle(res.data.plan.title);
                setEntries(res.data.entries);
            }
        } else {
            // Seed one empty entry
            setEntries([{ id: crypto.randomUUID(), category: 'Focus', content: '', status: 'PENDING' }]);
        }
    }, [planId]);

    const handleSave = async () => {
        if (!title.trim()) return;
        
        const newPlan: Plan = {
            id: planId || crypto.randomUUID(),
            userId,
            type: planType,
            periodStart,
            periodEnd: periodStart + (planType === PlanType.WEEKLY ? 604800000 : 2592000000),
            title,
            createdAt: Date.now()
        };

        // Filter empty entries
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
            })) as PlanEntry[];

        await savePlan(newPlan, validEntries);
        onNavigateBack();
    };

    const addEntry = () => {
        setEntries([...entries, { id: crypto.randomUUID(), category: 'General', content: '', status: 'PENDING' }]);
    };

    const removeEntry = (id: string) => {
        setEntries(entries.filter(e => e.id !== id));
    };

    const updateEntry = (id: string, field: keyof PlanEntry, value: any) => {
        setEntries(entries.map(e => e.id === id ? { ...e, [field]: value } : e));
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">
                    {labels.planEditor}
                </h1>
                <button onClick={handleSave} className="text-indigo-600 font-semibold">
                    {labels.save}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.taskTitle}</label>
                    <input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full text-xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 outline-none dark:text-white"
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.addEntry}</label>
                        <button onClick={addEntry} className="text-indigo-600 text-sm font-bold flex items-center gap-1">
                            <Plus size={16} /> Добавить
                        </button>
                    </div>

                    {entries.map((entry, index) => (
                        <div key={entry.id || index} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="flex-1 space-y-2">
                                <input 
                                    value={entry.content}
                                    onChange={(e) => updateEntry(entry.id!, 'content', e.target.value)}
                                    placeholder="Текст задачи..."
                                    className="w-full bg-transparent outline-none font-medium dark:text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <Tag size={14} className="text-slate-400" />
                                    <input 
                                        value={entry.category}
                                        onChange={(e) => updateEntry(entry.id!, 'category', e.target.value)}
                                        className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 outline-none w-24"
                                        placeholder="Категория"
                                    />
                                </div>
                            </div>
                            <button onClick={() => removeEntry(entry.id!)} className="text-slate-300 hover:text-rose-500">
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe">
                 <button onClick={handleSave} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30">
                    <Save size={20} className="inline mr-2" /> {labels.savePlan}
                </button>
            </div>
        </div>
    );
};
