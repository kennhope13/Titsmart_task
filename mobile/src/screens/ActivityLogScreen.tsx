import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { api } from '../services/apiSupabase';
import { ActivityLog } from '../types';

export const ActivityLogScreen = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await api.activityLogs.getAll();
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const renderItem = ({ item }: { item: ActivityLog }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.user}>👤 {item.user || 'Hệ thống'}</Text>
        <Text style={styles.time}>{item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : ''}</Text>
      </View>
      <Text style={styles.action}>{item.action}</Text>
      {item.project ? <Text style={styles.project}>📌 Dự án: {item.project}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nhật ký hoạt động hệ thống ({logs.length})</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchLogs} colors={['#00236f']} />}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có lịch sử hoạt động</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  list: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  user: { fontSize: 13, fontWeight: 'bold', color: '#00236f' },
  time: { fontSize: 11, color: '#94a3b8' },
  action: { fontSize: 14, color: '#0f172a', marginBottom: 4 },
  project: { fontSize: 12, color: '#64748b' },
  empty: { textAlign: 'center', marginTop: 32, color: '#94a3b8' }
});
