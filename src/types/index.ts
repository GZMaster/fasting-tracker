export type WeekType = 'active' | 'recovery';

export type PhaseType =
  | 'fast_1'
  | 'eating_window_1'
  | 'fast_2'
  | 'daily_eating_window'
  | 'recovery_eating_window';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FastRecord {
  id: string;
  type: 'fast_1' | 'fast_2';
  weekNumber: number;
  startTime: Date;
  endTime: Date;
  completed: boolean;
  duration: number; // in hours
}

export interface MealEntry {
  id: string;
  timestamp: Date;
  mealType: MealType;
  notes: string;
  photoUri?: string;
}

export interface UserSettings {
  eatingWindowStart: string; // "09:00"
  eatingWindowEnd: string; // "21:00"
  currentWeekType: WeekType;
  weekStartDate: Date;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'automatic';
}

export interface PhaseInfo {
  phase: PhaseType;
  startTime: Date;
  endTime: Date;
  timeRemaining: number; // in milliseconds
}

export interface WeightRecord {
  id: string;
  date: Date;
  weight: number; // in kg or lbs
  unit: 'kg' | 'lbs';
}

