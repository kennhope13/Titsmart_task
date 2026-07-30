import React from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, Camera, ClipboardPlus, FileText, ScanText, Share2, Sparkles } from 'lucide-react-native';
import { AppText, Card, Screen, ScreenHeader, SectionTitle } from '../components/MobileUI';
import { colors } from '../theme';
import { captureVietnameseText, OcrExtractedField, OcrResult } from '../services/ocrService';

const labels = {
  title: 'OCR tiếng Việt',
  subtitle: 'Chụp giấy tờ, phiếu vật tư hoặc nội dung công việc để lấy dữ liệu nhanh',
  captureTitle: 'Quét dữ liệu từ ảnh',
  captureText: 'Chụp thẳng khung, đủ sáng. App sẽ nhận dạng chữ và tự tách các trường có thể dùng ngay.',
  scanning: 'Đang quét',
  capture: 'Chụp ảnh',
  noText: 'Không tìm thấy ký tự trong ảnh. Hãy chụp rõ hơn, đủ sáng và giữ giấy thẳng khung hình.',
  scanFailed: 'Không thể nhận dạng văn bản tiếng Việt từ ảnh đã chụp.',
  imageTitle: 'Ảnh đã chụp',
  imageCaption: 'Ảnh nguồn dùng cho OCR tiếng Việt',
  extractedTitle: 'Dữ liệu đã tách',
  extractedCaption: 'Kiểm tra nhanh rồi đưa vào công việc để không phải nhập tay',
  resultTitle: 'Toàn bộ văn bản',
  emptyCaption: 'Chưa có dữ liệu OCR',
  vietnamese: 'tiếng Việt',
  block: 'khối',
  line: 'dòng',
  emptyTitle: 'Chưa có văn bản',
  emptyText: 'Bấm chụp ảnh để app nhận dạng form, phiếu vật tư hoặc ghi chú công việc.',
  blocksTitle: 'Vùng văn bản',
  blocksCaption: 'Các khối OCR tách được từ ảnh',
  createTask: 'Tạo công việc',
  shareText: 'Chia sẻ text',
  shareFailed: 'Không thể mở chức năng chia sẻ trên thiết bị này.',
};

const formatExtractedForShare = (fields: OcrExtractedField[], rawText: string) => {
  const fieldText = fields.map((field) => `${field.label}: ${field.value}`).join('\n');
  return [fieldText, rawText].filter(Boolean).join('\n\n--- OCR ---\n');
};

