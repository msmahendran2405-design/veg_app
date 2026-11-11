import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../utils/constants';

export default function StatCard({ icon, label, value, color, subtitle }) {
  return (
    <View style={[styles.card, { borderLeftColor: color || COLORS.primary }]}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBg, { backgroundColor: (color || COLORS.primary) + '18' }]}>
          <Feather name={icon} size={22} color={color || COLORS.primary} />
        </View>
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color: color || COLORS.text }]} numberOfLines={1}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    margin: 6,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minWidth: 140,
  },
  iconContainer: {
    marginBottom: 8,
  },
  iconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
