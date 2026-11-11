import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import VegetablePicker from '../components/VegetablePicker';
import { addStockEntry, getStockEntries, getInventory } from '../utils/database';
import { formatCurrency, formatDate } from '../utils/helpers';
import { COLORS, VEGETABLES } from '../utils/constants';

export default function StockScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('add');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedVeg, setSelectedVeg] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [supplier, setSupplier] = useState('');

  // List state
  const [stockList, setStockList] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadStockData = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, inv] = await Promise.all([getStockEntries(), getInventory()]);
      setStockList(entries.reverse());
      setInventory(inv);
    } catch (err) {
      console.error('Load stock error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'list') {
        loadStockData();
      }
    }, [activeTab, loadStockData])
  );

  const resetForm = () => {
    setSelectedVeg(null);
    setQuantity('');
    setBuyPrice('');
    setSellPrice('');
    setSupplier('');
  };

  const handleSave = async () => {
    if (!selectedVeg) return Alert.alert('Error', 'Please select a vegetable');
    if (!quantity || parseFloat(quantity) <= 0) return Alert.alert('Error', 'Please enter a valid quantity');
    if (!buyPrice || parseFloat(buyPrice) <= 0) return Alert.alert('Error', 'Please enter a valid purchase price');
    if (!sellPrice || parseFloat(sellPrice) <= 0) return Alert.alert('Error', 'Please enter a valid selling price');

    setSaving(true);
    try {
      await addStockEntry({
        vegetable: selectedVeg.name,
        quantity: parseFloat(quantity),
        buyPrice: parseFloat(buyPrice),
        sellPrice: parseFloat(sellPrice),
        supplier,
        date: new Date(),
      });
      Alert.alert('Success ✅', `${selectedVeg.name} stock added successfully!`);
      resetForm();
    } catch (err) {
      Alert.alert('Error', 'Failed to save stock entry. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const totalCost = quantity && buyPrice ? (parseFloat(quantity) * parseFloat(buyPrice)).toFixed(2) : '0.00';
  const expectedRevenue = quantity && sellPrice ? (parseFloat(quantity) * parseFloat(sellPrice)).toFixed(2) : '0.00';

  const filteredStock = searchQuery
    ? stockList.filter((item) => item.Vegetable?.toLowerCase().includes(searchQuery.toLowerCase()))
    : stockList;

  const getEmoji = (name) => {
    const veg = VEGETABLES.find((v) => v.name === name);
    return veg ? veg.emoji : '🥬';
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Feather name="plus-circle" size={16} color={activeTab === 'add' ? '#FFF' : COLORS.primary} />
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>Add Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.activeTab]}
          onPress={() => {
            setActiveTab('list');
            loadStockData();
          }}
        >
          <Feather name="list" size={16} color={activeTab === 'list' ? '#FFF' : COLORS.primary} />
          <Text style={[styles.tabText, activeTab === 'list' && styles.activeTabText]}>Stock List</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'add' ? (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          {/* Vegetable Picker */}
          <Text style={styles.formLabel}>Vegetable</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerVisible(true)}>
            {selectedVeg ? (
              <View style={styles.selectedVeg}>
                <Text style={styles.selectedEmoji}>{selectedVeg.emoji}</Text>
                <Text style={styles.selectedName}>{selectedVeg.name}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select a vegetable...</Text>
            )}
            <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <FormInput
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter quantity"
            keyboardType="decimal-pad"
            suffix="kg"
          />

          <FormInput
            label="Purchase Price (per kg)"
            value={buyPrice}
            onChangeText={setBuyPrice}
            placeholder="Enter buy price"
            keyboardType="decimal-pad"
            prefix="₹"
          />

          <FormInput
            label="Selling Price (per kg)"
            value={sellPrice}
            onChangeText={setSellPrice}
            placeholder="Enter sell price"
            keyboardType="decimal-pad"
            prefix="₹"
          />

          <FormInput
            label="Supplier Name (optional)"
            value={supplier}
            onChangeText={setSupplier}
            placeholder="Enter supplier name"
          />

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📋 Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Cost:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.error }]}>{formatCurrency(totalCost)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expected Revenue:</Text>
              <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(expectedRevenue)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Expected Profit:</Text>
              <Text
                style={[
                  styles.summaryValue,
                  { color: expectedRevenue - totalCost >= 0 ? COLORS.success : COLORS.error },
                ]}
              >
                {formatCurrency((parseFloat(expectedRevenue) - parseFloat(totalCost)).toFixed(2))}
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Feather name="save" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Save Stock Entry</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Record Sale Quick Action */}
          <TouchableOpacity
            style={styles.saleButton}
            onPress={() => router.push('/sales-modal')}
          >
            <Feather name="shopping-cart" size={20} color="#FFF" />
            <Text style={styles.saveButtonText}>Record a Sale</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Feather name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by vegetable name..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x-circle" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Inventory Summary */}
          {inventory.length > 0 && (
            <View style={styles.inventorySummary}>
              <Text style={styles.inventoryTitle}>📦 Current Inventory</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {inventory
                  .filter((i) => parseFloat(i.CurrentStock_kg) > 0)
                  .map((item) => (
                    <View
                      key={item.Vegetable}
                      style={[
                        styles.invChip,
                        parseFloat(item.CurrentStock_kg) < 5 && styles.invChipLow,
                      ]}
                    >
                      <Text style={styles.invChipEmoji}>{getEmoji(item.Vegetable)}</Text>
                      <Text style={styles.invChipName}>{item.Vegetable}</Text>
                      <Text style={styles.invChipQty}>{parseFloat(item.CurrentStock_kg).toFixed(1)} kg</Text>
                    </View>
                  ))}
              </ScrollView>
            </View>
          )}

          {loading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredStock}
              keyExtractor={(item) => item.ID}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.stockItem}>
                  <View style={styles.stockItemHeader}>
                    <Text style={styles.stockEmoji}>{getEmoji(item.Vegetable)}</Text>
                    <View style={styles.stockItemInfo}>
                      <Text style={styles.stockName}>{item.Vegetable}</Text>
                      <Text style={styles.stockDate}>{item.Date}</Text>
                    </View>
                    <Text style={styles.stockQty}>{item.Quantity_kg} kg</Text>
                  </View>
                  <View style={styles.stockPriceRow}>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Buy</Text>
                      <Text style={styles.priceValue}>₹{item.BuyPrice_per_kg}/kg</Text>
                    </View>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Sell</Text>
                      <Text style={[styles.priceValue, { color: COLORS.success }]}>₹{item.SellPrice_per_kg}/kg</Text>
                    </View>
                    <View style={styles.priceTag}>
                      <Text style={styles.priceLabel}>Total</Text>
                      <Text style={styles.priceValue}>{formatCurrency(item.TotalCost)}</Text>
                    </View>
                  </View>
                  {item.Supplier ? (
                    <Text style={styles.supplierText}>🚚 {item.Supplier}</Text>
                  ) : null}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Feather name="package" size={48} color={COLORS.border} />
                  <Text style={styles.emptyTitle}>No stock entries yet</Text>
                  <Text style={styles.emptySubtitle}>Switch to "Add Stock" tab to add your first entry</Text>
                </View>
              }
            />
          )}
        </View>
      )}

      <VegetablePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={setSelectedVeg}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activeTabText: {
    color: '#FFF',
  },
  formContainer: {
    padding: 16,
    paddingTop: 4,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 14,
    minHeight: 46,
  },
  selectedVeg: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedEmoji: {
    fontSize: 22,
    marginRight: 10,
  },
  selectedName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: COLORS.primaryDark + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 10,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  inventorySummary: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  invChip: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 80,
  },
  invChipLow: {
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warning + '10',
  },
  invChipEmoji: {
    fontSize: 20,
  },
  invChipName: {
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '600',
    marginTop: 2,
  },
  invChipQty: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  listContent: {
    padding: 12,
    paddingTop: 4,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  stockItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stockEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  stockItemInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  stockDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stockQty: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  stockPriceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priceTag: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  supplierText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});
