import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Dimensions, Alert } from 'react-native';
import { Text, Card, Chip, Button, TextInput, Dialog, Portal, useTheme } from 'react-native-paper';
import { LineChart } from 'react-native-chart-kit';
import { useFasting } from '../context/FastingContext';
import { MealCard } from '../components/MealCard';
import { format, isSameDay, startOfDay, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';

const screenWidth = Dimensions.get('window').width;

export function HistoryScreen() {
  const theme = useTheme();
  const { state, deleteMeal, addWeight } = useFasting();
  const [weightDialogVisible, setWeightDialogVisible] = useState(false);
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  const stats = useMemo(() => {
    const completedFasts = state.fastHistory.filter((fast) => fast.completed);
    const totalFasts = state.fastHistory.length;
    const successRate = totalFasts > 0 ? (completedFasts.length / totalFasts) * 100 : 0;

    // Calculate average fast duration
    const avgDuration =
      completedFasts.length > 0
        ? completedFasts.reduce((sum, fast) => sum + fast.duration, 0) / completedFasts.length
        : 0;

    // Group meals by date
    const mealsByDate = state.mealEntries.reduce((acc, meal) => {
      const dateKey = format(startOfDay(meal.timestamp), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meal);
      return acc;
    }, {} as Record<string, typeof state.mealEntries>);

    // Sort meals by date (newest first)
    const sortedMealDates = Object.keys(mealsByDate).sort().reverse();

    return {
      completedFasts: completedFasts.length,
      totalFasts,
      successRate,
      avgDuration,
      mealsByDate,
      sortedMealDates,
    };
  }, [state.fastHistory, state.mealEntries]);

  // Group fasts by date
  const fastsByDate = useMemo(() => {
    const grouped: Record<string, typeof state.fastHistory> = {};
    state.fastHistory.forEach((fast) => {
      const dateKey = format(startOfDay(fast.startTime), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(fast);
    });
    return grouped;
  }, [state.fastHistory]);

  const sortedFastDates = Object.keys(fastsByDate).sort().reverse();

  // Weight tracking data
  const weightData = useMemo(() => {
    const sortedWeights = [...state.weightRecords].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    if (sortedWeights.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    // Get last 30 days or all records if less than 30
    const recentWeights = sortedWeights.slice(-30);
    const labels = recentWeights.map((w) => format(w.date, 'MMM d'));
    const data = recentWeights.map((w) => {
      // Convert to kg for consistent display
      const weightInKg = w.unit === 'kg' ? w.weight : w.weight * 0.453592;
      return parseFloat(weightInKg.toFixed(1));
    });

    return {
      labels: labels.length > 7 ? labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0) : labels,
      datasets: [{ data }],
    };
  }, [state.weightRecords]);

  const handleAddWeight = async () => {
    const weight = parseFloat(weightValue);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight.');
      return;
    }

    try {
      await addWeight({
        id: Date.now().toString(),
        date: new Date(),
        weight,
        unit: weightUnit,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWeightDialogVisible(false);
      setWeightValue('');
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight. Please try again.');
      console.error('Error saving weight:', error);
    }
  };

  if (!state.isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.statsCard} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.statsTitle}>
            Statistics
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {stats.completedFasts}
              </Text>
              <Text variant="bodySmall">Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {stats.totalFasts}
              </Text>
              <Text variant="bodySmall">Total Fasts</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {Math.round(stats.successRate)}%
              </Text>
              <Text variant="bodySmall">Success Rate</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {Math.round(stats.avgDuration)}h
              </Text>
              <Text variant="bodySmall">Avg Duration</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.fastsCard} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Fast History
          </Text>
          {sortedFastDates.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No fasts recorded yet
            </Text>
          ) : (
            sortedFastDates.slice(0, 10).map((dateKey) => {
              const fasts = fastsByDate[dateKey];
              const date = new Date(dateKey);
              return (
                <View key={dateKey} style={styles.fastItem}>
                  <View style={styles.fastHeader}>
                    <Text variant="titleMedium">{format(date, 'MMM d, yyyy')}</Text>
                    <Chip
                      icon={fasts[0]?.completed ? 'check-circle' : 'clock-outline'}
                      style={styles.fastChip}
                    >
                      {fasts[0]?.type === 'fast_1' ? 'Fast 1' : 'Fast 2'}
                    </Chip>
                  </View>
                  <Text variant="bodySmall" style={styles.fastDetails}>
                    Duration: {fasts[0]?.duration || 0} hours
                    {fasts[0]?.completed ? ' • Completed' : ' • Incomplete'}
                  </Text>
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      <Card style={styles.weightCard} mode="outlined">
        <Card.Content>
          <View style={styles.weightHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Weight Tracking
            </Text>
            <Button
              mode="contained"
              onPress={() => setWeightDialogVisible(true)}
              icon="plus"
              compact
            >
              Add
            </Button>
          </View>
          {state.weightRecords.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No weight records yet. Add your first weight entry to start tracking.
            </Text>
          ) : (
            <>
              <LineChart
                data={weightData}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  backgroundColor: theme.colors.surface,
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(${theme.colors.primary.replace('#', '').match(/.{1,2}/g)?.map(x => parseInt(x, 16)).join(', ') || '99, 102, 241'}, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(${theme.colors.onSurface.replace('#', '').match(/.{1,2}/g)?.map(x => parseInt(x, 16)).join(', ') || '31, 41, 55'}, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: theme.colors.primary,
                  },
                }}
                bezier
                style={styles.chart}
              />
              {state.weightRecords.length > 0 && (
                <View style={styles.recentWeights}>
                  <Text variant="bodySmall" style={styles.recentWeightsTitle}>
                    Recent Entries
                  </Text>
                  {state.weightRecords
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .slice(0, 5)
                    .map((record) => (
                      <View key={record.id} style={styles.weightEntry}>
                        <Text variant="bodyMedium">
                          {format(record.date, 'MMM d, yyyy')}
                        </Text>
                        <Text variant="bodyLarge" style={{ fontWeight: 'bold' }}>
                          {record.weight} {record.unit}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.mealsCard} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Meal History
          </Text>
          {stats.sortedMealDates.length === 0 ? (
            <Text variant="bodyMedium" style={styles.emptyText}>
              No meals logged yet
            </Text>
          ) : (
            stats.sortedMealDates.slice(0, 10).map((dateKey) => {
              const meals = stats.mealsByDate[dateKey];
              const date = new Date(dateKey);
              return (
                <View key={dateKey} style={styles.dateSection}>
                  <Text variant="titleSmall" style={styles.dateHeader}>
                    {format(date, 'MMMM d, yyyy')}
                  </Text>
                  {meals.map((meal) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onDelete={deleteMeal}
                    />
                  ))}
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      <Portal>
        <Dialog
          visible={!!weightDialogVisible}
          onDismiss={() => setWeightDialogVisible(false)}
        >
          <Dialog.Title>Add Weight Entry</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Weight"
              value={weightValue}
              onChangeText={setWeightValue}
              keyboardType="decimal-pad"
              mode="outlined"
              style={styles.weightInput}
            />
            <View style={styles.unitButtons}>
              <Button
                mode={weightUnit === 'kg' ? 'contained' : 'outlined'}
                onPress={() => setWeightUnit('kg')}
                style={styles.unitButton}
              >
                kg
              </Button>
              <Button
                mode={weightUnit === 'lbs' ? 'contained' : 'outlined'}
                onPress={() => setWeightUnit('lbs')}
                style={styles.unitButton}
              >
                lbs
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setWeightDialogVisible(false)}>Cancel</Button>
            <Button onPress={handleAddWeight}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  statsCard: {
    marginBottom: 16,
  },
  statsTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  fastsCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  fastItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  fastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fastChip: {
    marginLeft: 8,
  },
  fastDetails: {
    opacity: 0.7,
  },
  mealsCard: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginVertical: 24,
  },
  dateSection: {
    marginBottom: 16,
  },
  dateHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  weightCard: {
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 16,
    borderRadius: 16,
  },
  recentWeights: {
    marginTop: 16,
  },
  recentWeightsTitle: {
    marginBottom: 12,
    opacity: 0.7,
  },
  weightEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  weightInput: {
    marginBottom: 16,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  unitButton: {
    flex: 1,
  },
});
