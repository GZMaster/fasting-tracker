import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Chip, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getPhaseDisplayName, getNextPhase } from '../utils/fastingCalculations';
import { getPhaseColors } from '../constants/theme';
import type { PhaseType } from '../types';
import { useColorScheme } from 'react-native';

interface PhaseIndicatorProps {
  phase: PhaseType;
  showNext?: boolean;
}

export function PhaseIndicator({ phase, showNext = false }: PhaseIndicatorProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const phaseColors = getPhaseColors(phase, isDark);

  const getPhaseIcon = (phaseType: PhaseType) => {
    switch (phaseType) {
      case 'fast_1':
      case 'fast_2':
        return 'timer-sand';
      case 'eating_window_1':
      case 'daily_eating_window':
      case 'recovery_eating_window':
        return 'food';
      default:
        return 'circle';
    }
  };

  const nextPhase = showNext ? getNextPhase(phase) : null;

  return (
    <View style={styles.container}>
      <Chip
        icon={() => (
          <MaterialCommunityIcons
            name={getPhaseIcon(phase)}
            size={20}
            color={phaseColors.primary}
          />
        )}
        style={[styles.chip, { backgroundColor: phaseColors.background }]}
        textStyle={{ color: phaseColors.text }}
      >
        {getPhaseDisplayName(phase)}
      </Chip>
      {showNext && nextPhase && nextPhase !== phase && (
        <View style={styles.nextContainer}>
          <Text variant="bodySmall" style={styles.nextLabel}>
            Next: {getPhaseDisplayName(nextPhase)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  chip: {
    marginVertical: 4,
  },
  nextContainer: {
    marginTop: 8,
  },
  nextLabel: {
    opacity: 0.7,
  },
});

