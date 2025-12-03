import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useFasting } from '../context/FastingContext';
import { Timer } from '../components/Timer';
import { ProgressRing } from '../components/ProgressRing';
import { PhaseIndicator } from '../components/PhaseIndicator';
import { canLogMeal, getPhaseDisplayName } from '../utils/fastingCalculations';
import { getPhaseColors } from '../constants/theme';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';

export function HomeScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state, updatePhase } = useFasting();

  const currentPhase = state.currentPhase;
  const phaseColors = currentPhase
    ? getPhaseColors(currentPhase.phase, isDark)
    : null;

  // Calculate progress (0 to 1)
  const progress = useMemo(() => {
    if (!currentPhase) return 0;
    const totalDuration = currentPhase.endTime.getTime() - currentPhase.startTime.getTime();
    const elapsed = totalDuration - currentPhase.timeRemaining;
    return Math.max(0, Math.min(1, elapsed / totalDuration));
  }, [currentPhase]);

  // Calculate stats
  const stats = useMemo(() => {
    const completedFasts = state.fastHistory.filter((fast) => fast.completed).length;
    const totalFasts = state.fastHistory.length;

    // Calculate current streak (consecutive completed fasts)
    let streak = 0;
    const sortedFasts = [...state.fastHistory].sort(
      (a, b) => b.endTime.getTime() - a.endTime.getTime()
    );
    for (const fast of sortedFasts) {
      if (fast.completed) {
        streak++;
      } else {
        break;
      }
    }

    return {
      completedFasts,
      totalFasts,
      streak,
      successRate: totalFasts > 0 ? (completedFasts / totalFasts) * 100 : 0,
    };
  }, [state.fastHistory]);

  const canLogMealNow = currentPhase ? canLogMeal(currentPhase.phase) : false;

  useEffect(() => {
    // Update phase every second for timer accuracy
    const interval = setInterval(() => {
      updatePhase();
    }, 1000);

    return () => clearInterval(interval);
  }, [updatePhase]);

  const handleLogMeal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // @ts-ignore - navigation type
    navigation.navigate('MealLog');
  };

  if (!state.isInitialized) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!currentPhase) {
    return (
      <View style={styles.container}>
        <Text>No phase information available</Text>
      </View>
    );
  }

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

      <View style={styles.timerSection}>
        <ProgressRing progress={progress} phase={currentPhase.phase} size={220} />
        <View style={styles.timerContainer}>
          <Timer timeRemaining={currentPhase.timeRemaining} size="large" />
        </View>
      </View>

      <Card style={styles.statsCard} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.statsTitle}>
            Your Progress
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {stats.streak}
              </Text>
              <Text variant="bodySmall">Day Streak</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {stats.completedFasts}
              </Text>
              <Text variant="bodySmall">Fasts Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="headlineMedium" style={{ color: theme.colors.primary }}>
                {Math.round(stats.successRate)}%
              </Text>
              <Text variant="bodySmall">Success Rate</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        {canLogMealNow && (
          <Button
            mode="contained"
            onPress={handleLogMeal}
            icon="food"
            style={styles.actionButton}
          >
            Log Meal
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // @ts-ignore
            navigation.navigate('Timer');
          }}
          icon="timer"
          style={styles.actionButton}
        >
          View Timer
        </Button>
      </View>

      <Card style={styles.infoCard} mode="outlined">
        <Card.Content>
          <Text variant="titleSmall" style={styles.infoTitle}>
            Current Phase
          </Text>
          <Text variant="bodyMedium">{getPhaseDisplayName(currentPhase.phase)}</Text>
          <Text variant="bodySmall" style={styles.infoSubtext}>
            {currentPhase.timeRemaining > 0
              ? 'Time remaining in current phase'
              : 'Phase completed'}
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
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 24,
  },
  timerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    position: 'relative',
  },
  timerContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    width: '100%',
    marginVertical: 16,
  },
  statsTitle: {
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  actions: {
    width: '100%',
    marginVertical: 16,
    gap: 12,
  },
  actionButton: {
    marginVertical: 4,
  },
  infoCard: {
    width: '100%',
    marginTop: 8,
  },
  infoTitle: {
    marginBottom: 8,
  },
  infoSubtext: {
    marginTop: 4,
    opacity: 0.7,
  },
});
