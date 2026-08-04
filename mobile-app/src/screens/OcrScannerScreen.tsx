import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Share, StyleSheet, View, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AlertCircle, Camera, ClipboardPlus, FileText, ScanText, Share2, Sparkles, Image as ImageIcon, HelpCircle } from 'lucide-react-native';
import { AppText, Card, Screen, ScreenHeader, SectionTitle } from '../components/MobileUI';
import { colors } from '../theme';
import { captureVietnameseText, OcrExtractedField, OcrResult } from '../services/ocrService';

const labels = {
  title: 'OCR Scanner',
  subtitle: 'Nhận dạng văn bản phiếu giao nhận, ghi chú hiện trường',
  captureTitle: 'Quét dữ liệu từ ảnh',
  captureText: 'Chụp thẳng khung, đủ sáng. App sẽ tự nhận dạng và bóc tách các trường dữ liệu.',
  scanning: 'Đang quét...',
  capture: 'Chụp tài liệu',
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
  shareText: 'Chia sẻ văn bản',
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

  // Animated value for scanning line
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [scanAnim]);

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
      Alert.alert('Lỗi', labels.shareFailed);
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

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140], // height of viewfinder box minus line height
  });

  return (
    <Screen style={styles.container}>
      <ScreenHeader
        icon={<ScanText size={21} color={colors.primary} />}
        title={labels.title}
        subtitle={labels.subtitle}
        badge="AI"
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Viewfinder Area */}
        <View style={styles.viewfinderCard}>
          <View style={styles.viewfinder}>
            {/* Simulated background invoice / blueprint document */}
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZIDLoAeXW5_-GITRSXoozvEjICXwoyCo3qDts371DxJ4jdxHCy8DBL65qo-6Bs3Vvn4VvwiwsGLod9mBUFrkMoMCT8QS6F1cjenqhrnPFv77C9MLwZTXpSAjG36Lh-yveBJIuf_zoi-GLduwkwJn8gV6XJvjvzGtbVDVVppQLBPWkRkgWwzoHOaJ1VaUJiK4bDN8eZ5AahNA6jU9Lm-S0ZOv8J1aMbENCHabl3Om4SDxbvDKw5lfgyw' }}
              style={styles.simulatedFeed}
              resizeMode="cover"
            />
            {/* Viewfinder brackets */}
            <View style={styles.viewfinderFrame}>
              <View style={[styles.corner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
              <View style={[styles.corner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.corner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
              
              {/* Scanning Laser Line */}
              <Animated.View style={[styles.laserLine, { transform: [{ translateY }] }]} />
            </View>
            
            {/* Auto Enhance tag */}
            <View style={styles.enhanceTag}>
              <Sparkles size={11} color={colors.accent} />
              <AppText style={styles.enhanceText}>Auto-Enhance Active</AppText>
            </View>

            <View style={styles.guideTextContainer}>
              <AppText style={styles.guideText}>Căn chỉnh tài liệu thẳng khung hình</AppText>
            </View>
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={scanImage}
            disabled={isScanning}
            style={({ pressed }) => [
              styles.primaryBtn,
              isScanning && styles.btnDisabled,
              pressed && !isScanning && { transform: [{ scale: 0.98 }] }
            ]}
          >
            {isScanning ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Camera size={16} color={colors.white} strokeWidth={2.5} />
            )}
            <AppText style={styles.primaryBtnText}>{isScanning ? labels.scanning : labels.capture}</AppText>
          </Pressable>
          
          <Pressable
            onPress={() => Alert.alert('Chọn ảnh', 'Mở thư viện để tải tài liệu')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              pressed && { backgroundColor: colors.slate[100] }
            ]}
          >
            <ImageIcon size={16} color={colors.primary} />
            <AppText style={styles.secondaryBtnText}>Tải ảnh lên</AppText>
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
            <Image source={{ uri: result.imageUri }} style={styles.previewImage} resizeMode="contain" />
          </>
        ) : null}

        {/* Extracted Fields */}
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
                <Pressable onPress={createTaskFromOcr} style={styles.cardPrimaryAction}>
                  <ClipboardPlus size={15} color={colors.white} />
                  <AppText style={styles.cardPrimaryActionText}>{labels.createTask}</AppText>
                </Pressable>
                <Pressable onPress={shareOcrText} style={styles.cardSecondaryAction}>
                  <Share2 size={15} color={colors.slate[700]} />
                  <AppText style={styles.cardSecondaryActionText}>{labels.shareText}</AppText>
                </Pressable>
              </View>
            </Card>
          </>
        ) : null}

        {/* Raw Text Results */}
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
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  
  viewfinderCard: { margin: 16, overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: '#0f172a' },
  viewfinder: { position: 'relative', width: '100%', height: 230, justifyContent: 'center', alignItems: 'center' },
  simulatedFeed: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, opacity: 0.65 },
  
  viewfinderFrame: { width: '80%', height: 160, position: 'relative', borderWidth: 1, borderColor: 'rgba(111,251,190,0.2)' },
  corner: { position: 'absolute', width: 20, height: 20, borderColor: colors.accent },
  laserLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 5 },
  
  enhanceTag: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(15,23,42,0.75)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  enhanceText: { fontSize: 9, color: colors.accent, fontWeight: '800' },
  
  guideTextContainer: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: 'rgba(15,23,42,0.75)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  guideText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  
  actionsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 4 },
  primaryBtn: { flex: 1.2, height: 46, borderRadius: 10, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnDisabled: { opacity: 0.65 },
  primaryBtnText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  secondaryBtn: { flex: 1, height: 46, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[300], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secondaryBtnText: { color: colors.slate[700], fontSize: 13, fontWeight: '800' },
  
  errorCard: { marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: colors.dangerLight, borderColor: '#fecaca' },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#b91c1c', fontWeight: '700' },
  previewImage: { marginHorizontal: 16, width: undefined, height: 230, borderRadius: 12, backgroundColor: colors.slate[100] },
  extractedCard: { marginHorizontal: 16, padding: 0, overflow: 'hidden', backgroundColor: colors.white },
  fieldRow: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.slate[100] },
  fieldLabel: { fontSize: 10, fontWeight: '800', color: colors.slate[400], textTransform: 'uppercase' },
  fieldValue: { fontSize: 14, fontWeight: '700', color: colors.slate[800], marginTop: 2 },
  quickActions: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: colors.slate[50] },
  cardPrimaryAction: { flex: 1.2, height: 38, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardPrimaryActionText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  cardSecondaryAction: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: colors.slate[300], backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  cardSecondaryActionText: { color: colors.slate[700], fontSize: 12, fontWeight: '800' },
  
  resultCard: { marginHorizontal: 16, minHeight: 120, padding: 12, backgroundColor: colors.white },
  resultText: { minWidth: 310, fontFamily: 'monospace', fontSize: 12, lineHeight: 18, color: colors.slate[900], fontWeight: '500' },
  emptyState: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { fontSize: 13, fontWeight: '800', color: colors.slate[600] },
  emptyText: { textAlign: 'center', fontSize: 11, color: colors.slate[400] },
});
