import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { cleanText } from '../utils/text';

export const AppText = ({ children, style, numberOfLines }: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}) => (
  <Text style={style} numberOfLines={numberOfLines}>
    {typeof children === 'string' || typeof children === 'number' ? cleanText(children) : children}
  </Text>
);

export const Screen = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <SafeAreaView edges={['top']} style={[styles.screen, style]}>{children}</SafeAreaView>
);

export const ScreenHeader = ({ icon, title, subtitle, badge, action }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
}) => (
  <View style={styles.header}>
    <View style={styles.headerIcon}>{icon}</View>
    <View style={styles.headerCopy}>
      <View style={styles.headerTitleRow}>
        <AppText style={styles.headerTitle}>{title}</AppText>
        {badge ? <AppText style={styles.headerBadge}>{badge}</AppText> : null}
      </View>
      {subtitle ? <AppText style={styles.headerSubtitle}>{subtitle}</AppText> : null}
    </View>
    {action}
  </View>
);

export const SectionTitle = ({ title, caption, action }: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
}) => (
  <View style={styles.sectionHeading}>
    <View style={{ flex: 1 }}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      {caption ? <AppText style={styles.sectionCaption}>{caption}</AppText> : null}
    </View>
    {action}
  </View>
);

export const Card = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[styles.card, style]}>{children}</View>
);

export const StatCard = ({ label, value, tone = 'primary', icon }: {
  label: string;
  value: string | number;
  tone?: 'primary' | 'green' | 'amber' | 'red' | 'slate';
  icon?: React.ReactNode;
}) => {
  const toneStyle = tone === 'green' ? styles.greenTone : tone === 'amber' ? styles.amberTone : tone === 'red' ? styles.redTone : tone === 'slate' ? styles.slateTone : styles.primaryTone;
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, toneStyle]}>{icon}</View>
      <AppText style={styles.statValue}>{value}</AppText>
      <AppText style={styles.statLabel}>{label}</AppText>
    </Card>
  );
};

export const StatusBadge = ({ label, tone = 'slate' }: {
  label: string;
  tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate';
}) => {
  const badgeStyle = tone === 'green' ? styles.badgeGreen : tone === 'amber' ? styles.badgeAmber : tone === 'red' ? styles.badgeRed : tone === 'blue' ? styles.badgeBlue : styles.badgeSlate;
  return <AppText style={[styles.statusBadge, badgeStyle]}>{label}</AppText>;
};

export const ActionButton = ({ label, onPress, icon, tone = 'primary' }: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  tone?: 'primary' | 'light' | 'danger';
}) => (
  <Pressable onPress={onPress} style={[styles.button, tone === 'light' ? styles.buttonLight : tone === 'danger' ? styles.buttonDanger : styles.buttonPrimary]}>
    {icon}
    <AppText style={[styles.buttonText, tone === 'light' ? styles.buttonLightText : undefined]}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate[50] },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.slate[200], flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headerTitle: { fontSize: 21, lineHeight: 26, fontWeight: '800', color: colors.slate[900] },
  headerSubtitle: { marginTop: 2, fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  headerBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: '800', overflow: 'hidden' },
  sectionHeading: { marginHorizontal: 16, marginTop: 18, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: colors.slate[900] },
  sectionCaption: { marginTop: 2, fontSize: 12, color: colors.slate[500] },
  card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[200], borderRadius: 12, padding: 14 },
  statCard: { flex: 1, minWidth: '47%', minHeight: 114 },
  statIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  statValue: { marginTop: 11, fontSize: 25, lineHeight: 29, fontWeight: '800', color: colors.slate[900] },
  statLabel: { marginTop: 2, fontSize: 12, color: colors.slate[500], fontWeight: '600' },
  primaryTone: { backgroundColor: colors.primaryLight },
  greenTone: { backgroundColor: colors.accentLight },
  amberTone: { backgroundColor: colors.warningLight },
  redTone: { backgroundColor: colors.dangerLight },
  slateTone: { backgroundColor: colors.slate[100] },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, fontSize: 11, lineHeight: 14, fontWeight: '800', overflow: 'hidden' },
  badgeGreen: { backgroundColor: colors.accentLight, color: '#047857' },
  badgeAmber: { backgroundColor: colors.warningLight, color: '#a16207' },
  badgeRed: { backgroundColor: colors.dangerLight, color: '#dc2626' },
  badgeBlue: { backgroundColor: colors.primaryLight, color: colors.primary },
  badgeSlate: { backgroundColor: colors.slate[100], color: colors.slate[600] },
  button: { minHeight: 44, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonDanger: { backgroundColor: colors.danger },
  buttonLight: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.slate[300] },
  buttonText: { color: colors.white, fontWeight: '800', fontSize: 13 },
  buttonLightText: { color: colors.slate[700] },
});
