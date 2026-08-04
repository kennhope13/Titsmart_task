import React, { useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { BriefcaseBusiness, CheckCircle2, Clock3, FileUp, MapPin, Plus, Save, UserPlus, Search, TriangleAlert, X, Trash2 } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';
import { api } from '../services/api';
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
  try {
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('Tệp Excel không chứa bất kỳ bảng tính (sheet) nào.');
    }
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      throw new Error(`Không thể đọc bảng tính "${sheetName}".`);
    }

    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
    if (!rows || rows.length === 0) return [];

    const cleanTextLower = (str: any) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

    // Find header row containing STT (scan first 80 rows like web admin)
    let startRow = 1;
    let headerRow: any[] = rows[0] || [];
    for (let rIdx = 0; rIdx < Math.min(rows.length, 80); rIdx++) {
      const r = rows[rIdx];
      if (r && Array.isArray(r) && r.some((cell: any) => cleanTextLower(cell) === 'stt')) {
        startRow = rIdx + 1;
        headerRow = r;
        break;
      }
    }

    const getColIdx = (headers: any[], keywords: string[], fallback: number) => {
      const idx = headers.findIndex((h) => {
        const cleaned = cleanTextLower(h);
        return keywords.some((kw) => cleaned.includes(kw));
      });
      return idx >= 0 ? idx : fallback;
    };

    const sttCol = getColIdx(headerRow, ['stt', 'tt'], 0);
    const nameCol = getColIdx(headerRow, ['noi dung', 'hang muc', 'dien giai', 'mo ta'], 1);
    const volCol = getColIdx(headerRow, ['khoi luong', 'so luong'], 2);
    const unitCol = getColIdx(headerRow, ['don vi', 'dvt'], 3);

    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MỤC\s*[A-Z0-9]+)$/i;
    const numericParentRegex = /^\d+$/;
    const decimalItemRegex = /^\d+(?:\.\d+)+$/;

    let sectionName = 'Mục chung';
    const results: ImportedTask[] = [];

    for (let i = startRow; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const stt = cellText(row[sttCol]);
      // Fallback giống web admin: nếu cells[nameCol] rỗng, tìm cell không rỗng đầu tiên (không phải cột STT)
      let name = cellText(row[nameCol]);
      if (!name) {
        const fallbackCell = row.find((cell: any, cellIndex: number) => cellIndex !== sttCol && cellText(cell).length > 1 && cleanTextLower(cell) !== 'stt');
        name = fallbackCell ? cellText(fallbackCell) : '';
      }
      if (!name || name.length < 2) continue;

      const unit = cellText(row[unitCol]);
      const volume = cellNumber(row[volCol]);

      // Bỏ qua dòng header lặp
      if (cleanTextLower(stt) === 'stt') continue;
      // Bỏ qua dòng tổng cộng
      if (/^(tổng|cộng|tong|cong|total|sum)/i.test(cleanTextLower(name))) continue;

      // Kiểm tra STT hợp lệ giống web admin (roman, số nguyên, số thập phân)
      const sttUpper = stt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
      const hasValidStt = romanRegex.test(sttUpper) || numericParentRegex.test(sttUpper) || decimalItemRegex.test(sttUpper);
      if (!hasValidStt && stt.length > 0) continue;

      // Nhận diện section header giống web admin
      const isSectionHeader = romanRegex.test(sttUpper) || (numericParentRegex.test(sttUpper) && volume === 0 && !unit);
      if (isSectionHeader) sectionName = name;

      results.push({
        stt: isSectionHeader ? stt : (stt || String(results.length + 1)),
        code: `TSK-PL-${Date.now()}-${i}`,
        name,
        projectCode,
        projectName,
        volume: isSectionHeader ? 0 : volume,
        unit: isSectionHeader ? '' : unit,
        progress: 0,
        status: 'Not Started',
        purchaseStatus: isSectionHeader ? '' : 'Chưa đặt hàng',
        constrStatus: isSectionHeader ? '' : 'Chưa thi công',
        issue: '',
        issueStatus: '',
        isDone: false,
        isSectionHeader,
        sectionName: isSectionHeader ? name : sectionName,
        notes: 'Import từ phụ lục dự án',
        createdAt: new Date().toISOString(),
      } as ImportedTask);
    }

    return results;
  } catch (e: any) {
    throw new Error(`Lỗi phân tích bảng tính: ${e.message}`);
  }
};

