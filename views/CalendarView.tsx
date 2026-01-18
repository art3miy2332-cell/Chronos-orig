
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskEntity, HabitEntity, CalendarSettings, TaskStatus, Priority, TagEntity, EnergyLevel, RecurrenceRule, RecurrenceFrequency } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Moon, Plus, AlignJustify, X, Clock, Settings, Check, Sparkles, BrainCircuit, AlertTriangle, ArrowRight, Sun, Battery, Globe, Repeat, CalendarDays, CheckSquare, Tag, Zap, Copy, List, Bug, Save } from 'lucide-react';
import { DateUtils } from '../utils/date-utils';
import { TaskRepository, HabitRepository, TagRepository } from '../data/repositories';
import { UseCases } from '../domain/usecases';
import { AuthService } from '../utils/auth';
import { TaskMapper } from '../data/mappers';

interface CalendarViewProps {
    userId: string;
    onNavigate: (view: any) => void;
    labels: any;
}

const DEFAULT_ROW_HEIGHT = 64;
const MIN_ROW_HEIGHT = 36;
const MAX_ROW_HEIGHT = 180;
const HEADER_HEIGHT_PX = 48;
const LONG_PRESS_DELAY = 400; // ms to trigger drag
const MOVE_CANCEL_THRESHOLD = 10; // px to cancel hold if finger moves too much

const getZoned = (ts: number, timezone: string) => DateUtils.getZonedParts(ts, timezone);

const getEventColorClasses = (priority: Priority, isDone: boolean, hasTagColor: boolean) => {
    if (isDone) return 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600';
    if (hasTagColor) return 'text-white border-black/10 dark:border-white/10 shadow-sm';
    switch (priority) {
        case Priority.HIGH: return 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800';
        case Priority.MEDIUM: return 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-800';
        case Priority.LOW: return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800';
        default: return 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800';
    }
};

const CalendarSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: CalendarSettings;
    onSave: (s: CalendarSettings) => void;
}> = ({ isOpen, onClose, settings, onSave }) => {
    const [localSettings, setLocalSettings] = useState(settings);

    useEffect(() => {
        if (isOpen) setLocalSettings(settings);
    }, [isOpen, settings]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div className="glass-panel w-full max-w-sm rounded-3xl p-6 bg-white dark:bg-slate-900 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Settings size={20} className="text-indigo-500" /> Настройки календаря
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X className="text-slate-400" />
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Начало дня</label>
                            <select 
                                value={localSettings.workingHoursStart}
                                onChange={(e) => setLocalSettings({...localSettings, workingHoursStart: parseInt(e.target.value)})}
                                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Конец дня</label>
                            <select 
                                value={localSettings.workingHoursEnd}
                                onChange={(e) => setLocalSettings({...localSettings, workingHoursEnd: parseInt(e.target.value)})}
                                className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {Array.from({length: 24}).map((_, i) => <option key={i} value={i}>{i}:00</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button 
                            onClick={() => setLocalSettings({...localSettings, hideNonWorkingHours: !localSettings.hideNonWorkingHours})}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-sm font-medium dark:text-slate-200">Скрывать нерабочие часы</span>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.hideNonWorkingHours ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${localSettings.hideNonWorkingHours ? 'translate-x-5' : ''}`} />
                            </div>
                        </button>

                        <button 
                            onClick={() => setLocalSettings({...localSettings, showCompleted: !localSettings.showCompleted})}
                            className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                            <span className="text-sm font-medium dark:text-slate-200">Показывать выполненные</span>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${localSettings.showCompleted ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${localSettings.showCompleted ? 'translate-x-5' : ''}`} />
                            </div>
                        </button>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Globe size={10} /> Часовой пояс
                        </label>
                        <select 
                            value={localSettings.timezone}
                            onChange={(e) => setLocalSettings({...localSettings, timezone: e.target.value})}
                            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-sm dark:text-white outline-none"
                        >
                            <option value="Europe/Moscow">Москва (UTC+3)</option>
                            <option value="UTC">UTC / GMT</option>
                            <option value="America/New_York">New York</option>
                            <option value="Europe/London">London</option>
                            <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                    </div>
                </div>

                <div className="mt-8 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        Отмена
                    </button>
                    <button 
                        onClick={() => { onSave(localSettings); onClose(); }}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        Применить
                    </button>
                </div>
            </div>
        </div>
    );
};

const getEventsForDay = (dayColumnDate: Date, tasks: TaskEntity[], habits: HabitEntity[], settings: CalendarSettings, tags: TagEntity[]) => {
    const targetYear = dayColumnDate.getFullYear();
    const targetMonth = dayColumnDate.getMonth();
    const targetDate = dayColumnDate.getDate();
    const dayTasks: TaskEntity[] = [];
    const timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

    tasks.forEach(t => {
        if (!settings.showCompleted && t.status === TaskStatus.DONE) return;
        if (!t.recurrence) {
            if (t.plannedAt) {
                const z = getZoned(t.plannedAt, timezone);
                if (z.year === targetYear && z.month === targetMonth && z.day === targetDate) dayTasks.push(t);
            } else if (t.deadline) {
                const z = getZoned(t.deadline, timezone);
                if (z.year === targetYear && z.month === targetMonth && z.day === targetDate) dayTasks.push(t);
            }
            return;
        }
        if (t.plannedAt && t.recurrence) {
            const match = DateUtils.isRecurringMatch(dayColumnDate, new Date(t.plannedAt), t.recurrence, timezone);
            if (match) {
                const zOriginal = getZoned(t.plannedAt, timezone);
                const virtualTime = new Date(dayColumnDate);
                virtualTime.setHours(zOriginal.hour, zOriginal.minute, 0, 0);
                const projectedStartTs = virtualTime.getTime();
                dayTasks.push({ 
                    ...t, 
                    id: `${t.id}_recur_${projectedStartTs}`, 
                    plannedAt: projectedStartTs, 
                    status: TaskStatus.TODO 
                });
            }
        }
    });
    return { tasks: dayTasks, habits: [] };
};

const TimeGrid: React.FC<{
    date: Date;
    mode: 'DAY' | 'WEEK';
    settings: CalendarSettings;
    now: number;
    tasks: TaskEntity[];
    habits: HabitEntity[];
    tags: TagEntity[];
    onNavigate: (view: any) => void;
    onSlotClick: (ts: number) => void;
    onTaskMove: (task: TaskEntity, newTime: number) => void;
    onTaskResize: (task: TaskEntity, newDuration: number) => void;
    onSwipe: (direction: 'PREV' | 'NEXT') => void;
}> = ({ date, mode, settings, now, tasks, habits, tags, onNavigate, onSlotClick, onTaskMove, onTaskResize, onSwipe }) => {
    
    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT);
    const days = mode === 'DAY' ? [date] : DateUtils.getWeekDays(DateUtils.getStartOfWeek(date));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    // Gesture State
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const initialPinchDist = useRef<number | null>(null);
    const initialRowHeight = useRef<number>(DEFAULT_ROW_HEIGHT);
    const isPinching = useRef(false);
    const [swipeOffset, setSwipeOffset] = useState(0);

    // Long press logic
    const holdTimerRef = useRef<any>(null);
    const holdStartPosRef = useRef<{ x: number, y: number } | null>(null);

    const [activeInteraction, setActiveInteraction] = useState<{
        type: 'MOVE' | 'RESIZE';
        task: TaskEntity;
        initialX: number;
        initialY: number;
        initialTime: number;
        initialDuration: number;
        currentY: number;
        currentX: number;
    } | null>(null);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    // Auto-scroll to morning on load
    useEffect(() => {
        if (containerRef.current && rowHeight === DEFAULT_ROW_HEIGHT) {
            const h = new Date().getHours();
            const targetH = Math.max(0, h - 2);
            let scrollY = targetH * rowHeight;
            if (settings.hideNonWorkingHours) {
                if (targetH < settings.workingHoursStart) scrollY = 0;
                else scrollY = (targetH - settings.workingHoursStart) * rowHeight;
            }
            containerRef.current.scrollTop = scrollY;
        }
    }, []);

    const timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowZoned = getZoned(now, timezone);
    const totalMinutes = nowZoned.hour * 60 + nowZoned.minute + nowZoned.second / 60;
    const pxPerMin = rowHeight / 60;
    
    let redLineY = totalMinutes * pxPerMin;
    if (settings.hideNonWorkingHours) {
        const startMin = settings.workingHoursStart * 60;
        const endMin = settings.workingHoursEnd * 60;
        if (totalMinutes < startMin) redLineY = 0;
        else if (totalMinutes > endMin) redLineY = (endMin - startMin) * pxPerMin; 
        else redLineY = redLineY - (settings.workingHoursStart * rowHeight);
    }
    
    const rowStyle = { height: `${rowHeight}px`, minHeight: `${rowHeight}px`, flexShrink: 0, boxSizing: 'border-box' as const };
    
    const visibleHoursCount = settings.hideNonWorkingHours 
        ? Math.max(1, settings.workingHoursEnd - settings.workingHoursStart + 1)
        : 24;
    const totalGridHeight = visibleHoursCount * rowHeight;

    const gridContainerStyle = { 
        height: `${totalGridHeight}px`,
        minHeight: `${totalGridHeight}px`,
        minWidth: '100%'
    };

    // GESTURE HANDLERS
    const handleTouchStart = (e: React.TouchEvent) => {
        if (activeInteraction) return;
        
        if (e.touches.length === 2) {
            isPinching.current = true;
            initialPinchDist.current = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            initialRowHeight.current = rowHeight;
        } else if (e.touches.length === 1) {
            isPinching.current = false;
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (activeInteraction) return;

        if (e.touches.length === 2 && initialPinchDist.current !== null) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const factor = currentDist / initialPinchDist.current;
            const newHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, initialRowHeight.current * factor));
            setRowHeight(newHeight);
            if (e.cancelable) e.preventDefault();
            return;
        }

        if (!isPinching.current && touchStartX.current !== null && touchStartY.current !== null && e.touches.length === 1) {
            const deltaX = e.touches[0].clientX - touchStartX.current;
            const deltaY = e.touches[0].clientY - touchStartY.current;

            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                return;
            }

            if (Math.abs(deltaX) > 15) {
                setSwipeOffset(deltaX);
                if (e.cancelable) e.preventDefault(); 
            }
        }
    };

    const handleTouchEnd = () => {
        if (touchStartX.current !== null && !isPinching.current) {
            const threshold = 100;
            if (swipeOffset > threshold) onSwipe('PREV');
            else if (swipeOffset < -threshold) onSwipe('NEXT');
        }
        setSwipeOffset(0);
        touchStartX.current = null;
        touchStartY.current = null;
        initialPinchDist.current = null;
        isPinching.current = false;
    };

    const onPointerDown = (e: React.PointerEvent, task: TaskEntity, type: 'MOVE' | 'RESIZE') => {
        e.stopPropagation();
        
        // Resize handle remains immediate for precision
        if (type === 'RESIZE') {
            const interaction = {
                type,
                task,
                initialX: e.clientX,
                initialY: e.clientY,
                initialTime: task.plannedAt || task.deadline || Date.now(),
                initialDuration: task.durationMinutes || task.estimateMinutes || 60,
                currentY: e.clientY,
                currentX: e.clientX
            };
            const target = e.currentTarget as HTMLElement;
            target.setPointerCapture(e.pointerId);
            setActiveInteraction(interaction);
            return;
        }

        // Move logic requires long press (hold) to prevent scrolling interference
        holdStartPosRef.current = { x: e.clientX, y: e.clientY };
        
        const pointerId = e.pointerId;
        const pointerX = e.clientX;
        const pointerY = e.clientY;

        holdTimerRef.current = setTimeout(() => {
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(40);
            }

            const interaction = {
                type: 'MOVE' as const,
                task,
                initialX: pointerX,
                initialY: pointerY,
                initialTime: task.plannedAt || task.deadline || Date.now(),
                initialDuration: task.durationMinutes || task.estimateMinutes || 60,
                currentY: pointerY,
                currentX: pointerX
            };

            const target = e.currentTarget as HTMLElement;
            target.setPointerCapture(pointerId);
            setActiveInteraction(interaction);
            holdTimerRef.current = null;
        }, LONG_PRESS_DELAY);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        // If we are waiting for a hold and the finger moves too much, cancel the hold
        if (holdTimerRef.current && holdStartPosRef.current) {
            const dx = Math.abs(e.clientX - holdStartPosRef.current.x);
            const dy = Math.abs(e.clientY - holdStartPosRef.current.y);
            if (dx > MOVE_CANCEL_THRESHOLD || dy > MOVE_CANCEL_THRESHOLD) {
                clearTimeout(holdTimerRef.current);
                holdTimerRef.current = null;
                holdStartPosRef.current = null;
            }
        }

        if (!activeInteraction) return;
        e.stopPropagation();
        setActiveInteraction(prev => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
    };

    const onPointerUp = (e: React.PointerEvent) => {
        // Clean up hold timer
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
            holdTimerRef.current = null;
            
            // If it was a quick release without movement, it's a click/tap
            if (holdStartPosRef.current) {
                const dx = Math.abs(e.clientX - holdStartPosRef.current.x);
                const dy = Math.abs(e.clientY - holdStartPosRef.current.y);
                if (dx < MOVE_CANCEL_THRESHOLD && dy < MOVE_CANCEL_THRESHOLD) {
                     // Get current target task ID from attributes or local scope
                     // Simple approach: if we reach here, we're on the element that started the pointer down
                     // We can't easily get the task ID here without passing it or using a ref, 
                     // but the event target is the element.
                     // Since onPointerUp is on the grid or task, we rely on standard navigation logic.
                }
            }
            holdStartPosRef.current = null;
        }

        if (!activeInteraction) return;
        e.stopPropagation();

        const { type, task, initialY, initialX, initialTime, initialDuration, currentY, currentX } = activeInteraction;
        const deltaY = currentY - initialY;
        const deltaX = currentX - initialX;
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // If moved very little, navigate to detail
        if (dist < 8) {
            onNavigate({ type: 'TASK_DETAIL', taskId: task.id.split('_')[0] });
        } else {
            const deltaMinutes = Math.round(deltaY / (rowHeight / 4)) * 15;
            
            if (type === 'RESIZE') {
                const newDuration = Math.max(15, initialDuration + deltaMinutes);
                if (newDuration !== initialDuration) {
                    onTaskResize(task, newDuration);
                }
            } else {
                const gridEl = containerRef.current;
                if (gridEl) {
                    const dayCols = gridEl.querySelectorAll('.day-column');
                    const dayWidth = dayCols[0]?.clientWidth || 100;
                    const dayShift = Math.round(deltaX / dayWidth);
                    
                    const newTime = new Date(initialTime);
                    newTime.setDate(newTime.getDate() + dayShift);
                    newTime.setMinutes(newTime.getMinutes() + deltaMinutes);
                    
                    if (newTime.getTime() !== initialTime || dayShift !== 0) {
                        onTaskMove(task, newTime.getTime());
                    }
                }
            }
        }
        
        setActiveInteraction(null);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    return (
        <div 
            className="flex flex-1 overflow-hidden bg-white dark:bg-slate-900 relative select-none h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="w-10 sm:w-12 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 overflow-hidden relative">
                <div style={{ height: `${HEADER_HEIGHT_PX}px` }} className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                <div className="overflow-hidden flex-1" style={{ position: 'relative' }}>
                    <div style={{ transform: `translateY(-${scrollTop}px)`, position: 'absolute', top: 0, left: 0, right: 0 }}>
                        <div style={gridContainerStyle}>
                            {hours.map(h => {
                                const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                                if (settings.hideNonWorkingHours && isNonWorking) return null;
                                return (
                                    <div key={h} style={rowStyle} className="relative border-transparent">
                                        <span className="absolute -top-2 right-2 text-[9px] sm:text-[10px] text-slate-400 font-medium leading-4">{h}:00</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            <div 
                ref={containerRef} 
                onScroll={handleScroll} 
                className="flex-1 overflow-y-auto overflow-x-hidden bg-white dark:bg-slate-900 relative h-full transition-transform duration-75 ease-out touch-pan-y overscroll-behavior-y-contain no-scrollbar sm:scrollbar-default"
                style={{ transform: swipeOffset ? `translateX(${swipeOffset * 0.3}px)` : 'none' }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                <div className="flex min-w-full relative" style={{ minHeight: '100%' }}>
                    {days.map((day, dIdx) => {
                        const { tasks: dayTasks } = getEventsForDay(day, tasks, habits, settings, tags);
                        const isToday = DateUtils.isSameDay(day, new Date(now));

                        return (
                            <div key={dIdx} className={`day-column flex-1 border-r border-slate-100 dark:border-slate-800 relative group ${mode === 'WEEK' ? 'min-w-[42px] sm:min-w-[100px]' : 'min-w-full'}`}>
                                <div style={{ height: `${HEADER_HEIGHT_PX}px` }} className={`sticky top-0 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center z-30 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}>
                                    <div className="text-center">
                                        <div className="text-[8px] sm:text-[10px] uppercase text-slate-500 font-bold">
                                            <span className="sm:inline hidden">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                                            <span className="sm:hidden inline">{day.toLocaleDateString([], { weekday: 'narrow' })}</span>
                                        </div>
                                        <div className={`text-xs sm:text-sm font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mx-auto' : 'text-slate-900 dark:text-white'}`}>{day.getDate()}</div>
                                    </div>
                                </div>

                                <div style={gridContainerStyle} className="relative">
                                    {isToday && (
                                        <div className="absolute left-0 right-0 z-40 pointer-events-none flex items-center transition-[top] duration-1000 ease-linear" style={{ top: `${redLineY}px`, transform: 'translateY(-1px)' }}>
                                            <div className="w-full border-t border-rose-500 shadow-sm relative flex items-center">
                                                <div className="w-1.5 h-1.5 bg-rose-500 rounded-full absolute -left-0.5"></div>
                                            </div>
                                        </div>
                                    )}

                                    {hours.map(h => {
                                        const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                                        if (settings.hideNonWorkingHours && isNonWorking) return null;
                                        return (
                                            <div 
                                                key={h} 
                                                style={rowStyle} 
                                                className={`border-b border-slate-50 dark:border-slate-800/50 relative cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 ${isNonWorking ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`} 
                                                onClick={() => onSlotClick(new Date(day).setHours(h, 0, 0, 0))} 
                                            />
                                        );
                                    })}

                                    {dayTasks.map(task => {
                                        let startHour = 0;
                                        let duration = task.durationMinutes || task.estimateMinutes || 60;
                                        const isBeingInteracted = activeInteraction?.task.id === task.id;
                                        
                                        if (isBeingInteracted && activeInteraction) {
                                            const deltaY = activeInteraction.currentY - activeInteraction.initialY;
                                            const deltaMinutes = Math.round(deltaY / (rowHeight / 4)) * 15;
                                            if (activeInteraction.type === 'MOVE') {
                                                const z = getZoned(activeInteraction.initialTime, timezone);
                                                startHour = z.hour + (z.minute + deltaMinutes) / 60;
                                            } else {
                                                const z = getZoned(task.plannedAt || task.deadline || Date.now(), timezone);
                                                startHour = z.hour + z.minute / 60;
                                                duration = Math.max(15, activeInteraction.initialDuration + deltaMinutes);
                                            }
                                        } else {
                                            if (task.plannedAt) { const z = getZoned(task.plannedAt, timezone); startHour = z.hour + z.minute / 60; }
                                            else if (task.deadline) { const z = getZoned(task.deadline, timezone); startHour = z.hour; }
                                        }

                                        if (settings.hideNonWorkingHours) {
                                            if (startHour < settings.workingHoursStart || startHour > settings.workingHoursEnd) return null;
                                            startHour = startHour - settings.workingHoursStart;
                                        }

                                        const top = startHour * rowHeight;
                                        const height = (duration / 60) * rowHeight;
                                        const isDone = task.status === TaskStatus.DONE;
                                        const isRecurring = task.id.includes('_recur_') || !!task.recurrence;
                                        const taskTag = task.tags && task.tags.length > 0 ? task.tags[0] : null;
                                        const tagEntity = taskTag ? tags.find(t => t.name === taskTag) : null;
                                        const tagColor = tagEntity?.colorHex;

                                        let blockClass = `absolute left-0.5 right-0.5 rounded sm:p-1 p-0.5 text-[8px] sm:text-[10px] font-medium overflow-hidden border transition-all z-10 hover:z-20 shadow-sm touch-pan-y ${isBeingInteracted ? 'shadow-xl scale-[1.05] opacity-90 z-50 ring-2 ring-indigo-500/50 cursor-grabbing duration-0' : 'cursor-default'} `;
                                        blockClass += getEventColorClasses(task.priority, isDone, !!tagColor);
                                        
                                        const inlineStyle: React.CSSProperties = { top: `${top}px`, height: `${Math.max(18, height)}px` };
                                        if (tagColor && !isDone) inlineStyle.backgroundColor = tagColor;

                                        return (
                                            <div 
                                                key={task.id} 
                                                onPointerDown={(e) => onPointerDown(e, task, 'MOVE')} 
                                                className={blockClass} 
                                                style={inlineStyle}
                                            >
                                                <div className="truncate font-bold leading-tight pointer-events-none">{isRecurring && <Repeat size={7} className="inline mr-0.5" />}{task.title}</div>
                                                <div className="truncate opacity-80 sm:block hidden pointer-events-none">{duration}m {isDone && <Check size={8} />}</div>
                                                {!isDone && ( 
                                                    <div 
                                                        className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center group/resize touch-none" 
                                                        onPointerDown={(e) => onPointerDown(e, task, 'RESIZE')}
                                                    > 
                                                        <div className="w-6 sm:w-8 h-1 bg-black/10 rounded-full group-hover/resize:bg-black/30" /> 
                                                    </div> 
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const MonthView: React.FC<{
    date: Date;
    tasks: TaskEntity[];
    habits: HabitEntity[];
    tags: TagEntity[];
    settings: CalendarSettings;
    onDateClick: (day: Date) => void;
}> = ({ date, tasks, habits, tags, settings, onDateClick }) => {
    const days = DateUtils.getMonthDays(date);
    return (
        <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 h-full overflow-hidden">
            {['M','T','W','T','F','S','S'].map((d, i) => (<div key={i} className="bg-white dark:bg-slate-900 p-2 text-center text-xs font-bold text-slate-400">{d}</div>))}
            {days.map((day, i) => {
                const isSameMonth = day.getMonth() === date.getMonth();
                const isToday = DateUtils.isToday(day);
                const { tasks: dayTasks } = getEventsForDay(day, tasks, habits, settings, tags);
                return (
                    <div key={i} onClick={() => onDateClick(day)} className={`bg-white dark:bg-slate-900 p-1 min-h-[60px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${!isSameMonth ? 'opacity-30' : ''}`}>
                        <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-700 dark:text-slate-300'}`}>{day.getDate()}</div>
                        <div className="mt-1 space-y-0.5">
                            {dayTasks.slice(0, 3).map(t => {
                                const taskTag = t.tags && t.tags.length > 0 ? tags.find(tag => tag.name === t.tags[0]) : null;
                                let dotStyle = {};
                                let dotClass = `h-1.5 rounded-full w-full `;
                                if (t.status === TaskStatus.DONE) dotClass += 'bg-slate-300 dark:bg-slate-600';
                                else if (taskTag) dotStyle = { backgroundColor: taskTag.colorHex };
                                else { if (t.priority === Priority.HIGH) dotClass += 'bg-rose-400'; else if (t.priority === Priority.MEDIUM) dotClass += 'bg-amber-400'; else dotClass += 'bg-indigo-400'; }
                                return (<div key={t.id} className={t.status === TaskStatus.DONE || !taskTag ? dotClass : 'h-1.5 rounded-full w-full'} style={dotStyle} />);
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const RecurrenceConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'THIS' | 'ALL') => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex items-center gap-3 mb-4 text-indigo-600 dark:text-indigo-400"> <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full"><Repeat size={24} /></div> <h3 className="font-bold text-lg text-slate-900 dark:text-white">Изменение серии</h3> </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">Вы изменяете время для повторяющейся задачи. Как применить изменения?</p>
                <div className="space-y-3">
                    <button onClick={() => onConfirm('THIS')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"> <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 rounded-lg"><CheckSquare size={18} className="text-slate-500 group-hover:text-indigo-500" /></div> <div><div className="font-bold text-slate-900 dark:text-white text-sm">Только эта задача</div><div className="text-xs text-slate-500">Создаст исключение для текущего дня</div></div> </button>
                    <button onClick={() => onConfirm('ALL')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"> <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 rounded-lg"><List size={18} className="text-slate-500 group-hover:text-indigo-500" /></div> <div><div className="font-bold text-slate-900 dark:text-white text-sm">Все повторения</div><div className="text-xs text-slate-500">Изменит время для всей серии</div></div> </button>
                </div>
                <button onClick={onClose} className="w-full mt-4 py-3 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Отмена</button>
            </div>
        </div>
    );
};

export const CalendarView: React.FC<CalendarViewProps> = ({ userId, onNavigate, labels }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(Date.now());
    const [settings, setSettings] = useState<CalendarSettings>(() => {
        const user = AuthService.getCurrentUser();
        return user?.calendarSettings || { viewMode: 'WEEK', workingHoursStart: 9, workingHoursEnd: 18, hideNonWorkingHours: false, showHabits: true, showCompleted: true, timezone: 'Europe/Moscow' };
    });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [tasks, setTasks] = useState<TaskEntity[]>([]);
    const [habits, setHabits] = useState<HabitEntity[]>([]);
    const [tags, setTags] = useState<TagEntity[]>([]);
    const [pendingRecurrenceAction, setPendingRecurrenceAction] = useState<{ type: 'MOVE' | 'RESIZE', task: TaskEntity, newStart?: number, newDuration?: number } | null>(null);

    const refreshData = () => {
        const tRes = TaskRepository.getTasksForUser(userId); if (tRes.success) setTasks(tRes.data);
        const hRes = HabitRepository.getHabitsForUser(userId); if (hRes.success) setHabits(hRes.data);
        const tagsRes = TagRepository.getAllTags(); if (tagsRes.success) setTags(tagsRes.data);
    };

    useEffect(() => { refreshData(); }, [userId]);

    const handleSaveSettings = (newSettings: CalendarSettings) => {
        setSettings(newSettings);
        const user = AuthService.getCurrentUser();
        if (user) {
            const updated = { ...user, calendarSettings: newSettings };
            AuthService.updateUser(updated);
        }
    };

    const handleSwipe = (direction: 'PREV' | 'NEXT') => {
        const d = new Date(currentDate);
        const offset = settings.viewMode === 'WEEK' ? 7 : 1;
        if (direction === 'PREV') d.setDate(d.getDate() - offset);
        else d.setDate(d.getDate() + offset);
        setCurrentDate(d);
    };

    const handleTaskMove = async (task: TaskEntity, newTime: number) => {
        const isRecurring = task.id.includes('_recur_') || (task.recurrence && !task.parentTaskId);
        if (isRecurring) {
            setPendingRecurrenceAction({ type: 'MOVE', task, newStart: newTime });
        } else {
            const updated = { ...task, plannedAt: newTime };
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
            await UseCases.updateTask.execute(TaskMapper.toDomain(updated));
        }
    };

    const handleTaskResize = async (task: TaskEntity, newDuration: number) => {
        const isRecurring = task.id.includes('_recur_') || (task.recurrence && !task.parentTaskId);
        if (isRecurring) {
            setPendingRecurrenceAction({ type: 'RESIZE', task, newDuration });
        } else {
            const updated = { ...task, durationMinutes: newDuration, estimateMinutes: newDuration };
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
            await UseCases.updateTask.execute(TaskMapper.toDomain(updated));
        }
    };

    const handleSlotClick = (ts: number) => {
        onNavigate({ type: 'TASK_CREATE', initialPlannedAt: ts });
    };

    const handleRecurrenceConfirm = async (mode: 'THIS' | 'ALL') => {
        if (!pendingRecurrenceAction) return;
        const { type, task, newStart, newDuration } = pendingRecurrenceAction;
        const realId = task.id.split('_')[0];
        const baseTask = tasks.find(t => t.id === realId);
        if (!baseTask) { setPendingRecurrenceAction(null); return; }

        if (mode === 'THIS') {
            const instanceTimestampStr = task.id.split('_recur_')[1];
            if (instanceTimestampStr) {
                const instanceTime = parseInt(instanceTimestampStr);
                const dateObj = new Date(instanceTime);
                dateObj.setHours(0, 0, 0, 0); 
                const dateToExclude = dateObj.getTime();
                const currentExcluded = baseTask.recurrence?.excludedDates || [];
                const updatedRecurrence = { ...baseTask.recurrence!, excludedDates: [...currentExcluded, dateToExclude] };
                await UseCases.updateTask.execute(TaskMapper.toDomain({ ...baseTask, recurrence: updatedRecurrence }));
            }
            await UseCases.createTask.execute(baseTask.userId, baseTask.title, baseTask.priority, baseTask.energyLevel, newDuration || baseTask.estimateMinutes, undefined, baseTask.tags, undefined, newStart || task.plannedAt, newDuration || baseTask.durationMinutes);
        } else if (mode === 'ALL') {
            const updates: any = { ...baseTask };
            if (newDuration) { updates.durationMinutes = newDuration; updates.estimateMinutes = newDuration; }
            if (newStart) {
                const newTimeDate = new Date(newStart);
                const originalStartDate = new Date(baseTask.plannedAt || Date.now()); 
                originalStartDate.setHours(newTimeDate.getHours(), newTimeDate.getMinutes());
                updates.plannedAt = originalStartDate.getTime();
            }
            await UseCases.updateTask.execute(TaskMapper.toDomain(updates as TaskEntity));
        }
        refreshData();
        setPendingRecurrenceAction(null);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-2 shadow-sm z-30">
                <div className="flex justify-between items-center px-2">
                    <h2 className="text-lg font-bold dark:text-white">{currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}</h2>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">{(['DAY', 'WEEK', 'MONTH'] as const).map(m => (<button key={m} onClick={() => setSettings({...settings, viewMode: m})} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${settings.viewMode === m ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{labels[m === 'DAY' ? 'dayView' : m === 'WEEK' ? 'weekView' : 'monthView']}</button>))}</div>
                </div>
                <div className="flex justify-between items-center px-2">
                    <div className="flex gap-1">
                        <button onClick={() => handleSwipe('PREV')} className="p-1 text-slate-500 hover:text-indigo-600"><ChevronLeft /></button>
                        <button onClick={() => handleSwipe('NEXT')} className="p-1 text-slate-500 hover:text-indigo-600"><ChevronRight /></button>
                    </div>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded text-slate-400 hover:text-indigo-600 transition-colors">
                        <Settings size={18} />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 relative overflow-hidden">
                {settings.viewMode === 'MONTH' ? (
                    <div className="h-full overflow-y-auto">
                         <MonthView date={currentDate} tasks={tasks} habits={habits} tags={tags} settings={settings} onDateClick={(day) => { setCurrentDate(day); setSettings({...settings, viewMode: 'DAY'}); }} />
                    </div>
                ) : (
                    <TimeGrid 
                        date={currentDate} 
                        mode={settings.viewMode} 
                        settings={settings} 
                        now={now} 
                        tasks={tasks} 
                        habits={habits} 
                        tags={tags} 
                        onNavigate={onNavigate} 
                        onSlotClick={handleSlotClick} 
                        onTaskMove={handleTaskMove} 
                        onTaskResize={handleTaskResize} 
                        onSwipe={handleSwipe}
                    />
                )}
            </div>

            <button onClick={() => handleSlotClick(Date.now())} className="absolute bottom-20 right-4 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-105 active:scale-95 transition-transform"><Plus size={24} /></button>
            
            <RecurrenceConfirmationModal isOpen={!!pendingRecurrenceAction} onClose={() => setPendingRecurrenceAction(null)} onConfirm={handleRecurrenceConfirm} />
            
            <CalendarSettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
                settings={settings} 
                onSave={handleSaveSettings} 
            />
        </div>
    );
};
