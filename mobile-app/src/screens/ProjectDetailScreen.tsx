import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ClipboardList, MapPin, Package, TriangleAlert } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : '-';
const toneForStatus = (status?: string) => status === 'completed' ? 'green' : status === 'on_hold' ? 'amber' : 'blue';

export const ProjectDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { projects, tasks, materials, issues } = useRealtimeStore();
  const project = projects.find((item) => item.id === route.params?.projectId || item.code === route.params?.projectCode);

  if (!project) {
    return (
      <Screen>
        <ScreenHeader icon={<BriefcaseBusiness size={21} color={colors.primary} />} title="Dự án" subtitle="Không tìm thấy dữ liệu" action={<Pressable onPress={() => navigation.goBack()} style={styles.backButton}><ArrowLeft size={19} color={colors.slate[700]} /></Pressable>} />
      </Screen>
    );
  }

  const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
  const doneTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const projectMaterials = materials.filter((item) => item.projectCode === project.code);
  const projectIssues = issues.filter((item) => item.projectCode === project.code && item.status !== 'RESOLVED');

  return (
    <Screen>
      <ScreenHeader
        icon={<BriefcaseBusiness size={21} color={colors.primary} />}
        title={project.code}
        subtitle={project.name}
        action={<Pressable onPress={() => navigation.goBack()} style={styles.backButton}><ArrowLeft size={19} color={colors.slate[700]} /></Pressable>}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <AppText style={styles.projectName} numberOfLines={3}>{project.name}</AppText>
            <StatusBadge label={project.status} tone={toneForStatus(project.status) as any} />
          </View>
          <View style={styles.locationRow}><MapPin size={14} color={colors.slate[400]} /><AppText style={styles.meta} numberOfLines={1}>{project.location || 'Chưa có địa điểm'}</AppText></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, project.progressPercent || 0))}%` }]} /></View>
          <View style={styles.statsLine}><AppText style={styles.small}>{project.progressPercent || 0}% tiến độ</AppText><AppText style={styles.small}>Giá trị: {money(project.contractValue)}</AppText></View>
        </Card>

        <View style={styles.compactStats}>
          <View style={styles.compactStat}><ClipboardList size={15} color={colors.primary} /><AppText style={styles.compactValue}>{projectTasks.length}</AppText><AppText style={styles.compactLabel}>Công việc</AppText></View>
          <View style={styles.compactStat}><CheckCircle2 size={15} color="#047857" /><AppText style={styles.compactValue}>{doneTasks}</AppText><AppText style={styles.compactLabel}>Hoàn thành</AppText></View>
          <View style={styles.compactStat}><Package size={15} color={colors.slate[600]} /><AppText style={styles.compactValue}>{projectMaterials.length}</AppText><AppText style={styles.compactLabel}>Vật tư</AppText></View>
          <View style={styles.compactStat}><TriangleAlert size={15} color="#a16207" /><AppText style={styles.compactValue}>{projectIssues.length}</AppText><AppText style={styles.compactLabel}>Sự cố mở</AppText></View>
        </View>

        <SectionTitle title="Công việc gần đây" caption={`${projectTasks.slice(0, 5).length} hạng mục`} />
        <View style={styles.list}>
          {projectTasks.slice(0, 5).map((task) => (
            <Pressable key={task.id} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}>
              <Card style={styles.taskCard}>
                <AppText style={styles.taskTitle} numberOfLines={2}>{task.name}</AppText>
                <View style={styles.taskMeta}><AppText style={styles.meta}>{task.assignedEngineerName || 'Chưa phân công'}</AppText><StatusBadge label={`${Math.round((task.progress || 0) * 100)}%`} tone={task.progress >= 1 ? 'green' : 'blue'} /></View>
              </Card>
            </Pressable>
          ))}
          {projectTasks.length === 0 ? <Card><AppText style={styles.empty}>Chưa có công việc trong dự án này.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 26 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: 16, marginBottom: 10, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  projectName: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.slate[900] },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flex: 1, fontSize: 12, color: colors.slate[500] },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  statsLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  small: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  compactStats: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  compactStat: { width: '50%', minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.slate[100] },
  compactValue: { minWidth: 24, fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  compactLabel: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.slate[500] },
  list: { paddingHorizontal: 16, gap: 10 },
  taskCard: { gap: 8 },
  taskTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
