import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, Minus, Navigation, Type, Undo, Redo, Trash2, Target, MousePointer2, AlertCircle, RefreshCw, X, Zap, ChevronRight, LayoutList, User, Calendar, ExternalLink, Save, Battery, Link2, Ban, ArrowRight, Layers, Lightbulb, HelpCircle, AlertTriangle, Book, Brain, FlaskConical, CheckSquare, GripHorizontal, ShieldAlert, Tag as TagIcon, Trophy, TrendingUp, Activity, Flame, Grid, Image as ImageIcon, Camera } from 'lucide-react';
import { DatabaseService } from '../../utils/db';
import { MapNodeEntity, MapNodeType, MapEdgeEntity, SyncMeta, MapEdgeType, CurrentSelfData, FutureSelfData, GraphAnalysisResult, AnalysisRuleId, MapNodeHealth, GoalEntity, TaskEntity, HabitEntity, Priority, PlanType, SpherePlanData, SphereTracker, MapActionType } from '../../types';
import { MapAnalysisService } from '../../utils/map-analysis';
import { UseCases } from '../../domain/usecases';
import { MapHistoryManager } from '../../utils/map-history';
import { GoalRepository, TaskRepository, HabitRepository } from '../../data/repositories';

interface Props {
    userId: string;
    onNavigate: (view: any) => void;
    focusGoalId?: string;
}

// --- CONSTANTS & HELPERS ---
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3.0;
const FUTURE_TAG_PRESETS = ["Здоровье", "Спорт", "Карьера", "Финансы", "Разум", "Семья"];
const CLICK_THRESHOLD = 5; 

const uuid = () => crypto.randomUUID();

const createMeta = (): SyncMeta => ({
    isDeleted: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    version: 1,
    tempId: uuid()
});

const screenToWorld = (x: number, y: number, viewport: { x: number, y: number, zoom: number }) => {
    return {
        x: (x - viewport.x) / viewport.zoom,
        y: (y - viewport.y) / viewport.zoom
    };
};

// Функция сжатия изображений для экономии места в LocalStorage
const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7)); // Сжимаем до 70% качества JPEG
        };
    });
};

const getPriorityColor = (p: Priority) => {
    switch(p) {
        case Priority.HIGH: return 'text-rose-500';
        case Priority.MEDIUM: return 'text-amber-500';
        case Priority.LOW: return 'text-emerald-500';
    }
};

const getMotivationStatus = (progress: number) => {
    if (progress === 0) return "Начните свой путь";
    if (progress < 20) return "Первые шаги сделаны";
    if (progress < 50) return "Вы в процессе трансформации";
    if (progress < 80) return "Отличный темп, цель близко";
    if (progress < 100) return "Почти у цели!";
    return "Цель достигнута!";
};

// --- COMPONENTS ---

const Edge: React.FC<{ 
    edge: MapEdgeEntity | { source: {x:number, y:number}, target: {x:number, y:number} }; 
    sourceNode?: MapNodeEntity; 
    targetNode?: MapNodeEntity; 
    isDraft?: boolean; 
    isHighlighted?: boolean; 
    onClick?: (e: React.MouseEvent) => void; 
    onDelete?: () => void; 
    onReconnectStart?: (e: React.PointerEvent) => void; 
}> = ({ edge, sourceNode, targetNode, isDraft, isHighlighted, onClick, onDelete, onReconnectStart }) => {
    const timerRef = useRef<any>(null);
    let startX = 0, startY = 0, endX = 0, endY = 0;
    let type = MapEdgeType.CAUSES;

    if (isDraft) {
        const e = edge as { source: {x:number, y:number}, target: {x:number, y:number} };
        if (e.source && e.target) {
            startX = e.source.x;
            startY = e.source.y;
            endX = e.target.x;
            endY = e.target.y;
        }
    } else {
        if (!sourceNode || !targetNode || !sourceNode.position || !targetNode.position) return null;
        
        // --- FIX: Correct center calculation for tall Image nodes ---
        const isSourceImage = sourceNode.type === MapNodeType.IMAGE;
        const isTargetImage = targetNode.type === MapNodeType.IMAGE;
        const sourceYOffset = isSourceImage ? 60 : 30; // 60px vertical center for images (~120px height)
        const targetYOffset = isTargetImage ? 60 : 30;

        startX = sourceNode.position.x + 75; 
        startY = sourceNode.position.y + sourceYOffset; 
        endX = targetNode.position.x + 75;
        endY = targetNode.position.y + targetYOffset;
        type = (edge as MapEdgeEntity).relationType;
    }

    let strokeColor = isHighlighted ? "#6366f1" : "#94a3b8";
    let strokeDash = "none";
    let strokeWidth = isHighlighted ? 4 : 2;

    if (!isDraft && !isHighlighted) {
        switch (type) {
            case MapEdgeType.BLOCKS: strokeColor = "#f43f5e"; break;
            case MapEdgeType.REQUIRES: strokeColor = "#f59e0b"; strokeDash = "5,5"; break;
            case MapEdgeType.LEADS_TO: strokeColor = "#10b981"; break;
            case MapEdgeType.CAUSES: default: strokeColor = "#94a3b8"; break;
        }
    }
    
    if (isDraft) {
        strokeColor = "#6366f1";
        strokeDash = "5,5";
        strokeWidth = 3;
    }

    const dist = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
    const controlOffset = Math.min(dist * 0.5, 150);
    const path = `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    const handlePointerDown = (e: React.PointerEvent) => {
        if (isDraft) return;
        if (e.button === 2 && onReconnectStart) { onReconnectStart(e); return; }
        if (e.button === 0) {
            if (onClick) onClick(e);
            if (e.pointerType === 'touch' && onReconnectStart) {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(() => {
                    onReconnectStart(e);
                    if (navigator.vibrate) navigator.vibrate(50);
                }, 600);
            }
        }
    };

    const cancelTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const markerSuffix = isHighlighted ? '-highlight' : '';

    return (
        <g 
            onPointerDown={handlePointerDown}
            onPointerUp={cancelTimer}
            onPointerLeave={cancelTimer}
            onPointerCancel={cancelTimer}
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className={!isDraft ? "cursor-pointer group pointer-events-auto" : "pointer-events-none"}
        >
            <path d={path} stroke="transparent" strokeWidth={20} fill="none" />
            <path 
                d={path} 
                stroke={strokeColor} 
                strokeWidth={strokeWidth} 
                fill="none" 
                strokeDasharray={strokeDash}
                className={`transition-all duration-300 ${isHighlighted ? 'opacity-100' : isDraft ? 'opacity-80' : 'opacity-60 group-hover:opacity-100'}`}
                markerEnd={!isDraft ? `url(#arrowhead-${type}${markerSuffix})` : undefined}
            />
            {!isDraft && (
                <g transform={`translate(${midX}, ${midY})`}>
                    {isHighlighted ? (
                        <g onPointerDown={(e) => { e.stopPropagation(); if(e.button === 0) onDelete && onDelete(); }} className="hover:scale-110 transition-transform cursor-pointer">
                            <circle cx="0" cy="0" r="12" fill="#f43f5e" stroke="white" strokeWidth="2" className="shadow-sm" />
                            <path d="M-4 -4 L4 4 M-4 4 L4 -4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                        </g>
                    ) : (
                        (type === MapEdgeType.BLOCKS || type === MapEdgeType.REQUIRES || type === MapEdgeType.LEADS_TO) && (
                            <g>
                                <circle cx="0" cy="0" r="8" fill="white" stroke={strokeColor} strokeWidth="1" />
                                {type === MapEdgeType.BLOCKS && <path d="M-3 -3 L3 3 M-3 3 L3 -3" stroke={strokeColor} strokeWidth="2" />}
                                {type === MapEdgeType.REQUIRES && <circle cx="0" cy="0" r="2" fill={strokeColor} />}
                                {type === MapEdgeType.LEADS_TO && <path d="M-2 0 L2 0 M0 -2 L2 0 L0 2" stroke={strokeColor} strokeWidth="2" />}
                            </g>
                        )
                    )}
                </g>
            )}
            {!isDraft && <circle cx={endX} cy={endY} r={isHighlighted ? 6 : 4} fill={strokeColor} />}
            {isDraft && <circle cx={endX} cy={endY} r={4} fill={strokeColor} className="animate-pulse" />}
        </g>
    );
};

// ... (Rest of components: EdgeCreationPanel, PanelBackdrop, CoachPanel, NodeInspector, LibraryPanel - unchanged) ...
// For brevity in chat, assuming these components are the same as in your provided code.
// I will include them below to provide a FULL copy-paste solution.

