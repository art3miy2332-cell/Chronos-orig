


import React, { useEffect, useState } from 'react';
import { PlanType } from '../domain/models';
import { useAIDraftViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Bot, ThumbsUp, ThumbsDown, Copy, Check, FilePlus, X, CheckSquare } from 'lucide-react';
import { DatabaseService } from '../utils/db'; // Direct DB for finding Plans (mock logic)

interface AIDraftsProps {
    userId: string;
    periodStart: number;
    planType: PlanType;
    onNavigateBack: () => void;
    labels: any;
}

export const AIDrafts: React.FC<AIDraftsProps> = ({ userId, periodStart, planType, onNavigateBack, labels }) => {
    const { suggestions, loading, fetchDrafts, acceptSuggestion, rejectSuggestion } = useAIDraftViewModel(userId);
    const [confirmModal, setConfirmModal] = useState<{ id: string, type: string } | null>(null);

    useEffect(() => {
        fetchDrafts(periodStart, planType);
    }, [periodStart, planType]);

    const activeSuggestions = suggestions.filter(s => s.status === 'PROPOSED');

    const handleAccept = async (action: 'CREATE_TASK' | 'ADD_TO_PLAN_ENTRY' | 'COPY_TO_DRAFT') => {
        if (!confirmModal) return;

        // Find a plan target if needed
        let targetPlanId;
        if (action !== 'CREATE_TASK') {
            const plan = DatabaseService.plans.getActivePlan(userId, planType);
            targetPlanId = plan?.id;
            
            // If no plan, we might need to create one, but for this prototype assume check in Checklists view created one
            // or we handle error. For simplicity, if no plan, alert user.
            if (!targetPlanId) {
                alert("Please create a plan first in the Editor.");
                return;
            }
        }

        await acceptSuggestion(confirmModal.id, action, targetPlanId);
        setConfirmModal(null);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 relative">
             <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Bot size={18} />
                    </div>
                    <h1 className="font-bold text-lg text-slate-900 dark:text-white">
                        {labels.aiDrafts}
                    </h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading && <div className="text-center py-10 text-slate-400">Thinking...</div>}

                {!loading && activeSuggestions.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p>{labels.noSuggestions}</p>
                    </div>
                )}

                {activeSuggestions.map(s => (
                    <div key={s.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-in slide-in-from-bottom-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                                {s.tags[0]}
                            </span>
                            <span className={`text-[10px] font-bold ${s.confidence > 0.8 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {Math.round(s.confidence * 100)}% Match
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">{s.text}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 mb-4">
                            <span className="font-bold text-xs text-slate-400 block mb-1">WHY:</span>
                            {s.explanation}
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                             <button 
                                onClick={() => setConfirmModal({ id: s.id, type: s.type })}
                                className="bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700"
                            >
                                <Check size={16} /> {labels.accept}
                            </button>
                            <button 
                                onClick={() => rejectSuggestion(s.id)}
                                className="bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50"
                            >
                                <X size={16} /> {labels.reject}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
                        <h3 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">How to use this?</h3>
                        <div className="space-y-3">
                            <button 
                                onClick={() => handleAccept('ADD_TO_PLAN_ENTRY')}
                                className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold flex items-center gap-3 hover:bg-indigo-100 transition-colors"
                            >
                                <FilePlus size={20} /> {labels.addToPlan}
                            </button>
                            <button 
                                onClick={() => handleAccept('CREATE_TASK')}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-3 hover:bg-slate-100 transition-colors"
                            >
                                <CheckSquare size={20} /> {labels.createTask}
                            </button>
                            <button 
                                onClick={() => handleAccept('COPY_TO_DRAFT')}
                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold flex items-center gap-3 hover:bg-slate-100 transition-colors"
                            >
                                <Copy size={20} /> {labels.copyToDraft}
                            </button>
                        </div>
                        <button onClick={() => setConfirmModal(null)} className="w-full mt-4 text-slate-400 font-bold p-2">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
};
