import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { useDataStore } from '../services/dataStore';
import { Project, getStatusColor } from '../types';

export const ProjectsScreen = () => {
  const { projects, fetchProjects, isLoading } = useDataStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'on_hold'>('all');

  useEffect(() => {
    fetchProjects();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProjects();
    setRefreshing(false);
  };

  const filteredProjects = projects.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchSearch = !search || 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const renderProjectItem = ({ item }: { item: Project }) => {
    const statusStyle = getStatusColor(
      item.status === 'completed' ? 'Hoàn thành' : item.status === 'on_hold' ? 'Tạm dừng' : 'Đang thi công'
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.projectCode}>{item.code}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status === 'completed' ? 'Hoàn thành' : item.status === 'on_hold' ? 'Tạm dừng' : 'Đang làm'}
            </Text>
          </View>
        </View>

        <Text style={styles.projectName}>{item.name}</Text>
        <Text style={styles.projectLocation}>📍 {item.location || 'Chưa ghi nhận địa điểm'}</Text>
        {item.client ? <Text style={styles.projectClient}>🏢 Chủ đầu tư: {item.client}</Text> : null}

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Tiến độ tổng thể</Text>
            <Text style={styles.progressPercent}>{item.progressPercent || 0}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, item.progressPercent || 0)}%` }]} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>👤 QLV: {item.managerName || 'Chưa gán'}</Text>
          <Text style={styles.footerText}>📋 {item.completedTasks || 0}/{item.totalTasks || 0} hạng mục</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tất cả dự án ({filteredProjects.length})</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tên, mã dự án, địa điểm..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'active', label: 'Đang làm' },
            { key: 'completed', label: 'Hoàn thành' },
            { key: 'on_hold', label: 'Tạm dừng' }
          ].map(btn => (
            <TouchableOpacity
              key={btn.key}
              style={[styles.filterBtn, statusFilter === btn.key && styles.filterBtnActive]}
              onPress={() => setStatusFilter(btn.key as any)}
            >
              <Text style={[styles.filterBtnText, statusFilter === btn.key && styles.filterBtnTextActive]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredProjects}
        keyExtractor={item => item.id}
        renderItem={renderProjectItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#00236f']} />}
        ListEmptyComponent={<Text style={styles.emptyText}>Không tìm thấy dự án nào</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f1f5f9' },
  filterBtnActive: { backgroundColor: '#00236f' },
  filterBtnText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  filterBtnTextActive: { color: '#ffffff', fontWeight: 'bold' },
  listContent: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  projectCode: { fontSize: 12, fontWeight: 'bold', color: '#00236f', backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  projectName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  projectLocation: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  projectClient: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  progressSection: { marginVertical: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  progressLabel: { fontSize: 12, color: '#64748b' },
  progressPercent: { fontSize: 12, fontWeight: 'bold', color: '#00236f' },
  progressBarTrack: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#00236f', borderRadius: 3 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  footerText: { fontSize: 12, color: '#64748b' },
  emptyText: { textAlign: 'center', marginTop: 32, color: '#94a3b8', fontSize: 14 }
});
