import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Camera, CheckCircle2, MapPin, NotebookText, Plus, TriangleAlert } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';

const today = new Date().toISOString().slice(0, 10);

export const FieldLogsScreen = () => {
  const { fieldLogs, projects, tasks, engineers, addFieldLog } = useRealtimeStore();
  const [note, setNote] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('Dang lam');
  const project = projects[0];
  const task = tasks.find((item) => !item.isSectionHeader && (!project || item.projectCode === project.code)) || tasks.find((item) => !item.isSectionHeader);
  const engineer = engineers[0];
  const todayLogs = fieldLogs.filter((log) => (log.timestamp || '').includes(today) || (log.timestamp || '').includes(new Date().toLocaleDateString('vi-VN'))).length;
  const issueLogs = fieldLogs.filter((log) => log.statusUpdate?.toLowerCase().includes('vuong')).length;
  const byProject = useMemo(() => fieldLogs.slice(0, 80), [fieldLogs]);

  const submit = () => {
    if (!note.trim()) {
      Alert.alert('Can noi dung', 'Nhap ghi chu hien truong truoc khi luu.');
      return;
    }
    addFieldLog({
      projectCode: project?.code || task?.projectCode || 'N/A',
      taskId: task?.id || '',
      engineerId: engineer?.id || '',
      timestamp: new Date().toISOString(),
      note: note.trim(),
      images: [],
      statusUpdate,
    });
    setNote('');
    Alert.alert('Da luu', 'Nhat ky hien truong da duoc ghi nhan.');
  };

  return (
    <Screen>
      <ScreenHeader icon={<NotebookText size={21} color={colors.primary} />} title="Nhat ky hien truong" subtitle="Bao cao nhanh tu cong truong" badge={`${fieldLogs.length}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.grid}>
          <StatCard label="Tong nhat ky" value={fieldLogs.length} icon={<NotebookText size={17} color={colors.primary} />} />
          <StatCard label="Hom nay" value={todayLogs} tone="green" icon={<CheckCircle2 size={17} color="#047857" />} />
          <StatCard label="Vuong mac" value={issueLogs} tone="amber" icon={<TriangleAlert size={17} color="#a16207" />} />
          <StatCard label="Co anh" value={fieldLogs.filter((log) => log.images?.length).length} tone="slate" icon={<Camera size={17} color={colors.slate[600]} />} />
        </View>
        <SectionTitle title="Ghi nhanh" caption={project?.code || task?.projectCode || 'Chua chon du an'} />
        <View style={styles.formBox}>
          <TextInput value={note} onChangeText={setNote} placeholder="Nhap noi dung bao cao..." placeholderTextColor={colors.slate[400]} style={styles.noteInput} multiline />
          <View style={styles.statusRow}>{['Dang lam', 'Hoan thanh', 'Vuong mac'].map((status) => <Pressable key={status} onPress={() => setStatusUpdate(status)} style={[styles.statusChip, statusUpdate === status ? styles.statusChipActive : undefined]}><AppText style={[styles.statusChipText, statusUpdate === status ? styles.statusChipTextActive : undefined]}>{status}</AppText></Pressable>)}</View>
          <Pressable onPress={submit} style={styles.submit}><Plus size={17} color={colors.white} /><AppText style={styles.submitText}>Luu nhat ky</AppText></Pressable>
        </View>
        <SectionTitle title="Nhat ky gan day" caption={`${byProject.length} ban ghi`} />
        <View style={styles.list}>
          {byProject.map((log) => <Card key={log.id} style={styles.card}><View style={styles.cardTop}><AppText style={styles.title} numberOfLines={2}>{log.note}</AppText><StatusBadge label={log.statusUpdate || 'Dang lam'} tone={log.statusUpdate?.toLowerCase().includes('vuong') ? 'amber' : log.statusUpdate?.toLowerCase().includes('hoan') ? 'green' : 'blue'} /></View><AppText style={styles.meta}>{log.projectCode} | {log.timestamp}</AppText>{log.gpsLocation?.text ? <View style={styles.location}><MapPin size={13} color={colors.slate[400]} /><AppText style={styles.meta}>{log.gpsLocation.text}</AppText></View> : null}<AppText style={styles.meta}>{log.images?.length || 0} anh dinh kem</AppText></Card>)}
          {byProject.length === 0 ? <Card><AppText style={styles.empty}>Chua co nhat ky hien truong.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 4 },
  formBox: { marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, gap: 10 },
  noteInput: { minHeight: 88, textAlignVertical: 'top', borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], padding: 10, fontSize: 13, color: colors.slate[800] },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, minHeight: 36, borderRadius: 8, backgroundColor: colors.slate[100], alignItems: 'center', justifyContent: 'center' },
  statusChipActive: { backgroundColor: colors.primary },
  statusChipText: { fontSize: 11, fontWeight: '800', color: colors.slate[600] },
  statusChipTextActive: { color: colors.white },
  submit: { height: 42, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  submitText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  meta: { fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
