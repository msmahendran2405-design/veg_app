import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import StatCard from '../components/StatCard';
import { getDashboardStats } from '../utils/database';
import { formatCurrency } from '../utils/helpers';
import { COLORS, VEGETABLES } from '../utils/constants';

const screenWidth = Dimensions.get('window').width;

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getEmoji = (name) => {
    const veg = VEGETABLES.find((v) => v.name === name);
    return veg ? veg.emoji : '🥬';
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  const chartData = {
    labels: stats?.weekDays || [],
    datasets: [
      {
        data: stats?.weeklyProfit?.length ? stats.weeklyProfit.map((v) => (v === 0 ? 0.1 : v)) : [0.1],
      },
    ],
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
    >
      {/* Date Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>📅 {dateStr}</Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            icon="trending-up"
            label="Today's Sales"
            value={formatCurrency(stats?.totalSales || 0)}
            color={COLORS.success}
          />
          <StatCard
            icon="alert-triangle"
            label="Today's Wastage"
            value={formatCurrency(stats?.totalWastage || 0)}
            color={COLORS.error}
          />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            icon="dollar-sign"
            label="Today's Profit"
            value={formatCurrency(stats?.totalProfit || 0)}
            color={(stats?.totalProfit || 0) >= 0 ? COLORS.success : COLORS.error}
          />
          <StatCard
            icon="alert-circle"
            label="Low Stock Items"
            value={String(stats?.lowStockItems || 0)}
            color={COLORS.warning}
            subtitle="Below 5 kg"
          />
        </View>
      </View>

      {/* Weekly Profit Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>📊 Weekly Profit Trend</Text>
        {stats?.weeklyProfit?.some((v) => v !== 0) ? (
          <BarChart
            data={chartData}
            width={screenWidth - 48}
            height={200}
            yAxisLabel="₹"
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: COLORS.card,
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
              labelColor: () => COLORS.textSecondary,
              style: { borderRadius: 12 },
              barPercentage: 0.6,
              propsForBackgroundLines: {
                strokeDasharray: '',
                stroke: COLORS.border,
              },
            }}
            style={styles.chart}
            fromZero
            showValuesOnTopOfBars
          />
        ) : (
          <View style={styles.emptyChart}>
            <Feather name="bar-chart-2" size={40} color={COLORS.border} />
            <Text style={styles.emptyChartText}>No sales data yet</Text>
            <Text style={styles.emptyChartSub}>Start recording sales to see trends</Text>
          </View>
        )}
      </View>

      {/* Top Wastage Items */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚠️ Top Wastage Items</Text>
        {stats?.topWastage?.length > 0 ? (
          stats.topWastage.map((item, idx) => (
            <View key={item.name} style={styles.wastageItem}>
              <View style={styles.wastageRank}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>
              <Text style={styles.wastageEmoji}>{getEmoji(item.name)}</Text>
              <Text style={styles.wastageName}>{item.name}</Text>
              <Text style={styles.wastageAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptySection}>
            <Text style={styles.emptySectionText}>No wastage recorded yet ✨</Text>
          </View>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitleStandalone}>⚡ Quick Actions</Text>
      
      {/* AI Scanner Banner Button */}
      <TouchableOpacity
        style={styles.aiBannerBtn}
        onPress={() => router.push('/ai-scanner')}
      >
        <View style={styles.aiBannerLeft}>
          <Feather name="camera" size={24} color="#FFF" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.aiBannerTitle}>📸 Scan Handwritten Slip with AI</Text>
            <Text style={styles.aiBannerSub}>Take a photo of paper note or mandi bill (NVIDIA NIM)</Text>
          </View>
        </View>
        <Feather name="arrow-right" size={20} color="#FFF" />
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
          onPress={() => router.push('/stock')}
        >
          <Feather name="plus-circle" size={20} color="#FFF" />
          <Text style={styles.actionText}>Add Stock</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#1565C0' }]}
          onPress={() => router.push('/sales-modal')}
        >
          <Feather name="shopping-cart" size={20} color="#FFF" />
          <Text style={styles.actionText}>Record Sale</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: COLORS.error }]}
          onPress={() => router.push('/wastage')}
        >
          <Feather name="trash-2" size={20} color="#FFF" />
          <Text style={styles.actionText}>Wastage</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  dateHeader: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  statsGrid: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  chart: {
    borderRadius: 12,
    marginTop: 4,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyChartText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 10,
    fontWeight: '600',
  },
  emptyChartSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  wastageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wastageRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.error + '18',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.error,
  },
  wastageEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  wastageName: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  wastageAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.error,
  },
  emptySection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sectionTitleStandalone: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  aiBannerBtn: {
    backgroundColor: '#1B5E20',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  aiBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiBannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  aiBannerSub: {
    color: '#E8F5E9',
    fontSize: 11,
    marginTop: 2,
  },
});
