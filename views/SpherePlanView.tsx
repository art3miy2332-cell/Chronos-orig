
import React from 'react';
import { PlanEntity, SpherePlanData, SphereTracker, HabitEntity } from '../types';
import { Check, Flame, Edit3, Plus } from 'lucide-react';

interface Props {
    userId: string;
    plan: PlanEntity | null;
    habits: HabitEntity[];
    onEdit: () => void;
    onUpdateTracker: (id: string, updates: Partial<SphereTracker>) => void;
    onHabitDecrement: (habitId: string) => void;
    labels: any;
}

const TrackerGrid: React.FC<{ 
    tracker: SphereTracker, 
    habit?: HabitEntity, 
    onManualToggle: (index: number) => void,
    onHabitDecrement: () => void
}> = ({ tracker, habit, onManualToggle, onHabitDecrement }) => {
    
    // 1. Получаем количество выполнений из привычки за период трекера
    const habitCredits = habit 
        ? habit.history.filter(ts => ts >= tracker.startDate && ts <= tracker.endDate).length 
        : 0;

    const manualIndices = tracker.manualIndices || [];
    const squaresCount = tracker.targetCount;
    
    // 2. Рассчитываем индексы, которые займут привычки
    // Они должны идти сразу после самого последнего отмеченного квадратика
    const getHabitIndices = (manuals: number[]) => {
        const indices: number[] = [];
        const isSelectedManually = new Set(manuals);
        
        // Находим отправную точку: либо после самого дальнего ручного квадратика, либо с начала
        let startFrom = manuals.length > 0 ? Math.max(...manuals) + 1 : 0;
        let creditsLeft = habitCredits;

        // Заполняем места последовательно
        while (creditsLeft > 0 && startFrom < squaresCount) {
            if (!isSelectedManually.has(startFrom)) {
                indices.push(startFrom);
                creditsLeft--;
            }
            startFrom++;
        }
        return indices;
    };

    const habitIndices = getHabitIndices(manualIndices);
    const habitIndicesSet = new Set(habitIndices);
    const manualIndicesSet = new Set(manualIndices);

    // Все отмеченные индексы для поиска следующего
    const allMarkedIndices = [...manualIndices, ...habitIndices];
    const isFull = allMarkedIndices.length >= squaresCount;

    const handleAutoMark = () => {
        if (isFull) return;
        
        // Находим следующий индекс после самого последнего отмеченного
        const lastIndex = allMarkedIndices.length > 0 ? Math.max(...allMarkedIndices) : -1;
        const nextIndex = lastIndex + 1;
        
        if (nextIndex < squaresCount) {
            onManualToggle(nextIndex);
        }
    };

    const handleSquareClick = (index: number) => {
        if (habitIndicesSet.has(index)) {
            // Если нажали на квадратик, который занят привычкой — уменьшаем счетчик привычки
            onHabitDecrement();
        } else {
            // Иначе работаем с ручным массивом (добавить/удалить)
            onManualToggle(index);
        }
    };

    const totalFilled = allMarkedIndices.length;
    const progress = Math.min(100, (totalFilled / squaresCount) * 100);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                        <span className="truncate">{tracker.title}</span>
                        {habit && (
                            <span className="text-[9px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0">
                                {habit.title}
                            </span>
                        )}
                    </h3>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                        {new Date(tracker.startDate).toLocaleDateString()} — {new Date(tracker.endDate).toLocaleDateString()}
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {totalFilled}<span className="text-sm text-slate-300 font-normal">/{squaresCount}</span>
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Прогресс {Math.round(progress)}%</div>
                </div>
            </div>

            {/* Сетка квадратиков */}
            <div className="flex flex-wrap gap-1.5">
                {Array.from({ length: squaresCount }).map((_, i) => {
                    const isDone = manualIndicesSet.has(i) || habitIndicesSet.has(i);
                    
                    return (
                        <div 
                            key={i} 
                            onClick={() => handleSquareClick(i)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer active:scale-90 ${
                                isDone
                                ? 'bg-emerald-500 border-emerald-500 shadow-sm'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-transparent hover:border-emerald-300'
                            }`}
                        >
                            {isDone && <Check size={14} strokeWidth={3} className="text-white animate-in zoom-in-50" />}
                        </div>
                    );
                })}
            </div>

            {/* Кнопка "Отметить" */}
            <div className="pt-2">
                <button 
                    onClick={handleAutoMark}
                    disabled={isFull}
                    className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                        isFull 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                    }`}
                >
                    {isFull ? (
                        <>Выполнено <Check size={16} /></>
                    ) : (
                        <>Отметить выполнение <Plus size={16} /></>
                    )}
                </button>
            </div>
        </div>
    );
};

export const SpherePlanView: React.FC<Props> = ({ userId, plan, habits, onEdit, onUpdateTracker, onHabitDecrement, labels }) => {
    
    let trackers: SphereTracker[] = [];
    if (plan && plan.structureJson) {
        try {
            const data: SpherePlanData = JSON.parse(plan.structureJson);
            trackers = data.trackers || [];
        } catch (e) {}
    }

    if (!plan || trackers.length === 0) {
        return (
            <div className="text-center py-20 opacity-50 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center">
                <Flame size={48} className="mb-4 text-orange-500" />
                <p className="text-slate-500 font-bold">У вас нет планов по сферам.</p>
                <p className="text-xs text-slate-400 mt-2 max-w-xs mx-auto">Создайте количественный план, например: «30 занятий спортом».</p>
                <button 
                    onClick={onEdit}
                    className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-bold shadow-lg"
                >
                    Создать план
                </button>
            </div>
        );
    }

    const handleManualToggle = (tracker: SphereTracker, index: number) => {
        const currentIndices = tracker.manualIndices || [];
        const isCurrentlyManual = currentIndices.includes(index);
        
        const newIndices = isCurrentlyManual
            ? currentIndices.filter(i => i !== index)
            : [...currentIndices, index];
            
        onUpdateTracker(tracker.id, { manualIndices: newIndices });
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{trackers.length} АКТИВНЫХ ПЛАНА</span>
                <button onClick={onEdit} className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    <Edit3 size={12} /> Настроить
                </button>
            </div>

            <div className="space-y-6">
                {trackers.map(tracker => {
                    const linkedHabit = habits.find(h => h.id === tracker.habitId);
                    return (
                        <TrackerGrid 
                            key={tracker.id} 
                            tracker={tracker} 
                            habit={linkedHabit} 
                            onManualToggle={(index) => handleManualToggle(tracker, index)}
                            onHabitDecrement={() => tracker.habitId && onHabitDecrement(tracker.habitId)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
