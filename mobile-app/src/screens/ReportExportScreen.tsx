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
    if (activeTab === 'pending') return pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).slice(0, 50);
    if (activeTab === 'approved') return pureTasks.filter((task) => task.isDone || task.progress >= 1).slice(0, 50);
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
      Alert.alert('Cần lý do', 'Nhập lý do trước khi yêu cầu sửa.');
      return;
    }
    updateTask(id, { issueStatus: 'Yêu cầu sửa', issue: rejectReason.trim() });
    setRejectReason('');
    Alert.alert('Đã gửi yêu cầu sửa');
  };

  return (
    <Screen>
      <ScreenHeader
        icon={<FileBarChart size={21} color={colors.primary} />}
        title="Báo cáo"
        subtitle="Duyệt kết quả và theo dõi hiệu suất"
        badge={`${pending} chờ duyệt`}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map((tab) => (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key ? styles.tabActive : undefined]}>
                <AppText style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : undefined]}>{tab.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {activeTab === 'pending' ? (
          <View style={styles.reasonBox}>
            <AppText style={styles.reasonLabel}>Lý do khi yêu cầu sửa</AppText>
            <TextInput value={rejectReason} onChangeText={setRejectReason} placeholder="Nhập nội dung phản hồi..." placeholderTextColor={colors.slate[400]} style={styles.reasonInput} />
          </View>
        ) : null}

        {['pending', 'approved'].includes(activeTab) ? (
          <>
            <SectionTitle title={activeTab === 'pending' ? 'Báo cáo chờ xử lý' : 'Báo cáo đã duyệt'} caption={`${reportTasks.length} báo cáo`} />
            <View style={styles.list}>
              {reportTasks.map((task) => (
                <Card key={task.id} style={styles.reportCard}>
                  <View style={styles.reportTop}>
                    <View style={styles.reportCopy}>
                      <AppText style={styles.code}>{task.code}</AppText>
                      <AppText style={styles.title} numberOfLines={2}>{task.name}</AppText>
                    </View>
                    <StatusBadge label={activeTab === 'approved' ? 'Đã duyệt' : 'Chờ duyệt'} tone={activeTab === 'approved' ? 'green' : 'amber'} />
                  </View>
                  <View style={styles.reportInfo}>
                    <View><AppText style={styles.infoLabel}>Người thực hiện</AppText><AppText style={styles.infoValue}>{task.assignedEngineerName || 'Chưa giao'}</AppText></View>
                    <View style={styles.progressInfo}><AppText style={styles.infoLabel}>Tiến độ</AppText><AppText style={styles.progressValue}>{Math.round(task.progress * 100)}%</AppText></View>
                  </View>
                  <AppText style={styles.note} numberOfLines={2}>{task.issueStatus || 'Nhân viên đã báo hoàn thành công việc.'}</AppText>
                  {activeTab === 'pending' ? (
                    <View style={styles.actions}>
                      <Pressable onPress={() => reject(task.id)} style={styles.rejectButton}><XCircle size={16} color={colors.danger} /><AppText style={styles.rejectText}>Yêu cầu sửa</AppText></Pressable>
                      <Pressable onPress={() => approve(task.id)} style={styles.approveButton}><CheckCircle2 size={16} color={colors.white} /><AppText style={styles.approveText}>Duyệt</AppText></Pressable>
                    </View>
                  ) : null}
                </Card>
              ))}
              {reportTasks.length === 0 ? <Card><AppText style={styles.empty}>Chưa có báo cáo trong mục này.</AppText></Card> : null}
            </View>
          </>
        ) : null}

        {activeTab === 'stats' ? (
          <>
            <SectionTitle title="Hiệu suất công việc" caption="Số liệu tổng hợp hiện tại" />
            <View style={styles.grid}>
              <StatCard label="Tổng công việc" value={pureTasks.length} icon={<BarChart3 size={17} color={colors.primary} />} />
              <StatCard label="Đang thực hiện" value={doing} icon={<Clock3 size={17} color={colors.primary} />} />
              <StatCard label="Chờ duyệt" value={pending} tone="amber" icon={<FileBarChart size={17} color="#a16207" />} />
              <StatCard label="Hoàn thành" value={completed} tone="green" icon={<CheckCircle2 size={17} color="#047857" />} />
            </View>
          </>
        ) : null}

        {activeTab === 'attendance' ? (
          <>
            <SectionTitle title="Điểm danh hôm nay" caption={`${attended}/${engineers.length} người có mặt`} />
            <View style={styles.list}>
              {engineers.map((engineer, index) => (
                <Card key={engineer.id} style={styles.personRow}>
                  <View style={styles.personIcon}><UsersRound size={18} color={colors.primary} /></View>
                  <View style={styles.personCopy}><AppText style={styles.personName}>{engineer.name}</AppText><AppText style={styles.personMeta}>{cleanText(engineer.title)}</AppText></View>
                  <StatusBadge label={index < attended ? 'Có mặt' : 'Chưa điểm danh'} tone={index < attended ? 'green' : 'slate'} />
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
  content: { paddingBottom: 26 },
  tabBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate[200] },
  tabRow: { gap: 5, paddingHorizontal: 16, paddingVertical: 10 },
  tab: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  tabTextActive: { color: colors.white },
  reasonBox: { padding: 16, paddingBottom: 0 },
  reasonLabel: { marginBottom: 6, fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  reasonInput: { height: 43, borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, fontSize: 13, color: colors.slate[800] },
  list: { paddingHorizontal: 16, gap: 10 },
  reportCard: { gap: 11 },
  reportTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  reportCopy: { flex: 1 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary },
  title: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  reportInfo: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderRadius: 9, backgroundColor: colors.slate[50] },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '700' },
  infoValue: { marginTop: 3, fontSize: 12, color: colors.slate[700], fontWeight: '700' },
  progressInfo: { alignItems: 'flex-end' },
  progressValue: { marginTop: 3, fontSize: 13, color: colors.primary, fontWeight: '800' },
  note: { fontSize: 12, lineHeight: 17, color: colors.slate[600] },
  actions: { flexDirection: 'row', gap: 8 },
  rejectButton: { flex: 1, height: 40, borderRadius: 9, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.dangerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { fontSize: 12, color: colors.danger, fontWeight: '800' },
  approveButton: { flex: 1, height: 40, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { fontSize: 12, color: colors.white, fontWeight: '800' },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  personRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  personIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  personCopy: { flex: 1 },
  personName: { fontSize: 13, fontWeight: '800', color: colors.slate[900] },
  personMeta: { marginTop: 3, fontSize: 11, color: colors.slate[500] },
});
