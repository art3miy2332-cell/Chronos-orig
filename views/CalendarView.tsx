
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskEntity, HabitEntity, CalendarSettings, TaskStatus, Priority, TagEntity, EnergyLevel, RecurrenceRule, RecurrenceFrequency } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, Moon, Plus, AlignJustify, X, Clock, Settings, Check, Sparkles, BrainCircuit, AlertTriangle, ArrowRight, Sun, Battery, Globe, Repeat, CalendarDays, CheckSquare, Tag, Zap, Copy, List, Bug } from 'lucide-react';
import { DateUtils } from '../utils/date-utils';
import { TaskRepository, HabitRepository, TagRepository } from '../data/repositories';
import { UseCases } from '../domain/usecases';
import { AuthService } from '../utils/auth';

interface CalendarViewProps {
    userId: string;
    onNavigate: (view: any) => void;
    labels: any;
}

const TIMEZONES = [
    { value: 'Europe/Moscow', label: 'Moscow (GMT+3)' },
    { value: 'UTC', label: 'UTC' },
    { value: 'Europe/London', label: 'London (GMT)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Dubai', label: 'Dubai (GMT+4)' },
    { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+9)' },
    { value: 'America/New_York', label: 'New York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
];

// STRICT CONSTANTS FOR PIXEL-PERFECT RENDERING
const ROW_HEIGHT_PX = 56; 
const HEADER_HEIGHT_PX = 40;
const TOTAL_GRID_HEIGHT = 24 * ROW_HEIGHT_PX; // 1344px

// --- HELPERS ---

const getZoned = (ts: number, timezone: string) => DateUtils.getZonedParts(ts, timezone);

const getEventColor = (priority: Priority, isDone: boolean, tagColor?: string) => {
    if (isDone) return 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600';
    if (tagColor) return '';
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
    const dayHabits = settings.showHabits ? habits.filter(h => h.reminderTime && h.active) : [];
    return { tasks: dayTasks, habits: dayHabits };
};

// --- DEBUG OVERLAY ---
const DebugOverlay: React.FC<{
    now: number;
    containerHeight: number;
    scrollTop: number;
    redLineY: number;
    timezone: string;
    offset: number;
}> = ({ now, containerHeight, scrollTop, redLineY, timezone, offset }) => {
    const [isVisible, setIsVisible] = useState(false);
    const date = new Date(now);
    const zoned = getZoned(now, timezone);
    const timeStr = `${zoned.hour}:${zoned.minute}:${zoned.second}`;
    const totalMinutes = zoned.hour * 60 + zoned.minute;

    if (!isVisible) return <button onClick={() => setIsVisible(true)} className="fixed bottom-20 right-2 p-2 bg-black/80 text-white rounded-full z-[100] opacity-30 hover:opacity-100 font-mono text-[10px]"><Bug size={14}/></button>;

    return (
        <div className="fixed bottom-24 right-4 z-[100] bg-black/90 text-emerald-400 p-4 rounded-xl shadow-2xl font-mono text-[10px] border border-emerald-900/50 w-64 backdrop-blur-md">
            <div className="flex justify-between items-center mb-2 border-b border-emerald-900/50 pb-1">
                <span className="font-bold text-white">CALENDAR DEBUGGER</span>
                <button onClick={() => setIsVisible(false)}><X size={12} className="text-white" /></button>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between"><span>TZ:</span> <span className="text-white">{timezone}</span></div>
                <div className="flex justify-between"><span>Zoned Time:</span> <span className="text-white font-bold">{timeStr}</span></div>
                <div className="flex justify-between"><span>Total Min:</span> <span className="text-white">{totalMinutes}</span></div>
                <div className="flex justify-between"><span>Hide Offset:</span> <span className="text-rose-400">{offset}px</span></div>
                <div className="flex justify-between"><span>Final Top:</span> <span className="text-white font-bold">{redLineY.toFixed(1)}px</span></div>
                <div className="flex justify-between border-t border-emerald-900/50 pt-1 mt-1">
                    <span className="font-bold">Grid Y:</span> 
                    <span className="text-white font-bold">{(redLineY - scrollTop + HEADER_HEIGHT_PX).toFixed(1)}px</span>
                </div>
            </div>
        </div>
    );
};

// --- TIME GRID COMPONENT ---

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
    onDragStart: (e: React.DragEvent, task: TaskEntity) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, day: Date) => void;
    onResizeStart: (e: React.MouseEvent, task: TaskEntity) => void;
}> = ({ date, mode, settings, now, tasks, habits, tags, onNavigate, onSlotClick, onDragStart, onDragOver, onDrop, onResizeStart }) => {
    
    const days = mode === 'DAY' ? [date] : DateUtils.getWeekDays(DateUtils.getStartOfWeek(date));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerH, setContainerH] = useState(0);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    useEffect(() => {
        if (containerRef.current) {
            setContainerH(containerRef.current.clientHeight);
            // Scroll to current time on mount
            const date = new Date();
            const h = date.getHours();
            // Simple scroll to roughly 2 hours before current time
            const targetH = Math.max(0, h - 2);
            let scrollY = targetH * ROW_HEIGHT_PX;
            
            // Adjust scroll for hidden hours
            if (settings.hideNonWorkingHours) {
                if (targetH < settings.workingHoursStart) scrollY = 0;
                else scrollY = (targetH - settings.workingHoursStart) * ROW_HEIGHT_PX;
            }
            
            containerRef.current.scrollTop = scrollY;
        }
    }, [settings.hideNonWorkingHours, settings.workingHoursStart]);

    // --- RED LINE CALCULATION (STRICT) ---
    const timezone = settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const nowZoned = getZoned(now, timezone);
    // Total minutes passed today
    const totalMinutes = nowZoned.hour * 60 + nowZoned.minute + nowZoned.second / 60;
    // Pixels per minute based on fixed row height
    const pxPerMin = ROW_HEIGHT_PX / 60;
    
    // Calculate raw Y position
    let redLineY = totalMinutes * pxPerMin;
    let hiddenOffset = 0;

    // Adjust for Hidden Non-Working Hours
    if (settings.hideNonWorkingHours) {
        const startMin = settings.workingHoursStart * 60;
        const endMin = settings.workingHoursEnd * 60;
        
        // If current time is before working hours, hide line (or clamp to top)
        if (totalMinutes < startMin) {
            redLineY = 0;
        } else if (totalMinutes > endMin) {
            // After working hours
            // It should be at the bottom of the last visible block
            // visible duration = (end - start)
            redLineY = (endMin - startMin) * pxPerMin; 
        } else {
            // Inside working hours
            // subtract the hidden pixels
            hiddenOffset = (settings.workingHoursStart * ROW_HEIGHT_PX);
            redLineY = redLineY - hiddenOffset;
        }
    }
    
    const currentTimeLabel = `${nowZoned.hour.toString().padStart(2,'0')}:${nowZoned.minute.toString().padStart(2,'0')}`;
    
    const rowStyle = { height: `${ROW_HEIGHT_PX}px`, minHeight: `${ROW_HEIGHT_PX}px`, flexShrink: 0, boxSizing: 'border-box' as const };
    
    const gridContainerStyle = { 
        height: settings.hideNonWorkingHours ? 'auto' : `${TOTAL_GRID_HEIGHT}px`,
        minHeight: settings.hideNonWorkingHours ? '0px' : `${TOTAL_GRID_HEIGHT}px`
    };

    return (
        <div className="flex flex-1 overflow-hidden bg-white dark:bg-slate-900 relative select-none h-full">
            {/* Sidebar Time Labels (Sticky independent of content) */}
            <div className="w-12 flex-shrink-0 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col z-20 overflow-hidden relative">
                <div style={{ height: `${HEADER_HEIGHT_PX}px`, flexShrink: 0 }} className="border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"></div>
                <div className="overflow-hidden" style={{marginTop: `-${scrollTop}px`}}>
                    <div style={gridContainerStyle}>
                        {hours.map(h => {
                            const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                            if (settings.hideNonWorkingHours && isNonWorking) return null;
                            return (
                                <div key={h} style={rowStyle} className="relative border-transparent">
                                    <span className="absolute -top-2 right-2 text-[10px] text-slate-400 font-medium leading-4">
                                        {h}:00
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            {/* Main Grid Scroll Area */}
            <div 
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-auto bg-white dark:bg-slate-900 relative h-full"
            >
                <div className="flex min-w-[300px] relative">
                    {days.map((day, dIdx) => {
                        const { tasks: dayTasks, habits: dayHabits } = getEventsForDay(day, tasks, habits, settings, tags);
                        const dayZoned = getZoned(day.getTime(), timezone);
                        const isToday = dayZoned.year === nowZoned.year && dayZoned.month === nowZoned.month && dayZoned.day === nowZoned.day;

                        return (
                            <div 
                                key={dIdx} 
                                className="flex-1 min-w-[100px] border-r border-slate-100 dark:border-slate-800 relative group"
                                onDragOver={onDragOver}
                                onDrop={(e) => onDrop(e, day)}
                            >
                                <div 
                                    style={{ height: `${HEADER_HEIGHT_PX}px` }} 
                                    className={`sticky top-0 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center z-30 ${isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-white dark:bg-slate-900'}`}
                                >
                                    <div className="text-center">
                                        <div className="text-[10px] uppercase text-slate-500 font-bold">{day.toLocaleDateString([], { weekday: 'short' })}</div>
                                        <div className={`text-sm font-bold ${isToday ? 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 w-6 h-6 rounded-full flex items-center justify-center mx-auto' : 'text-slate-900 dark:text-white'}`}>
                                            {day.getDate()}
                                        </div>
                                    </div>
                                </div>

                                <div style={gridContainerStyle} className="relative">
                                    {isToday && (
                                        <div 
                                            className="absolute left-0 right-0 z-40 pointer-events-none flex items-center transition-[top] duration-1000 ease-linear" 
                                            style={{ top: `${redLineY}px`, transform: 'translateY(-1px)' }}
                                        >
                                            <div className="w-full border-t-2 border-rose-500 shadow-sm relative flex items-center">
                                                <div className="w-2 h-2 bg-rose-500 rounded-full absolute -left-1"></div>
                                                <div className="absolute left-2 text-[9px] font-bold text-white bg-rose-500 px-1 rounded-sm -top-2 shadow-sm">
                                                    {currentTimeLabel}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {hours.map(h => {
                                        const isNonWorking = h < settings.workingHoursStart || h > settings.workingHoursEnd;
                                        if (settings.hideNonWorkingHours && isNonWorking) return null;
                                        const slotTime = new Date(day).setHours(h, 0, 0, 0);
                                        return (
                                            <div 
                                                key={h} 
                                                style={rowStyle}
                                                className={`border-b border-slate-50 dark:border-slate-800/50 relative ${isNonWorking ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`} 
                                                onClick={() => onSlotClick(slotTime)}
                                            />
                                        );
                                    })}

                                    {/* Tasks Layer */}
                                    {dayTasks.map(task => {
                                        let startHour = 0;
                                        let duration = task.durationMinutes || task.estimateMinutes || 60;
                                        
                                        if (task.plannedAt) { 
                                            const z = getZoned(task.plannedAt, timezone); 
                                            startHour = z.hour + z.minute / 60; 
                                        } else if (task.deadline) { 
                                            const z = getZoned(task.deadline, timezone); 
                                            startHour = z.hour; 
                                        }
                                        
                                        // Adjust for hidden hours
                                        if (settings.hideNonWorkingHours) {
                                            if (startHour < settings.workingHoursStart) return null; // Skip tasks before start
                                            if (startHour > settings.workingHoursEnd) return null; // Skip tasks after end (simple logic)
                                            startHour = startHour - settings.workingHoursStart;
                                        }

                                        let top = startHour * ROW_HEIGHT_PX;
                                        let height = (duration / 60) * ROW_HEIGHT_PX;
                                        
                                        const taskTag = task.tags && task.tags.length > 0 ? tags.find(t => t.name === task.tags[0]) : null;
                                        const isDone = task.status === TaskStatus.DONE;
                                        const isRecurring = task.id.includes('_recur_') || !!task.recurrence;
                                        
                                        let bgStyle: React.CSSProperties = {};
                                        let blockClass = `absolute left-1 right-1 rounded p-1 text-[10px] font-medium overflow-hidden border cursor-pointer z-10 hover:z-20 shadow-sm transition-all hover:scale-[1.02] active:scale-95 `;
                                        
                                        if (isDone) {
                                            blockClass += 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600';
                                        } else if (taskTag) { 
                                            bgStyle = { backgroundColor: taskTag.colorHex, borderColor: taskTag.colorHex, color: '#fff' }; 
                                            blockClass += 'border'; 
                                        } else {
                                            blockClass += getEventColor(task.priority, false);
                                        }
                                        
                                        return (
                                            <div 
                                                key={task.id} 
                                                draggable 
                                                onDragStart={(e) => onDragStart(e, task)} 
                                                onClick={(e) => { e.stopPropagation(); onNavigate({ type: 'TASK_DETAIL', taskId: task.id.split('_')[0] }); }} 
                                                className={blockClass} 
                                                style={{ 
                                                    top: `${top}px`, 
                                                    height: `${Math.max(20, height)}px`, 
                                                    ...bgStyle 
                                                }}
                                            >
                                                <div className="truncate font-bold flex items-center gap-1">{isRecurring && <Repeat size={8} />}{task.title}</div>
                                                <div className="truncate opacity-80 flex items-center gap-1">{duration}m {task.status === TaskStatus.DONE && <Check size={8} />}</div>
                                                <div className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black/10 hover:bg-white/30" onMouseDown={(e) => onResizeStart(e, task)} />
                                            </div>
                                        );
                                    })}

                                    {/* Habits Layer */}
                                    {dayHabits.map(habit => {
                                        const [hStr, mStr] = (habit.reminderTime || "09:00").split(':');
                                        let startHour = parseInt(hStr) + parseInt(mStr) / 60;
                                        
                                        if (settings.hideNonWorkingHours) {
                                            if (startHour < settings.workingHoursStart) return null;
                                            startHour = startHour - settings.workingHoursStart;
                                        }

                                        let top = startHour * ROW_HEIGHT_PX;
                                        let duration = habit.durationMinutes || 15;
                                        let height = (duration / 60) * ROW_HEIGHT_PX;
                                        
                                        return (
                                            <div 
                                                key={habit.id} 
                                                onClick={(e) => { e.stopPropagation(); onNavigate({ type: 'HABIT_DETAIL', habitId: habit.id }); }} 
                                                className="absolute left-1 right-1 rounded bg-indigo-500 text-white text-[9px] flex items-center px-1 z-10 opacity-80 hover:opacity-100 hover:scale-[1.02] transition-all cursor-pointer shadow-sm border border-indigo-600" 
                                                style={{ 
                                                    top: `${top}px`, 
                                                    height: `${Math.max(16, height)}px` 
                                                }}
                                            >
                                                <AlignJustify size={10} className="mr-1" />{habit.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <DebugOverlay 
                now={now} 
                containerHeight={containerH} 
                scrollTop={scrollTop} 
                redLineY={redLineY} 
                timezone={timezone}
                offset={hiddenOffset}
            />
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
                                return (<div key={t.id} className={dotClass} style={dotStyle} />);
                            })}
                            {dayTasks.length > 3 && <div className="text-[8px] text-slate-400 text-center">+{dayTasks.length - 3}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- RECURRENCE CONFIRMATION MODAL ---
const RecurrenceConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'THIS' | 'ALL') => void;
}> = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex items-center gap-3 mb-4 text-indigo-600 dark:text-indigo-400">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                        <Repeat size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">Повторяющаяся задача</h3>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                    Вы изменяете время для повторяющейся задачи. Как применить изменения?
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => onConfirm('THIS')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 rounded-lg">
                            <CheckSquare size={18} className="text-slate-500 group-hover:text-indigo-500" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">Только эта задача</div>
                            <div className="text-xs text-slate-500">Создаст исключение для текущего дня</div>
                        </div>
                    </button>
                    <button 
                        onClick={() => onConfirm('ALL')}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left group"
                    >
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-900 rounded-lg">
                            <List size={18} className="text-slate-500 group-hover:text-indigo-500" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 dark:text-white text-sm">Все повторения</div>
                            <div className="text-xs text-slate-500">Изменит время для всей серии</div>
                        </div>
                    </button>
                </div>
                <button onClick={onClose} className="w-full mt-4 py-3 text-slate-400 font-bold hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Отмена</button>
            </div>
        </div>
    );
};

// --- RECURRENCE EDITOR COMPONENT ---
const RecurrenceEditor: React.FC<{
    rule?: RecurrenceRule;
    onSave: (rule: RecurrenceRule | undefined) => void;
    onClose: () => void;
}> = ({ rule, onSave, onClose }) => {
    const [freq, setFreq] = useState<RecurrenceFrequency>(rule?.freq || 'DAILY');
    const [interval, setInterval] = useState(rule?.interval || 1);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>(rule?.daysOfWeek || []);
    const [endType, setEndType] = useState<'NEVER' | 'DATE'>(rule?.endCondition === 'DATE' ? 'DATE' : 'NEVER');
    const [endDate, setEndDate] = useState<string>(rule?.endValue ? new Date(rule.endValue).toISOString().split('T')[0] : '');
    const [preset, setPreset] = useState<string>('CUSTOM');

    const toggleDay = (day: number) => {
        if (daysOfWeek.includes(day)) {
            setDaysOfWeek(daysOfWeek.filter(d => d !== day));
        } else {
            setDaysOfWeek([...daysOfWeek, day]);
        }
    };

    const handleApply = () => {
        const newRule: RecurrenceRule = {
            freq,
            interval,
            endCondition: endType,
            endValue: endType === 'DATE' && endDate ? new Date(endDate).getTime() : undefined,
            daysOfWeek: freq === 'WEEKLY' ? daysOfWeek : undefined
        };
        onSave(newRule);
        onClose();
    };

    const applyPreset = (type: string) => {
        setPreset(type);
        if (type === 'DAILY') {
            setFreq('DAILY'); setInterval(1);
        } else if (type === 'WEEKLY') {
            setFreq('WEEKLY'); setInterval(1); setDaysOfWeek([]);
        } else if (type === 'WEEKDAYS') {
            setFreq('WEEKLY'); setInterval(1); setDaysOfWeek([1, 2, 3, 4, 5]);
        } else if (type === 'MONTHLY') {
            setFreq('MONTHLY'); setInterval(1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-5 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Repeat size={20} className="text-indigo-500" /> Настройка повтора
                    </h3>
                    <button onClick={onClose}><X className="text-slate-400" /></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => applyPreset('DAILY')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${preset === 'DAILY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Ежедневно</button>
                        <button onClick={() => applyPreset('WEEKLY')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${preset === 'WEEKLY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Еженедельно</button>
                        <button onClick={() => applyPreset('WEEKDAYS')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${preset === 'WEEKDAYS' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Будни</button>
                        <button onClick={() => applyPreset('MONTHLY')} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${preset === 'MONTHLY' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>Ежемесячно</button>
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
                    <div onClick={() => setPreset('CUSTOM')} className={`space-y-4 ${preset !== 'CUSTOM' ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium dark:text-slate-300">Каждые</span>
                            <input type="number" min="1" max="99" value={interval} onChange={(e) => { setInterval(parseInt(e.target.value) || 1); setPreset('CUSTOM'); }} className="w-16 p-1.5 bg-slate-100 dark:bg-slate-800 rounded text-center font-bold dark:text-white" />
                            <select value={freq} onChange={(e) => { setFreq(e.target.value as any); setPreset('CUSTOM'); }} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded font-medium text-sm dark:text-white outline-none">
                                <option value="DAILY">дн.</option>
                                <option value="WEEKLY">нед.</option>
                                <option value="MONTHLY">мес.</option>
                            </select>
                        </div>
                        {freq === 'WEEKLY' && (
                            <div className="flex justify-between">
                                {['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d, i) => (
                                    <button key={i} onClick={() => { toggleDay(i); setPreset('CUSTOM'); }} className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${daysOfWeek.includes(i) ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{d}</button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-2"></div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Конец повтора</label>
                        <div className="flex gap-2">
                            <button onClick={() => setEndType('NEVER')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${endType === 'NEVER' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>Никогда</button>
                            <button onClick={() => setEndType('DATE')} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${endType === 'DATE' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>До даты</button>
                        </div>
                        {endType === 'DATE' && <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm dark:text-white" />}
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => onSave(undefined)} className="flex-1 py-3 text-rose-500 font-bold hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl">Без повтора</button>
                    <button onClick={handleApply} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30">Готово</button>
                </div>
            </div>
        </div>
    );
};

// --- CONFIG MODAL ---
const CalendarSettingsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    settings: CalendarSettings;
    onUpdate: (s: CalendarSettings) => void;
}> = ({ isOpen, onClose, settings, onUpdate }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Settings size={20} /> Настройки календаря</h3>
                    <button onClick={onClose}><X className="text-slate-400" /></button>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Globe size={12} /> Часовой пояс</label>
                        <select value={settings.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone} onChange={(e) => onUpdate({...settings, timezone: e.target.value})} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm font-medium dark:text-white outline-none">
                            {TIMEZONES.map(tz => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
                        </select>
                    </div>
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Рабочие часы</label>
                        <div className="flex items-center gap-4">
                            <div className="flex-1"><span className="text-xs text-slate-500 block mb-1">Начало</span><input type="number" min="0" max="23" value={settings.workingHoursStart} onChange={(e) => onUpdate({...settings, workingHoursStart: parseInt(e.target.value)})} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-center font-bold dark:text-white" /></div>
                            <span className="text-slate-300">-</span>
                            <div className="flex-1"><span className="text-xs text-slate-500 block mb-1">Конец</span><input type="number" min="0" max="23" value={settings.workingHoursEnd} onChange={(e) => onUpdate({...settings, workingHoursEnd: parseInt(e.target.value)})} className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-center font-bold dark:text-white" /></div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer"><span className="text-sm font-medium dark:text-slate-200">Скрыть нерабочее время</span><div className={`w-10 h-6 rounded-full relative transition-colors ${settings.hideNonWorkingHours ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => onUpdate({...settings, hideNonWorkingHours: !settings.hideNonWorkingHours})}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.hideNonWorkingHours ? 'translate-x-4' : ''}`} /></div></label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer"><span className="text-sm font-medium dark:text-slate-200">Показывать привычки</span><div className={`w-10 h-6 rounded-full relative transition-colors ${settings.showHabits ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => onUpdate({...settings, showHabits: !settings.showHabits})}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showHabits ? 'translate-x-4' : ''}`} /></div></label>
                        <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer"><span className="text-sm font-medium dark:text-slate-200">Показывать завершённые</span><div className={`w-10 h-6 rounded-full relative transition-colors ${settings.showCompleted ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => onUpdate({...settings, showCompleted: !settings.showCompleted})}><div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showCompleted ? 'translate-x-4' : ''}`} /></div></label>
                    </div>
                </div>
                <button onClick={onClose} className="w-full mt-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30">Готово</button>
            </div>
        </div>
    );
};

// --- QUICK ADD MODAL ---
const QuickAddModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    slotTime: number | null;
    availableTags: TagEntity[];
    onSave: (title: string, duration: number, priority: Priority, tags: string[], recurrence?: RecurrenceRule, plannedAt?: number) => void;
}> = ({ isOpen, onClose, slotTime, availableTags, onSave }) => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);
    const [isRecurOpen, setIsRecurOpen] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

    useEffect(() => {
        if (!title) { setAiSuggestion(null); return; }
        const t = title.toLowerCase();
        if (t.includes('code') || t.includes('dev') || t.includes('deep')) { setDuration(90); setAiSuggestion("Deep Work detected (90m)"); }
        else if (t.includes('call') || t.includes('meeting') || t.includes('standup')) { setDuration(30); setAiSuggestion("Meeting detected (30m)"); }
        else if (t.includes('read') || t.includes('study')) { setDuration(45); setAiSuggestion("Optimal study block (45m)"); }
        else { setAiSuggestion(null); }
    }, [title]);

    if (!isOpen || !slotTime) return null;
    const timeString = new Date(slotTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const toggleTag = (tagName: string) => {
        if (selectedTags.includes(tagName)) setSelectedTags(selectedTags.filter(t => t !== tagName));
        else setSelectedTags([...selectedTags, tagName]);
    };

    const formatRecurrence = (r?: RecurrenceRule) => {
        if (!r) return 'Не повторять';
        const intervalStr = r.interval > 1 ? `Каждые ${r.interval} ` : 'Каждый ';
        const freqMap = { 'DAILY': 'день', 'WEEKLY': 'нед.', 'MONTHLY': 'мес.', 'YEARLY': 'год' };
        let str = intervalStr + freqMap[r.freq];
        if (r.freq === 'WEEKLY' && r.daysOfWeek && r.daysOfWeek.length > 0) {
            const daysMap = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
            str = r.daysOfWeek.map(d => daysMap[d]).join(', ');
        }
        return str;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-5 animate-in zoom-in-95">
                <div className="mb-4 flex justify-between items-start">
                    <div><div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Новая задача</div><div className="text-2xl font-bold dark:text-white flex items-center gap-2">{timeString}</div></div>
                    <button onClick={onClose} className="text-slate-400"><X /></button>
                </div>
                <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Название задачи..." className="w-full text-lg border-b-2 border-slate-200 dark:border-slate-700 bg-transparent py-2 outline-none focus:border-indigo-500 dark:text-white mb-2" onKeyDown={(e) => e.key === 'Enter' && title && onSave(title, duration, priority, selectedTags, recurrence, slotTime)} />
                {aiSuggestion && <div className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 mb-4 animate-in fade-in slide-in-from-left-2"><Sparkles size={10} /> {aiSuggestion}</div>}
                <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar pt-2">
                    {[15, 30, 45, 60, 90, 120].map(m => (<button key={m} onClick={() => setDuration(m)} className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${duration === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{m} мин</button>))}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Приоритет</label><div className="flex gap-1">{[Priority.LOW, Priority.MEDIUM, Priority.HIGH].map(p => (<button key={p} onClick={() => setPriority(p)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${priority === p ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}>{p.substring(0,3)}</button>))}</div></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-slate-400 uppercase">Повтор</label><button onClick={() => setIsRecurOpen(true)} className={`w-full py-1.5 px-2 rounded-lg border text-[10px] font-bold flex items-center justify-between transition-colors ${recurrence ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500 text-indigo-600' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><span className="truncate">{formatRecurrence(recurrence)}</span><Settings size={12} /></button></div>
                </div>
                <div className="mb-6"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Теги</label><div className="flex flex-wrap gap-2">{availableTags.slice(0, 5).map(tag => (<button key={tag.id} onClick={() => toggleTag(tag.name)} className={`text-[10px] px-2 py-1 rounded-md border flex items-center gap-1 transition-colors ${selectedTags.includes(tag.name) ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'border-slate-200 dark:border-slate-700 text-slate-500'}`}><div className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: tag.colorHex}} />{tag.name}</button>))}{availableTags.length === 0 && <span className="text-[10px] text-slate-400 italic">Нет тегов</span>}</div></div>
                <button disabled={!title} onClick={() => onSave(title, duration, priority, selectedTags, recurrence, slotTime)} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50">Создать задачу</button>
            </div>
            {isRecurOpen && <RecurrenceEditor rule={recurrence} onSave={setRecurrence} onClose={() => setIsRecurOpen(false)} />}
        </div>
    );
};

// --- AI SCHEDULE MODAL ---
const AIScheduleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    tasksToSchedule: TaskEntity[];
    onConfirm: (proposedSchedule: { taskId: string, time: number }[]) => void;
    settings: CalendarSettings;
    existingTasks: TaskEntity[];
    targetDate: Date;
}> = ({ isOpen, onClose, tasksToSchedule, onConfirm, settings, existingTasks, targetDate }) => {
    const [proposal, setProposal] = useState<{ scheduled: any[], overflow: any[], warnings: string[] } | null>(null);

    useEffect(() => {
        if (isOpen && tasksToSchedule.length > 0) {
            const result = calculateSchedule();
            setProposal(result);
        }
    }, [isOpen, tasksToSchedule]);

    const calculateSchedule = () => {
        const dayStart = new Date(targetDate);
        dayStart.setHours(settings.workingHoursStart, 0, 0, 0);
        const dayEnd = new Date(targetDate);
        dayEnd.setHours(settings.workingHoursEnd, 0, 0, 0);

        const now = new Date();
        const isToday = dayStart.getDate() === now.getDate() && dayStart.getMonth() === now.getMonth();
        let cursor = isToday && now.getTime() > dayStart.getTime() ? now.getTime() : dayStart.getTime();
        const remainder = 15 - (new Date(cursor).getMinutes() % 15);
        cursor += remainder * 60000;

        const sortedTasks = [...tasksToSchedule].sort((a, b) => {
            const pMap = { [Priority.HIGH]: 3, [Priority.MEDIUM]: 2, [Priority.LOW]: 1 };
            const eMap = { [EnergyLevel.HIGH]: 3, [EnergyLevel.MEDIUM]: 2, [EnergyLevel.LOW]: 1 };
            const scoreA = pMap[a.priority] * 2 + eMap[a.energyLevel];
            const scoreB = pMap[b.priority] * 2 + eMap[b.energyLevel];
            return scoreB - scoreA;
        });

        const scheduled: any[] = [];
        const overflow: any[] = [];
        const warnings: string[] = [];

        const busySlots = existingTasks
            .filter(t => t.plannedAt && new Date(t.plannedAt).getDate() === dayStart.getDate())
            .map(t => ({ start: t.plannedAt!, end: t.plannedAt! + (t.durationMinutes || 60) * 60000 }))
            .sort((a,b) => a.start - b.start);

        for (const task of sortedTasks) {
            const durationMs = (task.estimateMinutes || 60) * 60000;
            let placed = false;
            while (cursor + durationMs <= dayEnd.getTime()) {
                const potentialEnd = cursor + durationMs;
                const collision = busySlots.find(slot => (cursor >= slot.start && cursor < slot.end) || (potentialEnd > slot.start && potentialEnd <= slot.end) || (cursor <= slot.start && potentialEnd >= slot.end));
                if (collision) {
                    cursor = collision.end + (15 * 60000);
                } else {
                    scheduled.push({ task, time: cursor });
                    cursor += durationMs + (15 * 60000);
                    placed = true;
                    break;
                }
            }
            if (!placed) overflow.push(task);
        }
        if (overflow.length > 0) warnings.push(`День перегружен! ${overflow.length} задач не поместились.`);
        if (scheduled.length > 5) warnings.push("Высокая нагрузка. Не забудь про перерывы.");
        return { scheduled, overflow, warnings };
    };

    if (!isOpen) return null;
    const handleApply = () => { if (proposal) { const result = proposal.scheduled.map(s => ({ taskId: s.task.id, time: s.time })); onConfirm(result); } };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 flex flex-col max-h-[85vh]">
                <div className="text-center mb-6 shrink-0"><div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-600"><BrainCircuit size={28} /></div><h3 className="font-bold text-xl dark:text-white">AI Ассистент</h3><p className="text-slate-500 text-sm mt-1">Анализирую расписание...</p></div>
                {!proposal ? <div className="flex-1 flex items-center justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div> : (
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                        {proposal.warnings.length > 0 && <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-3 rounded-xl flex items-start gap-3"><AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" /><div><div className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-1">СОВЕТ</div>{proposal.warnings.map((w, i) => (<div key={i} className="text-xs text-amber-600 dark:text-amber-300">{w}</div>))}</div></div>}
                        <div><div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><Check size={12} /> Предложенный План</div><div className="space-y-2">{proposal.scheduled.length === 0 && <div className="text-xs italic text-slate-400">Нет свободных слотов.</div>}{proposal.scheduled.map((item, i) => (<div key={i} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-100 dark:border-slate-700"><div className="text-xs font-bold text-slate-500 w-12 text-right">{new Date(item.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div><div className="w-[1px] h-6 bg-indigo-200 dark:bg-indigo-900"></div><div className="flex-1 min-w-0"><div className="text-sm font-medium dark:text-white truncate">{item.task.title}</div><div className="flex items-center gap-2"><span className="text-[10px] text-slate-400">{item.task.estimateMinutes}м</span>{item.task.energyLevel === EnergyLevel.HIGH && <span className="text-[9px] bg-rose-100 dark:bg-rose-900/30 text-rose-600 px-1 rounded flex items-center gap-0.5"><Battery size={8} /> High Energy</span>}</div></div></div>))}</div></div>
                        {proposal.overflow.length > 0 && <div><div className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1"><X size={12} /> Не поместились</div><div className="space-y-1">{proposal.overflow.map((task, i) => (<div key={i} className="text-xs text-slate-500 dark:text-slate-400 pl-4 border-l-2 border-rose-200">{task.title}</div>))}</div></div>}
                    </div>
                )}
                <div className="flex gap-2 shrink-0"><button onClick={onClose} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">Отмена</button><button onClick={handleApply} disabled={!proposal || proposal.scheduled.length === 0} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed">Применить</button></div>
            </div>
        </div>
    );
};

export const CalendarView: React.FC<CalendarViewProps> = ({ userId, onNavigate, labels }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [now, setNow] = useState(Date.now());

    // Live clock
    useEffect(() => {
        const tick = () => setNow(Date.now());
        const interval = setInterval(tick, 1000);
        const handleVis = () => { if (document.visibilityState === 'visible') tick(); };
        document.addEventListener('visibilitychange', handleVis);
        return () => { clearInterval(interval); document.removeEventListener('visibilitychange', handleVis); };
    }, []);

    // Settings persistence
    const [settings, setSettings] = useState<CalendarSettings>(() => {
        const user = AuthService.getCurrentUser();
        const sysTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return user?.calendarSettings || { 
            viewMode: 'WEEK', 
            workingHoursStart: 9, 
            workingHoursEnd: 18, 
            hideNonWorkingHours: false, 
            showHabits: true, 
            showCompleted: true, 
            timezone: sysTz || 'Europe/Moscow' // Default to system timezone if available
        };
    });

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (user && JSON.stringify(user.calendarSettings) !== JSON.stringify(settings)) {
            AuthService.updateUser({ ...user, calendarSettings: settings });
        }
    }, [settings]);

    const updateSettings = (newSettings: CalendarSettings) => setSettings(newSettings);
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [quickAddSlot, setQuickAddSlot] = useState<number | null>(null);
    const [tasks, setTasks] = useState<TaskEntity[]>([]);
    const [habits, setHabits] = useState<HabitEntity[]>([]);
    const [tags, setTags] = useState<TagEntity[]>([]);
    const [dragTask, setDragTask] = useState<TaskEntity | null>(null);
    const [resizingTask, setResizingTask] = useState<TaskEntity | null>(null);
    const [resizeStartY, setResizeStartY] = useState<number | null>(null);
    const [resizeOriginalDuration, setResizeOriginalDuration] = useState<number>(0);

    const [pendingRecurrenceAction, setPendingRecurrenceAction] = useState<{ 
        type: 'MOVE' | 'RESIZE', 
        task: TaskEntity, 
        newStart?: number, 
        newDuration?: number 
    } | null>(null);

    useEffect(() => { refreshData(); }, [userId]);

    const refreshData = () => {
        const tRes = TaskRepository.getTasksForUser(userId);
        if (tRes.success) setTasks(tRes.data);
        const hRes = HabitRepository.getHabitsForUser(userId);
        if (hRes.success) setHabits(hRes.data);
        const tagsRes = TagRepository.getAllTags();
        if (tagsRes.success) setTags(tagsRes.data);
    };

    const next = () => { const d = new Date(currentDate); if (settings.viewMode === 'DAY') d.setDate(d.getDate() + 1); else if (settings.viewMode === 'WEEK') d.setDate(d.getDate() + 7); else d.setMonth(d.getMonth() + 1); setCurrentDate(d); };
    const prev = () => { const d = new Date(currentDate); if (settings.viewMode === 'DAY') d.setDate(d.getDate() - 1); else if (settings.viewMode === 'WEEK') d.setDate(d.getDate() - 7); else d.setMonth(d.getMonth() - 1); setCurrentDate(d); };
    const today = () => setCurrentDate(new Date());

    const unscheduledTasks = useMemo(() => tasks.filter(t => t.status === TaskStatus.TODO && !t.plannedAt && !t.deadline && !t.recurrence), [tasks]);
    const openAIModal = () => { if (unscheduledTasks.length === 0) { alert("Все задачи уже запланированы!"); return; } setIsAIModalOpen(true); };
    const applyAISchedule = async (plan: { taskId: string, time: number }[]) => { for (const item of plan) { const task = tasks.find(t => t.id === item.taskId); if (task) { const updated = { ...task, plannedAt: item.time, durationMinutes: task.estimateMinutes || 60 }; setTasks(prev => prev.map(t => t.id === task.id ? updated : t)); await UseCases.updateTask.execute(updated); } } setIsAIModalOpen(false); };

    // --- RECURRENCE LOGIC ---
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
                await UseCases.updateTask.execute({ ...baseTask, recurrence: updatedRecurrence });
            }
            const finalStart = newStart !== undefined ? newStart : task.plannedAt;
            await UseCases.createTask.execute(baseTask.userId, baseTask.title, baseTask.priority, baseTask.energyLevel, baseTask.estimateMinutes, undefined, baseTask.tags, undefined, finalStart, newDuration || baseTask.durationMinutes);
        } else if (mode === 'ALL') {
            const updates: any = { ...baseTask };
            if (newDuration) updates.durationMinutes = newDuration;
            if (newStart) {
                const newTimeDate = new Date(newStart);
                const originalStartDate = new Date(baseTask.plannedAt || Date.now()); 
                originalStartDate.setHours(newTimeDate.getHours(), newTimeDate.getMinutes());
                updates.plannedAt = originalStartDate.getTime();
            }
            await UseCases.updateTask.execute(updates);
        }
        refreshData();
        setPendingRecurrenceAction(null);
    };

    // --- HANDLERS ---
    const handleDragStart = (e: React.DragEvent, task: TaskEntity) => {
        setDragTask(task);
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDayColumnDrop = async (e: React.DragEvent, dayDate: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        if (!taskId || !dragTask || dragTask.id !== taskId) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetY = e.clientY - rect.top - HEADER_HEIGHT_PX; 
        if (offsetY < 0) return; 

        const rawHours = offsetY / ROW_HEIGHT_PX;
        let baseHour = 0;
        if (settings.hideNonWorkingHours) baseHour = settings.workingHoursStart;

        const totalMinutes = (baseHour * 60) + (rawHours * 60);
        const snappedMinutes = Math.round(totalMinutes / 15) * 15;
        const newTime = new Date(dayDate);
        newTime.setHours(0, 0, 0, 0);
        newTime.setMinutes(snappedMinutes);
        const timestamp = newTime.getTime();

        const isRecurring = dragTask.id.includes('_recur_') || (dragTask.recurrence && !dragTask.parentTaskId);
        if (isRecurring) {
            setPendingRecurrenceAction({ type: 'MOVE', task: dragTask, newStart: timestamp });
            setDragTask(null);
            return;
        }

        const updatedTask: any = { ...dragTask, plannedAt: timestamp };
        setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
        await UseCases.updateTask.execute(updatedTask);
        setDragTask(null);
    };

    const handleResizeStart = (e: React.MouseEvent, task: TaskEntity) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingTask(task);
        setResizeStartY(e.clientY);
        setResizeOriginalDuration(task.durationMinutes || task.estimateMinutes || 60);
    };

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!resizingTask || resizeStartY === null) return;
            const deltaY = e.clientY - resizeStartY;
            const deltaMinutes = Math.round(deltaY / (ROW_HEIGHT_PX / 4)) * 15;
            const newDuration = Math.max(15, resizeOriginalDuration + deltaMinutes);
            setTasks(prev => prev.map(t => t.id === resizingTask.id ? { ...t, durationMinutes: newDuration } : t));
        };
        const handleGlobalMouseUp = async (e: MouseEvent) => {
            if (resizingTask) {
                const deltaY = e.clientY - (resizeStartY || e.clientY);
                const deltaMinutes = Math.round(deltaY / (ROW_HEIGHT_PX / 4)) * 15;
                const finalDuration = Math.max(15, resizeOriginalDuration + deltaMinutes);
                const isRecurring = resizingTask.id.includes('_recur_') || (resizingTask.recurrence && !resizingTask.parentTaskId);
                if (isRecurring) {
                    setPendingRecurrenceAction({ type: 'RESIZE', task: resizingTask, newDuration: finalDuration });
                    refreshData(); 
                } else {
                    const finalTask = tasks.find(t => t.id === resizingTask.id);
                    if (finalTask) await UseCases.updateTask.execute({ ...finalTask, durationMinutes: finalDuration });
                }
                setResizingTask(null);
                setResizeStartY(null);
            }
        };
        if (resizingTask) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [resizingTask, resizeStartY, resizeOriginalDuration, tasks]);

    const handleSlotClick = (timestamp: number) => { setQuickAddSlot(timestamp); };
    const handleQuickAddSave = async (title: string, duration: number, priority: Priority, tags: string[], recurrence?: RecurrenceRule, plannedAt?: number) => {
        if (!quickAddSlot) return;
        const start = plannedAt || quickAddSlot;
        const res = await UseCases.createTask.execute(userId, title, priority, 'MEDIUM' as any, duration, start + duration * 60000, tags, recurrence, start, duration);
        if (res.success) refreshData();
        setQuickAddSlot(null);
    };

    const dateTitle = settings.viewMode === 'MONTH' ? currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' }) : settings.viewMode === 'WEEK' ? `${DateUtils.getStartOfWeek(currentDate).getDate()} - ${new Date(DateUtils.getStartOfWeek(currentDate).getTime() + 6*86400000).getDate()} ${currentDate.toLocaleDateString([], { month: 'short' })}` : currentDate.toLocaleDateString([], { day: 'numeric', month: 'long', weekday: 'long' });
    
    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 flex flex-col gap-2 shadow-sm z-30 flex-shrink-0">
                <div className="flex justify-between items-center px-2">
                    <div className="flex items-center gap-2"><h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">{dateTitle}</h2><button onClick={today} className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-bold text-indigo-600">Today</button></div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">{(['DAY', 'WEEK', 'MONTH'] as const).map(m => (<button key={m} onClick={() => updateSettings({...settings, viewMode: m})} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${settings.viewMode === m ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{labels[m === 'DAY' ? 'dayView' : m === 'WEEK' ? 'weekView' : 'monthView']}</button>))}</div>
                </div>
                <div className="flex justify-between items-center px-2">
                     <div className="flex gap-1"><button onClick={prev} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ChevronLeft size={20} /></button><button onClick={next} className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white"><ChevronRight size={20} /></button></div>
                     <div className="flex items-center gap-2">
                        {unscheduledTasks.length > 0 && <button onClick={openAIModal} className="flex items-center gap-1 bg-gradient-to-br from-indigo-500 to-purple-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md shadow-indigo-500/20 hover:scale-105 transition-transform"><Sparkles size={12} /> Auto ({unscheduledTasks.length})</button>}
                        <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors flex items-center gap-1"><Settings size={18} />{settings.timezone && <span className="text-[9px] font-bold uppercase">{settings.timezone.split('/')[1]?.substring(0,3)}</span>}</button>
                     </div>
                </div>
            </div>
            
            {settings.viewMode === 'MONTH' ? (
                <div className="flex-1 overflow-y-auto">
                    <MonthView 
                        date={currentDate} 
                        tasks={tasks}
                        habits={habits}
                        tags={tags}
                        settings={settings}
                        onDateClick={(day) => { setCurrentDate(day); updateSettings({...settings, viewMode: 'DAY'}); }}
                    />
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
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDayColumnDrop}
                    onResizeStart={handleResizeStart}
                />
            )}

            <button onClick={() => handleSlotClick(Date.now())} className="absolute bottom-20 right-4 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center z-40 hover:scale-105 transition-transform"><Plus size={24} /></button>
            <CalendarSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdate={updateSettings} />
            <QuickAddModal isOpen={!!quickAddSlot} onClose={() => setQuickAddSlot(null)} slotTime={quickAddSlot} availableTags={tags} onSave={handleQuickAddSave} />
            <AIScheduleModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} tasksToSchedule={unscheduledTasks} onConfirm={applyAISchedule} settings={settings} existingTasks={tasks} targetDate={currentDate} />
            <RecurrenceConfirmationModal isOpen={!!pendingRecurrenceAction} onClose={() => setPendingRecurrenceAction(null)} onConfirm={handleRecurrenceConfirm} />
        </div>
    );
};
