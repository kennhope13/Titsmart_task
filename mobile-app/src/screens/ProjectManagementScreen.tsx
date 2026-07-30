import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { BriefcaseBusiness, CheckCircle2, Clock3, FileUp, MapPin, Plus, Save, ScanText, Search, TriangleAlert, UserPlus, X } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';
import { Task } from '../types';

const todayStamp = () => new Date().toISOString().split('T')[0];
const money = (value?: number) => value ? new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : '-';
const toneForStatus = (status: string) => status === 'completed' ? 'green' : status === 'on_hold' ? 'amber' : 'blue';
const slugProjectCode = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || `PRJ_${Math.floor(Math.random() * 1000)}`;
const cellText = (value: unknown) => String(value ?? '').trim();
const cellNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(/,/g, '.').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

type ImportedTask = Omit<Task, 'id'>;

const buildTasksFromWorkbook = (workbook: XLSX.WorkBook, projectCode: string, projectName: string): ImportedTask[] => {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
  let sectionName = '';
  return rows.slice(1).map((row, index) => {
    const stt = cellText(row[0]);
    const code = cellText(row[1]) || cellText(row[0]);
    const name = cellText(row[2]) || cellText(row[1]) || cellText(row[0]);
    const unit = cellText(row[3]);
    const volume = cellNumber(row[4]);
    const isSectionHeader = !!name && (!unit || volume === 0) && (/^[IVX]+$|^[A-Z]$|^MỤC/i.test(stt.toUpperCase()) || index < 4 && volume === 0);
    if (isSectionHeader) sectionName = name;
    if (!name || name.length < 2) return null;
    return {
      stt: stt || String(index + 1),
      code: code || `TSK-PL-${Date.now()}-${index}`,
      name,
      projectCode,
      projectName,
      volume,
      unit,
      progress: 0,
      status: 'Not Started',
      purchaseStatus: isSectionHeader ? '' : 'Chưa đặt hàng',
      constrStatus: isSectionHeader ? '' : 'Chưa thi công',
      issue: '',
      issueStatus: '',
      isDone: false,
      isSectionHeader,
      sectionName: isSectionHeader ? undefined : sectionName,
      notes: 'Import từ phụ lục dự án',
      createdAt: new Date().toISOString(),
    } as ImportedTask;
  }).filter(Boolean) as ImportedTask[];
};

