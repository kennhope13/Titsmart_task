import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CheckCircle2, FileText, Search, Send, WalletCards } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';

const money = (value?: number) => new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);

export const DocumentTrackingScreen = () => {
  const { documentTracks } = useRealtimeStore();
  const [search, setSearch] = useState('');
  const visible = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return documentTracks.filter((doc) => !keyword || `${doc.contractNo} ${doc.contractName} ${doc.projectCode} ${doc.company}`.toLowerCase().includes(keyword));
  }, [documentTracks, search]);
  const completed = documentTracks.filter((doc) => doc.isCompleted).length;
  const paid = documentTracks.filter((doc) => doc.paymentStatus?.toLowerCase().includes('da')).length;
  const sent = documentTracks.filter((doc) => doc.sendDate).length;

  return (
    <Screen>
      <ScreenHeader icon={<FileText size={21} color={colors.primary} />} title="Theo doi ho so" subtitle="Hop dong, gui nhan va thanh toan" badge={`${documentTracks.length}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.grid}>
          <StatCard label="Tong ho so" value={documentTracks.length} icon={<FileText size={17} color={colors.primary} />} />
          <StatCard label="Da gui" value={sent} icon={<Send size={17} color={colors.primary} />} />
          <StatCard label="Hoan tat" value={completed} tone="green" icon={<CheckCircle2 size={17} color="#047857" />} />
          <StatCard label="Da thanh toan" value={paid} tone="slate" icon={<WalletCards size={17} color={colors.slate[600]} />} />
        </View>
        <View style={styles.searchBox}><Search size={17} color={colors.slate[400]} /><TextInput value={search} onChangeText={setSearch} placeholder="Tim hop dong, du an..." placeholderTextColor={colors.slate[400]} style={styles.searchInput} /></View>
        <SectionTitle title="Danh sach ho so" caption={`${visible.length} ket qua`} />
        <View style={styles.list}>
          {visible.map((doc) => <Card key={doc.id} style={styles.card}><View style={styles.cardTop}><View style={styles.copy}><AppText style={styles.code}>{doc.contractNo || doc.projectCode}</AppText><AppText style={styles.title} numberOfLines={2}>{doc.contractName}</AppText></View><StatusBadge label={doc.docStatus || (doc.isCompleted ? 'Hoan tat' : 'Dang theo doi')} tone={doc.isCompleted ? 'green' : 'blue'} /></View><AppText style={styles.meta}>{doc.company || '-'} | {doc.receiverName || '-'}</AppText><AppText style={styles.meta}>Gui: {doc.sendDate || '-'} | Nhan: {doc.receiveDate || '-'}</AppText><AppText style={styles.meta}>Gia tri: {money(doc.contractValue)} | Tam ung: {money(doc.prepayAmount)} | {doc.paymentStatus || '-'}</AppText></Card>)}
          {visible.length === 0 ? <Card><AppText style={styles.empty}>Chua co ho so phu hop.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 4 },
  searchBox: { marginHorizontal: 16, marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800] },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary },
  title: { marginTop: 4, fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  meta: { fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});

