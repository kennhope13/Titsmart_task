import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../theme';
import { cleanText } from '../utils/text';

export const AppText = ({ children, style, numberOfLines }: { children: React.ReactNode; style?: TextStyle | TextStyle[]; numberOfLines?: number }) => (
  <Text style={style} numberOfLines={numberOfLines}>{typeof children === 'string' || typeof children === 'number' ? cleanText(children) : children}</Text>
);

export const Screen = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => (
  <View style={[styles.screen, style]}>{children}</View>
);

export const ScreenHeader = ({ icon, title, subtitle, badge }: { icon: React.ReactNode; title: string; subtitle: string; badge?: string }) => (
  <View style={styles.headerCard}>
    <View style={styles.headerIcon}>{icon}</View>
    <View style={{ flex: 1 }}>
      <View style={styles.headerTitleRow}>
        <AppText style={styles.headerTitle}>{title}</AppText>
        {badge ? <AppText style={styles.badge}>{badge}</AppText> : null}
      </View>
      <AppText style={styles.headerSubtitle}>{subtitle}</AppText>
    </View>
  </View>
);

export const Card = ({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const StatCard = ({ label, value, tone = 'primary', icon }: { label: string; value: string | number; tone?: 'primary' | 'green' | 'amber' | 'red' | 'slate'; icon?: React.ReactNode }) => {
  const toneStyle = tone === 'green' ? styles.greenTone : tone === 'amber' ? styles.amberTone : tone === 'red' ? styles.redTone : tone === 'slate' ? styles.slateTone : styles.primaryTone;
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, toneStyle]}>{icon}</View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </Card>
  );
};

export const StatusBadge = ({ label, tone = 'slate' }: { label: string; tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate' }) => {
  const style = tone === 'green' ? styles.badgeGreen : tone === 'amber' ? styles.badgeAmber : tone === 'red' ? styles.badgeRed : tone === 'blue' ? styles.badgeBlue : styles.badgeSlate;
  return <AppText style={[styles.statusBadge, style]}>{label}</AppText>;
};

export const ActionButton = ({ label, onPress, tone = 'primary' }: { label: string; onPress: () => void; tone?: 'primary' | 'light' | 'danger' }) => (
  <Pressable onPress={onPress} style={[styles.button, tone === 'light' ? styles.buttonLight : tone === 'danger' ? styles.buttonDanger : styles.buttonPrimary]}>
    <AppText style={[styles.buttonText, tone === 'light' ? styles.buttonLightText : styles.buttonText]}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate[50] },
  headerCard: { margin: 12, marginBottom: 8, padding: 14, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[200], flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#dbeafe' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerTitle: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: colors.slate[900] },
  headerSubtitle: { marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[200], borderRadius: 16, padding: 14 },
  statCard: { flex: 1, minWidth: '47%' },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.slate[900] },
  statLabel: { marginTop: 2, fontSize: 12, color: colors.slate[500], fontWeight: '700' },
  primaryTone: { backgroundColor: colors.primaryLight },
  greenTone: { backgroundColor: colors.accentLight },
  amberTone: { backgroundColor: colors.warningLight },
  redTone: { backgroundColor: colors.dangerLight },
  slateTone: { backgroundColor: colors.slate[100] },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  badgeGreen: { backgroundColor: colors.accentLight, color: '#047857' },
  badgeAmber: { backgroundColor: colors.warningLight, color: '#b45309' },
  badgeRed: { backgroundColor: colors.dangerLight, color: '#dc2626' },
  badgeBlue: { backgroundColor: colors.primaryLight, color: colors.primary },
  badgeSlate: { backgroundColor: colors.slate[100], color: colors.slate[600] },
  button: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[200] },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  buttonLightText: { color: colors.slate[700] },
});
