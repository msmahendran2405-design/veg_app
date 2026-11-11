import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { scanVegetableBillWithNvidiaAI, getNvidiaApiKey, setNvidiaApiKey } from '../utils/aiScanner';
import { addBatchEntries } from '../utils/database';
import { COLORS, VEGETABLES } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';
import VegetablePicker from '../components/VegetablePicker';

export default function AiScannerScreen() {
  const router = useRouter();
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [scanType, setScanType] = useState('auto'); // 'auto' | 'stock' | 'sale' | 'wastage'
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [demoBanner, setDemoBanner] = useState(false);

  // API Key Modal State
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState('');

  // Editing Item State
  const [editIndex, setEditIndex] = useState(null);
  const [vegPickerVisible, setVegPickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const key = await getNvidiaApiKey();
      if (key) {
        setSavedKey(key);
        setApiKeyInput(key);
      }
    })();
  }, []);

  // Request Permissions & Take Photo
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to photograph handwritten receipts.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
        setExtractedItems([]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open camera: ' + e.message);
    }
  };

  // Pick Image from Gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Gallery permission is required to select handwritten notes.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        base64: true,
        quality: 0.7,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
        setExtractedItems([]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not open gallery: ' + e.message);
    }
  };

  // Run Sample Demo Note (works offline/without camera)
  const loadSampleNote = () => {
    setImageUri('https://images.unsplash.com/photo-1542838132-92c53300491e?w=600');
    setImageBase64('sample');
    setLoading(true);
    setTimeout(async () => {
      const res = await scanVegetableBillWithNvidiaAI('', scanType);
      setExtractedItems(res.items || []);
      setDemoBanner(res.demoMode);
      setLoading(false);
    }, 900);
  };

  // Scan with NVIDIA AI
  const handleScan = async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please capture or select a handwritten receipt photo first.');
      return;
    }

    setLoading(true);
    setDemoBanner(false);
    try {
      const res = await scanVegetableBillWithNvidiaAI(imageBase64, scanType);
      if (res.success) {
        setExtractedItems(res.items || []);
        setDemoBanner(res.demoMode);
        if (res.demoMode) {
          Alert.alert(
            'NVIDIA Demo Results 🤖',
            'Sample handwritten bill items extracted! Add your free NVIDIA API Key in "AI Key" to connect your live cloud model.'
          );
        } else {
          Alert.alert('Success ✅', `NVIDIA AI detected ${res.items.length} items from your photo!`);
        }
      } else {
        Alert.alert('Scan Failed', res.error || 'Could not parse image.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save extracted items to Excel Database
  const handleSaveToExcel = async () => {
    if (extractedItems.length === 0) {
      Alert.alert('Nothing to save', 'Extract some items first.');
      return;
    }

    try {
      setLoading(true);
      await addBatchEntries(extractedItems);
      setLoading(false);

      Alert.alert(
        'Saved to Excel! 📊',
        `${extractedItems.length} records added directly to your Excel sheets (Stock, Sales, Wastage & Inventory).`,
        [
          {
            text: 'Go to Dashboard',
            onPress: () => router.push('/'),
          },
          {
            text: 'Scan Another',
            onPress: () => {
              setExtractedItems([]);
              setImageUri(null);
              setImageBase64(null);
            },
          },
        ]
      );
    } catch (e) {
      setLoading(false);
      Alert.alert('Save Error', 'Failed to save entries to Excel: ' + e.message);
    }
  };

  const handleSaveKey = async () => {
    await setNvidiaApiKey(apiKeyInput);
    setSavedKey(apiKeyInput.trim());
    setKeyModalVisible(false);
    Alert.alert('Key Saved', 'NVIDIA NIM API key updated successfully.');
  };

  const removeItem = (idx) => {
    setExtractedItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItemField = (idx, field, val) => {
    setExtractedItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'quantity_kg' || field === 'price_per_kg') {
        const q = parseFloat(field === 'quantity_kg' ? val : next[idx].quantity_kg) || 0;
        const p = parseFloat(field === 'price_per_kg' ? val : next[idx].price_per_kg) || 0;
        next[idx].total = parseFloat((q * p).toFixed(2));
      }
      return next;
    });
  };

  const getVegEmoji = (name) => {
    const v = VEGETABLES.find((veg) => veg.name.toLowerCase() === (name || '').toLowerCase());
    return v ? v.emoji : '🥬';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Top Banner & AI Setup */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>📸 AI Handwritten Bill Scanner</Text>
          <Text style={styles.headerSubtitle}>Powered by NVIDIA Vision AI (NIM)</Text>
        </View>
        <TouchableOpacity style={styles.keyButton} onPress={() => setKeyModalVisible(true)}>
          <Ionicons name="key" size={16} color={savedKey ? '#2E7D32' : '#F57C00'} />
          <Text style={[styles.keyButtonText, { color: savedKey ? '#2E7D32' : '#F57C00' }]}>
            {savedKey ? 'NVIDIA Connected' : 'Set AI Key'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Mode Selector */}
      <View style={styles.modeSection}>
        <Text style={styles.sectionLabel}>Scan Context / Target Sheet:</Text>
        <View style={styles.modeRow}>
          {[
            { id: 'auto', label: '🤖 Auto Detect' },
            { id: 'stock', label: '📦 Mandi Stock' },
            { id: 'sale', label: '💰 Customer Sales' },
            { id: 'wastage', label: '🗑️ Wastage' },
          ].map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modePill, scanType === m.id && styles.modePillActive]}
              onPress={() => setScanType(m.id)}
            >
              <Text style={[styles.modePillText, scanType === m.id && styles.modePillTextActive]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Photo Capture Section */}
      <View style={styles.captureCard}>
        {imageUri ? (
          <View style={styles.imagePreviewWrap}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => {
                setImageUri(null);
                setImageBase64(null);
                setExtractedItems([]);
              }}
            >
              <Ionicons name="close-circle" size={26} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderWrap}>
            <MaterialCommunityIcons name="note-text-outline" size={54} color={COLORS.textSecondary} />
            <Text style={styles.placeholderTitle}>Photograph your handwritten notebook or bill</Text>
            <Text style={styles.placeholderSub}>
              Write: "Tomato 10kg 30, Onion 25kg 28..." on paper and snap a photo!
            </Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.primary }]} onPress={takePhoto}>
            <Ionicons name="camera" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1976D2' }]} onPress={pickImage}>
            <Ionicons name="images" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7B1FA2' }]} onPress={loadSampleNote}>
            <Ionicons name="sparkles" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Sample Note</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <TouchableOpacity
            style={[styles.scanTriggerBtn, loading && { opacity: 0.6 }]}
            onPress={handleScan}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="robot" size={22} color="#FFF" />
                <Text style={styles.scanTriggerText}>Extract with NVIDIA AI</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Demo Mode Notice */}
      {demoBanner && (
        <View style={styles.demoNotice}>
          <Ionicons name="information-circle" size={20} color="#E65100" />
          <Text style={styles.demoNoticeText}>
            Showing simulated extraction. For 100% live cloud vision from your camera photos, tap "Set AI Key" above to paste your free NVIDIA NIM API key!
          </Text>
        </View>
      )}

      {/* Extracted Items Review Table */}
      {extractedItems.length > 0 && (
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              📋 Extracted Items ({extractedItems.length})
            </Text>
            <Text style={styles.resultsSubtitle}>Verify or edit details before saving to Excel</Text>
          </View>

          {extractedItems.map((item, index) => {
            const isStock = item.type === 'stock';
            const isSale = item.type === 'sale';
            const typeColor = isStock ? COLORS.primary : isSale ? '#1976D2' : COLORS.error;
            const typeLabel = isStock ? 'Stock 📦' : isSale ? 'Sale 💰' : 'Wastage 🗑️';

            return (
              <View key={item.id || index} style={styles.itemRowCard}>
                <View style={styles.itemRowHeader}>
                  <TouchableOpacity
                    style={styles.itemVegBtn}
                    onPress={() => {
                      setEditIndex(index);
                      setVegPickerVisible(true);
                    }}
                  >
                    <Text style={styles.itemEmoji}>{getVegEmoji(item.vegetable)}</Text>
                    <Text style={styles.itemVegName}>{item.vegetable}</Text>
                    <Ionicons name="pencil" size={14} color={COLORS.textSecondary} />
                  </TouchableOpacity>

                  <View style={[styles.typeTag, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[styles.typeTagText, { color: typeColor }]}>{typeLabel}</Text>
                  </View>

                  <TouchableOpacity onPress={() => removeItem(index)} style={{ padding: 4 }}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>

                {/* Editable Fields */}
                <View style={styles.inputsGrid}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Quantity (kg)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      keyboardType="numeric"
                      value={String(item.quantity_kg || '')}
                      onChangeText={(v) => updateItemField(index, 'quantity_kg', v)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Price / kg (₹)</Text>
                    <TextInput
                      style={styles.fieldInput}
                      keyboardType="numeric"
                      value={String(item.price_per_kg || '')}
                      onChangeText={(v) => updateItemField(index, 'price_per_kg', v)}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldLabel}>Total</Text>
                    <View style={styles.fieldTotalBox}>
                      <Text style={styles.fieldTotalText}>{formatCurrency(item.total || 0)}</Text>
                    </View>
                  </View>
                </View>

                {item.type === 'wastage' && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={styles.fieldLabel}>Reason for waste:</Text>
                    <TextInput
                      style={[styles.fieldInput, { height: 34 }]}
                      placeholder="e.g. Rotten / Spoiled"
                      value={item.reason}
                      onChangeText={(v) => updateItemField(index, 'reason', v)}
                    />
                  </View>
                )}
              </View>
            );
          })}

          {/* Save to Excel Button */}
          <TouchableOpacity
            style={[styles.saveExcelBtn, loading && { opacity: 0.6 }]}
            onPress={handleSaveToExcel}
            disabled={loading}
          >
            <Ionicons name="save" size={22} color="#FFF" />
            <Text style={styles.saveExcelBtnText}>Save All to Excel Database 📊</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* NVIDIA API Key Modal */}
      <Modal visible={keyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔑 NVIDIA AI Settings</Text>
              <TouchableOpacity onPress={() => setKeyModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalText}>
              Get 1000 free inference credits on NVIDIA NIM:
            </Text>
            <Text style={styles.modalStep}>1. Visit <Text style={{ color: '#1976D2' }}>https://build.nvidia.com</Text></Text>
            <Text style={styles.modalStep}>2. Sign up and grab your API key</Text>
            <Text style={styles.modalStep}>3. Model: <Text style={{ fontWeight: 'bold' }}>meta/llama-3.2-11b-vision-instruct</Text></Text>

            <TextInput
              style={styles.keyInput}
              placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={false}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#E0E0E0' }]}
                onPress={() => setKeyModalVisible(false)}
              >
                <Text style={{ color: COLORS.text, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: COLORS.primary }]}
                onPress={handleSaveKey}
              >
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Save Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vegetable Picker */}
      <VegetablePicker
        visible={vegPickerVisible}
        onClose={() => setVegPickerVisible(false)}
        onSelect={(veg) => {
          if (editIndex !== null) {
            updateItemField(editIndex, 'vegetable', veg.name);
          }
          setVegPickerVisible(false);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  keyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  keyButtonText: { fontSize: 11, fontWeight: 'bold' },
  modeSection: { paddingHorizontal: 16, marginTop: 6, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modePillActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modePillText: { fontSize: 12, color: COLORS.text, fontWeight: '500' },
  modePillTextActive: { color: '#FFF', fontWeight: 'bold' },
  captureCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  placeholderWrap: {
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C8E6C9',
    borderStyle: 'dashed',
    backgroundColor: '#F1F8E9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginBottom: 14,
  },
  placeholderTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginTop: 8, textAlign: 'center' },
  placeholderSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  imagePreviewWrap: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
  },
  previewImage: { width: '100%', height: '100%' },
  retakeBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  btnRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  scanTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanTriggerText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  demoNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  demoNoticeText: { flex: 1, fontSize: 11, color: '#E65100', lineHeight: 16 },
  resultsCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  resultsHeader: { marginBottom: 12 },
  resultsTitle: { fontSize: 15, fontWeight: 'bold', color: COLORS.text },
  resultsSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemRowCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemRowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  itemVegBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemEmoji: { fontSize: 20 },
  itemVegName: { fontSize: 14, fontWeight: 'bold', color: COLORS.text },
  typeTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeTagText: { fontSize: 11, fontWeight: 'bold' },
  inputsGrid: { flexDirection: 'row', gap: 8 },
  inputGroup: { flex: 1 },
  fieldLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  fieldInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    color: COLORS.text,
  },
  fieldTotalBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldTotalText: { fontSize: 12, fontWeight: 'bold', color: COLORS.primary },
  saveExcelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  saveExcelBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  modalText: { fontSize: 13, color: COLORS.text, marginBottom: 6 },
  modalStep: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  keyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 16,
    fontSize: 13,
  },
  modalBtnRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
});
