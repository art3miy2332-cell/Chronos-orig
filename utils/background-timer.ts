
import { TimerState, TimerStatus, FocusMode, FocusConfig } from '../types';
import { UseCases } from '../domain/usecases';
import { NotificationHelper } from './notifications';
import { TaskEntity } from '../types';
import { TaskRepository } from '../data/repositories';

// Default Config
const DEFAULT_CONFIG: FocusConfig = {
    focusDurationMin: 25,
    shortBreakDurationMin: 5,
    longBreakDurationMin: 15,
    longBreakInterval: 4
};

const STORAGE_KEY = 'chronos_current_session';
const CONFIG_KEY = 'chronos_focus_config';

// This class simulates the Android Foreground Service + Persistent Store
// It uses Date.now() to calculate time diffs, ensuring accuracy even if the browser sleeps.
class BackgroundTimerService {
    private state: TimerState;
    private config: FocusConfig = DEFAULT_CONFIG;
    private intervalId: any = null;
    private listeners: ((state: TimerState) => void)[] = [];

    // Pending DB ID
    private dbSessionId: string | null = null;
    private userId: string | null = null;

    constructor() {
        this.state = {
            status: 'IDLE',
            mode: 'FOCUS',
            timeLeft: DEFAULT_CONFIG.focusDurationMin * 60,
            totalDuration: DEFAULT_CONFIG.focusDurationMin * 60,
            interruptions: 0,
            pomodorosCompleted: 0
        };
        this.restoreState();
        this.restoreConfig();
    }

    public getState(): TimerState {
        return { ...this.state };
    }
    
    public getConfig(): FocusConfig {
        return { ...this.config };
    }

    public setUserId(id: string) {
        this.userId = id;
    }

    public subscribe(callback: (state: TimerState) => void): () => void {
        this.listeners.push(callback);
        // Send a copy immediately
        callback({ ...this.state });
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    private notify() {
        // CRITICAL FIX: Emit a COPY of the state object.
        // React's useState will ignore updates if the object reference is the same.
        const stateCopy = { ...this.state };
        this.listeners.forEach(l => l(stateCopy));
        this.persistState(); // Auto-save on state change
    }

    // --- Configuration ---

    public updateConfig(newConfig: FocusConfig) {
        this.config = { ...this.config, ...newConfig };
        localStorage.setItem(CONFIG_KEY, JSON.stringify(this.config));
        
        // If IDLE, apply new duration immediately
        if (this.state.status === 'IDLE') {
            this.resetState();
        }
    }

    private restoreConfig() {
        const saved = localStorage.getItem(CONFIG_KEY);
        if (saved) {
            try {
                this.config = JSON.parse(saved);
                // Update idle state if needed to match restored config
                if (this.state.status === 'IDLE' && this.state.mode === 'FOCUS') {
                    this.state.timeLeft = this.config.focusDurationMin * 60;
                    this.state.totalDuration = this.config.focusDurationMin * 60;
                }
            } catch (e) {
                console.error("Failed to restore focus config");
            }
        }
    }

    // --- Actions ---

    public async startSession(taskId?: string) {
        // Fallback: If userId not set yet (rare race condition), try to grab from localStorage
        if (!this.userId) {
             const sessionStr = localStorage.getItem('chronos_active_session');
             if (sessionStr) this.userId = sessionStr;
             else console.warn("BackgroundTimer: No userId set, session cannot start correctly in DB.");
        }

        // Clean state for new session
        this.state.status = 'RUNNING';
        this.state.mode = 'FOCUS';
        
        // Use current config
        this.state.timeLeft = this.config.focusDurationMin * 60;
        this.state.totalDuration = this.config.focusDurationMin * 60;
        
        this.state.interruptions = 0;
        this.state.taskId = taskId;
        
        // Fetch Task Title
        if (taskId) {
            const res = TaskRepository.getTaskById(taskId);
            if (res.success) {
                this.state.taskTitle = res.data.title;
            }
        } else {
            this.state.taskTitle = undefined;
        }

        // DB Call
        if (this.userId) {
            const res = await UseCases.startSession.execute(this.userId, taskId || null);
            if (res.success) {
                this.dbSessionId = res.data;
                this.state.sessionId = res.data;
            }
        }

        this.startTicker();
        this.notify();
        NotificationHelper.requestPermission();
    }

    public pause() {
        if (this.state.status !== 'RUNNING') return;
        this.state.status = 'PAUSED';
        this.stopTicker();
        this.notify();
    }

    public resume() {
        if (this.state.status !== 'PAUSED') return;
        this.state.status = 'RUNNING';
        this.startTicker();
        this.notify();
    }

    public async stop(save: boolean) {
        this.stopTicker();
        
        if (save && this.dbSessionId) {
             // Calculate duration
             const totalSecs = this.state.totalDuration - this.state.timeLeft; // Approximate for prototype
             const durationMin = Math.ceil(totalSecs / 60);
             
             await UseCases.stopSession.execute(this.dbSessionId, durationMin > 0 ? durationMin : 1);
        }

        this.resetState();
    }

    public recordInterruption() {
        this.state.interruptions++;
        if (this.dbSessionId) {
            UseCases.recordInterruption.execute(this.dbSessionId);
        }
        this.notify();
    }

    public skip() {
        this.handleTimerFinished(true); // Treat as finished but forced
    }

    // --- Ticker Logic ---

    private expectedEndTime: number | null = null;

    private startTicker() {
        if (this.intervalId) clearInterval(this.intervalId);
        
        // Calculate when we expect to finish based on current timeLeft
        this.expectedEndTime = Date.now() + (this.state.timeLeft * 1000);
        this.persistState(); // Save the expected end time

        this.intervalId = setInterval(() => {
            if (!this.expectedEndTime) return;

            const now = Date.now();
            const diff = Math.ceil((this.expectedEndTime - now) / 1000);

            if (diff <= 0) {
                this.state.timeLeft = 0;
                this.handleTimerFinished();
            } else {
                this.state.timeLeft = diff;
                this.notify(); // Updates UI
            }
        }, 1000);
    }

    private stopTicker() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
        this.expectedEndTime = null;
        this.persistState();
    }