export const OcrScannerScreen = () => {
  const navigation = useNavigation<any>();
  const [result, setResult] = React.useState<OcrResult | null>(null);
  const [isScanning, setIsScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const scanImage = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const nextResult = await captureVietnameseText();
      setResult(nextResult);
      if (!nextResult.text.trim()) setError(labels.noText);
    } catch (scanError: any) {
      setError(scanError?.message || labels.scanFailed);
    } finally {
      setIsScanning(false);
    }
  };

  const displayText = result?.formattedText || result?.text || '';
  const extracted = result?.extracted;
  const extractedFields = extracted?.fields || [];
  const hasText = !!displayText.trim();
  const resultCaption = hasText
    ? `${result?.lines?.length || 0} ${labels.line}, ${result?.blocks?.length || 0} ${labels.block} - ${labels.vietnamese}`
    : labels.emptyCaption;

  const shareOcrText = async () => {
    try {
      await Share.share({ message: formatExtractedForShare(extractedFields, displayText) });
    } catch (_error) {
      Alert.alert(labels.scanFailed, labels.shareFailed);
    }
  };

  const createTaskFromOcr = () => {
    if (!extracted) return;
    navigation.navigate('TaskForm', {
      mode: 'create',
      ocrDraft: {
        name: extracted.taskName || extracted.materialName || '',
        description: extracted.rawText,
        location: extracted.location || '',
        dueDate: extracted.dueDate || '',
        team: extracted.projectName || '',
        notes: extractedFields.map((field) => `${field.label}: ${field.value}`).join('\n'),
      },
    });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          icon={<ScanText size={21} color={colors.primary} />}
          title={labels.title}
          subtitle={labels.subtitle}
          badge="VI"
        />

        <View style={styles.capturePanel}>
          <View style={styles.captureIcon}>
            {isScanning ? <ActivityIndicator color={colors.primary} /> : <Camera size={28} color={colors.primary} />}
          </View>
          <View style={styles.captureCopy}>
            <AppText style={styles.captureTitle}>{labels.captureTitle}</AppText>
            <AppText style={styles.captureText}>{labels.captureText}</AppText>
          </View>
          <Pressable style={[styles.captureButton, isScanning ? styles.captureButtonDisabled : undefined]} onPress={scanImage} disabled={isScanning}>
            <Camera size={18} color={colors.white} />
            <AppText style={styles.captureButtonText}>{isScanning ? labels.scanning : labels.capture}</AppText>
          </Pressable>
        </View>

        {error ? (
          <Card style={styles.errorCard}>
            <AlertCircle size={18} color={colors.danger} />
            <AppText style={styles.errorText}>{error}</AppText>
          </Card>
        ) : null}

        {result?.imageUri ? (
          <>
            <SectionTitle title={labels.imageTitle} caption={labels.imageCaption} />
            <Image source={{ uri: result.imageUri }} style={styles.previewImage} resizeMode="cover" />
          </>
        ) : null}

        {extractedFields.length ? (
          <>
            <SectionTitle title={labels.extractedTitle} caption={labels.extractedCaption} />
            <Card style={styles.extractedCard}>
              {extractedFields.map((field) => (
                <View key={`${field.label}-${field.value}`} style={styles.fieldRow}>
                  <AppText style={styles.fieldLabel}>{field.label}</AppText>
                  <AppText style={styles.fieldValue}>{field.value}</AppText>
                </View>
              ))}
              <View style={styles.quickActions}>
                <Pressable onPress={createTaskFromOcr} style={styles.primaryAction}>
                  <ClipboardPlus size={16} color={colors.white} />
                  <AppText style={styles.primaryActionText}>{labels.createTask}</AppText>
                </Pressable>
                <Pressable onPress={shareOcrText} style={styles.secondaryAction}>
                  <Share2 size={16} color={colors.slate[700]} />
                  <AppText style={styles.secondaryActionText}>{labels.shareText}</AppText>
                </Pressable>
              </View>
            </Card>
          </>
        ) : null}

        <SectionTitle title={labels.resultTitle} caption={resultCaption} />
        <Card style={styles.resultCard}>
          {hasText ? (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <AppText style={styles.resultText}>{displayText}</AppText>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <FileText size={26} color={colors.slate[400]} />
              <AppText style={styles.emptyTitle}>{labels.emptyTitle}</AppText>
              <AppText style={styles.emptyText}>{labels.emptyText}</AppText>
            </View>
          )}
        </Card>

        {result?.blocks?.length ? (
          <>
            <SectionTitle title={labels.blocksTitle} caption={labels.blocksCaption} />
            <View style={styles.blockList}>
              {result.blocks.map((block, index) => (
                <Card key={`${index}-${block.text.slice(0, 12)}`} style={styles.blockCard}>
                  <View style={styles.blockIndex}>
                    <Sparkles size={14} color={colors.primary} />
                    <AppText style={styles.blockIndexText}>#{index + 1}</AppText>
                  </View>
                  <AppText style={styles.blockText}>{block.text}</AppText>
                </Card>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  capturePanel: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 12 },
  captureIcon: { width: 48, height: 48, borderRadius: 11, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  captureCopy: { flex: 1 },
  captureTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.slate[900] },
  captureText: { marginTop: 3, fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  captureButton: { minHeight: 42, borderRadius: 10, paddingHorizontal: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  captureButtonDisabled: { opacity: 0.65 },
  captureButtonText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  errorCard: { marginHorizontal: 16, marginBottom: 2, flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.dangerLight, borderColor: '#fecaca' },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#b91c1c', fontWeight: '700' },
  previewImage: { marginHorizontal: 16, width: undefined, height: 230, borderRadius: 12, backgroundColor: colors.slate[100] },
  extractedCard: { marginHorizontal: 16, gap: 0, padding: 0, overflow: 'hidden' },
  fieldRow: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.slate[100], gap: 4 },
  fieldLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', color: colors.slate[500] },
  fieldValue: { fontSize: 14, lineHeight: 19, fontWeight: '700', color: colors.slate[900] },
  quickActions: { flexDirection: 'row', gap: 10, padding: 14, backgroundColor: colors.slate[50] },
  primaryAction: { flex: 1, minHeight: 43, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  primaryActionText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  secondaryAction: { flex: 1, minHeight: 43, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[300], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  secondaryActionText: { color: colors.slate[700], fontSize: 12, fontWeight: '800' },
  resultCard: { marginHorizontal: 16, minHeight: 170, padding: 12 },
  resultText: { minWidth: 310, fontFamily: 'monospace', fontSize: 13, lineHeight: 20, color: colors.slate[900], fontWeight: '500' },
  emptyState: { minHeight: 126, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  emptyTitle: { marginTop: 9, fontSize: 14, fontWeight: '800', color: colors.slate[700] },
  emptyText: { marginTop: 4, textAlign: 'center', fontSize: 12, lineHeight: 17, color: colors.slate[500] },
  blockList: { paddingHorizontal: 16, gap: 10 },
  blockCard: { gap: 8 },
  blockIndex: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  blockIndexText: { fontSize: 11, fontWeight: '800', color: colors.primary },
  blockText: { fontSize: 13, lineHeight: 19, color: colors.slate[700] },
});

