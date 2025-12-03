import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Share } from 'react-native';
import {
  Text,
  Switch,
  Card,
  Button,
  SegmentedButtons,
  useTheme,
  Divider,
  Menu,
} from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import { useFasting } from '../context/FastingContext';
import { requestNotificationPermissions } from '../utils/notifications';
import { clearAllData, getDefaultSettings } from '../utils/storage';
import { format } from 'date-fns';
import { startOfWeek } from 'date-fns';

export function SettingsScreen() {
  const theme = useTheme();
  const { state, updateSettings, refreshData } = useFasting();
  const [eatingWindowStart, setEatingWindowStart] = useState(state.settings.eatingWindowStart);
  const [eatingWindowEnd, setEatingWindowEnd] = useState(state.settings.eatingWindowEnd);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    Boolean(state.settings.notificationsEnabled)
  );
  const [themeMode, setThemeMode] = useState(state.settings.theme);
  const [exportMenuVisible, setExportMenuVisible] = useState(false);

  useEffect(() => {
    setEatingWindowStart(state.settings.eatingWindowStart);
    setEatingWindowEnd(state.settings.eatingWindowEnd);
    setNotificationsEnabled(Boolean(state.settings.notificationsEnabled));
    setThemeMode(state.settings.theme);
  }, [state.settings]);

  const handleSaveEatingWindow = () => {
    updateSettings({
      eatingWindowStart,
      eatingWindowEnd,
    });
    Alert.alert('Success', 'Eating window times updated.');
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in your device settings to receive reminders.'
        );
        return;
      }
    }
    setNotificationsEnabled(value);
    updateSettings({ notificationsEnabled: value });
  };

  const handleThemeChange = (value: string) => {
    const themeValue = value as 'light' | 'dark' | 'automatic';
    setThemeMode(themeValue);
    updateSettings({ theme: themeValue });
  };

  const handleResetWeekStart = () => {
    Alert.alert(
      'Reset Week Start',
      'This will reset your week start date to the beginning of the current week. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const now = new Date();
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            updateSettings({ weekStartDate: weekStart });
            Alert.alert('Success', 'Week start date reset.');
          },
        },
      ]
    );
  };

  const handleExportData = async (exportFormat: 'csv' | 'json') => {
    try {
      const data = {
        fasts: state.fastHistory.map((fast) => ({
          ...fast,
          startTime: fast.startTime.toISOString(),
          endTime: fast.endTime.toISOString(),
        })),
        meals: state.mealEntries.map((meal) => ({
          ...meal,
          timestamp: meal.timestamp.toISOString(),
        })),
        weights: state.weightRecords.map((weight) => ({
          ...weight,
          date: weight.date.toISOString(),
        })),
        settings: {
          ...state.settings,
          weekStartDate: state.settings.weekStartDate.toISOString(),
        },
        exportDate: new Date().toISOString(),
      };

      let content = '';
      let filename = '';

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `fasting-tracker-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      } else if (exportFormat === 'csv') {
        // CSV format
        const csvRows: string[] = [];

        // Fasts CSV
        csvRows.push('FASTS');
        csvRows.push('ID,Type,Week Number,Start Time,End Time,Completed,Duration (hours)');
        state.fastHistory.forEach((fast) => {
          csvRows.push(
            `${fast.id},${fast.type},${fast.weekNumber},${format(fast.startTime, 'yyyy-MM-dd HH:mm:ss')},${format(fast.endTime, 'yyyy-MM-dd HH:mm:ss')},${fast.completed},${fast.duration}`
          );
        });

        csvRows.push('\nMEALS');
        csvRows.push('ID,Timestamp,Meal Type,Notes,Photo URI');
        state.mealEntries.forEach((meal) => {
          csvRows.push(
            `${meal.id},${format(meal.timestamp, 'yyyy-MM-dd HH:mm:ss')},${meal.mealType},"${meal.notes.replace(/"/g, '""')}",${meal.photoUri || ''}`
          );
        });

        csvRows.push('\nWEIGHTS');
        csvRows.push('ID,Date,Weight,Unit');
        state.weightRecords.forEach((weight) => {
          csvRows.push(
            `${weight.id},${format(weight.date, 'yyyy-MM-dd')},${weight.weight},${weight.unit}`
          );
        });

        content = csvRows.join('\n');
        filename = `fasting-tracker-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      }

      // Save to file system - use a simple filename for sharing
      // Note: On mobile, Share API will handle file creation
      const fileUri = filename;
      await FileSystem.writeAsStringAsync(fileUri, content);

      // Share the file
      await Share.share({
        url: fileUri,
        message: `Fasting Tracker Data Export (${format})`,
      });

      Alert.alert('Success', `Data exported successfully as ${filename}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
      console.error('Error exporting data:', error);
    }
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all your fast history, meal entries, and reset settings to defaults. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllData();
              const defaults = getDefaultSettings();
              updateSettings(defaults);
              await refreshData();
              Alert.alert('Success', 'All data has been reset.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset data. Please try again.');
              console.error('Error resetting data:', error);
            }
          },
        },
      ]
    );
  };

  const parseTime = (timeString: string): { hours: number; minutes: number } => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  };

  const formatTimeForDisplay = (timeString: string): string => {
    const { hours, minutes } = parseTime(timeString);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Eating Window
          </Text>
          <View style={styles.settingRow}>
            <View style={styles.settingItem}>
              <Text variant="bodyMedium">Start Time</Text>
              <Text variant="bodyLarge" style={styles.timeDisplay}>
                {formatTimeForDisplay(eatingWindowStart)}
              </Text>
              <Text variant="bodySmall" style={styles.timeHint}>
                {eatingWindowStart}
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Text variant="bodyMedium">End Time</Text>
              <Text variant="bodyLarge" style={styles.timeDisplay}>
                {formatTimeForDisplay(eatingWindowEnd)}
              </Text>
              <Text variant="bodySmall" style={styles.timeHint}>
                {eatingWindowEnd}
              </Text>
            </View>
          </View>
          <Button
            mode="outlined"
            onPress={handleSaveEatingWindow}
            style={styles.saveButton}
          >
            Update Times
          </Button>
          <Text variant="bodySmall" style={styles.hint}>
            Note: Full time picker will be available in a future update. For now, times are set to
            default (9:00 AM - 9:00 PM).
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Notifications
          </Text>
          <View style={styles.switchRow}>
            <Text variant="bodyLarge">Enable Notifications</Text>
            <Switch
              value={!!notificationsEnabled}
              onValueChange={handleNotificationToggle}
            />
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            Receive reminders for fast start/end and eating window times.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Appearance
          </Text>
          <Text variant="bodyMedium" style={styles.label}>
            Theme
          </Text>
          <SegmentedButtons
            value={themeMode}
            onValueChange={handleThemeChange}
            buttons={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'automatic', label: 'Auto' },
            ]}
            style={styles.segmentedButtons}
          />
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Schedule
          </Text>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium">Week Start Date</Text>
            <Text variant="bodySmall" style={styles.infoValue}>
              {format(state.settings.weekStartDate, 'MMM d, yyyy')}
            </Text>
          </View>
          <Button
            mode="outlined"
            onPress={handleResetWeekStart}
            style={styles.actionButton}
          >
            Reset to Current Week
          </Button>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Data Management
          </Text>
          <View style={styles.dataActions}>
            <Menu
              visible={!!exportMenuVisible}
              onDismiss={() => setExportMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setExportMenuVisible(true)}
                  icon="download"
                  style={styles.exportButton}
                >
                  Export Data
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setExportMenuVisible(false);
                  handleExportData('json');
                }}
                title="Export as JSON"
                leadingIcon="code-json"
              />
              <Menu.Item
                onPress={() => {
                  setExportMenuVisible(false);
                  handleExportData('csv');
                }}
                title="Export as CSV"
                leadingIcon="file-excel"
              />
            </Menu>
          </View>
          <Text variant="bodySmall" style={styles.hint}>
            Export all your data (fasts, meals, weights) for backup or analysis.
          </Text>
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            onPress={handleResetData}
            style={styles.dangerButton}
            icon="delete"
          >
            Reset All Data
          </Button>
          <Text variant="bodySmall" style={styles.hint}>
            This will permanently delete all your data. Use with caution.
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            About
          </Text>
          <Text variant="bodyMedium" style={styles.aboutText}>
            Fasting Tracker v1.0.0
          </Text>
          <Text variant="bodySmall" style={styles.aboutText}>
            Track your custom 2-week intermittent fasting cycle with meal logging and progress
            tracking.
          </Text>
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
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  settingItem: {
    alignItems: 'center',
  },
  timeDisplay: {
    marginTop: 8,
    fontWeight: 'bold',
  },
  timeHint: {
    marginTop: 4,
    opacity: 0.7,
  },
  saveButton: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  hint: {
    marginTop: 8,
    opacity: 0.7,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoValue: {
    opacity: 0.7,
  },
  actionButton: {
    marginTop: 8,
  },
  dataActions: {
    marginBottom: 16,
  },
  exportButton: {
    marginBottom: 8,
  },
  dangerButton: {
    marginTop: 8,
  },
  aboutText: {
    marginBottom: 8,
    opacity: 0.8,
  },
});
