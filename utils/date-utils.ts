

import { TaskEntity, RecurrenceRule } from '../types';

export const DateUtils = {
    // Get the start of the week (Monday)
    getStartOfWeek: (date: Date): Date => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    },

    // Get array of dates for the week
    getWeekDays: (startDate: Date): Date[] => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            days.push(d);
        }
        return days;
    },

    // Get array of dates for the month view (grid)
    getMonthDays: (date: Date): Date[] => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const days = [];
        // Add padding days from prev month
        const startDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Mon=0
        for (let i = startDayOfWeek; i > 0; i--) {
            const d = new Date(year, month, 1 - i);
            days.push(d);
        }
        // Current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        // Padding for next month to fill 42 cells (6 rows) or just 35
        const remaining = 42 - days.length;
        for (let i = 1; i <= remaining; i++) {
            const d = new Date(year, month + 1, i);
            days.push(d);
        }
        return days;
    },

    isSameDay: (d1: Date, d2: Date): boolean => {
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    },

    isToday: (d: Date): boolean => {
        const today = new Date();
        return DateUtils.isSameDay(d, today);
    },

    formatTime: (date: Date): string => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    // Extract time components for a specific timezone
    getZonedParts: (ts: number, timeZone: string) => {
        try {
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone,
                year: 'numeric',
                month: 'numeric',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hourCycle: 'h23', // Force 0-23 range to avoid AM/PM confusion
            });
            const parts = formatter.formatToParts(new Date(ts));
            const get = (type: string) => parts.find(p => p.type === type)?.value;
            
            return {
                year: parseInt(get('year') || '0'),
                month: parseInt(get('month') || '1') - 1, // 0-indexed for consistency
                day: parseInt(get('day') || '1'),
                hour: parseInt(get('hour') || '0'),
                minute: parseInt(get('minute') || '0'),
                second: parseInt(get('second') || '0')
            };
        } catch (e) {
            console.warn("Invalid timezone, falling back to local", e);
            const d = new Date(ts);
            return {
                year: d.getFullYear(),
                month: d.getMonth(),
                day: d.getDate(),
                hour: d.getHours(),
                minute: d.getMinutes(),
                second: d.getSeconds()
            };
        }
    },

    // Check if a specific date matches a recurrence rule
    isRecurringMatch: (targetDate: Date, taskStart: Date, rule: RecurrenceRule, timeZone: string = 'Europe/Moscow'): boolean => {
        // 0. Check Excluded Dates
        if (rule.excludedDates && rule.excludedDates.length > 0) {
            const targetDayStart = new Date(targetDate);
            targetDayStart.setHours(0,0,0,0);
            if (rule.excludedDates.includes(targetDayStart.getTime())) {
                return false;
            }
        }

        // 1. Check Start Date constraint
        // Need to compare zoned days
        const targetParts = DateUtils.getZonedParts(targetDate.getTime(), timeZone);
        const startParts = DateUtils.getZonedParts(taskStart.getTime(), timeZone);
        
        const targetDayTs = new Date(targetParts.year, targetParts.month, targetParts.day).getTime();
        const startDayTs = new Date(startParts.year, startParts.month, startParts.day).getTime();

        if (targetDayTs < startDayTs) return false;

        // 2. Check End Date Constraint
        if (rule.endCondition === 'DATE' && rule.endValue && targetDate.getTime() > rule.endValue) {
            return false;
        }

        // 3. Frequency Logic
        const diffDays = Math.round((targetDayTs - startDayTs) / 86400000);
        
        if (rule.freq === 'DAILY') {
            return diffDays % rule.interval === 0;
        }

        if (rule.freq === 'WEEKLY') {
            // Check if within matching week interval
            const diffWeeks = Math.floor(diffDays / 7);
            
            if (diffWeeks % rule.interval !== 0) return false;

            // Check if specific day of week matches
            const dayOfWeek = targetDate.getDay();
            
            if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
                return rule.daysOfWeek.includes(dayOfWeek);
            }
            // If no specific days set, implies same day of week as start date
            return dayOfWeek === taskStart.getDay();
        }

        if (rule.freq === 'MONTHLY') {
            // Check day of month match
            if (targetParts.day !== startParts.day) return false;
            // Interval logic
            const monthDiff = (targetParts.year - startParts.year) * 12 + (targetParts.month - startParts.month);
            return monthDiff % rule.interval === 0;
        }

        return false;
    }
};
