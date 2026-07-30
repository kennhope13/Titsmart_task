import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Activity, BriefcaseBusiness, ChevronRight, ClipboardList, Coins, FileBarChart, FileText, LayoutDashboard, MoreHorizontal, NotebookText, Package, Settings, TriangleAlert, UserCircle2, UsersRound } from 'lucide-react-native';
import { colors } from '../theme';
import { AppText, Screen, ScreenHeader } from '../components/MobileUI';

const groups = [
  {
    title: 'Bảng điều khiển',
    items: [
      { label: 'Tổng quan', route: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Quản lý dự án',
    items: [
      { label: 'Danh sách Dự án', route: 'Projects', icon: BriefcaseBusiness },
      { label: 'Công việc', route: 'Tasks', icon: ClipboardList },
      { label: 'Kế hoạch & Chi phí', route: 'CostPlan', icon: Coins },
      { label: 'Nhật ký Hiện trường', route: 'FieldLogs', icon: NotebookText },
      { label: 'Theo dõi Hồ sơ', route: 'Documents', icon: FileText },
    ],
  },
  {
    title: 'Kho công ty',
    items: [
      { label: 'Kho & Vật tư', route: 'Materials', icon: Package },
    ],
  },
  {
    title: 'Sự cố & Báo cáo',
    items: [
      { label: 'Sự cố', route: 'Issues', icon: TriangleAlert },
      { label: 'Báo cáo', route: 'Reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Hệ thống & Nội bộ',
    items: [
      { label: 'Nhân sự', route: 'Personnel', icon: UsersRound },
      { label: 'Nhật ký Hoạt động', route: 'ActivityLog', icon: Activity },
    ],
  },
  {
    title: 'Cá nhân',
    items: [
      { label: 'Tài khoản', route: 'Account', icon: UserCircle2 },
      { label: 'Cài đặt', route: 'Account', icon: Settings },
    ],
  },
];

const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

export const MoreScreen = ({ navigation }: any) => (
  <Screen>
    <ScreenHeader icon={<MoreHorizontal size={21} color={colors.primary} />} title="Thêm" subtitle="Tất cả chức năng trên web" badge={`${totalItems}`} />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText style={styles.groupTitle}>{group.title}</AppText>
          <View style={styles.listBox}>
            {group.items.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === group.items.length - 1;
              return (
                <Pressable key={`${group.title}-${item.label}`} onPress={() => navigation.navigate(item.route)} style={[styles.row, !isLast ? styles.rowDivider : undefined]}>
                  <View style={styles.icon}><Icon size={19} color={colors.primary} /></View>
                  <AppText style={styles.label}>{item.label}</AppText>
                  <ChevronRight size={18} color={colors.slate[300]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  </Screen>
);

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 24 },
  group: { marginBottom: 14 },
  groupTitle: { marginBottom: 6, paddingHorizontal: 4, fontSize: 10, lineHeight: 14, fontWeight: '800', color: colors.slate[400], textTransform: 'uppercase' },
  listBox: { borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, overflow: 'hidden' },
  row: { minHeight: 50, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  icon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '800', color: colors.slate[800] },
});
