import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Camera, CheckCircle2, MapPin, NotebookText, Plus, TriangleAlert, User, ImageOff, ArrowLeft } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';

const today = new Date().toISOString().slice(0, 10);

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name.trim().split(/\s+/).slice(-1)[0].slice(0, 2).toUpperCase();
};

export const FieldLogsScreen = ({ navigation }: any) => {
  const { fieldLogs, projects, tasks, engineers, addFieldLog } = useRealtimeStore();
  const [note, setNote] = useState('');
  const [statusUpdate, setStatusUpdate] = useState('Đang làm');
  
  const project = projects[0];
  const task = tasks.find((item) => !item.isSectionHeader && (!project || item.projectCode === project.code)) || tasks.find((item) => !item.isSectionHeader);
  const engineer = engineers[0];

  const todayLogs = fieldLogs.filter((log) => (log.timestamp || '').includes(today) || (log.timestamp || '').includes(new Date().toLocaleDateString('vi-VN'))).length;
  const issueLogs = fieldLogs.filter((log) => log.statusUpdate?.toLowerCase().includes('vuong') || log.statusUpdate?.toLowerCase().includes('sự cố')).length;
  const byProject = useMemo(() => fieldLogs.slice(0, 80), [fieldLogs]);

  const submit = () => {
    if (!note.trim()) {
      Alert.alert('Cần nội dung', 'Vui lòng nhập ghi chú nhật ký trước khi lưu.');
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
    Alert.alert('Đã lưu', 'Nhật ký hiện trường mới đã được ghi nhận.');
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<NotebookText size={21} color={colors.primary} />}
        title="Nhật ký hiện trường"
        subtitle="Cập nhật tiến độ thi công từ hiện trường"
        badge={`${fieldLogs.length}`}
        action={
          navigation?.canGoBack() ? (
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={19} color={colors.slate[700]} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Lưới thống kê */}
        <View style={styles.grid}>
          <StatCard label="Tổng nhật ký" value={fieldLogs.length} icon={<NotebookText size={16} color={colors.primary} />} />
          <StatCard label="Hôm nay" value={todayLogs} tone="green" icon={<CheckCircle2 size={16} color="#047857" />} />
          <StatCard label="Vướng mắc" value={issueLogs} tone="amber" icon={<TriangleAlert size={16} color="#a16207" />} />
          <StatCard label="Ảnh hiện trường" value={fieldLogs.filter((log) => log.images?.length).length} tone="slate" icon={<Camera size={16} color={colors.slate[600]} />} />
        </View>

        {/* Form ghi nhanh */}
        <SectionTitle title="Ghi nhật ký nhanh" caption={project?.name || 'Nhập mô tả tiến độ thực tế'} />
        <View style={styles.formBox}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Nhập nội dung nhật ký chi tiết công việc..."
            placeholderTextColor={colors.slate[400]}
            style={styles.noteInput}
            multiline
          />
          <View style={styles.statusRow}>
            {['Đang làm', 'Hoàn thành', 'Vướng mắc'].map((status) => (
              <Pressable
                key={status}
                onPress={() => setStatusUpdate(status)}
                style={[styles.statusChip, statusUpdate === status ? styles.statusChipActive : undefined]}
              >
                <AppText style={[styles.statusChipText, statusUpdate === status ? styles.statusChipTextActive : undefined]}>
                  {status}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={submit} style={styles.submitBtn}>
            <Plus size={16} color={colors.white} />
            <AppText style={styles.submitBtnText}>Ghi nhật ký</AppText>
          </Pressable>
        </View>

        {/* Timeline List */}
        <SectionTitle title="Nhật ký gần đây" caption={`${byProject.length} bản ghi chép`} />
        
        <View style={styles.timelineContainer}>
          <View style={styles.timelineLine} />
          
          {byProject.map((log, index) => {
            const dateStr = new Date(log.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateFull = new Date(log.timestamp).toLocaleDateString('vi-VN');
            const author = engineers.find((e) => e.id === log.engineerId) || engineer;
            const initials = getInitials(author?.name);
            
            const isCompleted = log.statusUpdate?.toLowerCase().includes('hoàn');
            const isIssue = log.statusUpdate?.toLowerCase().includes('vướng') || log.statusUpdate?.toLowerCase().includes('sự cố');
            
            // Dot color
            let dotColor = colors.primary;
            if (isCompleted) dotColor = colors.accent;
            if (isIssue) dotColor = colors.danger;

            return (
              <View key={log.id || index} style={styles.timelineItem}>
                {/* Timeline Dot */}
                <View style={[styles.timelineDot, { backgroundColor: dotColor }]} />
                
                {/* Log Card */}
                <Card style={[styles.logCard, isIssue ? styles.logCardIssue : undefined]}>
                  <View style={styles.logHeader}>
                    <View style={styles.reporterInfo}>
                      <View style={styles.avatarCircle}>
                        <AppText style={styles.avatarText}>{initials}</AppText>
                      </View>
                      <View>
                        <AppText style={styles.reporterName}>{author?.name || 'Kỹ sư hiện trường'}</AppText>
                        <AppText style={styles.logTime}>{dateStr} - {dateFull}</AppText>
                      </View>
                    </View>
                    <StatusBadge
                      label={log.statusUpdate || 'Đang làm'}
                      tone={isCompleted ? 'green' : isIssue ? 'red' : 'blue'}
                    />
                  </View>

                  <AppText style={styles.logNote}>{log.note}</AppText>

                  {/* Horizontal Scroll of Images */}
                  {log.images && log.images.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imageRow}>
                      {log.images.map((imgUri, imgIndex) => (
                        <Image key={imgIndex} source={{ uri: imgUri }} style={styles.logImage} resizeMode="cover" />
                      ))}
                    </ScrollView>
                  ) : null}

                  {/* Metadata line */}
                  <View style={styles.logFooterRow}>
                    <AppText style={styles.projectCodeBadge}>{log.projectCode || 'N/A'}</AppText>
                    {log.gpsLocation?.text ? (
                      <View style={styles.locationBadge}>
                        <MapPin size={11} color={colors.slate[400]} />
                        <AppText style={styles.locationText} numberOfLines={1}>{log.gpsLocation.text}</AppText>
                      </View>
                    ) : null}
                  </View>
                </Card>
              </View>
            );
          })}
          {byProject.length === 0 ? (
            <Card style={styles.emptyCard}><AppText style={styles.empty}>Chưa có ghi chép nhật ký hiện trường.</AppText></Card>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 4 },
  
  formBox: { marginHorizontal: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, gap: 12 },
  noteInput: { minHeight: 88, textAlignVertical: 'top', borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], padding: 12, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusChip: { flex: 1, minHeight: 38, borderRadius: 20, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  statusChipTextActive: { color: colors.white },
  submitBtn: { height: 44, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  submitBtnText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  
  timelineContainer: { marginHorizontal: 16, position: 'relative', paddingLeft: 20 },
  timelineLine: { position: 'absolute', left: 4, top: 12, bottom: 0, width: 2, backgroundColor: colors.slate[200] },
  timelineItem: { marginBottom: 12, position: 'relative' },
  timelineDot: { position: 'absolute', left: -20, top: 12, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.white, zIndex: 10 },
  
  logCard: { padding: 12, gap: 10, backgroundColor: colors.white },
  logCardIssue: { borderColor: '#fecaca', backgroundColor: colors.dangerLight },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reporterInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatarCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  reporterName: { fontSize: 12, fontWeight: '800', color: colors.slate[900] },
  logTime: { fontSize: 10, color: colors.slate[400], fontWeight: '600', marginTop: 1 },
  
  logNote: { fontSize: 13, lineHeight: 18, color: colors.slate[700], fontWeight: '500' },
  imageRow: { gap: 8, paddingVertical: 4 },
  logImage: { width: 100, height: 75, borderRadius: 8, backgroundColor: colors.slate[100] },
  
  logFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 8, marginTop: 2 },
  projectCodeBadge: { fontSize: 9, fontWeight: '800', color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, textTransform: 'uppercase' },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 0.8 },
  locationText: { fontSize: 10, color: colors.slate[400], fontWeight: '700' },
  
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },
});
