import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ArrowLeft, CalendarDays, CheckCircle2, ClipboardList, MapPin, MessageSquareWarning, UserRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

export const TaskDetailScreen = ({ route, navigation }: any) => {
  const { taskId } = route.params || {};
  const { tasks, updateTask, updateTaskProgress } = useRealtimeStore();
  const task = tasks.find((item) => item.id === taskId) || tasks.find((item) => !item.isSectionHeader);
  const [reason, setReason] = useState('');

  if (!task) {
    return (
      <Screen>
        <ScreenHeader
          icon={<ClipboardList size={21} color={colors.primary} />}
          title="Chi tiết công việc"
          subtitle="Không tìm thấy dữ liệu"
        />
      </Screen>
    );
  }

  const approve = () => {
    updateTaskProgress(task.id, 1, true);
    updateTask(task.id, { issue: '', issueStatus: 'Đã duyệt hoàn thành' });
    Alert.alert('Đã duyệt', 'Công việc đã được đánh dấu hoàn thành.');
    navigation.goBack();
  };

  const requestFix = () => {
    if (!reason.trim()) {
      Alert.alert('Cần lý do', 'Vui lòng nhập nội dung cần chỉnh sửa.');
      return;
    }
    updateTask(task.id, { issue: reason.trim(), issueStatus: 'Yêu cầu sửa' });
    Alert.alert('Đã gửi yêu cầu sửa', 'Kỹ sư hiện trường sẽ nhận được thông báo.');
    setReason('');
    navigation.goBack();
  };

  const progress = Math.round((task.progress || 0) * 100);

  return (
    <Screen>
      <ScreenHeader
        icon={<ClipboardListIcon size={21} color={colors.primary} />}
        title="Chi tiết công việc"
        subtitle={task.code || `TSK-${task.stt}`}
        action={
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.slate[700]} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Thẻ Hero */}
        <Card style={styles.heroCard}>
          <View style={styles.statusRow}>
            <StatusBadge
              label={task.isDone || task.progress >= 1 ? 'Hoàn thành' : task.issue ? 'Cần xử lý' : 'Đang làm'}
              tone={task.isDone || task.progress >= 1 ? 'green' : task.issue ? 'red' : 'blue'}
            />
            <AppText style={styles.priority}>ƯU TIÊN: {task.priority || 'Medium'}</AppText>
          </View>
          
          <AppText style={styles.title}>{task.name}</AppText>
          <AppText style={styles.description}>{task.notes || 'Chưa có mô tả chi tiết cho công việc này.'}</AppText>
          
          <View style={styles.progressHeader}>
            <AppText style={styles.progressLabel}>Tiến độ hiện tại</AppText>
            <AppText style={styles.progressValue}>{progress}%</AppText>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
        </Card>

        {/* Thông tin thực hiện */}
        <SectionTitle title="Thông tin thực hiện" />
        <Card style={styles.infoCard}>
          <Info icon={<MapPin size={18} color={colors.primary} />} label="Dự án / Khu vực" value={task.projectName} />
          <Info icon={<UserRound size={18} color={colors.primary} />} label="Người thực hiện" value={task.assignedEngineerName || 'Chưa phân công'} />
          <Info icon={<CalendarDays size={18} color={colors.primary} />} label="Hạn hoàn thành" value={task.dueDate || 'Chưa đặt hạn'} last />
        </Card>

        {/* Phản hồi quản lý */}
        <SectionTitle title="Phản hồi & Phê duyệt" />
        <Card style={styles.feedbackCard}>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Nhập ghi chú hoặc lý do yêu cầu chỉnh sửa..."
            placeholderTextColor={colors.slate[400]}
            multiline
            style={styles.reasonInput}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={requestFix}
              style={({ pressed }) => [
                styles.fixButton,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
              ]}
            >
              <MessageSquareWarning size={16} color={colors.danger} />
              <AppText style={styles.fixText}>Yêu cầu sửa</AppText>
            </Pressable>
            <Pressable
              onPress={approve}
              style={({ pressed }) => [
                styles.approveButton,
                pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 }
              ]}
            >
              <CheckCircle2 size={16} color={colors.white} />
              <AppText style={styles.approveText}>Duyệt hoàn thành</AppText>
            </Pressable>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const Info = ({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last ? styles.divider : undefined]}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  </View>
);

const ClipboardListIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ transform: [{ scale: 1 }] }}>
    <ClipboardList size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  heroCard: { margin: 16, marginBottom: 0, gap: 12, backgroundColor: colors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priority: { fontSize: 10, fontWeight: '800', color: colors.slate[400], letterSpacing: 0.5 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: colors.slate[900], marginTop: 4 },
  description: { fontSize: 13, lineHeight: 19, color: colors.slate[600], marginTop: 2 },
  progressHeader: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  progressValue: { fontSize: 13, fontWeight: '800', color: colors.primary },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.primary },
  
  infoCard: { marginHorizontal: 16, paddingVertical: 0, backgroundColor: colors.white },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  infoIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 2, fontSize: 13, color: colors.slate[800], fontWeight: '700' },
  
  feedbackCard: { marginHorizontal: 16, gap: 12, backgroundColor: colors.white },
  reasonInput: { minHeight: 82, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], padding: 12, textAlignVertical: 'top', fontSize: 13, color: colors.slate[800] },
  actions: { flexDirection: 'row', gap: 8 },
  fixButton: { flex: 1, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.dangerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  fixText: { fontSize: 12, fontWeight: '800', color: colors.danger },
  approveButton: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { fontSize: 12, fontWeight: '800', color: colors.white },
});