    private handleTimerFinished(skipped = false) {
        this.stopTicker();
        this.state.status = 'FINISHED';

        if (this.state.mode === 'FOCUS' && !skipped) {
            this.state.pomodorosCompleted++;
        }

        NotificationHelper.show(
            "Chronos Timer", 
            this.state.mode === 'FOCUS' ? "Focus session complete! Take a break." : "Break over! Ready to focus?"
        );
        
        // Play sound (simulated)
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(() => {});

        this.notify();
    }

    public startNextInterval() {
        // Logic to switch modes
        if (this.state.mode === 'FOCUS') {
            const isLongBreak = this.state.pomodorosCompleted > 0 && this.state.pomodorosCompleted % this.config.longBreakInterval === 0;
            this.state.mode = isLongBreak ? 'LONG_BREAK' : 'SHORT_BREAK';
            this.state.timeLeft = (isLongBreak ? this.config.longBreakDurationMin : this.config.shortBreakDurationMin) * 60;
        } else {
            this.state.mode = 'FOCUS';
            this.state.timeLeft = this.config.focusDurationMin * 60;
        }
        
        this.state.totalDuration = this.state.timeLeft;
        this.state.status = 'RUNNING';
        this.startTicker();
        this.notify();
    }

    // --- Persistence ---

    private persistState() {
        const payload = {
            state: this.state,
            expectedEndTime: this.expectedEndTime,
            dbSessionId: this.dbSessionId,
            lastUpdated: Date.now()
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    private restoreState() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        try {
            const data = JSON.parse(raw);
            this.dbSessionId = data.dbSessionId;
            this.state = data.state;
            
            // If it was running, calculate accurate timeLeft based on wall clock
            if (this.state.status === 'RUNNING' && data.expectedEndTime) {
                const now = Date.now();
                const diff = Math.ceil((data.expectedEndTime - now) / 1000);
                
                if (diff <= 0) {
                    this.state.timeLeft = 0;
                    this.state.status = 'FINISHED';
                } else {
                    this.state.timeLeft = diff;
                    this.expectedEndTime = data.expectedEndTime;
                    this.startTicker(); // Auto-resume
                }
            } else if (this.state.status === 'PAUSED') {
                // Just keep the saved timeLeft
            }
        } catch (e) {
            console.error("Failed to restore timer state", e);
        }
    }

    private resetState() {
        this.state.status = 'IDLE';
        this.state.mode = 'FOCUS';
        // Reset to configured Focus duration
        this.state.timeLeft = this.config.focusDurationMin * 60;
        this.state.totalDuration = this.config.focusDurationMin * 60;
        
        this.state.interruptions = 0;
        this.state.sessionId = undefined;
        this.state.taskId = undefined;
        this.state.taskTitle = undefined;
        this.dbSessionId = null;
        this.persistState();
        this.notify();
    }
}

export const BackgroundTimer = new BackgroundTimerService();
