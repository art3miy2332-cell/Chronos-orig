import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './views/Login';
import { Register } from './views/Register';
import { Onboarding } from './views/Onboarding';
import { Dashboard } from './views/Dashboard';
import { Tasks } from './views/Tasks';
import { TaskForm } from './views/TaskForm';
import { TaskDetail } from './views/TaskDetail';
import { CalendarView } from './views/CalendarView';
import { FocusTimer } from './views/FocusTimer';
import { AIChat } from './views/AIChat';
import { Settings } from './views/Settings';
import { DevTests } from './views/DevTests';
import { Habits } from './views/Habits';
import { HabitForm } from './views/HabitForm';
import { HabitDetail } from './views/HabitDetail';
import { Checklists } from './views/Checklists';
import { PlanEditor } from './views/PlanEditor';
import { WeeklyPlanBuilder } from './views/WeeklyPlanBuilder';
import { MonthlyPlanBuilder } from './views/MonthlyPlanBuilder';
import { AIDrafts } from './views/AIDrafts';
import { SuggestionLog } from './views/SuggestionLog';
import { DailyReflection } from './views/reviews/DailyReflection';
import { WeeklyReview } from './views/reviews/WeeklyReview';
import { MonthlyReview } from './views/reviews/MonthlyReview';
import { Goals } from './views/Goals'; 
import { LifeMapCanvas } from './views/LifeMap/LifeMapCanvas';
import { UserEntity, ViewState, TaskEntity, PlanType } from './types';
import { LABELS } from './constants';
import { AuthService } from './utils/auth';
import { DatabaseService } from './utils/db';
import { CoachingManager } from './utils/coaching-manager';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserEntity | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('AUTH_LOGIN');
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  
  useEffect(() => {
    const initApp = async () => {
        try {
            DatabaseService.init();
            AuthService.initDevSeed();
            const user = await AuthService.me();
            
            if (user) {
                setCurrentUser(user);
                if (!user.onboardingCompleted) {
                    setCurrentView('ONBOARDING');
                } else {
                    setCurrentView('DASHBOARD');
                    refreshTasks(user.id);
                    await checkForReviews(user);
                }
            } else {
                setCurrentView('AUTH_LOGIN');
            }
        } catch (error) {
            console.error("[App] Initialization failed:", error);
            setCurrentView('AUTH_LOGIN');
        } finally {
            setIsLoadingAuth(false);
        }
    };
    initApp();
  }, []);

  const checkForReviews = async (user: UserEntity) => {
      const reviewType = CoachingManager.checkPendingReviews(user);
      if (reviewType === 'DAILY') {
          const insight = await CoachingManager.generateDailyReview(user.id);
          setCurrentView({ type: 'DAILY_REFLECTION', insight });
      } else if (reviewType === 'WEEKLY') {
          const insight = await CoachingManager.generateWeeklyReview(user.id);
          setCurrentView({ type: 'WEEKLY_REVIEW', insight });
      } else if (reviewType === 'MONTHLY') {
          const insight = await CoachingManager.generateMonthlyReview(user.id);
          setCurrentView({ type: 'MONTHLY_REVIEW', insight });
      }
  };

  useEffect(() => {
    const theme = currentUser?.theme || 'dark';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentUser?.theme]);

  const refreshTasks = (userId: string) => {
      setTasks(DatabaseService.tasks.getByUserId(userId));
  };

  const handleLoginSuccess = (user: UserEntity) => {
      setCurrentUser(user);
      if (!user.onboardingCompleted) {
          setCurrentView('ONBOARDING');
      } else {
          refreshTasks(user.id);
          setCurrentView('DASHBOARD');
          checkForReviews(user);
      }
  };

  const handleOnboardingComplete = (updates: Partial<UserEntity>) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, ...updates, onboardingCompleted: true };
      AuthService.updateUser(updatedUser);
      setCurrentUser(updatedUser);
      refreshTasks(updatedUser.id);
      setCurrentView('DASHBOARD');
  };

  const handleLogout = () => {
      AuthService.logout();
      setCurrentUser(null);
      setCurrentView('AUTH_LOGIN');
  };

  if (isLoadingAuth) {
      return (
          <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-indigo-600 animate-pulse">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <div className="font-bold text-lg">Chronos is waking up...</div>
          </div>
      );
  }

  if (!currentUser) {
      if (currentView === 'AUTH_REGISTER') {
          return <Register onLoginSuccess={handleLoginSuccess} onNavigateLogin={() => setCurrentView('AUTH_LOGIN')} labels={LABELS['RU']} currentLang={'RU'} />;
      }
      return <Login onLoginSuccess={handleLoginSuccess} onNavigateRegister={() => setCurrentView('AUTH_REGISTER')} labels={LABELS['RU']} currentLang={'RU'} />;
  }
  
  if (currentView === 'ONBOARDING') {
      return <Onboarding onComplete={handleOnboardingComplete} initialName={currentUser.displayName} />;
  }

  const lang = currentUser.preferredLanguage || 'RU';
  const labels = LABELS[lang] || LABELS['RU'];

  const renderAuthenticatedView = () => {
    if (typeof currentView === 'object') {
        if (currentView.type === 'TASK_EDIT') {
            return <TaskForm userId={currentUser.id} taskId={currentView.taskId} initialTitle={currentView.initialTitle} onNavigateBack={() => setCurrentView('TASKS')} labels={labels} />;
        }
        if (currentView.type === 'TASK_DETAIL') {
             return <TaskDetail taskId={currentView.taskId} onNavigateBack={() => setCurrentView('TASKS')} onNavigateEdit={() => setCurrentView({ type: 'TASK_EDIT', taskId: currentView.taskId })} labels={labels} />;
        }
        if (currentView.type === 'FOCUS') {
            return <FocusTimer taskId={currentView.taskId} onNavigateBack={() => setCurrentView('DASHBOARD')} labels={labels} />;
        }
        if (currentView.type === 'HABIT_EDIT') {
            return <HabitForm userId={currentUser.id} habitId={currentView.habitId} onNavigateBack={() => setCurrentView('HABITS')} labels={labels} />;
        }
        if (currentView.type === 'HABIT_DETAIL') {
            return <HabitDetail habitId={currentView.habitId} onNavigateBack={() => setCurrentView('HABITS')} onNavigateEdit={() => setCurrentView({ type: 'HABIT_EDIT', habitId: currentView.habitId })} labels={labels} />;
        }
        if (currentView.type === 'PLAN_EDITOR') {
            if (currentView.planType === PlanType.WEEKLY) {
                return <WeeklyPlanBuilder userId={currentUser.id} planId={currentView.planId} periodStart={currentView.periodStart} onNavigateBack={() => setCurrentView('CHECKLISTS')} labels={labels} />;
            } else if (currentView.planType === PlanType.MONTHLY) {
                return <MonthlyPlanBuilder userId={currentUser.id} planId={currentView.planId} periodStart={currentView.periodStart} onNavigateBack={() => setCurrentView('CHECKLISTS')} labels={labels} />;
            } else {
                return <PlanEditor userId={currentUser.id} planId={currentView.planId} planType={currentView.planType} periodStart={currentView.periodStart} onNavigateBack={() => setCurrentView('CHECKLISTS')} labels={labels} />;
            }
        }
        if (currentView.type === 'AI_DRAFTS') {
             return <AIDrafts userId={currentUser.id} periodStart={currentView.periodStart} planType={currentView.planType} onNavigateBack={() => setCurrentView('CHECKLISTS')} labels={labels} />;
        }
        if (currentView.type === 'AI_CHAT') {
            return <AIChat userId={currentUser.id} labels={labels} user={currentUser} onNavigateSettings={() => setCurrentView('SETTINGS')} onNavigate={setCurrentView} initialScenario={currentView.scenario} initialPayload={currentView.payload} />;
        }
        if (currentView.type === 'DAILY_REFLECTION') {
            return <DailyReflection userId={currentUser.id} insight={currentView.insight} onComplete={() => setCurrentView('DASHBOARD')} />;
        }
        if (currentView.type === 'WEEKLY_REVIEW') {
            return <WeeklyReview userId={currentUser.id} insight={currentView.insight} onComplete={() => setCurrentView('DASHBOARD')} />;
        }
        if (currentView.type === 'MONTHLY_REVIEW') {
            return <MonthlyReview userId={currentUser.id} insight={currentView.insight} onComplete={() => setCurrentView('DASHBOARD')} />;
        }
        if (currentView.type === 'LIFE_MAP') {
            return <LifeMapCanvas userId={currentUser.id} onNavigate={setCurrentView} focusGoalId={currentView.focusGoalId} />;
        }
    }

    switch (currentView) {
      case 'DASHBOARD': return <Dashboard user={currentUser} tasks={tasks} onNavigate={setCurrentView} labels={labels} />;
      case 'LIFE_MAP': return <LifeMapCanvas userId={currentUser.id} onNavigate={setCurrentView} />;
      case 'CALENDAR': return <CalendarView userId={currentUser.id} onNavigate={setCurrentView} labels={labels} />;
      case 'TASKS': return <Tasks userId={currentUser.id} onNavigate={setCurrentView} labels={labels} />;
      case 'TASK_CREATE': return <TaskForm userId={currentUser.id} onNavigateBack={() => setCurrentView('TASKS')} labels={labels} />;
      case 'FOCUS': return <FocusTimer labels={labels} onNavigateBack={() => setCurrentView('DASHBOARD')} />;
      case 'AI_CHAT': return <AIChat userId={currentUser.id} labels={labels} user={currentUser} onNavigateSettings={() => setCurrentView('SETTINGS')} onNavigate={setCurrentView} />;
      case 'HABITS': return <Habits userId={currentUser.id} onNavigate={setCurrentView} labels={labels} />;
      case 'HABIT_CREATE': return <HabitForm userId={currentUser.id} onNavigateBack={() => setCurrentView('HABITS')} labels={labels} />;
      case 'CHECKLISTS': return <Checklists userId={currentUser.id} onNavigate={setCurrentView} labels={labels} />;
      case 'GOALS': return <Goals userId={currentUser.id} onNavigate={setCurrentView} labels={labels} />;
      case 'SUGGESTION_LOG': return <SuggestionLog userId={currentUser.id} onNavigateBack={() => setCurrentView('CHECKLISTS')} labels={labels} />;
      case 'SETTINGS': return <Settings user={currentUser} onUpdateUser={setCurrentUser} onLogout={handleLogout} labels={labels} />;
      case 'DEV': return <DevTests />;
      default: return <Dashboard user={currentUser} tasks={tasks} onNavigate={setCurrentView} labels={labels} />;
    }
  };

  return <Layout currentView={currentView} onChangeView={(v) => setCurrentView(v)} labels={labels}>{renderAuthenticatedView()}</Layout>;
};

export default App;