import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Activity, Search } from 'lucide-react-native';
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

  return (
    <Screen>
      <ScreenHeader icon={<Activity size={21} color={colors.primary} />} title="Lich su hoat dong" subtitle="Nhat ky thao tac va dong bo du lieu" badge={`${activityLogs.length}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.searchBox}><Search size={17} color={colors.slate[400]} /><TextInput value={search} onChangeText={setSearch} placeholder="Tim theo nguoi, hanh dong, du an..." placeholderTextColor={colors.slate[400]} style={styles.searchInput} /></View>
        <SectionTitle title="Hoat dong gan day" caption={`${visible.length} ban ghi`} />
        <View style={styles.list}>
          {visible.map((log) => <Card key={log.id} style={styles.row}><View style={styles.marker}><Activity size={17} color={colors.primary} /></View><View style={styles.copy}><AppText style={styles.action} numberOfLines={2}>{log.action}</AppText><AppText style={styles.meta}>{log.user} | {log.project}</AppText><AppText style={styles.time}>{log.timestamp}</AppText></View></Card>)}
          {visible.length === 0 ? <Card><AppText style={styles.empty}>Chua co hoat dong phu hop.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  searchBox: { margin: 16, marginBottom: 0, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800] },
  list: { paddingHorizontal: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  marker: { width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  action: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  meta: { marginTop: 5, fontSize: 12, color: colors.slate[500] },
  time: { marginTop: 3, fontSize: 11, color: colors.slate[400], fontWeight: '700' },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
