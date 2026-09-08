import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, SafeAreaView, Alert } from 'react-native';
import { useDataStore } from '../services/dataStore';
import { useAuthStore } from '../services/authStore';
import { getStatusColor } from '../types';

export const TasksScreen = () => {
  const { tasks, fetchTasks, isLoading } = useDataStore();
  const user = useAuthStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredTasks = tasks.filter(task => {
    const matchesTab = activeTab === 'all' || task.assignedEngineerId === user?.id;
    const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (task.code && task.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleTaskPress = (task: any) => {
    Alert.alert(
      'Cập nhật tiến độ',
      `Công việc: ${task.name}`,
      [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Chi tiết', onPress: () => console.log('View task', task.id) }
      ]
    );
  };

  const renderTask = ({ item }: { item: any }) => {
    const pColor = getStatusColor(item.purchaseStatus);
    const cColor = getStatusColor(item.constrStatus);
    
    return (
      <TouchableOpacity style={styles.taskCard} onPress={() => handleTaskPress(item)}>
        <View style={styles.taskHeader}>
          <Text style={styles.taskStt}>{item.stt}</Text>
          <Text style={styles.taskName} numberOfLines={2}>{item.name}</Text>
        </View>
        <Text style={styles.projectName}>{item.projectName}</Text>
        
        <View style={styles.badgesContainer}>
          <View style={[styles.badge, { backgroundColor: pColor.bg, borderColor: pColor.border }]}>
            <Text style={[styles.badgeText, { color: pColor.text }]}>Vật tư: {item.purchaseStatus || 'N/A'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cColor.bg, borderColor: cColor.border }]}>
            <Text style={[styles.badgeText, { color: cColor.text }]}>Thi công: {item.constrStatus || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Tiến độ tổng</Text>
            <Text style={styles.progressValue}>{item.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.min(100, item.progress || 0)}%` }]} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm công việc..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'mine' && styles.activeTab]}
            onPress={() => setActiveTab('mine')}
          >
            <Text style={[styles.tabText, activeTab === 'mine' && styles.activeTabText]}>Của tôi</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>Tất cả</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderTask}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#00236f']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không tìm thấy công việc nào.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  taskStt: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00236f',
    marginRight: 8,
    minWidth: 30,
  },
  taskName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  projectName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    marginLeft: 38,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#475569',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00236f',
    borderRadius: 3,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
});
