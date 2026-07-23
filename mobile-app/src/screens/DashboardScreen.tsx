import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LayoutDashboard,
  Plus,
  UserPlus,
  UsersRound,
} from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks, projects, engineers } = useRealtimeStore();
  const pureTasks = tasks.filter((task) => !task.isSectionHeader);
  const completed = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const inProgress = pureTasks.filter((task) => !task.isDone && task.progress > 0 && task.progress < 1).length;
  const waitingReview = pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).length;
  const late = pureTasks.filter((task) => !!task.issue && !(task.isDone || task.progress >= 1)).length;
  const notStarted = pureTasks.length - completed - inProgress - waitingReview - late;
  const assigned = pureTasks.filter((task) => task.assignedEngineerName).length;
  const completionRate = pureTasks.length ? Math.round((completed / pureTasks.length) * 100) : 0;

  const quickActions = [
    { label: 'Tạo việc', icon: <Plus size={19} color={colors.primary} />, onPress: () => navigation.navigate('Tasks') },
    { label: 'Giao việc', icon: <UserPlus size={19} color="#047857" />, onPress: () => navigation.navigate('Tasks') },
    { label: 'Duyệt báo cáo', icon: <FileCheck2 size={19} color="#a16207" />, onPress: () => navigation.navigate('Reports') },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<LayoutDashboard size={21} color={colors.primary} />}
          title="Tổng quan"
          subtitle="Tình hình công trường hôm nay"
          action={
            <Pressable style={styles.iconButton}>
              <Bell size={20} color={colors.slate[700]} />
              {waitingReview > 0 ? <View style={styles.notificationDot} /> : null}
            </Pressable>
          }
        />

        <View style={styles.welcome}>
          <View style={styles.welcomeCopy}>
            <AppText style={styles.eyebrow}>TIẾN ĐỘ TOÀN BỘ</AppText>
            <AppText style={styles.welcomeTitle}>{completionRate}% hoàn thành</AppText>
            <AppText style={styles.welcomeText}>{completed}/{pureTasks.length} công việc đã hoàn tất</AppText>
          </View>
          <View style={styles.progressCircle}>
            <AppText style={styles.progressValue}>{completionRate}%</AppText>
          </View>
        </View>

        <View style={styles.grid}>
          <StatCard label="Đang thực hiện" value={inProgress} icon={<Clock3 size={17} color={colors.primary} />} />
          <StatCard label="Chờ duyệt" value={waitingReview} tone="amber" icon={<FileCheck2 size={17} color="#a16207" />} />
          <StatCard label="Hoàn thành" value={completed} tone="green" icon={<CheckCircle2 size={17} color="#047857" />} />
          <StatCard label="Trễ hạn/Vướng" value={late} tone="slate" icon={<UsersRound size={17} color={colors.slate[600]} />} />
        </View>

        {/* THÊM BIỂU ĐỒ VÀO ĐÂY */}
        <SectionTitle title="Biểu đồ phân bổ" />
        
        {/* 1. Biểu đồ thanh ngang (Stacked Bar) cho Trạng thái công việc */}
        <Card style={styles.chartCard}>
          <AppText style={styles.chartTitle}>Tỉ lệ trạng thái công việc</AppText>
          <View style={styles.stackedBarContainer}>
             <View style={[styles.stackedBarSegment, { flex: completed || 1, backgroundColor: '#10b981' }]} />
             <View style={[styles.stackedBarSegment, { flex: inProgress || 1, backgroundColor: '#3b82f6' }]} />
             <View style={[styles.stackedBarSegment, { flex: waitingReview || 1, backgroundColor: '#f59e0b' }]} />
             <View style={[styles.stackedBarSegment, { flex: late || 1, backgroundColor: '#ef4444' }]} />
             <View style={[styles.stackedBarSegment, { flex: notStarted || 1, backgroundColor: '#e2e8f0' }]} />
          </View>
          <View style={styles.chartLegend}>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><AppText style={styles.legendText}>Hoàn thành ({completed})</AppText></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><AppText style={styles.legendText}>Đang làm ({inProgress})</AppText></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><AppText style={styles.legendText}>Chờ duyệt ({waitingReview})</AppText></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><AppText style={styles.legendText}>Trễ/Vướng ({late})</AppText></View>
             <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#e2e8f0' }]} /><AppText style={styles.legendText}>Chưa bắt đầu ({notStarted})</AppText></View>
          </View>
        </Card>

        {/* 2. Biểu đồ cột đứng (Vertical Bar) cho Tiến độ Dự án */}
        <Card style={styles.chartCard}>
          <AppText style={styles.chartTitle}>Tiến độ theo Dự án</AppText>
          <View style={styles.barChartContainer}>
            {projects.map(proj => (
              <View key={proj.id} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${Math.max(5, proj.progressPercent)}%` }]} />
                </View>
                <AppText style={styles.barLabel} numberOfLines={1}>{proj.code}</AppText>
                <AppText style={styles.barValue}>{proj.progressPercent}%</AppText>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle title="Thao tác nhanh" />
        <View style={styles.quickRow}>
          {quickActions.map((item) => (
            <Pressable key={item.label} style={styles.quickItem} onPress={item.onPress}>
              <View style={styles.quickIcon}>{item.icon}</View>
              <AppText style={styles.quickLabel}>{item.label}</AppText>
            </Pressable>
          ))}
        </View>

        <SectionTitle title="Công việc cần chú ý" caption="Ưu tiên xử lý trong hôm nay" />
        <Card style={styles.attentionCard}>
          {pureTasks.slice(0, 3).map((task, index) => (
            <Pressable
              key={task.id}
              onPress={() => navigation.navigate('Tasks')}
              style={[styles.taskRow, index < Math.min(2, pureTasks.length - 1) ? styles.taskDivider : undefined]}
            >
              <View style={styles.taskMarker}><ClipboardCheck size={17} color={colors.primary} /></View>
              <View style={styles.taskCopy}>
                <AppText style={styles.taskTitle} numberOfLines={1}>{task.name}</AppText>
                <View style={styles.taskMeta}>
                  <AppText style={styles.taskMetaText} numberOfLines={1}>{task.assignedEngineerName || 'Chưa phân công'}</AppText>
                  <StatusBadge label={`${Math.round(task.progress * 100)}%`} tone={task.progress >= 1 ? 'green' : 'blue'} />
                </View>
              </View>
              <ChevronRight size={18} color={colors.slate[400]} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  iconButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1, borderColor: colors.white },
  welcome: { margin: 16, marginBottom: 12, padding: 18, borderRadius: 14, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center' },
  welcomeCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '800', color: '#bfdbfe' },
  welcomeTitle: { marginTop: 7, fontSize: 22, fontWeight: '800', color: colors.white },
  welcomeText: { marginTop: 4, fontSize: 12, color: '#dbeafe' },
  progressCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 7, borderColor: '#60a5fa', backgroundColor: '#172554', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: colors.white, fontSize: 16, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  
  /* Chart Styles */
  chartCard: { marginHorizontal: 16, marginBottom: 12, padding: 16 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: colors.slate[800], marginBottom: 16 },
  stackedBarContainer: { flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.slate[100] },
  stackedBarSegment: { height: '100%' },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '45%' },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: colors.slate[600], fontWeight: '500' },
  
  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingBottom: 10 },
  barCol: { alignItems: 'center', width: 50 },
  barTrack: { width: 24, height: 100, backgroundColor: colors.slate[100], borderRadius: 12, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 8 },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 12 },
  barLabel: { fontSize: 10, fontWeight: '700', color: colors.slate[700], textAlign: 'center' },
  barValue: { fontSize: 10, color: colors.slate[500], marginTop: 2 },

  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  quickItem: { flex: 1, minHeight: 92, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.slate[50], alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center', color: colors.slate[700] },
  attentionCard: { marginHorizontal: 16, paddingVertical: 2 },
  taskRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  taskDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  taskMarker: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  taskCopy: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '700', color: colors.slate[900] },
  taskMeta: { marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 7 },
  taskMetaText: { flex: 1, fontSize: 11, color: colors.slate[500] },
});

