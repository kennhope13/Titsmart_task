import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LayoutDashboard, ClipboardList, Package, TriangleAlert, FileBarChart } from 'lucide-react-native';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TaskManagementScreen } from '../screens/TaskManagementScreen';
import { MaterialTrackingScreen } from '../screens/MaterialTrackingScreen';
import { IssueResolutionScreen } from '../screens/IssueResolutionScreen';
import { ReportExportScreen } from '../screens/ReportExportScreen';
import { colors } from '../theme';

export type RootTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Materials: undefined;
  Issues: undefined;
  Reports: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

const iconFor = (routeName: keyof RootTabParamList, color: string, size: number) => {
  const props = { color, size, strokeWidth: 2.4 };
  if (routeName === 'Dashboard') return <LayoutDashboard {...props} />;
  if (routeName === 'Tasks') return <ClipboardList {...props} />;
  if (routeName === 'Materials') return <Package {...props} />;
  if (routeName === 'Issues') return <TriangleAlert {...props} />;
  return <FileBarChart {...props} />;
};

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ color, size }) => iconFor(route.name, color, size),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.slate[400],
      tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      tabBarStyle: {
        borderTopWidth: 1,
        borderTopColor: colors.slate[200],
        backgroundColor: colors.white,
        height: 66,
        paddingBottom: 9,
        paddingTop: 8,
      },
      headerStyle: { backgroundColor: colors.primary },
      headerTintColor: colors.white,
      headerTitleStyle: { fontWeight: '800', fontSize: 16 },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'T\u1ed5ng quan' }} />
    <Tab.Screen name="Tasks" component={TaskManagementScreen} options={{ title: 'C\u00f4ng vi\u1ec7c' }} />
    <Tab.Screen name="Materials" component={MaterialTrackingScreen} options={{ title: 'V\u1eadt t\u01b0' }} />
    <Tab.Screen name="Issues" component={IssueResolutionScreen} options={{ title: 'S\u1ef1 c\u1ed1' }} />
    <Tab.Screen name="Reports" component={ReportExportScreen} options={{ title: 'B\u00e1o c\u00e1o' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
  </Stack.Navigator>
);
