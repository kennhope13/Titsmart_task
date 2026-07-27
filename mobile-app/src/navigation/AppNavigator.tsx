import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardList, FileBarChart, LayoutDashboard, Package, ScanText, TriangleAlert, UserCircle2, UsersRound } from 'lucide-react-native';
import { colors } from '../theme';

export type RootTabParamList = {
  Dashboard: undefined;
  Tasks: undefined;
  Materials: undefined;
  Issues: undefined;
  Personnel: undefined;
  Reports: { initialTab?: string } | undefined;
  Ocr: undefined;
  Account: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();

type ScreenModule = Record<string, React.ComponentType<any>>;

const lazyScreen = (loader: () => ScreenModule, exportName: string) => {
  const LazyComponent = (props: any) => {
    const Component = React.useMemo(() => loader()[exportName], []);
    return <Component {...props} />;
  };

  return LazyComponent;
};

const DashboardScreen = lazyScreen(() => require('../screens/DashboardScreen'), 'DashboardScreen');
const TaskManagementScreen = lazyScreen(() => require('../screens/TaskManagementScreen'), 'TaskManagementScreen');
const MaterialTrackingScreen = lazyScreen(() => require('../screens/MaterialTrackingScreen'), 'MaterialTrackingScreen');
const IssueResolutionScreen = lazyScreen(() => require('../screens/IssueResolutionScreen'), 'IssueResolutionScreen');
const PersonnelScreen = lazyScreen(() => require('../screens/PersonnelScreen'), 'PersonnelScreen');
const ReportExportScreen = lazyScreen(() => require('../screens/ReportExportScreen'), 'ReportExportScreen');
const OcrScannerScreen = lazyScreen(() => require('../screens/OcrScannerScreen'), 'OcrScannerScreen');
const AccountScreen = lazyScreen(() => require('../screens/AccountScreen'), 'AccountScreen');
const TaskFormScreen = lazyScreen(() => require('../screens/TaskFormScreen'), 'TaskFormScreen');
const TaskDetailScreen = lazyScreen(() => require('../screens/TaskDetailScreen'), 'TaskDetailScreen');

const iconFor = (routeName: keyof RootTabParamList, color: string, size: number) => {
  const props = { color, size, strokeWidth: 2.3 };
  if (routeName === 'Dashboard') return <LayoutDashboard {...props} />;
  if (routeName === 'Tasks') return <ClipboardList {...props} />;
  if (routeName === 'Materials') return <Package {...props} />;
  if (routeName === 'Issues') return <TriangleAlert {...props} />;
  if (routeName === 'Personnel') return <UsersRound {...props} />;
  if (routeName === 'Reports') return <FileBarChart {...props} />;
  if (routeName === 'Ocr') return <ScanText {...props} />;
  return <UserCircle2 {...props} />;
};

export const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      lazy: true,
      tabBarIcon: ({ color, size }) => iconFor(route.name, color, size),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.slate[400],
      tabBarLabelStyle: { fontSize: 9, fontWeight: '700', marginTop: 2 },
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.slate[200], backgroundColor: colors.white, height: 64, paddingBottom: 7, paddingTop: 5 },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
    <Tab.Screen name="Tasks" component={TaskManagementScreen} options={{ title: 'Công việc' }} />
    <Tab.Screen name="Materials" component={MaterialTrackingScreen} options={{ title: 'Vật tư' }} />
    <Tab.Screen name="Issues" component={IssueResolutionScreen} options={{ title: 'Sự cố' }} />
    <Tab.Screen name="Personnel" component={PersonnelScreen} options={{ title: 'Nhân sự' }} />
    <Tab.Screen name="Reports" component={ReportExportScreen} options={{ title: 'Báo cáo' }} />
    <Tab.Screen name="Ocr" component={OcrScannerScreen} options={{ title: 'OCR' }} />
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