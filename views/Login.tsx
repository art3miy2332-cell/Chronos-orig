import React, { useState } from 'react';
import { UserEntity } from '../types';
import { AuthService } from '../utils/auth';
import { User, Lock, ArrowRight, UserCircle } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: (user: UserEntity) => void;
    onNavigateRegister: () => void;
    labels: any;
    currentLang: 'EN' | 'RU';
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateRegister, labels, currentLang }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const user = AuthService.login(email, password, currentLang);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    const handleGuestLogin = () => {
        setIsLoading(true);
        try {
            const user = AuthService.loginGuest(currentLang);
            onLoginSuccess(user);
        } catch (err: any) {
            setError("Error entering guest mode");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
            <div className="absolute top-[-10%] left-[-20%] w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-20%] w-80 h-80 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-sm space-y-6 animate-spring-up relative z-10 glass-panel p-8 rounded-3xl border border-white/50 dark:border-white/10 shadow-2xl">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4 transform rotate-3">
                        <User className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{labels.loginTitle}</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">{labels.loginSubtitle}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-4">
                        <div className="relative group">
                            <User className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
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
                    </div>

                    {error && (
                        <div className="p-3 bg-rose-50/80 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-sm rounded-xl border border-rose-100 dark:border-rose-800 text-center font-medium backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                            {error}
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
                                {labels.loginBtn} <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase tracking-wider">
                        <span className="px-2 bg-slate-50 dark:bg-slate-900 text-slate-400 font-medium">или</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <button 
                        onClick={handleGuestLogin}
                        className="w-full bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <UserCircle size={16} />
                        {labels.guestBtn}
                    </button>
                </div>

                <p className="text-center text-sm text-slate-500 mt-4">
                    {labels.noAccount} <button onClick={onNavigateRegister} className="text-indigo-600 font-bold hover:underline transition-colors">{labels.registerBtn}</button>
                </p>
            </div>
        </div>
    );
};