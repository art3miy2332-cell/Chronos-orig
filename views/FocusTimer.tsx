
import React, { useState, useEffect, memo } from 'react';
import { Play, Pause, Square, SkipForward, Coffee, Zap, ArrowLeft, Settings, X } from 'lucide-react';
import { useFocusViewModel } from '../hooks/viewmodels';
import { AuthService } from '../utils/auth';
import { FocusConfig } from '../types';

interface FocusTimerProps {
    taskId?: string;
    onNavigateBack?: () => void;
    labels?: any;
}

// Memoized Settings Modal to prevent re-renders on timer ticks
const SettingsModal = memo(({ 
    isOpen, 
    onClose, 
    initialConfig, 
    onSave 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    initialConfig: FocusConfig; 
    onSave: (c: FocusConfig) => void; 
}) => {
    const [config, setConfig] = useState(initialConfig);

    // Sync state if initialConfig changes (only when reopening usually)
    useEffect(() => {
        if (isOpen) setConfig(initialConfig);
    }, [isOpen, initialConfig]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-panel w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-slate-900 animate-spring-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Настройки таймера</h3>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Фокус (мин)</label>
                        <input 
                            type="number" 
                            value={config.focusDurationMin}
                            onChange={(e) => setConfig({ ...config, focusDurationMin: parseInt(e.target.value) || 1 })}
                            className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xl dark:text-white text-center outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Короткий перерыв</label>
                            <input 
                                type="number" 
                                value={config.shortBreakDurationMin} 
                                onChange={(e) => setConfig({ ...config, shortBreakDurationMin: parseInt(e.target.value) || 1 })} 
                                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-center dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Длинный перерыв</label>
                            <input 
                                type="number" 
                                value={config.longBreakDurationMin} 
                                onChange={(e) => setConfig({ ...config, longBreakDurationMin: parseInt(e.target.value) || 1 })} 
                                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-center dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                            />
                        </div>
                    </div>
                </div>
                <button 
                    onClick={() => { onSave(config); onClose(); }}
                    className="w-full mt-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:scale-[1.02] transition-transform active:scale-95"
                >
                    Сохранить
                </button>
            </div>
        </div>
    );
});

export const FocusTimer: React.FC<FocusTimerProps> = ({ taskId, onNavigateBack, labels }) => {
    const user = AuthService.getCurrentUser();
    const { 
        state, config, startTimer, pauseTimer, resumeTimer, stopTimer, 
        skipTimer, updateConfig 
    } = useFocusViewModel(user?.id, taskId);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = state.totalDuration > 0 ? 1 - (state.timeLeft / state.totalDuration) : 0;
    const isFocus = state.mode === 'FOCUS';
    
    // Circle Props - Increased size
    const radius = 150; 
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
             
             <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)}
                initialConfig={config}
                onSave={updateConfig}
             />
             
             {/* Header */}
             <div className="p-6 flex justify-between items-center z-10">
                <button onClick={onNavigateBack} className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white backdrop-blur-sm transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white/50 dark:bg-slate-800/50 px-3 py-1 rounded-full backdrop-blur-sm">
                    {state.mode === 'FOCUS' ? 'Режим Фокуса' : 'Перерыв'}
                </div>
                <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-full text-slate-500 hover:text-indigo-600 backdrop-blur-sm transition-colors">
                    <Settings size={20} />
                </button>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center relative z-10 -mt-10">
                
                {/* Timer Circle */}
                <div className="relative w-[22rem] h-[22rem] sm:w-[26rem] sm:h-[26rem] flex items-center justify-center">
                    {/* SVG Progress */}
                    <svg className="w-full h-full drop-shadow-2xl" viewBox="0 0 320 320">
                        <circle 
                            cx="160" cy="160" r={radius} 
                            stroke="currentColor" strokeWidth="12" fill="transparent" 
                            className="text-slate-200 dark:text-slate-800 opacity-20" 
                        />
                        <circle 
                            cx="160" cy="160" r={radius} 
                            stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            transform="rotate(-90 160 160)"
                            className={`${isFocus ? 'text-indigo-500' : 'text-emerald-500'} transition-all duration-1000 ease-linear`}
                        />
                    </svg>
                    
                    {/* Inner Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className={`mb-4 p-4 rounded-full bg-white/10 backdrop-blur-md border border-white/10 shadow-inner ${isFocus ? 'text-indigo-500' : 'text-emerald-500'}`}>
                            {isFocus ? <Zap size={32} fill="currentColor" /> : <Coffee size={32} />}
                        </div>
                        <span className="text-7xl sm:text-8xl font-bold text-slate-900 dark:text-white tracking-tighter tabular-nums drop-shadow-sm">
                            {formatTime(state.timeLeft)}
                        </span>
                        <div className="mt-4 text-sm font-medium text-slate-500 bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full backdrop-blur-sm max-w-[200px] truncate text-center">
                            {state.taskTitle || (isFocus ? "Фокус" : "Перерыв")}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="mt-12 flex items-center gap-8">
                    {state.status === 'IDLE' ? (
                        <button 
                            onClick={() => startTimer(taskId)}
                            className="w-24 h-24 rounded-full bg-indigo-600 text-white shadow-glow flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300"
                        >
                            <Play size={40} fill="currentColor" className="ml-1" />
                        </button>
                    ) : (
                        <>
                            <button onClick={() => stopTimer(true)} className="p-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-all backdrop-blur-sm">
                                <Square size={24} fill="currentColor" />
                            </button>

                            <button 
                                onClick={state.status === 'RUNNING' ? pauseTimer : resumeTimer}
                                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all ${isFocus ? 'bg-indigo-600 shadow-indigo-500/40' : 'bg-emerald-600 shadow-emerald-500/40'}`}
                            >
                                {state.status === 'RUNNING' ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                            </button>

                            <button onClick={skipTimer} className="p-4 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all backdrop-blur-sm">
                                <SkipForward size={24} />
                            </button>
                        </>
                    )}
                </div>
             </div>

             {/* Background Decoration */}
             <div className={`absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t ${isFocus ? 'from-indigo-500/10' : 'from-emerald-500/10'} to-transparent pointer-events-none z-0`} />
        </div>
    );
};