const EdgeCreationPanel: React.FC<{ x: number; y: number; onSelect: (type: MapEdgeType) => void; onCancel: () => void; }> = ({ x, y, onSelect, onCancel }) => {
    return (
        <div className="fixed z-[100] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 flex flex-col gap-1 w-40 animate-in zoom-in-95 duration-200" style={{ left: Math.min(x, window.innerWidth - 170), top: Math.min(y, window.innerHeight - 200) }}>
            <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">Тип связи</div>
            <button onClick={() => onSelect(MapEdgeType.CAUSES)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium text-left"><ArrowRight size={14} className="text-slate-500" /> Ведёт к</button>
            <button onClick={() => onSelect(MapEdgeType.REQUIRES)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-medium text-left"><Link2 size={14} /> Требует</button>
            <button onClick={() => onSelect(MapEdgeType.BLOCKS)} className="flex items-center gap-2 p-2 rounded-lg hover:bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 text-xs font-medium text-left"><Ban size={14} /> Блокирует</button>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
            <button onClick={onCancel} className="text-center text-xs text-slate-400 hover:text-slate-600 py-1">Отмена</button>
        </div>
    );
};

const PanelBackdrop: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 md:hidden animate-in fade-in duration-300" onClick={onClose} />
);

const CoachPanel: React.FC<{ result: GraphAnalysisResult | null, onClose: () => void, onSelect: (id?: string) => void }> = ({ result, onClose, onSelect }) => {
    if (!result) return null;
    return (
        <>
            <PanelBackdrop onClose={onClose} />
            <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-24 md:right-4 md:bottom-auto md:left-auto z-50 w-full md:w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-2xl md:rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-300">
                <div className="md:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3" />
                <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2"><AlertCircle size={18} /><span className="font-bold text-sm">Анализ Карты</span></div>
                    <div className="flex items-center gap-2"><span className="text-xs font-mono bg-white/20 px-2 py-0.5 rounded">{result.score}/100</span><button onClick={onClose} className="hover:text-slate-200"><X size={16} /></button></div>
                </div>
                <div className="p-3 max-h-[50vh] md:max-h-[60vh] overflow-y-auto space-y-3 pb-8 md:pb-3 no-scrollbar">
                    {result.issues.length === 0 ? <div className="text-center py-4 text-emerald-500 font-medium text-sm">Система выглядит стабильной.</div> : result.issues.map((issue, idx) => (
                        <div key={idx} onClick={() => issue.targetNodeId && onSelect(issue.targetNodeId)} className={`p-3 rounded-lg border text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${issue.severity === 'CRITICAL' ? 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-900/30' : issue.severity === 'WARNING' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-start gap-2"><div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${issue.severity === 'CRITICAL' ? 'bg-rose-500' : issue.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'}`} /><div><div className="font-bold text-slate-800 dark:text-slate-200 mb-1">{issue.message}</div><div className="text-slate-500 dark:text-slate-400 leading-snug">{issue.recommendation}</div></div></div>
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

const NodeInspector: React.FC<{ 
    node: MapNodeEntity; 
    onUpdate: (updates: Partial<MapNodeEntity>) => void; 
    onDelete: () => void; 
    onNavigate: (view: any) => void; 
    onClose: () => void;
}> = ({ node, onUpdate, onDelete, onNavigate, onClose }) => {
    const [label, setLabel] = useState(node.content.label);
    const [desc, setDesc] = useState(node.content.description || '');
    const [energy, setEnergy] = useState(node.content.currentSelfData?.metrics.averageEnergy || 50);
    const [horizonDate, setHorizonDate] = useState('');
    const [roleTitle, setRoleTitle] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [customTag, setCustomTag] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLabel(node.content.label);
        setDesc(node.content.description || '');
        if (node.type === MapNodeType.CURRENT_SELF && node.content.currentSelfData) {
            setEnergy(node.content.currentSelfData.metrics.averageEnergy);
        }
        if (node.type === MapNodeType.FUTURE_SELF && node.content.futureSelfData) { 
            const date = node.content.futureSelfData.horizon?.targetDate;
            setHorizonDate(date && date > 0 ? new Date(date).toISOString().split('T')[0] : '');
            setRoleTitle(node.content.futureSelfData.identity?.roleTitle || ''); 
            setTags(node.content.futureSelfData.identity?.tags || []);
        } else {
            setHorizonDate(''); setRoleTitle(''); setTags([]);
        }
    }, [node.id, node.content]);

    const handleSave = () => {
        try {
            const updates: any = { content: { ...node.content, label, description: desc } };
            if (node.type === MapNodeType.CURRENT_SELF) {
                updates.content.currentSelfData = { 
                    ...(node.content.currentSelfData || { metrics: { averageEnergy: 50, completionRate: 0, focusCapacityMin: 0 }, constraints: { availableHoursDaily: 0 }, audit: { weaknesses: [], blockers: [], lastCheck: 0 } }),
                    metrics: { ...(node.content.currentSelfData?.metrics || { completionRate: 0, focusCapacityMin: 0 }), averageEnergy: energy } 
                };
            }
            if (node.type === MapNodeType.FUTURE_SELF) {
                updates.content.futureSelfData = { 
                    ...node.content.futureSelfData, 
                    horizon: { ...(node.content.futureSelfData?.horizon || { label: 'Target' }), targetDate: horizonDate ? new Date(horizonDate).getTime() : 0 }, 
                    identity: { ...(node.content.futureSelfData?.identity || { roleTitle: '' }), roleTitle: roleTitle, tags: tags },
                    requirements: node.content.futureSelfData?.requirements || { skills: [], traits: [] }
                };
            }
            onUpdate(updates);
        } catch (e) {
            console.error("Critical error in NodeInspector save:", e);
        } finally {
            onClose(); // Guaranteed close
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const rawBase64 = event.target?.result as string;
            const compressed = await compressImage(rawBase64);
            onUpdate({ content: { ...node.content, imageUrl: compressed } });
        };
        reader.readAsDataURL(file);
    };

    const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    const addCustomTag = () => { if (customTag.trim() && !tags.includes(customTag.trim())) { setTags([...tags, customTag.trim()]); setCustomTag(''); } };

    const isAnchor = node.type === MapNodeType.CURRENT_SELF || node.type === MapNodeType.FUTURE_SELF;
    const isImage = node.type === MapNodeType.IMAGE;

    return (
        <>
            <PanelBackdrop onClose={onClose} />
            <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-24 md:right-4 md:bottom-auto md:left-auto z-50 w-full md:w-80 bg-white dark:bg-slate-900 md:bg-white/95 md:dark:bg-slate-900/95 backdrop-blur-md rounded-t-3xl md:rounded-xl shadow-2xl border-t md:border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-right-4 duration-300 flex flex-col max-h-[85vh] md:max-h-[75vh]">
                <div className="md:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3" />
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        {node.type === MapNodeType.GOAL ? <Target size={18} className="text-indigo-500" /> : 
                        node.type === MapNodeType.CURRENT_SELF ? <User size={18} className="text-indigo-500" /> : 
                        node.type === MapNodeType.FUTURE_SELF ? <Zap size={18} className="text-emerald-500" /> : 
                        node.type === MapNodeType.LIMITATION ? <ShieldAlert size={18} className="text-rose-500" /> : 
                        node.type === MapNodeType.STEP ? <CheckSquare size={18} className="text-blue-500" /> : 
                        node.type === MapNodeType.HABIT ? <Activity size={18} className="text-orange-500" /> : 
                        node.type === MapNodeType.QUANTITATIVE_PLAN ? <Grid size={18} className="text-emerald-500" /> :
                        node.type === MapNodeType.IMAGE ? <ImageIcon size={18} className="text-purple-500" /> :
                        <Brain size={18} className="text-slate-500" />}
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-200 uppercase">{node.type === MapNodeType.IMAGE ? "Образ" : node.type === MapNodeType.LIMITATION ? "Барьер" : node.type === MapNodeType.NOTE ? "Заметка" : node.type.replace('_', ' ')}</span>
                    </div>
                    <button onClick={onClose}><X size={20} className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto flex-1 no-scrollbar pb-10 md:pb-4">
                    {isImage && (
                        <div className="space-y-4">
                            <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                {node.content.imageUrl ? (
                                    <img src={node.content.imageUrl} className="w-full h-full object-cover" alt="Vision" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                        <Camera size={32} />
                                        <span className="text-xs font-bold uppercase">Загрузить фото</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                                    ИЗМЕНИТЬ
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>
                        </div>
                    )}
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Название</label>
                            <input value={label} onChange={e => setLabel(e.target.value)} className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base dark:text-white outline-none focus:border-indigo-500 transition-colors" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">{node.type === MapNodeType.LIMITATION ? "Как это мешает достижению цели?" : "Описание / Мысли"}</label>
                            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={node.type === MapNodeType.LIMITATION ? "Опишите почему это является препятствием..." : "Добавьте детали..."} className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-base dark:text-white outline-none focus:border-indigo-500 transition-colors resize-none h-24" />
                        </div>
                    </div>
                    {node.type === MapNodeType.CURRENT_SELF && <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-2"><label className="text-xs font-bold text-indigo-500 uppercase flex items-center gap-1"><Battery size={14} /> Уровень Энергии</label><input type="range" min="0" max="100" value={energy} onChange={e => setEnergy(parseInt(e.target.value))} className="w-full accent-indigo-500 h-6" /><div className="text-right text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{energy}%</div></div>}
                    {node.type === MapNodeType.FUTURE_SELF && (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-4">
                            <div><label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mb-1"><Calendar size={14} /> Дата достижения</label><input type="date" value={horizonDate} onChange={e => setHorizonDate(e.target.value)} className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-base dark:text-white outline-none" /></div>
                            <div><label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mb-1"><User size={14} /> Роль / Идентичность</label><input value={roleTitle} onChange={e => setRoleTitle(e.target.value)} placeholder="Напр. Лидер индустрии" className="w-full p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-base dark:text-white outline-none" /></div>
                            <div>
                                <label className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1 mb-2"><TagIcon size={14} /> Сферы (Теги)</label>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {FUTURE_TAG_PRESETS.map(t => (
                                        <button key={t} onClick={() => toggleTag(t)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${tags.includes(t) ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm' : 'bg-white dark:bg-slate-800 text-emerald-600 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400'}`}>{t}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input value={customTag} onChange={e => setCustomTag(e.target.value)} placeholder="+ Свой тег" className="flex-1 text-xs p-2 bg-white dark:bg-slate-900 rounded-lg border border-emerald-200 dark:border-emerald-800 dark:text-white outline-none" onKeyDown={e => e.key === 'Enter' && addCustomTag()} />
                                    <button onClick={addCustomTag} className="p-2 bg-emerald-500 text-white rounded-lg"><Plus size={18}/></button>
                                </div>
                            </div>
                        </div>
                    )}
                    {node.type === MapNodeType.GOAL && node.references?.goalId && <button onClick={() => onNavigate({ type: 'GOAL_DETAIL', goalId: node.references.goalId })} className="w-full py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"><ExternalLink size={16} /> Открыть Цель</button>}
                    {node.type === MapNodeType.HABIT && node.references?.habitId && <button onClick={() => onNavigate({ type: 'HABIT_DETAIL', habitId: node.references.habitId })} className="w-full py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"><ExternalLink size={16} /> Детали Привычки</button>}
                    {node.type === MapNodeType.QUANTITATIVE_PLAN && <button onClick={() => onNavigate('CHECKLISTS')} className="w-full py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"><ExternalLink size={16} /> Управление Планами</button>}
                </div>
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex gap-3 bg-white dark:bg-slate-900 pb-safe md:pb-4">
                    <button onClick={handleSave} className="flex-1 py-4 md:py-2.5 bg-indigo-600 text-white rounded-xl text-base md:text-sm font-bold shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2"><Save size={18} /> Сохранить</button>
                    {!isAnchor && <button onClick={() => { onDelete(); onClose(); }} className="p-4 md:p-2.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"><Trash2 size={20} /></button>}
                </div>
            </div>
        </>
    );
};

const LibraryPanel: React.FC<{ 
    goals: GoalEntity[], 
    tasks: TaskEntity[], 
    habits: HabitEntity[], 
    trackers: SphereTracker[], 
    onPickGoal: (goal: GoalEntity) => void, 
    onPickTask: (task: TaskEntity) => void, 
    onPickHabit: (habit: HabitEntity) => void, 
    onPickTracker: (tracker: SphereTracker) => void, 
    onClose: () => void 
}> = ({ goals, tasks, habits, trackers, onPickGoal, onPickTask, onPickHabit, onPickTracker, onClose }) => {
    const [activeTab, setActiveTab] = useState<'GOALS' | 'TASKS' | 'HABITS' | 'SPHERES'>('GOALS');
    return (
        <>
            <PanelBackdrop onClose={onClose} />
            <div className="fixed bottom-0 left-0 right-0 md:absolute md:top-24 md:left-4 md:bottom-auto md:right-auto z-50 w-full md:w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-t-3xl md:rounded-xl shadow-2xl border-t md:border border-slate-200 dark:border-slate-700 overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-left-4 duration-300 flex flex-col max-h-[70vh] md:max-h-[60vh]">
                <div className="md:hidden w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-3" />
                <div className="p-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-500 uppercase tracking-wider flex items-center gap-2 px-1"><Layers size={14} /> Библиотека</span>
                    <button onClick={onClose} className="p-1"><X size={18} className="text-slate-400" /></button>
                </div>
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('GOALS')} className={`flex-1 py-3 text-[9px] font-bold whitespace-nowrap px-4 transition-colors ${activeTab === 'GOALS' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Цели ({goals.length})</button>
                    <button onClick={() => setActiveTab('TASKS')} className={`flex-1 py-3 text-[9px] font-bold whitespace-nowrap px-4 transition-colors ${activeTab === 'TASKS' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Задачи ({tasks.length})</button>
                    <button onClick={() => setActiveTab('HABITS')} className={`flex-1 py-3 text-[9px] font-bold whitespace-nowrap px-4 transition-colors ${activeTab === 'HABITS' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Привычки ({habits.length})</button>
                    <button onClick={() => setActiveTab('SPHERES')} className={`flex-1 py-3 text-[9px] font-bold whitespace-nowrap px-4 transition-colors ${activeTab === 'SPHERES' ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Планы ({trackers.length})</button>
                </div>
                <div className="overflow-y-auto flex-1 p-2 pb-10 md:pb-2 no-scrollbar">
                    {activeTab === 'GOALS' && ( <div className="space-y-1">{goals.length === 0 ? <div className="p-6 text-center text-xs text-slate-400 italic">Все цели уже на карте.</div> : goals.map(goal => (<div key={goal.id} onClick={() => { onPickGoal(goal); onClose(); }} className="p-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors rounded-xl flex items-center gap-3"><Target size={18} className="text-indigo-500 shrink-0" /><div className="min-w-0"><div className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{goal.title}</div><div className="text-[10px] text-slate-400 mt-0.5">{goal.progress}% завершено</div></div></div>))}</div>)}
                    {activeTab === 'TASKS' && ( <div className="space-y-1">{tasks.length === 0 ? <div className="p-6 text-center text-xs text-slate-400 italic">Нет свободных активных задач.</div> : tasks.map(task => (<div key={task.id} onClick={() => { onPickTask(task); onClose(); }} className="p-3 border-b border-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors rounded-xl flex items-center gap-3"><CheckSquare size={18} className="text-blue-500 shrink-0" /><div className="min-w-0"><div className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{task.title}</div><div className={`text-[10px] uppercase font-bold mt-0.5 ${getPriorityColor(task.priority)}`}>{task.priority}</div></div></div>))}</div>)}
                    {activeTab === 'HABITS' && ( <div className="space-y-1">{habits.length === 0 ? <div className="p-6 text-center text-xs text-slate-400 italic">Все привычки на карте.</div> : habits.map(habit => (<div key={habit.id} onClick={() => { onPickHabit(habit); onClose(); }} className="p-3 border-b border-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors rounded-xl flex items-center gap-3"><Activity size={18} className="text-orange-500 shrink-0" /><div className="min-w-0"><div className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{habit.title}</div><div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><Flame size={10} className="text-orange-500" /> {habit.streak} дней</div></div></div>))}</div>)}
                    {activeTab === 'SPHERES' && ( <div className="space-y-1">{trackers.length === 0 ? <div className="p-6 text-center text-xs text-slate-400 italic">Все планы по сферам уже на карте.</div> : trackers.map(t => (<div key={t.id} onClick={() => { onPickTracker(t); onClose(); }} className="p-3 border-b border-slate-50 dark:border-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer group transition-colors rounded-xl flex items-center gap-3"><Grid size={18} className="text-emerald-500 shrink-0" /><div className="min-w-0"><div className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">{t.title}</div><div className="text-[10px] text-slate-400 mt-0.5">Цель: {t.targetCount}</div></div></div>))}</div>)}
                </div>
            </div>
        </>
    );
};

export const LifeMapCanvas: React.FC<Props> = ({ userId, onNavigate, focusGoalId }) => {
    const [mapId, setMapId] = useState<string | null>(null);
    const [nodes, setNodes] = useState<MapNodeEntity[]>([]);
    const [edges, setEdges] = useState<MapEdgeEntity[]>([]);
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
    const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
    const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
    const [activeInspectorNodeId, setActiveInspectorNodeId] = useState<string | null>(null);
    const [interactionMode, setInteractionMode] = useState<'IDLE' | 'PANNING' | 'DRAGGING' | 'CONNECTING' | 'RECONNECTING'>('IDLE');
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const [nodeStartPositions, setNodeStartPositions] = useState<Record<string, {x: number, y: number}>>({});
    const [connectionDraft, setConnectionDraft] = useState<{ sourceId: string, currentPos: {x: number, y: number}, startPos: {x: number, y: number} } | null>(null);
    const [reconnectingEdgeId, setReconnectingEdgeId] = useState<string | null>(null);
    const [edgeDraftMenu, setEdgeDraftMenu] = useState<{ sourceId: string, targetId: string, x: number, y: number } | null>(null);
    const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const historyManagerRef = useRef<MapHistoryManager | null>(null);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<GraphAnalysisResult | null>(null);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [unmappedGoals, setUnmappedGoals] = useState<GoalEntity[]>([]);
    const [unmappedTasks, setUnmappedTasks] = useState<TaskEntity[]>([]);
    const [unmappedHabits, setUnmappedHabits] = useState<HabitEntity[]>([]);
    const [unmappedTrackers, setUnmappedTrackers] = useState<SphereTracker[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const lastFocusedIdRef = useRef<string | null>(null);
    const hiddenFileInputRef = useRef<HTMLInputElement>(null);

    const capturedElementRef = useRef<HTMLElement | null>(null);

    const nodesRef = useRef<MapNodeEntity[]>([]);
    const edgesRef = useRef<MapEdgeEntity[]>([]);
    const viewportRef = useRef(viewport);
    const selectedNodeIdsRef = useRef<Set<string>>(new Set());
    const mapIdRef = useRef<string | null>(null);
    const editingNodeIdRef = useRef<string | null>(null);
    const editTextRef = useRef('');
    
    // --- FIX: Add debounce ref for performance optimization ---
    const saveTimeoutRef = useRef<any>(null);

    // Persistence Helpers
    // --- FIX: Debounced viewport saving to prevent database spam/lag ---
    const saveViewportToDb = (v: typeof viewport) => {
        if (!mapId) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            DatabaseService.maps.update({ id: mapId, userId, viewport: v, updatedAt: Date.now() });
        }, 800);
    };

    const syncRefs = (n?: MapNodeEntity[], e?: MapEdgeEntity[], v?: typeof viewport) => {
        if (n) nodesRef.current = n;
        if (e) edgesRef.current = e;
        if (v) viewportRef.current = v;
    };

    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { edgesRef.current = edges; }, [edges]);
    useEffect(() => { viewportRef.current = viewport; }, [viewport]);
    useEffect(() => { selectedNodeIdsRef.current = selectedNodeIds; }, [selectedNodeIds]);
    useEffect(() => { mapIdRef.current = mapId; }, [mapId]);
    useEffect(() => { 
        editingNodeIdRef.current = editingNodeId;
        editTextRef.current = editText;
    }, [editingNodeId, editText]);

    // Emergency persistence on unmount
    useEffect(() => {
        return () => {
            if (editingNodeIdRef.current && mapIdRef.current) {
                const nodeId = editingNodeIdRef.current;
                const text = editTextRef.current;
                const dbNodes = DatabaseService.mapNodes.getByMapId(mapIdRef.current);
                const node = dbNodes.find(n => n.id === nodeId);
                if (node && node.content.label !== text) {
                    node.content.label = text;
                    DatabaseService.mapNodes.update(node);
                    console.log("[Map] Unmount persistence: Text saved");
                }
            }
        };
    }, []);

    const initialPinchDist = useRef<number | null>(null);
    const initialPinchViewport = useRef<any>(null);

    const futureSelfNode = nodes.find(n => n.type === MapNodeType.FUTURE_SELF);
    const globalProgress = futureSelfNode?.progressData?.value || 0;

    useEffect(() => {
        const maps = DatabaseService.maps.getAll().filter(m => m.userId === userId);
        let mid;
        if (maps.length === 0) {
            mid = uuid();
            DatabaseService.maps.insert({ id: mid, userId, viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: Date.now() });
            const rootNodes: MapNodeEntity[] = [
                { id: uuid(), mapId: mid, type: MapNodeType.CURRENT_SELF, position: { x: 100, y: 300 }, content: { label: "Я Сейчас" }, references: {}, meta: createMeta() },
                { id: uuid(), mapId: mid, type: MapNodeType.FUTURE_SELF, position: { x: 800, y: 300 }, content: { label: "Я 2.0" }, references: {}, meta: createMeta() }
            ];
            rootNodes.forEach(n => DatabaseService.mapNodes.insert(n));
        } else {
            mid = maps[0].id;
            const savedViewport = maps[0].viewport;
            setViewport(savedViewport);
            viewportRef.current = savedViewport;
        }
        setMapId(mid);
        historyManagerRef.current = new MapHistoryManager(mid);
        loadData(mid);
    }, [userId]);

    const mergeProgressData = useCallback((remoteNodes: MapNodeEntity[]) => {
        setNodes(currentNodes => {
            const next = currentNodes.map(localNode => {
                const remoteVersion = remoteNodes.find(r => r.id === localNode.id);
                if (remoteVersion) {
                    return {
                        ...localNode,
                        progressData: remoteVersion.progressData,
                        content: {
                            ...localNode.content,
                            currentSelfData: remoteVersion.content.currentSelfData || localNode.content.currentSelfData,
                            futureSelfData: remoteVersion.content.futureSelfData || localNode.content.futureSelfData
                        }
                    };
                }
                return localNode;
            });
            nodesRef.current = next;
            return next;
        });
    }, []);

    const loadData = async (mid: string) => {
        // 1. First, load existing data from DB
        const loadedNodes = DatabaseService.mapNodes.getByMapId(mid);
        const loadedEdges = DatabaseService.mapEdges.getByMapId(mid);
        
        // 2. Set state immediately so UI is responsive
        setNodes(loadedNodes);
        setEdges(loadedEdges);
        syncRefs(loadedNodes, loadedEdges);
        refreshUnmappedData(loadedNodes);

        if (historyManagerRef.current && !historyManagerRef.current.getCurrentSnapshot()) {
            historyManagerRef.current.push(loadedNodes, loadedEdges, 'INIT');
        }
        updateHistoryState();

        // 3. Background recalculation: calculate progress based on fresh data
        try {
            const res = await UseCases.recalculateMapProgress.execute(mid, userId);
            if (res.success) {
                mergeProgressData(res.data);
            }
        } catch (err) {
            console.error("[Map] Recalculation error", err);
        }
    };

    useEffect(() => {
        // Centering logic
        if (focusGoalId && nodes.length > 0 && mapId && lastFocusedIdRef.current !== focusGoalId) {
            const targetNode = nodes.find(n => n.references?.goalId === focusGoalId);
            if (targetNode) {
                lastFocusedIdRef.current = focusGoalId;
                if (containerRef.current) {
                    const w = containerRef.current.clientWidth;
                    const h = containerRef.current.clientHeight;
                    const newZoom = 1.0; 
                    const x = w / 2 - targetNode.position.x * newZoom - 75 * newZoom;
                    const y = h / 2 - targetNode.position.y * newZoom - 30 * newZoom;
                    const updatedViewport = { x, y, zoom: newZoom };
                    setViewport(updatedViewport);
                    viewportRef.current = updatedViewport;
                    saveViewportToDb(updatedViewport);
                }
                const connectedEdges = edges.filter(e => e.sourceNodeId === targetNode.id || e.targetNodeId === targetNode.id);
                const connectedNodeIds = connectedEdges.map(e => e.sourceNodeId === targetNode.id ? e.targetNodeId : e.sourceNodeId);
                setSelectedNodeIds(new Set([targetNode.id, ...connectedNodeIds]));
            }
        }
    }, [focusGoalId, nodes.length, mapId]);

    const updateHistoryState = () => {
        if (historyManagerRef.current) {
            setCanUndo(historyManagerRef.current.canUndo());
            setCanRedo(historyManagerRef.current.canRedo());
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (nodes.length > 0) {
                const res = MapAnalysisService.analyze(nodes, edges);
                setAnalysisResult(res);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [nodes, edges]);

    const pushToHistory = (newNodes: MapNodeEntity[], newEdges: MapEdgeEntity[], action: MapActionType, desc?: string) => {
        historyManagerRef.current?.push(newNodes, newEdges, action, desc);
        updateHistoryState();
    };

    const undo = () => {
        const snapshot = historyManagerRef.current?.undo();
        if (snapshot) { 
            setNodes(snapshot.nodes); 
            setEdges(snapshot.edges); 
            syncRefs(snapshot.nodes, snapshot.edges);
            forceSyncAllToDb(snapshot.nodes, snapshot.edges); 
            updateHistoryState(); 
        }
    };

    const redo = () => {
        const snapshot = historyManagerRef.current?.redo();
        if (snapshot) { 
            setNodes(snapshot.nodes); 
            setEdges(snapshot.edges); 
            syncRefs(snapshot.nodes, snapshot.edges);
            forceSyncAllToDb(snapshot.nodes, snapshot.edges); 
            updateHistoryState(); 
        }
    };

    const forceSyncAllToDb = (currentNodes: MapNodeEntity[], currentEdges: MapEdgeEntity[]) => {
        if (!mapId) return;
        const dbNodes = DatabaseService.mapNodes.getByMapId(mapId);
        const currentNodeIds = new Set(currentNodes.map(n => n.id));
        dbNodes.forEach(node => { if (!currentNodeIds.has(node.id)) { DatabaseService.mapNodes.delete(node.id); } });
        currentNodes.forEach(n => DatabaseService.mapNodes.update(n));
        const dbEdges = DatabaseService.mapEdges.getByMapId(mapId);
        const currentEdgeIds = new Set(currentEdges.map(e => e.id));
        dbEdges.forEach(edge => { if (!currentEdgeIds.has(edge.id)) { DatabaseService.mapEdges.delete(edge.id); } });
        currentEdges.forEach(e => DatabaseService.mapEdges.update(e));
        refreshUnmappedData(currentNodes);
    };

    const refreshUnmappedData = (currentNodes: MapNodeEntity[]) => {
        const allGoals = GoalRepository.getAll(userId);
        const mappedGoalIds = new Set(currentNodes.map(n => n.references?.goalId).filter(Boolean));
        setUnmappedGoals(allGoals.filter(g => !mappedGoalIds.has(g.id)));
        const allTasks = TaskRepository.getTasksForUser(userId).data;
        const mappedTaskIds = new Set(currentNodes.map(n => n.references?.taskId).filter(Boolean));
        setUnmappedTasks(allTasks.filter(t => !mappedTaskIds.has(t.id) && t.status !== 'DONE'));
        const allHabits = HabitRepository.getHabitsForUser(userId).data;
        const mappedHabitIds = new Set(currentNodes.map(n => n.references?.habitId).filter(Boolean));
        setUnmappedHabits(allHabits.filter(h => !mappedHabitIds.has(h.id)));
        const allTrackers: SphereTracker[] = [];
        const spherePlans = DatabaseService.plans.getAll().filter(p => p.userId === userId && p.type === PlanType.SPHERES);
        spherePlans.forEach(p => { if (p.structureJson) { try { const data: SpherePlanData = JSON.parse(p.structureJson); if (data.trackers) allTrackers.push(...data.trackers); } catch(e) {} } });
        const mappedTrackerIds = new Set(currentNodes.map(n => n.references?.sphereTrackerId).filter(Boolean));
        setUnmappedTrackers(allTrackers.filter(t => !mappedTrackerIds.has(t.id)));
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.001;
            const newZoom = Math.min(Math.max(ZOOM_MIN, viewport.zoom + delta), ZOOM_MAX);
            setViewport(prev => {
                const next = { ...prev, zoom: newZoom };
                viewportRef.current = next;
                saveViewportToDb(next);
                return next;
            });
        } else { 
            setViewport(prev => {
                const next = { ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY };
                viewportRef.current = next;
                return next;
            }); 
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            initialPinchDist.current = d;
            initialPinchViewport.current = { ...viewport };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && initialPinchDist.current !== null && initialPinchViewport.current !== null) {
            if (e.cancelable) e.preventDefault();
            const currentDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            const pinchRatio = currentDist / initialPinchDist.current;
            const newZoom = Math.min(Math.max(ZOOM_MIN, initialPinchViewport.current.zoom * pinchRatio), ZOOM_MAX);
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2, midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const screenPinchX = midX - rect.left, screenPinchY = midY - rect.top;
                const worldX = (screenPinchX - initialPinchViewport.current.x) / initialPinchViewport.current.zoom;
                const worldY = (screenPinchY - initialPinchViewport.current.y) / initialPinchViewport.current.zoom;
                const nextViewport = { zoom: newZoom, x: screenPinchX - worldX * newZoom, y: screenPinchY - worldY * newZoom };
                setViewport(nextViewport);
                viewportRef.current = nextViewport;
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => { 
        if (e.touches.length < 2) { 
            initialPinchDist.current = null; 
            initialPinchViewport.current = null; 
            saveViewportToDb(viewportRef.current);
        } 
    };

    const handleCanvasPointerDown = (e: React.PointerEvent) => {
        if (edgeDraftMenu) setEdgeDraftMenu(null);
        if (e.button !== 0) return; 
        const isBg = (e.target as HTMLElement).id === 'canvas-bg' || e.target === containerRef.current;
        if (!isBg) return;
        setSelectedNodeIds(new Set()); setSelectedEdgeId(null); setActiveInspectorNodeId(null); setInteractionMode('PANNING'); setDragStartPos({ x: e.clientX, y: e.clientY }); setEditingNodeId(null); 
        
        const target = containerRef.current;
        if (target) {
            target.setPointerCapture(e.pointerId);
            capturedElementRef.current = target;
        }
    };

    const handleNodePointerDown = (e: React.PointerEvent, nodeId: string) => {
        e.stopPropagation();
        if (interactionMode === 'CONNECTING' || interactionMode === 'RECONNECTING') return; 
        if (e.button === 0) {
            let nextSelection = new Set(selectedNodeIdsRef.current);
            if (e.shiftKey) { 
                if (nextSelection.has(nodeId)) nextSelection.delete(nodeId); 
                else nextSelection.add(nodeId); 
            }
            else { 
                if (!nextSelection.has(nodeId)) { 
                    nextSelection = new Set([nodeId]); 
                } 
            }
            setSelectedNodeIds(nextSelection);
            selectedNodeIdsRef.current = nextSelection;

            setSelectedEdgeId(null); 
            setInteractionMode('DRAGGING'); 
            setDragStartPos({ x: e.clientX, y: e.clientY });
            
            const startPos: Record<string, {x:number, y:number}> = {};
            nodes.forEach(n => { if (n.position) startPos[n.id] = { ...n.position }; });
            setNodeStartPositions(startPos);
            
            const target = e.currentTarget as HTMLElement;
            if (target) {
                target.setPointerCapture(e.pointerId);
                capturedElementRef.current = target;
            }
        }
    };

    const handleConnectPointerDown = (e: React.PointerEvent, nodeId: string, side: 'top'|'right'|'bottom'|'left') => {
        e.stopPropagation(); e.preventDefault(); setInteractionMode('CONNECTING');
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport);
            const node = nodes.find(n => n.id === nodeId);
            let startX = worldPos.x, startY = worldPos.y;
            if (node && node.position) {
               if (side === 'left') { startX = node.position.x; startY = node.position.y + 30; }
               else if (side === 'right') { startX = node.position.x + 150; startY = node.position.y + 30; }
               else if (side === 'top') { startX = node.position.x + 75; startY = node.position.y; }
               else if (side === 'bottom') { startX = node.position.x + 75; startY = node.position.y + 60; }
            }
            setConnectionDraft({ sourceId: nodeId, currentPos: { x: startX, y: startY }, startPos: { x: startX, y: startY } });
        }
        
        const target = containerRef.current;
        if (target) {
            target.setPointerCapture(e.pointerId);
            capturedElementRef.current = target;
        }
    };

    const handleEdgeReconnectStart = (e: React.PointerEvent, edgeId: string, sourceId: string) => {
        e.stopPropagation(); e.preventDefault(); setInteractionMode('RECONNECTING'); setReconnectingEdgeId(edgeId);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport);
            const sourceNode = nodes.find(n => n.id === sourceId);
            let startX = worldPos.x, startY = worldPos.y;
            if (sourceNode && sourceNode.position) { startX = sourceNode.position.x + 75; startY = sourceNode.position.y + 30; }
            setConnectionDraft({ sourceId: sourceId, currentPos: worldPos, startPos: { x: startX, y: startY } });
            
            const target = containerRef.current;
            if (target) {
                target.setPointerCapture(e.pointerId);
                capturedElementRef.current = target;
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (interactionMode === 'PANNING') {
            const dx = e.clientX - dragStartPos.x, dy = e.clientY - dragStartPos.y;
            setViewport(prev => {
                const next = { ...prev, x: prev.x + dx, y: prev.y + dy };
                viewportRef.current = next;
                return next;
            });
            setDragStartPos({ x: e.clientX, y: e.clientY });
        } else if (interactionMode === 'DRAGGING') {
            const dx = (e.clientX - dragStartPos.x) / viewport.zoom, dy = (e.clientY - dragStartPos.y) / viewport.zoom;
            const currentSelection = selectedNodeIdsRef.current;
            setNodes(prev => {
                const next = prev.map(n => {
                    if (currentSelection.has(n.id)) { 
                        const start = nodeStartPositions[n.id]; 
                        if (start) return { ...n, position: { x: start.x + dx, y: start.y + dy } }; 
                    }
                    return n;
                });
                nodesRef.current = next; 
                return next;
            });
        } else if (interactionMode === 'CONNECTING' || interactionMode === 'RECONNECTING') {
            const container = containerRef.current;
            if (container) {
                const rect = container.getBoundingClientRect();
                const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewport);
                setConnectionDraft(prev => prev ? { ...prev, currentPos: worldPos } : null);
                
                const element = document.elementFromPoint(e.clientX, e.clientY);
                const targetNodeEl = element?.closest('[data-node-id]');
                
                if (targetNodeEl) { 
                    const targetId = targetNodeEl.getAttribute('data-node-id'); 
                    const sourceId = connectionDraft?.sourceId;
                    
                    const isTargetValid = targetId !== null && targetId !== sourceId;
                    setHoveredNodeId(isTargetValid ? targetId : null); 
                } else {
                    setHoveredNodeId(null);
                }
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const dist = Math.sqrt(Math.pow(e.clientX - dragStartPos.x, 2) + Math.pow(e.clientY - dragStartPos.y, 2));
        const isClick = dist < CLICK_THRESHOLD;

        if (interactionMode === 'PANNING') {
            saveViewportToDb(viewportRef.current);
        } else if (interactionMode === 'DRAGGING') {
            // ПРИНУДИТЕЛЬНОЕ СОХРАНЕНИЕ КООРДИНАТ ВСЕХ ВЫБРАННЫХ НОД
            const currentNodes = nodesRef.current;
            const currentSelection = selectedNodeIdsRef.current;
            currentNodes.forEach((n: MapNodeEntity) => {
                if (currentSelection.has(n.id)) {
                    DatabaseService.mapNodes.update(n);
                }
            });

            if (!isClick) { 
                pushToHistory(currentNodes, edgesRef.current, 'MOVE_NODE'); 
            }
            else { 
                if (currentSelection.size === 1) { 
                    const idArray = Array.from(currentSelection);
                    const firstId = idArray.length > 0 ? (idArray[0] as string) : null;
                    if (firstId) {
                        setActiveInspectorNodeId(firstId); 
                    }
                } 
            }
        } else if (interactionMode === 'CONNECTING') {
            const element = document.elementFromPoint(e.clientX, e.clientY);
            const targetNodeEl = element?.closest('[data-node-id]');
            if (targetNodeEl && connectionDraft) {
                const targetId = targetNodeEl.getAttribute('data-node-id') as string | null;
                if (targetId && targetId !== connectionDraft.sourceId) {
                     const exists = edgesRef.current.find(ed => (ed.sourceNodeId === connectionDraft.sourceId && ed.targetNodeId === targetId));
                     if (!exists) setEdgeDraftMenu({ sourceId: connectionDraft.sourceId, targetId: targetId, x: e.clientX, y: e.clientY });
                }
            }
            setConnectionDraft(null); setHoveredNodeId(null);
        } else if (interactionMode === 'RECONNECTING') {
            const element = document.elementFromPoint(e.clientX, e.clientY);
            const targetNodeEl = element?.closest('[data-node-id]');
            if (targetNodeEl && reconnectingEdgeId && connectionDraft) {
                const targetId = targetNodeEl.getAttribute('data-node-id') as string | null;
                if (targetId && targetId !== connectionDraft.sourceId) {
                    const duplicate = edgesRef.current.find(e => e.id !== reconnectingEdgeId && e.sourceNodeId === connectionDraft.sourceId && e.targetNodeId === targetId);
                    if (!duplicate) {
                        const newEdges = edgesRef.current.map(e => e.id === reconnectingEdgeId ? { ...e, targetNodeId: targetId } : e);
                        setEdges(newEdges); 
                        edgesRef.current = newEdges;
                        pushToHistory(nodesRef.current, newEdges, 'CONNECT'); 
                        const edgeToUpdate = newEdges.find(e => e.id === reconnectingEdgeId);
                        if (edgeToUpdate) DatabaseService.mapEdges.update(edgeToUpdate);
                        
                        // Recalculate as structure changed
                        if (mapId) UseCases.recalculateMapProgress.execute(mapId, userId).then(res => { if(res.success) mergeProgressData(res.data); });
                    }
                }
            }
            setReconnectingEdgeId(null); setConnectionDraft(null); setHoveredNodeId(null);
        }
        setInteractionMode('IDLE');
        
        if (capturedElementRef.current && capturedElementRef.current.hasPointerCapture(e.pointerId)) {
            try {
                capturedElementRef.current.releasePointerCapture(e.pointerId);
            } catch(e) {}
            capturedElementRef.current = null;
        }
    };

    const handleCreateEdge = async (type: MapEdgeType) => {
        if (!edgeDraftMenu) return;
        const newEdge: MapEdgeEntity = { id: uuid(), mapId: mapId!, sourceNodeId: edgeDraftMenu.sourceId, targetNodeId: edgeDraftMenu.targetId, relationType: type, meta: createMeta() };
        const newEdges = [...edgesRef.current, newEdge];
        
        DatabaseService.mapEdges.insert(newEdge); 
        setEdges(newEdges); 
        edgesRef.current = newEdges;
        pushToHistory(nodesRef.current, newEdges, 'CONNECT'); 
        setEdgeDraftMenu(null);
        
        // Recalculate impact of new connection
        if (mapId) {
            const res = await UseCases.recalculateMapProgress.execute(mapId, userId);
            if (res.success) mergeProgressData(res.data);
        }
    };

    const handleEdgeClick = (e: React.MouseEvent, edgeId: string) => { 
        if (e.button !== 0) return; e.stopPropagation(); setSelectedEdgeId(edgeId); setSelectedNodeIds(new Set()); setActiveInspectorNodeId(null);
    };

    const handleCanvasDoubleClick = (e: React.MouseEvent) => {
        if (e.target !== containerRef.current && (e.target as HTMLElement).id === 'canvas-bg') {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const worldPos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, viewportRef.current);
                const newNode: MapNodeEntity = { id: uuid(), mapId: mapId!, type: MapNodeType.NOTE, position: worldPos, content: { label: "Заметка" }, references: {}, meta: createMeta() };
                const newNodes = [...nodesRef.current, newNode];
                setNodes(newNodes); 
                nodesRef.current = newNodes;
                setSelectedNodeIds(new Set([newNode.id])); setEditingNodeId(newNode.id); setEditText(newNode.content.label); setActiveInspectorNodeId(newNode.id); pushToHistory(newNodes, edgesRef.current, 'ADD_NODE'); 
                DatabaseService.mapNodes.insert(newNode);
            }
        }
    };

    const handleNodeDoubleClick = (e: React.MouseEvent, node: MapNodeEntity) => { e.stopPropagation(); setEditingNodeId(node.id); setEditText(node.content.label); };

    const handleAddExistingGoal = async (goal: GoalEntity) => {
        if (!mapId || !containerRef.current) return;
        const worldPos = screenToWorld(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2, viewportRef.current);
        const res = await UseCases.linkGoalToMap.execute(mapId, goal.id, worldPos);
        if (res.success) await loadData(mapId);
    };

    const handleAddExistingTask = async (task: TaskEntity) => {
        if (!mapId || !containerRef.current) return;
        const worldPos = screenToWorld(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2, viewportRef.current);
        const newNode: MapNodeEntity = { id: uuid(), mapId: mapId, type: MapNodeType.STEP, position: worldPos, content: { label: task.title }, references: { taskId: task.id }, meta: createMeta() };
        const newNodes = [...nodesRef.current, newNode]; 
        setNodes(newNodes); 
        nodesRef.current = newNodes;
        pushToHistory(newNodes, edgesRef.current, 'ADD_NODE', `Added Task: ${task.title}`); 
        DatabaseService.mapNodes.insert(newNode);
    };

    const handleAddExistingHabit = async (habit: HabitEntity) => {
        if (!mapId || !containerRef.current) return;
        const worldPos = screenToWorld(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2, viewportRef.current);
        const newNode: MapNodeEntity = { id: uuid(), mapId: mapId, type: MapNodeType.HABIT, position: worldPos, content: { label: habit.title }, references: { habitId: habit.id }, meta: createMeta() };
        const newNodes = [...nodesRef.current, newNode]; 
        setNodes(newNodes); 
        nodesRef.current = newNodes;
        pushToHistory(newNodes, edgesRef.current, 'ADD_NODE', `Added Habit: ${habit.title}`); 
        DatabaseService.mapNodes.insert(newNode);
    };

    const handleAddExistingTracker = async (tracker: SphereTracker) => {
        if (!mapId || !containerRef.current) return;
        const worldPos = screenToWorld(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2, viewportRef.current);
        const newNode: MapNodeEntity = { id: uuid(), mapId: mapId, type: MapNodeType.QUANTITATIVE_PLAN, position: worldPos, content: { label: tracker.title }, references: { sphereTrackerId: tracker.id }, meta: createMeta() };
        const newNodes = [...nodesRef.current, newNode]; 
        setNodes(newNodes); 
        nodesRef.current = newNodes;
        pushToHistory(newNodes, edgesRef.current, 'ADD_NODE', `Added Plan: ${tracker.title}`); 
        DatabaseService.mapNodes.insert(newNode);
    };

    const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !mapId || !containerRef.current) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            const rawBase64 = event.target?.result as string;
            // Сжимаем фото перед добавлением, чтобы не переполнить LocalStorage
            const compressed = await compressImage(rawBase64);
            const worldPos = screenToWorld(containerRef.current!.clientWidth / 2, containerRef.current!.clientHeight / 2, viewportRef.current);
            const newNode: MapNodeEntity = { 
                id: uuid(), 
                mapId: mapId!, 
                type: MapNodeType.IMAGE, 
                position: worldPos, 
                content: { label: "Образ", imageUrl: compressed }, 
                references: {}, 
                meta: createMeta() 
            };
            const newNodes = [...nodesRef.current, newNode];
            setNodes(newNodes);
            nodesRef.current = newNodes;
            pushToHistory(newNodes, edgesRef.current, 'ADD_NODE', 'Added Motivation Image');
            DatabaseService.mapNodes.insert(newNode);
        };
        reader.readAsDataURL(file);
    };

    const commitEdit = () => {
        if (editingNodeId) {
            const newNodes = nodesRef.current.map(n => n.id === editingNodeId ? { ...n, content: { ...n.content, label: editText } } : n);
            setNodes(newNodes); 
            nodesRef.current = newNodes;
            setEditingNodeId(null); 
            pushToHistory(newNodes, edgesRef.current, 'EDIT_CONTENT'); 
            const updated = newNodes.find(n => n.id === editingNodeId);
            if (updated) DatabaseService.mapNodes.update(updated);
        }
    };

    const handleNodeUpdate = (updates: Partial<MapNodeEntity>) => {
        const nodeId = activeInspectorNodeId;
        if (!nodeId) return;
        const currentNodes = nodesRef.current;
        const currentNode = currentNodes.find(n => n.id === nodeId);
        if (!currentNode) return;

        const updatedNode = { ...currentNode, ...updates, meta: { ...currentNode.meta, updatedAt: Date.now() } };

        // 1. Сначала пишем в базу (приоритет сохранения)
        DatabaseService.mapNodes.update(updatedNode);

        // 2. Обновляем UI
        const newNodes = currentNodes.map(n => n.id === nodeId ? updatedNode : n);
        setNodes(newNodes);
        nodesRef.current = newNodes; // Синхронизируем реф

        // 3. История
        pushToHistory(newNodes, edgesRef.current, 'EDIT_CONTENT');
    };

    const deleteEdge = async (edgeId: string) => {
        const newEdges = edgesRef.current.filter(e => e.id !== edgeId);
        setEdges(newEdges); 
        edgesRef.current = newEdges;
        if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
        pushToHistory(nodesRef.current, newEdges, 'DISCONNECT'); 
        DatabaseService.mapEdges.delete(edgeId);
        
        // Recalculate impact
        if (mapId) {
            const res = await UseCases.recalculateMapProgress.execute(mapId, userId);
            if (res.success) mergeProgressData(res.data);
        }
    };

    const handleDelete = async () => {
        if (selectedEdgeId) { await deleteEdge(selectedEdgeId); return; }
        const currentSelection = selectedNodeIdsRef.current;
        if (currentSelection.size === 0) return;
        
        // 1. Identify what to delete
        const nodesToDelete = Array.from(currentSelection).filter(id => { 
            const node = nodesRef.current.find(n => n.id === id); 
            return node && node.type !== MapNodeType.CURRENT_SELF && node.type !== MapNodeType.FUTURE_SELF; 
        });
        
        if (nodesToDelete.length === 0) return;

        // 2. Optimistic UI Update
        const newNodes = nodesRef.current.filter(n => !nodesToDelete.includes(n.id));
        const deletedEdges = edgesRef.current.filter(e => nodesToDelete.includes(e.sourceNodeId) || nodesToDelete.includes(e.targetNodeId));
        const newEdges = edgesRef.current.filter(e => !nodesToDelete.includes(e.sourceNodeId) && !nodesToDelete.includes(e.targetNodeId));
        
        setNodes(newNodes);
        setEdges(newEdges);
        syncRefs(newNodes, newEdges);
        setSelectedNodeIds(new Set());
        setActiveInspectorNodeId(null);
        pushToHistory(newNodes, newEdges, 'DELETE_NODE');
        
        // 3. SEQUENTIAL DB DELETE (Critical Fix)
        try {
            await Promise.all([
                ...nodesToDelete.map(id => DatabaseService.mapNodes.delete(id)),
                ...deletedEdges.map(e => DatabaseService.mapEdges.delete(e.id))
            ]);
        } catch (e) {
            console.error("Delete failed", e);
        }

        // 4. Update Analysis
        refreshUnmappedData(newNodes);
        
        if (mapId) {
            const res = await UseCases.recalculateMapProgress.execute(mapId, userId);
            if (res.success) mergeProgressData(res.data);
        }
    };

    const focusNode = (id?: string) => {
        if (!id) return;
        const node = nodesRef.current.find(n => n.id === id);
        if (node && containerRef.current && node.position) {
            const w = containerRef.current.clientWidth, h = containerRef.current.clientHeight;
            const x = w / 2 - node.position.x * viewportRef.current.zoom - 75 * viewportRef.current.zoom, y = h / 2 - node.position.y * viewportRef.current.zoom - 30 * viewportRef.current.zoom;
            const nextViewport = { x, y, zoom: viewportRef.current.zoom };
            setViewport(nextViewport);
            viewportRef.current = nextViewport;
            setSelectedNodeIds(new Set([id]));
            saveViewportToDb(nextViewport);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isTyping = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
            if (editingNodeId) { if (e.key === 'Enter' && !e.shiftKey) commitEdit(); if (e.key === 'Escape') setEditingNodeId(null); return; }
            if (isTyping) return;
            if (e.key === 'Delete' || e.key === 'Backspace') handleDelete();
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [editingNodeId]);

    const MarkerDefs = () => (
        <defs>
            {Object.values(MapEdgeType).map(type => {
                const colors = {
                    [MapEdgeType.BLOCKS]: "#f43f5e",
                    [MapEdgeType.REQUIRES]: "#f59e0b",
                    [MapEdgeType.LEADS_TO]: "#10b981",
                    [MapEdgeType.CAUSES]: "#94a3b8"
                };
                const color = colors[type];
                return (
                    <React.Fragment key={type}>
                        <marker id={`arrowhead-${type}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                        </marker>
                        <marker id={`arrowhead-${type}-highlight`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                        </marker>
                    </React.Fragment>
                );
            })}
        </defs>
    );

    return (
        <div className="w-full h-full relative overflow-hidden bg-slate-50 dark:bg-slate-950 select-none font-sans" style={{ touchAction: 'none' }}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-[90vw] md:w-full md:max-w-md px-1 md:px-4">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 md:p-3 flex flex-col gap-1.5 md:gap-2">
                    <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <div className="p-1 md:p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600"><Trophy size={14} className="md:w-4 md:h-4" /></div>
                            <div className="flex flex-col"><span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1">Путь к Я 2.0</span><span className="text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px] md:max-w-none">{getMotivationStatus(globalProgress)}</span></div>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-xs md:text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 md:px-2 py-0.5 rounded-md"><TrendingUp size={12} className="md:w-3.5 md:h-3.5" />{globalProgress}%</div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700/50 p-0.5"><div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${globalProgress}%` }} /></div>
                </div>
            </div>

            <div className="absolute top-20 md:top-4 left-4 z-20 flex flex-col gap-2">
                <div className="bg-white dark:bg-slate-900 p-1.5 md:p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1.5 md:gap-2">
                    <button onClick={() => { if (containerRef.current) { const worldPos = screenToWorld(containerRef.current.clientWidth / 2, containerRef.current.clientHeight / 2, viewportRef.current); const newNode: MapNodeEntity = { id: uuid(), mapId: mapId!, type: MapNodeType.NOTE, position: worldPos, content: { label: "Заметка" }, references: {}, meta: createMeta() }; const newNodes = [...nodesRef.current, newNode]; setNodes(newNodes); nodesRef.current = newNodes; pushToHistory(newNodes, edgesRef.current, 'ADD_NODE'); DatabaseService.mapNodes.insert(newNode); } }} className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Добавить заметку"><Brain size={18} className="md:w-5 md:h-5" /></button>
                    <button onClick={() => { if(hiddenFileInputRef.current) hiddenFileInputRef.current.click(); }} className="p-2 text-slate-500 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Добавить образ (фото)"><ImageIcon size={18} className="md:w-5 md:h-5" /></button>
                    <input type="file" ref={hiddenFileInputRef} className="hidden" accept="image/*" onChange={handleAddImage} />
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-0.5 md:my-1"></div>
                    <button onClick={undo} disabled={!canUndo} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30"><Undo size={18} className="md:w-5 md:h-5" /></button>
                    <button onClick={redo} disabled={!canRedo} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30"><Redo size={18} className="md:w-5 md:h-5" /></button>
                </div>
                <button onClick={() => setShowLibrary(!showLibrary)} className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><LayoutList size={18} className="md:w-5 md:h-5" /></button>
            </div>

            {edgeDraftMenu && <EdgeCreationPanel x={edgeDraftMenu.x} y={edgeDraftMenu.y} onSelect={handleCreateEdge} onCancel={() => setEdgeDraftMenu(null)} />}
            
            {showLibrary && ( <div className="md:mt-0 mt-16"><LibraryPanel goals={unmappedGoals} tasks={unmappedTasks} habits={unmappedHabits} trackers={unmappedTrackers} onPickGoal={handleAddExistingGoal} onPickTask={handleAddExistingTask} onPickHabit={handleAddExistingHabit} onPickTracker={handleAddExistingTracker} onClose={() => setShowLibrary(false)} /></div> )}

            <button onClick={() => setShowAnalysis(!showAnalysis)} className={`absolute top-20 md:top-4 right-4 z-30 flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 rounded-xl shadow-lg border transition-all ${analysisResult && analysisResult.issues.length > 0 ? 'bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800 dark:text-amber-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}><AlertCircle size={18} className={`md:w-5 md:h-5 ${analysisResult?.issues.length ? 'animate-pulse' : ''}`} /><span className="font-bold text-xs md:text-sm">{analysisResult ? `${analysisResult.score}%` : 'Анализ'}</span></button>
            {showAnalysis && ( <div className="md:mt-0 mt-16"><CoachPanel result={analysisResult} onClose={() => setShowAnalysis(false)} onSelect={focusNode} /></div> )}

            {activeInspectorNodeId && nodesRef.current.find(n => n.id === activeInspectorNodeId) && ( <NodeInspector node={nodesRef.current.find(n => n.id === activeInspectorNodeId)!} onUpdate={handleNodeUpdate} onDelete={handleDelete} onNavigate={onNavigate} onClose={() => setActiveInspectorNodeId(null)} /> )}
            
            <div className="absolute bottom-6 right-6 z-20 flex gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-1.5 md:p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700"><button onClick={() => setViewport(v => { const next = {...v, zoom: Math.max(ZOOM_MIN, v.zoom - 0.1)}; viewportRef.current = next; saveViewportToDb(next); return next; })} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Minus size={14} className="md:w-4 md:h-4" /></button><span className="py-1.5 md:py-2 min-w-[2.5rem] md:min-w-[3rem] text-center text-[10px] md:text-xs font-bold text-slate-500">{Math.round(viewport.zoom * 100)}%</span><button onClick={() => setViewport(v => { const next = {...v, zoom: Math.min(ZOOM_MAX, v.zoom + 0.1)}; viewportRef.current = next; saveViewportToDb(next); return next; })} className="p-1.5 md:p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Plus size={14} className="md:w-4 md:h-4" /></button></div>

            <div ref={containerRef} className="w-full h-full cursor-default relative touch-none" onPointerDown={handleCanvasPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel} onDoubleClick={handleCanvasDoubleClick} onContextMenu={(e) => e.preventDefault()} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                <div style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
                    <div id="canvas-bg" className="absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] pointer-events-auto" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.4 }} />
                    <svg className="absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] pointer-events-none overflow-visible" viewBox="-10000 -10000 20000 20000">
                        <MarkerDefs />
                        {edges.map(edge => ( <Edge key={edge.id} edge={edge} sourceNode={nodes.find(n => n.id === edge.sourceNodeId)} targetNode={nodes.find(n => n.id === edge.targetNodeId)} isHighlighted={selectedNodeIds.has(edge.sourceNodeId) && selectedNodeIds.has(edge.targetNodeId) || selectedEdgeId === edge.id} onClick={(e) => handleEdgeClick(e, edge.id)} onDelete={() => deleteEdge(edge.id)} onReconnectStart={(e) => handleEdgeReconnectStart(e, edge.id, edge.sourceNodeId)} /> ))}
                        {(interactionMode === 'CONNECTING' || interactionMode === 'RECONNECTING') && connectionDraft && ( <Edge edge={{ source: connectionDraft.startPos, target: connectionDraft.currentPos }} isDraft /> )}
                    </svg>
                    {nodes.map(node => {
                        if (!node.position) return null;
                        const hasIssue = analysisResult?.issues.some(i => i.targetNodeId === node.id);
                        const progress = node.progressData?.value || 0;
                        const health = node.progressData?.health || MapNodeHealth.HEALTHY;
                        let borderColor = 'border-slate-200 dark:border-slate-700';
                        if (health === MapNodeHealth.AT_RISK) borderColor = 'border-amber-400';
                        if (health === MapNodeHealth.STAGNANT) borderColor = 'border-slate-400 dark:border-slate-600 opacity-80';
                        if (hasIssue) borderColor = 'border-rose-400 border-dashed';
                        if (selectedNodeIds.has(node.id)) borderColor = 'border-indigo-500 ring-4 ring-indigo-500/30';
                        const isHoveredForConnection = hoveredNodeId === node.id && (interactionMode === 'CONNECTING' || interactionMode === 'RECONNECTING');
                        
                        let nodeBg = 'bg-white dark:bg-slate-900';
                        if (node.type === MapNodeType.IMAGE) nodeBg = 'bg-white dark:bg-slate-800 ring-1 ring-black/5 dark:ring-white/5'; 
                        else if (node.type === MapNodeType.NOTE) nodeBg = 'bg-slate-50 dark:bg-slate-800';
                        else if (node.type === MapNodeType.LIMITATION) nodeBg = 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-900/50';
                        else if (node.type === MapNodeType.CURRENT_SELF) nodeBg = 'bg-indigo-50 dark:bg-indigo-900/20';
                        else if (node.type === MapNodeType.FUTURE_SELF) nodeBg = 'bg-emerald-50 dark:bg-emerald-900/20';
                        else if (node.type === MapNodeType.HABIT) nodeBg = 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
                        else if (node.type === MapNodeType.QUANTITATIVE_PLAN) nodeBg = 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800';
                        
                        let timeProgress = 0, orbitColor = "#3b82f6";
                        if (node.type === MapNodeType.FUTURE_SELF && node.content.futureSelfData?.horizon?.targetDate) {
                            const start = node.meta.createdAt, end = node.content.futureSelfData.horizon.targetDate, nowTs = Date.now();
                            if (end > start) { timeProgress = Math.min(100, Math.max(0, ((nowTs - start) / (end - start)) * 100)); if (timeProgress >= 85) orbitColor = "#ef4444"; else if (timeProgress >= 50) orbitColor = "#f97316"; else if (timeProgress >= 25) orbitColor = "#a855f7"; }
                        }
                        
                        const isImage = node.type === MapNodeType.IMAGE;

                        return (
                            <div key={node.id} data-node-id={node.id} onPointerDown={(e) => handleNodePointerDown(e, node.id)} onDoubleClick={(e) => handleNodeDoubleClick(e, node)} onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ transform: `translate(${node.position.x}px, ${node.position.y}px)`, width: '150px', minHeight: isImage ? '120px' : '60px', touchAction: 'none' }} className={`absolute top-0 left-0 rounded-xl shadow-sm border-2 flex flex-col items-center transition-all hover:shadow-lg group ${borderColor} ${nodeBg} ${isHoveredForConnection ? 'ring-4 ring-emerald-400 border-emerald-500 scale-105 z-10' : ''} ${isImage ? 'p-1' : 'justify-center p-3'}`}>
                                {node.type === MapNodeType.FUTURE_SELF && node.content.futureSelfData?.horizon?.targetDate && ( <div className="absolute inset-0 -m-[10px] pointer-events-none overflow-visible"><svg width="170" height="80" viewBox="0 0 170 80" className="overflow-visible"><defs><filter id={`glow-${node.id}`}><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect x="5" y="5" width="160" height="70" rx="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-200 dark:text-slate-800 opacity-30" /><rect x="5" y="5" width="160" height="70" rx="15" fill="none" stroke={orbitColor} strokeWidth="3" strokeDasharray="460" strokeDashoffset={460 - (460 * (timeProgress / 100))} strokeLinecap="round" className="transition-all duration-1000 ease-in-out" filter={`url(#glow-${node.id})`} style={{ transformOrigin: 'center', transform: 'rotate(0deg)' }} /></svg></div> )}
                                <div onPointerDown={(e) => handleConnectPointerDown(e, node.id, 'right')} className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair z-20 hover:scale-125 transition-all shadow-sm" /><div onPointerDown={(e) => handleConnectPointerDown(e, node.id, 'left')} className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair z-20 hover:scale-125 transition-all shadow-sm" /><div onPointerDown={(e) => handleConnectPointerDown(e, node.id, 'top')} className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair z-20 hover:scale-125 transition-all shadow-sm" /><div onPointerDown={(e) => handleConnectPointerDown(e, node.id, 'bottom')} className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full opacity-0 group-hover:opacity-100 cursor-crosshair z-20 hover:scale-125 transition-all shadow-sm" />
                                {editingNodeId === node.id ? ( <textarea value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={commitEdit} autoFocus className="w-full bg-transparent text-center text-sm font-medium outline-none resize-none overflow-hidden h-full dark:text-white" rows={2} /> ) : (
                                    <>
                                        {isImage ? (
                                            <div className="w-full h-full flex flex-col animate-in fade-in">
                                                <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden relative">
                                                    {node.content.imageUrl ? (
                                                        <img src={node.content.imageUrl} className="w-full h-full object-cover" alt="Vision" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon size={24} /></div>
                                                    )}
                                                </div>
                                                <div className="mt-1 px-1 py-1 text-[10px] font-bold text-center text-slate-500 dark:text-slate-400 uppercase tracking-tight truncate">{node.content.label}</div>
                                            </div>
                                        ) : (
                                            <>
                                                {node.type === MapNodeType.GOAL && <Target size={12} className="text-indigo-500 mb-1" />}
                                                {node.type === MapNodeType.NOTE && <Brain size={12} className="text-slate-400 mb-1" />}
                                                {node.type === MapNodeType.LIMITATION && <ShieldAlert size={12} className="text-rose-500 mb-1" />}
                                                {node.type === MapNodeType.STEP && <CheckSquare size={12} className="text-blue-500 mb-1" />}
                                                {node.type === MapNodeType.HABIT && <Activity size={12} className="text-orange-500 mb-1" />}
                                                {node.type === MapNodeType.QUANTITATIVE_PLAN && <Grid size={12} className="text-emerald-500 mb-1" />}
                                                <div className="font-medium text-center text-slate-800 dark:text-slate-200 pointer-events-none select-none leading-tight text-sm truncate max-w-full">{node.content.label || "Empty"}</div>
                                                {node.type === MapNodeType.FUTURE_SELF && ( <div className="flex flex-col items-center mt-1 w-full overflow-hidden"><div className="text-[9px] uppercase font-bold text-emerald-500">Я 2.0</div>{node.content.futureSelfData?.horizon?.targetDate ? ( <div className="text-[8px] text-emerald-600 font-mono mt-0.5 font-bold bg-white/50 dark:bg-slate-800/50 px-1 rounded">До: {new Date(node.content.futureSelfData.horizon.targetDate).toLocaleDateString()}</div> ) : null}{node.content.futureSelfData?.identity?.tags && node.content.futureSelfData.identity.tags.length > 0 && ( <div className="flex flex-wrap justify-center gap-0.5 mt-1.5 w-full">{node.content.futureSelfData.identity.tags.slice(0, 3).map(tag => ( <span key={tag} className="text-[7px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800 truncate max-w-[40px]">{tag}</span> ))}</div> )}</div> )}
                                                {(node.type === MapNodeType.GOAL || node.type === MapNodeType.STEP || node.type === MapNodeType.HABIT || node.type === MapNodeType.QUANTITATIVE_PLAN) && ( <div className="w-full h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-2 overflow-hidden"><div className={`h-full ${health === MapNodeHealth.HEALTHY ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{width: `${progress}%`}} /></div> )}
                                                {node.type === MapNodeType.CURRENT_SELF && <div className="flex flex-col items-center mt-1"><div className="text-[9px] uppercase font-bold text-slate-400">Я Сейчас</div>{node.content.currentSelfData && <div className="text-[8px] text-indigo-500 font-mono mt-0.5">Energy: {node.content.currentSelfData.metrics.averageEnergy}%</div>}</div>}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};