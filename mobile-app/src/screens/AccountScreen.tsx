import React from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Bell, ChevronRight, KeyRound, LogOut, Mail, Phone, ShieldCheck, UserCircle2 } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';

export const AccountScreen = () => {
  const engineer = useRealtimeStore((state) => state.engineers[0]);

  return (
    <Screen>
      <ScreenHeader icon={<UserCircle2 size={21} color={colors.primary} />} title="Tài khoản" subtitle="Hồ sơ và cài đặt cá nhân" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profile}>
          <Image source={{ uri: engineer?.avatar }} style={styles.avatar} />
          <View style={styles.profileCopy}>
            <AppText style={styles.name}>{engineer?.name || 'Quản lý'}</AppText>
            <AppText style={styles.email}>{engineer?.email || 'admin@titsmart.vn'}</AppText>
            <StatusBadge label="Quản lý hệ thống" tone="blue" />
          </View>
        </View>

        <SectionTitle title="Thông tin cá nhân" />
        <Card style={styles.infoCard}>
          <Info icon={<ShieldCheck size={18} color={colors.primary} />} label="Mã nhân viên" value="NV-001" />
          <Info icon={<Mail size={18} color={colors.primary} />} label="Email" value={engineer?.email || 'admin@titsmart.vn'} />
          <Info icon={<Phone size={18} color={colors.primary} />} label="Số điện thoại" value={engineer?.phone || 'Chưa cập nhật'} last />
        </Card>

        <SectionTitle title="Cài đặt" />
        <Card style={styles.settingsCard}>
          <Setting icon={<Bell size={18} color={colors.slate[700]} />} label="Thông báo" onPress={() => Alert.alert('Thông báo', 'Cài đặt thông báo công việc.')} />
          <Setting icon={<KeyRound size={18} color={colors.slate[700]} />} label="Đổi mật khẩu" onPress={() => Alert.alert('Đổi mật khẩu', 'Chức năng sẽ kết nối API xác thực.')} last />
        </Card>

        <Pressable onPress={() => Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?')} style={styles.logoutButton}>
          <LogOut size={18} color={colors.danger} />
          <AppText style={styles.logoutText}>Đăng xuất</AppText>
        </Pressable>
      </ScrollView>
    </Screen>
  );
};

const Info = ({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) => (
  <View style={[styles.infoRow, !last ? styles.divider : undefined]}>
    <View style={styles.infoIcon}>{icon}</View>
    <View style={{ flex: 1 }}><AppText style={styles.infoLabel}>{label}</AppText><AppText style={styles.infoValue}>{value}</AppText></View>
  </View>
);

const Setting = ({ icon, label, onPress, last }: { icon: React.ReactNode; label: string; onPress: () => void; last?: boolean }) => (
  <Pressable onPress={onPress} style={[styles.settingRow, !last ? styles.divider : undefined]}>
    <View style={styles.settingIcon}>{icon}</View>
    <AppText style={styles.settingLabel}>{label}</AppText>
    <ChevronRight size={18} color={colors.slate[400]} />
  </Pressable>
);

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  profile: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 18, backgroundColor: colors.white, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.slate[200], flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 18, backgroundColor: colors.slate[100] },
  profileCopy: { flex: 1, alignItems: 'flex-start', gap: 4 },
  name: { fontSize: 19, fontWeight: '800', color: colors.slate[900] },
  email: { fontSize: 12, color: colors.slate[500] },
  infoCard: { marginHorizontal: 16, paddingVertical: 0 },
  infoRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  infoIcon: { width: 36, height: 36, borderRadius: 9, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: colors.slate[400], fontWeight: '700' },
  infoValue: { marginTop: 3, fontSize: 13, color: colors.slate[800], fontWeight: '700' },
  settingsCard: { marginHorizontal: 16, paddingVertical: 0 },
  settingRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '700' },
  logoutButton: { marginHorizontal: 16, marginTop: 20, height: 46, borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: colors.dangerLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
});
