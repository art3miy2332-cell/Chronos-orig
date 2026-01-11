
import React, { useState, useEffect } from 'react';
import { Priority, EnergyLevel, TagEntity, NotificationSettings, RecurrenceRule, RecurrenceFrequency, GoalEntity } from '../types';
import { useTaskEditViewModel } from '../hooks/viewmodels';
import { ArrowLeft, Battery, Calendar, Save, AlertCircle, Tag, Plus, X, Settings2, Trash2, Edit2, Check, Bell, Volume2, Repeat, Clock, ArrowRight, Target } from 'lucide-react';

interface TaskFormProps {
    userId: string;
    taskId?: string; 
    initialTitle?: string;
    initialPlannedAt?: number;
    onNavigateBack: () => void;
    labels: any;
}

const TAG_COLORS = [
    '#6366f1', 
    '#ef4444', 
    '#f97316', 
    '#eab308', 
    '#22c55e', 
    '#06b6d4', 
    '#3b82f6', 
    '#a855f7', 
    '#ec4899', 
    '#64748b', 
];

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
        if (type === 'DAILY') { setFreq('DAILY'); setInterval(1); }
        else if (type === 'WEEKLY') { setFreq('WEEKLY'); setInterval(1); setDaysOfWeek([]); }
        else if (type === 'WEEKDAYS') { setFreq('WEEKLY'); setInterval(1); setDaysOfWeek([1, 2, 3, 4, 5]); }
        else if (type === 'MONTHLY') { setFreq('MONTHLY'); setInterval(1); }
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
                                <option value="DAILY">дн.</option><option value="WEEKLY">нед.</option><option value="MONTHLY">мес.</option>
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

