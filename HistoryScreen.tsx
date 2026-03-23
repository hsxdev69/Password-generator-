import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const PASSWORD_HISTORY_KEY = '@password_history';

interface PasswordEntry {
  id: string;
  password: string;
  timestamp: number;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function maskPassword(password: string): string {
  if (password.length <= 4) return '••••';
  return password.slice(0, 2) + '•'.repeat(password.length - 4) + password.slice(-2);
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [history, setHistory] = useState<PasswordEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(PASSWORD_HISTORY_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const copyPassword = async (password: string) => {
    await Clipboard.setStringAsync(password);
    Alert.alert('Copied!', 'Password copied to clipboard');
  };

  const deleteEntry = async (id: string) => {
    Alert.alert(
      'Delete Password',
      'Are you sure you want to remove this password from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updated = history.filter((item) => item.id !== id);
            setHistory(updated);
            await AsyncStorage.setItem(PASSWORD_HISTORY_KEY, JSON.stringify(updated));
          },
        },
      ]
    );
  };

  const clearAll = () => {
    if (history.length === 0) return;
    
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all password history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem(PASSWORD_HISTORY_KEY);
          },
        },
      ]
    );
  };

  const styles = getStyles(isDark);

  const renderItem = ({ item }: { item: PasswordEntry }) => {
    const isExpanded = expandedId === item.id;
    
    return (
      <TouchableOpacity
        style={styles.historyItem}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.historyContent}>
          <View style={styles.passwordRow}>
            <Text style={styles.passwordText}>
              {isExpanded ? item.password : maskPassword(item.password)}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyPassword(item.password)}
            >
              <Ionicons name="copy-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
          </View>
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteEntry(item.id)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="time-outline" size={48} color={isDark ? '#475569' : '#94A3B8'} />
      </View>
      <Text style={styles.emptyTitle}>No History Yet</Text>
      <Text style={styles.emptySubtitle}>
        Generated passwords will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>{history.length} passwords saved</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={ListEmptyComponent}
      />
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 20,
      paddingBottom: 12,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#1E293B',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 4,
    },
    clearButton: {
      backgroundColor: isDark ? '#374151' : '#FEE2E2',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    clearButtonText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '600',
    },
    listContent: {
      padding: 20,
      paddingTop: 8,
      flexGrow: 1,
    },
    historyItem: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    historyContent: {
      flex: 1,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    passwordText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#1E293B',
      fontFamily: 'monospace',
      letterSpacing: 0.5,
    },
    copyButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? '#334155' : '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    timestamp: {
      fontSize: 12,
      color: isDark ? '#64748B' : '#94A3B8',
    },
    deleteButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#374151' : '#FEE2E2',
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    emptyIcon: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#1E293B',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: isDark ? '#64748B' : '#94A3B8',
      textAlign: 'center',
    },
  });
