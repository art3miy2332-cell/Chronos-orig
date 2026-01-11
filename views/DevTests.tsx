
import React, { useEffect, useState } from 'react';
import { TaskRepository, GoalRepository, HabitRepository, SessionRepository } from '../data/repositories';
import { UseCases } from '../domain/usecases';
import { Priority, EnergyLevel, TaskStatus, GoalStatus, GoalType } from '../types';
import { CheckCircle2, XCircle, Terminal, Play, ClipboardList, AlertTriangle, RefreshCw } from 'lucide-react';
import { AISimulator } from '../utils/ai-simulator';

interface TestResult {
    name: string;
    passed: boolean;
    message?: string;
    priority: 'P0' | 'P1' | 'P2';
}

interface ManualTestCase {
    id: string;
    priority: 'P0' | 'P1' | 'P2';
    category: string;
    condition: string;
    steps: string[];
    expected: string;
}

const MANUAL_TEST_CASES: ManualTestCase[] = [
    {
        id: 'M1',
        priority: 'P1',
        category: 'Goals UI',
        condition: 'Create Goal Wizard',
        steps: ['Open "Goals"', 'Click "+"', 'Fill Title/Desc', 'Click "AI Draft" for Roadmap'],
        expected: 'Roadmap should populate with generated steps within 3 seconds.'
    },
    {
        id: 'M2',
        priority: 'P1',
        category: 'Goals UI',
        condition: 'Calendar Integration',
        steps: ['Link a Task to a Goal', 'Go to Calendar', 'Find Task slot'],
        expected: 'Task should appear. (Future: Task visual style might reflect Goal priority/color).'
    },
    {
        id: 'M3',
        priority: 'P2',
        category: 'AI Features',
        condition: 'Risk Analysis',
        steps: ['Open Goal Detail', 'Click "Запуск" in Risk Analysis card'],
        expected: 'Should show probability % and risk factors.'
    },
    {
        id: 'M4',
        priority: 'P1',
        category: 'Reporting',
        condition: 'Weekly Report',
        steps: ['Open Goal Detail', 'Click "Week Report"'],
        expected: 'Modal opens with AI generated insights and micro-plan.'
    },
    {
        id: 'M5',
        priority: 'P2',
        category: 'Offline',
        condition: 'No Internet',
        steps: ['Disconnect Network', 'Try "AI Draft" in Goal Wizard'],
        expected: 'Should handle gracefully (Mock response or Error toast), app should not crash.'
    }
];

