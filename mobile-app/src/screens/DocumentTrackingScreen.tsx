import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, TextInput, View, Pressable } from 'react-native';
import { CheckCircle2, FileText, Search, Send, WalletCards, Plus, X, Save, Edit, Trash2 } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatCard, StatusBadge } from '../components/MobileUI';
import { DocumentTrack } from '../types';
import { api } from '../services/api';

const filterItems = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chưa hoàn tất' },
  { key: 'completed', label: 'Hoàn tất' },
  { key: 'paid', label: 'Đã thanh toán' },
];

const money = (value?: number) => {
  return value ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(value) : '-';
};

export const DocumentTrackingScreen = () => {
  const { documentTracks, projects, fetchAccounting } = useRealtimeStore();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Modal & Form state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<DocumentTrack | null>(null);

  const [formContractNo, setFormContractNo] = useState('');
  const [formContractName, setFormContractName] = useState('');
  const [formProjectCode, setFormProjectCode] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formContractValue, setFormContractValue] = useState('');
  const [formPrepayAmount, setFormPrepayAmount] = useState('');
  const [formReceiverName, setFormReceiverName] = useState('');
  const [formSendDate, setFormSendDate] = useState('');
  const [formReceiveDate, setFormReceiveDate] = useState('');
  const [formDocStatus, setFormDocStatus] = useState('Đang soạn thảo');
  const [formPaymentStatus, setFormPaymentStatus] = useState('Chưa thanh toán');
  const [formIsCompleted, setFormIsCompleted] = useState(false);

  const filteredDocs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return documentTracks.filter((doc) => {
      const matchSearch = !keyword || `${doc.contractNo} ${doc.contractName} ${doc.projectCode} ${doc.company}`.toLowerCase().includes(keyword);
      const isPaid = doc.paymentStatus?.toLowerCase().includes('đã') || doc.isCompleted;
      
      const matchFilter = activeFilter === 'all'
        || (activeFilter === 'pending' && !doc.isCompleted)
        || (activeFilter === 'completed' && doc.isCompleted)
        || (activeFilter === 'paid' && isPaid);
        
      return matchSearch && matchFilter;
    });
  }, [documentTracks, search, activeFilter]);

  const completedCount = documentTracks.filter((doc) => doc.isCompleted).length;
  const paidCount = documentTracks.filter((doc) => doc.paymentStatus?.toLowerCase().includes('đã')).length;
  const sentCount = documentTracks.filter((doc) => doc.sendDate).length;

  const openForm = (item: DocumentTrack | null = null) => {
    if (item) {
      setEditingItem(item);
      setFormContractNo(item.contractNo || '');
      setFormContractName(item.contractName);
      setFormProjectCode(item.projectCode);
      setFormCompany(item.company || '');
      setFormContractValue(String(item.contractValue || ''));
      setFormPrepayAmount(String(item.prepayAmount || ''));
      setFormReceiverName(item.receiverName || '');
      setFormSendDate(item.sendDate || '');
      setFormReceiveDate(item.receiveDate || '');
      setFormDocStatus(item.docStatus || 'Đang soạn thảo');
      setFormPaymentStatus(item.paymentStatus || 'Chưa thanh toán');
      setFormIsCompleted(!!item.isCompleted);
    } else {
      setEditingItem(null);
      setFormContractNo(`HD-${Date.now().toString().slice(-4)}`);
      setFormContractName('');
      setFormProjectCode(projects[0]?.code || '');
      setFormCompany('');
      setFormContractValue('');
      setFormPrepayAmount('');
      setFormReceiverName('');
      setFormSendDate(new Date().toISOString().split('T')[0]);
      setFormReceiveDate('');
      setFormDocStatus('Đang soạn thảo');
      setFormPaymentStatus('Chưa thanh toán');
      setFormIsCompleted(false);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formContractName.trim() || !formProjectCode.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng điền các thông tin bắt buộc (*)');
      return;
    }

    const docData = {
      contractNo: formContractNo.trim(),
      contractName: formContractName.trim(),
      projectCode: formProjectCode,
      company: formCompany.trim() || undefined,
      contractValue: Number(formContractValue) || undefined,
      prepayAmount: Number(formPrepayAmount) || undefined,
      receiverName: formReceiverName.trim() || undefined,
      sendDate: formSendDate.trim() || undefined,
      receiveDate: formReceiveDate.trim() || undefined,
      docStatus: formDocStatus,
      paymentStatus: formPaymentStatus,
      isCompleted: formIsCompleted || formDocStatus === 'Đã hoàn tất',
    };

    try {
      if (editingItem) {
        await api.accounting.updateDocumentTrack(editingItem.id, docData);
        Alert.alert('Thành công', 'Đã cập nhật hồ sơ hợp đồng.');
      } else {
        await api.accounting.createDocumentTrack(docData);
        Alert.alert('Thành công', 'Đã thêm hồ sơ hợp đồng mới.');
      }
      await fetchAccounting();
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu hồ sơ.');
    }

    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xoá hồ sơ', 'Bạn chắc chắn muốn xoá hồ sơ này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.accounting.deleteDocumentTrack(id);
            await fetchAccounting();
            Alert.alert('Đã xoá', 'Đã xoá hồ sơ thành công.');
          } catch (e) {
            console.error(e);
            Alert.alert('Lỗi', 'Không thể xoá hồ sơ.');
          }
        }
      }
    ]);
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<FileText size={21} color={colors.primary} />}
        title="Theo dõi hồ sơ"
        subtitle="Quản lý tình trạng ký duyệt, gửi nhận hồ sơ thanh quyết toán"
        badge={`${documentTracks.length}`}
      />
      
      {/* Category Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {filterItems.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveFilter(tab.key)}
              style={[styles.tab, activeFilter === tab.key ? styles.tabActive : undefined]}
            >
              <AppText style={[styles.tabText, activeFilter === tab.key ? styles.tabTextActive : undefined]}>
                {tab.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Lưới thống kê */}
        <View style={styles.grid}>
          <StatCard label="Tổng hồ sơ" value={documentTracks.length} icon={<FileText size={16} color={colors.primary} />} />
          <StatCard label="Đã gửi" value={sentCount} icon={<Send size={16} color={colors.primary} />} />
          <StatCard label="Hoàn tất" value={completedCount} tone="green" icon={<CheckCircle2 size={16} color="#047857" />} />
          <StatCard label="Đã thanh toán" value={paidCount} tone="slate" icon={<WalletCards size={16} color={colors.slate[600]} />} />
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo số hợp đồng, dự án, đối tác..."
            placeholderTextColor={colors.slate[400]}
            style={styles.searchInput}
          />
        </View>

        <SectionTitle title="Danh mục hợp đồng & Hồ sơ" caption={`${filteredDocs.length} bản ghi`} />
        
        {/* Danh sách */}
        <View style={styles.list}>
          {filteredDocs.map((doc) => {
            const hasPaid = doc.paymentStatus?.toLowerCase().includes('đã') || doc.isCompleted;
            return (
              <Pressable key={doc.id} onPress={() => openForm(doc)}>
                <Card style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.copy}>
                      <AppText style={styles.code}>{doc.contractNo || doc.projectCode}</AppText>
                      <AppText style={styles.title} numberOfLines={2}>{doc.contractName}</AppText>
                    </View>
                    <View style={styles.topRightActions}>
                      <Pressable onPress={() => openForm(doc)} style={styles.editBtn}>
                        <Edit size={14} color={colors.slate[500]} />
                      </Pressable>
                      <Pressable onPress={() => handleDelete(doc.id)} style={styles.deleteBtn}>
                        <Trash2 size={15} color={colors.slate[400]} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Sub info grid */}
                  <View style={styles.metaBox}>
                    <View style={styles.metaRow}>
                      <AppText style={styles.metaLabel}>Đối tác:</AppText>
                      <AppText style={styles.metaVal} numberOfLines={1}>{doc.company || 'Chưa có'}</AppText>
                    </View>
                    <View style={styles.metaRow}>
                      <AppText style={styles.metaLabel}>Người nhận:</AppText>
                      <AppText style={styles.metaVal} numberOfLines={1}>{doc.receiverName || 'Chưa cập nhật'}</AppText>
                    </View>
                    <View style={styles.metaRow}>
                      <AppText style={styles.metaLabel}>Ngày gửi/nhận:</AppText>
                      <AppText style={styles.metaVal}>
                        {doc.sendDate || '-'} / {doc.receiveDate || '-'}
                      </AppText>
                    </View>
                    <View style={styles.metaRow}>
                      <AppText style={styles.metaLabel}>Hồ sơ:</AppText>
                      <AppText style={[styles.metaVal, { fontWeight: '800', color: doc.isCompleted ? '#059669' : colors.primary }]}>
                        {doc.docStatus || 'Đang xử lý'}
                      </AppText>
                    </View>
                  </View>

                  {/* Financial overview line */}
                  <View style={styles.financialRow}>
                    <View style={styles.financialCol}>
                      <AppText style={styles.financeLabel}>GIÁ TRỊ HĐ</AppText>
                      <AppText style={styles.financeValue}>{money(doc.contractValue)}</AppText>
                    </View>
                    <View style={[styles.financialCol, { borderLeftWidth: 1, borderLeftColor: colors.slate[200], borderRightWidth: 1, borderRightColor: colors.slate[200], paddingHorizontal: 8 }]}>
                      <AppText style={styles.financeLabel}>TẠM ỨNG</AppText>
                      <AppText style={styles.financeValue}>{money(doc.prepayAmount)}</AppText>
                    </View>
                    <View style={[styles.financialCol, { alignItems: 'flex-end' }]}>
                      <AppText style={styles.financeLabel}>THANH TOÁN</AppText>
                      <AppText style={[styles.financeValue, { color: hasPaid ? colors.accent : colors.warning }]}>
                        {doc.paymentStatus || 'Chưa thanh toán'}
                      </AppText>
                    </View>
                  </View>
                </Card>
              </Pressable>
            );
          })}
          
          {filteredDocs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <AppText style={styles.empty}>Chưa có hồ sơ nào phù hợp.</AppText>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* FAB - Add Button */}
      <Pressable onPress={() => openForm(null)} style={styles.fab}>
        <Plus size={24} color={colors.white} />
      </Pressable>

      {/* Add / Edit Modal */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>{editingItem ? 'Chỉnh sửa Hồ sơ' : 'Thêm Hồ sơ hợp đồng mới'}</AppText>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.slate[500]} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <AppText style={styles.inputLabel}>Tên hợp đồng / Hạng mục *</AppText>
              <TextInput value={formContractName} onChangeText={setFormContractName} placeholder="Nhập tên hạng mục hồ sơ..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Số hợp đồng</AppText>
                  <TextInput value={formContractNo} onChangeText={setFormContractNo} placeholder="Số HĐ..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Đối tác / Công ty</AppText>
                  <TextInput value={formCompany} onChangeText={setFormCompany} placeholder="Tên công ty đối tác..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
              </View>

              <AppText style={styles.inputLabel}>Chọn Dự án *</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.projChipRow} keyboardShouldPersistTaps="handled">
                {projects.map((proj) => (
                  <Pressable
                    key={proj.code}
                    onPress={() => setFormProjectCode(proj.code)}
                    style={[styles.projChip, formProjectCode === proj.code && styles.projChipActive]}
                  >
                    <AppText style={[styles.projChipText, formProjectCode === proj.code && styles.projChipTextActive]}>
                      {proj.code}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Giá trị HĐ (VNĐ)</AppText>
                  <TextInput value={formContractValue} onChangeText={v => setFormContractValue(v.replace(/[^0-9]/g, ''))} placeholder="Giá trị..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                </View>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Tạm ứng (VNĐ)</AppText>
                  <TextInput value={formPrepayAmount} onChangeText={v => setFormPrepayAmount(v.replace(/[^0-9]/g, ''))} placeholder="Tạm ứng..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Người nhận hồ sơ</AppText>
                  <TextInput value={formReceiverName} onChangeText={setFormReceiverName} placeholder="Họ tên người nhận..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Ngày gửi</AppText>
                  <TextInput value={formSendDate} onChangeText={setFormSendDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
              </View>

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Ngày nhận</AppText>
                  <TextInput value={formReceiveDate} onChangeText={setFormReceiveDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
                <View style={styles.colHalf}>
                  <AppText style={styles.inputLabel}>Trạng thái quyết toán</AppText>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', height: 42 }}>
                    <Pressable
                      onPress={() => setFormIsCompleted(!formIsCompleted)}
                      style={[styles.completedBtn, formIsCompleted && styles.completedBtnActive]}
                    >
                      <AppText style={[styles.completedBtnText, formIsCompleted && styles.completedBtnTextActive]}>
                        {formIsCompleted ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
                      </AppText>
                    </Pressable>
                  </View>
                </View>
              </View>

              <AppText style={styles.inputLabel}>Trạng thái Hồ sơ</AppText>
              <View style={styles.chipsRow}>
                {['Đang soạn thảo', 'Đang ký duyệt', 'Đã hoàn tất'].map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => {
                      setFormDocStatus(st);
                      if (st === 'Đã hoàn tất') setFormIsCompleted(true);
                    }}
                    style={[styles.formChip, formDocStatus === st && styles.formChipActive]}
                  >
                    <AppText style={[styles.formChipText, formDocStatus === st && styles.formChipTextActive]}>
                      {st}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <AppText style={styles.inputLabel}>Trạng thái Thanh toán</AppText>
              <View style={styles.chipsRow}>
                {['Chưa thanh toán', 'Tạm ứng', 'Đã thanh toán'].map((st) => (
                  <Pressable
                    key={st}
                    onPress={() => setFormPaymentStatus(st)}
                    style={[styles.formChip, formPaymentStatus === st && styles.formChipActive]}
                  >
                    <AppText style={[styles.formChipText, formPaymentStatus === st && styles.formChipTextActive]}>
                      {st}
                    </AppText>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={handleSave} style={styles.saveBtn}>
                <Save size={18} color={colors.white} />
                <AppText style={styles.saveBtnText}>{editingItem ? 'Cập nhật' : 'Thêm mới'}</AppText>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 80 },
  tabBarContainer: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, backgroundColor: colors.slate[100], padding: 4 },
  tabRow: { gap: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.white, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  tabTextActive: { color: colors.primary, fontWeight: '800' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 16, paddingBottom: 4 },
  searchBox: { marginHorizontal: 16, marginTop: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { padding: 14, gap: 10, backgroundColor: colors.white },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  copy: { flex: 1 },
  topRightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  code: { fontSize: 10, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 2, fontSize: 14.5, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  
  metaBox: { padding: 10, borderRadius: 10, backgroundColor: colors.slate[50], gap: 4, borderWidth: 1, borderColor: colors.slate[100] },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaLabel: { fontSize: 11, color: colors.slate[400], fontWeight: '800' },
  metaVal: { fontSize: 11, color: colors.slate[700], fontWeight: '700', flex: 0.85, textAlign: 'right' },
  
  financialRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 10, marginTop: 2 },
  financialCol: { flex: 1, justifyContent: 'center' },
  financeLabel: { fontSize: 9, color: colors.slate[400], fontWeight: '800', letterSpacing: 0.5 },
  financeValue: { fontSize: 12.5, color: colors.slate[800], fontWeight: '800', marginTop: 2 },
  
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.slate[100], paddingBottom: 12, marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.slate[900] },
  closeBtn: { padding: 4 },

  formScroll: { gap: 12 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: colors.slate[500], textTransform: 'uppercase', marginTop: 4 },
  formInput: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800], fontWeight: '600' },
  twoColRow: { flexDirection: 'row', gap: 10 },
  colHalf: { flex: 1 },

  projChipRow: { gap: 8, paddingVertical: 4 },
  projChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200] },
  projChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  projChipText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  projChipTextActive: { color: colors.white },

  completedBtn: { flex: 1, height: 42, borderRadius: 10, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  completedBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  completedBtnText: { fontSize: 13, fontWeight: '700', color: colors.slate[600] },
  completedBtnTextActive: { color: colors.white },

  chipsRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  formChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center' },
  formChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formChipText: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  formChipTextActive: { color: colors.white },

  saveBtn: { height: 46, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' }
});
