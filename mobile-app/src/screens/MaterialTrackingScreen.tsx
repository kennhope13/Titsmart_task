import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Package, Search, Trash2, Truck } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText, constructionLabel, purchaseLabel } from '../utils/text';

const filterItems = [
  { key: 'all', label: 'T\u1ea5t c\u1ea3' },
  { key: 'pending', label: 'Ch\u01b0a \u0111\u1eb7t' },
  { key: 'ordered', label: '\u0110\u00e3 \u0111\u1eb7t' },
  { key: 'ready', label: 'C\u00f3 h\u00e0ng' },
];

export const MaterialTrackingScreen = () => {
  const { materials, updateMaterial, deleteMaterial } = useRealtimeStore();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => materials.filter((item) => {
    const purchase = purchaseLabel(item.status);
    const q = query.trim().toLowerCase();
    const text = `${cleanText(item.name)} ${cleanText(item.projectName)} ${cleanText(item.supplier)}`.toLowerCase();
    const matchQuery = !q || text.includes(q);
    const matchFilter = filter === 'all'
      || (filter === 'pending' && purchase.includes('Ch\u01b0a'))
      || (filter === 'ordered' && purchase.includes('\u0110\u00e3 \u0111\u1eb7t'))
      || (filter === 'ready' && purchase.includes('c\u00f3 h\u00e0ng'));
    return matchQuery && matchFilter;
  }).slice(0, 80), [materials, query, filter]);

  const markReady = (id: string) => updateMaterial(id, { status: '\u0110\u00e3 c\u00f3 h\u00e0ng', constrStatus: '\u0110ang thi c\u00f4ng' });

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<Package size={22} color={colors.primary} />}
          title="Qu\u1ea3n l\u00fd V\u1eadt t\u01b0 & Thi\u1ebft b\u1ecb"
          subtitle="Theo d\u00f5i t\u00ecnh tr\u1ea1ng \u0111\u1eb7t h\u00e0ng, h\u00e0ng v\u1ec1 v\u00e0 thi c\u00f4ng ngay tr\u00ean \u0111i\u1ec7n tho\u1ea1i."
          badge={`${materials.length} v\u1eadt t\u01b0`}
        />

        <Card style={styles.searchCard}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.slate[400]} />
            <TextInput value={query} onChangeText={setQuery} placeholder="T\u00ecm v\u1eadt t\u01b0, d\u1ef1 \u00e1n..." placeholderTextColor={colors.slate[400]} style={styles.input} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filterItems.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key && styles.filterChipActive]}>
                <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </Card>

        {filtered.map((item) => {
          const purchase = purchaseLabel(item.status);
          const constr = constructionLabel(item.constrStatus);
          return (
            <Card key={item.id} style={styles.materialCard}>
              <View style={styles.rowTop}>
                <View style={styles.itemIcon}><Truck size={18} color={colors.primary} /></View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.itemTitle} numberOfLines={2}>{item.name}</AppText>
                  <AppText style={styles.metaText} numberOfLines={1}>{item.projectName}</AppText>
                </View>
                <Pressable onPress={() => Alert.alert('X\u00f3a v\u1eadt t\u01b0', 'B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n x\u00f3a?', [{ text: 'H\u1ee7y', style: 'cancel' }, { text: 'X\u00f3a', style: 'destructive', onPress: () => deleteMaterial(item.id) }])} style={styles.deleteButton}>
                  <Trash2 size={16} color={colors.danger} />
                </Pressable>
              </View>
              <View style={styles.badgeRow}>
                <StatusBadge label={purchase} tone={purchase.includes('c\u00f3') ? 'green' : purchase.includes('\u0110\u00e3 \u0111\u1eb7t') ? 'blue' : 'red'} />
                <StatusBadge label={constr} tone={constr.includes('V\u01b0\u1edbng') ? 'red' : constr.includes('\u0110\u00e3') ? 'green' : 'slate'} />
              </View>
              <View style={styles.rowBetween}>
                <AppText style={styles.qty}>{`${item.volume} ${cleanText(item.unit)}`}</AppText>
                <AppText style={styles.supplier} numberOfLines={1}>{item.supplier || 'Ch\u01b0a c\u00f3 nh\u00e0 cung c\u1ea5p'}</AppText>
              </View>
              {!purchase.includes('c\u00f3') ? (
                <Pressable onPress={() => markReady(item.id)} style={styles.readyButton}>
                  <AppText style={styles.readyText}>\u0110\u00e1nh d\u1ea5u \u0111\u00e3 c\u00f3 h\u00e0ng</AppText>
                </Pressable>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
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
});
