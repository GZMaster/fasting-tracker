import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Dimensions, Modal } from 'react-native';
import { Text, Button, Card, useTheme, Portal, Dialog } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { PhaseType } from '../types';
import { getPhaseDisplayName } from '../utils/fastingCalculations';

const { width } = Dimensions.get('window');
const isSmallScreen = width < 375;

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

  // Sync state with props when they change
  useEffect(() => {
    if (currentStartTime) {
      setStartTime(currentStartTime);
    }
  }, [currentStartTime]);

  useEffect(() => {
    if (currentEndTime) {
      setEndTime(currentEndTime);
    }
  }, [currentEndTime]);

  useEffect(() => {
    if (currentPhase) {
      setSelectedPhase(currentPhase);
    }
  }, [currentPhase]);

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

  function handleStartTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      // Android - only update on 'set', close picker after
      if (event.type === 'set' && date) {
        setStartTime(date);
        // Auto-adjust end time if it's before new start time
        if (endTime <= date) {
          const newEndTime = new Date(date);
          newEndTime.setHours(date.getHours() + 36);
          setEndTime(newEndTime);
        }
      }
      // Close picker for both 'set' and 'dismissed'
      setShowStartPicker(false);
    } else {
      // iOS - date is always provided and updates continuously as user scrolls
      // Don't close picker here, let user press Done/Cancel
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
  }

  function handleEndTimeChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android') {
      // Android - only update on 'set', close picker after
      if (event.type === 'set' && date && date > startTime) {
        setEndTime(date);
      }
      // Close picker for both 'set' and 'dismissed'
      setShowEndPicker(false);
    } else {
      // iOS - date is always provided and updates continuously as user scrolls
      // Don't close picker here, let user press Done/Cancel
      if (date && date > startTime) {
        setEndTime(date);
      }
    }
  }

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content style={styles.cardContent}>
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
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
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
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
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
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {getPhaseDisplayName(selectedPhase)}
            </Button>
          </View>

          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              onPress={handleSetTimer}
              style={[styles.actionButton, styles.primaryActionButton]}
              disabled={endTime <= startTime}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              Set Timer
            </Button>
            {hasManualAdjustment && (
              <Button
                mode="outlined"
                onPress={onClearTimer}
                style={styles.actionButton}
                icon="close-circle"
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
              >
                Clear
              </Button>
            )}
            <Button
              mode="outlined"
              onPress={onSyncToCalendar}
              style={styles.actionButton}
              icon={isSynced ? 'calendar-check' : 'calendar-plus'}
              disabled={!hasManualAdjustment && !currentStartTime}
              contentStyle={styles.actionButtonContent}
              labelStyle={styles.actionButtonLabel}
            >
              {isSynced ? 'Synced' : isSmallScreen ? 'Sync' : 'Sync to Calendar'}
            </Button>
          </View>
        </View>

        {Platform.OS === 'ios' && (
          <>
            <Modal
              visible={showStartPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowStartPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <Button onPress={() => setShowStartPicker(false)}>Cancel</Button>
                    <Text variant="titleMedium">Select Start Time</Text>
                    <Button onPress={() => setShowStartPicker(false)}>Done</Button>
                  </View>
                  <DateTimePicker
                    value={startTime}
                    mode="datetime"
                    display="spinner"
                    onChange={handleStartTimeChange}
                    minimumDate={new Date()}
                  />
                </View>
              </View>
            </Modal>
            <Modal
              visible={showEndPicker}
              transparent
              animationType="slide"
              onRequestClose={() => setShowEndPicker(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.iosPickerContainer}>
                  <View style={styles.iosPickerHeader}>
                    <Button onPress={() => setShowEndPicker(false)}>Cancel</Button>
                    <Text variant="titleMedium">Select End Time</Text>
                    <Button onPress={() => setShowEndPicker(false)}>Done</Button>
                  </View>
                  <DateTimePicker
                    value={endTime}
                    mode="datetime"
                    display="spinner"
                    onChange={handleEndTimeChange}
                    minimumDate={startTime}
                  />
                </View>
              </View>
            </Modal>
          </>
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

        {showPhasePicker && (
          <Portal>
            <Dialog
              visible={showPhasePicker}
              onDismiss={() => setShowPhasePicker(false)}
              dismissable
            >
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
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 0,
    width: '100%',
    maxWidth: '100%',
  },
  cardContent: {
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontWeight: 'bold',
    flex: 1,
    minWidth: 150,
  },
  indicator: {
    fontWeight: '600',
    marginLeft: 8,
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
    flexDirection: isSmallScreen ? 'column' : 'row',
    gap: 12,
  },
  timeControl: {
    flex: isSmallScreen ? 0 : 1,
    minWidth: 0,
  },
  label: {
    marginBottom: 6,
    fontSize: 13,
  },
  timeButton: {
    width: '100%',
    minHeight: 48,
    maxWidth: '100%',
  },
  buttonContent: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  buttonLabel: {
    fontSize: 13,
    flexShrink: 1,
    maxWidth: '100%',
  },
  phaseControl: {
    width: '100%',
  },
  phaseButton: {
    width: '100%',
    minHeight: 48,
    maxWidth: '100%',
  },
  actionButtons: {
    flexDirection: isSmallScreen ? 'column' : 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: isSmallScreen ? 0 : 1,
    minWidth: isSmallScreen ? '100%' : 100,
    maxWidth: isSmallScreen ? '100%' : undefined,
    minHeight: 44,
  },
  primaryActionButton: {
    flex: isSmallScreen ? 0 : 1.2,
  },
  actionButtonContent: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  actionButtonLabel: {
    fontSize: 14,
    flexShrink: 1,
  },
  phaseOptions: {
    gap: 8,
  },
  phaseOption: {
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '50%',
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

