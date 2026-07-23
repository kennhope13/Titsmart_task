import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { LayoutDashboard, ClipboardCheck, PackageCheck, TriangleAlert, MapPin, UserRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatCard, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';

export const DashboardScreen = () => {
  const { projects, tasks, materials, issues, activityLogs } = useRealtimeStore();
  const activeProjects = projects.filter((p) => p.status === 'active').length;
  const completedTasks = tasks.filter((t) => !t.isSectionHeader && (t.isDone || t.progress >= 1)).length;
  const pendingMaterials = materials.filter((m) => !cleanText(m.status).includes('\u0110\u00e3 c\u00f3') && m.status !== 'On-site').length;
  const openIssues = issues.filter((i) => i.status !== 'RESOLVED').length;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<LayoutDashboard size={22} color={colors.primary} />}
          title="T\u1ed5ng quan C\u00f4ng tr\u01b0\u1eddng"
          subtitle="Theo d\u00f5i nhanh ti\u1ebfn \u0111\u1ed9, v\u1eadt t\u01b0, s\u1ef1 c\u1ed1 v\u00e0 nh\u00e2n s\u1ef1 tr\u00ean \u0111i\u1ec7n tho\u1ea1i."
          badge={`${projects.length} d\u1ef1 \u00e1n`}
        />

        <View style={styles.grid}>
          <StatCard label="D\u1ef1 \u00e1n \u0111ang l\u00e0m" value={activeProjects} icon={<MapPin size={18} color={colors.primary} />} />
          <StatCard label="\u0110\u1ea7u vi\u1ec7c xong" value={completedTasks} tone="green" icon={<ClipboardCheck size={18} color="#047857" />} />
          <StatCard label="V\u1eadt t\u01b0 ch\u1edd" value={pendingMaterials} tone="amber" icon={<PackageCheck size={18} color="#b45309" />} />
          <StatCard label="S\u1ef1 c\u1ed1 m\u1edf" value={openIssues} tone="red" icon={<TriangleAlert size={18} color="#dc2626" />} />
        </View>

        <AppText style={styles.sectionTitle}>Ti\u1ebfn \u0111\u1ed9 d\u1ef1 \u00e1n</AppText>
        {projects.slice(0, 4).map((project) => (
          <Card key={project.id} style={styles.projectCard}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <AppText style={styles.projectName} numberOfLines={1}>{project.name}</AppText>
                <View style={styles.metaRow}><MapPin size={13} color={colors.slate[400]} /><AppText style={styles.metaText}>{project.location}</AppText></View>
              </View>
              <StatusBadge label={`${project.progressPercent}%`} tone={project.progressPercent >= 90 ? 'green' : project.progressPercent >= 50 ? 'blue' : 'amber'} />
            </View>
            <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(4, project.progressPercent)}%` }]} /></View>
            <View style={styles.rowBetween}>
              <AppText style={styles.smallText}>{`${project.completedTasks}/${project.totalTasks} h\u1ea1ng m\u1ee5c`}</AppText>
              <View style={styles.metaRow}><UserRound size={13} color={colors.slate[400]} /><AppText style={styles.smallText}>{project.managerName}</AppText></View>
            </View>
          </Card>
        ))}

        <AppText style={styles.sectionTitle}>Ho\u1ea1t \u0111\u1ed9ng g\u1ea7n \u0111\u00e2y</AppText>
        {activityLogs.slice(0, 3).map((log) => (
          <Card key={log.id} style={styles.logCard}>
            <AppText style={styles.logTitle}>{log.user}</AppText>
            <AppText style={styles.logText}>{`${log.action} ${log.project}`}</AppText>
            <AppText style={styles.smallText}>{log.timestamp}</AppText>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 12, marginBottom: 10 },
  sectionTitle: { marginHorizontal: 12, marginTop: 8, marginBottom: 8, fontSize: 15, fontWeight: '800', color: colors.slate[800] },
  projectCard: { marginHorizontal: 12, marginBottom: 10, gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  projectName: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: colors.slate[500], flex: 1 },
  smallText: { fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: colors.primary },
  logCard: { marginHorizontal: 12, marginBottom: 8 },
  logTitle: { fontSize: 13, fontWeight: '800', color: colors.slate[800] },
  logText: { marginTop: 3, fontSize: 12, color: colors.slate[600], lineHeight: 17 },
});
