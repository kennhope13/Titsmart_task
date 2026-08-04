import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BarChart3, CheckCircle2, Clock3, FileBarChart, UsersRound, XCircle } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';

const tabs = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'attendance', label: 'Điểm danh' },
];

export const ReportExportScreen = ({ route }: any) => {
  const { tasks, engineers, updateTask, updateTaskProgress } = useRealtimeStore();
  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'pending');
  const [rejectReason, setRejectReason] = useState('');
  const pureTasks = tasks.filter((item) => !item.isSectionHeader);

  const reportTasks = useMemo(() => {
    if (activeTab === 'pending') {
      return pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).slice(0, 50);
    }
    if (activeTab === 'approved') {
      return pureTasks.filter((task) => task.isDone || task.progress >= 1).slice(0, 50);
    }
    return [];
  }, [pureTasks, activeTab]);

  const completed = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const doing = pureTasks.filter((task) => task.progress > 0 && task.progress < 1).length;
  const pending = pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).length;
  const attended = Math.min(engineers.length, Math.max(1, doing % (engineers.length || 1) + 1));

  const approve = (id: string) => {
    updateTaskProgress(id, 1, true);
    updateTask(id, { issueStatus: 'Đã duyệt', issue: '' });
    Alert.alert('Đã duyệt', 'Công việc đã chuyển sang hoàn thành.');
  };

  const reject = (id: string) => {
    if (!rejectReason.trim()) {
      Alert.alert('Cần lý do', 'Vui lòng nhập lý do trước khi yêu cầu sửa.');
      return;
    }
    updateTask(id, { issueStatus: 'Yêu cầu sửa', issue: rejectReason.trim() });
    setRejectReason('');
    Alert.alert('Yêu cầu sửa', 'Đã chuyển trạng thái yêu cầu chỉnh sửa.');
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<FileBarChart size={21} color={colors.primary} />}
        title="Báo cáo & Phê duyệt"
        subtitle="Duyệt kết quả công việc và xem báo cáo điểm danh"
        badge={`${pending} chờ duyệt`}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Tab Selection */}
        <View style={styles.tabBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key ? styles.tabActive : undefined]}
              >
                <AppText style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : undefined]}>
                  {tab.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {activeTab === 'pending' ? (
          <View style={styles.reasonBox}>
            <AppText style={styles.reasonLabel}>Lý do khi yêu cầu sửa</AppText>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Nhập nội dung phản hồi, lỗi sai chi tiết..."
              placeholderTextColor={colors.slate[400]}
              style={styles.reasonInput}
            />
          </View>
        ) : null}

        {['pending', 'approved'].includes(activeTab) ? (
          <>
            <SectionTitle
              title={activeTab === 'pending' ? 'Công việc chờ phê duyệt' : 'Công việc đã phê duyệt'}
              caption={`${reportTasks.length} công việc`}
            />
            <View style={styles.list}>
              {reportTasks.map((task) => (
                <Card key={task.id} style={styles.reportCard}>
                  <View style={styles.reportTop}>
                    <View style={styles.reportCopy}>
                      <AppText style={styles.code}>{task.code || `TSK-${task.stt}`}</AppText>
                      <AppText style={styles.title} numberOfLines={2}>{task.name}</AppText>
                    </View>
                    <StatusBadge
                      label={activeTab === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'}
                      tone={activeTab === 'approved' ? 'green' : 'amber'}
                    />
                  </View>
                  
                  <View style={styles.reportInfo}>
                    <View style={styles.infoCellLeft}>
                      <AppText style={styles.infoLabel}>Người thực hiện</AppText>
                      <AppText style={styles.infoValue} numberOfLines={1}>
                        {task.assignedEngineerName || 'Chưa giao'}
                      </AppText>
                    </View>
                    <View style={styles.progressInfo}>
                      <AppText style={styles.infoLabel}>Tiến độ</AppText>
                      <AppText style={styles.progressValue}>{Math.round((task.progress || 0) * 100)}%</AppText>
                    </View>
                  </View>
                  
                  <AppText style={styles.note} numberOfLines={2}>
                    📝 Ghi chú: {task.issue || task.issueStatus || 'Kỹ sư báo cáo hoàn thành đầu mục công trình.'}
                  </AppText>
                  
                  {activeTab === 'pending' ? (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => reject(task.id)}
                        style={({ pressed }) => [
                          styles.rejectButton,
                          pressed && { opacity: 0.85 }
                        ]}
                      >
                        <XCircle size={15} color={colors.danger} />
                        <AppText style={styles.rejectText}>Yêu cầu sửa</AppText>
                      </Pressable>
                      <Pressable
                        onPress={() => approve(task.id)}
                        style={({ pressed }) => [
                          styles.approveButton,
                          pressed && { opacity: 0.85 }
                        ]}
                      >
                        <CheckCircle2 size={15} color={colors.white} />
                        <AppText style={styles.approveText}>Phê duyệt</AppText>
                      </Pressable>
                    </View>
                  ) : null}
                </Card>
              ))}
              {reportTasks.length === 0 ? (
                <Card style={styles.emptyCard}>
                  <AppText style={styles.empty}>Không có báo cáo công việc nào.</AppText>
                </Card>
              ) : null}
            </View>
          </>
        ) : null}

        {activeTab === 'stats' ? (
          <>
            <SectionTitle title="Hiệu suất công trình" caption="Tỷ lệ phân bổ trạng thái công việc" />
            <View style={styles.grid}>
              <StatCard label="Tổng công việc" value={pureTasks.length} icon={<BarChart3 size={16} color={colors.primary} />} />
              <StatCard label="Đang thực hiện" value={doing} icon={<Clock3 size={16} color={colors.primary} />} />
              <StatCard label="Chờ duyệt" value={pending} tone="amber" icon={<FileBarChart size={16} color="#a16207" />} />
              <StatCard label="Hoàn thành" value={completed} tone="green" icon={<CheckCircle2 size={16} color="#047857" />} />
            </View>
          </>
        ) : null}

        {activeTab === 'attendance' ? (
          <>
            <SectionTitle title="Điểm danh kỹ sư" caption={`${attended}/${engineers.length} nhân sự có mặt tại công trường`} />
            <View style={styles.list}>
              {engineers.map((engineer, index) => (
                <Card key={engineer.id} style={styles.personRow}>
                  <View style={styles.personIcon}>
                    <UsersRound size={16} color={colors.primary} />
                  </View>
                  <View style={styles.personCopy}>
                    <AppText style={styles.personName}>{engineer.name}</AppText>
                    <AppText style={styles.personMeta}>{cleanText(engineer.title)}</AppText>
                  </View>
                  <StatusBadge
                    label={index < attended ? 'Có mặt' : 'Vắng mặt'}
                    tone={index < attended ? 'green' : 'slate'}
                  />
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  
  tabBarContainer: { marginHorizontal: 16, marginVertical: 12, borderRadius: 12, backgroundColor: colors.slate[100], padding: 4 },
  tabRow: { gap: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.white, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  
  reasonBox: { paddingHorizontal: 16, paddingTop: 4 },
  reasonLabel: { marginBottom: 6, fontSize: 12, fontWeight: '800', color: colors.slate[600], textTransform: 'uppercase' },
  reasonInput: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  
  list: { paddingHorizontal: 16, gap: 10 },
  reportCard: { padding: 14, gap: 11, backgroundColor: colors.white },
  reportTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reportCopy: { flex: 1 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 2, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  
  reportInfo: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderRadius: 10, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[100] },
  infoCellLeft: { flex: 1, marginRight: 10 },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 2, fontSize: 12, color: colors.slate[800], fontWeight: '700' },
  progressInfo: { alignItems: 'flex-end', minWidth: 60 },
  progressValue: { marginTop: 2, fontSize: 13, color: colors.primary, fontWeight: '800' },
  
  note: { fontSize: 12, lineHeight: 18, color: colors.slate[600], fontWeight: '500' },
  
  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 10 },
  rejectButton: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.dangerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { fontSize: 12, color: colors.danger, fontWeight: '800' },
  approveButton: { flex: 1, height: 40, borderRadius: 10, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { fontSize: 12, color: colors.white, fontWeight: '800' },
  
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },
  
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  personRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, backgroundColor: colors.white },
  personIcon: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  personCopy: { flex: 1 },
  personName: { fontSize: 13.5, fontWeight: '800', color: colors.slate[900] },
  personMeta: { marginTop: 2, fontSize: 11, color: colors.slate[500], fontWeight: '600' },
});
