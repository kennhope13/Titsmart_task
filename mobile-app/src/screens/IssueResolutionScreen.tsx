import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { TriangleAlert, Send, CheckCircle2, ImageOff, Plus, HelpCircle } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';
import { Issue } from '../types';

export const IssueResolutionScreen = () => {
  const { issues, updateIssueStatus, addDirective } = useRealtimeStore();
  const [directive, setDirective] = useState('');
  
  // Calculate dynamic stats
  const totalActive = issues.filter((i) => i.status !== 'RESOLVED').length;
  const criticalCount = issues.filter((i) => i.priority === 'CRITICAL' && i.status !== 'RESOLVED').length;
  const warningCount = issues.filter((i) => i.priority === 'WARNING' && i.status !== 'RESOLVED').length;
  const resolvedCount = issues.filter((i) => i.status === 'RESOLVED').length;

  const data = issues.slice(0, 80);

  const sendDirective = useCallback((id: string) => {
    if (!directive.trim()) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập chỉ đạo nhanh ở phía trên trước khi gửi.');
      return;
    }
    addDirective(id, directive.trim());
    setDirective('');
    Alert.alert('Thành công', 'Đã gửi chỉ đạo của bạn tới giám sát.');
  }, [addDirective, directive]);

  const handleReportIssue = () => {
    Alert.alert('Chức năng', 'Gửi báo cáo sự cố hiện trường mới.');
  };

  const renderIssue = useCallback(({ item: issue }: { item: Issue }) => {
    const isResolved = issue.status === 'RESOLVED';
    const isProcessing = issue.status === 'PROCESSING';
    
    // Tone colors
    const priorityTone = issue.priority === 'CRITICAL' ? 'red' : issue.priority === 'WARNING' ? 'amber' : 'slate';
    const priorityLabelText = issue.priority === 'CRITICAL' ? 'Cấp bách' : issue.priority === 'WARNING' ? 'Cảnh báo' : 'Thường';
    
    let leftBorderColor = colors.slate[300];
    if (isResolved) {
      leftBorderColor = colors.accent;
    } else if (issue.priority === 'CRITICAL') {
      leftBorderColor = colors.danger;
    } else if (issue.priority === 'WARNING') {
      leftBorderColor = colors.warning;
    }

    return (
      <Card style={[styles.issueCard, { borderLeftColor: leftBorderColor, borderLeftWidth: 4 }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.headerLeftTags}>
            <StatusBadge label={priorityLabelText} tone={priorityTone as any} />
            <AppText style={styles.issueCode}>{issue.incidentCode}</AppText>
          </View>
        </View>

        <View style={styles.issueContent}>
          {issue.photoUrl ? (
            <Image source={{ uri: issue.photoUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.photoFallback}>
              <ImageOff size={20} color={colors.slate[300]} />
            </View>
          )}
          
          <View style={styles.issueTextCol}>
            <AppText style={styles.issueTitle} numberOfLines={2}>{issue.title}</AppText>
            <AppText style={styles.issueMetaText} numberOfLines={1}>📍 {issue.location}</AppText>
            <AppText style={styles.issueMetaText} numberOfLines={1}>👤 Báo cáo: {issue.reportedBy || 'Giám sát'}</AppText>
          </View>
        </View>

        <AppText style={styles.issueDescription}>{issue.description}</AppText>

        {issue.managerDirectives ? (
          <View style={styles.directiveBox}>
            <AppText style={styles.directiveLabel}>Chỉ đạo của Manager:</AppText>
            <AppText style={styles.directiveText}>{issue.managerDirectives}</AppText>
          </View>
        ) : null}

        <View style={styles.actions}>
          {!isResolved ? (
            <>
              <Pressable
                onPress={() => sendDirective(issue.id)}
                style={({ pressed }) => [
                  styles.directiveButton,
                  pressed && { opacity: 0.85 }
                ]}
              >
                <Send size={14} color={colors.primary} />
                <AppText style={styles.directiveButtonText}>Gửi chỉ đạo</AppText>
              </Pressable>
              <Pressable
                onPress={() => updateIssueStatus(issue.id, 'RESOLVED')}
                style={({ pressed }) => [
                  styles.resolveButton,
                  pressed && { opacity: 0.85 }
                ]}
              >
                <CheckCircle2 size={14} color={colors.white} />
                <AppText style={styles.resolveButtonText}>Giải quyết</AppText>
              </Pressable>
            </>
          ) : (
            <View style={styles.resolvedBanner}>
              <CheckCircle2 size={15} color="#047857" />
              <AppText style={styles.resolvedBannerText}>Đã khắc phục sự cố thành công</AppText>
            </View>
          )}
        </View>
      </Card>
    );
  }, [sendDirective, updateIssueStatus]);

  const header = (
    <>
      <ScreenHeader
        icon={<TriangleAlert size={22} color={colors.primary} />}
        title="Sự cố công trường"
        subtitle="Báo cáo an toàn và chỉ đạo khắc phục khẩn cấp"
        action={
          <Pressable style={styles.reportBtn} onPress={handleReportIssue}>
            <Plus size={18} color={colors.white} />
          </Pressable>
        }
      />

      {/* Bento dashboard stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statsCardBox}>
          <AppText style={styles.statsLabel}>Tổng sự cố</AppText>
          <AppText style={styles.statsVal}>{totalActive}</AppText>
        </View>
        <View style={[styles.statsCardBox, { borderColor: '#fee2e2' }]}>
          <AppText style={[styles.statsLabel, { color: colors.danger }]}>Nguy cấp</AppText>
          <AppText style={[styles.statsVal, { color: colors.danger }]}>{criticalCount}</AppText>
        </View>
        <View style={[styles.statsCardBox, { borderColor: '#fef3c7' }]}>
          <AppText style={[styles.statsLabel, { color: '#b45309' }]}>Cảnh báo</AppText>
          <AppText style={[styles.statsVal, { color: '#b45309' }]}>{warningCount}</AppText>
        </View>
        <View style={[styles.statsCardBox, { borderColor: '#d1fae5' }]}>
          <AppText style={[styles.statsLabel, { color: colors.accent }]}>Đã xong (7đ)</AppText>
          <AppText style={[styles.statsVal, { color: colors.accent }]}>{resolvedCount}</AppText>
        </View>
      </View>

      {/* Directive Box */}
      <Card style={styles.globalDirectiveBox}>
        <AppText style={styles.globalDirectiveTitle}>Soạn chỉ thị nhanh</AppText>
        <TextInput
          value={directive}
          onChangeText={setDirective}
          placeholder="Nhập nội dung chỉ thị rồi bấm nút 'Gửi chỉ đạo' ở từng sự cố..."
          placeholderTextColor={colors.slate[400]}
          multiline
          style={styles.globalDirectiveInput}
        />
      </Card>

      <SectionTitle title="Sự cố & Vướng mắc" caption={`${issues.length} sự vụ ghi nhận`} />
    </>
  );

  return (
    <Screen style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderIssue}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Card style={styles.emptyCard}><AppText style={styles.empty}>Không có sự cố nào cần xử lý.</AppText></Card>
          </View>
        }
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
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 24 },
  reportBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  
  statsGrid: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 14 },
  statsCardBox: { flex: 1, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  statsLabel: { fontSize: 9, fontWeight: '800', color: colors.slate[400], textTransform: 'uppercase', textAlign: 'center' },
  statsVal: { fontSize: 18, fontWeight: '800', color: colors.slate[800], marginTop: 4 },

  globalDirectiveBox: { marginHorizontal: 16, marginTop: 12, padding: 14, backgroundColor: colors.white },
  globalDirectiveTitle: { fontSize: 12, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', marginBottom: 6 },
  globalDirectiveInput: { minHeight: 64, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], padding: 10, color: colors.slate[800], fontSize: 13, textAlignVertical: 'top', fontWeight: '500' },
  
  issueCard: { marginHorizontal: 16, marginTop: 10, padding: 14, gap: 10, backgroundColor: colors.white },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeftTags: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  issueCode: { fontSize: 11, fontWeight: '800', color: colors.slate[400] },
  
  issueContent: { flexDirection: 'row', gap: 12 },
  photo: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.slate[100] },
  photoFallback: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], alignItems: 'center', justifyContent: 'center' },
  issueTextCol: { flex: 1, justifyContent: 'center', gap: 4 },
  issueTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800', color: colors.slate[900] },
  issueMetaText: { fontSize: 11, color: colors.slate[500], fontWeight: '600' },
  
  issueDescription: { fontSize: 12.5, lineHeight: 18, color: colors.slate[600], marginTop: 2 },
  directiveBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#dcfce7', borderRadius: 8, padding: 10, marginTop: 2 },
  directiveLabel: { fontSize: 11, fontWeight: '800', color: '#166534' },
  directiveText: { fontSize: 12, color: '#14532d', fontWeight: '600', marginTop: 2 },

  actions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 10, marginTop: 4 },
  directiveButton: { flex: 1, height: 38, borderRadius: 8, backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  directiveButtonText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  resolveButton: { flex: 1, height: 38, borderRadius: 8, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  resolveButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  resolvedBanner: { flex: 1, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ecfdf5', borderRadius: 8 },
  resolvedBannerText: { color: '#047857', fontSize: 12, fontWeight: '800' },

  emptyWrap: { padding: 24 },
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },
});
