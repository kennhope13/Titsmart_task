import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { CalendarDays, Search, Plus, UserRound, BriefcaseBusiness, ChevronDown, ChevronRight } from 'lucide-react-native';
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

const getInitials = (name?: string) => {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const TaskManagementScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { tasks } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  
  const targetProjectCode = route.params?.projectCode;
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };
  
  const pureTasks = useMemo(() => {
    let filtered = tasks;
    if (targetProjectCode) {
      filtered = filtered.filter((task) => task.projectCode === targetProjectCode);
    }
    return filtered;
  }, [tasks, targetProjectCode]);

  const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MỤC\s*[A-Z0-9]+)$/i;
  
  const checkIsSection = (task: Task) => {
    if (task.isSectionHeader) return true;
    const stt = String(task.stt || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
    if (romanRegex.test(stt)) return true;
    if (/^\d+$/.test(stt) && !task.unit && Number(task.volume || 0) === 0) return true;
    return false;
  };

  const displayTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return pureTasks.filter((task) => {
      const isSection = checkIsSection(task);
      // Don't filter out section headers if they match the query, or if we need them for grouping
      if (isSection) {
        if (!targetProjectCode) return false; // In global view, hide section headers
        return true; // We will handle empty section filtering in the grouped view
      }
      const status = statusInfo(task);
      const haystack = `${task.code} ${cleanText(task.name)} ${cleanText(task.projectName)} ${cleanText(task.assignedEngineerName)}`.toLowerCase();
      return (!keyword || haystack.includes(keyword)) && (filter === 'all' || filter === status.key);
    });
  }, [pureTasks, query, filter, targetProjectCode]);

  const groupedTasks = useMemo(() => {
    if (!targetProjectCode) return []; // Only group when viewing a specific project
    
    const groupsMap = new Map<string, { header: any, tasks: any[] }>();
    
    // First pass: Find all section headers and create groups for them
    displayTasks.forEach(task => {
      if (checkIsSection(task)) {
        // Use task.name as the key because sectionName for a header is its own name
        groupsMap.set(task.name, { header: task, tasks: [] });
      }
    });

    // Second pass: Assign child tasks to their respective section group
    displayTasks.forEach(task => {
      if (!checkIsSection(task)) {
        const sName = task.sectionName || '';
        if (groupsMap.has(sName)) {
          groupsMap.get(sName)!.tasks.push(task);
        } else {
          // Fallback: If section header wasn't found (e.g. filtered out or missing), create a dummy group
          if (!groupsMap.has(sName)) {
            groupsMap.set(sName, { header: { name: sName || 'Mục chung', stt: '' }, tasks: [] });
          }
          groupsMap.get(sName)!.tasks.push(task);
        }
      }
    });

    let groups = Array.from(groupsMap.values());
    
    // Filter out groups that have no tasks (unless there's no filter/query applied)
    if (query.trim() || filter !== 'all') {
      groups = groups.filter(g => g.tasks.length > 0);
    }
    
    return groups;
  }, [displayTasks, targetProjectCode, query, filter]);

  const renderTask = useCallback((task: Task) => {
    const status = statusInfo(task);
    const progress = Math.round((task.progress || 0) * 100);
    const initials = getInitials(task.assignedEngineerName);
    const isDueToday = task.dueDate === new Date().toISOString().split('T')[0] || task.dueDate === 'Today';

    return (
      <Pressable
        onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
        style={({ pressed }) => [
          styles.itemWrap,
          pressed && { opacity: 0.95 }
        ]}
      >
        <Card style={styles.taskCard}>
          <View style={styles.cardTop}>
            <View style={styles.cardHeaderCopy}>
              <AppText style={styles.codeText}>{task.code || `TSK-${task.stt}`}</AppText>
              <AppText style={styles.taskTitle} numberOfLines={2}>{task.name}</AppText>
            </View>
            <StatusBadge label={status.label} tone={status.tone} />
          </View>

          <View style={styles.projectInfoRow}>
            <BriefcaseBusiness size={14} color={colors.slate[400]} />
            <AppText style={styles.projectNameText} numberOfLines={1}>{task.projectName}</AppText>
          </View>

          <View style={styles.cardBottomRow}>
            <View style={styles.assigneeContainer}>
              <View style={styles.avatarCircle}>
                <AppText style={styles.avatarText}>{initials}</AppText>
              </View>
              <AppText style={styles.assigneeName} numberOfLines={1}>
                {task.assignedEngineerName || 'Chưa giao'}
              </AppText>
            </View>

            <View style={styles.dueDateContainer}>
              <CalendarDays size={13} color={isDueToday ? colors.danger : colors.slate[400]} />
              <AppText style={[styles.dueDateText, isDueToday ? styles.dueTodayText : undefined]}>
                {isDueToday ? 'Hôm nay' : task.dueDate || 'Không có hạn'}
              </AppText>
            </View>
          </View>

          {/* Thanh tiến độ */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <AppText style={styles.progressPercent}>{progress}%</AppText>
          </View>
        </Card>
      </Pressable>
    );
  }, [navigation]);

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<ClipboardListIcon size={21} color={colors.primary} />}
        title="Công việc"
        subtitle={`${displayTasks.length} nhiệm vụ đang hiển thị`}
      />
      
      {/* Search & Filter Header */}
      <View style={styles.searchFilterHeader}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm tên việc, mã hoặc người thực hiện..."
            placeholderTextColor={colors.slate[400]}
            style={styles.input}
          />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
          {filters.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, filter === item.key ? styles.filterChipActive : undefined]}
            >
              <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {targetProjectCode ? (
        <ScrollView style={styles.listContent} contentContainerStyle={styles.listContentPadding}>
          {groupedTasks.length === 0 ? (
             <View style={styles.emptyWrap}>
               <Card style={styles.emptyCard}>
                 <AppText style={styles.emptyText}>Không tìm thấy công việc phù hợp.</AppText>
               </Card>
             </View>
          ) : (
            groupedTasks.map((group, index) => {
              const header = group.header;
              const sectionId = header?.name || `unnamed-section-${index}`;
              const isExpanded = expandedSections[sectionId] !== false;

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
                      {group.tasks.map((task, tIndex) => (
                        <View key={task.id || `task-${tIndex}`}>
                          {renderTask(task)}
                        </View>
                      ))}
                      {group.tasks.length === 0 && (
                        <AppText style={styles.emptyTaskText}>Không có mục con phù hợp</AppText>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={displayTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => !checkIsSection(item) ? renderTask(item) : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Card style={styles.emptyCard}>
                <AppText style={styles.emptyText}>Không tìm thấy công việc phù hợp.</AppText>
              </Card>
            </View>
          }
          contentContainerStyle={styles.listContentPadding}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        onPress={() => navigation.navigate('TaskForm')}
        style={({ pressed }) => [
          styles.fabButton,
          pressed && { transform: [{ scale: 0.9 }], opacity: 0.95 }
        ]}
      >
        <Plus size={24} color={colors.white} strokeWidth={2.5} />
      </Pressable>
    </Screen>
  );
};

const ClipboardListIcon = ({ size, color }: { size: number; color: string }) => (
  <View style={{ transform: [{ scale: 1 }] }}>
    <CalendarDays size={size} color={color} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  listContent: { flex: 1 },
  listContentPadding: { paddingBottom: 100 }, 
  searchFilterHeader: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: { flex: 1, fontSize: 13, color: colors.slate[800], paddingVertical: 0, fontWeight: '500' },
  filterRow: { gap: 8, paddingTop: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200] },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  
  itemWrap: { paddingHorizontal: 16, marginTop: 10 },
  taskCard: { padding: 16, backgroundColor: colors.white },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardHeaderCopy: { flex: 1 },
  codeText: { fontSize: 10, fontWeight: '800', color: colors.slate[400], letterSpacing: 0.5, textTransform: 'uppercase' },
  taskTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900], marginTop: 2 },
  
  projectInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  projectNameText: { fontSize: 12, color: colors.slate[500], fontWeight: '600', flex: 1 },
  
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  assigneeContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  avatarCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '800', color: colors.primary },
  assigneeName: { fontSize: 12, fontWeight: '700', color: colors.slate[700], flex: 1 },
  
  dueDateContainer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dueDateText: { fontSize: 11, fontWeight: '700', color: colors.slate[500] },
  dueTodayText: { color: colors.danger, fontWeight: '800' },
  
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  progressPercent: { fontSize: 10, fontWeight: '800', color: colors.primary, minWidth: 28, textAlign: 'right' },

  emptyWrap: { padding: 24 },
  emptyCard: { padding: 20, alignItems: 'center' },
  emptyText: { color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },

  fabButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
