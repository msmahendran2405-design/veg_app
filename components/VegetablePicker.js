import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { VEGETABLES, COLORS } from '../utils/constants';

export default function VegetablePicker({ visible, onClose, onSelect, items }) {
  const [search, setSearch] = useState('');
  const list = items || VEGETABLES;

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((v) => v.name.toLowerCase().includes(q));
  }, [search, list]);

  const handleSelect = (item) => {
    onSelect(item);
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Vegetable</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search vegetables..."
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Feather name="x-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.name}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                <Text style={styles.emoji}>{item.emoji}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Feather name="chevron-right" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No vegetables found</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  closeBtn: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    marginLeft: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 26,
    marginRight: 14,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
