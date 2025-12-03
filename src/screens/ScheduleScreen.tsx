import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, useTheme, Button, Snackbar } from 'react-native-paper';
import { useFasting } from '../context/FastingContext';
import { calculateFastSchedule, getWeekType, getCurrentPhase } from '../utils/fastingCalculations';
import { getPhaseColors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { formatEventTitle } from '../utils/calendar';
import * as Haptics from 'expo-haptics';

export function ScheduleScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state, syncToCalendar: contextSyncToCalendar } = useFasting();
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const schedule = useMemo(() => {
    if (!state.settings.weekStartDate) return [];

    const currentDate = new Date();
    const weekStart = startOfWeek(state.settings.weekStartDate, { weekStartsOn: 1 });
    const weeks = [];

    // Generate schedule for current week and next week (2-week cycle)
    for (let weekOffset = 0; weekOffset < 2; weekOffset++) {
      const weekStartDate = addDays(weekStart, weekOffset * 7);
      const weekType = getWeekType(state.settings.weekStartDate, weekStartDate);
      const weekSchedule = calculateFastSchedule(weekStartDate, weekType);

      weeks.push({
        weekStart: weekStartDate,
        weekType,
        schedule: weekSchedule,
      });
    }

    return weeks;
  }, [state.settings.weekStartDate]);

  const getDayColor = (date: Date, weekType: 'active' | 'recovery') => {
    const currentPhase = getCurrentPhase(state.settings.weekStartDate, date, state.settings, state.manualAdjustment);
    const phaseColors = getPhaseColors(currentPhase.phase, isDark);

    if (currentPhase.phase === 'fast_1' || currentPhase.phase === 'fast_2') {
      return phaseColors.primary;
    } else if (
      currentPhase.phase === 'eating_window_1' ||
      currentPhase.phase === 'daily_eating_window' ||
      currentPhase.phase === 'recovery_eating_window'
    ) {
      return phaseColors.secondary;
    }

    return theme.colors.surfaceVariant;
  };

  const getDayLabel = (date: Date) => {
    const currentPhase = getCurrentPhase(state.settings.weekStartDate, date, state.settings, state.manualAdjustment);
    if (currentPhase.phase === 'fast_1') return 'Fast 1';
    if (currentPhase.phase === 'fast_2') return 'Fast 2';
    if (currentPhase.phase === 'eating_window_1') return 'Eating';
    if (currentPhase.phase === 'daily_eating_window') return 'Eating';
    if (currentPhase.phase === 'recovery_eating_window') return 'Eating';
    return 'Fasting';
  };

  const isEventSynced = (startTime: Date, endTime: Date): boolean => {
    return state.calendarEvents.some(
      (event) =>
        event.startTime.getTime() === startTime.getTime() &&
        event.endTime.getTime() === endTime.getTime() &&
        event.synced
    );
  };

  async function handleSyncAllToCalendar() {
    try {
      let syncedCount = 0;
      let failedCount = 0;

      for (const week of schedule) {
        for (const daySchedule of week.schedule) {
          if (daySchedule.phase === 'fast_1' || daySchedule.phase === 'fast_2') {
            // Check if already synced
            if (isEventSynced(daySchedule.startTime, daySchedule.endTime)) {
              continue;
            }

            const durationHours = Math.round(
              (daySchedule.endTime.getTime() - daySchedule.startTime.getTime()) / (1000 * 60 * 60)
            );
            const synced = await contextSyncToCalendar({
              title: formatEventTitle(daySchedule.phase, durationHours),
              startTime: daySchedule.startTime,
              endTime: daySchedule.endTime,
              phase: daySchedule.phase,
              notes: `Fasting period: ${getDayLabel(daySchedule.date)}`,
            });

            if (synced) {
              syncedCount++;
            } else {
              failedCount++;
            }
          }
        }
      }

      if (syncedCount > 0) {
        setSnackbarMessage(`Synced ${syncedCount} event(s) to calendar${failedCount > 0 ? `, ${failedCount} failed` : ''}`);
        setSnackbarVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (failedCount > 0) {
        setSnackbarMessage('Failed to sync events. Please check calendar permissions.');
        setSnackbarVisible(true);
      } else {
        setSnackbarMessage('All events are already synced');
        setSnackbarVisible(true);
      }
    } catch (error) {
      setSnackbarMessage('Error syncing to calendar');
      setSnackbarVisible(true);
    }
  }

  if (!state.isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const currentDate = new Date();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.syncCard} mode="outlined">
        <Card.Content>
          <View style={styles.syncHeader}>
            <Text variant="titleMedium">Calendar Sync</Text>
            <Chip icon="calendar-check" style={styles.syncChip}>
              {state.calendarEvents.filter((e) => e.synced).length} synced
            </Chip>
          </View>
          <Button
            mode="contained"
            onPress={handleSyncAllToCalendar}
            style={styles.syncButton}
            icon="calendar-sync"
          >
            Sync All to Calendar
          </Button>
        </Card.Content>
      </Card>

      {schedule.map((week, weekIndex) => (
        <Card key={weekIndex} style={styles.weekCard} mode="outlined">
          <Card.Content>
            <View style={styles.weekHeader}>
              <Text variant="titleLarge">
                {format(week.weekStart, 'MMM d')} -{' '}
                {format(addDays(week.weekStart, 6), 'MMM d, yyyy')}
              </Text>
              <Chip
                icon={week.weekType === 'active' ? 'fire' : 'leaf'}
                style={styles.weekTypeChip}
              >
                {week.weekType === 'active' ? 'Active Week' : 'Recovery Week'}
              </Chip>
            </View>

            <View style={styles.daysContainer}>
              {eachDayOfInterval({
                start: week.weekStart,
                end: addDays(week.weekStart, 6),
              }).map((day, dayIndex) => {
                const isToday = isSameDay(day, currentDate);
                const dayColor = getDayColor(day, week.weekType);
                const dayLabel = getDayLabel(day);
                const dayPhase = getCurrentPhase(state.settings.weekStartDate, day, state.settings, state.manualAdjustment);
                const isSynced = (dayPhase.phase === 'fast_1' || dayPhase.phase === 'fast_2') &&
                  isEventSynced(dayPhase.startTime, dayPhase.endTime);

                return (
                  <View
                    key={dayIndex}
                    style={[
                      styles.dayCard,
                      isToday && { borderColor: theme.colors.primary, borderWidth: 2 },
                    ]}
                  >
                    <View
                      style={[
                        styles.dayColorBar,
                        { backgroundColor: dayColor },
                      ]}
                    />
                    <View style={styles.dayContent}>
                      <Text variant="labelSmall" style={styles.dayName}>
                        {format(day, 'EEE')}
                      </Text>
                      <Text variant="bodyMedium" style={styles.dayNumber}>
                        {format(day, 'd')}
                      </Text>
                      <Text variant="bodySmall" style={styles.dayLabel}>
                        {dayLabel}
                      </Text>
                      {isSynced && (
                        <Chip
                          icon="calendar-check"
                          style={styles.syncedChip}
                          textStyle={styles.syncedChipText}
                          compact
                        >
                          Synced
                        </Chip>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>
      ))}

      <Card style={styles.legendCard} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.legendTitle}>
            Legend
          </Text>
          <View style={styles.legendItems}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: getPhaseColors('fast_1', isDark).primary },
                ]}
              />
              <Text variant="bodySmall">36-Hour Fast</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendColor,
                  { backgroundColor: getPhaseColors('daily_eating_window', isDark).secondary },
                ]}
              />
              <Text variant="bodySmall">Eating Window</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  syncCard: {
    marginBottom: 16,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  syncChip: {
    marginLeft: 8,
  },
  syncButton: {
    marginTop: 8,
  },
  weekCard: {
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weekTypeChip: {
    marginLeft: 8,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayCard: {
    width: '14%',
    minWidth: 45,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  dayColorBar: {
    height: 4,
    width: '100%',
  },
  dayContent: {
    padding: 8,
    alignItems: 'center',
  },
  dayName: {
    marginBottom: 4,
  },
  dayNumber: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 4,
  },
  syncedChip: {
    marginTop: 4,
    height: 20,
  },
  syncedChipText: {
    fontSize: 8,
  },
  legendCard: {
    marginTop: 8,
  },
  legendTitle: {
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});
