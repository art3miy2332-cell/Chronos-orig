
import React, { useState } from 'react';
import { UserEntity, CoachingProfile } from '../types';
import { ChevronRight, Check, Target, AlertTriangle, Clock, Zap } from 'lucide-react';

interface OnboardingProps {
    onComplete: (prefs: Partial<UserEntity>) => void;
    initialName?: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialName }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState(initialName || '');
    const [role, setRole] = useState('');
    
    // Coaching Profile State
    const [mainGoal, setMainGoal] = useState('');
    const [obstacle, setObstacle] = useState('');
    const [rhythm, setRhythm] = useState<CoachingProfile['productiveHours']>('MORNING');
    const [motivation, setMotivation] = useState<CoachingProfile['motivationStyle']>('ANALYTICAL');

    const handleNext = () => {
        if (step < 6) {
            setStep(step + 1);
        } else {
            onComplete({
                displayName: name,
                role: role,
                coachingProfile: {
                    mainGoal: mainGoal,
                    biggestObstacle: obstacle,
                    productiveHours: rhythm,
                    motivationStyle: motivation
                }
            });
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center">
            {/* Progress Bar */}
            <div className="w-full max-w-xs h-1 bg-slate-200 dark:bg-slate-800 rounded-full mb-8 overflow-hidden">
                <div 
                    className="h-full bg-indigo-600 transition-all duration-500 ease-out" 
                    style={{ width: `${(step / 6) * 100}%` }}
                />
            </div>

            {step === 1 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                    <div className="w-20 h-20 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <Check className="text-white w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Chronos</h1>
                        <p className="text-slate-500 dark:text-slate-400">Твой персональный архитектор продуктивности.</p>
                    </div>
                    <input
                        type="text"
                        placeholder="Как к тебе обращаться?"
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Твоя роль?</h2>
                        <p className="text-slate-500 dark:text-slate-400">Поможет мне подбирать советы.</p>
                    </div>
                    <div className="space-y-3">
                        {['Студент', 'Разработчик', 'Менеджер', 'Фрилансер', 'Творец'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRole(r)}
                                className={`w-full p-4 rounded-xl border text-left transition-all ${
                                    role === r 
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {r}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mx-auto flex items-center justify-center text-emerald-600 mb-2">
                        <Target size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Главная цель</h2>
                        <p className="text-slate-500 dark:text-slate-400">Какая твоя Полярная звезда сейчас?</p>
                    </div>
                    <textarea
                        placeholder="Например: Запустить стартап, Сдать экзамен, Прийти в форму..."
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-lg outline-none focus:ring-2 focus:ring-emerald-500 h-32 resize-none dark:text-white"
                        value={mainGoal}
                        onChange={(e) => setMainGoal(e.target.value)}
                        autoFocus
                    />
                </div>
            )}

            {step === 4 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                    <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full mx-auto flex items-center justify-center text-rose-600 mb-2">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Враг</h2>
                        <p className="text-slate-500 dark:text-slate-400">Что обычно тебя останавливает?</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {['Прокрастинация', 'Социальные сети', 'Усталость / Выгорание', 'Расфокус', 'Перфекционизм'].map((o) => (
                            <button
                                key={o}
                                onClick={() => setObstacle(o)}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    obstacle === o
                                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full mx-auto flex items-center justify-center text-amber-600 mb-2">
                        <Clock size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Пик активности</h2>
                        <p className="text-slate-500 dark:text-slate-400">Когда твой мозг работает лучше всего?</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { val: 'MORNING', label: 'Утро (6:00 - 11:00)' }, 
                            { val: 'AFTERNOON', label: 'День (12:00 - 17:00)' }, 
                            { val: 'NIGHT', label: 'Ночь (20:00 - 02:00)' }
                        ].map((t) => (
                            <button
                                key={t.val}
                                onClick={() => setRhythm(t.val as any)}
                                className={`p-4 rounded-xl border text-left transition-all ${
                                    rhythm === t.val
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 6 && (
                <div className="space-y-6 animate-fade-in w-full max-w-sm">
                    <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mx-auto flex items-center justify-center text-indigo-600 mb-2">
                        <Zap size={32} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Тон Коуча</h2>
                        <p className="text-slate-500 dark:text-slate-400">Какой подход тебе нужен?</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {[
                            { 
                                val: 'ANALYTICAL', 
                                label: '⚖️ Нейтрально-честный', 
                                desc: 'Спокойно, логично, без эмоций. Факт → Вывод → Действие.' 
                            },
                            { 
                                val: 'GENTLE_SUPPORT', 
                                label: '🍵 Поддерживающий', 
                                desc: 'Мягко, тепло, без давления. Акцент на маленьких победах.' 
                            },
                            { 
                                val: 'TOUGH_LOVE', 
                                label: '⚔️ Жёсткий тренер', 
                                desc: 'Прямо, строго, без поблажек. Только дисциплина.' 
                            }
                        ].map((m) => (
                            <button
                                key={m.val}
                                onClick={() => setMotivation(m.val as any)}
                                className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                                    motivation === m.val
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500' 
                                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                                }`}
                            >
                                <span className={`font-semibold ${motivation === m.val ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-900 dark:text-white'}`}>{m.label}</span>
                                <span className="text-xs text-slate-500">{m.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <button
                disabled={(step === 1 && !name) || (step === 3 && !mainGoal) || (step === 4 && !obstacle)}
                onClick={handleNext}
                className="mt-8 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-semibold transition-colors shadow-lg shadow-indigo-500/30"
            >
                {step === 6 ? 'Начать' : 'Далее'} <ChevronRight size={20} />
            </button>
        </div>
    );
};
