import React, { useState } from 'react';
import { UserEntity, CoachingProfile } from '../types';
import { Moon, Globe, Bell, User, LogOut, Shield, Save, MessageSquare, Target, Zap, Database, AlertCircle } from 'lucide-react';
import { AuthService } from '../utils/auth';
import { DatabaseService } from '../utils/db';
import { ChatRepository } from '../data/repositories';

interface SettingsProps {
    user: UserEntity;
    onUpdateUser: (updatedUser: UserEntity) => void;
    onLogout: () => void;
    labels: any;
}

export const Settings: React.FC<SettingsProps> = ({ user, onUpdateUser, onLogout, labels }) => {
    const [displayName, setDisplayName] = useState(user.displayName);
    const [isEditing, setIsEditing] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    
    // Coaching State
    const [isEditingCoaching, setIsEditingCoaching] = useState(false);
    const [coachingProfile, setCoachingProfile] = useState<CoachingProfile>(user.coachingProfile || {
        mainGoal: '',
        biggestObstacle: '',
        productiveHours: 'MORNING',
        motivationStyle: 'ANALYTICAL'
    });
    
    const handleSaveProfile = () => {
        const updated: UserEntity = { ...user, displayName };
        AuthService.updateUser(updated);
        onUpdateUser(updated);
        setIsEditing(false);
    };

    const handleSaveCoaching = () => {
        const updated: UserEntity = { ...user, coachingProfile: coachingProfile };
        AuthService.updateUser(updated);
        onUpdateUser(updated);
        setIsEditingCoaching(false);
    };

    const handleToggleTheme = () => {
        const newTheme: 'light' | 'dark' = user.theme === 'light' ? 'dark' : 'light';
        const updated: UserEntity = { ...user, theme: newTheme };
        AuthService.updateUser(updated);
        onUpdateUser(updated);
    };

    const handleLanguageChange = (lang: 'EN' | 'RU') => {
        const updated: UserEntity = { ...user, preferredLanguage: lang };
        AuthService.updateUser(updated);
        onUpdateUser(updated);
    };

    const getDebugInfo = () => {
        const users = DatabaseService.users.getAll();
        const tasks = DatabaseService.tasks.getAll();
        return {
            usersCount: users.length,
            currentUserInDb: !!users.find(u => u.id === user.id),
            tasksCount: tasks.length,
            storageSize: JSON.stringify(localStorage).length
        };
    };

    const SettingRow = ({ icon: Icon, label, children, onClick }: any) => (
        <div 
            onClick={onClick} 
            className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <Icon size={20} />
                </div>
                <span className="font-medium text-slate-900 dark:text-white">{label}</span>
            </div>
            <div onClick={e => e.stopPropagation()}>{children}</div>
        </div>
    );

    return (
        <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-full pb-20">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{labels.profile}</h2>

            {/* User Profile Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-indigo-500/20">
                    {user.displayName.charAt(0).toUpperCase()}
                </div>
                
                {isEditing ? (
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <input 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="text-center text-lg font-bold bg-slate-100 dark:bg-slate-900 border-none rounded p-1 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white w-2/3"
                            autoFocus
                        />
                        <button onClick={handleSaveProfile} className="p-2 bg-indigo-600 text-white rounded-full">
                            <Save size={16} />
                        </button>
                    </div>
                ) : (
                    <div onClick={() => setIsEditing(true)} className="group cursor-pointer">
                         <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2">
                            {user.displayName}
                            {user.isGuest && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">{labels.guestMode}</span>}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            {user.email || 'Local Guest Session'}
                        </p>
                    </div>
                )}
            </div>

            {/* Coaching Calibration */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                     <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Zap size={14} /> Настройка Коучинга
                     </h3>
                     {isEditingCoaching && (
                         <button onClick={handleSaveCoaching} className="text-xs font-bold text-indigo-600">Сохранить</button>
                     )}
                </div>

                <div className={`bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4 ${isEditingCoaching ? 'ring-2 ring-indigo-500' : ''}`}>
                    {!isEditingCoaching ? (
                         <div onClick={() => setIsEditingCoaching(true)} className="cursor-pointer space-y-3">
                            <div>
                                <div className="text-xs text-slate-400 uppercase font-bold">Главная цель</div>
                                <div className="text-slate-900 dark:text-white font-medium">{coachingProfile.mainGoal || "Не указана"}</div>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 px-2 py-1 rounded-full font-bold">{coachingProfile.productiveHours}</span>
                                <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 px-2 py-1 rounded-full font-bold">
                                    {coachingProfile.motivationStyle}
                                </span>
                            </div>
                         </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold">Главная Цель</label>
                                <input 
                                    value={coachingProfile.mainGoal}
                                    onChange={e => setCoachingProfile({...coachingProfile, mainGoal: e.target.value})}
                                    className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Пик активности</label>
                                    <select 
                                        value={coachingProfile.productiveHours}
                                        onChange={e => setCoachingProfile({...coachingProfile, productiveHours: e.target.value as any})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm dark:text-white"
                                    >
                                        <option value="MORNING">Утро</option>
                                        <option value="AFTERNOON">День</option>
                                        <option value="NIGHT">Ночь</option>
                                    </select>
                                </div>
                                 <div>
                                    <label className="text-xs text-slate-400 uppercase font-bold">Стиль</label>
                                    <select 
                                        value={coachingProfile.motivationStyle}
                                        onChange={e => setCoachingProfile({...coachingProfile, motivationStyle: e.target.value as any})}
                                        className="w-full bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700 text-sm dark:text-white"
                                    >
                                        <option value="ANALYTICAL">Аналитический</option>
                                        <option value="GENTLE_SUPPORT">Мягкий</option>
                                        <option value="TOUGH_LOVE">Жесткий</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-6">Общие настройки</h3>
            <div className="space-y-3">
                <SettingRow icon={Moon} label={labels.theme}>
                    <button 
                        onClick={handleToggleTheme}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${user.theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${user.theme === 'dark' ? 'translate-x-6' : ''}`} />
                    </button>
                </SettingRow>

                <SettingRow icon={Globe} label={labels.language}>
                    <select 
                        value={user.preferredLanguage}
                        onChange={(e) => handleLanguageChange(e.target.value as 'EN' | 'RU')}
                        className="bg-transparent text-slate-900 dark:text-white font-medium outline-none text-right cursor-pointer"
                    >
                        <option value="EN" className="text-black">English</option>
                        <option value="RU" className="text-black">Русский</option>
                    </select>
                </SettingRow>
            </div>

            {/* Debugging Section */}
            <div className="pt-4">
                <button 
                    onClick={() => setShowDebug(!showDebug)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-500 transition-colors uppercase px-1"
                >
                    <Database size={14} /> Отладка данных {showDebug ? '▲' : '▼'}
                </button>
                
                {showDebug && (
                    <div className="mt-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 animate-in slide-in-from-top-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Пользователей в базе:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{getDebugInfo().usersCount}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Текущий сеанс валиден:</span>
                            <span className={`font-bold ${getDebugInfo().currentUserInDb ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {getDebugInfo().currentUserInDb ? 'Да' : 'Нет (Данные потеряны!)'}
                            </span>
                        </div>
                        {!getDebugInfo().currentUserInDb && (
                             <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded text-[10px] text-rose-600 flex items-start gap-2">
                                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                                <span>Ваш аккаунт не найден в общем списке. Это значит, что браузер очистил хранилище или произошла ошибка записи.</span>
                             </div>
                        )}
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Размер данных:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{(getDebugInfo().storageSize / 1024).toFixed(1)} KB</span>
                        </div>
                    </div>
                )}
            </div>

            <button 
                onClick={onLogout}
                className="w-full mt-8 p-4 rounded-xl border border-rose-100 dark:border-rose-900 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
            >
                <LogOut size={20} /> {labels.logout}
            </button>
            
            <div className="text-center pt-4">
                 <p className="text-xs text-slate-400">Chronos v0.2.5 (Persistent Core)</p>
            </div>
        </div>
    );
};