
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

const ROW_HEIGHT_PX = 56; 
const HEADER_HEIGHT_PX = 40;
const TOTAL_GRID_HEIGHT = 24 * ROW_HEIGHT_PX;

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

const getEventsForDay = (
    dayColumnDate: Date, 
    tasks: TaskEntity[], 
    habits: HabitEntity[], 
    settings: CalendarSettings, 
    tags: TagEntity[]
) => {
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
    
    const days = mode === 'DAY' ? [date] : DateUtils.getWeekDays(DateUtils.getStartOfWeek(date));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);

    // Swipe state
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const [swipeOffset, setSwipeOffset] = useState(0);

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

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => setScrollTop(e.currentTarget.scrollTop);

    useEffect(() => {
        if (containerRef.current) {
            const h = new Date().getHours();
            const targetH = Math.max(0, h - 2);
            let scrollY = targetH * ROW_HEIGHT_PX;
            if (settings.hideNonWorkingHours) {
                if (targetH < settings.workingHoursStart) scrollY = 0;
                else scrollY = (targetH - settings.workingHoursStart) * ROW_HEIGHT_PX;
            }
            containerRef.current.scrollTop = scrollY;
        }
    }, [settings.hideNonWorkingHours, settings.workingHoursStart]);

    const timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowZoned = getZoned(now, timezone);
    const totalMinutes = nowZoned.hour * 60 + nowZoned.minute + nowZoned.second / 60;
    const pxPerMin = ROW_HEIGHT_PX / 60;
    
    let redLineY = totalMinutes * pxPerMin;
    if (settings.hideNonWorkingHours) {
        const startMin = settings.workingHoursStart * 60;
        const endMin = settings.workingHoursEnd * 60;
        if (totalMinutes < startMin) redLineY = 0;
        else if (totalMinutes > endMin) redLineY = (endMin - startMin) * pxPerMin; 
        else redLineY = redLineY - (settings.workingHoursStart * ROW_HEIGHT_PX);
    }
    
    const currentTimeLabel = `${nowZoned.hour.toString().padStart(2,'0')}:${nowZoned.minute.toString().padStart(2,'0')}`;
    const rowStyle = { height: `${ROW_HEIGHT_PX}px`, minHeight: `${ROW_HEIGHT_PX}px`, flexShrink: 0, boxSizing: 'border-box' as const };
    const gridContainerStyle = { height: settings.hideNonWorkingHours ? 'auto' : `${TOTAL_GRID_HEIGHT}px` };

    const onPointerDown = (e: React.PointerEvent, task: TaskEntity, type: 'MOVE' | 'RESIZE') => {
        e.stopPropagation();
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setActiveInteraction({
            type,
            task,
            initialX: e.clientX,
            initialY: e.clientY,
            initialTime: task.plannedAt || task.deadline || Date.now(),
            initialDuration: task.durationMinutes || task.estimateMinutes || 60,
            currentY: e.clientY,
            currentX: e.clientX
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (activeInteraction) return; // Don't swipe while moving task
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartX.current === null || touchStartY.current === null || activeInteraction) return;
        
        const deltaX = e.touches[0].clientX - touchStartX.current;
        const deltaY = e.touches[0].clientY - touchStartY.current;

        // If predominantly horizontal
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            setSwipeOffset(deltaX);
            // Optional: prevent vertical scrolling if swiping horizontal
            if (Math.abs(deltaX) > 10) {
                if (e.cancelable) e.preventDefault();
            }
        }
    };

    const handleTouchEnd = () => {
        if (touchStartX.current === null) return;
        
        const threshold = 100;
        if (swipeOffset > threshold) {
            onSwipe('PREV');
        } else if (swipeOffset < -threshold) {
            onSwipe('NEXT');
        }
        
        setSwipeOffset(0);
        touchStartX.current = null;
        touchStartY.current = null;
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!activeInteraction) return;
        setActiveInteraction({ ...activeInteraction, currentX: e.clientX, currentY: e.clientY });
    };

    const onPointerUp = (e: React.PointerEvent) => {
        if (!activeInteraction) return;
        const { type, task, initialY, initialX, initialTime, initialDuration, currentY, currentX } = activeInteraction;
        
        const deltaY = currentY - initialY;
        const deltaMinutes = Math.round(deltaY / (ROW_HEIGHT_PX / 4)) * 15;

        if (type === 'RESIZE') {
            const newDuration = Math.max(15, initialDuration + deltaMinutes);
            if (newDuration !== initialDuration) onTaskResize(task, newDuration);
        } else {
            const gridEl = containerRef.current;
            if (gridEl) {
                const dayCols = gridEl.querySelectorAll('.day-column');
                const dayWidth = dayCols[0]?.clientWidth || 100;
                const deltaX = currentX - initialX;
                const dayShift = Math.round(deltaX / dayWidth);
                
                const newTime = new Date(initialTime);
                newTime.setDate(newTime.getDate() + dayShift);
                newTime.setMinutes(newTime.getMinutes() + deltaMinutes);
                
                if (newTime.getTime() !== initialTime || dayShift !== 0) {
                    onTaskMove(task, newTime.getTime());
                } else if (Math.abs(deltaY) < 5 && Math.abs(deltaX) < 5) {
                    onNavigate({ type: 'TASK_DETAIL', taskId: task.id.split('_')[0] });
                }
            }
        }
        setActiveInteraction(null);
    };

    return (
        <div 
            className="flex flex-1 overflow-hidden bg-white dark:bg-slate-900 relative select-none h-full"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className="w-12 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 overflow-hidden relative">
                <div style={{ height: `${HEADER_HEIGHT_PX}px` }} className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                <div className="overflow-hidden" style={{marginTop: `-${scrollTop}px`}}>
                    <div style={gridContainerStyle}>
                        {hours.map(h => {
                            const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                            if (settings.hideNonWorkingHours && isNonWorking) return null;
                            return <div key={h} style={rowStyle} className="relative border-transparent"><span className="absolute -top-2 right-2 text-[10px] text-slate-400 font-medium leading-4">{h}:00</span></div>;
                        })}
                    </div>
                </div>
            </div>
            
            <div 
                ref={containerRef} 
                onScroll={handleScroll} 
                className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative h-full transition-transform duration-75"
                style={{ transform: swipeOffset ? `translateX(${swipeOffset * 0.2}px)` : 'none' }}
            >
                <div className="flex min-w-[300px] relative h-full">
                    {days.map((day, dIdx) => {
                        const { tasks: dayTasks } = getEventsForDay(day, tasks, habits, settings, tags);
                        const isToday = DateUtils.isSameDay(day, new Date(now));

                        return (
                            <div key={dIdx} className="day-column flex-1 min-w-[100px] border-r border-slate-100 dark:border-slate-800 relative group">
                                <div style={{ height: `${HEADER_HEIGHT_PX}px` }} className={`sticky top-0 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center z-30 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}>
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold">{day.toLocaleDateString([], { weekday: 'short' })}</div>
                                        <div className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 w-6 h-6 rounded-full flex items-center justify-center mx-auto' : 'text-slate-900 dark:text-white'}`}>{day.getDate()}</div>
                                    </div>
                                </div>

                                <div style={gridContainerStyle} className="relative">
                                    {isToday && (
                                        <div className="absolute left-0 right-0 z-40 pointer-events-none flex items-center transition-[top] duration-1000 ease-linear" style={{ top: `${redLineY}px`, transform: 'translateY(-1px)' }}>
                                            <div className="w-full border-t-2 border-rose-500 shadow-sm relative flex items-center">
                                                <div className="w-2 h-2 bg-rose-500 rounded-full absolute -left-1"></div>
                                                <div className="absolute left-2 text-[9px] font-bold text-white bg-rose-500 px-1 rounded-sm -top-2 shadow-sm">{currentTimeLabel}</div>
                                            </div>
                                        </div>
                                    )}

                                    {hours.map(h => {
                                        const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                                        if (settings.hideNonWorkingHours && isNonWorking) return null;
                                        return <div key={h} style={rowStyle} className={`border-b border-slate-50 dark:border-slate-800/50 relative cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/50 ${isNonWorking ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`} onClick={() => onSlotClick(new Date(day).setHours(h, 0, 0, 0))} />;
                                    })}

                                    {dayTasks.map(task => {
                                        let startHour = 0;
                                        let duration = task.durationMinutes || task.estimateMinutes || 60;
                                        const isBeingInteracted = activeInteraction?.task.id === task.id;
                                        if (isBeingInteracted && activeInteraction) {
                                            const deltaY = activeInteraction.currentY - activeInteraction.initialY;
                                            const deltaMinutes = Math.round(deltaY / (ROW_HEIGHT_PX / 4)) * 15;
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

                                        const top = startHour * ROW_HEIGHT_PX;
                                        const height = (duration / 60) * ROW_HEIGHT_PX;
                                        const isDone = task.status === TaskStatus.DONE;
                                        const isRecurring = task.id.includes('_recur_') || !!task.recurrence;
                                        
                                        const taskTag = task.tags && task.tags.length > 0 ? task.tags[0] : null;
                                        const tagEntity = taskTag ? tags.find(t => t.name === taskTag) : null;
                                        const tagColor = tagEntity?.colorHex;

                                        let blockClass = `absolute left-1 right-1 rounded p-1 text-[10px] font-medium overflow-hidden border cursor-grab active:cursor-grabbing z-10 hover:z-20 shadow-sm transition-shadow ${isBeingInteracted ? 'shadow-xl scale-[1.02] opacity-90 z-50 ring-2 ring-indigo-500' : ''} `;
                                        blockClass += getEventColorClasses(task.priority, isDone, !!tagColor);
                                        
                                        const inlineStyle: React.CSSProperties = { 
                                            top: `${top}px`, 
                                            height: `${Math.max(20, height)}px`, 
                                            touchAction: 'none' 
                                        };
                                        if (tagColor && !isDone) {
                                            inlineStyle.backgroundColor = tagColor;
                                        }

                                        return (
                                            <div key={task.id} onPointerDown={(e) => onPointerDown(e, task, 'MOVE')} onPointerMove={onPointerMove} onPointerUp={onPointerUp} className={blockClass} style={inlineStyle}>
                                                <div className="truncate font-bold flex items-center gap-1">{isRecurring && <Repeat size={8} />}{task.title}</div>
                                                <div className="truncate opacity-80 flex items-center gap-1">{duration}m {isDone && <Check size={8} />}</div>
                                                {!isDone && ( <div className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center group/resize" onPointerDown={(e) => onPointerDown(e, task, 'RESIZE')}> <div className="w-8 h-1 bg-black/10 rounded-full group-hover/resize:bg-black/30" /> </div> )}
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

    const handleSwipe = (direction: 'PREV' | 'NEXT') => {
        const d = new Date(currentDate);
        const offset = settings.viewMode === 'WEEK' ? 7 : 1;
        if (direction === 'PREV') {
            d.setDate(d.getDate() - offset);
        } else {
            d.setDate(d.getDate() + offset);
        }
        setCurrentDate(d);
    };

    const handleTaskMove = async (task: TaskEntity, newTime: number) => {
        const isRecurring = task.id.includes('_recur_') || (task.recurrence && !task.parentTaskId);
        if (isRecurring) setPendingRecurrenceAction({ type: 'MOVE', task, newStart: newTime });
        else {
            const updated = { ...task, plannedAt: newTime };
            setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
            await UseCases.updateTask.execute(TaskMapper.toDomain(updated));
        }
    };

    const handleTaskResize = async (task: TaskEntity, newDuration: number) => {
        const isRecurring = task.id.includes('_recur_') || (task.recurrence && !task.parentTaskId);
        if (isRecurring) setPendingRecurrenceAction({ type: 'RESIZE', task, newDuration });
        else {
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
            if (newDuration) {
                updates.durationMinutes = newDuration;
                updates.estimateMinutes = newDuration;
            }
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
                    <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded text-slate-400 hover:text-indigo-600"><Settings size={18} /></button>
                </div>
            </div>
            
            <div className="flex-1 relative">
                {settings.viewMode === 'MONTH' ? (
                    <MonthView date={currentDate} tasks={tasks} habits={habits} tags={tags} settings={settings} onDateClick={(day) => { setCurrentDate(day); setSettings({...settings, viewMode: 'DAY'}); }} />
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
        </div>
    );
};
