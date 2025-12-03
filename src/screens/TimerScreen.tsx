import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Chip, useTheme, Snackbar } from 'react-native-paper';
import { useFasting } from '../context/FastingContext';
import { Timer } from '../components/Timer';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { TimerControls } from '../components/TimerControls';
import { getPhaseDisplayName } from '../utils/fastingCalculations';
import { getPhaseColors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';
import type { PhaseInfo } from '../types';

const milestones = [
  { hours: 12, label: '12 Hours', message: 'Great start! You\'ve reached 12 hours.' },
  { hours: 24, label: '24 Hours', message: 'Amazing! A full day of fasting!' },
  { hours: 36, label: '36 Hours', message: 'Incredible! You\'ve completed a 36-hour fast!' },
];

const motivationalMessages = [
  'You\'re doing great! Keep going!',
  'Stay strong! You\'ve got this!',
  'Every moment counts. Keep pushing forward!',
  'You\'re stronger than you think!',
  'Focus on your goal. You can do it!',
];

export function TimerScreen() {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state, updatePhase, setManualTimer, clearManualTimer, syncToCalendar } = useFasting();
  const [currentMessage, setCurrentMessage] = useState(
    motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]
  );
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const currentPhase = state.currentPhase;
  const phaseColors = currentPhase
    ? getPhaseColors(currentPhase.phase, isDark)
    : null;

  // Calculate hours elapsed for milestone tracking
  const hoursElapsed = useMemo(() => {
    if (!currentPhase) return 0;
    const totalDuration = currentPhase.endTime.getTime() - currentPhase.startTime.getTime();
    const elapsed = totalDuration - currentPhase.timeRemaining;
    return elapsed / (1000 * 60 * 60);
  }, [currentPhase]);

  // Track milestones and trigger haptics
  useEffect(() => {
    if (!currentPhase) return;

    const isFasting = currentPhase.phase === 'fast_1' || currentPhase.phase === 'fast_2';
    if (!isFasting) return;

    milestones.forEach((milestone) => {
      if (hoursElapsed >= milestone.hours && hoursElapsed < milestone.hours + 0.1) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setCurrentMessage(milestone.message);
      }
    });
  }, [hoursElapsed, currentPhase]);

  // Update phase every second
  useEffect(() => {
    const interval = setInterval(() => {
      updatePhase();
    }, 1000);

    return () => clearInterval(interval);
  }, [updatePhase]);

  // Rotate motivational messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const randomMessage =
        motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      setCurrentMessage(randomMessage);
    }, 30000); // Change message every 30 seconds

    return () => clearInterval(interval);
  }, []);

  async function handleSetTimer(startTime: Date, endTime: Date, phase: PhaseInfo['phase']) {
    try {
      await setManualTimer(startTime, endTime, phase);
      setSnackbarMessage('Manual timer set successfully');
      setSnackbarVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setSnackbarMessage('Failed to set manual timer');
      setSnackbarVisible(true);
    }
  }

  async function handleClearTimer() {
    try {
      await clearManualTimer();
      setSnackbarMessage('Manual timer cleared');
      setSnackbarVisible(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      setSnackbarMessage('Failed to clear manual timer');
      setSnackbarVisible(true);
    }
  }

  async function handleSyncToCalendar() {
    if (!currentPhase) {
      Alert.alert('Error', 'No active phase to sync');
      return;
    }

    try {
      const durationHours = Math.round(
        (currentPhase.endTime.getTime() - currentPhase.startTime.getTime()) / (1000 * 60 * 60)
      );
      const synced = await syncToCalendar({
        title: `${getPhaseDisplayName(currentPhase.phase)} - ${durationHours}h Fast`,
        startTime: currentPhase.startTime,
        endTime: currentPhase.endTime,
        phase: currentPhase.phase,
        notes: `Fasting period: ${getPhaseDisplayName(currentPhase.phase)}`,
      });

      if (synced) {
        setSnackbarMessage('Event synced to calendar');
        setSnackbarVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setSnackbarMessage('Failed to sync to calendar. Please check permissions.');
        setSnackbarVisible(true);
      }
    } catch (error) {
      setSnackbarMessage('Error syncing to calendar');
      setSnackbarVisible(true);
    }
  }

  const isSynced = useMemo(() => {
    if (!currentPhase) return false;
    return state.calendarEvents.some(
      (event) =>
        event.startTime.getTime() === currentPhase.startTime.getTime() &&
        event.endTime.getTime() === currentPhase.endTime.getTime() &&
        event.synced
    );
  }, [state.calendarEvents, currentPhase]);

  if (!state.isInitialized || !currentPhase) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const isFasting = currentPhase.phase === 'fast_1' || currentPhase.phase === 'fast_2';
  const reachedMilestones = milestones.filter((m) => hoursElapsed >= m.hours);

  return (
    <ScrollView
      style={[
        styles.container,
        phaseColors && { backgroundColor: phaseColors.background },
      ]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <PhaseIndicator phase={currentPhase.phase} showNext />
      </View>

      <View style={styles.timerContainer}>
        <Timer timeRemaining={currentPhase.timeRemaining} size="large" />
      </View>

      <Card style={styles.infoCard} mode="outlined">
        <Card.Content>
          <Text variant="titleSmall" style={styles.infoTitle}>
            Phase Information
          </Text>
          <Text variant="bodyLarge" style={styles.phaseName}>
            {getPhaseDisplayName(currentPhase.phase)}
          </Text>
          <Text variant="bodySmall" style={styles.timeInfo}>
            Started: {format(currentPhase.startTime, 'MMM d, h:mm a')}
          </Text>
          <Text variant="bodySmall" style={styles.timeInfo}>
            Ends: {format(currentPhase.endTime, 'MMM d, h:mm a')}
          </Text>
        </Card.Content>
      </Card>

      {isFasting && (
        <>
          <Card style={styles.milestoneCard} mode="outlined">
            <Card.Content>
              <Text variant="titleSmall" style={styles.milestoneTitle}>
                Milestones
              </Text>
              <View style={styles.milestonesContainer}>
                {milestones.map((milestone) => {
                  const reached = hoursElapsed >= milestone.hours;
                  return (
                    <Chip
                      key={milestone.hours}
                      icon={reached ? 'check-circle' : 'circle-outline'}
                      style={[
                        styles.milestoneChip,
                        reached && { backgroundColor: theme.colors.primaryContainer },
                      ]}
                      textStyle={reached && { color: theme.colors.onPrimaryContainer }}
                    >
                      {milestone.label}
                    </Chip>
                  );
                })}
              </View>
              {reachedMilestones.length > 0 && (
                <Text variant="bodySmall" style={styles.milestoneProgress}>
                  {reachedMilestones.length} of {milestones.length} milestones reached
                </Text>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.messageCard} mode="outlined">
            <Card.Content>
              <Text variant="bodyLarge" style={styles.messageText}>
                {currentMessage}
              </Text>
            </Card.Content>
          </Card>
        </>
      )}

      {!isFasting && (
        <Card style={styles.messageCard} mode="outlined">
          <Card.Content>
            <Text variant="bodyLarge" style={styles.messageText}>
              You're in your eating window. Enjoy your meals!
            </Text>
          </Card.Content>
        </Card>
      )}

      <TimerControls
        onSetTimer={handleSetTimer}
        onClearTimer={handleClearTimer}
        onSyncToCalendar={handleSyncToCalendar}
        currentStartTime={currentPhase.startTime}
        currentEndTime={currentPhase.endTime}
        currentPhase={currentPhase.phase}
        hasManualAdjustment={currentPhase.isManualAdjustment || false}
        isSynced={isSynced}
      />

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
    paddingBottom: 32,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 24,
  },
  timerContainer: {
    marginVertical: 32,
    alignItems: 'center',
  },
  infoCard: {
    width: '100%',
    maxWidth: '100%',
    marginVertical: 16,
  },
  infoTitle: {
    marginBottom: 8,
  },
  phaseName: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  timeInfo: {
    opacity: 0.7,
    marginTop: 4,
  },
  milestoneCard: {
    width: '100%',
    maxWidth: '100%',
    marginVertical: 16,
  },
  milestoneTitle: {
    marginBottom: 12,
  },
  milestonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  milestoneChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  milestoneProgress: {
    marginTop: 8,
    opacity: 0.7,
  },
  messageCard: {
    width: '100%',
    maxWidth: '100%',
    marginVertical: 16,
  },
  messageText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
