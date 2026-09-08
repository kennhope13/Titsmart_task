import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, SafeAreaView } from 'react-native';
import { useDataStore } from '../services/dataStore';
import { Engineer } from '../types';

export const PersonnelScreen = () => {
  const { engineers, fetchEngineers, isLoading } = useDataStore();
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchEngineers();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEngineers();
    setRefreshing(false);
  };

  const filtered = engineers.filter(e => 
    !search || 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    (e.username && e.username.toLowerCase().includes(search.toLowerCase())) ||
    (e.title && e.title.toLowerCase().includes(search.toLowerCase())) ||
    (e.phone && e.phone.includes(search))
  );

  const renderItem = ({ item }: { item: Engineer }) => (
    <View style={styles.card}>
      <View style={styles.avatarRow}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : 'U'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userRole}>{item.title || item.role || 'Nhân viên'}</Text>
          {item.phone ? <Text style={styles.userPhone}>📞 {item.phone}</Text> : null}
        </View>
      </View>
      <View style={styles.projectListRow}>
        <Text style={styles.projectLabel}>Dự án được gán: </Text>
        <Text style={styles.projectValues}>
          {item.projectCodes && item.projectCodes.length > 0 
            ? item.projectCodes.join(', ') 
            : 'Truy cập tất cả dự án'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh sách nhân sự ({filtered.length})</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm họ tên, tài khoản, SĐT..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#00236f']} />}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có danh sách nhân sự</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#0f172a' },
  list: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00236f', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  userRole: { fontSize: 13, color: '#64748b', marginTop: 2 },
  userPhone: { fontSize: 12, color: '#00236f', marginTop: 2 },
  projectListRow: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', flexDirection: 'row', flexWrap: 'wrap' },
  projectLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  projectValues: { fontSize: 12, color: '#64748b' },
  empty: { textAlign: 'center', marginTop: 32, color: '#94a3b8' }
});
