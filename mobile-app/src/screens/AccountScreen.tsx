import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Bell, ChevronRight, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

export const AccountScreen = () => {
  const engineer = useRealtimeStore((state) => state.engineers[0]);

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<UserCircle2 size={21} color={colors.primary} />}
        title="Tài khoản"
        subtitle="Hồ sơ cá nhân và cấu hình ứng dụng"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileSection}>
          <Image
            source={{ uri: engineer?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <AppText style={styles.name}>{engineer?.name || 'Admin TitSmart'}</AppText>
            <AppText style={styles.email}>{engineer?.email || 'admin@titsmart.vn'}</AppText>
            <View style={styles.badgeContainer}>
              <StatusBadge label="Quản trị viên" tone="blue" />
            </View>
          </View>
        </View>

        {/* Profile Info Cards */}
        <SectionTitle title="Thông tin cá nhân" />
        <Card style={styles.infoCard}>
          <Info icon={<ShieldCheck size={18} color={colors.primary} />} label="Mã thành viên" value="NV-001" />
          <Info icon={<Mail size={18} color={colors.primary} />} label="Địa chỉ Email" value={engineer?.email || 'admin@titsmart.vn'} />
          <Info icon={<Phone size={18} color={colors.primary} />} label="Số điện thoại" value={engineer?.phone || '0901 234 567'} last />
        </Card>

        {/* Configurations */}
        <SectionTitle title="Cài đặt hệ thống" />
        <Card style={styles.settingsCard}>
          <Setting
            icon={<Bell size={18} color={colors.slate[700]} />}
            label="Thông báo công việc"
            onPress={() => Alert.alert('Thông báo', 'Đã lưu cấu hình thông báo đẩy.')}
          />
          <Setting
            icon={<KeyRound size={18} color={colors.slate[700]} />}
            label="Đổi mật khẩu bảo mật"
            onPress={() => Alert.alert('Đổi mật khẩu', 'Chức năng sẽ yêu cầu xác thực OTP email.')}
            last
          />
        </Card>

        {/* Logout */}
        <Pressable
          onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [{ text: 'Huỷ', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive' }])}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && { opacity: 0.9 }
          ]}
        >
          <LogOut size={16} color={colors.danger} />
          <AppText style={styles.logoutText}>Đăng xuất tài khoản</AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const Info = ({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last ? styles.divider : undefined]}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  </View>
);

const Setting = ({ icon, label, onPress, last }: { icon: React.ReactNode; label: string; onPress: () => void; last?: boolean }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.settingRow,
      !last ? styles.divider : undefined,
      pressed && { backgroundColor: colors.slate[50] }
    ]}
  >
    <View style={styles.settingIcon}>{icon}</View>
    <AppText style={styles.settingLabel}>{label}</AppText>
    <ChevronRight size={16} color={colors.slate[400]} />
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  
  profileSection: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.slate[100] },
  profileInfo: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.slate[900] },
  email: { fontSize: 12, color: colors.slate[500], fontWeight: '600', marginTop: 1 },
  badgeContainer: { marginTop: 6, alignSelf: 'flex-start' },
  
  infoCard: { marginHorizontal: 16, paddingVertical: 0, backgroundColor: colors.white },
  infoRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  infoIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 2, fontSize: 13, color: colors.slate[800], fontWeight: '700' },
  
  settingsCard: { marginHorizontal: 16, paddingVertical: 0, backgroundColor: colors.white },
  settingRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
  settingIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '700' },
  
  logoutButton: { marginHorizontal: 16, marginTop: 20, height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.dangerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
});
