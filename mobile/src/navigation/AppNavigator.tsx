import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { LoginScreen } from '../screens/LoginScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ProjectsScreen } from '../screens/ProjectsScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { FieldScreen } from '../screens/FieldScreen';
import { MaterialsScreen } from '../screens/MaterialsScreen';
import { PersonnelScreen } from '../screens/PersonnelScreen';
import { OfficeCostsScreen } from '../screens/OfficeCostsScreen';
import { ActivityLogScreen } from '../screens/ActivityLogScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { useAuthStore } from '../services/authStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ name, color }: { name: string; color: string }) => {
  const icons: Record<string, string> = {
    dashboard: '📊',
    projects: '📡',
    tasks: '📋',
    field: '📷',
    materials: '📦',
    officeCosts: '💼',
    personnel: '👥',
    activityLog: '📜',
    account: '👤',
  };
  return <Text style={{ color, fontSize: 18 }}>{icons[name] || '📌'}</Text>;
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          let iconName = 'dashboard';
          if (route.name === 'Dashboard') iconName = 'dashboard';
          else if (route.name === 'Projects') iconName = 'projects';
          else if (route.name === 'Tasks') iconName = 'tasks';
          else if (route.name === 'Field') iconName = 'field';
          else if (route.name === 'Materials') iconName = 'materials';
          else if (route.name === 'OfficeCosts') iconName = 'officeCosts';
          else if (route.name === 'Personnel') iconName = 'personnel';
          else if (route.name === 'ActivityLog') iconName = 'activityLog';
          else if (route.name === 'Account') iconName = 'account';
          
          return <TabIcon name={iconName} color={color} />;
        },
        tabBarActiveTintColor: '#00236f',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: 'bold' },
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#e2e8f0',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        headerStyle: { backgroundColor: '#00236f' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' }
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
      <Tab.Screen name="Projects" component={ProjectsScreen} options={{ title: 'Dự án' }} />
      <Tab.Screen name="Tasks" component={TasksScreen} options={{ title: 'Công việc' }} />
      <Tab.Screen name="Field" component={FieldScreen} options={{ title: 'Hiện trường' }} />
      <Tab.Screen name="Materials" component={MaterialsScreen} options={{ title: 'Tổng kho' }} />
      <Tab.Screen name="OfficeCosts" component={OfficeCostsScreen} options={{ title: 'Quỹ VP' }} />
      <Tab.Screen name="Personnel" component={PersonnelScreen} options={{ title: 'Nhân sự' }} />
      <Tab.Screen name="ActivityLog" component={ActivityLogScreen} options={{ title: 'Nhật ký' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản' }} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const user = useAuthStore(state => state.user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};
