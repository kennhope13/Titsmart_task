import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FileBarChart, FileSpreadsheet, FileText, Share2 } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';

const csvEscape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const ReportExportScreen = () => {
  const { projects, tasks, materials, issues } = useRealtimeStore();
  const [busy, setBusy] = useState(false);

  const canShare = async () => {
    const available = await Sharing.isAvailableAsync();
    if (!available) Alert.alert('Kh\u00f4ng h\u1ed7 tr\u1ee3', 'Thi\u1ebft b\u1ecb n\u00e0y ch\u01b0a h\u1ed7 tr\u1ee3 chia s\u1ebb file.');
    return available;
  };

  const exportPdf = async () => {
    if (!(await canShare())) return;
    setBusy(true);
    try {
      const html = `
        <html><body style="font-family: Arial; padding: 24px; color: #0f172a;">
        <h1>BuildCore Pro - Bao cao cong truong</h1>
        <p>Du an: ${projects.length} | Cong viec: ${tasks.length} | Vat tu: ${materials.length} | Su co: ${issues.length}</p>
        <h2>Du an</h2>
        ${projects.slice(0, 8).map((p) => `<div style="border-bottom:1px solid #ddd;padding:8px 0"><b>${cleanText(p.name)}</b><br/>Tien do: ${p.progressPercent}% - ${cleanText(p.managerName)}</div>`).join('')}
        <h2>Su co dang mo</h2>
        ${issues.filter((i) => i.status !== 'RESOLVED').slice(0, 8).map((i) => `<div style="border-bottom:1px solid #ddd;padding:8px 0"><b>${i.incidentCode}</b> ${cleanText(i.title)}</div>`).join('')}
        </body></html>`;
      const file = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(file.uri, { dialogTitle: 'Chia s\u1ebb b\u00e1o c\u00e1o PDF' });
    } catch (error) {
      Alert.alert('L\u1ed7i xu\u1ea5t PDF', String(error));
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = async () => {
    if (!(await canShare())) return;
    setBusy(true);
    try {
      const rows = [
        ['Loai', 'Ma', 'Ten', 'Du an', 'Trang thai'],
        ...tasks.filter((t) => !t.isSectionHeader).slice(0, 300).map((t) => ['Cong viec', t.code, cleanText(t.name), cleanText(t.projectName), t.status]),
        ...materials.slice(0, 300).map((m) => ['Vat tu', m.code, cleanText(m.name), cleanText(m.projectName), cleanText(m.status)]),
        ...issues.slice(0, 100).map((i) => ['Su co', i.incidentCode, cleanText(i.title), cleanText(i.projectName), i.status]),
      ];
      const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
      const uri = `${FileSystem.documentDirectory || ''}bao-cao-buildcore.csv`;
      await FileSystem.writeAsStringAsync(uri, '\uFEFF' + csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(uri, { dialogTitle: 'Chia s\u1ebb file Excel/CSV' });
    } catch (error) {
      Alert.alert('L\u1ed7i xu\u1ea5t Excel', String(error));
    } finally {
      setBusy(false);
    }
  };

  const cards = [
    { title: 'B\u00e1o c\u00e1o t\u1ed5ng h\u1ee3p', sub: 'PDF g\u1ecdn cho ch\u1ee7 \u0111\u1ea7u t\u01b0 v\u00e0 ch\u1ec9 huy tr\u01b0\u1edfng.', icon: <FileText size={20} color={colors.primary} />, onPress: exportPdf, tag: 'PDF' },
    { title: 'D\u1eef li\u1ec7u Excel/CSV', sub: 'Xu\u1ea5t danh s\u00e1ch c\u00f4ng vi\u1ec7c, v\u1eadt t\u01b0 v\u00e0 s\u1ef1 c\u1ed1.', icon: <FileSpreadsheet size={20} color="#047857" />, onPress: exportCsv, tag: 'CSV' },
  ];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<FileBarChart size={22} color={colors.primary} />}
          title="Xu\u1ea5t B\u00e1o c\u00e1o & H\u1ed3 s\u01a1"
          subtitle="T\u1ea1o nhanh file PDF ho\u1eb7c Excel/CSV t\u1eeb d\u1eef li\u1ec7u c\u00f4ng tr\u01b0\u1eddng tr\u00ean \u0111i\u1ec7n tho\u1ea1i."
          badge={busy ? '\u0110ang t\u1ea1o...' : '2 m\u1eabu'}
        />

        <View style={styles.summaryRow}>
          <StatusBadge label={`${projects.length} d\u1ef1 \u00e1n`} tone="blue" />
          <StatusBadge label={`${tasks.length} h\u1ea1ng m\u1ee5c`} tone="slate" />
          <StatusBadge label={`${materials.length} v\u1eadt t\u01b0`} tone="green" />
          <StatusBadge label={`${issues.length} s\u1ef1 c\u1ed1`} tone="red" />
        </View>

        {cards.map((card) => (
          <Card key={card.title} style={styles.reportCard}>
            <View style={styles.rowTop}>
              <View style={styles.iconBox}>{card.icon}</View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.title}>{card.title}</AppText>
                <AppText style={styles.subtitle}>{card.sub}</AppText>
              </View>
              <StatusBadge label={card.tag} tone={card.tag === 'PDF' ? 'red' : 'green'} />
            </View>
            <Pressable disabled={busy} onPress={card.onPress} style={[styles.shareButton, busy && styles.disabled]}>
              <Share2 size={16} color={colors.white} />
              <AppText style={styles.shareText}>{busy ? '\u0110ang t\u1ea1o file...' : 'T\u1ea1o v\u00e0 chia s\u1ebb'}</AppText>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, marginBottom: 10 },
  reportCard: { marginHorizontal: 12, marginBottom: 10, gap: 14 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  subtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  shareButton: { height: 42, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  disabled: { opacity: 0.6 },
  shareText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});
