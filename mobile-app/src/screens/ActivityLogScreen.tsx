import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Activity, Search, ArrowLeft } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle } from '../components/MobileUI';

export const ActivityLogScreen = () => {
  const { activityLogs } = useRealtimeStore();
  const [search, setSearch] = useState('');
  
  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return activityLogs.filter((log) => !keyword || `${log.user} ${log.action} ${log.project}`.toLowerCase().includes(keyword));
  }, [activityLogs, search]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<Activity size={21} color={colors.primary} />}
        title="Lịch sử hoạt động"
        subtitle="Nhật ký thao tác nghiệp vụ và đồng bộ dữ liệu"
        badge={`${activityLogs.length}`}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Search */}
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo người thực hiện, hành động, dự án..."
            placeholderTextColor={colors.slate[400]}
            style={styles.searchInput}
          />
        </View>

        <SectionTitle title="Hoạt động gần đây" caption={`${visible.length} bản ghi chép`} />
        
        {/* Activity Timeline List */}
        <View style={styles.list}>
          {visible.map((log, index) => {
            const initials = getInitials(log.user);
            const dateObj = new Date(log.timestamp);
            const dateStr = Number.isNaN(dateObj.getTime())
              ? log.timestamp
              : dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' - ' + dateObj.toLocaleDateString('vi-VN');

            return (
              <Card key={log.id || index} style={styles.row}>
                <View style={styles.marker}>
                  <AppText style={styles.markerText}>{initials}</AppText>
                </View>
                <View style={styles.copy}>
                  <AppText style={styles.action} numberOfLines={2}>{log.action}</AppText>
                  <View style={styles.metaRow}>
                    <AppText style={styles.metaUser}>{log.user}</AppText>
                    <View style={styles.bulletSeparator} />
                    <AppText style={styles.metaProject}>{log.project || 'Hệ thống'}</AppText>
                  </View>
                  <AppText style={styles.time}>{dateStr}</AppText>
                </View>
              </Card>
            );
          })}
          
          {visible.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText style={styles.empty}>Chưa ghi nhận hoạt động nào phù hợp.</AppText>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  searchBox: { margin: 16, marginBottom: 0, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  list: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 14, backgroundColor: colors.white },
  marker: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  markerText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  copy: { flex: 1, justifyContent: 'center' },
  action: { fontSize: 13.5, lineHeight: 18, fontWeight: '800', color: colors.slate[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaUser: { fontSize: 11, color: colors.slate[500], fontWeight: '700' },
  bulletSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.slate[300], marginHorizontal: 8 },
  metaProject: { fontSize: 11, color: colors.primary, fontWeight: '700' },
  time: { marginTop: 4, fontSize: 10, color: colors.slate[400], fontWeight: '700' },
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },
});
