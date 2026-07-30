import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CalendarDays, ClipboardList, Plus, Search, UserRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';
import { Task } from '../types';

const filters = [
  { key: 'all', label: 'Tat ca' },
  { key: 'unassigned', label: 'Cho giao' },
  { key: 'doing', label: 'Dang lam' },
  { key: 'review', label: 'Cho duyet' },
  { key: 'done', label: 'Hoan thanh' },
];

const statusInfo = (task: Task) => {
  if (task.isDone || task.progress >= 1) return { label: 'Hoan thanh', tone: 'green' as const, key: 'done' };
  if (task.issueStatus) return { label: 'Cho duyet', tone: 'amber' as const, key: 'review' };
  if (task.issue) return { label: 'Can xu ly', tone: 'red' as const, key: 'issue' };
  if (!task.assignedEngineerName) return { label: 'Cho giao', tone: 'slate' as const, key: 'unassigned' };
  return { label: 'Dang lam', tone: 'blue' as const, key: 'doing' };
};

export const TaskManagementScreen = () => {
  const navigation = useNavigation<any>();
  const { tasks } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const pureTasks = useMemo(() => tasks.filter((task) => !task.isSectionHeader), [tasks]);

  const displayTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return pureTasks.filter((task) => {
      const status = statusInfo(task);
      const haystack = `${task.code} ${cleanText(task.name)} ${cleanText(task.projectName)} ${cleanText(task.assignedEngineerName)}`.toLowerCase();
      return (!keyword || haystack.includes(keyword)) && (filter === 'all' || filter === status.key);
    }).slice(0, 120);
  }, [pureTasks, query, filter]);

  const renderTask = useCallback(({ item: task }: { item: Task }) => {
    const status = statusInfo(task);
    const progress = Math.round(task.progress * 100);
    return (
      <Pressable onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} style={styles.itemWrap}>
        <Card style={styles.taskCard}>
          <View style={styles.cardTop}>
            <View style={styles.codePill}><AppText style={styles.codeText}>{task.code || task.stt}</AppText></View>
            <StatusBadge label={status.label} tone={status.tone} />
          </View>
          <AppText style={styles.taskTitle} numberOfLines={2}>{task.name}</AppText>
          <AppText style={styles.project} numberOfLines={1}>{task.projectName}</AppText>
          <View style={styles.details}>
            <View style={styles.detailItem}><UserRound size={14} color={colors.slate[400]} /><AppText style={styles.detailText} numberOfLines={1}>{task.assignedEngineerName || 'Chua phan cong'}</AppText></View>
            <View style={styles.detailItem}><CalendarDays size={14} color={colors.slate[400]} /><AppText style={styles.detailText}>{task.dueDate || 'Chua co han'}</AppText></View>
          </View>
          <View style={styles.progressHeader}><AppText style={styles.progressLabel}>Tien do</AppText><AppText style={styles.progressNumber}>{progress}%</AppText></View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} /></View>
        </Card>
      </Pressable>
    );
  }, [navigation]);

  const header = (
    <>
      <ScreenHeader
        icon={<ClipboardList size={21} color={colors.primary} />}
        title="Cong viec"
        subtitle={`${displayTasks.length} cong viec dang hien thi`}
        action={<Pressable onPress={() => navigation.navigate('TaskForm')} style={styles.addButton}><Plus size={19} color={colors.white} /></Pressable>}
      />
      <View style={styles.toolbar}>
        <View style={styles.searchBox}><Search size={18} color={colors.slate[400]} /><TextInput value={query} onChangeText={setQuery} placeholder="Tim ten, ma hoac nguoi thuc hien" placeholderTextColor={colors.slate[400]} style={styles.input} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
          {filters.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key ? styles.filterChipActive : undefined]}><AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText></Pressable>)}
        </ScrollView>
      </View>
    </>
  );

  return (
    <Screen>
      <FlatList
        data={displayTasks}
        keyExtractor={(item) => item.id}
        renderItem={renderTask}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={styles.emptyWrap}><Card><AppText style={styles.empty}>Khong co cong viec phu hop.</AppText></Card></View>}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
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
  itemWrap: { paddingHorizontal: 16, marginTop: 10 },
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
  emptyWrap: { padding: 16 },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
