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
  FileText,
  LayoutDashboard,
  Plus,
  TriangleAlert,
  UserPlus,
  UsersRound,
} from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks, projects, engineers } = useRealtimeStore();
  
  const pureTasks = tasks.filter((task) => !task.isSectionHeader);
  const completed = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const inProgress = pureTasks.filter((task) => !task.isDone && task.progress > 0 && task.progress < 1).length;
  const waitingReview = pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).length;
  const late = pureTasks.filter((task) => !!task.issue && !(task.isDone || task.progress >= 1)).length;
  const notStarted = pureTasks.length - completed - inProgress - waitingReview - late;
  const completionRate = pureTasks.length ? Math.round((completed / pureTasks.length) * 100) : 0;

  const quickActions = [
    { label: 'Tạo việc mới', icon: <Plus size={19} color={colors.primary} />, onPress: () => navigation.navigate('TaskForm') },
    { label: 'Kho vật tư', icon: <PackageIcon size={19} color="#047857" />, onPress: () => navigation.navigate('Materials') },
    { label: 'Duyệt báo cáo', icon: <FileCheck2 size={19} color="#a16207" />, onPress: () => navigation.navigate('Reports') },
  ];

  return (
    <Screen>
      <ScreenHeader
        icon={<LayoutDashboard size={21} color={colors.primary} />}
        title="TitSmart"
        subtitle="Tổng quan công trường hôm nay"
        action={
          <Pressable style={styles.iconButton}>
            <Bell size={20} color={colors.slate[700]} />
            {waitingReview > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Chào mừng */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeTextContainer}>
            <AppText style={styles.greetingTitle}>Xin chào, Admin</AppText>
            <AppText style={styles.greetingSub}>Hôm nay bạn muốn cập nhật hạng mục nào?</AppText>
          </View>
        </View>

        {/* Thống kê tiến độ bằng Circular Gauge */}
        <Card style={styles.progressCard}>
          <View style={styles.progressInner}>
            <View style={styles.progressTextCol}>
              <AppText style={styles.progressCardTitle}>Tiến độ toàn bộ</AppText>
              <AppText style={styles.progressCardSub}>Dựa trên {pureTasks.length} đầu việc đã nhập</AppText>
              <View style={styles.progressCountRow}>
                <AppText style={styles.progressCountText}>{completed} đã xong</AppText>
                <AppText style={styles.progressCountDivider}>•</AppText>
                <AppText style={styles.progressCountText}>{inProgress} đang làm</AppText>
              </View>
            </View>
            <View style={styles.progressCircleContainer}>
              <View style={styles.progressCircle}>
                <AppText style={styles.progressValue}>{completionRate}%</AppText>
                <AppText style={styles.progressLabel}>XONG</AppText>
              </View>
            </View>
          </View>
        </Card>

        {/* Lưới 4 compact stats */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statBox, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
            <View style={styles.statIconRow}>
              <Clock3 size={18} color={colors.primary} />
              <AppText style={styles.statNum}>{inProgress}</AppText>
            </View>
            <AppText style={styles.statLabelText}>Đang làm</AppText>
          </Card>
          
          <Card style={[styles.statBox, { borderLeftColor: colors.warning, borderLeftWidth: 4 }]}>
            <View style={styles.statIconRow}>
              <FileCheck2 size={18} color={colors.warning} />
              <AppText style={styles.statNum}>{waitingReview}</AppText>
            </View>
            <AppText style={styles.statLabelText}>Chờ duyệt</AppText>
          </Card>

          <Card style={[styles.statBox, { borderLeftColor: colors.accent, borderLeftWidth: 4 }]}>
            <View style={styles.statIconRow}>
              <CheckCircle2 size={18} color={colors.accent} />
              <AppText style={styles.statNum}>{completed}</AppText>
            </View>
            <AppText style={styles.statLabelText}>Hoàn thành</AppText>
          </Card>

          <Card style={[styles.statBox, { borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
            <View style={styles.statIconRow}>
              <TriangleAlert size={18} color={colors.danger} />
              <AppText style={styles.statNum}>{late}</AppText>
            </View>
            <AppText style={styles.statLabelText}>Trễ / Vướng</AppText>
          </Card>
        </View>

        {/* Biểu đồ phân bổ trạng thái */}
        <SectionTitle title="Biểu đồ phân bổ trạng thái" />
        <Card style={styles.chartCard}>
          <AppText style={styles.chartTitle}>Tỉ lệ trạng thái công việc</AppText>
          <View style={styles.stackedBarContainer}>
            <View style={[styles.stackedBarSegment, { flex: completed || 0.001, backgroundColor: colors.accent }]} />
            <View style={[styles.stackedBarSegment, { flex: inProgress || 0.001, backgroundColor: colors.primary }]} />
            <View style={[styles.stackedBarSegment, { flex: waitingReview || 0.001, backgroundColor: colors.warning }]} />
            <View style={[styles.stackedBarSegment, { flex: late || 0.001, backgroundColor: colors.danger }]} />
            <View style={[styles.stackedBarSegment, { flex: notStarted || 0.001, backgroundColor: colors.slate[200] }]} />
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
              <AppText style={styles.legendText}>Xong ({completed})</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
              <AppText style={styles.legendText}>Đang làm ({inProgress})</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
              <AppText style={styles.legendText}>Chờ duyệt ({waitingReview})</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
              <AppText style={styles.legendText}>Trễ/Vướng ({late})</AppText>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.slate[300] }]} />
              <AppText style={styles.legendText}>Chưa làm ({notStarted})</AppText>
            </View>
          </View>
        </Card>

        {/* Biểu đồ tiến độ dự án */}
        <SectionTitle title="Tiến độ dự án" />
        <Card style={styles.chartCard}>
          <AppText style={styles.chartTitle}>Tiến độ theo Dự án (%)</AppText>
          <View style={styles.barChartContainer}>
            {projects.map((proj) => (
              <View key={proj.id} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: `${Math.max(5, Math.min(100, proj.progressPercent))}%` }]} />
                </View>
                <AppText style={styles.barLabel} numberOfLines={1}>{proj.code}</AppText>
                <AppText style={styles.barValue}>{proj.progressPercent}%</AppText>
              </View>
            ))}
            {projects.length === 0 ? (
              <AppText style={styles.emptyChartText}>Chưa có dự án nào</AppText>
            ) : null}
          </View>
        </Card>

        {/* Quick Actions */}
        <SectionTitle title="Thao tác nhanh" />
        <View style={styles.quickRow}>
          {quickActions.map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [
                styles.quickItem,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }
              ]}
              onPress={item.onPress}
            >
              <View style={styles.quickIcon}>{item.icon}</View>
              <AppText style={styles.quickLabel}>{item.label}</AppText>
            </Pressable>
          ))}
        </View>

        {/* Công việc cần chú ý */}
        <SectionTitle title="Công việc cần chú ý" caption="Ưu tiên xử lý hôm nay" />
        <Card style={styles.attentionCard}>
          {pureTasks.slice(0, 4).map((task, index) => (
            <Pressable
              key={task.id}
              onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
              style={({ pressed }) => [
                styles.taskRow,
                index < Math.min(3, pureTasks.length - 1) ? styles.taskDivider : undefined,
                pressed && { backgroundColor: colors.slate[50] }
              ]}
            >
              <View style={styles.taskMarker}>
                <ClipboardCheck size={16} color={colors.primary} />
              </View>
              <View style={styles.taskCopy}>
                <AppText style={styles.taskTitle} numberOfLines={1}>{task.name}</AppText>
                <View style={styles.taskMeta}>
                  <AppText style={styles.taskMetaText} numberOfLines={1}>
                    {task.projectName} • {task.assignedEngineerName || 'Chưa phân công'}
                  </AppText>
                  <StatusBadge
                    label={`${Math.round(task.progress * 100)}%`}
                    tone={task.progress >= 1 ? 'green' : 'blue'}
                  />
                </View>
              </View>
              <ChevronRight size={18} color={colors.slate[400]} />
            </Pressable>
          ))}
          {pureTasks.length === 0 ? (
            <AppText style={styles.emptyAttention}>Không có hạng mục nào cần xử lý.</AppText>
          ) : null}
        </Card>
      </ScrollView>
    </Screen>
  );
};

