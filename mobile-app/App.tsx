import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useRealtimeStore } from './src/services/realtimeStore';
import { View, ActivityIndicator } from 'react-native';
import { colors } from './src/theme';

export default function App() {
  const loadState = useRealtimeStore((state) => state.loadState);
  const isLoaded = useRealtimeStore((state) => state.isLoaded);

  useEffect(() => {
    loadState();
  }, []);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.slate[50] }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
