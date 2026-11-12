import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FormInput from '../components/FormInput';
import VegetablePicker from '../components/VegetablePicker';
import { addWastageEntry, getWastageEntries, getWastageAnalysis } from '../utils/database';
import { formatCurrency, showAlert } from '../utils/helpers';
import { COLORS, VEGETABLES, WASTAGE_REASONS } from '../utils/constants';

export default function WastageScreen() {
  const [activeTab, setActiveTab] = useState('record');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedVeg, setSelectedVeg] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [showReasonPicker, setShowReasonPicker] = useState(false);

  // List state
  const [wastageList, setWastageList] = useState([]);
  const [analysis, setAnalysis] = useState({ reasonBreakdown: [], vegetableBreakdown: [], totalLoss: 0 });

  const loadWastageData = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, analysisData] = await Promise.all([getWastageEntries(), getWastageAnalysis()]);
      setWastageList(entries.reverse());
      setAnalysis(analysisData);
    } catch (err) {
      console.error('Load wastage error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'log') {
        loadWastageData();
      }
    }, [activeTab, loadWastageData])
  );

  const resetForm = () => {
    setSelectedVeg(null);
    setQuantity('');
    setSelectedReason('');
  };

  const handleSave = async () => {
    if (!selectedVeg) return showAlert('Missing Information', 'Please select a vegetable');
    if (!quantity || parseFloat(quantity) <= 0) return showAlert('Missing Information', 'Please enter a valid quantity');
    if (!selectedReason) return showAlert('Missing Information', 'Please select a reason');

    setSaving(true);
    try {
      await addWastageEntry({
        vegetable: selectedVeg.name,
        quantity: parseFloat(quantity),
        reason: selectedReason,
        date: new Date(),
      });
      showAlert('Recorded ✅', `Wastage for ${selectedVeg.name} recorded successfully.`);
      resetForm();
    } catch (err) {
      showAlert('Error', 'Failed to save wastage entry: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getEmoji = (name) => {
    const veg = VEGETABLES.find((v) => v.name === name);
    return veg ? veg.emoji : '🥬';
  };

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'Spoiled/Rotten': return '#D32F2F';
      case 'Damaged in Transport': return '#F57C00';
      case 'Unsold/Expired': return '#7B1FA2';
      case 'Overstock': return '#1565C0';
      case 'Quality Rejection': return '#C62828';
      default: return COLORS.textSecondary;
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'record' && styles.activeTab]}
          onPress={() => setActiveTab('record')}
        >
          <Feather name="alert-triangle" size={16} color={activeTab === 'record' ? '#FFF' : COLORS.error} />
          <Text style={[styles.tabText, activeTab === 'record' && styles.activeTabText]}>Record Wastage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'log' && styles.activeTab]}
          onPress={() => {
            setActiveTab('log');
            loadWastageData();
          }}
        >
          <Feather name="list" size={16} color={activeTab === 'log' ? '#FFF' : COLORS.error} />
          <Text style={[styles.tabText, activeTab === 'log' && styles.activeTabText]}>Wastage Log</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'record' ? (
        <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
          {/* Vegetable Picker */}
          <Text style={styles.formLabel}>Vegetable</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setPickerVisible(true)}>
            {selectedVeg ? (
              <View style={styles.selectedVeg}>
                <Text style={styles.selectedEmoji}>{selectedVeg.emoji}</Text>
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.selectedName}>{selectedVeg.name}</Text>
                  {selectedVeg.tamilName ? (
                    <Text style={{ fontSize: 12, color: COLORS.error, fontWeight: '500' }}>
                      {selectedVeg.tamilName}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select a vegetable...</Text>
            )}
            <Feather name="chevron-down" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <FormInput
            label="Wasted Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Enter wasted quantity"
            keyboardType="decimal-pad"
            suffix="kg"
          />

          {/* Reason Picker */}
          <Text style={styles.formLabel}>Reason for Wastage</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setShowReasonPicker(!showReasonPicker)}>
            {selectedReason ? (
              <View style={styles.selectedVeg}>
                <View style={[styles.reasonDot, { backgroundColor: getReasonColor(selectedReason) }]} />
                <Text style={styles.selectedName}>{selectedReason}</Text>
              </View>
            ) : (
              <Text style={styles.pickerPlaceholder}>Select a reason...</Text>
            )}
            <Feather name={showReasonPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {showReasonPicker && (
            <View style={styles.reasonList}>
              {WASTAGE_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.reasonItem, selectedReason === reason && styles.reasonItemActive]}
                  onPress={() => {
                    setSelectedReason(reason);
                    setShowReasonPicker(false);
                  }}
                >
                  <View style={[styles.reasonDot, { backgroundColor: getReasonColor(reason) }]} />
                  <Text
                    style={[styles.reasonItemText, selectedReason === reason && styles.reasonItemTextActive]}
                  >
                    {reason}
                  </Text>
                  {selectedReason === reason && <Feather name="check" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Loss Warning */}
          {quantity && parseFloat(quantity) > 0 && (
            <View style={styles.lossCard}>
              <Feather name="alert-triangle" size={20} color={COLORS.error} />
              <View style={styles.lossInfo}>
                <Text style={styles.lossLabel}>Estimated Loss</Text>
                <Text style={styles.lossText}>
                  Loss amount will be calculated based on the average purchase price from your inventory.
                </Text>
              </View>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Feather name="alert-circle" size={20} color="#FFF" />
                <Text style={styles.saveButtonText}>Record Wastage</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <View style={styles.listContainer}>
          {/* Wastage Breakdown by Reason */}
          {analysis.reasonBreakdown.length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>📊 Wastage by Reason</Text>
              {analysis.reasonBreakdown.map((item) => (
                <View key={item.reason} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <View style={[styles.reasonDot, { backgroundColor: getReasonColor(item.reason) }]} />
                    <Text style={styles.breakdownReason}>{item.reason}</Text>
                    <Text style={styles.breakdownPercent}>{item.percentage}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${item.percentage}%`,
                          backgroundColor: getReasonColor(item.reason),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.breakdownLoss}>{formatCurrency(item.loss)}</Text>
                </View>
              ))}
              <View style={styles.totalLossRow}>
                <Text style={styles.totalLossLabel}>Total Loss:</Text>
                <Text style={styles.totalLossValue}>{formatCurrency(analysis.totalLoss)}</Text>
              </View>
            </View>
          )}

          {loading ? (
            <View style={styles.centerLoader}>
              <ActivityIndicator size="large" color={COLORS.error} />
            </View>
          ) : (
            <FlatList
              data={wastageList}
              keyExtractor={(item) => item.ID}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.wastageItem}>
                  <View style={styles.wastageItemHeader}>
                    <Text style={styles.wastageEmoji}>{getEmoji(item.Vegetable)}</Text>
                    <View style={styles.wastageItemInfo}>
                      <Text style={styles.wastageName}>{item.Vegetable}</Text>
                      <Text style={styles.wastageDate}>{item.Date}</Text>
                    </View>
                    <View style={styles.wastageQtyBadge}>
                      <Text style={styles.wastageQtyText}>{item.WastedQty_kg} kg</Text>
                    </View>
                  </View>
                  <View style={styles.wastageDetails}>
                    <View style={[styles.reasonBadge, { backgroundColor: getReasonColor(item.Reason) + '18' }]}>
                      <Text style={[styles.reasonBadgeText, { color: getReasonColor(item.Reason) }]}>
                        {item.Reason}
                      </Text>
                    </View>
                    <Text style={styles.wastageLoss}>Loss: {formatCurrency(item.LossAmount)}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Feather name="check-circle" size={48} color={COLORS.success} />
                  <Text style={styles.emptyTitle}>No wastage recorded</Text>
                  <Text style={styles.emptySubtitle}>Great! Keep up the good work! 🎉</Text>
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
    borderColor: COLORS.error,
  },
  activeTab: {
    backgroundColor: COLORS.error,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.error,
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
  reasonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  reasonList: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reasonItemActive: {
    backgroundColor: COLORS.primary + '10',
  },
  reasonItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  reasonItemTextActive: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  lossCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.error + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.error + '30',
  },
  lossInfo: {
    flex: 1,
    marginLeft: 12,
  },
  lossLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  lossText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    elevation: 3,
    shadowColor: COLORS.error,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  breakdownCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  breakdownItem: {
    marginBottom: 10,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  breakdownReason: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  breakdownPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownLoss: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  totalLossRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 4,
  },
  totalLossLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalLossValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 12,
    paddingTop: 4,
  },
  wastageItem: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  wastageItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  wastageEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  wastageItemInfo: {
    flex: 1,
  },
  wastageName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  wastageDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  wastageQtyBadge: {
    backgroundColor: COLORS.error + '18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  wastageQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
  },
  wastageDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  reasonBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  wastageLoss: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.error,
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
  },
});
