import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Lock, MoreVertical, Plus, Search, Unlock, UsersRound } from 'lucide-react-native';
import { useRealtimeStore } from '../services/realtimeStore';
import { colors } from '../theme';
import { AppText, Card, Screen, ScreenHeader, SectionTitle, StatusBadge } from '../components/MobileUI';
import { cleanText } from '../utils/text';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'worker', label: 'Nhân viên' },
  { key: 'locked', label: 'Đã khóa' },
];

export const PersonnelScreen = () => {
  const { engineers, addEngineer } = useRealtimeStore();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const people = useMemo(() => engineers.map((item, index) => ({
    ...item,
    code: `NV-${String(index + 1).padStart(3, '0')}`,
    role: index < 2 ? 'Quản lý' : 'Nhân viên',
    team: index % 2 === 0 ? 'Đội thi công 1' : 'Đội bảo trì',
    locked: lockedIds.includes(item.id),
  })).filter((item) => {
    const matchesQuery = !query.trim() || `${cleanText(item.name)} ${item.code} ${item.phone}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'all' || filter === item.role.toLowerCase().replace('nhân viên', 'worker').replace('quản lý', 'manager') || (filter === 'locked' && item.locked);
    return matchesQuery && matchesFilter;
  }), [engineers, filter, lockedIds, query]);

  const addPerson = () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên nhân sự.');
      return;
    }
    addEngineer({
      name: name.trim(),
      title: 'Nhân viên',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      phone: phone.trim(),
      email: '',
    });
    setName('');
    setPhone('');
    setShowForm(false);
  };

  const toggleLock = (id: string) => setLockedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <Screen>
      <ScreenHeader
        icon={<UsersRound size={21} color={colors.primary} />}
        title="Nhân sự"
        subtitle={`${engineers.length} người trong hệ thống`}
        action={
          <Pressable onPress={() => setShowForm((value) => !value)} style={styles.addButton}>
            <Plus size={19} color={colors.white} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {showForm ? (
          <Card style={styles.formCard}>
            <AppText style={styles.formTitle}>Thêm nhân sự mới</AppText>
            <TextInput value={name} onChangeText={setName} placeholder="Họ và tên" placeholderTextColor={colors.slate[400]} style={styles.input} />
            <TextInput value={phone} onChangeText={setPhone} placeholder="Số điện thoại" placeholderTextColor={colors.slate[400]} keyboardType="phone-pad" style={styles.input} />
            <Pressable onPress={addPerson} style={styles.saveButton}><AppText style={styles.saveText}>Thêm vào danh sách</AppText></Pressable>
          </Card>
        ) : null}

        <View style={styles.toolbar}>
          <View style={styles.searchBox}>
            <Search size={18} color={colors.slate[400]} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Tìm nhân sự" placeholderTextColor={colors.slate[400]} style={styles.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filters.map((item) => (
              <Pressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filterChip, filter === item.key ? styles.filterChipActive : undefined]}>
                <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>{item.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <SectionTitle title="Danh sách nhân sự" caption={`${people.length} kết quả`} />
        <View style={styles.list}>
          {people.map((person) => (
            <Card key={person.id} style={styles.personCard}>
              <View style={styles.personTop}>
                <Image source={{ uri: person.avatar }} style={styles.avatar} />
                <View style={styles.personCopy}>
                  <AppText style={styles.name}>{person.name}</AppText>
                  <AppText style={styles.meta}>{person.code} · {person.role}</AppText>
                </View>
                <Pressable style={styles.moreButton}><MoreVertical size={19} color={colors.slate[500]} /></Pressable>
              </View>
              <View style={styles.infoStrip}>
                <View style={styles.infoCell}><AppText style={styles.infoLabel}>Đội/Nhóm</AppText><AppText style={styles.infoValue}>{person.team}</AppText></View>
                <View style={styles.infoCell}><AppText style={styles.infoLabel}>Điện thoại</AppText><AppText style={styles.infoValue}>{person.phone || 'Chưa cập nhật'}</AppText></View>
              </View>
              <View style={styles.bottomRow}>
                <StatusBadge label={person.locked ? 'Đã khóa' : 'Đang hoạt động'} tone={person.locked ? 'red' : 'green'} />
                <Pressable onPress={() => toggleLock(person.id)} style={styles.lockButton}>
                  {person.locked ? <Unlock size={14} color={colors.primary} /> : <Lock size={14} color={colors.primary} />}
                  <AppText style={styles.lockText}>{person.locked ? 'Mở khóa' : 'Khóa tài khoản'}</AppText>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  formCard: { margin: 16, marginBottom: 0, gap: 9 },
  formTitle: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  input: { height: 42, borderRadius: 9, borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800] },
  saveButton: { height: 42, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  toolbar: { marginTop: 12, backgroundColor: colors.white, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.slate[200] },
  searchBox: { height: 44, borderRadius: 10, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800] },
  filterRow: { gap: 8, paddingTop: 11 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, backgroundColor: colors.slate[100] },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  list: { paddingHorizontal: 16, gap: 10 },
  personCard: { gap: 12 },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.slate[100] },
  personCopy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  meta: { marginTop: 3, fontSize: 12, color: colors.slate[500] },
  moreButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  infoStrip: { flexDirection: 'row', padding: 10, borderRadius: 9, backgroundColor: colors.slate[50], gap: 8 },
  infoCell: { flex: 1 },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '700' },
  infoValue: { marginTop: 3, fontSize: 11, color: colors.slate[700], fontWeight: '700' },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockButton: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lockText: { fontSize: 11, color: colors.primary, fontWeight: '800' },
});
