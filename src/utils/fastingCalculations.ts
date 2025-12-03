import { differenceInMilliseconds, addHours, addDays, startOfDay, parse, format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import type { WeekType, PhaseType, UserSettings, PhaseInfo, ManualTimerAdjustment } from '../types';

const FAST_1_DURATION_HOURS = 36;
const FAST_2_DURATION_HOURS = 36;
const EATING_WINDOW_1_DURATION_HOURS = 12;

/**
 * Determines if the current week is 'active' (fasting week) or 'recovery' based on 2-week cycle
 */
export function getWeekType(weekStartDate: Date, currentDate: Date): WeekType {
  const weeksSinceStart = Math.floor(
    differenceInMilliseconds(currentDate, weekStartDate) / (7 * 24 * 60 * 60 * 1000)
  );
  // Even weeks (0, 2, 4...) are active, odd weeks (1, 3, 5...) are recovery
  return weeksSinceStart % 2 === 0 ? 'active' : 'recovery';
}

/**
 * Parses time string (HH:mm) and returns hours and minutes
 */
function parseTime(timeString: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
}

/**
 * Checks if current time is within the eating window
 */
export function isInEatingWindow(currentDate: Date, settings: UserSettings): boolean {
  const { hours: startHours, minutes: startMinutes } = parseTime(settings.eatingWindowStart);
  const { hours: endHours, minutes: endMinutes } = parseTime(settings.eatingWindowEnd);

  const today = startOfDay(currentDate);
  const windowStart = new Date(today);
  windowStart.setHours(startHours, startMinutes, 0, 0);

  const windowEnd = new Date(today);
  windowEnd.setHours(endHours, endMinutes, 0, 0);

  // Handle case where eating window spans midnight
  if (endHours < startHours || (endHours === startHours && endMinutes < startMinutes)) {
    if (isAfter(currentDate, windowStart) || isBefore(currentDate, windowEnd)) {
      return true;
    }
  } else {
    if (isAfter(currentDate, windowStart) && isBefore(currentDate, windowEnd)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const dayOfWeek = (date.getDay() + 6) % 7; // Convert Sunday (0) to 6, Monday (0) to 0
  weekStart.setDate(date.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Calculates the current phase based on week type and current time
 * Optionally accepts a manual adjustment that overrides the automatic calculation
 */
export function getCurrentPhase(
  weekStartDate: Date,
  currentDate: Date,
  settings: UserSettings,
  manualAdjustment?: ManualTimerAdjustment | null
): PhaseInfo {
  // If there's a manual adjustment and we're within its time range, use it
  if (manualAdjustment) {
    const now = currentDate.getTime();
    const adjustmentStart = manualAdjustment.startTime.getTime();
    const adjustmentEnd = manualAdjustment.endTime.getTime();

    // Check if adjustment has expired
    if (manualAdjustment.expiresAt && currentDate > manualAdjustment.expiresAt) {
      // Adjustment expired, fall through to automatic calculation
    } else if (now >= adjustmentStart && now <= adjustmentEnd) {
      // We're within the manual adjustment period
      return {
        phase: manualAdjustment.phase,
        startTime: manualAdjustment.startTime,
        endTime: manualAdjustment.endTime,
        timeRemaining: calculateTimeRemaining(currentDate, manualAdjustment.endTime),
        isManualAdjustment: true,
      };
    } else if (now < adjustmentStart) {
      // We're before the manual adjustment starts
      // Return a phase that shows we're waiting for the manual adjustment
      return {
        phase: manualAdjustment.phase,
        startTime: manualAdjustment.startTime,
        endTime: manualAdjustment.endTime,
        timeRemaining: calculateTimeRemaining(currentDate, manualAdjustment.startTime),
        isManualAdjustment: true,
      };
    }
    // If we're past the adjustment, fall through to automatic calculation
  }
  const weekType = getWeekType(weekStartDate, currentDate);
  const weekStart = getWeekStart(weekStartDate);
  const currentWeekStart = getWeekStart(currentDate);

  // If we're in a different week than the stored weekStartDate, adjust
  const adjustedWeekStart =
    currentWeekStart.getTime() === weekStart.getTime()
      ? weekStart
      : getWeekStartForWeek(weekStartDate, currentDate);

  if (weekType === 'recovery') {
    // Recovery week: only eating windows
    return {
      phase: 'recovery_eating_window',
      startTime: getDayStart(currentDate),
      endTime: getDayEnd(currentDate),
      timeRemaining: calculateTimeRemaining(currentDate, getDayEnd(currentDate)),
    };
  }

  // Active week logic
  const fast1Start = new Date(adjustedWeekStart);
  fast1Start.setHours(0, 0, 0, 0);

  const fast1End = addHours(fast1Start, FAST_1_DURATION_HOURS);
  const eatingWindow1End = addHours(fast1End, EATING_WINDOW_1_DURATION_HOURS);
  const fast2End = addHours(eatingWindow1End, FAST_2_DURATION_HOURS);

  // Calculate when the extended fasts end (in days from week start)
  const fast1EndDay = Math.floor(FAST_1_DURATION_HOURS / 24);
  const fast2EndDay = Math.floor((FAST_1_DURATION_HOURS + EATING_WINDOW_1_DURATION_HOURS + FAST_2_DURATION_HOURS) / 24);

  if (isBefore(currentDate, fast1End)) {
    // Fast 1
    return {
      phase: 'fast_1',
      startTime: fast1Start,
      endTime: fast1End,
      timeRemaining: calculateTimeRemaining(currentDate, fast1End),
    };
  }

  if (isBefore(currentDate, eatingWindow1End)) {
    // Eating Window 1
    return {
      phase: 'eating_window_1',
      startTime: fast1End,
      endTime: eatingWindow1End,
      timeRemaining: calculateTimeRemaining(currentDate, eatingWindow1End),
    };
  }

  if (isBefore(currentDate, fast2End)) {
    // Fast 2
    return {
      phase: 'fast_2',
      startTime: eatingWindow1End,
      endTime: fast2End,
      timeRemaining: calculateTimeRemaining(currentDate, fast2End),
    };
  }

  // After Fast 2, check if we're in daily eating window
  const dayOfWeek = currentDate.getDay();
  const dayStart = getDayStart(currentDate);
  const { hours: startHours, minutes: startMinutes } = parseTime(settings.eatingWindowStart);
  const { hours: endHours, minutes: endMinutes } = parseTime(settings.eatingWindowEnd);

  const eatingWindowStart = new Date(dayStart);
  eatingWindowStart.setHours(startHours, startMinutes, 0, 0);

  const eatingWindowEnd = new Date(dayStart);
  eatingWindowEnd.setHours(endHours, endMinutes, 0, 0);

  if (isInEatingWindow(currentDate, settings)) {
    return {
      phase: 'daily_eating_window',
      startTime: eatingWindowStart,
      endTime: eatingWindowEnd,
      timeRemaining: calculateTimeRemaining(currentDate, eatingWindowEnd),
    };
  }

  // Outside eating window but after fasts - this is a fasting period between daily eating windows
  // Find next eating window
  const nextEatingWindow = new Date(eatingWindowStart);
  if (isAfter(currentDate, eatingWindowEnd)) {
    nextEatingWindow.setDate(nextEatingWindow.getDate() + 1);
  }

  return {
    phase: 'daily_eating_window', // We'll treat this as waiting for next eating window
    startTime: nextEatingWindow,
    endTime: addHours(nextEatingWindow, 12),
    timeRemaining: calculateTimeRemaining(currentDate, nextEatingWindow),
  };
}

/**
 * Gets the week start date for the week containing the current date
 */
function getWeekStartForWeek(originalWeekStart: Date, currentDate: Date): Date {
  const currentWeekStart = getWeekStart(currentDate);
  const weeksDiff = Math.floor(
    differenceInMilliseconds(currentWeekStart, getWeekStart(originalWeekStart)) / (7 * 24 * 60 * 60 * 1000)
  );
  return addDays(getWeekStart(originalWeekStart), weeksDiff * 7);
}

/**
 * Gets the start of a day (midnight)
 */
function getDayStart(date: Date): Date {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  return dayStart;
}

/**
 * Gets the end of a day (23:59:59.999)
 */
function getDayEnd(date: Date): Date {
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return dayEnd;
}

/**
 * Calculates time remaining in milliseconds
 */
function calculateTimeRemaining(currentDate: Date, endDate: Date): number {
  const remaining = differenceInMilliseconds(endDate, currentDate);
  return Math.max(0, remaining);
}

/**
 * Gets the next phase in sequence
 */
export function getNextPhase(currentPhase: PhaseType): PhaseType {
  switch (currentPhase) {
    case 'fast_1':
      return 'eating_window_1';
    case 'eating_window_1':
      return 'fast_2';
    case 'fast_2':
      return 'daily_eating_window';
    case 'daily_eating_window':
      return 'daily_eating_window'; // Next eating window
    case 'recovery_eating_window':
      return 'recovery_eating_window'; // Next eating window
    default:
      return currentPhase;
  }
}

/**
 * Generates a complete schedule for a week
 */
export function calculateFastSchedule(weekStartDate: Date, weekType: WeekType): Array<{
  date: Date;
  phase: PhaseType;
  startTime: Date;
  endTime: Date;
}> {
  const schedule: Array<{
    date: Date;
    phase: PhaseType;
    startTime: Date;
    endTime: Date;
  }> = [];

  const weekStart = getWeekStart(weekStartDate);

  if (weekType === 'recovery') {
    // Recovery week: 7 days of eating windows
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayStart = getDayStart(day);
      schedule.push({
        date: day,
        phase: 'recovery_eating_window',
        startTime: dayStart,
        endTime: getDayEnd(day),
      });
    }
  } else {
    // Active week
    const fast1Start = new Date(weekStart);
    const fast1End = addHours(fast1Start, FAST_1_DURATION_HOURS);
    const eatingWindow1End = addHours(fast1End, EATING_WINDOW_1_DURATION_HOURS);
    const fast2End = addHours(eatingWindow1End, FAST_2_DURATION_HOURS);

    schedule.push({
      date: fast1Start,
      phase: 'fast_1',
      startTime: fast1Start,
      endTime: fast1End,
    });

    schedule.push({
      date: fast1End,
      phase: 'eating_window_1',
      startTime: fast1End,
      endTime: eatingWindow1End,
    });

    schedule.push({
      date: eatingWindow1End,
      phase: 'fast_2',
      startTime: eatingWindow1End,
      endTime: fast2End,
    });

    // Add daily eating windows for remaining days
    const fast2EndDay = Math.floor(fast2End.getTime() / (24 * 60 * 60 * 1000));
    const weekEndDay = Math.floor((weekStart.getTime() + 7 * 24 * 60 * 60 * 1000) / (24 * 60 * 60 * 1000));

    for (let day = fast2EndDay; day < weekEndDay; day++) {
      const dayDate = new Date(day * 24 * 60 * 60 * 1000);
      schedule.push({
        date: dayDate,
        phase: 'daily_eating_window',
        startTime: getDayStart(dayDate),
        endTime: getDayEnd(dayDate),
      });
    }
  }

  return schedule;
}

/**
 * Checks if meal logging is allowed for the current phase
 */
export function canLogMeal(phase: PhaseType): boolean {
  return (
    phase === 'eating_window_1' ||
    phase === 'daily_eating_window' ||
    phase === 'recovery_eating_window'
  );
}

/**
 * Formats time remaining as HH:MM:SS
 */
export function formatTimeRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Gets phase display name
 */
export function getPhaseDisplayName(phase: PhaseType): string {
  switch (phase) {
    case 'fast_1':
      return 'Fast 1';
    case 'eating_window_1':
      return 'Eating Window 1';
    case 'fast_2':
      return 'Fast 2';
    case 'daily_eating_window':
      return 'Daily Eating Window';
    case 'recovery_eating_window':
      return 'Recovery Eating Window';
    default:
      return 'Unknown';
  }
}

