import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Card, Text, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { MealEntry, MealType } from '../types';

interface MealCardProps {
  meal: MealEntry;
  onDelete?: (mealId: string) => void;
  onEdit?: (meal: MealEntry) => void;
}

const mealTypeLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const mealTypeIcons: Record<MealType, string> = {
  breakfast: 'weather-sunny',
  lunch: 'weather-sunset',
  dinner: 'weather-night',
  snack: 'cookie',
};

export function MealCard({ meal, onDelete, onEdit }: MealCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.mealInfo}>
            <MaterialCommunityIcons
              name={mealTypeIcons[meal.mealType]}
              size={24}
              color={theme.colors.primary}
            />
            <View style={styles.mealDetails}>
              <Text variant="titleMedium">{mealTypeLabels[meal.mealType]}</Text>
              <Text variant="bodySmall" style={styles.timestamp}>
                {format(meal.timestamp, 'MMM d, yyyy • h:mm a')}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            {onEdit && (
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => onEdit(meal)}
                iconColor={theme.colors.primary}
              />
            )}
            {onDelete && (
              <IconButton
                icon="delete"
                size={20}
                onPress={() => onDelete(meal.id)}
                iconColor={theme.colors.error}
              />
            )}
          </View>
        </View>
        {meal.notes && (
          <Text variant="bodyMedium" style={styles.notes}>
            {meal.notes}
          </Text>
        )}
        {meal.photoUri && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: meal.photoUri }} style={styles.photo} />
          </View>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mealDetails: {
    marginLeft: 12,
    flex: 1,
  },
  timestamp: {
    opacity: 0.7,
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
  },
  notes: {
    marginTop: 8,
    marginBottom: 8,
  },
  photoContainer: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
});

