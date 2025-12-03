import { StatusBar } from 'expo-status-bar';
import { FastingProvider } from './src/context/FastingContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <FastingProvider>
      <AppNavigator />
      <StatusBar style="auto" />
    </FastingProvider>
  );
}
