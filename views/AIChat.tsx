
import React, { useRef, useEffect, useState } from 'react';
import { useAIChatViewModel } from '../hooks/viewmodels';
import { Bot, Send, User, Menu, Plus, Trash2, X, MessageSquare, Edit2, Check } from 'lucide-react';
import { ChatMessage, ChatScenario, UserEntity, ChatThread } from '../types';

interface AIChatProps {
    userId: string;
    labels: any;
    user?: UserEntity;
    onNavigateSettings?: () => void;
    onNavigate: (view: any) => void;
    initialScenario?: ChatScenario;
    initialPayload?: string;
}

// Track initialized threads globally to prevent double-firing in Strict Mode
const initializedThreads = new Set<string>();

// Simple formatter to clean up artifacts like **text** into bold
const formatText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const ChatBubble: React.FC<{ msg: ChatMessage }> = ({ msg }) => {
    const isUser = msg.role === 'user';
    const isSystem = msg.role === 'system';

    // Hide Deep Linking Payload and System Init Trigger
    if (isUser && (msg.text.startsWith('DEEP_PLAN_REVIEW:::') || msg.text === 'SYSTEM_INIT_ONBOARDING')) return null;

    if (isSystem) {
        return (
            <div className="flex justify-center my-4 animate-fade-in">
                <div className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                    {msg.text}
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-spring-up`}>
            <div className={`max-w-[85%] flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'}`}>
                    {isUser ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div 
                    className={`p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm shadow-sm border whitespace-pre-wrap ${
                        isUser 
                        ? 'bg-indigo-600/90 text-white border-indigo-500 rounded-br-none' 
                        : 'bg-white/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border-white/40 dark:border-slate-700 rounded-bl-none'
                    }`}
                >
                    {msg.text.split('\n').map((line, i) => (
                        <p key={i} className={i > 0 ? 'mt-1' : ''}>{formatText(line)}</p>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const AIChat: React.FC<AIChatProps> = ({ userId, labels, user, onNavigateSettings, onNavigate, initialScenario, initialPayload }) => {
    const { 
        state, 
        threads, 
        currentThreadId, 
        createThread, 
        renameThread, 
        deleteThread, 
        selectThread, 
        sendMessage, 
        historyLoaded 
    } = useAIChatViewModel(userId);
    
    const [inputValue, setInputValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const endRef = useRef<HTMLDivElement>(null);
    const scenarioProcessed = useRef(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Sidebar Rename State
    const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [state.messages, state.isLoading]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
        }
    }, [inputValue]);

    useEffect(() => {
        if (!state.isLoading && historyLoaded && currentThreadId) {
             // Priority 1: Handle Deep Linking Scenarios
             if (initialScenario && !scenarioProcessed.current) {
                 scenarioProcessed.current = true;
                 if (initialScenario === 'DEEP_PLAN_REVIEW' && initialPayload) sendMessage(`DEEP_PLAN_REVIEW:::${initialPayload}`);
                 else sendMessage("", initialScenario);
             }
             // Priority 2: Initial Onboarding Questions
             // Trigger only if chat is empty AND this thread hasn't been initialized in this session yet
             else if (state.messages.length === 0) {
                 if (!initializedThreads.has(currentThreadId)) {
                     initializedThreads.add(currentThreadId);
                     sendMessage("SYSTEM_INIT_ONBOARDING");
                 }
             }
        }
    }, [initialScenario, initialPayload, historyLoaded, threads.length, currentThreadId]); 

    const handleSend = () => { 
        if (!inputValue.trim()) return; 
        sendMessage(inputValue); 
        setInputValue('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const isMobile = window.innerWidth < 768;
            if (isMobile) return;
            else {
                if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                }
            }
        }
    };

    const handleCreateThread = async () => {
        await createThread();
        setIsSidebarOpen(false);
    };

    const startRenaming = (e: React.MouseEvent, thread: ChatThread) => {
        e.stopPropagation();
        setEditingThreadId(thread.id);
        setEditTitle(thread.title);
    };

    const saveRename = async (e: React.MouseEvent | React.KeyboardEvent) => {
        e.stopPropagation();
        if (editingThreadId && editTitle.trim()) {
            await renameThread(editingThreadId, editTitle);
            setEditingThreadId(null);
        }
    };

    const cancelRename = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingThreadId(null);
    };

    return (
        <div className="h-full flex bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
            
            {/* Thread Sidebar (Drawer) */}
            <div className={`absolute inset-y-0 left-0 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 z-50 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="font-bold text-slate-900 dark:text-white">Чаты</h2>
                    <button onClick={() => setIsSidebarOpen(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>
                <div className="p-3">
                    <button 
                        onClick={handleCreateThread}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors mb-4"
                    >
                        <Plus size={18} /> Новый Чат
                    </button>
                    
                    <div className="space-y-1 overflow-y-auto max-h-[70vh]">
                        {threads.map(thread => (
                            <div 
                                key={thread.id} 
                                onClick={() => { if(editingThreadId !== thread.id) { selectThread(thread.id); setIsSidebarOpen(false); } }}
                                className={`group p-3 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${currentThreadId === thread.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {editingThreadId === thread.id ? (
                                    <div className="flex items-center gap-2 w-full animate-in fade-in" onClick={e => e.stopPropagation()}>
                                        <input 
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="flex-1 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-2 py-1 text-sm outline-none dark:text-white"
                                            autoFocus
                                            onKeyDown={(e) => e.key === 'Enter' && saveRename(e)}
                                        />
                                        <button onClick={saveRename} className="text-emerald-500 hover:bg-emerald-100 rounded p-1"><Check size={14} /></button>
                                        <button onClick={cancelRename} className="text-slate-400 hover:bg-slate-200 rounded p-1"><X size={14} /></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <MessageSquare size={16} className={currentThreadId === thread.id ? 'text-indigo-500' : 'text-slate-400'} />
                                            <span className={`text-sm truncate ${currentThreadId === thread.id ? 'font-bold text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                                {thread.title}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => startRenaming(e, thread)}
                                                className="text-slate-400 hover:text-indigo-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteThread(thread.id); }}
                                                className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Overlay for Sidebar */}
            {isSidebarOpen && (
                <div 
                    className="absolute inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
                    <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 dark:hover:text-white">
                        <Menu size={24} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                        <Bot size={20} />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Chronos Coach 
                            <span className="text-[10px] font-normal text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {threads.find(t => t.id === currentThreadId)?.title || 'New Chat'}
                            </span>
                        </h2>
                        <p className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                        </p>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-48">
                    {state.messages.length === 0 && (
                        <div className="text-center py-20 opacity-50">
                            <Bot size={48} className="mx-auto mb-4 text-slate-300" />
                            <p className="text-slate-400">Начните новую беседу.</p>
                        </div>
                    )}
                    {state.messages.map((msg) => <ChatBubble key={msg.id} msg={msg} />)}
                    
                    {state.isLoading && (
                         <div className="flex justify-start mb-4 animate-fade-in">
                            <div className="bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-full flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}/>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}/>
                                    <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}/>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={endRef} />
                </div>

                {/* Input Area */}
                <div className="absolute bottom-6 left-4 right-4 z-30">
                    <div className="glass-heavy p-2 rounded-[2rem] flex items-end gap-2 shadow-2xl transition-all focus-within:ring-2 focus-within:ring-indigo-500/30 bg-white/95 dark:bg-slate-900/95 border border-white/20 dark:border-slate-700/50">
                        <textarea 
                            ref={textareaRef}
                            rows={1}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={labels.chatPlaceholder || "Спроси что-нибудь..."}
                            className="flex-1 bg-transparent px-4 py-3 outline-none text-slate-900 dark:text-white placeholder:text-slate-400 resize-none max-h-[120px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputValue.trim() || state.isLoading}
                            className="w-10 h-10 mb-1 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shrink-0"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
