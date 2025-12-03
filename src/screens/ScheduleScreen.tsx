import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Chip, useTheme } from 'react-native-paper';
import { useFasting } from '../context/FastingContext';
import { calculateFastSchedule, getWeekType, getCurrentPhase } from '../utils/fastingCalculations';
import { getPhaseColors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import { format, addDays, startOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';

export function ScheduleScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state } = useFasting();

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
    const currentPhase = getCurrentPhase(state.settings.weekStartDate, date, state.settings);
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
    const currentPhase = getCurrentPhase(state.settings.weekStartDate, date, state.settings);
    if (currentPhase.phase === 'fast_1') return 'Fast 1';
    if (currentPhase.phase === 'fast_2') return 'Fast 2';
    if (currentPhase.phase === 'eating_window_1') return 'Eating';
    if (currentPhase.phase === 'daily_eating_window') return 'Eating';
    if (currentPhase.phase === 'recovery_eating_window') return 'Eating';
    return 'Fasting';
  };

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