// Helper PackageIcon since Package is named that way in lucide-react-native
const PackageIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ transform: [{ scale: 1 }] }}>
    <CheckCircle2 size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  iconButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1, borderColor: colors.white },
  welcomeSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  welcomeTextContainer: { flex: 1 },
  greetingTitle: { fontSize: 24, fontWeight: '800', color: colors.slate[900] },
  greetingSub: { fontSize: 13, color: colors.slate[500], marginTop: 2 },
  
  progressCard: { margin: 16, padding: 16, backgroundColor: colors.white },
  progressInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTextCol: { flex: 1, paddingRight: 10 },
  progressCardTitle: { fontSize: 16, fontWeight: '800', color: colors.slate[900] },
  progressCardSub: { fontSize: 12, color: colors.slate[500], marginTop: 2 },
  progressCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  progressCountText: { fontSize: 12, fontWeight: '700', color: colors.slate[700] },
  progressCountDivider: { color: colors.slate[300] },
  
  progressCircleContainer: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center' },
  progressCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 6, borderColor: colors.primary, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  progressValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  progressLabel: { fontSize: 8, fontWeight: '800', color: colors.primary, marginTop: 1 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  statBox: { flex: 1, minWidth: '45%', padding: 12, backgroundColor: colors.white, gap: 4 },
  statIconRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.slate[900] },
  statLabelText: { fontSize: 12, fontWeight: '600', color: colors.slate[500] },

  chartCard: { marginHorizontal: 16, marginBottom: 12, padding: 16, backgroundColor: colors.white },
  chartTitle: { fontSize: 13, fontWeight: '800', color: colors.slate[800], marginBottom: 12 },
  stackedBarContainer: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.slate[100] },
  stackedBarSegment: { height: '100%' },
  chartLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.slate[600], fontWeight: '600' },

  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 140, paddingBottom: 10, paddingTop: 10 },
  barCol: { alignItems: 'center', width: 50 },
  barTrack: { width: 16, height: 90, backgroundColor: colors.slate[100], borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 6 },
  barFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 8 },
  barLabel: { fontSize: 10, fontWeight: '800', color: colors.slate[700], textAlign: 'center' },
  barValue: { fontSize: 9, color: colors.slate[500], marginTop: 2, fontWeight: '600' },
  emptyChartText: { width: '100%', textAlign: 'center', color: colors.slate[400], fontSize: 12, fontStyle: 'italic', paddingVertical: 20 },

  quickRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  quickItem: { flex: 1, minHeight: 90, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 8 },
  quickIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center', color: colors.slate[700] },

  attentionCard: { marginHorizontal: 16, paddingVertical: 2, backgroundColor: colors.white },
  taskRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8 },
  taskDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  taskMarker: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  taskCopy: { flex: 1 },
  taskTitle: { fontSize: 13, fontWeight: '800', color: colors.slate[900] },
  taskMeta: { marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  taskMetaText: { flex: 1, fontSize: 11, color: colors.slate[500], fontWeight: '500' },
  emptyAttention: { textAlign: 'center', color: colors.slate[400], fontSize: 12, paddingVertical: 16, fontStyle: 'italic' },
});


