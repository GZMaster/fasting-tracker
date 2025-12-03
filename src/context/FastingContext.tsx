import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import type { FastRecord, MealEntry, UserSettings, PhaseInfo, WeightRecord, ManualTimerAdjustment, CalendarEvent } from '../types';
import { getCurrentPhase } from '../utils/fastingCalculations';
import {
  loadFastHistory,
  saveFastHistory,
  loadMealEntries,
  saveMealEntries,
  loadSettings,
  saveSettings,
  loadWeightRecords,
  saveWeightRecords,
  loadManualAdjustments,
  saveManualAdjustments,
  loadCalendarEvents,
  saveCalendarEvents,
} from '../utils/storage';
import { schedulePhaseNotifications, requestNotificationPermissions } from '../utils/notifications';
import { createCalendarEvent as createNativeCalendarEvent, requestCalendarPermissions, hasCalendarPermissions } from '../utils/calendar';

interface FastingState {
  currentPhase: PhaseInfo | null;
  fastHistory: FastRecord[];
  mealEntries: MealEntry[];
  weightRecords: WeightRecord[];
  settings: UserSettings;
  manualAdjustment: ManualTimerAdjustment | null;
  calendarEvents: CalendarEvent[];
  isInitialized: boolean;
}

type FastingAction =
  | { type: 'SET_PHASE'; payload: PhaseInfo }
  | { type: 'ADD_FAST'; payload: FastRecord }
  | { type: 'UPDATE_FAST'; payload: FastRecord }
  | { type: 'ADD_MEAL'; payload: MealEntry }
  | { type: 'DELETE_MEAL'; payload: string }
  | { type: 'ADD_WEIGHT'; payload: WeightRecord }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<UserSettings> }
  | { type: 'SET_MANUAL_ADJUSTMENT'; payload: ManualTimerAdjustment | null }
  | { type: 'ADD_CALENDAR_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_CALENDAR_EVENT'; payload: CalendarEvent }
  | { type: 'LOAD_DATA'; payload: { fasts: FastRecord[]; meals: MealEntry[]; weights: WeightRecord[]; settings: UserSettings; adjustments: ManualTimerAdjustment[]; calendarEvents: CalendarEvent[] } }
  | { type: 'SET_INITIALIZED'; payload: boolean };

const initialState: FastingState = {
  currentPhase: null,
  fastHistory: [],
  mealEntries: [],
  weightRecords: [],
  settings: {
    eatingWindowStart: '09:00',
    eatingWindowEnd: '21:00',
    currentWeekType: 'active',
    weekStartDate: new Date(),
    notificationsEnabled: true,
    theme: 'automatic',
  },
  manualAdjustment: null,
  calendarEvents: [],
  isInitialized: false,
};

function fastingReducer(state: FastingState, action: FastingAction): FastingState {
  switch (action.type) {
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    case 'ADD_FAST':
      return { ...state, fastHistory: [...state.fastHistory, action.payload] };
    case 'UPDATE_FAST':
      return {
        ...state,
        fastHistory: state.fastHistory.map((fast) =>
          fast.id === action.payload.id ? action.payload : fast
        ),
      };
    case 'ADD_MEAL':
      return { ...state, mealEntries: [...state.mealEntries, action.payload] };
    case 'DELETE_MEAL':
      return {
        ...state,
        mealEntries: state.mealEntries.filter((meal) => meal.id !== action.payload),
      };
    case 'ADD_WEIGHT':
      return { ...state, weightRecords: [...state.weightRecords, action.payload] };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_MANUAL_ADJUSTMENT':
      return { ...state, manualAdjustment: action.payload };
    case 'ADD_CALENDAR_EVENT':
      return { ...state, calendarEvents: [...state.calendarEvents, action.payload] };
    case 'UPDATE_CALENDAR_EVENT':
      return {
        ...state,
        calendarEvents: state.calendarEvents.map((event) =>
          event.id === action.payload.id ? action.payload : event
        ),
      };
    case 'LOAD_DATA':
      return {
        ...state,
        fastHistory: action.payload.fasts,
        mealEntries: action.payload.meals,
        weightRecords: action.payload.weights,
        settings: action.payload.settings,
        manualAdjustment: action.payload.adjustments.find((adj) => {
          const now = new Date();
          return (!adj.expiresAt || now <= adj.expiresAt) && now <= adj.endTime;
        }) || null,
        calendarEvents: action.payload.calendarEvents,
        isInitialized: true,
      };
    case 'SET_INITIALIZED':
      return { ...state, isInitialized: action.payload };
    default:
      return state;
  }
}

