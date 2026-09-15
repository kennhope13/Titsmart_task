import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView, Alert, Image } from 'react-native';
import { useDataStore } from '../services/dataStore';
import { useAuthStore } from '../services/authStore';

export const FieldScreen = () => {
  const { fieldLogs, fetchFieldLogs, isLoading } = useDataStore();
  const user = useAuthStore(state => state.user);
  const [refreshing, setRefreshing] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);

  const loadData = useCallback(async () => {
    await fetchFieldLogs();
  }, [fetchFieldLogs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleCheckIn = () => {
    Alert.alert(
      isCheckedIn ? 'Xác nhận Check-out' : 'Xác nhận Check-in',
      isCheckedIn ? 'Bạn muốn kết thúc ca làm việc?' : 'Bạn đã có mặt tại công trường?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xác nhận', 
          onPress: () => setIsCheckedIn(!isCheckedIn)
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#00236f']} />}
      >
        {/* Check-in Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chấm công & Điểm danh</Text>
          <View style={styles.attendanceCard}>
            <View style={styles.attendanceInfo}>
              <Text style={styles.attendanceName}>{user?.name || 'Nhân viên'}</Text>
              <Text style={styles.attendanceStatus}>
                Trạng thái: <Text style={{ color: isCheckedIn ? '#059669' : '#64748b', fontWeight: 'bold' }}>
                  {isCheckedIn ? 'Đang làm việc' : 'Chưa Check-in'}
                </Text>
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkBtn, isCheckedIn ? styles.checkOutBtn : styles.checkInBtn]}
              onPress={toggleCheckIn}
            >
              <Text style={styles.checkBtnText}>
                {isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Field Logs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nhật ký hiện trường</Text>
          </View>
          
          {fieldLogs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có nhật ký nào.</Text>
            </View>
          ) : (
            fieldLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logHeader}>
                  <Text style={styles.logProjectCode}>{log.projectCode || 'Không rõ dự án'}</Text>
                  <Text style={styles.logTime}>
                    {new Date(log.timestamp).toLocaleDateString('vi-VN')} {new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.logNote}>{log.note || 'Không có ghi chú'}</Text>
                
                {log.images && log.images.length > 0 && (
                  <View style={styles.imageGrid}>
                    {log.images.slice(0, 3).map((img, idx) => (
                      <View key={idx} style={styles.imageThumbPlaceholder}>
                        <Text style={styles.imageThumbText}>Ảnh {idx + 1}</Text>
                      </View>
                    ))}
                    {log.images.length > 3 && (
                      <View style={styles.imageThumbMore}>
                        <Text style={styles.imageMoreText}>+{log.images.length - 3}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => Alert.alert('Thêm nhật ký', 'Chức năng đang phát triển')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 80, // For FAB
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  attendanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  attendanceInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  attendanceName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  attendanceStatus: {
    fontSize: 14,
    color: '#64748b',
  },
  checkBtn: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  checkInBtn: {
    backgroundColor: '#00236f',
  },
  checkOutBtn: {
    backgroundColor: '#dc2626',
  },
  checkBtnText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logCard: {
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
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logProjectCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00236f',
  },
  logTime: {
    fontSize: 12,
    color: '#64748b',
  },
  logNote: {
    fontSize: 15,
    color: '#1e293b',
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  imageThumbPlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageThumbText: {
    fontSize: 10,
    color: '#64748b',
  },
  imageThumbMore: {
    width: 60,
    height: 60,
    backgroundColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00236f',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: {
    fontSize: 32,
    color: '#ffffff',
    lineHeight: 36,
  },
});
