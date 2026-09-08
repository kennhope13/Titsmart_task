import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TextInput, SafeAreaView } from 'react-native';
import { api } from '../services/apiSupabase';
import { Material } from '../types';

export const MaterialsScreen = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await api.materials.getAll();
      setMaterials(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter(m => 
    !search || 
    m.name.toLowerCase().includes(search.toLowerCase()) || 
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    (m.projectCode && m.projectCode.toLowerCase().includes(search.toLowerCase()))
  );

  const renderItem = ({ item }: { item: Material }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.code}>{item.code || 'MAT'}</Text>
        <Text style={styles.projectTag}>{item.projectCode || 'Kho chung'}</Text>
      </View>
      <Text style={styles.name}>{item.name}</Text>
      {item.specs ? <Text style={styles.specs}>Quy cách: {item.specs}</Text> : null}
      
      <View style={styles.stockRow}>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Tồn ban đầu</Text>
          <Text style={styles.stockValue}>{item.initialStock || 0} {item.unit}</Text>
        </View>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Nhập</Text>
          <Text style={[styles.stockValue, { color: '#059669' }]}>+{item.totalImport || 0}</Text>
        </View>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Xuất</Text>
          <Text style={[styles.stockValue, { color: '#dc2626' }]}>-{item.totalExport || 0}</Text>
        </View>
        <View style={styles.stockItem}>
          <Text style={styles.stockLabel}>Hiện tồn</Text>
          <Text style={[styles.stockValue, { fontWeight: 'bold', color: '#00236f' }]}>{item.currentStock || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tổng kho vật tư ({filteredMaterials.length})</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm vật tư, mã, dự án..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredMaterials}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMaterials} colors={['#00236f']} />}
        ListEmptyComponent={<Text style={styles.empty}>Chưa có thông tin kho vật tư</Text>}
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  code: { fontSize: 12, fontWeight: 'bold', color: '#00236f' },
  projectTag: { fontSize: 11, color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  name: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  specs: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  stockItem: { alignItems: 'center' },
  stockLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  stockValue: { fontSize: 13, color: '#0f172a' },
  empty: { textAlign: 'center', marginTop: 32, color: '#94a3b8' }
});
