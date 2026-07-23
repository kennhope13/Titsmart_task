import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarDays, ClipboardList, Plus, Search, UserRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';
import { Task } from '../types';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'unassigned', label: 'Chờ giao' },
  { key: 'doing', label: 'Đang làm' },
  { key: 'review', label: 'Chờ duyệt' },
  { key: 'done', label: 'Hoàn thành' },
];

const statusInfo = (task: Task) => {
  if (task.isDone || task.progress >= 1) return { label: 'Hoàn thành', tone: 'green' as const, key: 'done' };
  if (task.issueStatus) return { label: 'Chờ duyệt', tone: 'amber' as const, key: 'review' };
  if (task.issue) return { label: 'Cần xử lý', tone: 'red' as const, key: 'issue' };
  if (!task.assignedEngineerName) return { label: 'Chờ giao', tone: 'slate' as const, key: 'unassigned' };
  return { label: 'Đang làm', tone: 'blue' as const, key: 'doing' };
};

export const TaskManagementScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const pureTasks = tasks.filter((task) => !task.isSectionHeader);

  const displayTasks = useMemo(() => pureTasks.filter((task) => {
    const status = statusInfo(task);
    const haystack = `${task.code} ${cleanText(task.name)} ${cleanText(task.projectName)} ${cleanText(task.assignedEngineerName)}`.toLowerCase();
    return (!query.trim() || haystack.includes(query.trim().toLowerCase())) && (filter === 'all' || filter === status.key);
  }).slice(0, 100), [pureTasks, query, filter]);

  return (
    <Screen>
      <ScreenHeader
        icon={<ClipboardList size={21} color={colors.primary} />}
        title="Công việc"
        subtitle={`${displayTasks.length} công việc đang hiển thị`}
        action={
          <Pressable onPress={() => navigation.navigate('TaskForm')} style={styles.addButton}>
            <Plus size={19} color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.slate[400]} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên, mã hoặc người thực hiện" placeholderTextColor={colors.slate[400]} style={styles.input} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key ? styles.filterChipActive : undefined]}>
                <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.list}>
          {displayTasks.map((task) => {
            const status = statusInfo(task);
            const progress = Math.round(task.progress * 100);
            return (
              <Pressable key={task.id} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}>
                <Card style={styles.taskCard}>
                  <View style={styles.cardTop}>
                    <View style={styles.codePill}><AppText style={styles.codeText}>{task.code || task.stt}</AppText></View>
                    <StatusBadge label={status.label} tone={status.tone} />
                  </View>
                  <AppText style={styles.taskTitle} numberOfLines={2}>{task.name}</AppText>
                  <AppText style={styles.project} numberOfLines={1}>{task.projectName}</AppText>
                  <View style={styles.details}>
                    <View style={styles.detailItem}>
                      <UserRound size={14} color={colors.slate[400]} />
                      <AppText style={styles.detailText} numberOfLines={1}>{task.assignedEngineerName || 'Chưa phân công'}</AppText>
                    </View>
                    <View style={styles.detailItem}>
                      <CalendarDays size={14} color={colors.slate[400]} />
                      <AppText style={styles.detailText}>{task.dueDate || 'Chưa có hạn'}</AppText>
                    </View>
                  </View>
                  <View style={styles.progressHeader}>
                    <AppText style={styles.progressLabel}>Tiến độ</AppText>
                    <AppText style={styles.progressNumber}>{progress}%</AppText>
                  </View>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} /></View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  toolbar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.slate[200] },
  searchBox: { height: 44, borderRadius: 10, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, fontSize: 13, color: colors.slate[800], paddingVertical: 0 },
  filterRow: { gap: 8, paddingTop: 11 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.slate[100] },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  list: { padding: 16, gap: 10 },
  taskCard: { gap: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.slate[100] },
  codeText: { fontSize: 10, fontWeight: '800', color: colors.slate[600] },
  taskTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  project: { fontSize: 12, color: colors.slate[500] },
  details: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailText: { flex: 1, fontSize: 11, color: colors.slate[600] },
  progressHeader: { marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  progressNumber: { fontSize: 11, color: colors.primary, fontWeight: '800' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: colors.primary },
});
