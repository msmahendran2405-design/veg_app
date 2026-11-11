import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import VegetablePicker from '../components/VegetablePicker';
import { addSaleEntry, getInventory } from '../utils/database';
import { formatCurrency } from '../utils/helpers';
import { COLORS, VEGETABLES } from '../utils/constants';

export default function SalesModal() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inventory, setInventory] = useState([]);

  // Form state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedVeg, setSelectedVeg] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [sellPrice, setSellPrice] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const inv = await getInventory();
      setInventory(inv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVegSelect = (veg) => {
    setSelectedVeg(veg);
    const invItem = inventory.find((i) => i.Vegetable === veg.name);
    if (invItem && invItem.AvgSellPrice) {
      setSellPrice(String(parseFloat(invItem.AvgSellPrice).toFixed(2)));
    }
  };

  const getStock = () => {
    if (!selectedVeg) return 0;
    const invItem = inventory.find((i) => i.Vegetable === selectedVeg.name);
    return invItem ? parseFloat(invItem.CurrentStock_kg) || 0 : 0;
  };

  const getCostPrice = () => {
    if (!selectedVeg) return 0;
    const invItem = inventory.find((i) => i.Vegetable === selectedVeg.name);
    return invItem ? parseFloat(invItem.AvgBuyPrice) || 0 : 0;
  };

  const qty = parseFloat(quantity) || 0;
  const sell = parseFloat(sellPrice) || 0;
  const cost = getCostPrice();
  const totalAmount = (qty * sell).toFixed(2);
  const profit = ((sell - cost) * qty).toFixed(2);
  const availableStock = getStock();

  const handleSave = async () => {
    if (!selectedVeg) return Alert.alert('Error', 'Please select a vegetable');
    if (!quantity || qty <= 0) return Alert.alert('Error', 'Please enter a valid quantity');
    if (!sellPrice || sell <= 0) return Alert.alert('Error', 'Please enter a valid selling price');
    if (qty > availableStock && availableStock > 0) {
      return Alert.alert('Insufficient Stock', `Only ${availableStock.toFixed(1)} kg of ${selectedVeg.name} available.`);
    }

    setSaving(true);
    try {
      await addSaleEntry({
        vegetable: selectedVeg.name,
        quantity: qty,
        sellPrice: sell,
        date: new Date(),
      });
      Alert.alert('Sale Recorded ✅', `${qty} kg of ${selectedVeg.name} sold for ${formatCurrency(totalAmount)}`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Failed to save sale entry. Please try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Build picker items from inventory (only vegetables with stock)
  const inventoryVegs = inventory
    .filter((i) => parseFloat(i.CurrentStock_kg) > 0)
    .map((i) => {
      const veg = VEGETABLES.find((v) => v.name === i.Vegetable);
      return { name: i.Vegetable, emoji: veg ? veg.emoji : '🥬' };
    });

  const pickerItems = inventoryVegs.length > 0 ? inventoryVegs : VEGETABLES;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛒 Record Sale</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        {/* Vegetable Picker */}
        <Text style={styles.formLabel}>Vegetable</Text>
        <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerVisible(true)}>
          {selectedVeg ? (
            <View style={styles.selectedVeg}>
              <Text style={styles.selectedEmoji}>{selectedVeg.emoji}</Text>
              <View>
                <Text style={styles.selectedName}>{selectedVeg.name}</Text>
                {availableStock > 0 && (
                  <Text style={styles.stockInfo}>Available: {availableStock.toFixed(1)} kg</Text>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.pickerPlaceholder}>Select a vegetable...</Text>
          )}
          <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <FormInput
          label="Quantity Sold"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity sold"
          keyboardType="decimal-pad"
          suffix="kg"
        />

        <FormInput
          label="Selling Price (per kg)"
          value={sellPrice}
          onChangeText={setSellPrice}
          placeholder="Enter selling price"
          keyboardType="decimal-pad"
          prefix="₹"
        />

        {/* Auto-calculated Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>💰 Sale Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Cost Price (per kg):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(cost)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sell Price (per kg):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(sell)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount:</Text>
            <Text style={[styles.summaryValueBig, { color: '#1565C0' }]}>{formatCurrency(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Profit:</Text>
            <Text
              style={[styles.summaryValueBig, { color: parseFloat(profit) >= 0 ? COLORS.success : COLORS.error }]}
            >
              {formatCurrency(profit)}
            </Text>
          </View>
          {parseFloat(profit) > 0 && qty > 0 && (
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>
                Margin: {((parseFloat(profit) / parseFloat(totalAmount)) * 100).toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Stock warning */}
        {selectedVeg && qty > availableStock && availableStock > 0 && (
          <View style={styles.warningCard}>
            <Feather name="alert-triangle" size={18} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Quantity exceeds available stock ({availableStock.toFixed(1)} kg)
            </Text>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="#FFF" />
              <Text style={styles.saveButtonText}>Confirm Sale</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <VegetablePicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleVegSelect}
        items={pickerItems}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  formContainer: {
    padding: 16,
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
    fontSize: 26,
    marginRight: 12,
  },
  selectedName: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  stockInfo: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 2,
  },
  pickerPlaceholder: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  summaryCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
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
    fontWeight: '600',
    color: COLORS.text,
  },
  summaryValueBig: {
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#90CAF9',
    marginVertical: 8,
  },
  marginBadge: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.success + '18',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  marginText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning + '18',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.warning + '30',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1565C0',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
