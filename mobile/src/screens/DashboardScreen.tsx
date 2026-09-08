import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native';
import { useDataStore } from '../services/dataStore';
import { getStatusColor } from '../types';

export const DashboardScreen = () => {
  const { projects, issues, engineers, fetchProjects, fetchIssues, fetchEngineers, isLoading } = useDataStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchProjects(),
      fetchIssues(),
      fetchEngineers()
    ]);
  }, [fetchProjects, fetchIssues, fetchEngineers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalProjects = projects.length;
  const avgProgress = projects.length > 0 
    ? Math.round(projects.reduce((acc, p) => acc + (p.progressPercent || 0), 0) / projects.length)
    : 0;
  const openIssues = issues.filter(i => i.status === 'OPEN' || i.status === 'PROCESSING').length;
  const totalEngineers = engineers.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#00236f']} />}
      >
        <Text style={styles.headerTitle}>Tổng quan</Text>
        
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalProjects}</Text>
            <Text style={styles.kpiLabel}>Tổng dự án</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{avgProgress}%</Text>
            <Text style={styles.kpiLabel}>Tiến độ TB</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#dc2626' }]}>{openIssues}</Text>
            <Text style={styles.kpiLabel}>Sự cố chưa xử lý</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalEngineers}</Text>
            <Text style={styles.kpiLabel}>Tổng nhân sự</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Danh sách dự án ({projects.length})</Text>
        
        {projects.map(project => {
          const statusColors = getStatusColor(project.status === 'completed' ? 'đã hoàn thành' : 'đang thi công');
          return (
            <TouchableOpacity 
              key={project.id} 
              style={styles.projectCard}
              onPress={() => console.log('Navigate to project', project.id)}
            >
              <View style={styles.projectHeader}>
                <Text style={styles.projectName} numberOfLines={2}>{project.name}</Text>
                <View style={[styles.badge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                  <Text style={[styles.badgeText, { color: statusColors.text }]}>
                    {project.status === 'active' ? 'Đang chạy' : project.status === 'completed' ? 'Hoàn thành' : 'Tạm dừng'}
                  </Text>
                </View>
              </View>
              <Text style={styles.projectLocation}>{project.location || 'Chưa cập nhật vị trí'}</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Tiến độ</Text>
                  <Text style={styles.progressValue}>{project.progressPercent || 0}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, project.progressPercent || 0)}%` }]} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00236f',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  projectCard: {
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
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  projectLocation: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  progressContainer: {
    marginTop: 'auto',
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
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00236f',
    borderRadius: 4,
  },
});
