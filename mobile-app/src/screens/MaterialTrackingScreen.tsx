import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Package, Search, Trash2, Truck } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText, constructionLabel, purchaseLabel } from '../utils/text';
import { Material } from '../types';

const filterItems = [
  { key: 'all', label: 'Tat ca' },
  { key: 'pending', label: 'Chua dat' },
  { key: 'ordered', label: 'Da dat' },
  { key: 'ready', label: 'Co hang' },
];

export const MaterialTrackingScreen = () => {
  const { materials, updateMaterial, deleteMaterial } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((item) => {
      const purchase = purchaseLabel(item.status);
      const text = `${cleanText(item.name)} ${cleanText(item.projectName)} ${cleanText(item.supplier)}`.toLowerCase();
      const matchQuery = !q || text.includes(q);
      const matchFilter = filter === 'all'
        || (filter === 'pending' && purchase.includes('Chua'))
        || (filter === 'ordered' && purchase.includes('Da dat'))
        || (filter === 'ready' && purchase.includes('co hang'));
      return matchQuery && matchFilter;
    }).slice(0, 120);
  }, [materials, query, filter]);

  const markReady = useCallback((id: string) => updateMaterial(id, { status: 'Da co hang', constrStatus: 'Dang thi cong' }), [updateMaterial]);

  const renderMaterial = useCallback(({ item }: { item: Material }) => {
    const purchase = purchaseLabel(item.status);
    const constr = constructionLabel(item.constrStatus);
    return (
      <Card style={styles.materialCard}>
        <View style={styles.rowTop}>
          <View style={styles.itemIcon}><Truck size={18} color={colors.primary} /></View>
          <View style={{ flex: 1 }}><AppText style={styles.itemTitle} numberOfLines={2}>{item.name}</AppText><AppText style={styles.metaText} numberOfLines={1}>{item.projectName}</AppText></View>
          <Pressable onPress={() => Alert.alert('Xoa vat tu', 'Ban chac chan muon xoa?', [{ text: 'Huy', style: 'cancel' }, { text: 'Xoa', style: 'destructive', onPress: () => deleteMaterial(item.id) }])} style={styles.deleteButton}><Trash2 size={16} color={colors.danger} /></Pressable>
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge label={purchase} tone={purchase.includes('co') ? 'green' : purchase.includes('Da dat') ? 'blue' : 'red'} />
          <StatusBadge label={constr} tone={constr.includes('Vuong') ? 'red' : constr.includes('Da') ? 'green' : 'slate'} />
        </View>
        <View style={styles.rowBetween}><AppText style={styles.qty}>{`${item.volume} ${cleanText(item.unit)}`}</AppText><AppText style={styles.supplier} numberOfLines={1}>{item.supplier || 'Chua co nha cung cap'}</AppText></View>
        {!purchase.includes('co') ? <Pressable onPress={() => markReady(item.id)} style={styles.readyButton}><AppText style={styles.readyText}>Danh dau da co hang</AppText></Pressable> : null}
      </Card>
    );
  }, [deleteMaterial, markReady]);

  const header = (
    <>
      <ScreenHeader icon={<Package size={22} color={colors.primary} />} title="Quan ly Vat tu & Thiet bi" subtitle="Theo doi dat hang, hang ve va thi cong." badge={`${materials.length} vat tu`} />
      <Card style={styles.searchCard}>
        <View style={styles.searchBox}><Search size={18} color={colors.slate[400]} /><TextInput value={query} onChangeText={setQuery} placeholder="Tim vat tu, du an..." placeholderTextColor={colors.slate[400]} style={styles.input} /></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{filterItems.map((item) => <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}><AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText></Pressable>)}</ScrollView>
      </Card>
    </>
  );

  return (
    <Screen>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderMaterial}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={styles.emptyWrap}><Card><AppText style={styles.empty}>Khong co vat tu phu hop.</AppText></Card></View>}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  searchCard: { marginHorizontal: 12, marginBottom: 10, gap: 12 },
  searchBox: { height: 42, borderRadius: 12, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 13, color: colors.slate[800], paddingVertical: 0 },
  filterRow: { gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.slate[100] },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '800', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  materialCard: { marginHorizontal: 12, marginBottom: 10, gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  metaText: { marginTop: 3, fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  deleteButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  qty: { fontSize: 13, fontWeight: '800', color: colors.slate[900] },
  supplier: { flex: 1, textAlign: 'right', fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  readyButton: { paddingVertical: 10, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center' },
  readyText: { fontSize: 12, color: colors.primary, fontWeight: '800' },
  emptyWrap: { paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
