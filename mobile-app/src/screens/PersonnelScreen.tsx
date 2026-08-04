import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Lock, MoreVertical, Plus, Search, Unlock, UsersRound, X } from 'lucide-react-native';
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
  const [email, setEmail] = useState('');

  const people = useMemo(() => {
    return engineers.map((item, index) => ({
      ...item,
      code: `NV-${String(index + 1).padStart(3, '0')}`,
      role: index < 2 ? 'Quản lý' : 'Nhân viên',
      team: index % 2 === 0 ? 'Đội thi công 1' : 'Đội bảo trì',
      locked: lockedIds.includes(item.id),
    })).filter((item) => {
      const matchesQuery = !query.trim() || `${cleanText(item.name)} ${item.code} ${item.phone}`.toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === 'all' || filter === item.role.toLowerCase().replace('nhân viên', 'worker').replace('quản lý', 'manager') || (filter === 'locked' && item.locked);
      return matchesQuery && matchesFilter;
    }).slice(0, 120);
  }, [engineers, filter, lockedIds, query]);

  const addPerson = () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ tên nhân sự.');
      return;
    }
    addEngineer({
      name: name.trim(),
      title: 'Nhân viên hiện trường',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', // Premium dummy photo
      phone: phone.trim(),
      email: email.trim() || `${cleanText(name).toLowerCase().replace(/\s+/g, '')}@titsmart.vn`,
    });
    setName('');
    setPhone('');
    setEmail('');
    setShowForm(false);
    Alert.alert('Thành công', 'Đã thêm nhân sự vào hệ thống.');
  };

  const toggleLock = (id: string) => {
    setLockedIds((current) => {
      const exists = current.includes(id);
      if (exists) {
        Alert.alert('Mở khóa', 'Đã mở khóa tài khoản thành viên.');
        return current.filter((item) => item !== id);
      } else {
        Alert.alert('Khóa tài khoản', 'Tài khoản đã được đưa vào danh sách tạm dừng.');
        return [...current, id];
      }
    });
  };

  const renderPerson = useCallback(({ item: person }: { item: any }) => (
    <Card style={[styles.personCard, person.locked && { borderColor: colors.danger, borderLeftWidth: 3 }]}>
      <View style={styles.personTop}>
        <Image source={{ uri: person.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80' }} style={styles.avatar} />
        <View style={styles.personCopy}>
          <AppText style={styles.name}>{person.name}</AppText>
          <View style={styles.roleBadgeRow}>
            <AppText style={styles.codeText}>{person.code}</AppText>
            <View style={styles.bulletSeparator} />
            <AppText style={styles.roleText}>{person.role}</AppText>
          </View>
        </View>
        <Pressable style={styles.moreButton}>
          <MoreVertical size={16} color={colors.slate[400]} />
        </Pressable>
      </View>
      
      <View style={styles.infoStrip}>
        <View style={styles.infoCell}>
          <AppText style={styles.infoLabel}>Đội/Nhóm</AppText>
          <AppText style={styles.infoValue}>{person.team}</AppText>
        </View>
        <View style={[styles.infoCell, { borderLeftWidth: 1, borderLeftColor: colors.slate[200], paddingLeft: 12 }]}>
          <AppText style={styles.infoLabel}>Điện thoại</AppText>
          <AppText style={styles.infoValue}>{person.phone || 'Chưa cập nhật'}</AppText>
        </View>
      </View>
      
      <View style={styles.bottomRow}>
        <StatusBadge
          label={person.locked ? 'Đã khóa' : 'Hoạt động'}
          tone={person.locked ? 'red' : 'green'}
        />
        <Pressable
          onPress={() => toggleLock(person.id)}
          style={({ pressed }) => [
            styles.lockButton,
            person.locked ? styles.lockButtonActive : undefined,
            pressed && { opacity: 0.85 }
          ]}
        >
          {person.locked ? (
            <>
              <Unlock size={13} color={colors.primary} />
              <AppText style={styles.lockText}>Mở khóa</AppText>
            </>
          ) : (
            <>
              <Lock size={13} color={colors.danger} />
              <AppText style={[styles.lockText, { color: colors.danger }]}>Khóa</AppText>
            </>
          )}
        </Pressable>
      </View>
    </Card>
  ), [lockedIds]);

  const header = (
    <>
      <ScreenHeader
        icon={<UsersRound size={21} color={colors.primary} />}
        title="Nhân sự"
        subtitle="Quản lý thông tin và tài khoản kỹ sư, giám sát hiện trường"
        action={
          <Pressable onPress={() => setShowForm((v) => !v)} style={styles.addButton}>
            {showForm ? <X size={19} color={colors.white} /> : <Plus size={19} color={colors.white} />}
          </Pressable>
        }
      />
      {showForm ? (
        <Card style={styles.formCard}>
          <AppText style={styles.formTitle}>Thêm thành viên mới</AppText>
          <TextInput value={name} onChangeText={setName} placeholder="Họ và tên *" placeholderTextColor={colors.slate[400]} style={styles.input} />
          <TextInput value={phone} onChangeText={setPhone} placeholder="Số điện thoại" placeholderTextColor={colors.slate[400]} keyboardType="phone-pad" style={styles.input} />
          <TextInput value={email} onChangeText={setEmail} placeholder="Địa chỉ Email" placeholderTextColor={colors.slate[400]} keyboardType="email-address" style={styles.input} />
          <Pressable onPress={addPerson} style={styles.saveButton}>
            <AppText style={styles.saveText}>Thêm vào danh sách</AppText>
          </Pressable>
        </Card>
      ) : null}
      
      {/* Search & Filter bar */}
      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput value={query} onChangeText={setQuery} placeholder="Tìm tên, mã nhân sự, số điện thoại..." placeholderTextColor={colors.slate[400]} style={styles.searchInput} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow} keyboardShouldPersistTaps="handled">
          {filters.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[styles.filterChip, filter === item.key ? styles.filterChipActive : undefined]}
            >
              <AppText style={[styles.filterText, filter === item.key ? styles.filterTextActive : undefined]}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <SectionTitle title="Danh sách nhân sự" caption={`${people.length} kết quả`} />
    </>
  );

  return (
    <Screen style={styles.container}>
      <FlatList
        data={people}
        keyExtractor={(item) => item.id}
        renderItem={renderPerson}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Card style={styles.emptyCard}><AppText style={styles.empty}>Không tìm thấy nhân sự phù hợp.</AppText></Card>
          </View>
        }
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slate[50] },
  content: { paddingBottom: 28 },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  formCard: { margin: 16, marginBottom: 0, gap: 10, backgroundColor: colors.white },
  formTitle: { fontSize: 13, fontWeight: '800', color: colors.primary, textTransform: 'uppercase' },
  input: { height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.slate[200], backgroundColor: colors.slate[50], paddingHorizontal: 12, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  saveButton: { height: 44, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  
  toolbar: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchBox: { height: 44, borderRadius: 12, backgroundColor: colors.slate[50], borderWidth: 1, borderColor: colors.slate[200], paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, fontSize: 13, color: colors.slate[800], fontWeight: '500' },
  filterRow: { gap: 8, paddingTop: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.slate[100], borderWidth: 1, borderColor: colors.slate[200] },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.slate[600] },
  filterTextActive: { color: colors.white },
  
  emptyWrap: { paddingHorizontal: 16 },
  emptyCard: { padding: 20, alignItems: 'center' },
  empty: { textAlign: 'center', color: colors.slate[400], fontSize: 13, fontStyle: 'italic' },
  
  personCard: { marginHorizontal: 16, marginTop: 10, padding: 14, gap: 12, backgroundColor: colors.white },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.slate[100] },
  personCopy: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '800', color: colors.slate[900] },
  roleBadgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  codeText: { fontSize: 11, fontWeight: '700', color: colors.slate[400] },
  bulletSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.slate[300], marginHorizontal: 8 },
  roleText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  moreButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  
  infoStrip: { flexDirection: 'row', padding: 12, borderRadius: 10, backgroundColor: colors.slate[50], gap: 12, borderWidth: 1, borderColor: colors.slate[100] },
  infoCell: { flex: 1 },
  infoLabel: { fontSize: 10, color: colors.slate[400], fontWeight: '800', textTransform: 'uppercase' },
  infoValue: { marginTop: 3, fontSize: 12, color: colors.slate[800], fontWeight: '700' },
  
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.slate[100], paddingTop: 10 },
  lockButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: colors.slate[50] },
  lockButtonActive: { backgroundColor: '#fee2e2' },
  lockText: { fontSize: 11, color: colors.primary, fontWeight: '800' },
});
