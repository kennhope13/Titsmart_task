import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, ClipboardPlus, Save, Send } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle } from '../components/MobileUI';

const priorities = ['Low', 'Medium', 'High'] as const;
const priorityLabels = { Low: 'Thấp', Medium: 'Trung bình', High: 'Cao' };

export const TaskFormScreen = ({ route }: any) => {
  const navigation = useNavigation<any>();
  const { projects, engineers, addTask } = useRealtimeStore();
  const mode = route?.params?.mode === 'assign' ? 'Giao công việc' : 'Tạo công việc';
  const defaultProject = projects[0];
  const defaultEngineer = engineers[0];
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultProject?.location || '');
  const [dueDate, setDueDate] = useState('');
  const [team, setTeam] = useState(defaultProject?.name || 'Đội thi công');
  const [assigneeId, setAssigneeId] = useState(defaultEngineer?.id || '');
  const [priority, setPriority] = useState<typeof priorities[number]>('Medium');
  const [notes, setNotes] = useState('');
  const assignee = useMemo(() => engineers.find((item) => item.id === assigneeId) || defaultEngineer, [engineers, assigneeId]);

  const save = (draft: boolean) => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên công việc.');
      return;
    }
    addTask({
      stt: String(Date.now()).slice(-4),
      code: `CV-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      projectCode: defaultProject?.code || 'MOBILE',
      projectName: team || defaultProject?.name || 'Đội thi công',
      volume: 1,
      unit: 'việc',
      progress: draft ? 0 : 0.1,
      status: draft ? 'Not Started' : 'In Progress',
      purchaseStatus: 'Không áp dụng',
      constrStatus: draft ? 'Chờ giao' : 'Đang làm',
      issue: '',
      issueStatus: '',
      isDone: false,
      isSectionHeader: false,
      sectionName: team,
      notes: [description, notes].filter(Boolean).join('\n'),
      assignedEngineerId: assignee?.id,
      assignedEngineerName: assignee?.name,
      dueDate: dueDate || 'Chưa đặt',
      priority,
      createdAt: new Date().toISOString(),
    });
    Alert.alert(draft ? 'Đã lưu nháp' : 'Đã giao việc', draft ? 'Công việc được lưu để hoàn thiện sau.' : `Đã giao cho ${assignee?.name || 'nhân viên'}.`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <Screen>
      <ScreenHeader
        icon={<ClipboardPlus size={21} color={colors.primary} />}
        title={mode}
        subtitle="Nhập các thông tin cần thiết"
        action={<Pressable onPress={() => navigation.goBack()} style={styles.backButton}><ArrowLeft size={20} color={colors.slate[700]} /></Pressable>}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SectionTitle title="Thông tin công việc" />
        <Card style={styles.formCard}>
          <Field label="Tên công việc *" value={name} onChangeText={setName} placeholder="Ví dụ: Kiểm tra khối lượng thi công" />
          <Field label="Mô tả" value={description} onChangeText={setDescription} placeholder="Yêu cầu và phạm vi thực hiện" multiline />
          <Field label="Địa điểm" value={location} onChangeText={setLocation} placeholder="Khu vực thi công" />
          <View style={styles.twoColumns}>
            <View style={{ flex: 1 }}><Field label="Hạn hoàn thành" value={dueDate} onChangeText={setDueDate} placeholder="DD/MM/YYYY" /></View>
            <View style={{ flex: 1 }}><Field label="Đội/Nhóm" value={team} onChangeText={setTeam} placeholder="Đội thi công" /></View>
          </View>
        </Card>

        <SectionTitle title="Phân công" />
        <Card style={styles.formCard}>
          <AppText style={styles.label}>Người thực hiện</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
            {engineers.map((item) => <Choice key={item.id} label={item.name} active={assigneeId === item.id} onPress={() => setAssigneeId(item.id)} />)}
          </ScrollView>
          <AppText style={styles.label}>Mức độ ưu tiên</AppText>
          <View style={styles.priorityRow}>
            {priorities.map((item) => <Choice key={item} label={priorityLabels[item]} active={priority === item} onPress={() => setPriority(item)} grow />)}
          </View>
          <Field label="Ghi chú thêm" value={notes} onChangeText={setNotes} placeholder="Thông tin bổ sung cho người thực hiện" multiline />
        </Card>

        <View style={styles.actions}>
          <Pressable onPress={() => save(true)} style={styles.draftButton}><Save size={16} color={colors.slate[700]} /><AppText style={styles.draftText}>Lưu nháp</AppText></Pressable>
          <Pressable onPress={() => save(false)} style={styles.submitButton}><Send size={16} color={colors.white} /><AppText style={styles.submitText}>Giao việc</AppText></Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
};

const Field = ({ label, value, onChangeText, placeholder, multiline }: any) => (
  <View style={styles.field}>
    <AppText style={styles.label}>{label}</AppText>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.slate[400]} multiline={multiline} style={[styles.input, multiline ? styles.multiline : undefined]} />
  </View>
);

const Choice = ({ label, active, onPress, grow }: { label: string; active: boolean; onPress: () => void; grow?: boolean }) => (
  <Pressable onPress={onPress} style={[styles.choice, grow ? styles.choiceGrow : undefined, active ? styles.choiceActive : undefined]}>
    <AppText style={[styles.choiceText, active ? styles.choiceTextActive : undefined]} numberOfLines={1}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  backButton: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  formCard: { marginHorizontal: 16, gap: 13 },
  field: { gap: 6 },
  label: { fontSize: 12, fontWeight: '700', color: colors.slate[700] },
  input: { minHeight: 43, borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], paddingHorizontal: 12, color: colors.slate[800], fontSize: 13 },
  multiline: { minHeight: 78, paddingTop: 11, textAlignVertical: 'top' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  choiceRow: { gap: 8 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  choice: { maxWidth: 180, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, backgroundColor: colors.slate[100] },
  choiceGrow: { flex: 1, alignItems: 'center' },
  choiceActive: { backgroundColor: colors.primary },
  choiceText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  choiceTextActive: { color: colors.white },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 18 },
  draftButton: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[300], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  draftText: { fontSize: 13, fontWeight: '800', color: colors.slate[700] },
  submitButton: { flex: 1, height: 46, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  submitText: { fontSize: 13, fontWeight: '800', color: colors.white },
});
