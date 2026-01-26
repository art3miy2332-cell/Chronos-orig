
import React, { useState } from 'react';
import { PlanType, WeeklyPlanData, SpherePlanData, SphereTracker } from '../types';
import { useChecklistViewModel, useHabitsViewModel } from '../hooks/viewmodels';
import { Calendar, ChevronLeft, ChevronRight, Edit3, Bot, CheckSquare, Square, FileText, PieChart, Target, Zap, Activity, X, TrendingUp, AlertTriangle, MessageSquare, LayoutList, FlaskConical, XCircle, Grid, Layers } from 'lucide-react';
import { SpherePlanView } from './SpherePlanView';

interface ChecklistsProps {
    userId: string;
    onNavigate: (view: any) => void;
    labels: any;
}

const BasicReviewModal: React.FC<{ 
    isOpen: boolean; 
    data: any; 
    onClose: () => void; 
    onDeepDive: () => void; 
}> = ({ isOpen, data, onClose, onDeepDive }) => {
    if (!isOpen || !data || !data.reviewCard) return null;
    const card = data.reviewCard;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Обзор прогресса</h3>
                        <p className="text-xs text-slate-500">Быстрый анализ</p>
                    </div>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="space-y-4 mb-6">
                    {/* Score Tile */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-80">Оценка</span>
                            <span className="text-3xl font-black">{card.score}<span className="text-lg opacity-70 font-medium">/100</span></span>
                        </div>
                        <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mb-3">
                            <div className="bg-white h-full" style={{ width: `${card.score}%` }} />
                        </div>
                        <p className="text-sm font-medium leading-tight">"{card.mainCritique}"</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 flex flex-col max-h-48">
                            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mb-2 shrink-0">
                                <TrendingUp size={12} /> Победы
                            </div>
                            <ul className="text-xs text-emerald-800 dark:text-emerald-300 space-y-1 overflow-y-auto pr-1">
                                {card.wins?.map((w: string, i: number) => <li key={i}>• {w}</li>)}
                            </ul>
                        </div>
                        <div className="bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl border border-rose-100 dark:border-rose-800 flex flex-col max-h-48">
                            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1 mb-2 shrink-0">
                                <AlertTriangle size={12} /> Упущения
                            </div>
                            <ul className="text-xs text-rose-800 dark:text-rose-300 space-y-1 overflow-y-auto pr-1">
                                {card.leaks?.map((l: string, i: number) => <li key={i}>• {l}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">
                        Закрыть
                    </button>
                    <button 
                        onClick={onDeepDive}
                        className="flex-[1.5] py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 hover:bg-indigo-700"
                    >
                        <MessageSquare size={18} /> Обсудить с коучем
                    </button>
                </div>
            </div>
        </div>
    );
};

export const Checklists: React.FC<ChecklistsProps> = ({ userId, onNavigate, labels }) => {
    const { 
        plan, entries, loading, periodStart, planType, 
        setPlanType, nextPeriod, prevPeriod, generateBasicReview, savePlan 
    } = useChecklistViewModel(userId);

    const { habits, decrementHabit } = useHabitsViewModel(userId);

    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewData, setReviewData] = useState<any>(null);

    const formatDateRange = () => {
        if (planType === PlanType.SPHERES) return "Трекер Сфер";
        const start = new Date(periodStart);
        if (planType === PlanType.WEEKLY) {
            const end = new Date(periodStart + 604800000 - 86400000); 
            return `${start.getDate()} ${start.toLocaleString('ru', { month: 'short' })} - ${end.getDate()} ${end.toLocaleString('ru', { month: 'short' })}`;
        } else {
            return start.toLocaleString('ru', { month: 'long', year: 'numeric' });
        }
    };

    const handleGenerateAI = () => {
        onNavigate({ type: 'AI_DRAFTS', periodStart, planType });
    };

    const handleEdit = () => {
        onNavigate({ 
            type: 'PLAN_EDITOR', 
            planId: plan?.id, 
            planType, 
            periodStart 
        });
    };

    const handleReviewClick = async () => {
        if (!plan) return;
        setIsReviewing(true);
        const data = await generateBasicReview();
        if (data && data.reviewCard) {
            setReviewData(data);
        } else {
            alert("Не удалось сгенерировать обзор.");
        }
        setIsReviewing(false);
    };

    const handleDeepDive = () => {
        setReviewData(null);
        const payload = plan?.structureJson || null;
        onNavigate({ type: 'AI_CHAT', scenario: 'DEEP_PLAN_REVIEW', payload: payload });
    };

    const handleToggleTask = async (focusId: string, taskId: string) => {
        if (!plan || !plan.structureJson) return;
        try {
            const data: any = JSON.parse(plan.structureJson);
            const focus = data.focuses.find((f: any) => f.id === focusId);
            if (focus) {
                const task = focus.tasks.find((t: any) => t.id === taskId);
                if (task) {
                    task.isDone = !task.isDone;
                    const updatedPlan = { ...plan, structureJson: JSON.stringify(data), updatedAt: Date.now() };
                    await savePlan(updatedPlan, entries);
                }
            }
        } catch (e) {}
    };

    const handleToggleGeneralTask = async (taskId: string) => {
        if (!plan || !plan.structureJson) return;
        try {
            const data: any = JSON.parse(plan.structureJson);
            if (data.generalTasks) {
                const task = data.generalTasks.find((t: any) => t.id === taskId);
                if (task) {
                    task.isDone = !task.isDone;
                    const updatedPlan = { ...plan, structureJson: JSON.stringify(data), updatedAt: Date.now() };
                    await savePlan(updatedPlan, entries);
                }
            }
        } catch (e) {}
    };

    const handleToggleKPI = async (kpiId: string) => {
        if (!plan || !plan.structureJson) return;
        try {
            const data: WeeklyPlanData = JSON.parse(plan.structureJson);
            const kpi = data.kpis.find(k => k.id === kpiId);
            if (kpi) {
                kpi.isDone = !kpi.isDone;
                const updatedPlan = { ...plan, structureJson: JSON.stringify(data), updatedAt: Date.now() };
                await savePlan(updatedPlan, entries);
            }
        } catch (e) {}
    };

    const handleUpdateTracker = async (trackerId: string, updates: Partial<SphereTracker>) => {
        if (!plan || !plan.structureJson) return;
        try {
            const data: SpherePlanData = JSON.parse(plan.structureJson);
            data.trackers = data.trackers.map(t => t.id === trackerId ? { ...t, ...updates } : t);
            const updatedPlan = { ...plan, structureJson: JSON.stringify(data), updatedAt: Date.now() };
            await savePlan(updatedPlan, []);
        } catch(e) {}
    };

    let structuredPlan: any = null;
    if (plan && plan.structureJson) {
        try { structuredPlan = JSON.parse(plan.structureJson); } catch (e) {}
    }

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{labels.checklistsTitle}</h2>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button onClick={() => setPlanType(PlanType.WEEKLY)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${planType === PlanType.WEEKLY ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{labels.weeklyPlan}</button>
                        <button onClick={() => setPlanType(PlanType.MONTHLY)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${planType === PlanType.MONTHLY ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{labels.monthlyPlan}</button>
                        <button onClick={() => setPlanType(PlanType.SPHERES)} className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${planType === PlanType.SPHERES ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{labels.spherePlan}</button>
                    </div>
                </div>
                
                <div className="flex items-center justify-between">
                    {planType !== PlanType.SPHERES ? (
                        <>
                            <button onClick={prevPeriod} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ChevronLeft size={20} /></button>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" />
                                {formatDateRange()}
                            </div>
                            <button onClick={nextPeriod} className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ChevronRight size={20} /></button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg">
                            <Grid size={16} />
                            <span className="text-sm font-bold uppercase tracking-wider">Количественные планы</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {planType !== PlanType.SPHERES && (
                    <div className="grid grid-cols-3 gap-2">
                        <button onClick={handleGenerateAI} className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"><Bot size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">{labels.generateAiDraft}</span></button>
                        <button onClick={handleEdit} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"><Edit3 size={20} /><span className="text-[9px] font-bold uppercase tracking-tighter">{labels.builder}</span></button>
                        <button onClick={handleReviewClick} disabled={!plan || isReviewing} className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl shadow-sm flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform disabled:opacity-50">{isReviewing ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-600 border-t-transparent" /> : <PieChart size={20} />}<span className="text-[9px] font-bold uppercase tracking-tighter">{labels.review}</span></button>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-10 text-slate-400">Загрузка...</div>
                ) : planType === PlanType.SPHERES ? (
                    <SpherePlanView 
                        userId={userId} 
                        plan={plan} 
                        habits={habits} 
                        onEdit={handleEdit} 
                        onUpdateTracker={handleUpdateTracker}
                        onHabitDecrement={decrementHabit}
                        labels={labels}
                    />
                ) : !plan ? (
                     <div className="text-center py-12 opacity-50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <FileText size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-slate-500">Нет плана на этот период.</p>
                     </div>
                ) : (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                             <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Target size={12} /> {labels.mainGoal}</div>
                             <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{structuredPlan?.mainGoal || plan.title}</h3>
                        </div>
                        {structuredPlan?.focuses?.map((focus: any) => (
                            <div key={focus.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center"><span className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2"><Zap size={14} className="text-indigo-500" /> {focus.title}</span><span className="text-xs text-slate-400">{focus.tasks.filter((t: any) => t.isDone).length}/{focus.tasks.length}</span></div>
                                <div className="p-3 space-y-2">
                                    {focus.tasks.map((task: any) => (
                                        <div key={task.id} className="flex items-center gap-2 text-sm group"><button onClick={() => handleToggleTask(focus.id, task.id)} className={`transition-colors ${task.isDone ? 'text-emerald-500' : 'text-slate-300 group-hover:text-indigo-500'}`}>{task.isDone ? <CheckSquare size={18} /> : <Square size={18} />}</button><span className={`transition-colors ${task.isDone ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>{task.title}</span></div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <BasicReviewModal isOpen={!!reviewData} data={reviewData} onClose={() => setReviewData(null)} onDeepDive={handleDeepDive} />
        </div>
    );
};
