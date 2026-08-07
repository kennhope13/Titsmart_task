import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Activity, Search, Clock, Calendar } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors, spacing, typography } from '../theme';
import { AppText, Card, Screen, ScreenHeader } from '../components/MobileUI';

export const ActivityLogScreen = () => {
  const { activityLogs } = useRealtimeStore();
  const [search, setSearch] = useState('');
  
  const groupedLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = activityLogs.filter((log) => !keyword || `${log.user} ${log.action} ${log.project}`.toLowerCase().includes(keyword));
    
    return filtered.reduce((acc: Record<string, typeof activityLogs>, log) => {
      const dateObj = new Date(log.timestamp);
      let dateKey = 'Không xác định';
      if (!Number.isNaN(dateObj.getTime())) {
        const today = new Date();
        const isToday = dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
        dateKey = isToday ? 'Hôm nay' : dateObj.toLocaleDateString('vi-VN');
      } else if (log.timestamp) {
        dateKey = log.timestamp.split('T')[0].split(' ')[0]; // fallback
      }
      
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(log);
      return acc;
    }, {});
  }, [activityLogs, search]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<Activity size={24} color={colors.primary} />}
        title="Nhật ký hoạt động"
        subtitle="Theo dõi lịch sử và các thao tác nghiệp vụ"
        badge={`${activityLogs.length}`}
      />
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo người thực hiện, thao tác..."
            placeholderTextColor={colors.slate[400]}
            style={styles.searchInput}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        <View style={styles.listContainer}>
          {Object.keys(groupedLogs).length === 0 ? (
            <Card style={styles.emptyState}>
              <Activity size={32} color={colors.slate[300]} style={{ marginBottom: 12 }} />
              <AppText style={styles.emptyStateText}>Chưa ghi nhận hoạt động nào.</AppText>
            </Card>
          ) : (
            Object.entries(groupedLogs).map(([date, logs]) => (
              <View key={date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Calendar size={16} color={colors.slate[500]} />
                  <AppText style={styles.dateHeaderText}>{date}</AppText>
                </View>

                {logs.map((log, index) => {
                  const initials = getInitials(log.user);
                  const dateObj = new Date(log.timestamp);
                  const timeStr = !Number.isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <Card key={log.id || index} style={styles.logCard}>
                      <View style={styles.markerContainer}>
                        <AppText style={styles.markerText}>{initials}</AppText>
                      </View>
                      
                      <View style={styles.cardContent}>
                        <AppText style={styles.actionText} numberOfLines={2}>{log.action}</AppText>
                        <View style={styles.metaInfo}>
                          <AppText style={styles.metaUser}>{log.user}</AppText>
                          <View style={styles.bulletPoint} />
                          <AppText style={styles.metaProject}>{log.project || 'Hệ thống'}</AppText>
                        </View>
                      </View>
                      
                      {timeStr ? (
                        <View style={styles.timeInfo}>
                          <AppText style={styles.timeText}>{timeStr}</AppText>
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: spacing.xxl },
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchBox: { 
    height: 44, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: colors.slate[200], 
    backgroundColor: colors.slate[50], 
    paddingHorizontal: spacing.md, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: spacing.sm 
  },
  searchInput: { flex: 1, fontSize: typography.fontSizes.md, color: colors.slate[800], fontWeight: typography.fontWeights.medium },
  listContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.md },
  dateGroup: { marginBottom: spacing.xl },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingLeft: spacing.xs },
  dateHeaderText: { fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.bold, color: colors.slate[700] },
  logCard: { 
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md, 
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
    gap: spacing.md,
  },
  markerContainer: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: colors.primaryLight, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  markerText: { fontSize: typography.fontSizes.sm, fontWeight: typography.fontWeights.bold, color: colors.primary },
  cardContent: { flex: 1, justifyContent: 'center' },
  actionText: { fontSize: typography.fontSizes.md, lineHeight: 20, fontWeight: typography.fontWeights.semibold, color: colors.slate[900], marginBottom: 2 },
  metaInfo: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  metaUser: { fontSize: typography.fontSizes.xs, color: colors.slate[600], fontWeight: typography.fontWeights.medium },
  bulletPoint: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.slate[300], marginHorizontal: spacing.sm },
  metaProject: { fontSize: typography.fontSizes.xs, color: colors.primary, fontWeight: typography.fontWeights.medium },
  timeInfo: { alignItems: 'flex-end', justifyContent: 'flex-start', height: '100%', paddingTop: 2 },
  timeText: { fontSize: typography.fontSizes.xs, color: colors.slate[400], fontWeight: typography.fontWeights.semibold },
  emptyState: { padding: spacing.xxl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, marginTop: spacing.md },
  emptyStateText: { textAlign: 'center', color: colors.slate[500], fontSize: typography.fontSizes.md, fontWeight: typography.fontWeights.medium },
});
