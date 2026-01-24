
import React, { useState, useRef } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, CheckSquare, Clock, MessageSquare, Settings, Activity, ListChecks, Calendar, User, Target, Menu, PanelLeftClose, Map as MapIcon } from 'lucide-react';

interface LayoutProps {
    children: React.ReactNode;
    currentView: ViewState;
    onChangeView: (view: ViewState) => void;
    labels: any;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onChangeView, labels }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const touchStartX = useRef<number | null>(null);
    const SWIPE_THRESHOLD = 50; // Минимальное расстояние для срабатывания свайпа
    const EDGE_THRESHOLD = 40;  // Зона у края экрана для открытия панели

    // Обработка начала касания
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    // Обработка завершения касания
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX.current === null) return;

        const touchEndX = e.changedTouches[0].clientX;
        const deltaX = touchEndX - touchStartX.current;

        // Если панель открыта и свайп влево
        if (isSidebarOpen && deltaX < -SWIPE_THRESHOLD) {
            setIsSidebarOpen(false);
        } 
        // Если панель закрыта и свайп вправо от края экрана
        else if (!isSidebarOpen && deltaX > SWIPE_THRESHOLD && touchStartX.current < EDGE_THRESHOLD) {
            setIsSidebarOpen(true);
        }

        touchStartX.current = null;
    };
    
    // Helper to check if a nav item is active
    const isActive = (viewName: string) => {
        if (typeof currentView === 'string') {
            if (currentView === viewName) return true;
            if (viewName === 'TASKS' && currentView === 'TASK_CREATE') return true;
            if (viewName === 'HABITS' && currentView === 'HABIT_CREATE') return true;
            if (viewName === 'CHECKLISTS' && currentView === 'SUGGESTION_LOG') return true;
            if (viewName === 'AI_CHAT' && currentView === 'AI_CHAT') return true;
            if (viewName === 'SETTINGS' && currentView === 'SETTINGS') return true;
            if (viewName === 'CALENDAR' && currentView === 'CALENDAR') return true;
            if (viewName === 'FOCUS' && currentView === 'FOCUS') return true;
            if (viewName === 'GOALS' && currentView === 'GOALS') return true;
            if (viewName === 'LIFE_MAP' && currentView === 'LIFE_MAP') return true;
            return false;
        }
        
        if (viewName === 'TASKS' && (currentView.type === 'TASK_EDIT' || currentView.type === 'TASK_DETAIL')) return true;
        if (viewName === 'FOCUS' && currentView.type === 'FOCUS') return true;
        if (viewName === 'HABITS' && (currentView.type === 'HABIT_EDIT' || currentView.type === 'HABIT_DETAIL')) return true;
        if (viewName === 'CHECKLISTS' && (currentView.type === 'PLAN_EDITOR' || currentView.type === 'AI_DRAFTS')) return true;
        if (viewName === 'AI_CHAT' && currentView.type === 'AI_CHAT') return true;
        if (viewName === 'LIFE_MAP' && currentView.type === 'LIFE_MAP') return true;
        
        return false;
    };

    const NavItem = ({ view, icon: Icon, label }: { view: any, icon: any, label: string }) => {
        const active = isActive(view === 'AI_CHAT' ? 'AI_CHAT' : view);
        return (
            <button
                onClick={() => onChangeView(view)}
                title={label}
                className={`group flex flex-col items-center justify-center w-full py-3 space-y-1 transition-all duration-300 relative rounded-xl mx-1 ${
                    active
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
            >
                <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                </div>
                
                {active && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-r-full animate-fade-in" />
                )}
            </button>
        );
    };

    return (
        <div 
            className="flex h-screen max-w-4xl mx-auto relative overflow-hidden bg-transparent"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Left Vertical Navigation Rail */}
            <aside 
                className={`
                    flex-shrink-0 flex flex-col items-center py-4 z-50 glass-panel border-r border-slate-200/50 dark:border-slate-800/50 m-0 rounded-r-none h-full shadow-xl
                    transition-all duration-300 ease-in-out overflow-hidden
                    ${isSidebarOpen ? 'w-16 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 px-0'}
                `}
            >
                {/* Collapse Button (Top) */}
                <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="mb-4 p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors"
                    title="Свернуть меню"
                >
                    <PanelLeftClose size={20} />
                </button>

                {/* Logo / Brand Indicator */}
                <div className="mb-4 w-8 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20" />

                <div className="flex-1 w-full space-y-1 overflow-y-auto no-scrollbar flex flex-col items-center">
                    <NavItem view="DASHBOARD" icon={LayoutDashboard} label={labels.dashboard} />
                    <NavItem view="LIFE_MAP" icon={MapIcon} label="Life Map" />
                    <NavItem view="GOALS" icon={Target} label="Goals" />
                    <NavItem view="TASKS" icon={CheckSquare} label={labels.tasks} />
                    <NavItem view="CALENDAR" icon={Calendar} label={labels.calendar} />
                    <NavItem view="HABITS" icon={Activity} label={labels.habits} />
                    <NavItem view="CHECKLISTS" icon={ListChecks} label={labels.checklists} />
                    <NavItem view="FOCUS" icon={Clock} label={labels.focus} />
                    <NavItem view="AI_CHAT" icon={MessageSquare} label={labels.chat} />
                </div>

                <div className="mt-auto w-full pt-2 border-t border-slate-100 dark:border-slate-800/50">
                    <NavItem view="SETTINGS" icon={User} label={labels.settings} />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
                
                {/* Floating Open Button - Moved to bottom left to avoid header overlap */}
                {!isSidebarOpen && (
                    <button 
                        onClick={() => setIsSidebarOpen(true)}
                        className="absolute bottom-6 left-6 z-[60] w-10 h-10 rounded-full bg-white/90 dark:bg-slate-900/90 text-indigo-600 dark:text-indigo-400 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 backdrop-blur-md"
                        title="Открыть меню"
                    >
                        <Menu size={20} />
                    </button>
                )}

                {children}
            </main>
        </div>
    );
};
