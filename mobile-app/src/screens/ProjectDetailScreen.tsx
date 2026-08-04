import React, { useState, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, ClipboardList, Coins, MapPin, NotebookText, Package, TriangleAlert, ChevronDown, ChevronRight } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value) : '-';
const toneForStatus = (status?: string) => status === 'active' ? 'green' : status === 'on_hold' ? 'amber' : 'blue';

export const ProjectDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { projects, tasks, materials, issues } = useRealtimeStore();
  
  // Prioritize exact ID match to prevent duplicate code conflicts
  const project = projects.find(item => item.id && item.id === route.params?.projectId) 
    || projects.find(item => item.code && item.code === route.params?.projectCode);

  if (!project) {
    return (
      <Screen>
        <ScreenHeader
          icon={<BriefcaseBusiness size={21} color={colors.primary} />}
          title="Dự án"
          subtitle="Không tìm thấy dữ liệu"
          action={
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={19} color={colors.slate[700]} />
            </Pressable>
          }
        />
      </Screen>
    );
  }

  const allProjectTasks = tasks.filter((task) => task.projectCode === project.code);
  const projectTasks = allProjectTasks.filter((task) => !task.isSectionHeader);
  const doneTasks = projectTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const projectMaterials = materials.filter((item) => item.projectCode === project.code);
  const projectIssues = issues.filter((item) => item.projectCode === project.code && item.status !== 'RESOLVED');
  
  // Calculate materials percentage ready
  const inStockMaterials = projectMaterials.filter((item) => item.status === 'Đã có hàng').length;
  const materialsPercent = projectMaterials.length ? Math.round((inStockMaterials / projectMaterials.length) * 100) : 85; // fallback to mockup 85% if no data

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MỤC\s*[A-Z0-9]+)$/i;
  
  const checkIsSection = (task: any) => {
    if (task.isSectionHeader) return true;
    const stt = String(task.stt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (romanRegex.test(stt)) return true;
    if (/^\d+$/.test(stt) && !task.unit && Number(task.volume || 0) === 0) return true;
    return false;
  };

  const groupedTasks = useMemo(() => {
    const groupsMap = new Map<string, { header: any, tasks: any[] }>();
    
    // First pass: Find all section headers and create groups for them
    allProjectTasks.forEach(task => {
      if (checkIsSection(task)) {
        groupsMap.set(task.name, { header: task, tasks: [] });
      }
    });

    // Second pass: Assign child tasks to their respective section group
    allProjectTasks.forEach(task => {
      if (!checkIsSection(task)) {
        const sName = task.sectionName || '';
        if (groupsMap.has(sName)) {
          groupsMap.get(sName)!.tasks.push(task);
        } else {
          // Fallback: If section header wasn't found, create a dummy group
          if (!groupsMap.has(sName)) {
            groupsMap.set(sName, { header: { name: sName || 'Mục chung', stt: '' }, tasks: [] });
          }
          groupsMap.get(sName)!.tasks.push(task);
        }
      }
    });

    return Array.from(groupsMap.values());
  }, [allProjectTasks]);

  return (
    <Screen>
      <ScreenHeader
        icon={<BriefcaseBusiness size={21} color={colors.primary} />}
        title={project.code}
        subtitle={project.name}
        action={
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={19} color={colors.slate[700]} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <AppText style={styles.projectName}>{project.name}</AppText>
              <View style={styles.projectIdRow}>
                <AppText style={styles.projectIdLabel}>MÃ DỰ ÁN:</AppText>
                <AppText style={styles.projectIdVal}> {project.code}</AppText>
              </View>
            </View>
            <StatusBadge label={project.status === 'active' ? 'Đang chạy' : 'Hoàn thành'} tone={toneForStatus(project.status) as any} />
          </View>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.slate[400]} />
            <AppText style={styles.locationText} numberOfLines={1}>{project.location || 'Chưa cập nhật địa điểm'}</AppText>
          </View>
        </Card>

        {/* Metrics Section: Progress Ring & Stat Cards */}
        <View style={styles.metricsGrid}>
          {/* Progress Ring Gauge */}
          <Card style={styles.progressGaugeCard}>
            <AppText style={styles.gaugeTitle}>Tiến độ tổng thể</AppText>
            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeOuterRing}>
                <View style={styles.gaugeInnerRing}>
                  <AppText style={styles.gaugeVal}>{project.progressPercent || 0}%</AppText>
                  <AppText style={styles.gaugeLabel}>HOÀN THÀNH</AppText>
                </View>
              </View>
            </View>
          </Card>

          {/* 4 Small Stat Cards Grid */}
          <View style={styles.statCardsCol}>
            <View style={styles.statCardsRow}>
              <Card style={styles.smallStatCard}>
                <View style={styles.statHeaderRow}>
                  <ClipboardList size={15} color={colors.slate[500]} />
                  <AppText style={styles.smallStatLabel}>Tổng việc</AppText>
                </View>
                <AppText style={styles.smallStatVal}>{projectTasks.length || project.totalTasks}</AppText>
              </Card>
              <Card style={styles.smallStatCard}>
                <View style={styles.statHeaderRow}>
                  <CheckCircle2 size={15} color={colors.accent} />
                  <AppText style={styles.smallStatLabel}>Đã xong</AppText>
                </View>
                <AppText style={[styles.smallStatVal, { color: colors.accent }]}>
                  {doneTasks || project.completedTasks}
                </AppText>
              </Card>
            </View>
            <View style={styles.statCardsRow}>
              <Card style={styles.smallStatCard}>
                <View style={styles.statHeaderRow}>
                  <Package size={15} color={colors.primary} />
                  <AppText style={styles.smallStatLabel}>Vật tư</AppText>
                </View>
                <AppText style={styles.smallStatVal}>{materialsPercent}%</AppText>
              </Card>
              <Card style={[styles.smallStatCard, { borderLeftColor: colors.danger, borderLeftWidth: 3, backgroundColor: colors.dangerLight }]}>
                <View style={styles.statHeaderRow}>
                  <TriangleAlert size={15} color={colors.danger} />
                  <AppText style={[styles.smallStatLabel, { color: colors.danger }]}>Vướng mắc</AppText>
                </View>
                <AppText style={[styles.smallStatVal, { color: colors.danger }]}>
                  {projectIssues.length || project.issueTasksCount || 0}
                </AppText>
              </Card>
            </View>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <SectionTitle title="Thao tác nhanh" />
        <View style={styles.quickGrid}>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Tasks', { projectCode: project.code })}>
            <View style={[styles.quickIconCircle, { backgroundColor: colors.primaryLight }]}><ClipboardList size={18} color={colors.primary} /></View>
            <AppText style={styles.quickBtnText}>Xem công việc</AppText>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('Materials', { projectCode: project.code })}>
            <View style={[styles.quickIconCircle, { backgroundColor: colors.accentLight }]}><Package size={18} color={colors.accent} /></View>
            <AppText style={styles.quickBtnText}>Xem vật tư</AppText>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('FieldLogs', { projectCode: project.code })}>
            <View style={[styles.quickIconCircle, { backgroundColor: colors.warningLight }]}><NotebookText size={18} color={colors.warning} /></View>
            <AppText style={styles.quickBtnText}>Nhật ký hiện trường</AppText>
          </Pressable>
          <Pressable style={styles.quickBtn} onPress={() => navigation.navigate('CostPlan', { projectCode: project.code })}>
            <View style={[styles.quickIconCircle, { backgroundColor: '#f3e8ff' }]}><Coins size={18} color="#a855f7" /></View>
            <AppText style={styles.quickBtnText}>Kế hoạch chi phí</AppText>
          </Pressable>
        </View>

        {/* Project Details Section */}
        <SectionTitle title="Thông tin dự án" />
        <Card style={styles.infoCard}>
          <DetailRow label="Chủ đầu tư" value={project.client || 'Chưa cập nhật'} />
          <DetailRow label="Giá trị hợp đồng" value={money(project.contractValue)} />
          <DetailRow label="Chỉ huy trưởng" value={project.managerName || 'Chưa phân công'} last />
        </Card>

        {/* Danh sách đầu mục công việc */}
        <SectionTitle title="Đầu mục công việc" caption={`${projectTasks.length} mục con`} />
        <View style={styles.taskListContainer}>
          {groupedTasks.length === 0 ? (
            <Card style={styles.emptyTaskCard}>
              <AppText style={styles.emptyTaskText}>Chưa có đầu mục công việc nào cho dự án này.</AppText>
            </Card>
          ) : (
            groupedTasks.map((group, index) => {
              const header = group.header;
              const sectionId = header?.name || `unnamed-section-${index}`;
              const isExpanded = expandedSections[sectionId] !== false; // Default expanded

              return (
                <View key={sectionId} style={styles.sectionGroup}>
                  {header && (
                    <Pressable onPress={() => toggleSection(sectionId)} style={styles.sectionHeaderRow}>
                      <View style={styles.sectionBadge}>
                        <AppText style={styles.sectionBadgeText}>{header.stt}</AppText>
                      </View>
                      <AppText style={styles.sectionHeaderText} numberOfLines={2}>{header.name}</AppText>
                      {isExpanded ? <ChevronDown size={20} color={colors.slate[400]} /> : <ChevronRight size={20} color={colors.slate[400]} />}
                    </Pressable>
                  )}
                  
                  {isExpanded && (
                    <View style={styles.sectionContent}>
                      {group.tasks.map((task, tIndex) => {
                        const taskProgress = Math.round((task.progress || 0) * 100);
                        const isDone = task.isDone || task.progress >= 1;
                        return (
                          <Pressable
                            key={task.id || `task-${tIndex}`}
                            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
                            style={({ pressed }) => [pressed && { opacity: 0.95 }]}
                          >
                            <Card style={[styles.taskItemCard, !header && { marginLeft: 0 }]}>
                              <View style={styles.taskItemTop}>
                                <AppText style={styles.taskStt}>{task.stt}</AppText>
                                <View style={{ flex: 1 }}>
                                  <AppText style={styles.taskItemName} numberOfLines={2}>{task.name}</AppText>
                                  {(task.volume > 0 || task.unit) ? (
                                    <AppText style={styles.taskItemMeta}>KL: {task.volume || 0} {task.unit || ''}</AppText>
                                  ) : null}
                                </View>
                                <StatusBadge
                                  label={isDone ? 'Xong' : taskProgress > 0 ? `${taskProgress}%` : 'Chưa'}
                                  tone={isDone ? 'green' : taskProgress > 0 ? 'blue' : 'slate'}
                                />
                              </View>
                            </Card>
                          </Pressable>
                        );
                      })}
                      {group.tasks.length === 0 && (
                        <AppText style={styles.emptyTaskText}>Không có mục con</AppText>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const DetailRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={[styles.detailRow, !last ? styles.divider : undefined]}>
    <AppText style={styles.detailLabel}>{label}</AppText>
    <AppText style={styles.detailValue}>{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 26 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: 16, marginBottom: 12, gap: 10, backgroundColor: colors.white },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  projectName: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.slate[900] },
  projectIdRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  projectIdLabel: { fontSize: 10, fontWeight: '800', color: colors.slate[400] },
  projectIdVal: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 10, marginTop: 4 },
  locationText: { flex: 1, fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  
  metricsGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 8 },
  progressGaugeCard: { flex: 1.1, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  gaugeTitle: { fontSize: 12, fontWeight: '800', color: colors.slate[800], alignSelf: 'flex-start', marginBottom: 10 },
  gaugeContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  gaugeOuterRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 8, borderColor: colors.primary, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  gaugeInnerRing: { alignItems: 'center', justifyContent: 'center' },
  gaugeVal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  gaugeLabel: { fontSize: 8, fontWeight: '800', color: colors.primary, marginTop: 2 },
  
  statCardsCol: { flex: 1, gap: 10 },
  statCardsRow: { flexDirection: 'row', gap: 10 },
  smallStatCard: { flex: 1, padding: 10, backgroundColor: colors.white, gap: 4 },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smallStatLabel: { fontSize: 10, fontWeight: '700', color: colors.slate[500] },
  smallStatVal: { fontSize: 15, fontWeight: '800', color: colors.slate[800] },
  
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  quickBtn: { width: '48%', minHeight: 80, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[100], borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 },
  quickIconCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { fontSize: 11, fontWeight: '800', color: colors.slate[800], textAlign: 'center' },
  
  infoCard: { marginHorizontal: 16, paddingVertical: 0, backgroundColor: colors.white },
  detailRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  detailValue: { fontSize: 13, fontWeight: '800', color: colors.slate[800] },
  taskListContainer: { paddingHorizontal: 16, gap: 10, paddingBottom: 20 },
  emptyTaskCard: { padding: 20, alignItems: 'center' as const },
  emptyTaskText: { fontSize: 13, color: colors.slate[400], fontWeight: '600', paddingVertical: 10, textAlign: 'center' as const },
  sectionGroup: { marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.slate[200], backgroundColor: '#f8fafc', borderRadius: 8 },
  sectionContent: { marginTop: 8, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.slate[200], marginLeft: 8 },
  sectionBadge: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, minWidth: 32, alignItems: 'center' as const },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: colors.white },
  sectionHeaderText: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.slate[900] },
  taskItemCard: { marginBottom: 6, padding: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[100], shadowOpacity: 0.02, shadowRadius: 3, elevation: 1 },
  taskItemTop: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  taskStt: { fontSize: 11, fontWeight: '800', color: colors.slate[500], minWidth: 24, textAlign: 'center' as const },
  taskItemName: { fontSize: 13, fontWeight: '700', color: colors.slate[800], lineHeight: 18 },
  taskItemMeta: { fontSize: 11, fontWeight: '600', color: colors.primary, marginTop: 4 },
});