export const TaskForm: React.FC<TaskFormProps> = ({ userId, taskId, initialTitle, initialPlannedAt, onNavigateBack, labels }) => {
    const { task, setTask, availableTags, availableGoals, createNewTag, updateTag, deleteTag, deleteTask, loading, saving, error, saveTask } = useTaskEditViewModel(userId, taskId, initialTitle, initialPlannedAt);
    const [newTagInput, setNewTagInput] = useState('');
    const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
    const [isTagInputOpen, setIsTagInputOpen] = useState(false);
    const [isManagerOpen, setIsManagerOpen] = useState(false);
    const [isRecurOpen, setIsRecurOpen] = useState(false);

    const [scheduleDate, setScheduleDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        if (task.plannedAt) {
            const d = new Date(task.plannedAt);
            setScheduleDate(d.toISOString().split('T')[0]);
            setStartTime(d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
            const duration = task.durationMinutes || task.estimateMinutes || 60;
            const end = new Date(task.plannedAt + duration * 60000);
            setEndTime(end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}));
        }
    }, [task.plannedAt, task.durationMinutes, taskId]);

    const handleScheduleUpdate = (type: 'date' | 'start' | 'end', value: string) => {
        let newDate = type === 'date' ? value : scheduleDate;
        let newStart = type === 'start' ? value : startTime;
        let newEnd = type === 'end' ? value : endTime;

        if (type === 'date') setScheduleDate(value);
        if (type === 'start') setStartTime(value);
        if (type === 'end') setEndTime(value);

        if (newDate) {
            if (!newStart) { newStart = '09:00'; setStartTime('09:00'); }
            if (!newEnd) { newEnd = '10:00'; setEndTime('10:00'); }
            const [h, m] = newStart.split(':').map(Number);
            const plannedAt = new Date(newDate);
            plannedAt.setHours(h, m, 0, 0);
            let duration = 60;
            if (newEnd) {
                const [eh, em] = newEnd.split(':').map(Number);
                const endTs = new Date(newDate);
                endTs.setHours(eh, em, 0, 0);
                if (endTs.getTime() < plannedAt.getTime()) endTs.setDate(endTs.getDate() + 1);
                duration = Math.round((endTs.getTime() - plannedAt.getTime()) / 60000);
            }
            setTask({ ...task, plannedAt: plannedAt.getTime(), durationMinutes: duration, estimateMinutes: duration, deadline: plannedAt.getTime() + duration * 60000 });
        } else {
            setTask({ ...task, plannedAt: undefined, durationMinutes: undefined, deadline: undefined });
            setStartTime(''); setEndTime('');
        }
    };

    const handleSave = async () => {
        const success = await saveTask();
        if (success) onNavigateBack();
    };

    const handleDelete = async () => {
        if (window.confirm(labels.deleteConfirm)) {
            const success = await deleteTask();
            if (success) onNavigateBack();
        }
    };

    const toggleTag = (tagName: string) => {
        const currentTags = task.tags || [];
        setTask({ ...task, tags: currentTags.includes(tagName) ? currentTags.filter(t => t !== tagName) : [...currentTags, tagName] });
    };

    const handleAddTag = async () => {
        if (!newTagInput.trim()) return;
        await createNewTag(newTagInput, newTagColor);
        setNewTagInput(''); setNewTagColor(TAG_COLORS[0]); setIsTagInputOpen(false);
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

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><ArrowLeft size={24} /></button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">{taskId ? labels.editTask : labels.newTask}</h1>
                <div className="flex gap-2">
                    {taskId && <button onClick={handleDelete} className="text-rose-500 hover:text-rose-600 p-2"><Trash2 size={20} /></button>}
                    <button onClick={handleSave} disabled={saving} className="text-indigo-600 font-semibold disabled:opacity-50">{saving ? '...' : labels.save}</button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {error && <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
                <div className="space-y-2"><input autoFocus value={task.title || ''} onChange={(e) => setTask({ ...task, title: e.target.value })} placeholder={labels.taskTitle} className="w-full text-2xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-800 pb-2 outline-none focus:border-indigo-500 placeholder:text-slate-300 dark:text-white transition-colors" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><Target size={14} /> Цель</label><select value={task.goalId || ''} onChange={(e) => setTask({ ...task, goalId: e.target.value || null })} className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium dark:text-white outline-none focus:border-indigo-500"><option value="">Без цели</option>{availableGoals.map(g => (<option key={g.id} value={g.id}>{g.title}</option>))}</select></div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm"><div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase tracking-wider mb-2"><Calendar size={16} /> Дата и Время</div><div className="grid grid-cols-1 gap-4"><div className="relative"><label className="text-[10px] font-bold text-slate-400 uppercase absolute -top-2 left-2 bg-white dark:bg-slate-800 px-1">Дата</label><input type="date" value={scheduleDate} onChange={(e) => handleScheduleUpdate('date', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div><div className="flex gap-3"><div className="flex-1 relative"><label className="text-[10px] font-bold text-slate-400 uppercase absolute -top-2 left-2 bg-white dark:bg-slate-800 px-1">Начало</label><input type="time" value={startTime} onChange={(e) => handleScheduleUpdate('start', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div><div className="flex-1 relative"><label className="text-[10px] font-bold text-slate-400 uppercase absolute -top-2 left-2 bg-white dark:bg-slate-800 px-1">Конец</label><input type="time" value={endTime} onChange={(e) => handleScheduleUpdate('end', e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-base dark:text-white outline-none focus:border-indigo-500 transition-colors" /></div></div></div><div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center"><div className="text-xs text-slate-500">Длительность: <span className="font-bold text-slate-900 dark:text-white">{task.durationMinutes || 0} мин</span></div>{scheduleDate && startTime && (<div className="text-xs text-emerald-500 font-bold flex items-center gap-1"><Check size={12} /> Запланировано</div>)}</div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.priority}</label><div className="flex flex-col gap-2">{(Object.keys(Priority) as Array<keyof typeof Priority>).map((p) => (<button key={p} onClick={() => setTask({ ...task, priority: Priority[p] })} className={`px-3 py-2 rounded-lg text-sm font-medium border text-left transition-all ${task.priority === Priority[p] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>{p}</button>))}</div></div><div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.energy}</label><div className="flex flex-col gap-2">{(Object.keys(EnergyLevel) as Array<keyof typeof EnergyLevel>).map((e) => (<button key={e} onClick={() => setTask({ ...task, energyLevel: EnergyLevel[e] })} className={`px-3 py-2 rounded-lg text-sm font-medium border text-left flex items-center gap-2 transition-all ${task.energyLevel === EnergyLevel[e] ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}><Battery size={14} className={task.energyLevel === EnergyLevel[e] ? 'fill-current' : ''} />{e}</button>))}</div></div></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Повтор</label><button onClick={() => setIsRecurOpen(true)} className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between gap-2 font-medium transition-colors ${task.recurrence ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'}`}><div className="flex items-center gap-2"><Repeat size={18} /><span>{formatRecurrence(task.recurrence)}</span></div><Settings2 size={16} /></button></div>
                <div className="space-y-2"><div className="flex items-center justify-between"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">{labels.tags}</label><button onClick={() => setIsTagInputOpen(!isTagInputOpen)} className="text-indigo-600 hover:text-indigo-700"><Plus size={16} /></button></div>{isTagInputOpen && (<div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-1"><div className="flex gap-2 mb-3"><input value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} placeholder="New tag name..." className="flex-1 px-3 py-2 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white" onKeyDown={(e) => e.key === 'Enter' && handleAddTag()} /><button onClick={handleAddTag} className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-bold">Add</button></div><div className="flex flex-wrap gap-2">{TAG_COLORS.map(color => (<button key={color} onClick={() => setNewTagColor(color)} className={`w-6 h-6 rounded-full transition-all ${newTagColor === color ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'}`} style={{ backgroundColor: color }} />))}</div></div>)}<div className="flex flex-wrap gap-2">{task.tags?.map(tagName => { const tagEntity = availableTags.find(t => t.name === tagName); const color = tagEntity?.colorHex || TAG_COLORS[0]; return (<span key={tagName} className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 text-white shadow-sm" style={{ backgroundColor: color }}>{tagName}<button onClick={() => toggleTag(tagName)} className="hover:text-slate-200"><X size={12} /></button></span>); })}{availableTags.filter(t => !task.tags?.includes(t.name)).map(tag => (<button key={tag.id} onClick={() => toggleTag(tag.name)} className="px-3 py-1 border text-slate-500 rounded-full text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1" style={{ borderColor: tag.colorHex || '#cbd5e1' }}><div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.colorHex }} />{tag.name}</button>))}</div></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{labels.taskDesc}</label><textarea value={task.description || ''} onChange={(e) => setTask({ ...task, description: e.target.value })} className="w-full h-32 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none dark:text-white resize-none" placeholder="Add details..." /></div>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 pb-safe"><button onClick={handleSave} disabled={saving} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"><Save size={20} />{labels.saveTaskBtn}</button></div>
            {isRecurOpen && <RecurrenceEditor rule={task.recurrence} onSave={(r) => setTask({...task, recurrence: r})} onClose={() => setIsRecurOpen(false)} />}
        </div>
    );
};
