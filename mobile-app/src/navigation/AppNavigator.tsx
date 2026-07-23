import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, ClipboardList, FileBarChart, UsersRound, UserCircle2 } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TaskManagementScreen } from '../screens/TaskManagementScreen';
import { PersonnelScreen } from '../screens/PersonnelScreen';
import { ReportExportScreen } from '../screens/ReportExportScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { TaskFormScreen } from '../screens/TaskFormScreen';
import { TaskDetailScreen } from '../screens/TaskDetailScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Personnel: undefined;
  Reports: { initialTab?: string } | undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

const iconFor = (routeName: keyof RootTabParamList, color: string, size: number) => {
  const props = { color, size, strokeWidth: 2.3 };
  if (routeName === 'Dashboard') return <LayoutDashboard {...props} />;
  if (routeName === 'Tasks') return <ClipboardList {...props} />;
  if (routeName === 'Personnel') return <UsersRound {...props} />;
  if (routeName === 'Reports') return <FileBarChart {...props} />;
  return <UserCircle2 {...props} />;
};

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => iconFor(route.name, color, size),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.slate[400],
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginTop: 2 },
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.slate[200], backgroundColor: colors.white, height: 64, paddingBottom: 7, paddingTop: 5 },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
    <Tab.Screen name="Tasks" component={TaskManagementScreen} options={{ title: 'Công việc' }} />
    <Tab.Screen name="Personnel" component={PersonnelScreen} options={{ title: 'Nhân sự' }} />
    <Tab.Screen name="Reports" component={ReportExportScreen} options={{ title: 'Báo cáo' }} />
    <Tab.Screen name="Account" component={AccountScreen} options={{ title: 'Tài khoản' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="TaskForm" component={TaskFormScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
  </Stack.Navigator>
);