export const ProjectManagementScreen = () => {
  const navigation = useNavigation<any>();
  const { projects, tasks, engineers, addProject, addTasksBatch, addEngineer, fetchProjects } = useRealtimeStore();
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
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

  const importExcel = async () => {
    try {
      setIsImporting(true);
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
      const workbook = XLSX.read(base64, { type: 'base64' });

      // --- Trích xuất metadata từ nội dung file (giống Web Admin) ---
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const csvText = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
      const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean);

      const normalizeLookup = (str: string) =>
        str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

      const getLineAfterLabel = (textLines: string[], labels: string[]) => {
        const normalizedLabels = labels.map(normalizeLookup);
        for (const line of textLines) {
          const lookupLine = normalizeLookup(line);
          const matchedLabel = normalizedLabels.find((label) => lookupLine.startsWith(label));
          if (!matchedLabel) continue;
          // Tìm phần giá trị sau dấu ":" hoặc "-" hoặc tab
          const colonIdx = line.indexOf(':');
          const tabIdx = line.indexOf('\t');
          const separatorIdx = colonIdx >= 0 ? colonIdx : tabIdx;
          if (separatorIdx >= 0) {
            const value = line.slice(separatorIdx + 1).replace(/\t/g, ' ').trim();
            if (value) return value;
          }
          // Fallback: bỏ nhãn, lấy phần còn lại
          for (const label of labels) {
            const value = line.replace(new RegExp(`^\\s*${label}\\s*[:\\-]?\\s*`, 'i'), '').replace(/\t/g, ' ').trim();
            if (value && normalizeLookup(value) !== lookupLine) return value;
          }
        }
        return '';
      };

      const extractedProjectName = getLineAfterLabel(lines, ['Công trình', 'Tên công trình', 'Công trình xây dựng', 'Tên dự án', 'Dự án']);
      const extractedLocation = getLineAfterLabel(lines, ['Địa điểm công trình', 'Địa điểm xây dựng công trình', 'Địa điểm xây dựng', 'Địa điểm thi công', 'Địa điểm', 'Vị trí công trình', 'Vị trí', 'Địa chỉ công trình', 'Địa chỉ']);
      const extractedClient = getLineAfterLabel(lines, ['Chủ đầu tư', 'Khách hàng', 'Bên giao thầu']);
      const extractedContractValue = getLineAfterLabel(lines, ['Giá trị hợp đồng', 'Giá trị phụ lục', 'Tổng giá trị']);

      const fileBaseName = (file.name || 'PROJECT').replace(/\.[^.]+$/, '');
      const name = extractedProjectName || newProjName.trim() || fileBaseName;
      const code = newProjCode.trim() || slugProjectCode(name);

      setNewProjName(name);
      setNewProjCode(code);
      if (extractedLocation) setNewProjLocation(extractedLocation);
      if (extractedClient) setNewProjClient(extractedClient);
      if (extractedContractValue) setNewProjContractValue(extractedContractValue.replace(/[^0-9]/g, ''));

      setPendingProjectTasks(buildTasksFromWorkbook(workbook, code, name));
      Alert.alert('Đã đọc file', `Đã trích xuất thông tin dự án "${name}" và đưa vào form. Hãy kiểm tra và điền nốt các trường còn lại.`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Import thất bại', `Chi tiết lỗi: ${error?.message || error}`);
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

  const saveProject = async () => {
    if (!newProjName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên dự án/công trình trước khi lưu.');
      return;
    }
    
    try {
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
      
      if (importedTasks.length > 0) {
        addTasksBatch(importedTasks);

        // Tạo Material Plans (KH Vật tư) cho từng đầu mục - giống Web Admin
        for (const [index, task] of importedTasks.entries()) {
          if (!task.name?.trim()) continue;
          try {
            await api.accounting.createMaterialPlan({
              projectCode: code,
              stt: task.stt || String(index + 1),
              jobContent: task.name,
              unit: task.unit || '',
              contractVolume: task.volume || 0,
              techSpecModel: '',
              techSpecOrigin: '',
              progressStatus: '',
              orderedVolume: 0,
              orderedStatus: '',
              expectedDate: '',
              issueContent: '',
              issueStatus: '',
              docCo: false,
              docCq: false,
              docFireInspection: false,
              dispatchToSite: false,
              supplyScope: 'unknown',
              notes: [task.isSectionHeader ? '[section]' : '', task.notes, 'Đồng bộ từ phụ lục khi tạo dự án'].filter(Boolean).join(' | '),
            });
          } catch (e) {
            console.warn('Không tạo được Material Plan cho:', task.name, e);
          }
        }

        // Tạo Purchasing Plans (Đơn mua sắm) cho đầu mục không phải section header - giống Web Admin
        for (const [index, task] of importedTasks.filter((t) => !t.isSectionHeader && t.name?.trim()).entries()) {
          try {
            await api.accounting.createPurchasing({
              projectCode: code,
              stt: task.stt || String(index + 1),
              content: task.name,
              unit: task.unit || '',
              volumeContract: task.volume || 0,
              volumeOrder: 0,
              unitPrice: 0,
              vatRate: 0,
              vatAmount: 0,
              totalAmount: 0,
              prepayPercent: 0,
              prepayAmount: 0,
              remainingAmount: 0,
              orderStatus: 'Chưa đặt hàng',
              contractStatus: 'Đã có phụ lục',
              invoiceStatus: 'Chưa xuất',
              notes: [task.notes, 'Đồng bộ từ phụ lục khi tạo dự án'].filter(Boolean).join(' | '),
            });
          } catch (e) {
            console.warn('Không tạo được Purchasing Plan cho:', task.name, e);
          }
        }
      }
      
      Alert.alert('Đã tạo dự án', `Dự án đã được tạo${importedTasks.length ? ` và đồng bộ ${importedTasks.length} đầu mục (Công việc + KH Vật tư + Mua sắm)` : ''}.`);
      setModalVisible(false);
      resetForm();
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể khởi tạo dự án mới.');
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xoá Dự Án', `Bạn chắc chắn muốn xoá dự án "${name}"? Hành động này không thể hoàn tác.`, [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.projects.delete(id);
            await fetchProjects();
            Alert.alert('Thành công', 'Đã xoá dự án.');
          } catch (e) {
            console.error(e);
            Alert.alert('Lỗi', 'Không thể xoá dự án.');
          }
        }
      }
    ]);
  };

  return (
    <Screen>
      <ScreenHeader icon={<BriefcaseBusiness size={21} color={colors.primary} />} title="Dự án" subtitle="Theo dõi danh mục và tiến độ dự án" badge={`${projects.length}`} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* Actions Button */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => { resetForm(); setModalVisible(true); }}
            style={({ pressed }) => [
              styles.primaryAction,
              pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }
            ]}
          >
            <Plus size={16} color={colors.white} />
            <AppText style={styles.primaryActionText}>Tạo dự án mới</AppText>
          </Pressable>
        </View>

        {/* Lưới tóm tắt thống kê */}
        <View style={styles.compactStats}>
          <View style={styles.compactStat}>
            <Clock3 size={15} color={colors.primary} />
            <AppText style={styles.compactValue}>{active}</AppText>
            <AppText style={styles.compactLabel}>Đang chạy</AppText>
          </View>
          <View style={styles.compactStat}>
            <CheckCircle2 size={15} color={colors.accent} />
            <AppText style={styles.compactValue}>{completed}</AppText>
            <AppText style={styles.compactLabel}>Hoàn thành</AppText>
          </View>
          <View style={styles.compactStat}>
            <TriangleAlert size={15} color={colors.danger} />
            <AppText style={styles.compactValue}>{issueTasks}</AppText>
            <AppText style={styles.compactLabel}>Vướng mắc</AppText>
          </View>
          <View style={styles.compactStat}>
            <BriefcaseBusiness size={15} color={colors.slate[600]} />
            <AppText style={styles.compactValue}>{money(projects.reduce((sum, project) => sum + (project.contractValue || 0), 0))}</AppText>
            <AppText style={styles.compactLabel}>Tổng hợp đồng</AppText>
          </View>
        </View>

        {/* Tìm kiếm */}
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Tìm tên dự án, chủ đầu tư, địa điểm..." placeholderTextColor={colors.slate[400]} style={styles.searchInput} />
        </View>

        <SectionTitle title="Danh sách dự án" caption={`${visibleProjects.length} công trình`} />
        
        {/* Danh sách */}
        <View style={styles.list}>
          {visibleProjects.map((project) => {
            const projectTasks = tasks.filter((task) => task.projectCode === project.code && !task.isSectionHeader);
            const percent = project.progressPercent || 0;
            return (
              <Pressable
                key={project.id}
                onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id, projectCode: project.code })}
                style={({ pressed }) => [
                  pressed && { opacity: 0.96 }
                ]}
              >
                <Card style={styles.projectCard}>
                  <View style={styles.rowTop}>
                    <View style={styles.copy}>
                      <AppText style={styles.code}>{project.code}</AppText>
                      <AppText style={styles.title} numberOfLines={2}>{project.name}</AppText>
                    </View>
                    <View style={styles.headerRightActions}>
                      <StatusBadge label={project.status === 'active' ? 'Đang chạy' : 'Hoàn thành'} tone={toneForStatus(project.status) as any} />
                      <Pressable onPress={() => handleDelete(project.id, project.name)} style={styles.deleteBtn}>
                        <Trash2 size={16} color={colors.slate[400]} />
                      </Pressable>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <MapPin size={14} color={colors.slate[400]} />
                    <AppText style={styles.meta} numberOfLines={1}>{project.location || 'Chưa cập nhật địa điểm'}</AppText>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${Math.max(2, Math.min(100, percent))}%` }]} />
                  </View>
                  <View style={styles.statsLine}>
                    <AppText style={styles.small}>{percent}% tiến độ</AppText>
                    <AppText style={styles.small}>{project.completedTasks || 0}/{projectTasks.length || project.totalTasks || 0} công việc</AppText>
                  </View>
                  <View style={styles.detailLine}>
                    <AppText style={styles.detail} numberOfLines={1}>Chủ đầu tư: {project.client || 'Chưa cập nhật'}</AppText>
                    <AppText style={styles.detail} numberOfLines={1}>PM: {project.managerName || 'Chưa phân công'}</AppText>
                  </View>
                </Card>
              </Pressable>
            );
          })}
          {visibleProjects.length === 0 ? (
            <Card style={styles.emptyCardContainer}>
              <AppText style={styles.empty}>Chưa có dự án nào phù hợp.</AppText>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* Beautiful Modal for Create Project */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>Khởi tạo Dự án mới</AppText>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.slate[500]} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              <Pressable onPress={importExcel} disabled={isImporting} style={styles.importPanel}>
                <FileUp size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.importTitle}>{isImporting ? 'Đang đọc file...' : 'Nhập Excel Phụ lục đính kèm'}</AppText>
                  <AppText style={styles.importCaption}>Hỗ trợ nạp nhanh danh mục đầu mục công việc từ bảng tính Excel.</AppText>
                </View>
              </Pressable>

              <AppText style={styles.inputLabel}>Tên dự án / Công trình *</AppText>
              <TextInput value={newProjName} onChangeText={(value) => { setNewProjName(value); if (!newProjCode.trim()) setNewProjCode(slugProjectCode(value)); }} placeholder="Nhập tên dự án công trình mới..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

              <View style={styles.twoCols}>
                <View style={styles.colInput}>
                  <AppText style={styles.inputLabel}>Mã dự án *</AppText>
                  <TextInput value={newProjCode} onChangeText={setNewProjCode} placeholder="Mã PRJ..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
                <View style={styles.colInput}>
                  <AppText style={styles.inputLabel}>Địa điểm xây dựng</AppText>
                  <TextInput value={newProjLocation} onChangeText={setNewProjLocation} placeholder="Tỉnh/Thành phố..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
              </View>

              <View style={styles.twoCols}>
                <View style={styles.colInput}>
                  <AppText style={styles.inputLabel}>Chủ đầu tư</AppText>
                  <TextInput value={newProjClient} onChangeText={setNewProjClient} placeholder="Tên chủ đầu tư..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
                <View style={styles.colInput}>
                  <AppText style={styles.inputLabel}>Giá trị hợp đồng (VNĐ)</AppText>
                  <TextInput value={newProjContractValue} onChangeText={setNewProjContractValue} placeholder="Tổng giá trị HĐ..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                </View>
              </View>

              <AppText style={styles.inputLabel}>Chỉ huy trưởng</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.managerRow} keyboardShouldPersistTaps="handled">
                <Pressable onPress={() => setNewProjManagerId('')} style={[styles.managerChip, !newProjManagerId ? styles.managerChipActive : undefined]}>
                  <AppText style={[styles.managerText, !newProjManagerId ? styles.managerTextActive : undefined]}>Chưa phân công</AppText>
                </Pressable>
                {engineers.map((eng) => (
                  <Pressable key={eng.id} onPress={() => setNewProjManagerId(eng.id)} style={[styles.managerChip, newProjManagerId === eng.id ? styles.managerChipActive : undefined]}>
                    <AppText style={[styles.managerText, newProjManagerId === eng.id ? styles.managerTextActive : undefined]}>{eng.name}</AppText>
                  </Pressable>
                ))}
                <Pressable onPress={() => setNewProjManagerId('__NEW__')} style={[styles.managerChip, newProjManagerId === '__NEW__' ? styles.managerChipActive : undefined]}>
                  <UserPlus size={14} color={newProjManagerId === '__NEW__' ? colors.white : colors.primary} />
                  <AppText style={[styles.managerText, newProjManagerId === '__NEW__' ? styles.managerTextActive : undefined]}>Thêm người mới</AppText>
                </Pressable>
              </ScrollView>

              {newProjManagerId === '__NEW__' ? (
                <View style={styles.newManagerBox}>
                  <AppText style={[styles.inputLabel, { color: colors.primary }]}>Tên Chỉ huy trưởng mới *</AppText>
                  <TextInput value={newManagerName} onChangeText={setNewManagerName} placeholder="Nhập họ và tên..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                  <AppText style={[styles.inputLabel, { color: colors.primary, marginTop: 4 }]}>Chức danh</AppText>
                  <TextInput value={newManagerTitle} onChangeText={setNewManagerTitle} placeholder="Chỉ huy phó, Kỹ sư giám sát..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
              ) : null}

              {pendingProjectTasks.length > 0 ? (
                <View style={styles.pendingTasksBox}>
                  <AppText style={styles.pendingText}>✓ Đọc thành công {pendingProjectTasks.length} đầu mục công việc từ file Excel.</AppText>
                </View>
              ) : null}

              <Pressable onPress={saveProject} style={styles.saveBtn}>
                <Save size={18} color={colors.white} />
                <AppText style={styles.saveBtnText}>Tạo dự án</AppText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 26 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16, paddingTop: 14 },
  primaryAction: { flex: 1, minWidth: '47%', height: 44, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryActionText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  importPanel: { minHeight: 62, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.slate[300], backgroundColor: colors.slate[50], padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  importTitle: { fontSize: 13, fontWeight: '800', color: colors.primary },
  importCaption: { marginTop: 2, fontSize: 11, lineHeight: 15, color: colors.slate[500], fontWeight: '500' },
  formInput: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800], fontWeight: '600', backgroundColor: colors.slate[50] },
  twoCols: { flexDirection: 'row', gap: 10 },
  colInput: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: colors.slate[500], textTransform: 'uppercase', marginTop: 4 },
  managerRow: { gap: 8, paddingVertical: 4 },
  managerChip: { minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], flexDirection: 'row', alignItems: 'center', gap: 6 },
  managerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  managerText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  managerTextActive: { color: colors.white },
  newManagerBox: { gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bfdbfe', backgroundColor: '#eff6ff', marginTop: 4 },
  pendingTasksBox: { padding: 10, borderRadius: 8, backgroundColor: '#d1fae5', borderWidth: 1, borderColor: '#a7f3d0', marginTop: 4 },
  pendingText: { fontSize: 11.5, lineHeight: 16, color: '#065f46', fontWeight: '800' },
  compactStats: { marginHorizontal: 16, marginTop: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  compactStat: { width: '50%', minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.slate[100] },
  compactValue: { minWidth: 24, fontSize: 16, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  compactLabel: { flex: 1, fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.slate[500] },
  searchBox: { marginHorizontal: 16, marginTop: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  list: { paddingHorizontal: 16, gap: 10 },
  projectCard: { gap: 10, backgroundColor: colors.white },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 4 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 2, fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { flex: 1, fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.slate[100], overflow: 'hidden', marginTop: 2 },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  statsLine: { flexDirection: 'row', justifyContent: 'space-between' },
  small: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 8, marginTop: 2 },
  detail: { flex: 1, fontSize: 11, color: colors.slate[500], fontWeight: '500' },
  emptyCardContainer: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13, fontStyle: 'italic' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.slate[100], paddingBottom: 12, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.slate[900] },
  closeBtn: { padding: 4 },
  formScroll: { gap: 12 },
  saveBtn: { height: 46, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' }
});
