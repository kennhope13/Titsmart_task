import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { api } from '../services/apiSupabase';
import { ProjectExpense } from '../types';

export const OfficeCostsScreen = () => {
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.accounting.getExpenses();
      setExpenses(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const totalExpense = expenses.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

  const renderItem = ({ item }: { item: ProjectExpense }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{item.date || 'Chưa ghi ngày'}</Text>
        <Text style={styles.amount}>-{Number(item.totalAmount || 0).toLocaleString('vi-VN')} đ</Text>
      </View>
      <Text style={styles.content}>{item.content || item.description}</Text>
      <View style={styles.footerRow}>
        <Text style={styles.spender}>👤 {item.spenderName || 'VP Công ty'}</Text>
        <Text style={styles.projectTag}>{item.projectCode || 'Văn phòng'}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Chi phí văn phòng & Quỹ</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Tổng chi phí văn phòng đã ghi nhận</Text>
          <Text style={styles.summaryValue}>{totalExpense.toLocaleString('vi-VN')} đ</Text>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchExpenses} colors={['#00236f']} />}
        ListEmptyComponent={<Text style={styles.empty}>Chưa phát sinh chi phí văn phòng</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  summaryCard: { backgroundColor: '#00236f', borderRadius: 12, padding: 16 },
  summaryLabel: { color: '#cbd5e1', fontSize: 12, marginBottom: 4 },
  summaryValue: { color: '#ffffff', fontSize: 22, fontWeight: 'bold' },
  list: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  date: { fontSize: 12, color: '#64748b' },
  amount: { fontSize: 15, fontWeight: 'bold', color: '#dc2626' },
  content: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  spender: { fontSize: 12, color: '#475569' },
  projectTag: { fontSize: 11, color: '#00236f', backgroundColor: '#e0e7ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  empty: { textAlign: 'center', marginTop: 32, color: '#94a3b8' }
});
