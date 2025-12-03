import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { formatTimeRemaining } from '../utils/fastingCalculations';

interface TimerProps {
  timeRemaining: number; // in milliseconds
  size?: 'small' | 'medium' | 'large';
}

export function Timer({ timeRemaining, size = 'large' }: TimerProps) {
  const theme = useTheme();
  const [displayTime, setDisplayTime] = useState(formatTimeRemaining(timeRemaining));

  useEffect(() => {
    setDisplayTime(formatTimeRemaining(timeRemaining));

    const interval = setInterval(() => {
      setDisplayTime(formatTimeRemaining(timeRemaining));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const fontSize = size === 'large' ? 48 : size === 'medium' ? 36 : 24;
  const fontFamily = 'monospace';

  return (
    <View style={styles.container}>
      <Text
        style={[
          styles.timer,
          {
            fontSize,
            color: theme.colors.primary,
            fontFamily,
          },
        ]}
      >
        {displayTime}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timer: {
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

