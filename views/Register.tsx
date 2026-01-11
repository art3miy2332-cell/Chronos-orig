import React, { useState } from 'react';
import { UserEntity } from '../types';
import { AuthService } from '../utils/auth';
import { User, Lock, Mail, ArrowRight, ChevronLeft, AlertCircle } from 'lucide-react';

interface RegisterProps {
    onLoginSuccess: (user: UserEntity) => void;
    onNavigateLogin: () => void;
    labels: any;
    currentLang: 'EN' | 'RU';
}

export const Register: React.FC<RegisterProps> = ({ onLoginSuccess, onNavigateLogin, labels, currentLang }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError(currentLang === 'RU' ? "Пароль должен быть не менее 6 символов" : "Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError(currentLang === 'RU' ? "Пароли не совпадают" : "Passwords do not match");
            return;
        }

        setIsLoading(true);

        try {
            const user = AuthService.register(email, password, name, currentLang);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
             <div className="absolute bottom-[-10%] left-[-20%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />
             <div className="absolute top-[-10%] right-[-20%] w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 relative z-10 glass-panel p-8 rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl">
                <button onClick={onNavigateLogin} className="flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors text-sm font-medium mb-2">
                    <ChevronLeft size={18} /> {labels.loginBtn}
                </button>

                <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{labels.registerTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{labels.registerSubtitle}</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={labels.displayName}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={labels.email}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={labels.password}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                required
                            />
                        </div>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder={labels.confirmPassword}
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all dark:text-white placeholder:text-slate-400"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-sm rounded-xl border border-rose-100 dark:border-rose-800 text-center font-medium backdrop-blur-sm animate-in fade-in flex items-center justify-center gap-2">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {labels.registerBtn} <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                 <p className="text-center text-sm text-slate-500 mt-4">
                    {labels.hasAccount} <button onClick={onNavigateLogin} className="text-indigo-600 font-bold hover:underline transition-colors">{labels.loginBtn}</button>
                </p>
            </div>
        </div>
    );
};