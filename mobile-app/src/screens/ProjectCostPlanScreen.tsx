import React, { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Coins, FileCheck, Landmark, Receipt, Wallet, Plus, X, Save, Edit, Trash2 } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';
import { api } from '../services/api';

const tabs = [
  { key: 'overview', label: 'Tổng quan' },
  { key: 'materials', label: 'Vật tư' },
  { key: 'purchasing', label: 'Mua hàng' },
  { key: 'expenses', label: 'Chi phí' },
  { key: 'labor', label: 'Nhân công' },
];

const money = (value?: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
};

export const ProjectCostPlanScreen = () => {
  const {
    projects,
    materialPlans,
    purchasingPlans,
    expenses,
    laborPayrolls,
    fetchAccounting,
  } = useRealtimeStore();

  const [projectCode, setProjectCode] = useState(projects[0]?.code || materialPlans[0]?.projectCode || '');
  const [activeTab, setActiveTab] = useState('overview');

  // Modal & Form States
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields - Material Plan
  const [mJobContent, setMJobContent] = useState('');
  const [mContractVolume, setMContractVolume] = useState('');
  const [mUnit, setMUnit] = useState('');
  const [mTechSpecModel, setMTechSpecModel] = useState('');
  const [mSupplier, setMSupplier] = useState('');
  const [mExpectedDate, setMExpectedDate] = useState('');
  const [mProgressStatus, setMProgressStatus] = useState('Chưa hoàn thành');
  const [mDocCo, setMDocCo] = useState(false);
  const [mDocCq, setMDocCq] = useState(false);
  const [mDocFire, setMDocFire] = useState(false);

  // Form Fields - Purchasing
  const [pContent, setPContent] = useState('');
  const [pVolContract, setPVolContract] = useState('');
  const [pVolOrder, setPVolOrder] = useState('');
  const [pUnit, setPUnit] = useState('');
  const [pSupplier, setPSupplier] = useState('');
  const [pTotalAmount, setPTotalAmount] = useState('');
  const [pExpectedDate, setPExpectedDate] = useState('');
  const [pOrderStatus, setPOrderStatus] = useState('Đang mua');
  const [pContractStatus, setPContractStatus] = useState('Chưa ký');

  // Form Fields - Expense
  const [eDate, setEDate] = useState('');
  const [eContent, setEContent] = useState('');
  const [eDescription, setEDescription] = useState('');
  const [eQuantity, setEQuantity] = useState('');
  const [eUnit, setEUnit] = useState('');
  const [eUnitPrice, setEUnitPrice] = useState('');
  const [eIncomeAmount, setEIncomeAmount] = useState('');

  // Form Fields - Labor
  const [lWorkerName, setLWorkerName] = useState('');
  const [lContent, setLContent] = useState('');
  const [lDate, setLDate] = useState('');
  const [lDescription, setLDescription] = useState('');
  const [lTotalAmount, setLTotalAmount] = useState('');
  const [lPaymentStatus, setLPaymentStatus] = useState('Chưa thanh toán');
  
  const codes = useMemo(() => {
    return Array.from(
      new Set([
        ...projects.map((p) => p.code),
        ...materialPlans.map((p) => p.projectCode),
        ...expenses.map((e) => e.projectCode)
      ].filter(Boolean))
    );
  }, [projects, materialPlans, expenses]);

  const selected = projectCode || codes[0] || '';
  
  const plans = materialPlans.filter((item) => item.projectCode === selected);
  const purchases = purchasingPlans.filter((item) => item.projectCode === selected);
  const exps = expenses.filter((item) => item.projectCode === selected);
  const labors = laborPayrolls.filter((item) => item.projectCode === selected);

  // Computed metrics for Overview
  const orderedCount = purchases.length;
  const totalCompleted = plans.filter(p => p.progressStatus === 'Đã hoàn thành').length;
  const progressPercent = plans.length > 0 ? Math.round((totalCompleted / plans.length) * 100) : 0;
  
  const missingCo = plans.filter(p => !p.docCo).length;
  const missingCq = plans.filter(p => !p.docCq).length;
  const missingInspection = plans.filter(p => !(p as any).docFireInspection).length;

  const totalPurchasing = purchases.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalExp = exps.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalLab = labors.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalSpent = totalExp + totalLab;
  const totalProjectCost = totalPurchasing + totalSpent;
  const fund = exps.reduce((sum, item) => sum + (item.incomeAmount || 0), 0);
  const balance = fund - totalSpent;

  // Open creation or editing modal
  const openForm = (tabType: string, item: any = null) => {
    setEditingId(item ? item.id : null);
    
    if (tabType === 'materials') {
      setMJobContent(item ? item.jobContent : '');
      setMContractVolume(item ? String(item.contractVolume || '') : '');
      setMUnit(item ? item.unit : 'Cái');
      setMTechSpecModel(item ? item.techSpecModel || '' : '');
      setMSupplier(item ? item.supplier || '' : '');
      setMExpectedDate(item ? item.expectedDate || '' : '');
      setMProgressStatus(item ? item.progressStatus || 'Chưa hoàn thành' : 'Chưa hoàn thành');
      setMDocCo(item ? !!item.docCo : false);
      setMDocCq(item ? !!item.docCq : false);
      setMDocFire(item ? !!(item as any).docFireInspection : false);
    } else if (tabType === 'purchasing') {
      setPContent(item ? item.content : '');
      setPVolContract(item ? String(item.volumeContract || '') : '');
      setPVolOrder(item ? String(item.volumeOrder || '') : '');
      setPUnit(item ? item.unit : 'Cái');
      setPSupplier(item ? item.supplier || '' : '');
      setPTotalAmount(item ? String(item.totalAmount || '') : '');
      setPExpectedDate(item ? item.expectedDate || '' : '');
      setPOrderStatus(item ? item.orderStatus || 'Đang mua' : 'Đang mua');
      setPContractStatus(item ? item.contractStatus || 'Chưa ký' : 'Chưa ký');
    } else if (tabType === 'expenses') {
      setEDate(item ? item.date : new Date().toISOString().split('T')[0]);
      setEContent(item ? item.content : '');
      setEDescription(item ? item.description || '' : '');
      setEQuantity(item ? String(item.quantity || '') : '');
      setEUnit(item ? item.unit || '' : 'Bộ');
      setEUnitPrice(item ? String(item.unitPrice || '') : '');
      setEIncomeAmount(item ? String(item.incomeAmount || '') : '');
    } else if (tabType === 'labor') {
      setLWorkerName(item ? item.workerName || '' : '');
      setLContent(item ? item.content : '');
      setLDate(item ? item.date : new Date().toISOString().split('T')[0]);
      setLDescription(item ? item.description || '' : '');
      setLTotalAmount(item ? String(item.totalAmount || '') : '');
      setLPaymentStatus(item ? item.paymentStatus || 'Chưa thanh toán' : 'Chưa thanh toán');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    try {
      if (activeTab === 'materials') {
        if (!mJobContent.trim() || !mContractVolume.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng điền nội dung công việc và khối lượng hợp đồng.');
          return;
        }
        const data = {
          projectCode: selected,
          jobContent: mJobContent.trim(),
          contractVolume: Number(mContractVolume) || 0,
          unit: mUnit.trim(),
          techSpecModel: mTechSpecModel.trim() || undefined,
          supplier: mSupplier.trim() || undefined,
          expectedDate: mExpectedDate.trim() || undefined,
          progressStatus: mProgressStatus,
          docCo: mDocCo,
          docCq: mDocCq,
          docFireInspection: mDocFire,
        };
        if (editingId) {
          await api.accounting.updateMaterialPlan(editingId, data);
          Alert.alert('Thành công', 'Đã cập nhật hạng mục vật tư kế hoạch.');
        } else {
          await api.accounting.createMaterialPlan(data);
          Alert.alert('Thành công', 'Đã thêm hạng mục vật tư mới.');
        }
      } else if (activeTab === 'purchasing') {
        if (!pContent.trim() || !pTotalAmount.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng điền nội dung và tổng tiền đơn hàng.');
          return;
        }
        const data = {
          projectCode: selected,
          content: pContent.trim(),
          volumeContract: Number(pVolContract) || undefined,
          volumeOrder: Number(pVolOrder) || undefined,
          unit: pUnit.trim(),
          supplier: pSupplier.trim() || undefined,
          totalAmount: Number(pTotalAmount) || 0,
          expectedDate: pExpectedDate.trim() || undefined,
          orderStatus: pOrderStatus,
          contractStatus: pContractStatus,
        };
        if (editingId) {
          await api.accounting.updatePurchasing(editingId, data);
          Alert.alert('Thành công', 'Đã cập nhật đơn mua sắm.');
        } else {
          await api.accounting.createPurchasing(data);
          Alert.alert('Thành công', 'Đã tạo đơn mua sắm mới.');
        }
      } else if (activeTab === 'expenses') {
        if (!eContent.trim() || (!eUnitPrice.trim() && !eIncomeAmount.trim())) {
          Alert.alert('Thiếu thông tin', 'Vui lòng điền nội dung chi phí.');
          return;
        }
        const qty = Number(eQuantity) || 1;
        const price = Number(eUnitPrice) || 0;
        const data = {
          projectCode: selected,
          date: eDate.trim(),
          content: eContent.trim(),
          description: eDescription.trim() || undefined,
          quantity: qty,
          unit: eUnit.trim(),
          unitPrice: price,
          totalAmount: qty * price,
          incomeAmount: Number(eIncomeAmount) || undefined,
        };
        if (editingId) {
          await api.accounting.updateExpense(editingId, data);
          Alert.alert('Thành công', 'Đã cập nhật phiếu chi phí.');
        } else {
          await api.accounting.createExpense(data);
          Alert.alert('Thành công', 'Đã thêm phiếu chi phí mới.');
        }
      } else if (activeTab === 'labor') {
        if (!lContent.trim() || !lTotalAmount.trim()) {
          Alert.alert('Thiếu thông tin', 'Vui lòng điền nội dung và tổng tiền lương.');
          return;
        }
        const data = {
          projectCode: selected,
          workerName: lWorkerName.trim() || undefined,
          content: lContent.trim(),
          date: lDate.trim(),
          description: lDescription.trim() || undefined,
          totalAmount: Number(lTotalAmount) || 0,
          paymentStatus: lPaymentStatus,
        };
        if (editingId) {
          await api.accounting.updatePayroll(editingId, data);
          Alert.alert('Thành công', 'Đã cập nhật lương công nhật.');
        } else {
          await api.accounting.createPayroll(data);
          Alert.alert('Thành công', 'Đã thêm lương công nhật mới.');
        }
      }
      await fetchAccounting();
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu kế hoạch.');
    }
    setModalVisible(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Xoá bản ghi', 'Bạn có chắc chắn muốn xoá bản ghi này?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            if (activeTab === 'materials') await api.accounting.deleteMaterialPlan(id);
            else if (activeTab === 'purchasing') await api.accounting.deletePurchasing(id);
            else if (activeTab === 'expenses') await api.accounting.deleteExpense(id);
            else if (activeTab === 'labor') await api.accounting.deletePayroll(id);
            await fetchAccounting();
            setModalVisible(false);
            Alert.alert('Đã xoá', 'Đã xoá bản ghi thành công.');
          } catch (e) {
            console.error(e);
            Alert.alert('Lỗi', 'Không thể xoá bản ghi.');
          }
        }
      }
    ]);
  };

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<Coins size={21} color={colors.primary} />}
        title="Kế hoạch chi phí"
        subtitle="Quản lý chi phí vật tư, mua sắm và nhân công hiện trường"
        badge={selected || 'Tất cả'}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* Project Selector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} keyboardShouldPersistTaps="handled">
          {codes.map((code) => (
            <Pressable
              key={code}
              onPress={() => setProjectCode(code)}
              style={[styles.chip, selected === code ? styles.chipActive : undefined]}
            >
              <AppText style={[styles.chipText, selected === code ? styles.chipTextActive : undefined]}>{code}</AppText>
            </Pressable>
          ))}
        </ScrollView>
        
        {/* Navigation Tabs */}
        <View style={styles.tabBarContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key ? styles.tabActive : undefined]}
              >
                <AppText style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : undefined]}>
                  {tab.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        
        <SectionTitle
          title={tabs.find((tab) => tab.key === activeTab)?.label?.toUpperCase() || ''}
          caption={`Dự án ${selected}`}
          action={activeTab !== 'overview' ? (
            <Pressable onPress={() => openForm(activeTab)} style={styles.addBtnHeader}>
              <Plus size={14} color={colors.white} />
              <AppText style={styles.addBtnHeaderText}>Thêm mới</AppText>
            </Pressable>
          ) : null}
        />
        
        <View style={styles.list}>
          {activeTab === 'overview' && (
            <View style={styles.overviewGrid}>
              {/* Financial Summary Bento Boxes */}
              <View style={styles.bentoRow}>
                <Card style={[styles.bentoBox, { borderLeftColor: colors.primary, borderLeftWidth: 4 }]}>
                  <View style={styles.bentoHeader}>
                    <Landmark size={15} color={colors.primary} />
                    <AppText style={styles.bentoTitle}>Quỹ Công Trình</AppText>
                  </View>
                  <AppText style={[styles.bentoVal, { color: colors.primary }]}>{money(fund)}</AppText>
                </Card>

                <Card style={[styles.bentoBox, { borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
                  <View style={styles.bentoHeader}>
                    <Receipt size={15} color={colors.danger} />
                    <AppText style={styles.bentoTitle}>Đã Chi Tiêu</AppText>
                  </View>
                  <AppText style={[styles.bentoVal, { color: colors.danger }]}>{money(totalSpent)}</AppText>
                </Card>
              </View>

              <View style={styles.bentoRow}>
                <Card style={[styles.bentoBox, { borderLeftColor: colors.accent, borderLeftWidth: 4 }]}>
                  <View style={styles.bentoHeader}>
                    <Wallet size={15} color={colors.accent} />
                    <AppText style={styles.bentoTitle}>Tồn Dư Cuối Kỳ</AppText>
                  </View>
                  <AppText style={[styles.bentoVal, { color: colors.accent }]}>{money(balance)}</AppText>
                </Card>

                <Card style={[styles.bentoBox, { borderLeftColor: '#a855f7', borderLeftWidth: 4 }]}>
                  <View style={styles.bentoHeader}>
                    <Coins size={15} color="#a855f7" />
                    <AppText style={styles.bentoTitle}>Mua Sắm Thiết Bị</AppText>
                  </View>
                  <AppText style={[styles.bentoVal, { color: '#a855f7' }]}>{money(totalPurchasing)}</AppText>
                </Card>
              </View>

              {/* Progress & Document Status Card */}
              <Card style={styles.detailedOverviewCard}>
                <AppText style={styles.cardHeaderTitle}>TIẾN ĐỘ & CHỨNG TỪ VẬT TƯ</AppText>
                
                <View style={styles.statDetailRow}>
                  <AppText style={styles.statDetailLabel}>Tổng đơn hàng đã đặt</AppText>
                  <AppText style={styles.statDetailVal}>{orderedCount}</AppText>
                </View>
                
                <View style={styles.statDetailRow}>
                  <AppText style={styles.statDetailLabel}>Tiến độ cấp phát vật tư</AppText>
                  <AppText style={styles.statDetailVal}>{progressPercent}%</AppText>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>

                <AppText style={[styles.cardHeaderTitle, { marginTop: 16 }]}>CHỨNG TỪ THIẾU</AppText>
                
                <View style={styles.docsGrid}>
                  <View style={styles.docBox}>
                    <AppText style={styles.docBoxVal}>{missingCo}</AppText>
                    <AppText style={styles.docBoxLabel}>Thiếu CO</AppText>
                  </View>
                  <View style={styles.docBox}>
                    <AppText style={styles.docBoxVal}>{missingCq}</AppText>
                    <AppText style={styles.docBoxLabel}>Thiếu CQ</AppText>
                  </View>
                  <View style={styles.docBox}>
                    <AppText style={styles.docBoxVal}>{missingInspection}</AppText>
                    <AppText style={styles.docBoxLabel}>Kiểm định</AppText>
                  </View>
                </View>
              </Card>

              {/* Total Project Cost Accumulator */}
              <Card style={styles.costAccumulatorCard}>
                <AppText style={styles.accumulatorTitle}>TỔNG CHI PHÍ DỰ ÁN TÍCH LŨY</AppText>
                <AppText style={styles.accumulatorValue}>{money(totalProjectCost)}</AppText>
                <AppText style={styles.accumulatorCaption}>Gồm chi phí mua sắm thiết bị và chi phí thi công hiện trường</AppText>
              </Card>
            </View>
          )}

          {activeTab === 'materials' && plans.map((item) => (
            <Pressable key={item.id} onPress={() => openForm('materials', item)}>
              <Card style={styles.itemCard}>
                <View style={styles.cardTopRow}>
                  <AppText style={styles.cardTitle} numberOfLines={2}>{item.jobContent}</AppText>
                  <StatusBadge
                    label={item.progressStatus || 'Đang theo dõi'}
                    tone={item.progressStatus === 'Đã hoàn thành' ? 'green' : 'blue'}
                  />
                </View>
                <View style={styles.statsSplitRow}>
                  <AppText style={styles.metaLabel}>Khối lượng HĐ: <AppText style={styles.metaVal}>{item.contractVolume || 0} {item.unit}</AppText></AppText>
                  <AppText style={styles.metaLabel}>Quy cách: <AppText style={styles.metaVal}>{item.techSpecModel || '-'}</AppText></AppText>
                </View>
                <View style={styles.docsIndicatorRow}>
                  <View style={styles.docCheck}>
                    <FileCheck size={13} color={item.docCo ? colors.accent : colors.slate[400]} />
                    <AppText style={[styles.docCheckText, { color: item.docCo ? colors.slate[800] : colors.slate[400] }]}>CO: {item.docCo ? 'Có' : 'Thiếu'}</AppText>
                  </View>
                  <View style={styles.docCheck}>
                    <FileCheck size={13} color={item.docCq ? colors.accent : colors.slate[400]} />
                    <AppText style={[styles.docCheckText, { color: item.docCq ? colors.slate[800] : colors.slate[400] }]}>CQ: {item.docCq ? 'Có' : 'Thiếu'}</AppText>
                  </View>
                  <AppText style={styles.expectedDate}>Hẹn: {item.expectedDate || '-'}</AppText>
                </View>
              </Card>
            </Pressable>
          ))}

          {activeTab === 'purchasing' && purchases.map((item) => (
            <Pressable key={item.id} onPress={() => openForm('purchasing', item)}>
              <Card style={styles.itemCard}>
                <View style={styles.cardTopRow}>
                  <AppText style={styles.cardTitle} numberOfLines={2}>{item.content}</AppText>
                  <StatusBadge
                    label={item.orderStatus || 'Đang mua'}
                    tone={item.orderStatus === 'Đã giao' || item.orderStatus === 'Đã thanh toán' ? 'green' : 'blue'}
                  />
                </View>
                <AppText style={styles.metaText}>Đơn giá đặt: {item.volumeOrder || 0}/{item.volumeContract || 0} {item.unit}</AppText>
                <View style={styles.costRow}>
                  <AppText style={styles.amountText}>{money(item.totalAmount)}</AppText>
                  <AppText style={styles.paymentDate}>HĐ: {item.contractStatus || 'Chưa ký'}</AppText>
                </View>
              </Card>
            </Pressable>
          ))}

          {activeTab === 'expenses' && exps.map((item) => (
            <Pressable key={item.id} onPress={() => openForm('expenses', item)}>
              <Card style={styles.itemCard}>
                <View style={styles.cardTopRow}>
                  <AppText style={styles.cardTitle} numberOfLines={2}>{item.content}</AppText>
                  <AppText style={styles.amountText}>{money(item.totalAmount)}</AppText>
                </View>
                <AppText style={styles.metaText}>{item.date} — {item.description || 'Chi phí công trình'}</AppText>
                <View style={styles.statsSplitRow}>
                  <AppText style={styles.smallMetaText}>Số lượng: {item.quantity || 0} {item.unit} x {money(item.unitPrice)}</AppText>
                  {item.incomeAmount ? <AppText style={[styles.smallMetaText, { color: colors.accent }]}>Thu quỹ: +{money(item.incomeAmount)}</AppText> : null}
                </View>
              </Card>
            </Pressable>
          ))}

          {activeTab === 'labor' && labors.map((item) => (
            <Pressable key={item.id} onPress={() => openForm('labor', item)}>
              <Card style={styles.itemCard}>
                <View style={styles.cardTopRow}>
                  <AppText style={styles.cardTitle} numberOfLines={2}>{item.workerName || item.content}</AppText>
                  <StatusBadge
                    label={item.paymentStatus || 'Chưa thanh toán'}
                    tone={item.paymentStatus?.toLowerCase().includes('đã') ? 'green' : 'amber'}
                  />
                </View>
                <AppText style={styles.metaText}>{item.date} — {item.description || 'Nhân công'}</AppText>
                <View style={styles.costRow}>
                  <AppText style={styles.amountText}>{money(item.totalAmount)}</AppText>
                </View>
              </Card>
            </Pressable>
          ))}

          {((activeTab === 'materials' && plans.length === 0) ||
            (activeTab === 'purchasing' && purchases.length === 0) ||
            (activeTab === 'expenses' && exps.length === 0) ||
            (activeTab === 'labor' && labors.length === 0)) ? (
            <Card style={styles.emptyCard}>
              <AppText style={styles.empty}>Chưa có dữ liệu kế hoạch cho dự án này.</AppText>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* Dynamic Add/Edit Modal based on Active Tab */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <AppText style={styles.modalTitle}>
                {editingId ? 'Chỉnh sửa' : 'Thêm mới'} {tabs.find(t => t.key === activeTab)?.label}
              </AppText>
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.slate[500]} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              
              {/* MATERIAL PLAN FORM */}
              {activeTab === 'materials' && (
                <View style={styles.formSubContainer}>
                  <AppText style={styles.inputLabel}>Nội dung công việc *</AppText>
                  <TextInput value={mJobContent} onChangeText={setMJobContent} placeholder="Nội dung hạng mục công việc..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Khối lượng HĐ *</AppText>
                      <TextInput value={mContractVolume} onChangeText={v => setMContractVolume(v.replace(/[^0-9.]/g, ''))} placeholder="Khối lượng..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Đơn vị tính</AppText>
                      <TextInput value={mUnit} onChangeText={setMUnit} placeholder="Cái, Bộ, Kg..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Quy cách / Thông số</AppText>
                      <TextInput value={mTechSpecModel} onChangeText={setMTechSpecModel} placeholder="Thông số thiết bị..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Nhà cung cấp</AppText>
                      <TextInput value={mSupplier} onChangeText={setMSupplier} placeholder="Tên NCC..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                  </View>

                  <AppText style={styles.inputLabel}>Ngày dự kiến cấp</AppText>
                  <TextInput value={mExpectedDate} onChangeText={setMExpectedDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <AppText style={styles.inputLabel}>Trạng thái tiến độ</AppText>
                  <View style={styles.chipsRow}>
                    {['Chưa hoàn thành', 'Đang tiến hành', 'Đã hoàn thành'].map(st => (
                      <Pressable key={st} onPress={() => setMProgressStatus(st)} style={[styles.formChip, mProgressStatus === st && styles.formChipActive]}>
                        <AppText style={[styles.formChipText, mProgressStatus === st && styles.formChipTextActive]}>{st}</AppText>
                      </Pressable>
                    ))}
                  </View>

                  <AppText style={styles.inputLabel}>Chứng từ hiện có</AppText>
                  <View style={styles.docsToggleRow}>
                    <Pressable onPress={() => setMDocCo(!mDocCo)} style={[styles.toggleBtn, mDocCo && styles.toggleBtnActive]}>
                      <AppText style={[styles.toggleBtnText, mDocCo && styles.toggleBtnTextActive]}>Chứng chỉ CO</AppText>
                    </Pressable>
                    <Pressable onPress={() => setMDocCq(!mDocCq)} style={[styles.toggleBtn, mDocCq && styles.toggleBtnActive]}>
                      <AppText style={[styles.toggleBtnText, mDocCq && styles.toggleBtnTextActive]}>Chứng chỉ CQ</AppText>
                    </Pressable>
                    <Pressable onPress={() => setMDocFire(!mDocFire)} style={[styles.toggleBtn, mDocFire && styles.toggleBtnActive]}>
                      <AppText style={[styles.toggleBtnText, mDocFire && styles.toggleBtnTextActive]}>Kiểm định PCCC</AppText>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* PURCHASING FORM */}
              {activeTab === 'purchasing' && (
                <View style={styles.formSubContainer}>
                  <AppText style={styles.inputLabel}>Nội dung mua sắm *</AppText>
                  <TextInput value={pContent} onChangeText={setPContent} placeholder="Mua thiết bị gì..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>KL Hợp đồng</AppText>
                      <TextInput value={pVolContract} onChangeText={v => setPVolContract(v.replace(/[^0-9.]/g, ''))} placeholder="KL HĐ..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>KL Thực đặt</AppText>
                      <TextInput value={pVolOrder} onChangeText={v => setPVolOrder(v.replace(/[^0-9.]/g, ''))} placeholder="Thực đặt..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Đơn vị tính</AppText>
                      <TextInput value={pUnit} onChangeText={setPUnit} placeholder="Bộ, Cái..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Tổng số tiền (VNĐ) *</AppText>
                      <TextInput value={pTotalAmount} onChangeText={v => setPTotalAmount(v.replace(/[^0-9]/g, ''))} placeholder="Tổng tiền đặt hàng..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Nhà cung cấp</AppText>
                      <TextInput value={pSupplier} onChangeText={setPSupplier} placeholder=" NCC..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Ngày hẹn giao</AppText>
                      <TextInput value={pExpectedDate} onChangeText={setPExpectedDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                  </View>

                  <AppText style={styles.inputLabel}>Trạng thái đặt hàng</AppText>
                  <View style={styles.chipsRow}>
                    {['Đang mua', 'Đã giao', 'Đã thanh toán'].map(st => (
                      <Pressable key={st} onPress={() => setPOrderStatus(st)} style={[styles.formChip, pOrderStatus === st && styles.formChipActive]}>
                        <AppText style={[styles.formChipText, pOrderStatus === st && styles.formChipTextActive]}>{st}</AppText>
                      </Pressable>
                    ))}
                  </View>

                  <AppText style={styles.inputLabel}>Trạng thái hợp đồng</AppText>
                  <View style={styles.chipsRow}>
                    {['Chưa ký', 'Đang soạn thảo', 'Đã ký'].map(st => (
                      <Pressable key={st} onPress={() => setPContractStatus(st)} style={[styles.formChip, pContractStatus === st && styles.formChipActive]}>
                        <AppText style={[styles.formChipText, pContractStatus === st && styles.formChipTextActive]}>{st}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* EXPENSES FORM */}
              {activeTab === 'expenses' && (
                <View style={styles.formSubContainer}>
                  <AppText style={styles.inputLabel}>Nội dung chi tiêu *</AppText>
                  <TextInput value={eContent} onChangeText={setEContent} placeholder="Nội dung hóa đơn chi phí..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <AppText style={styles.inputLabel}>Ngày chi</AppText>
                  <TextInput value={eDate} onChangeText={setEDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Số lượng</AppText>
                      <TextInput value={eQuantity} onChangeText={v => setEQuantity(v.replace(/[^0-9.]/g, ''))} placeholder="Số lượng..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Đơn vị tính</AppText>
                      <TextInput value={eUnit} onChangeText={setEUnit} placeholder="Chuyến, Bộ, Ca..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                  </View>

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Đơn giá (VNĐ)</AppText>
                      <TextInput value={eUnitPrice} onChangeText={v => setEUnitPrice(v.replace(/[^0-9]/g, ''))} placeholder="Đơn giá chi..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Thu Quỹ công trình (VNĐ)</AppText>
                      <TextInput value={eIncomeAmount} onChangeText={v => setEIncomeAmount(v.replace(/[^0-9]/g, ''))} placeholder="Bổ sung quỹ nếu có..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                  </View>

                  <AppText style={styles.inputLabel}>Mô tả chi tiết</AppText>
                  <TextInput value={eDescription} onChangeText={setEDescription} placeholder="Diễn giải chi tiết chứng từ..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                </View>
              )}

              {/* LABOR FORM */}
              {activeTab === 'labor' && (
                <View style={styles.formSubContainer}>
                  <AppText style={styles.inputLabel}>Tên công nhân / Tổ đội</AppText>
                  <TextInput value={lWorkerName} onChangeText={setLWorkerName} placeholder="Họ và tên..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <AppText style={styles.inputLabel}>Nội dung công nhật *</AppText>
                  <TextInput value={lContent} onChangeText={setLContent} placeholder="Nội dung công việc nhân công thực hiện..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Ngày làm</AppText>
                      <TextInput value={lDate} onChangeText={setLDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.slate[400]} style={styles.formInput} />
                    </View>
                    <View style={styles.colHalf}>
                      <AppText style={styles.inputLabel}>Tổng tiền lương (VNĐ) *</AppText>
                      <TextInput value={lTotalAmount} onChangeText={v => setLTotalAmount(v.replace(/[^0-9]/g, ''))} placeholder="Số tiền..." placeholderTextColor={colors.slate[400]} keyboardType="numeric" style={styles.formInput} />
                    </View>
                  </View>

                  <AppText style={styles.inputLabel}>Mô tả / Ghi chú</AppText>
                  <TextInput value={lDescription} onChangeText={setLDescription} placeholder="Chi tiết ngày công..." placeholderTextColor={colors.slate[400]} style={styles.formInput} />

                  <AppText style={styles.inputLabel}>Trạng thái thanh toán</AppText>
                  <View style={styles.chipsRow}>
                    {['Chưa thanh toán', 'Đã ứng', 'Đã thanh toán'].map(st => (
                      <Pressable key={st} onPress={() => setLPaymentStatus(st)} style={[styles.formChip, lPaymentStatus === st && styles.formChipActive]}>
                        <AppText style={[styles.formChipText, lPaymentStatus === st && styles.formChipTextActive]}>{st}</AppText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.modalActionsRow}>
                {editingId && (
                  <Pressable onPress={() => handleDelete(editingId)} style={styles.deleteBtn}>
                    <Trash2 size={16} color={colors.white} />
                    <AppText style={styles.deleteBtnText}>Xoá</AppText>
                  </Pressable>
                )}
                <Pressable onPress={handleSave} style={[styles.saveBtn, { flex: 1 }]}>
                  <Save size={18} color={colors.white} />
                  <AppText style={styles.saveBtnText}>{editingId ? 'Cập nhật' : 'Thêm mới'}</AppText>
                </Pressable>
              </View>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  chipTextActive: { color: colors.white },
  
  tabBarContainer: { marginHorizontal: 16, borderRadius: 12, backgroundColor: colors.slate[100], padding: 4 },
  tabRow: { gap: 4 },
  tab: { paddingHorizontal: 16, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.white, shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 12, fontWeight: '700', color: colors.slate[500] },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  
  list: { paddingHorizontal: 16, gap: 10 },
  overviewGrid: { gap: 10 },
  bentoRow: { flexDirection: 'row', gap: 10 },
  bentoBox: { flex: 1, padding: 12, backgroundColor: colors.white, gap: 8 },
  bentoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bentoTitle: { fontSize: 10, fontWeight: '800', color: colors.slate[400], textTransform: 'uppercase' },
  bentoVal: { fontSize: 16, fontWeight: '800' },
  
  detailedOverviewCard: { padding: 14, backgroundColor: colors.white },
  cardHeaderTitle: { fontSize: 11, fontWeight: '800', color: colors.slate[400], letterSpacing: 0.5, marginBottom: 10 },
  statDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  statDetailLabel: { fontSize: 12, fontWeight: '600', color: colors.slate[600] },
  statDetailVal: { fontSize: 13, fontWeight: '800', color: colors.slate[800] },
  
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.slate[100], overflow: 'hidden', marginVertical: 8 },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  
  docsGrid: { flexDirection: 'row', gap: 8, marginTop: 4 },
  docBox: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: colors.slate[50], alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.slate[100] },
  docBoxVal: { fontSize: 14, fontWeight: '800', color: colors.danger },
  docBoxLabel: { fontSize: 10, color: colors.slate[500], fontWeight: '700', marginTop: 2 },
  
  costAccumulatorCard: { padding: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderTopColor: '#f59e0b', borderTopWidth: 3 },
  accumulatorTitle: { fontSize: 10, fontWeight: '800', color: colors.slate[400], letterSpacing: 0.5 },
  accumulatorValue: { fontSize: 22, fontWeight: '800', color: '#d97706', marginVertical: 6 },
  accumulatorCaption: { fontSize: 10, color: colors.slate[500], textAlign: 'center', fontWeight: '500' },
  
  itemCard: { padding: 14, gap: 8, backgroundColor: colors.white },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '800', color: colors.slate[900] },
  statsSplitRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 8, marginTop: 2 },
  metaLabel: { fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  metaVal: { fontWeight: '700', color: colors.slate[800] },
  
  docsIndicatorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  docCheck: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docCheckText: { fontSize: 11, fontWeight: '700' },
  expectedDate: { flex: 1, textAlign: 'right', fontSize: 10, color: colors.slate[400], fontWeight: '700' },
  
  metaText: { fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  smallMetaText: { fontSize: 11, color: colors.slate[400], fontWeight: '500' },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 8, marginTop: 2 },
  amountText: { fontSize: 14, fontWeight: '800', color: colors.accent },
  paymentDate: { fontSize: 11, color: colors.slate[500], fontWeight: '700' },
  
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },

  addBtnHeader: { paddingHorizontal: 12, height: 32, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addBtnHeaderText: { color: colors.white, fontSize: 11, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.slate[100], paddingBottom: 12, marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.slate[900] },
  closeBtn: { padding: 4 },

  formScroll: { gap: 12 },
  formSubContainer: { gap: 12 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: colors.slate[500], textTransform: 'uppercase', marginTop: 4 },
  formInput: { height: 42, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800], fontWeight: '600' },
  twoColRow: { flexDirection: 'row', gap: 10 },
  colHalf: { flex: 1 },

  chipsRow: { flexDirection: 'row', gap: 6, paddingVertical: 2 },
  formChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center' },
  formChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  formChipText: { fontSize: 11, fontWeight: '700', color: colors.slate[600], textAlign: 'center' },
  formChipTextActive: { color: colors.white },

  docsToggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  toggleBtn: { paddingHorizontal: 12, height: 34, borderRadius: 8, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  toggleBtnActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  toggleBtnText: { fontSize: 11, fontWeight: '700', color: colors.slate[600] },
  toggleBtnTextActive: { color: colors.white },

  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  deleteBtn: { paddingHorizontal: 18, height: 46, borderRadius: 12, backgroundColor: colors.danger, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  saveBtn: { height: 46, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: colors.white, fontSize: 14, fontWeight: '800' }
});
