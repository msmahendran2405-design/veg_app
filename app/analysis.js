import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { getAnalysisData, exportReport, getInventory, getWastageAnalysis } from '../utils/database';
import { COLORS, VEGETABLES } from '../utils/constants';
import { formatCurrency } from '../utils/helpers';

const screenWidth = Dimensions.get('window').width;

export default function AnalysisScreen() {
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly' | 'monthly'
  const [data, setData] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [wastageStats, setWastageStats] = useState({ reasonBreakdown: [], totalWasted: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisData, invData, wStats] = await Promise.all([
        getAnalysisData(period),
        getInventory(),
        getWastageAnalysis(),
      ]);
      setData(analysisData);
      setInventory(invData);
      setWastageStats(wStats);
    } catch (err) {
      console.error('Error loading analysis:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleExport = async () => {
    try {
      setExporting(true);
      await exportReport(period);
    } catch (err) {
      Alert.alert('Export Failed', err.message);
    } finally {
      setExporting(false);
    }
  };

  const getVegEmoji = (name) => {
    const veg = VEGETABLES.find((v) => v.name.toLowerCase() === (name || '').toLowerCase());
    return veg ? veg.emoji : '🥬';
  };

  // Calculations for KPI Cards
  const revenue = data?.totalRevenue || 0;
  const cost = data?.totalCost || 0;
  const wastageLoss = data?.wastageLoss || data?.totalWastageLoss || 0;
  const totalProfit = data?.totalProfit || 0;
  const netProfit = data?.netProfit !== undefined ? data?.netProfit : (totalProfit - wastageLoss);

  // Margin %
  const profitMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '0.0';
  // Wastage % vs Cost
  const wastageRatio = cost > 0 ? ((wastageLoss / cost) * 100).toFixed(1) : '0.0';

  // Chart preparation
  const chartLabels = data?.chartLabels?.length > 0
    ? data.chartLabels
    : data?.trendData?.map((t) => t.date) || [''];
  const revenueTrend = data?.revenueData?.length > 0
    ? data.revenueData
    : data?.trendData?.map((t) => t.revenue) || [0];
  const wastageTrend = data?.wastageData?.length > 0
    ? data.wastageData
    : data?.trendData?.map((t) => t.wastage) || [0];

  // Thin out chart labels to fit screen
  const step = Math.max(1, Math.ceil(chartLabels.length / 6));
  const cleanLabels = chartLabels.map((lbl, idx) => (idx % step === 0 ? lbl.slice(0, 6) : ''));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={[COLORS.primary]} />
      }
    >
      {/* 3-Way Period Selector: Day / Week / Month */}
      <View style={styles.periodCard}>
        <View style={styles.periodTabs}>
          {[
            { id: 'daily', label: '📅 Daily', sub: 'Today Analysis' },
            { id: 'weekly', label: '📆 Weekly', sub: 'Last 7 Days' },
            { id: 'monthly', label: '📊 Monthly', sub: '30 Days P&L' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.periodTab, period === tab.id && styles.periodTabActive]}
              onPress={() => setPeriod(tab.id)}
            >
              <Text style={[styles.periodLabel, period === tab.id && styles.periodLabelActive]}>
                {tab.label}
              </Text>
              <Text style={[styles.periodSub, period === tab.id && styles.periodSubActive]}>
                {tab.sub}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Calculating {period} metrics & wastage ratios...</Text>
        </View>
      ) : (
        <>
          {/* Main Profit & Loss Statement Card */}
          <View style={styles.plStatementCard}>
            <View style={styles.plHeader}>
              <View>
                <Text style={styles.plTitle}>
                  {period === 'daily'
                    ? 'Day Overview'
                    : period === 'weekly'
                    ? 'Weekly Performance'
                    : 'Monthly P&L Statement'}
                </Text>
                <Text style={styles.plDateRange}>
                  {data?.startDate && data?.endDate
                    ? `${data.startDate} → ${data.endDate}`
                    : `Active ${period} snapshot`}
                </Text>
              </View>
              <View style={[styles.marginBadge, { backgroundColor: netProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
                <Text style={[styles.marginText, { color: netProfit >= 0 ? COLORS.success : COLORS.error }]}>
                  {profitMargin}% Margin
                </Text>
              </View>
            </View>

            {/* Financial Grid */}
            <View style={styles.financeGrid}>
              <View style={[styles.financeBox, { backgroundColor: '#E3F2FD' }]}>
                <Text style={styles.financeLabel}>Total Sales</Text>
                <Text style={[styles.financeValue, { color: '#1565C0' }]}>{formatCurrency(revenue)}</Text>
                <Text style={styles.financeSub}>Gross Revenue</Text>
              </View>

              <View style={[styles.financeBox, { backgroundColor: '#FFF3E0' }]}>
                <Text style={styles.financeLabel}>Stock Bought</Text>
                <Text style={[styles.financeValue, { color: '#E65100' }]}>{formatCurrency(cost)}</Text>
                <Text style={styles.financeSub}>Purchase Cost</Text>
              </View>

              <View style={[styles.financeBox, { backgroundColor: '#FFEBEE' }]}>
                <Text style={styles.financeLabel}>Wastage Loss</Text>
                <Text style={[styles.financeValue, { color: COLORS.error }]}>
                  -{formatCurrency(wastageLoss)}
                </Text>
                <Text style={styles.financeSub}>{wastageRatio}% of cost</Text>
              </View>
            </View>

            {/* Net Profit Banner */}
            <View style={[styles.netProfitBanner, { backgroundColor: netProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }]}>
              <View>
                <Text style={styles.netProfitTag}>NET TAKE-HOME PROFIT</Text>
                <Text style={styles.netProfitFormula}>Sales Profit - Wastage Loss</Text>
              </View>
              <Text style={[styles.netProfitAmount, { color: netProfit >= 0 ? COLORS.success : COLORS.error }]}>
                {formatCurrency(netProfit)}
              </Text>
            </View>
          </View>

          {/* Wastage vs Sales Comparison Indicator */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Wastage Impact Analysis</Text>
            <View style={styles.impactRow}>
              <View style={styles.impactCol}>
                <Text style={styles.impactLabel}>Wastage Loss Ratio</Text>
                <Text style={[styles.impactVal, { color: COLORS.error }]}>{wastageRatio}%</Text>
                <Text style={styles.impactDesc}>of bought stock spoiled</Text>
              </View>
              <View style={styles.impactDivider} />
              <View style={styles.impactCol}>
                <Text style={styles.impactLabel}>Net Retained Margin</Text>
                <Text style={[styles.impactVal, { color: COLORS.primary }]}>{profitMargin}%</Text>
                <Text style={styles.impactDesc}>profit after all spoilages</Text>
              </View>
            </View>
          </View>

          {/* Visual Trend Chart */}
          {revenueTrend.length > 1 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                📈 {period === 'weekly' ? '7-Day Revenue vs Wastage' : `${period.toUpperCase()} Trend`}
              </Text>
              <LineChart
                data={{
                  labels: cleanLabels,
                  datasets: [
                    {
                      data: revenueTrend,
                      color: () => '#1976D2',
                      strokeWidth: 2,
                    },
                    {
                      data: wastageTrend,
                      color: () => '#F44336',
                      strokeWidth: 2,
                    },
                  ],
                  legend: ['Revenue (₹)', 'Wastage (₹)'],
                }}
                width={screenWidth - 64}
                height={200}
                fromZero
                chartConfig={{
                  backgroundColor: '#FFF',
                  backgroundGradientFrom: '#FFF',
                  backgroundGradientTo: '#FFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(33, 33, 33, ${opacity})`,
                  labelColor: () => COLORS.textSecondary,
                  propsForDots: { r: '4' },
                  propsForLabels: { fontSize: 9 },
                }}
                bezier
                style={{ borderRadius: 12, marginVertical: 8 }}
              />
            </View>
          )}

          {/* Top Profitable Vegetables Ranking */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Most Profitable Vegetables ({period})</Text>
            {data?.topProfitable && data.topProfitable.length > 0 ? (
              data.topProfitable.map((item, idx) => (
                <View key={item.vegetable || item.name || idx} style={styles.rankRow}>
                  <View style={styles.rankLeft}>
                    <Text style={styles.rankIdx}>#{idx + 1}</Text>
                    <Text style={styles.rankEmoji}>{getVegEmoji(item.vegetable || item.name)}</Text>
                    <Text style={styles.rankName}>{item.vegetable || item.name}</Text>
                  </View>
                  <Text style={[styles.rankValue, { color: COLORS.success }]}>
                    +{formatCurrency(item.profit)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>No sales recorded in this period yet.</Text>
            )}
          </View>

          {/* Top Wasted Vegetables Ranking */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🗑️ Worst Wastage Culprits ({period})</Text>
            {data?.topWasted && data.topWasted.length > 0 ? (
              data.topWasted.map((item, idx) => (
                <View key={item.vegetable || item.name || idx} style={styles.rankRow}>
                  <View style={styles.rankLeft}>
                    <Text style={styles.rankIdx}>#{idx + 1}</Text>
                    <Text style={styles.rankEmoji}>{getVegEmoji(item.vegetable || item.name)}</Text>
                    <View>
                      <Text style={styles.rankName}>{item.vegetable || item.name}</Text>
                      <Text style={styles.rankSub}>{item.qty || item.quantity_kg || 0} kg wasted</Text>
                    </View>
                  </View>
                  <Text style={[styles.rankValue, { color: COLORS.error }]}>
                    -{formatCurrency(item.loss || item.amount || 0)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>Zero wastage logged in this period! Excellent work! 🎉</Text>
            )}
          </View>

          {/* Export to Excel Button */}
          <TouchableOpacity
            style={[styles.exportBtn, exporting && { opacity: 0.6 }]}
            onPress={handleExport}
            disabled={exporting}
          >
            <Feather name="file-text" size={20} color="#FFF" />
            <Text style={styles.exportBtnText}>
              {exporting ? 'Generating Excel...' : `Export ${period.toUpperCase()} Excel Sheet 📥`}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  periodCard: {
    backgroundColor: COLORS.card,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  periodTabs: { flexDirection: 'row', gap: 6 },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodTabActive: { backgroundColor: COLORS.primary },
  periodLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.text, textAlign: 'center' },
  periodLabelActive: { color: '#FFF' },
  periodSub: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  periodSubActive: { color: '#E8F5E9' },
  loadingBox: { padding: 40, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, color: COLORS.textSecondary },
  plStatementCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  plHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  plTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text },
  plDateRange: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  marginBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  marginText: { fontSize: 12, fontWeight: 'bold' },
  financeGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  financeBox: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  financeLabel: { fontSize: 10, color: COLORS.textSecondary, marginBottom: 4 },
  financeValue: { fontSize: 13, fontWeight: 'bold' },
  financeSub: { fontSize: 9, color: COLORS.textSecondary, marginTop: 2 },
  netProfitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
  },
  netProfitTag: { fontSize: 10, fontWeight: 'bold', color: COLORS.textSecondary, letterSpacing: 0.5 },
  netProfitFormula: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  netProfitAmount: { fontSize: 22, fontWeight: 'bold' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 },
  impactRow: { flexDirection: 'row', alignItems: 'center' },
  impactCol: { flex: 1, alignItems: 'center' },
  impactLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  impactVal: { fontSize: 22, fontWeight: 'bold' },
  impactDesc: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  impactDivider: { width: 1, height: 40, backgroundColor: COLORS.border },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rankLeft: { flexDirection: 'row', alignItems: 'center' },
  rankIdx: { fontSize: 12, fontWeight: 'bold', color: COLORS.textSecondary, width: 24 },
  rankEmoji: { fontSize: 20, marginRight: 8 },
  rankName: { fontSize: 13, fontWeight: 'bold', color: COLORS.text },
  rankSub: { fontSize: 11, color: COLORS.textSecondary },
  rankValue: { fontSize: 14, fontWeight: 'bold' },
  emptyNote: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 14 },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 18,
    gap: 8,
  },
  exportBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
