import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ClipboardList, LayoutDashboard, MoreHorizontal, Package, ScanText, BriefcaseBusiness } from 'lucide-react-native';
import { colors } from '../theme';

export type RootTabParamList = {
  DashboardTab: undefined;
  ProjectsTab: undefined;
  TasksTab: undefined;
  MaterialsTab: undefined;
  More: undefined;
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
const MoreScreen = lazyScreen(() => require('../screens/MoreScreen'), 'MoreScreen');
const ProjectManagementScreen = lazyScreen(() => require('../screens/ProjectManagementScreen'), 'ProjectManagementScreen');
const ProjectDetailScreen = lazyScreen(() => require('../screens/ProjectDetailScreen'), 'ProjectDetailScreen');
const ProjectCostPlanScreen = lazyScreen(() => require('../screens/ProjectCostPlanScreen'), 'ProjectCostPlanScreen');
const DocumentTrackingScreen = lazyScreen(() => require('../screens/DocumentTrackingScreen'), 'DocumentTrackingScreen');
const FieldLogsScreen = lazyScreen(() => require('../screens/FieldLogsScreen'), 'FieldLogsScreen');
const ActivityLogScreen = lazyScreen(() => require('../screens/ActivityLogScreen'), 'ActivityLogScreen');

const iconFor = (routeName: keyof RootTabParamList, color: string, size: number) => {
  const props = { color, size, strokeWidth: 2.3 };
  if (routeName === 'DashboardTab') return <LayoutDashboard {...props} />;
  if (routeName === 'ProjectsTab') return <BriefcaseBusiness {...props} />;
  if (routeName === 'TasksTab') return <ClipboardList {...props} />;
  if (routeName === 'MaterialsTab') return <Package {...props} />;
  return <MoreHorizontal {...props} />;
};

export const TabNavigator = () => (
  <Tab.Navigator
    initialRouteName="DashboardTab"
    screenOptions={({ route }) => ({
      headerShown: false,
      lazy: true,
      tabBarIcon: ({ color, size }) => iconFor(route.name, color, size),
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.slate[400],
      tabBarLabelStyle: { fontSize: 9, fontWeight: '800', marginTop: 2 },
      tabBarItemStyle: { paddingVertical: 4 },
      tabBarStyle: { borderTopWidth: 1, borderTopColor: colors.slate[200], backgroundColor: colors.white, height: 64, paddingBottom: 7, paddingTop: 5 },
    })}
  >
    <Tab.Screen name="DashboardTab" component={DashboardScreen} options={{ title: 'Tổng quan' }} />
    <Tab.Screen name="ProjectsTab" component={ProjectManagementScreen} options={{ title: 'Dự án' }} />
    <Tab.Screen name="TasksTab" component={TaskManagementScreen} options={{ title: 'Công việc' }} />
    <Tab.Screen name="MaterialsTab" component={MaterialTrackingScreen} options={{ title: 'Vật tư' }} />
    <Tab.Screen name="More" component={MoreScreen} options={{ title: 'Thêm' }} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={TabNavigator} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Projects" component={ProjectManagementScreen} />
    <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    <Stack.Screen name="Materials" component={MaterialTrackingScreen} />
    <Stack.Screen name="Tasks" component={TaskManagementScreen} />
    <Stack.Screen name="TaskForm" component={TaskFormScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <Stack.Screen name="CostPlan" component={ProjectCostPlanScreen} />
    <Stack.Screen name="Documents" component={DocumentTrackingScreen} />
    <Stack.Screen name="FieldLogs" component={FieldLogsScreen} />
    <Stack.Screen name="Issues" component={IssueResolutionScreen} />
    <Stack.Screen name="Reports" component={ReportExportScreen} />
    <Stack.Screen name="Personnel" component={PersonnelScreen} />
    <Stack.Screen name="ActivityLog" component={ActivityLogScreen} />
    <Stack.Screen name="Account" component={AccountScreen} />
  </Stack.Navigator>
);


