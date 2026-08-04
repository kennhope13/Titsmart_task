import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Activity, BriefcaseBusiness, ChevronRight, ClipboardList, Coins, FileBarChart, FileText, LayoutDashboard, MoreHorizontal, NotebookText, Package, Settings, TriangleAlert, UserCircle2, UsersRound, ArrowLeft } from 'lucide-react-native';
import { colors } from '../theme';
import { AppText, Screen, ScreenHeader, Card } from '../components/MobileUI';

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
      { label: 'Sự cố công trường', route: 'Issues', icon: TriangleAlert },
      { label: 'Báo cáo xuất dữ liệu', route: 'Reports', icon: FileBarChart },
    ],
  },
  {
    title: 'Hệ thống & Nội bộ',
    items: [
      { label: 'Nhân sự', route: 'Personnel', icon: UsersRound },
      { label: 'Nhật ký Hoạt động', route: 'ActivityLog', icon: Activity },
    ],
  },
];

const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);

export const MoreScreen = ({ navigation }: any) => (
  <Screen style={styles.container}>
    <ScreenHeader
      icon={<MoreHorizontal size={21} color={colors.primary} />}
      title="Mở rộng"
      subtitle="Quản lý toàn bộ mô-đun chức năng phụ trợ"
      badge={`${totalItems}`}
    />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* Profile Header Widget */}
      <Card style={styles.profileCard}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' }}
          style={styles.profileAvatar}
        />
        <View style={styles.profileInfo}>
          <AppText style={styles.profileName}>Admin TitSmart</AppText>
          <AppText style={styles.profileRole}>Quản trị hệ thống cao cấp</AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Account')}
          style={({ pressed }) => [
            styles.profileEditBtn,
            pressed && { opacity: 0.85 }
          ]}
        >
          <Settings size={16} color={colors.slate[500]} />
        </Pressable>
      </Card>

      {/* Menu Categories */}
      {groups.map((group) => (
        <View key={group.title} style={styles.group}>
          <AppText style={styles.groupTitle}>{group.title}</AppText>
          <View style={styles.listBox}>
            {group.items.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === group.items.length - 1;
              return (
                <Pressable
                  key={`${group.title}-${item.label}`}
                  onPress={() => navigation.navigate(item.route)}
                  style={({ pressed }) => [
                    styles.row,
                    !isLast ? styles.rowDivider : undefined,
                    pressed && { backgroundColor: colors.slate[50] }
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <Icon size={16} color={colors.primary} />
                  </View>
                  <AppText style={styles.label}>{item.label}</AppText>
                  <ChevronRight size={16} color={colors.slate[300]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      
      {/* Footer Branding */}
      <View style={styles.footerBranding}>
        <AppText style={styles.brandText}>TitSmart Task Manager v2.0</AppText>
        <AppText style={styles.companyText}>© 2026 Titsmart Technology JSC</AppText>
      </View>
    </ScrollView>
  </Screen>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { padding: 16, paddingBottom: 32 },
  
  profileCard: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.white, marginBottom: 18 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.slate[100] },
  profileInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  profileName: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  profileRole: { fontSize: 11, color: colors.slate[400], fontWeight: '700', marginTop: 2 },
  profileEditBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.slate[100] },

  group: { marginBottom: 16 },
  groupTitle: { marginBottom: 8, paddingHorizontal: 4, fontSize: 10, fontWeight: '800', color: colors.slate[400], textTransform: 'uppercase', letterSpacing: 0.5 },
  listBox: { borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, overflow: 'hidden' },
  row: { minHeight: 52, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  iconContainer: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.slate[800] },
  
  footerBranding: { alignItems: 'center', marginTop: 14, gap: 4 },
  brandText: { fontSize: 10, fontWeight: '700', color: colors.slate[400] },
  companyText: { fontSize: 9, fontWeight: '600', color: colors.slate[400] },
});
