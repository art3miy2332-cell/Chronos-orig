
import React, { useState } from 'react';
import { DailyInsight } from '../../types';
import { CoachingManager } from '../../utils/coaching-manager';
import { Check, X, Star, Moon, Calendar, ArrowRight } from 'lucide-react';

interface Props {
    userId: string;
    insight: DailyInsight;
    onComplete: () => void;
}

export const DailyReflection: React.FC<Props> = ({ userId, insight, onComplete }) => {
    const [step, setStep] = useState(1);
    
    // Defensive initialization
    const planForTomorrow = insight?.planForTomorrow || [];
    const wins = insight?.wins || [];
    const leaks = insight?.leaks || [];

    const [selectedTasks, setSelectedTasks] = useState<number[]>(
        planForTomorrow.map((_, i) => i) // Select all by default
    );

    const toggleTask = (index: number) => {
        if (selectedTasks.includes(index)) {
            setSelectedTasks(selectedTasks.filter(i => i !== index));
        } else {
            setSelectedTasks([...selectedTasks, index]);
        }
    };

    const handleCommit = async () => {
        // Filter tasks
        const finalInsight = {
            ...insight,
            planForTomorrow: planForTomorrow.filter((_, i) => selectedTasks.includes(i))
        };
        await CoachingManager.commitDaily(userId, finalInsight);
        onComplete();
    };

    return (
        <div className="h-full bg-slate-900 text-white p-6 flex flex-col items-center justify-center">
            {step === 1 && (
                <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-10">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/50">
                            <Moon size={32} />
                        </div>
                        <h1 className="text-3xl font-bold mb-2">Итоги Дня</h1>
                        <p className="text-slate-400">Закрываем день осознанно.</p>
                    </div>

                    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold uppercase text-slate-500">Оценка дня</span>
                            <span className="text-2xl font-bold text-emerald-400">{insight?.score || 0}/100</span>
                        </div>
                        <p className="text-lg italic text-slate-200 mb-6">"{insight?.summary || 'Нет данных.'}"</p>
                        
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-emerald-500 mb-2 flex items-center gap-2"><Star size={14} /> ПОБЕДЫ</h3>
                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                    {wins.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-rose-500 mb-2 flex items-center gap-2"><X size={14} /> УПУЩЕНИЯ</h3>
                                <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
                                    {leaks.map((w, i) => <li key={i}>{w}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => setStep(2)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2">
                        Далее: План на завтра <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="w-full max-w-md space-y-6 animate-in slide-in-from-right-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold">План на завтра</h2>
                        <p className="text-slate-400">Выбери задачи для создания.</p>
                    </div>

                    <div className="space-y-3">
                        {planForTomorrow.map((task, i) => (
                            <div 
                                key={i}
                                onClick={() => toggleTask(i)}
                                className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition-all ${
                                    selectedTasks.includes(i) 
                                    ? 'bg-indigo-900/40 border-indigo-500' 
                                    : 'bg-slate-800 border-slate-700 opacity-60'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedTasks.includes(i) ? 'border-indigo-500 bg-indigo-500' : 'border-slate-500'}`}>
                                    {selectedTasks.includes(i) && <Check size={14} />}
                                </div>
                                <div>
                                    <div className="font-bold">{task.title}</div>
                                    <div className="text-xs text-slate-400 uppercase">{task.priority}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                            <Moon size={16} /> Вечерний Ритуал
                        </div>
                        <p className="text-sm text-slate-300">{insight?.ritual || "Отдыхай."}</p>
                    </div>

                    <button onClick={handleCommit} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-lg">
                        Подтвердить и спать
                    </button>
                </div>
            )}
        </div>
    );
};
