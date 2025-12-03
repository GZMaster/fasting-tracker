import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';
import type { CalendarEvent, PhaseType } from '../types';
import { getPhaseDisplayName } from './fastingCalculations';

let calendarId: string | null = null;

/**
 * Checks if expo-calendar module is available
 */
function isCalendarAvailable(): boolean {
  try {
    return Calendar != null && typeof Calendar.requestCalendarPermissionsAsync === 'function';
  } catch {
    return false;
  }
}

/**
 * Requests calendar permissions from the user
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    if (!isCalendarAvailable()) {
      console.warn('expo-calendar module not available. Please rebuild the app.');
      return false;
    }
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

/**
 * Checks if calendar permissions are granted
 */
export async function hasCalendarPermissions(): Promise<boolean> {
  try {
    if (!isCalendarAvailable()) {
      return false;
    }
    const { status } = await Calendar.getCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error checking calendar permissions:', error);
    return false;
  }
}

/**
 * Gets or creates a calendar for fasting events
 */
async function getOrCreateCalendar(): Promise<string | null> {
  try {
    if (!isCalendarAvailable()) {
      console.warn('expo-calendar module not available. Please rebuild the app.');
      return null;
    }

    // Check if we already have a calendar ID stored
    if (calendarId) {
      return calendarId;
    }

    const hasPermissions = await hasCalendarPermissions();
    if (!hasPermissions) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        return null;
      }
    }

    // Get all calendars
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

    // Try to find existing "Fasting Tracker" calendar
    const existingCalendar = calendars.find(
      (cal) => cal.title === 'Fasting Tracker' && cal.allowsModifications
    );

    if (existingCalendar) {
      calendarId = existingCalendar.id;
      return calendarId;
    }

    // Create a new calendar if none exists
    let calendarConfig: any = {
      title: 'Fasting Tracker',
      color: '#4A90E2',
      entityType: Calendar.EntityTypes.EVENT,
      name: 'Fasting Tracker',
      timeZone: 'UTC',
      allowsModifications: true,
      allowsContentModifications: true,
    };

    if (Platform.OS === 'ios') {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      calendarConfig.sourceId = defaultCalendar.id;
      calendarConfig.source = defaultCalendar;
    } else {
      // Android
      calendarConfig.sourceId = undefined;
      calendarConfig.source = { isLocalAccount: true, name: 'Fasting Tracker' };
    }

    const newCalendarId = await Calendar.createCalendarAsync(calendarConfig);

    calendarId = newCalendarId;
    return calendarId;
  } catch (error) {
    console.error('Error getting or creating calendar:', error);
    return null;
  }
}

/**
 * Creates a calendar event for a fasting period
 */
export async function createCalendarEvent(
  event: Omit<CalendarEvent, 'id' | 'synced' | 'eventId'>
): Promise<string | null> {
  try {
    if (!isCalendarAvailable()) {
      console.warn('expo-calendar module not available. Please rebuild the app.');
      return null;
    }

    const hasPermissions = await hasCalendarPermissions();
    if (!hasPermissions) {
      const granted = await requestCalendarPermissions();
      if (!granted) {
        throw new Error('Calendar permissions not granted');
      }
    }

    const calId = await getOrCreateCalendar();
    if (!calId) {
      throw new Error('Could not get or create calendar');
    }

    const phaseName = getPhaseDisplayName(event.phase);
    const durationHours = Math.round(
      (event.endTime.getTime() - event.startTime.getTime()) / (1000 * 60 * 60)
    );

    const eventId = await Calendar.createEventAsync(calId, {
      title: `${phaseName} - ${durationHours}h Fast`,
      startDate: event.startTime,
      endDate: event.endTime,
      notes: event.notes || `Fasting period: ${phaseName}`,
      timeZone: 'UTC',
      alarms: [
        {
          relativeOffset: -60, // 1 hour before
          method: Calendar.AlarmMethod.ALERT,
        },
      ],
    });

    return eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
}

/**
 * Updates an existing calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  event: Partial<Omit<CalendarEvent, 'id' | 'synced' | 'eventId'>>
): Promise<boolean> {
  try {
    if (!isCalendarAvailable()) {
      return false;
    }

    const hasPermissions = await hasCalendarPermissions();
    if (!hasPermissions) {
      return false;
    }

    const calId = await getOrCreateCalendar();
    if (!calId) {
      return false;
    }

    await Calendar.updateEventAsync(eventId, {
      startDate: event.startTime,
      endDate: event.endTime,
      title: event.title,
      notes: event.notes,
    });

    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
}

/**
 * Deletes a calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  try {
    if (!isCalendarAvailable()) {
      return false;
    }

    const hasPermissions = await hasCalendarPermissions();
    if (!hasPermissions) {
      return false;
    }

    await Calendar.deleteEventAsync(eventId);
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
}

/**
 * Gets calendar events for a date range
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<Calendar.Event[]> {
  try {
    if (!isCalendarAvailable()) {
      return [];
    }

    const hasPermissions = await hasCalendarPermissions();
    if (!hasPermissions) {
      return [];
    }

    const calId = await getOrCreateCalendar();
    if (!calId) {
      return [];
    }

    const events = await Calendar.getEventsAsync([calId], startDate, endDate);
    return events;
  } catch (error) {
    console.error('Error getting calendar events:', error);
    return [];
  }
}

/**
 * Formats a calendar event title based on phase
 */
export function formatEventTitle(phase: PhaseType, durationHours: number): string {
  const phaseName = getPhaseDisplayName(phase);
  return `${phaseName} - ${durationHours}h Fast`;
}

/**
 * Formats event notes with additional information
 */
export function formatEventNotes(phase: PhaseType, notes?: string): string {
  const phaseName = getPhaseDisplayName(phase);
  const baseNote = `Fasting period: ${phaseName}`;
  return notes ? `${baseNote}\n${notes}` : baseNote;
}

