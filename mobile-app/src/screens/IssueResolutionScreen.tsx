import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { TriangleAlert, Send, CheckCircle2, ImageOff } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, StatusBadge } from '../components/MobileUI';
import { statusLabel } from '../utils/text';
import { Issue } from '../types';

export const IssueResolutionScreen = () => {
  const { issues, updateIssueStatus, addDirective } = useRealtimeStore();
  const [directive, setDirective] = useState('');
  const openIssues = issues.filter((i) => i.status !== 'RESOLVED').length;
  const data = issues.slice(0, 80);

  const sendDirective = useCallback((id: string) => {
    if (!directive.trim()) {
      Alert.alert('Thieu noi dung', 'Nhap chi dao truoc khi gui.');
      return;
    }
    addDirective(id, directive.trim());
    setDirective('');
    Alert.alert('Thanh cong', 'Da gui chi dao xu ly.');
  }, [addDirective, directive]);

  const renderIssue = useCallback(({ item: issue }: { item: Issue }) => {
    const done = issue.status === 'RESOLVED';
    const processing = issue.status === 'PROCESSING';
    return (
      <Card style={styles.issueCard}>
        <View style={styles.rowTop}>
          {issue.photoUrl ? <Image source={{ uri: issue.photoUrl }} style={styles.photo} resizeMode="cover" /> : <View style={styles.photoFallback}><ImageOff size={20} color={colors.slate[400]} /></View>}
          <View style={{ flex: 1 }}>
            <View style={styles.rowBetween}><StatusBadge label={issue.incidentCode} tone={done ? 'green' : processing ? 'amber' : 'red'} /><StatusBadge label={statusLabel(issue.status)} tone={done ? 'green' : processing ? 'amber' : 'red'} /></View>
            <AppText style={styles.title} numberOfLines={2}>{issue.title}</AppText>
            <AppText style={styles.meta} numberOfLines={1}>{issue.location}</AppText>
          </View>
        </View>
        <AppText style={styles.description} numberOfLines={3}>{issue.description}</AppText>
        <View style={styles.actions}>
          <Pressable onPress={() => sendDirective(issue.id)} style={styles.actionButton}><Send size={15} color={colors.primary} /><AppText style={styles.actionText}>Gui chi dao</AppText></Pressable>
          {!done ? <Pressable onPress={() => updateIssueStatus(issue.id, 'RESOLVED')} style={styles.doneButton}><CheckCircle2 size={15} color="#047857" /><AppText style={styles.doneText}>Hoan thanh</AppText></Pressable> : null}
        </View>
      </Card>
    );
  }, [sendDirective, updateIssueStatus]);

  const header = (
    <>
      <ScreenHeader icon={<TriangleAlert size={22} color={colors.primary} />} title="Xu ly Su co Hien truong" subtitle="Nhan su co, gui chi dao va danh dau hoan thanh." badge={`${openIssues} dang mo`} />
      <Card style={styles.directiveBox}>
        <AppText style={styles.directiveLabel}>Chi dao nhanh</AppText>
        <TextInput value={directive} onChangeText={setDirective} placeholder="VD: Kiem tra lai ban ve, bao cao truoc 17h..." placeholderTextColor={colors.slate[400]} multiline style={styles.directiveInput} />
      </Card>
    </>
  );

  return (
    <Screen>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderIssue}
        ListHeaderComponent={header}
        ListEmptyComponent={<View style={styles.emptyWrap}><Card><AppText style={styles.empty}>Chua co su co.</AppText></Card></View>}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
      />
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
  emptyWrap: { paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: colors.slate[500], fontSize: 13 },
});