export const ProjectManagementScreen = () => {
  const navigation = useNavigation<any>();
  const { projects, tasks, engineers, addProject, addTasksBatch, addEngineer } = useRealtimeStore();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjCode, setNewProjCode] = useState('');
  const [newProjLocation, setNewProjLocation] = useState('');
  const [newProjClient, setNewProjClient] = useState('');
  const [newProjContractValue, setNewProjContractValue] = useState('');
  const [newProjManagerId, setNewProjManagerId] = useState(engineers[0]?.id || '');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng công trình');
  const [pendingProjectTasks, setPendingProjectTasks] = useState<ImportedTask[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const visibleProjects = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return projects.filter((project) => !keyword || [project.code, project.name, project.location, project.client, project.managerName].some((value) => String(value || '').toLowerCase().includes(keyword)));
  }, [projects, search]);

  const active = projects.filter((project) => project.status === 'active').length;
  const completed = projects.filter((project) => project.status === 'completed').length;
  const issueTasks = tasks.filter((task) => task.issue && !task.isDone).length;

  const openOcr = () => {
    const parentNavigation = navigation.getParent?.();
    if (parentNavigation?.navigate) parentNavigation.navigate('Ocr');
    else navigation.navigate('MainTabs', { screen: 'Ocr' });
  };

  const importExcel = async () => {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(base64, { type: 'base64' });
      const fileBaseName = (file.name || 'PROJECT').replace(/\.[^.]+$/, '');
      const name = newProjName.trim() || fileBaseName;
      const code = newProjCode.trim() || slugProjectCode(name);
      setNewProjName(name);
      setNewProjCode(code);
      setPendingProjectTasks(buildTasksFromWorkbook(workbook, code, name));
      setShowForm(true);
      Alert.alert('Đã đọc file', 'Thông tin đã đưa vào form. Kiểm tra lại rồi bấm Tạo Dự án.');
    } catch (error) {
      console.error(error);
      Alert.alert('Import thất bại', 'Không đọc được file Excel này.');
    } finally {
      setIsImporting(false);
    }
  };

  const resetForm = () => {
    setNewProjName('');
    setNewProjCode('');
    setNewProjLocation('');
    setNewProjClient('');
    setNewProjContractValue('');
    setNewProjManagerId(engineers[0]?.id || '');
    setNewManagerName('');
    setNewManagerTitle('Chỉ huy trưởng công trình');
    setPendingProjectTasks([]);
  };

  const saveProject = () => {
    if (!newProjName.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập tên dự án/công trình trước khi lưu.');
      return;
    }
    const createdManager = newProjManagerId === '__NEW__' && newManagerName.trim()
      ? addEngineer({ name: newManagerName.trim(), title: newManagerTitle.trim() || 'Chỉ huy trưởng công trình', avatar: '', phone: '', email: '' })
      : null;
    const selectedManager = engineers.find((eng) => eng.id === newProjManagerId);
    const finalManager = createdManager || selectedManager;
    const code = newProjCode.trim() ? newProjCode.trim().toUpperCase() : slugProjectCode(newProjName);
    const importedTasks = pendingProjectTasks.map((task) => ({ ...task, projectCode: code, projectName: newProjName.trim(), assignedEngineerId: finalManager?.id || '', assignedEngineerName: finalManager?.name || '' }));

    addProject({
      code,
      name: newProjName.trim(),
      client: newProjClient.trim() || undefined,
      location: newProjLocation.trim(),
      contractValue: Number(newProjContractValue.replace(/[^0-9]/g, '')) || undefined,
      progressPercent: 0,
      status: 'active',
      activeTeams: 0,
      totalTasks: importedTasks.filter((task) => !task.isSectionHeader).length,
      completedTasks: 0,
      issueTasksCount: 0,
      managerName: finalManager?.name || 'Chưa phân công',
      members: finalManager?.id ? [finalManager.id] : [],
      startDate: todayStamp(),
    });
    if (importedTasks.length > 0) addTasksBatch(importedTasks);
    Alert.alert('Đã tạo dự án', `Dự án đã được tạo${importedTasks.length ? ' và import đầu mục công việc' : ''}.`);
    setShowForm(false);
    resetForm();
  };

  return (
    <Screen>
      <ScreenHeader icon={<BriefcaseBusiness size={21} color={colors.primary} />} title="Dự án" subtitle="Theo dõi danh mục và tiến độ dự án" badge={`${projects.length}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.actionsRow}>
          <Pressable onPress={() => setShowForm(true)} style={styles.primaryAction}><Plus size={16} color={colors.white} /><AppText style={styles.primaryActionText}>Tạo dự án mới</AppText></Pressable>
          <Pressable onPress={importExcel} disabled={isImporting} style={styles.lightAction}><FileUp size={16} color={colors.primary} /><AppText style={styles.lightActionText}>{isImporting ? 'Đang nhập' : 'Nhập file'}</AppText></Pressable>
        </View>

        {showForm ? (
          <Card style={styles.formCard}>
            <View style={styles.formHeader}><AppText style={styles.formTitle}>Nhập file / Khởi tạo Dự án</AppText><Pressable onPress={() => { setShowForm(false); resetForm(); }} style={styles.closeButton}><X size={16} color={colors.slate[500]} /></Pressable></View>
            <Pressable onPress={importExcel} disabled={isImporting} style={styles.importPanel}><FileUp size={18} color={colors.primary} /><View style={{ flex: 1 }}><AppText style={styles.importTitle}>{isImporting ? 'Đang đọc file...' : 'Nhập file công trình'}</AppText><AppText style={styles.importCaption}>Tự điền thông tin dự án và đầu mục công việc nếu file đọc được.</AppText></View></Pressable>
            <TextInput value={newProjName} onChangeText={(value) => { setNewProjName(value); if (!newProjCode.trim()) setNewProjCode(slugProjectCode(value)); }} placeholder="Tên Dự án / Công trình mới *" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
            <View style={styles.twoCols}><TextInput value={newProjCode} onChangeText={setNewProjCode} placeholder="Mã Dự án" placeholderTextColor={colors.slate[400]} style={[styles.formInput, styles.colInput]} /><TextInput value={newProjLocation} onChangeText={setNewProjLocation} placeholder="Địa điểm công trình" placeholderTextColor={colors.slate[400]} style={[styles.formInput, styles.colInput]} /></View>
            <TextInput value={newProjClient} onChangeText={setNewProjClient} placeholder="Chủ đầu tư" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
            <TextInput value={newProjContractValue} onChangeText={setNewProjContractValue} placeholder="Giá trị hợp đồng" placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
            <AppText style={styles.fieldLabel}>Chỉ huy trưởng</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.managerRow}>
              <Pressable onPress={() => setNewProjManagerId('')} style={[styles.managerChip, !newProjManagerId ? styles.managerChipActive : undefined]}><AppText style={[styles.managerText, !newProjManagerId ? styles.managerTextActive : undefined]}>Chưa phân công</AppText></Pressable>
              {engineers.map((eng) => <Pressable key={eng.id} onPress={() => setNewProjManagerId(eng.id)} style={[styles.managerChip, newProjManagerId === eng.id ? styles.managerChipActive : undefined]}><AppText style={[styles.managerText, newProjManagerId === eng.id ? styles.managerTextActive : undefined]}>{eng.name}</AppText></Pressable>)}
              <Pressable onPress={() => setNewProjManagerId('__NEW__')} style={[styles.managerChip, newProjManagerId === '__NEW__' ? styles.managerChipActive : undefined]}><UserPlus size={14} color={newProjManagerId === '__NEW__' ? colors.white : colors.primary} /><AppText style={[styles.managerText, newProjManagerId === '__NEW__' ? styles.managerTextActive : undefined]}>Thêm người mới</AppText></Pressable>
            </ScrollView>
            {newProjManagerId === '__NEW__' ? <View style={styles.newManagerBox}><TextInput value={newManagerName} onChangeText={setNewManagerName} placeholder="Tên người mới *" placeholderTextColor={colors.slate[400]} style={styles.formInput} /><TextInput value={newManagerTitle} onChangeText={setNewManagerTitle} placeholder="Chức danh" placeholderTextColor={colors.slate[400]} style={styles.formInput} /></View> : null}
            {pendingProjectTasks.length > 0 ? <AppText style={styles.pendingText}>Khi lưu dự án, hệ thống sẽ đưa {pendingProjectTasks.length} dòng trong bảng vào tab Công việc.</AppText> : null}
            <Pressable onPress={saveProject} style={styles.saveButton}><Save size={16} color={colors.white} /><AppText style={styles.saveText}>Tạo Dự án</AppText></Pressable>
          </Card>
        ) : null}

        <View style={styles.compactStats}>
          <View style={styles.compactStat}><Clock3 size={15} color={colors.primary} /><AppText style={styles.compactValue}>{active}</AppText><AppText style={styles.compactLabel}>Đang chạy</AppText></View>
          <View style={styles.compactStat}><CheckCircle2 size={15} color="#047857" /><AppText style={styles.compactValue}>{completed}</AppText><AppText style={styles.compactLabel}>Hoàn thành</AppText></View>
          <View style={styles.compactStat}><TriangleAlert size={15} color="#a16207" /><AppText style={styles.compactValue}>{issueTasks}</AppText><AppText style={styles.compactLabel}>Vướng mắc</AppText></View>
          <View style={styles.compactStat}><BriefcaseBusiness size={15} color={colors.slate[600]} /><AppText style={styles.compactValue}>{money(projects.reduce((sum, project) => sum + (project.contractValue || 0), 0))}</AppText><AppText style={styles.compactLabel}>Tổng giá trị</AppText></View>
        </View>
        <View style={styles.searchBox}><Search size={17} color={colors.slate[400]} /><TextInput value={search} onChangeText={setSearch} placeholder="Tìm dự án..." placeholderTextColor={colors.slate[400]} style={styles.searchInput} /></View>
        <SectionTitle title="Danh sách dự án" caption={`${visibleProjects.length} dự án`} />
        <View style={styles.list}>
          {visibleProjects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
            return (
              <Pressable key={project.id} onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id, projectCode: project.code })}>
                <Card style={styles.projectCard}>
                  <View style={styles.rowTop}><View style={styles.copy}><AppText style={styles.code}>{project.code}</AppText><AppText style={styles.title} numberOfLines={2}>{project.name}</AppText></View><StatusBadge label={project.status} tone={toneForStatus(project.status) as any} /></View>
                  <View style={styles.metaRow}><MapPin size={14} color={colors.slate[400]} /><AppText style={styles.meta} numberOfLines={1}>{project.location || 'Chưa có địa điểm'}</AppText></View>
                  <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, project.progressPercent || 0))}%` }]} /></View>
                  <View style={styles.statsLine}><AppText style={styles.small}>{project.progressPercent || 0}% tiến độ</AppText><AppText style={styles.small}>{project.completedTasks || 0}/{projectTasks.length || project.totalTasks || 0} việc</AppText></View>
                  <View style={styles.detailLine}><AppText style={styles.detail}>Chủ đầu tư: {project.client || 'Chưa cập nhật'}</AppText><AppText style={styles.detail}>PM: {project.managerName || 'Chưa phân công'}</AppText></View>
                </Card>
              </Pressable>
            );
          })}
          {visibleProjects.length === 0 ? <Card><AppText style={styles.empty}>Chưa có dự án phù hợp.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 26 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  primaryAction: { flex: 1, minWidth: '47%', height: 42, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryActionText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  lightAction: { flex: 1, minWidth: '47%', height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  ocrAction: { width: '100%', height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  lightActionText: { color: colors.primary, fontWeight: '800', fontSize: 13 },
  formCard: { marginHorizontal: 16, marginTop: 10, gap: 9 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formTitle: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  importPanel: { minHeight: 58, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.slate[300], backgroundColor: colors.slate[50], padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  importTitle: { fontSize: 13, fontWeight: '800', color: colors.primary },
  importCaption: { marginTop: 2, fontSize: 11, lineHeight: 15, color: colors.slate[500] },
  formInput: { height: 42, borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800] },
  twoCols: { flexDirection: 'row', gap: 8 },
  colInput: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: colors.slate[600] },
  managerRow: { gap: 8 },
  managerChip: { minHeight: 34, paddingHorizontal: 11, borderRadius: 9, backgroundColor: colors.slate[100], flexDirection: 'row', alignItems: 'center', gap: 5 },
  managerChipActive: { backgroundColor: colors.primary },
  managerText: { fontSize: 12, fontWeight: '800', color: colors.slate[600] },
  managerTextActive: { color: colors.white },
  newManagerBox: { gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff' },
  pendingText: { fontSize: 12, lineHeight: 17, color: '#047857', fontWeight: '800' },
  saveButton: { height: 42, borderRadius: 9, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  compactStats: { marginHorizontal: 16, marginTop: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  compactStat: { width: '50%', minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.slate[100] },
  compactValue: { minWidth: 24, fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  compactLabel: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.slate[500] },
  searchBox: { marginHorizontal: 16, marginTop: 12, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800] },
  list: { paddingHorizontal: 16, gap: 10 },
  projectCard: { gap: 10 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary },
  title: { marginTop: 4, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flex: 1, fontSize: 12, color: colors.slate[500] },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.slate[100], overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  statsLine: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  detail: { flex: 1, fontSize: 11, color: colors.slate[500] },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});



