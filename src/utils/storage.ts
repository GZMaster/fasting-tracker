import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastRecord, MealEntry, UserSettings, WeightRecord } from '../types';

const STORAGE_KEYS = {
  FAST_HISTORY: '@fasting_tracker:fast_history',
  MEAL_ENTRIES: '@fasting_tracker:meal_entries',
  SETTINGS: '@fasting_tracker:settings',
  WEIGHT_RECORDS: '@fasting_tracker:weight_records',
} as const;

// Default settings
export const getDefaultSettings = (): UserSettings => {
  const now = new Date();
  // Set week start to beginning of current week (Monday)
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
  weekStart.setHours(0, 0, 0, 0);

  return {
    eatingWindowStart: '09:00',
    eatingWindowEnd: '21:00',
    currentWeekType: 'active',
    weekStartDate: weekStart,
    notificationsEnabled: true,
    theme: 'automatic',
  };
};

// Fast History Storage
export async function saveFastHistory(fasts: FastRecord[]): Promise<void> {
  try {
    const serialized = fasts.map((fast) => ({
      ...fast,
      startTime: fast.startTime.toISOString(),
      endTime: fast.endTime.toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.FAST_HISTORY, JSON.stringify(serialized));
  } catch (error) {
    console.error('Error saving fast history:', error);
    throw error;
  }
}

export async function loadFastHistory(): Promise<FastRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FAST_HISTORY);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return parsed.map((fast: any) => ({
      ...fast,
      startTime: new Date(fast.startTime),
      endTime: new Date(fast.endTime),
    }));
  } catch (error) {
    console.error('Error loading fast history:', error);
    return [];
  }
}

// Meal Entries Storage
export async function saveMealEntries(meals: MealEntry[]): Promise<void> {
  try {
    const serialized = meals.map((meal) => ({
      ...meal,
      timestamp: meal.timestamp.toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_ENTRIES, JSON.stringify(serialized));
  } catch (error) {
    console.error('Error saving meal entries:', error);
    throw error;
  }
}

export async function loadMealEntries(): Promise<MealEntry[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_ENTRIES);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return parsed.map((meal: any) => ({
      ...meal,
      timestamp: new Date(meal.timestamp),
    }));
  } catch (error) {
    console.error('Error loading meal entries:', error);
    return [];
  }
}

// Settings Storage
export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    const serialized = {
      ...settings,
      weekStartDate: settings.weekStartDate.toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(serialized));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function loadSettings(): Promise<UserSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      const defaults = getDefaultSettings();
      await saveSettings(defaults);
      return defaults;
    }

    const parsed = JSON.parse(data);
    return {
      ...parsed,
      weekStartDate: new Date(parsed.weekStartDate),
      notificationsEnabled: Boolean(parsed.notificationsEnabled),
    };
  } catch (error) {
    console.error('Error loading settings:', error);
    return getDefaultSettings();
  }
}

// Weight Records Storage
export async function saveWeightRecords(weights: WeightRecord[]): Promise<void> {
  try {
    const serialized = weights.map((weight) => ({
      ...weight,
      date: weight.date.toISOString(),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHT_RECORDS, JSON.stringify(serialized));
  } catch (error) {
    console.error('Error saving weight records:', error);
    throw error;
  }
}

export async function loadWeightRecords(): Promise<WeightRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEIGHT_RECORDS);
    if (!data) return [];

    const parsed = JSON.parse(data);
    return parsed.map((weight: any) => ({
      ...weight,
      date: new Date(weight.date),
    }));
  } catch (error) {
    console.error('Error loading weight records:', error);
    return [];
  }
}

// Clear all data (for reset functionality)
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.FAST_HISTORY,
      STORAGE_KEYS.MEAL_ENTRIES,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.WEIGHT_RECORDS,
    ]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

