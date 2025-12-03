import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  SegmentedButtons,
  useTheme,
  IconButton,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useFasting } from '../context/FastingContext';
import { canLogMeal, getPhaseDisplayName } from '../utils/fastingCalculations';
import type { MealType } from '../types';
import * as Haptics from 'expo-haptics';
import { format } from 'date-fns';

export function MealLogScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { state, addMeal } = useFasting();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [notes, setNotes] = useState('');
  const [timestamp, setTimestamp] = useState(new Date());
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const currentPhase = state.currentPhase;
  const canLog = currentPhase ? canLogMeal(currentPhase.phase) : false;

  useEffect(() => {
    if (!canLog && currentPhase) {
      Alert.alert(
        'Cannot Log Meal',
        `Meal logging is only available during eating windows. Current phase: ${getPhaseDisplayName(currentPhase.phase)}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [canLog, currentPhase, navigation]);

  const requestImagePermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to add photos to your meals.'
      );
      return false;
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestImagePermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      console.error('Error taking photo:', error);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const handleSave = async () => {
    if (!canLog) {
      Alert.alert('Error', 'Cannot log meals during fasting periods.');
      return;
    }

    if (!notes.trim()) {
      Alert.alert('Error', 'Please add some notes about your meal.');
      return;
    }

    try {
      const meal = {
        id: Date.now().toString(),
        timestamp,
        mealType,
        notes: notes.trim(),
        photoUri: photoUri || undefined,
      };

      await addMeal(meal);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save meal. Please try again.');
      console.error('Error saving meal:', error);
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
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Log Meal
          </Text>

          {!canLog && currentPhase && (
            <Card style={styles.warningCard} mode="outlined">
              <Card.Content>
                <Text variant="bodyMedium" style={styles.warningText}>
                  Meal logging is only available during eating windows.
                </Text>
                <Text variant="bodySmall" style={styles.warningSubtext}>
                  Current phase: {getPhaseDisplayName(currentPhase.phase)}
                </Text>
              </Card.Content>
            </Card>
          )}

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Meal Type
            </Text>
            <SegmentedButtons
              value={mealType}
              onValueChange={(value) => setMealType(value as MealType)}
              buttons={[
                { value: 'breakfast', label: 'Breakfast', icon: 'weather-sunny' },
                { value: 'lunch', label: 'Lunch', icon: 'weather-sunset' },
                { value: 'dinner', label: 'Dinner', icon: 'weather-night' },
                { value: 'snack', label: 'Snack', icon: 'cookie' },
              ]}
              style={styles.segmentedButtons}
            />
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Time
            </Text>
            <Text variant="bodyLarge" style={styles.timestamp}>
              {format(timestamp, 'MMM d, yyyy • h:mm a')}
            </Text>
            <Text variant="bodySmall" style={styles.timestampHint}>
              (Logged at current time)
            </Text>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Photo (Optional)
            </Text>
            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photo} />
                <IconButton
                  icon="close"
                  size={24}
                  onPress={handleRemovePhoto}
                  style={styles.removePhotoButton}
                />
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <Button
                  mode="outlined"
                  onPress={handlePickImage}
                  icon="image"
                  disabled={!canLog}
                  style={styles.photoButton}
                >
                  Choose Photo
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleTakePhoto}
                  icon="camera"
                  disabled={!canLog}
                  style={styles.photoButton}
                >
                  Take Photo
                </Button>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              placeholder="What did you eat? Any notes?"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              disabled={!canLog}
              style={styles.notesInput}
            />
          </View>

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              disabled={!canLog || !notes.trim()}
              style={styles.button}
              icon="check"
            >
              Save Meal
            </Button>
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
  card: {
    width: '100%',
  },
  title: {
    marginBottom: 24,
  },
  warningCard: {
    marginBottom: 24,
    backgroundColor: '#fff3cd',
  },
  warningText: {
    color: '#856404',
    marginBottom: 4,
  },
  warningSubtext: {
    color: '#856404',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginTop: 8,
  },
  timestamp: {
    marginTop: 8,
  },
  timestampHint: {
    marginTop: 4,
    opacity: 0.7,
  },
  notesInput: {
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  photoContainer: {
    position: 'relative',
    marginTop: 8,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoButton: {
    flex: 1,
  },
});
