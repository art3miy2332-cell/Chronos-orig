

import React, { useEffect, useState } from 'react';
import { SuggestionRepository } from '../data/repositories';
import { Suggestion } from '../domain/models';
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SuggestionStatus } from '../types';

interface SuggestionLogProps {
    userId: string;
    onNavigateBack: () => void;
    labels: any;
}

export const SuggestionLog: React.FC<SuggestionLogProps> = ({ userId, onNavigateBack, labels }) => {
    const [logs, setLogs] = useState<Suggestion[]>([]);

    useEffect(() => {
        const res = SuggestionRepository.getSuggestionsForUser(userId);
        if (res.success) {
            // Sort by acceptedAt/createdAt desc
            const sorted = res.data.sort((a,b) => (b.acceptedAt || b.createdAt) - (a.acceptedAt || a.createdAt));
            setLogs(sorted);
        }
    }, [userId]);

    const getStatusIcon = (status: SuggestionStatus) => {
        switch(status) {
            case SuggestionStatus.ACCEPTED: return <CheckCircle2 size={16} className="text-emerald-500" />;
            case SuggestionStatus.REJECTED: return <XCircle size={16} className="text-rose-500" />;
            default: return <Clock size={16} className="text-slate-400" />;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950">
            <div className="bg-white dark:bg-slate-900 px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-10">
                <button onClick={onNavigateBack} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="font-bold text-lg text-slate-900 dark:text-white">{labels.suggestionLog}</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {logs.length === 0 && <p className="text-center text-slate-400 py-10">No history yet.</p>}

                {logs.map(log => (
                    <div key={log.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{log.text}</h3>
                            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">
                                {getStatusIcon(log.status)}
                                <span className="text-[10px] font-bold text-slate-500">{log.status}</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500">{log.explanation}</p>
                        {log.status === SuggestionStatus.ACCEPTED && (
                            <div className="text-[10px] text-emerald-600 font-medium">
                                Accepted on {new Date(log.acceptedAt!).toLocaleDateString()}
                            </div>
                        )}
                         {log.status === SuggestionStatus.REJECTED && log.rejectionReason && (
                            <div className="text-[10px] text-rose-500 italic">
                                Reason: {log.rejectionReason}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};