interface FastingContextType {
  state: FastingState;
  updatePhase: () => void;
  addFast: (fast: FastRecord) => Promise<void>;
  updateFast: (fast: FastRecord) => Promise<void>;
  addMeal: (meal: MealEntry) => Promise<void>;
  deleteMeal: (mealId: string) => Promise<void>;
  addWeight: (weight: WeightRecord) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  setManualTimer: (startTime: Date, endTime: Date, phase: PhaseInfo['phase']) => Promise<void>;
  clearManualTimer: () => Promise<void>;
  syncToCalendar: (event: Omit<CalendarEvent, 'id' | 'synced' | 'eventId'>) => Promise<boolean>;
  refreshData: () => Promise<void>;
}

const FastingContext = createContext<FastingContextType | undefined>(undefined);

export function FastingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(fastingReducer, initialState);

  // Load initial data
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [fasts, meals, weights, settings, adjustments, calendarEvents] = await Promise.all([
          loadFastHistory(),
          loadMealEntries(),
          loadWeightRecords(),
          loadSettings(),
          loadManualAdjustments(),
          loadCalendarEvents(),
        ]);

        dispatch({
          type: 'LOAD_DATA',
          payload: { fasts, meals, weights, settings, adjustments, calendarEvents },
        });

        // Check calendar permissions (non-blocking)
        hasCalendarPermissions().catch(() => {
          // Silently fail - permissions will be requested when user tries to sync
        });

        // Calculate initial phase
        const currentDate = new Date();
        const activeAdjustment = adjustments.find((adj) => {
          const now = new Date();
          return (!adj.expiresAt || now <= adj.expiresAt) && now <= adj.endTime;
        }) || null;
        const phaseInfo = getCurrentPhase(settings.weekStartDate, currentDate, settings, activeAdjustment);
        dispatch({ type: 'SET_PHASE', payload: phaseInfo });
      } catch (error) {
        console.error('Error loading initial data:', error);
        dispatch({ type: 'SET_INITIALIZED', payload: true });
      }
    }

    loadInitialData();
  }, []);

  // Update phase every minute and schedule notifications
  useEffect(() => {
    if (!state.isInitialized) return;

    updatePhase();

    const interval = setInterval(() => {
      updatePhase();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [state.isInitialized, state.settings]);

  // Schedule notifications when phase changes
  useEffect(() => {
    if (!state.isInitialized || !state.currentPhase || !state.settings.notificationsEnabled) return;

    async function setupNotifications() {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await schedulePhaseNotifications(state.currentPhase!);
      }
    }

    setupNotifications();
  }, [state.currentPhase, state.settings.notificationsEnabled, state.isInitialized]);

  // Save data when it changes
  useEffect(() => {
    if (!state.isInitialized) return;

    async function persistData() {
      try {
        await Promise.all([
          saveFastHistory(state.fastHistory),
          saveMealEntries(state.mealEntries),
          saveWeightRecords(state.weightRecords),
          saveSettings(state.settings),
          saveCalendarEvents(state.calendarEvents),
        ]);
        
        // Save manual adjustments
        if (state.manualAdjustment) {
          const allAdjustments = await loadManualAdjustments();
          const filtered = allAdjustments.filter((adj) => adj.id !== state.manualAdjustment!.id);
          await saveManualAdjustments([...filtered, state.manualAdjustment]);
        }
      } catch (error) {
        console.error('Error saving data:', error);
      }
    }

    persistData();
  }, [state.fastHistory, state.mealEntries, state.weightRecords, state.settings, state.calendarEvents, state.manualAdjustment, state.isInitialized]);

  const updatePhase = useCallback(() => {
    if (!state.isInitialized) return;

    const currentDate = new Date();
    const phaseInfo = getCurrentPhase(state.settings.weekStartDate, currentDate, state.settings, state.manualAdjustment);
    dispatch({ type: 'SET_PHASE', payload: phaseInfo });
  }, [state.isInitialized, state.settings, state.manualAdjustment]);

  const addFast = useCallback(async (fast: FastRecord) => {
    dispatch({ type: 'ADD_FAST', payload: fast });
    await saveFastHistory([...state.fastHistory, fast]);
  }, [state.fastHistory]);

  const updateFast = useCallback(async (fast: FastRecord) => {
    dispatch({ type: 'UPDATE_FAST', payload: fast });
    const updated = state.fastHistory.map((f) => (f.id === fast.id ? fast : f));
    await saveFastHistory(updated);
  }, [state.fastHistory]);

  const addMeal = useCallback(async (meal: MealEntry) => {
    dispatch({ type: 'ADD_MEAL', payload: meal });
    await saveMealEntries([...state.mealEntries, meal]);
  }, [state.mealEntries]);

  const deleteMeal = useCallback(async (mealId: string) => {
    dispatch({ type: 'DELETE_MEAL', payload: mealId });
    const updated = state.mealEntries.filter((m) => m.id !== mealId);
    await saveMealEntries(updated);
  }, [state.mealEntries]);

  const addWeight = useCallback(async (weight: WeightRecord) => {
    dispatch({ type: 'ADD_WEIGHT', payload: weight });
    await saveWeightRecords([...state.weightRecords, weight]);
  }, [state.weightRecords]);

  const updateSettings = useCallback(async (settings: Partial<UserSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    const updated = { ...state.settings, ...settings };
    await saveSettings(updated);
    // Recalculate phase after settings change
    updatePhase();
  }, [state.settings, updatePhase]);

  const setManualTimer = useCallback(async (startTime: Date, endTime: Date, phase: PhaseInfo['phase']) => {
    const adjustment: ManualTimerAdjustment = {
      id: `manual_${Date.now()}`,
      startTime,
      endTime,
      phase,
      createdAt: new Date(),
    };

    dispatch({ type: 'SET_MANUAL_ADJUSTMENT', payload: adjustment });
    
    // Save all adjustments
    const allAdjustments = await loadManualAdjustments();
    const filtered = allAdjustments.filter((adj) => adj.id !== adjustment.id);
    await saveManualAdjustments([...filtered, adjustment]);
    
    // Recalculate phase
    updatePhase();
  }, [updatePhase]);

  const clearManualTimer = useCallback(async () => {
    dispatch({ type: 'SET_MANUAL_ADJUSTMENT', payload: null });
    
    // Remove active adjustment from storage
    const allAdjustments = await loadManualAdjustments();
    const now = new Date();
    const active = allAdjustments.find((adj) => {
      return (!adj.expiresAt || now <= adj.expiresAt) && now <= adj.endTime;
    });
    
    if (active) {
      const filtered = allAdjustments.filter((adj) => adj.id !== active.id);
      await saveManualAdjustments(filtered);
    }
    
    // Recalculate phase
    updatePhase();
  }, [updatePhase]);

  const syncToCalendar = useCallback(async (event: Omit<CalendarEvent, 'id' | 'synced' | 'eventId'>): Promise<boolean> => {
    try {
      const hasPermissions = await hasCalendarPermissions();
      if (!hasPermissions) {
        const granted = await requestCalendarPermissions();
        if (!granted) {
          return false;
        }
      }

      const eventId = await createNativeCalendarEvent(event);
      if (!eventId) {
        return false;
      }

      const calendarEvent: CalendarEvent = {
        id: `cal_${Date.now()}`,
        eventId,
        ...event,
        synced: true,
      };

      dispatch({ type: 'ADD_CALENDAR_EVENT', payload: calendarEvent });
      
      const allEvents = await loadCalendarEvents();
      await saveCalendarEvents([...allEvents, calendarEvent]);
      
      return true;
    } catch (error) {
      console.error('Error syncing to calendar:', error);
      return false;
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const [fasts, meals, weights, settings, adjustments, calendarEvents] = await Promise.all([
        loadFastHistory(),
        loadMealEntries(),
        loadWeightRecords(),
        loadSettings(),
        loadManualAdjustments(),
        loadCalendarEvents(),
      ]);

      dispatch({
        type: 'LOAD_DATA',
        payload: { fasts, meals, weights, settings, adjustments, calendarEvents },
      });

      const currentDate = new Date();
      const activeAdjustment = adjustments.find((adj) => {
        const now = new Date();
        return (!adj.expiresAt || now <= adj.expiresAt) && now <= adj.endTime;
      }) || null;
      const phaseInfo = getCurrentPhase(settings.weekStartDate, currentDate, settings, activeAdjustment);
      dispatch({ type: 'SET_PHASE', payload: phaseInfo });
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  }, []);

  const value: FastingContextType = {
    state,
    updatePhase,
    addFast,
    updateFast,
    addMeal,
    deleteMeal,
    addWeight,
    updateSettings,
    setManualTimer,
    clearManualTimer,
    syncToCalendar,
    refreshData,
  };

  return <FastingContext.Provider value={value}>{children}</FastingContext.Provider>;
}

export function useFasting() {
  const context = useContext(FastingContext);
  if (context === undefined) {
    throw new Error('useFasting must be used within a FastingProvider');
  }
  return context;
}

