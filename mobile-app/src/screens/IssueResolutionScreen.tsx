import React, { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { TriangleAlert, Send, CheckCircle2, ImageOff } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { cleanText, statusLabel } from '../utils/text';

export const IssueResolutionScreen = () => {
  const { issues, updateIssueStatus, addDirective } = useRealtimeStore();
  const [directive, setDirective] = useState('');
  const openIssues = issues.filter((i) => i.status !== 'RESOLVED').length;

  const sendDirective = (id: string) => {
    if (!directive.trim()) {
      Alert.alert('Thi\u1ebfu n\u1ed9i dung', 'Nh\u1eadp ch\u1ec9 \u0111\u1ea1o tr\u01b0\u1edbc khi g\u1eedi.');
      return;
    }
    addDirective(id, directive.trim());
    setDirective('');
    Alert.alert('Th\u00e0nh c\u00f4ng', '\u0110\u00e3 g\u1eedi ch\u1ec9 \u0111\u1ea1o x\u1eed l\u00fd.');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<TriangleAlert size={22} color={colors.primary} />}
          title="X\u1eed l\u00fd S\u1ef1 c\u1ed1 Hi\u1ec7n tr\u01b0\u1eddng"
          subtitle="Nh\u1eadn s\u1ef1 c\u1ed1, g\u1eedi ch\u1ec9 \u0111\u1ea1o v\u00e0 \u0111\u00e1nh d\u1ea5u ho\u00e0n th\u00e0nh ngay t\u1ea1i c\u00f4ng tr\u01b0\u1eddng."
          badge={`${openIssues} \u0111ang m\u1edf`}
        />

        <Card style={styles.directiveBox}>
          <AppText style={styles.directiveLabel}>Ch\u1ec9 \u0111\u1ea1o nhanh</AppText>
          <TextInput
            value={directive}
            onChangeText={setDirective}
            placeholder="VD: Ki\u1ec3m tra l\u1ea1i b\u1ea3n v\u1ebd, b\u00e1o c\u00e1o tr\u01b0\u1edbc 17h..."
            placeholderTextColor={colors.slate[400]}
            multiline
            style={styles.directiveInput}
          />
        </Card>

        {issues.slice(0, 50).map((issue) => {
          const done = issue.status === 'RESOLVED';
          const processing = issue.status === 'PROCESSING';
          return (
            <Card key={issue.id} style={styles.issueCard}>
              <View style={styles.rowTop}>
                {issue.photoUrl ? <Image source={{ uri: issue.photoUrl }} style={styles.photo} /> : <View style={styles.photoFallback}><ImageOff size={20} color={colors.slate[400]} /></View>}
                <View style={{ flex: 1 }}>
                  <View style={styles.rowBetween}>
                    <StatusBadge label={issue.incidentCode} tone={done ? 'green' : processing ? 'amber' : 'red'} />
                    <StatusBadge label={statusLabel(issue.status)} tone={done ? 'green' : processing ? 'amber' : 'red'} />
                  </View>
                  <AppText style={styles.title} numberOfLines={2}>{issue.title}</AppText>
                  <AppText style={styles.meta} numberOfLines={1}>{issue.location}</AppText>
                </View>
              </View>
              <AppText style={styles.description} numberOfLines={3}>{issue.description}</AppText>
              <View style={styles.actions}>
                <Pressable onPress={() => sendDirective(issue.id)} style={styles.actionButton}><Send size={15} color={colors.primary} /><AppText style={styles.actionText}>G\u1eedi ch\u1ec9 \u0111\u1ea1o</AppText></Pressable>
                {!done ? <Pressable onPress={() => updateIssueStatus(issue.id, 'RESOLVED')} style={styles.doneButton}><CheckCircle2 size={15} color="#047857" /><AppText style={styles.doneText}>Ho\u00e0n th\u00e0nh</AppText></Pressable> : null}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  directiveBox: { marginHorizontal: 12, marginBottom: 10 },
  directiveLabel: { fontSize: 13, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  directiveInput: { minHeight: 70, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], padding: 10, color: colors.slate[800], fontSize: 13, textAlignVertical: 'top' },
  issueCard: { marginHorizontal: 12, marginBottom: 10, gap: 10 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  photo: { width: 76, height: 76, borderRadius: 14, backgroundColor: colors.slate[100] },
  photoFallback: { width: 76, height: 76, borderRadius: 14, backgroundColor: colors.slate[100], alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 8, fontSize: 14, lineHeight: 19, fontWeight: '800', color: colors.slate[900] },
  meta: { marginTop: 3, fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  description: { fontSize: 12, lineHeight: 18, color: colors.slate[700] },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  doneButton: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.accentLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  doneText: { color: '#047857', fontSize: 12, fontWeight: '800' },
});
