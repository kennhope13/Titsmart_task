import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Coins, LayoutDashboard } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

const tabs = [
  { key: 'overview', label: 'Tong quan' },
  { key: 'materials', label: 'Vat tu' },
  { key: 'purchasing', label: 'Mua hang' },
  { key: 'expenses', label: 'Chi phi' },
  { key: 'labor', label: 'Nhan cong' },
];

const money = (value?: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);

export const ProjectCostPlanScreen = () => {
  const { projects, materialPlans, purchasingPlans, expenses, laborPayrolls } = useRealtimeStore();
  const [projectCode, setProjectCode] = useState(projects[0]?.code || materialPlans[0]?.projectCode || '');
  const [activeTab, setActiveTab] = useState('overview');
  
  const codes = useMemo(() => Array.from(new Set([...projects.map((p) => p.code), ...materialPlans.map((p) => p.projectCode), ...expenses.map((e) => e.projectCode)].filter(Boolean))), [projects, materialPlans, expenses]);
  const selected = projectCode || codes[0] || '';
  
  const plans = materialPlans.filter((item) => item.projectCode === selected);
  const purchases = purchasingPlans.filter((item) => item.projectCode === selected);
  const exps = expenses.filter((item) => item.projectCode === selected);
  const labors = laborPayrolls.filter((item) => item.projectCode === selected);

  // Computed metrics for Overview
  const orderedCount = purchases.length;
  const totalCompleted = plans.filter(p => p.progressStatus === 'Đã hoàn thành').length;
  const progressPercent = plans.length > 0 ? ((totalCompleted / plans.length) * 100).toFixed(2).replace('.', ',') : '0,00';
  
  const totalExtraTasks = exps.length + labors.length;
  
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

  return (
    <Screen>
      <ScreenHeader icon={<Coins size={21} color={colors.primary} />} title="Ke hoach chi phi" subtitle="Vat tu, mua hang, chi phi va nhan cong" badge={selected || 'Tat ca'} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {codes.map((code) => (
            <Pressable key={code} onPress={() => setProjectCode(code)} style={[styles.chip, selected === code ? styles.chipActive : undefined]}>
              <AppText style={[styles.chipText, selected === code ? styles.chipTextActive : undefined]}>{code}</AppText>
            </Pressable>
          ))}
        </ScrollView>
        
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {tabs.map((tab) => (
              <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key ? styles.tabActive : undefined]}>
                <AppText style={[styles.tabText, activeTab === tab.key ? styles.tabTextActive : undefined]}>{tab.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        
        <SectionTitle title={tabs.find((tab) => tab.key === activeTab)?.label?.toUpperCase() || ''} caption="Du lieu dong bo tu web" />
        
        <View style={styles.list}>
          {activeTab === 'overview' && (
            <View style={{ gap: 16 }}>
              {/* Cot 1 */}
              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#9fc5e8' }]}><AppText style={styles.boxTitle}>TONG DON DA DAT</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{orderedCount}</AppText></View>
              </View>

              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#9fc5e8' }]}><AppText style={styles.boxTitle}>TIEN DO KH-VT CHUNG</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{progressPercent}%</AppText></View>
              </View>

              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#9fc5e8' }]}><AppText style={styles.boxTitle}>CHUNG TU CON THIEU</AppText></View>
                <View style={[styles.boxBody, { padding: 0, flexDirection: 'row' }]}>
                  <View style={styles.subCol}>
                    <AppText style={styles.subColTitle}>CO</AppText>
                    <AppText style={styles.subColValue}>{missingCo}</AppText>
                  </View>
                  <View style={[styles.subCol, { borderLeftWidth: 1, borderRightWidth: 1 }]}>
                    <AppText style={styles.subColTitle}>CQ</AppText>
                    <AppText style={styles.subColValue}>{missingCq}</AppText>
                  </View>
                  <View style={styles.subCol}>
                    <AppText style={styles.subColTitle}>KIEM DINH</AppText>
                    <AppText style={styles.subColValue}>{missingInspection}</AppText>
                  </View>
                </View>
              </View>

              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#9fc5e8' }]}><AppText style={styles.boxTitle}>TONG CONG VIEC PHAT SINH</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{totalExtraTasks}</AppText></View>
              </View>

              {/* Cot 2 */}
              <View style={[styles.box, { marginTop: 8 }]}>
                <View style={[styles.boxHeader, { backgroundColor: '#b4a7d6' }]}><AppText style={styles.boxTitle}>A: TONG CHI PHI MUA SAM</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{money(totalPurchasing)}</AppText></View>
              </View>

              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#93c47d' }]}><AppText style={styles.boxTitle}>B: TONG CHI PHI CONG TRINH</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{money(totalSpent)}</AppText></View>
              </View>

              <View style={[styles.box, { marginTop: 16 }]}>
                <View style={[styles.boxHeader, { backgroundColor: '#f1c232' }]}><AppText style={styles.boxTitle}>TONG CHI PHI DU AN (A+B)</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{money(totalProjectCost)}</AppText></View>
              </View>

              {/* Cot 3 */}
              <View style={[styles.box, { marginTop: 8 }]}>
                <View style={[styles.boxHeader, { backgroundColor: '#93c47d' }]}><AppText style={styles.boxTitle}>QUY CONG TRINH</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{money(fund)}</AppText></View>
              </View>

              <View style={styles.box}>
                <View style={[styles.boxHeader, { backgroundColor: '#93c47d' }]}><AppText style={styles.boxTitle}>TON CUOI KY</AppText></View>
                <View style={styles.boxBody}><AppText style={styles.boxValue}>{money(balance)}</AppText></View>
              </View>
            </View>
          )}

          {activeTab === 'materials' && plans.map((item) => <Card key={item.id} style={styles.card}><View style={styles.cardTop}><AppText style={styles.title} numberOfLines={2}>{item.jobContent}</AppText><StatusBadge label={item.progressStatus || item.orderedStatus || 'Dang theo doi'} tone={item.issueStatus ? 'amber' : 'blue'} /></View><AppText style={styles.meta}>{item.contractVolume || 0} {item.unit} | Dat: {item.orderedVolume || 0}</AppText><AppText style={styles.meta}>CO: {item.docCo ? 'Co' : 'Thieu'} | CQ: {item.docCq ? 'Co' : 'Thieu'} | Hen: {item.expectedDate || '-'}</AppText></Card>)}
          {activeTab === 'purchasing' && purchases.map((item) => <Card key={item.id} style={styles.card}><View style={styles.cardTop}><AppText style={styles.title} numberOfLines={2}>{item.content}</AppText><StatusBadge label={item.orderStatus || 'Dang mua'} tone="blue" /></View><AppText style={styles.meta}>{item.volumeOrder || 0}/{item.volumeContract || 0} {item.unit} | {money(item.totalAmount)} VND</AppText><AppText style={styles.meta}>Hop dong: {item.contractStatus || '-'} | Thanh toan: {item.paymentDate || '-'}</AppText></Card>)}
          {activeTab === 'expenses' && exps.map((item) => <Card key={item.id} style={styles.card}><View style={styles.cardTop}><AppText style={styles.title} numberOfLines={2}>{item.content}</AppText><StatusBadge label={money(item.totalAmount)} tone="green" /></View><AppText style={styles.meta}>{item.date || '-'} | {item.description || '-'}</AppText><AppText style={styles.meta}>{item.quantity || 0} {item.unit} x {money(item.unitPrice)}</AppText></Card>)}
          {activeTab === 'labor' && labors.map((item) => <Card key={item.id} style={styles.card}><View style={styles.cardTop}><AppText style={styles.title} numberOfLines={2}>{item.workerName || item.content}</AppText><StatusBadge label={item.paymentStatus || 'Chua thanh toan'} tone={item.paymentStatus?.toLowerCase().includes('da') ? 'green' : 'amber'} /></View><AppText style={styles.meta}>{item.date || '-'} | {item.description || '-'}</AppText><AppText style={styles.meta}>Tong: {money(item.totalAmount)} VND</AppText></Card>)}
          {((activeTab === 'materials' && plans.length === 0) || (activeTab === 'purchasing' && purchases.length === 0) || (activeTab === 'expenses' && exps.length === 0) || (activeTab === 'labor' && labors.length === 0)) ? <Card><AppText style={styles.empty}>Chua co du lieu cho muc nay.</AppText></Card> : null}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: '800', color: colors.slate[600] },
  chipTextActive: { color: colors.white },
  tabBar: { marginHorizontal: 16, borderRadius: 11, backgroundColor: colors.slate[100], padding: 4 },
  tab: { paddingHorizontal: 16, minHeight: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[200] },
  tabText: { fontSize: 12, fontWeight: '800', color: colors.slate[500] },
  tabTextActive: { color: colors.primary },
  list: { paddingHorizontal: 16, gap: 10 },
  card: { gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  meta: { fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
  
  // Excel Grid Styles
  box: {
    borderWidth: 1,
    borderColor: '#000',
    backgroundColor: '#fff',
  },
  boxHeader: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  boxBody: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  subCol: {
    flex: 1,
    borderColor: '#000',
  },
  subColTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  subColValue: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 8,
  }
});
