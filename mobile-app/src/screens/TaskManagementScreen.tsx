import React, { useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import { ClipboardList, Search, CheckCircle2, Circle, UserRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText, constructionLabel, purchaseLabel } from '../utils/text';

const filters = [
  { key: 'all', label: 'T\u1ea5t c\u1ea3' },
  { key: 'pending', label: 'Ch\u01b0a xong' },
  { key: 'done', label: 'Ho\u00e0n th\u00e0nh' },
  { key: 'issue', label: 'V\u01b0\u1edbng' },
];

export const TaskManagementScreen = () => {
  const { tasks, updateTaskProgress } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const pureTasks = tasks.filter((task) => !task.isSectionHeader);
  const doneCount = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;

  const displayTasks = useMemo(() => pureTasks.filter((task) => {
    const text = `${cleanText(task.name)} ${cleanText(task.projectName)} ${cleanText(task.sectionName)} ${cleanText(task.issue)}`.toLowerCase();
    const q = query.trim().toLowerCase();
    const matchQuery = !q || text.includes(q);
    const matchFilter = filter === 'all'
      || (filter === 'pending' && !(task.isDone || task.progress >= 1))
      || (filter === 'done' && (task.isDone || task.progress >= 1))
      || (filter === 'issue' && !!task.issue);
    return matchQuery && matchFilter;
  }).slice(0, 80), [pureTasks, query, filter]);

  const toggleDone = (id: string, isDone: boolean) => {
    updateTaskProgress(id, isDone ? 0 : 1, !isDone);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<ClipboardList size={22} color={colors.primary} />}
          title="Qu\u1ea3n l\u00fd Ti\u1ebfn \u0111\u1ed9 C\u00f4ng vi\u1ec7c"
          subtitle="Danh s\u00e1ch h\u1ea1ng m\u1ee5c t\u1ed1i \u01b0u cho m\u00e0n h\u00ecnh \u0111i\u1ec7n tho\u1ea1i, c\u00f3 t\u00ecm ki\u1ebfm v\u00e0 c\u1eadp nh\u1eadt nhanh."
          badge={`${doneCount}/${pureTasks.length} xong`}
        />

        <Card style={styles.searchCard}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.slate[400]} />
            <TextInput value={query} onChangeText={setQuery} placeholder="T\u00ecm h\u1ea1ng m\u1ee5c, d\u1ef1 \u00e1n..." placeholderTextColor={colors.slate[400]} style={styles.input} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>
                <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {displayTasks.map((task) => {
          const done = task.isDone || task.progress >= 1;
          const progress = Math.round((task.progress || 0) * 100);
          return (
            <Pressable key={task.id} onPress={() => Alert.alert('C\u1eadp nh\u1eadt', 'B\u1ea1n mu\u1ed1n \u0111\u1ed5i tr\u1ea1ng th\u00e1i h\u1ea1ng m\u1ee5c n\u00e0y?', [
              { text: 'H\u1ee7y', style: 'cancel' },
              { text: done ? 'Ch\u01b0a xong' : 'Ho\u00e0n th\u00e0nh', onPress: () => toggleDone(task.id, done) },
            ])}>
              <Card style={styles.taskCard}>
                <View style={styles.rowTop}>
                  {done ? <CheckCircle2 size={22} color={colors.accent} /> : <Circle size={22} color={colors.slate[300]} />}
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.taskTitle} numberOfLines={2}>{task.name}</AppText>
                    <AppText style={styles.projectText} numberOfLines={1}>{task.projectName}</AppText>
                  </View>
                  <StatusBadge label={`${progress}%`} tone={done ? 'green' : progress > 0 ? 'blue' : 'slate'} />
                </View>
                <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(3, progress)}%`, backgroundColor: done ? colors.accent : colors.primary }]} /></View>
                <View style={styles.badgeRow}>
                  <StatusBadge label={purchaseLabel(task.purchaseStatus)} tone="blue" />
                  <StatusBadge label={constructionLabel(task.constrStatus)} tone={done ? 'green' : 'slate'} />
                  {task.issue ? <StatusBadge label="V\u01b0\u1edbng" tone="red" /> : null}
                </View>
                <View style={styles.assignee}><UserRound size={13} color={colors.slate[400]} /><AppText style={styles.assigneeText}>{task.assignedEngineerName || 'Ch\u01b0a g\u00e1n'}</AppText></View>
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  searchCard: { marginHorizontal: 12, marginBottom: 10, gap: 12 },
  searchBox: { height: 42, borderRadius: 12, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 13, color: colors.slate[800], paddingVertical: 0 },
  filterRow: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.slate[100] },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '800', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  taskCard: { marginHorizontal: 12, marginBottom: 10, gap: 10 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  taskTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  projectText: { marginTop: 3, fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 999 },
  badgeRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  assignee: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  assigneeText: { fontSize: 11, color: colors.slate[500], fontWeight: '700' },
});
