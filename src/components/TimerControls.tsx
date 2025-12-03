import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Card, useTheme, Portal, Dialog, SegmentedButtons } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { PhaseType } from '../types';
import { getPhaseDisplayName } from '../utils/fastingCalculations';

interface TimerControlsProps {
  onSetTimer: (startTime: Date, endTime: Date, phase: PhaseType) => void;
  onClearTimer: () => void;
  onSyncToCalendar: () => void;
  currentStartTime?: Date;
  currentEndTime?: Date;
  currentPhase?: PhaseType;
  hasManualAdjustment: boolean;
  isSynced?: boolean;
}

export function TimerControls({
  onSetTimer,
  onClearTimer,
  onSyncToCalendar,
  currentStartTime,
  currentEndTime,
  currentPhase,
  hasManualAdjustment,
  isSynced = false,
}: TimerControlsProps) {
  const theme = useTheme();
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showPhasePicker, setShowPhasePicker] = useState(false);
  const [startTime, setStartTime] = useState<Date>(currentStartTime || new Date());
  const [endTime, setEndTime] = useState<Date>(currentEndTime || new Date(Date.now() + 36 * 60 * 60 * 1000));
  const [selectedPhase, setSelectedPhase] = useState<PhaseType>(currentPhase || 'fast_1');

  const phases: PhaseType[] = ['fast_1', 'fast_2', 'eating_window_1', 'daily_eating_window', 'recovery_eating_window'];

  function handleSetTimer() {
    if (endTime <= startTime) {
      // Show error - end time must be after start time
      return;
    }
    onSetTimer(startTime, endTime, selectedPhase);
    setShowStartPicker(false);
    setShowEndPicker(false);
    setShowPhasePicker(false);
  }

  function handleStartTimeChange(event: any, date?: Date) {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (date) {
      setStartTime(date);
      // Auto-adjust end time if it's before new start time
      if (endTime <= date) {
        const newEndTime = new Date(date);
        newEndTime.setHours(date.getHours() + 36);
        setEndTime(newEndTime);
      }
    }
  }

  function handleEndTimeChange(event: any, date?: Date) {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (date && date > startTime) {
      setEndTime(date);
    }
  }

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            Manual Timer Controls
          </Text>
          {hasManualAdjustment && (
            <Text variant="bodySmall" style={[styles.indicator, { color: theme.colors.primary }]}>
              Manual Mode Active
            </Text>
          )}
        </View>

        {hasManualAdjustment && currentStartTime && currentEndTime && (
          <View style={styles.currentTimes}>
            <Text variant="bodySmall" style={styles.currentTimeLabel}>
              Current Timer:
            </Text>
            <Text variant="bodySmall">
              Start: {format(currentStartTime, 'MMM d, h:mm a')}
            </Text>
            <Text variant="bodySmall">
              End: {format(currentEndTime, 'MMM d, h:mm a')}
            </Text>
          </View>
        )}

        <View style={styles.controls}>
          <View style={styles.timeRow}>
            <View style={styles.timeControl}>
              <Text variant="labelMedium" style={styles.label}>
                Start Time
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowStartPicker(true)}
                style={styles.timeButton}
                icon="clock-outline"
              >
                {format(startTime, 'MMM d, h:mm a')}
              </Button>
            </View>

            <View style={styles.timeControl}>
              <Text variant="labelMedium" style={styles.label}>
                End Time
              </Text>
              <Button
                mode="outlined"
                onPress={() => setShowEndPicker(true)}
                style={styles.timeButton}
                icon="clock-outline"
              >
                {format(endTime, 'MMM d, h:mm a')}
              </Button>
            </View>
          </View>

          <View style={styles.phaseControl}>
            <Text variant="labelMedium" style={styles.label}>
              Phase Type
            </Text>
            <Button
              mode="outlined"
              onPress={() => setShowPhasePicker(true)}
              style={styles.phaseButton}
              icon="calendar-clock"
            >
              {getPhaseDisplayName(selectedPhase)}
            </Button>
          </View>

          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={handleSetTimer}
              style={styles.actionButton}
              disabled={endTime <= startTime}
            >
              Set Timer
            </Button>
            {hasManualAdjustment && (
              <Button
                mode="outlined"
                onPress={onClearTimer}
                style={styles.actionButton}
                icon="close-circle"
              >
                Clear Manual
              </Button>
            )}
            <Button
              mode="outlined"
              onPress={onSyncToCalendar}
              style={styles.actionButton}
              icon={isSynced ? 'calendar-check' : 'calendar-plus'}
              disabled={!hasManualAdjustment && !currentStartTime}
            >
              {isSynced ? 'Synced' : 'Sync to Calendar'}
            </Button>
          </View>
        </View>

        {Platform.OS === 'ios' && showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="datetime"
            display="spinner"
            onChange={handleStartTimeChange}
            minimumDate={new Date()}
          />
        )}

        {Platform.OS === 'ios' && showEndPicker && (
          <DateTimePicker
            value={endTime}
            mode="datetime"
            display="spinner"
            onChange={handleEndTimeChange}
            minimumDate={startTime}
          />
        )}

        {Platform.OS === 'android' && showStartPicker && (
          <DateTimePicker
            value={startTime}
            mode="datetime"
            display="default"
            onChange={handleStartTimeChange}
            minimumDate={new Date()}
          />
        )}

        {Platform.OS === 'android' && showEndPicker && (
          <DateTimePicker
            value={endTime}
            mode="datetime"
            display="default"
            onChange={handleEndTimeChange}
            minimumDate={startTime}
          />
        )}

        <Portal>
          <Dialog visible={showPhasePicker} onDismiss={() => setShowPhasePicker(false)}>
            <Dialog.Title>Select Phase Type</Dialog.Title>
            <Dialog.Content>
              <View style={styles.phaseOptions}>
                {phases.map((phase) => (
                  <Button
                    key={phase}
                    mode={selectedPhase === phase ? 'contained' : 'outlined'}
                    onPress={() => {
                      setSelectedPhase(phase);
                      setShowPhasePicker(false);
                    }}
                    style={styles.phaseOption}
                  >
                    {getPhaseDisplayName(phase)}
                  </Button>
                ))}
              </View>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setShowPhasePicker(false)}>Cancel</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
  },
  indicator: {
    fontWeight: '600',
  },
  currentTimes: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentTimeLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  controls: {
    gap: 16,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeControl: {
    flex: 1,
  },
  label: {
    marginBottom: 8,
  },
  timeButton: {
    width: '100%',
  },
  phaseControl: {
    width: '100%',
  },
  phaseButton: {
    width: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  phaseOptions: {
    gap: 8,
  },
  phaseOption: {
    marginBottom: 8,
  },
});

