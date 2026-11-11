import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { initDatabase } from '../utils/database';
import { COLORS } from '../utils/constants';

export default function RootLayout() {
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.primary,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
          },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: {
            backgroundColor: COLORS.card,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            headerTitle: 'VegTrack Pro 🥬',
            tabBarIcon: ({ color, size }) => (
              <Feather name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stock"
          options={{
            title: 'Stock',
            headerTitle: 'Stock Management',
            tabBarIcon: ({ color, size }) => (
              <Feather name="package" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="wastage"
          options={{
            title: 'Wastage',
            headerTitle: 'Wastage Tracker',
            tabBarIcon: ({ color, size }) => (
              <Feather name="trash-2" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="analysis"
          options={{
            title: 'Analysis',
            headerTitle: 'Analysis & Reports',
            tabBarIcon: ({ color, size }) => (
              <Feather name="bar-chart-2" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="ai-scanner"
          options={{
            title: 'AI Scan',
            headerTitle: '📸 NVIDIA AI Slip Scanner',
            tabBarIcon: ({ color, size }) => (
              <Feather name="camera" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="sales-modal"
          options={{
            href: null,
            title: 'Record Sale',
            headerTitle: 'Record Sale',
            presentation: 'modal',
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