export const DevTests: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
    const [results, setResults] = useState<TestResult[]>([]);
    const [running, setRunning] = useState(false);

    const runTests = async () => {
        setRunning(true);
        const newResults: TestResult[] = [];
        const testUserId = 'qa-user-' + Date.now();

        // Helper to log test
        const assert = (name: string, priority: 'P0'|'P1'|'P2', condition: boolean, message?: string) => {
            newResults.push({ name, priority, passed: condition, message: condition ? 'OK' : message });
        };

        try {
            // --- SETUP ---
            console.log(`[QA] Starting Automated Suite for User ${testUserId}`);

            // 1. Goal Creation (P0)
            const goalId = crypto.randomUUID();
            GoalRepository.create({
                id: goalId,
                ownerId: testUserId,
                title: 'Integration Test Goal',
                description: 'Testing core logic',
                priority: Priority.HIGH,
                energyLevel: EnergyLevel.HIGH,
                status: GoalStatus.ACTIVE,
                type: GoalType.GLOBAL,
                startDate: Date.now(),
                endDate: Date.now() + 86400000 * 30,
                progress: 0,
                tags: ['QA'],
                kpis: [],
                roadmap: [],
                linkedTasksIds: [],
                linkedHabitsIds: [],
                experienceIds: [],
                repairTokensUsed: 0,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            const fetchedGoal = GoalRepository.getById(goalId);
            assert('Goal Creation & Retrieval', 'P0', !!fetchedGoal && fetchedGoal.title === 'Integration Test Goal');

            // 2. Task Linking (P0)
            const taskId = 't-qa-1';
            const createTaskRes = await UseCases.createTask.execute(
                testUserId, 'Linked Task', Priority.MEDIUM, EnergyLevel.MEDIUM, 60
            );
            // Manually link via UseCase
            if (createTaskRes.success) {
                const linkRes = await UseCases.linkTaskToGoal.execute(goalId, createTaskRes.data);
                const updatedGoal = GoalRepository.getById(goalId);
                const updatedTask = TaskRepository.getTaskById(createTaskRes.data);
                
                assert('Link Task to Goal (UseCase)', 'P0', 
                    linkRes.success && 
                    updatedGoal!.linkedTasksIds.includes(createTaskRes.data) &&
                    updatedTask.data.goalId === goalId
                );
            } else {
                assert('Link Task to Goal', 'P0', false, 'Task creation failed');
            }

            // 3. Progress Calculation (P0)
            // Currently progress is 0. We have 1 task linked.
            // Goal Progress formula weights tasks (0.5), habits (0.2), roadmap (0.3).
            // If only tasks exist, they take proportional weight or logic handles empty sections.
            // Our UseCase logic: if activeWeights > 0.
            
            // Mark task as DONE
            if (createTaskRes.success) {
                await UseCases.toggleTask.execute(createTaskRes.data); // Status -> DONE
                // UseCase toggleTask triggers recalcGoalProgress automatically?
                // Let's verify if toggleTask calls recalc.
                // Looking at UseCases.ts -> ToggleTaskStatusUseCase -> yes, it calls recalcGoalProgress.
                
                const goalAfterTask = GoalRepository.getById(goalId);
                // With 1 task (100% done) and nothing else, progress should be high.
                // Weights: Task(0.5). Others empty. 
                // Logic: "Adjust weights if some sections are empty".
                // If habits/roadmap empty, task weight might carry 100% or just its 0.5 part depending on impl.
                // Let's check impl: `if (totalTasks > 0) activeWeights += taskWeight;` 
                // `finalProgress = (raw / activeWeights) * 100` -> So if only tasks, it should be 100%.
                
                assert('Progress Recalc (Task Completion)', 'P0', 
                    (goalAfterTask?.progress || 0) === 100, 
                    `Expected 100%, got ${goalAfterTask?.progress}`
                );
            }

            // 4. Habit Integration & Repair Token (P1)
            const habitRes = await UseCases.createHabit.execute({
                id: crypto.randomUUID(),
                userId: testUserId,
                title: 'QA Habit',
                description: '',
                frequency: 'DAILY' as any,
                importance: Priority.MEDIUM,
                streak: 0,
                history: [],
                repairTokensRemaining: 1,
                active: true,
                createdAt: Date.now(),
                goalId: goalId // Auto-link on creation
            });
            
            if (habitRes.success) {
                const habitId = habitRes.data;
                const goalWithHabit = GoalRepository.getById(goalId);
                // Now we have Task (Done) and Habit (Streak 0).
                // Task(100% * 0.5) + Habit(0% * 0.2) = 0.5 raw. Active Weights = 0.7.
                // Result = 0.5 / 0.7 ~= 71%.
                
                // Let's create a missed day scenario and repair it.
                const yesterday = Date.now() - 86400000;
                const repairRes = await UseCases.useRepairToken.execute(habitId, yesterday);
                
                const repairedHabit = HabitRepository.getHabitById(habitId).data;
                const goalAfterRepair = GoalRepository.getById(goalId);

                assert('Repair Token Usage', 'P1', 
                    repairRes.success && repairedHabit.repairTokensRemaining === 0 && repairedHabit.history.includes(yesterday),
                    "Token not consumed or history not updated"
                );

                assert('Goal Progress Reacts to Habit', 'P1',
                    goalAfterRepair!.progress !== goalWithHabit!.progress,
                    `Progress should change after habit activity. Before: ${goalWithHabit!.progress}, After: ${goalAfterRepair!.progress}`
                );
            }

            // 5. Edge Case: Unlink Task (P2)
            if (createTaskRes.success) {
                await UseCases.unlinkTaskFromGoal.execute(goalId, createTaskRes.data);
                const finalGoal = GoalRepository.getById(goalId);
                assert('Unlink Task', 'P2', 
                    !finalGoal!.linkedTasksIds.includes(createTaskRes.data),
                    "Task ID still in goal list"
                );
            }

        } catch (e: any) {
            assert('CRITICAL SUITE ERROR', 'P0', false, e.message);
        }

        setResults(newResults);
        setRunning(false);
    };

    useEffect(() => {
        // Optional: Auto-run on mount? No, let user trigger.
    }, []);

    return (
        <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-sans">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <Terminal className="text-indigo-400" />
                    <div>
                        <h1 className="text-xl font-bold text-white">System Diagnostics & QA</h1>
                        <p className="text-xs text-slate-500 font-mono">Environment: {process.env.NODE_ENV || 'Development'}</p>
                    </div>
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1">
                    <button 
                        onClick={() => setActiveTab('AUTO')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'AUTO' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Automated Suite
                    </button>
                    <button 
                        onClick={() => setActiveTab('MANUAL')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'MANUAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Manual Checklist
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                
                {activeTab === 'AUTO' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2"><Play size={18} /> Execution Log</h2>
                            <button 
                                onClick={runTests} 
                                disabled={running}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
                            >
                                {running ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                                Run Acceptance Tests
                            </button>
                        </div>

                        <div className="space-y-2">
                            {results.length === 0 && !running && (
                                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl text-slate-500">
                                    Ready to verify Goals Module MVP.
                                </div>
                            )}
                            
                            {results.map((r, i) => (
                                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border bg-slate-900/50 ${r.passed ? 'border-emerald-900/50' : 'border-rose-900/50'}`}>
                                    <div className={`p-2 rounded-full ${r.passed ? 'bg-emerald-900/20 text-emerald-500' : 'bg-rose-900/20 text-rose-500'}`}>
                                        {r.passed ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${r.priority === 'P0' ? 'bg-rose-500 text-white' : r.priority === 'P1' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'}`}>
                                                {r.priority}
                                            </span>
                                            <span className={`font-bold ${r.passed ? 'text-slate-200' : 'text-rose-300'}`}>{r.name}</span>
                                        </div>
                                        {r.message && r.message !== 'OK' && <div className="text-xs text-slate-400 mt-1 font-mono">{r.message}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'MANUAL' && (
                    <div className="max-w-4xl mx-auto">
                        <div className="mb-6 flex items-center gap-2">
                            <ClipboardList className="text-indigo-400" />
                            <h2 className="text-lg font-bold">QA Checklist (Goals MVP)</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {MANUAL_TEST_CASES.map((test) => (
                                <div key={test.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex gap-4">
                                    <div className="flex flex-col items-center gap-2 min-w-[60px]">
                                        <span className="text-xs font-mono text-slate-500">{test.id}</span>
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded w-full text-center ${test.priority === 'P0' ? 'bg-rose-900/50 text-rose-400' : test.priority === 'P1' ? 'bg-amber-900/50 text-amber-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                            {test.priority}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-2">
                                            <h3 className="font-bold text-indigo-300">{test.condition}</h3>
                                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">{test.category}</span>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-3 mb-3 border border-slate-800">
                                            <div className="text-xs text-slate-400 uppercase font-bold mb-1">Steps</div>
                                            <ol className="list-decimal list-inside text-sm text-slate-300 space-y-1">
                                                {test.steps.map((s, i) => <li key={i}>{s}</li>)}
                                            </ol>
                                        </div>
                                        <div className="flex items-start gap-2 text-sm text-emerald-400">
                                            <div className="font-bold shrink-0">Expected:</div>
                                            <div>{test.expected}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
