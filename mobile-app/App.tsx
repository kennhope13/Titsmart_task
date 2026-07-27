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
  const fetchProjects = useRealtimeStore((state) => state.fetchProjects);
  const fetchTasks = useRealtimeStore((state) => state.fetchTasks);
  const fetchMaterials = useRealtimeStore((state) => state.fetchMaterials);
  const fetchIssues = useRealtimeStore((state) => state.fetchIssues);
  const fetchEngineers = useRealtimeStore((state) => state.fetchEngineers);
  const fetchActivityLogs = useRealtimeStore((state) => state.fetchActivityLogs);
  const fetchAccounting = useRealtimeStore((state) => state.fetchAccounting);
  const isLoaded = useRealtimeStore((state) => state.isLoaded);

  useEffect(() => {
    loadState();
    fetchProjects();
    fetchTasks();
    fetchMaterials();
    fetchIssues();
    fetchEngineers();
    fetchActivityLogs();
    fetchAccounting();
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
        <StatusBar style="dark" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
