import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ScrollView } from 'react-native';

const APP_VERSION = '1.0.0';

interface VersionInfo {
  version: string;
  date: string;
  notes: string[];
}

export const MobileUpdateModal: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const checkUpdate = async () => {
      try {
        // Gọi API hoặc file version công khai trên server/Supabase
        const response = await fetch(`https://raw.githubusercontent.com/kennhope13/Titsmart_task/main/web-admin/public/version.json?t=${Date.now()}`);
        if (!response.ok) return;

        const data: VersionInfo = await response.json();
        if (data.version && compareVersions(data.version, APP_VERSION) > 0) {
          setUpdateInfo(data);
          setVisible(true);
        }
      } catch (err) {
        console.warn('[MobileUpdateModal] Check update failed:', err);
      }
    };

    checkUpdate();
  }, []);

  const compareVersions = (v1: string, v2: string): number => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }
    return 0;
  };

  const handleOpenStore = () => {
    // Mở trang Releases trên GitHub hoặc Google Play Store để tải APK mới
    Linking.openURL('https://github.com/kennhope13/Titsmart_task/releases/latest');
    setVisible(false);
  };

  if (!visible || !updateInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>🚀 Có phiên bản mới ({updateInfo.version})</Text>
          </View>
          <Text style={styles.subTitle}>Tính năng & cải tiến mới nhất:</Text>
          <ScrollView style={styles.notesList}>
            {updateInfo.notes.map((note, index) => (
              <Text key={index} style={styles.noteItem}>
                • {note}
              </Text>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.skipButton} onPress={() => setVisible(false)}>
              <Text style={styles.skipText}>Để sau</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.updateButton} onPress={handleOpenStore}>
              <Text style={styles.updateText}>Cập nhật ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  notesList: {
    maxHeight: 140,
    marginBottom: 16,
  },
  noteItem: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  skipText: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 14,
  },
  updateButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#00236f',
  },
  updateText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
