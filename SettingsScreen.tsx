import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@password_settings';
const PASSWORD_HISTORY_KEY = '@password_history';

interface AppSettings {
  defaultLength: number;
  autoCopy: boolean;
  saveHistory: boolean;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultLength: 16,
  autoCopy: false,
  saveHistory: true,
};

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('@app_settings');
      if (saved) {
        setAppSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load app settings', e);
    }
  };

  const saveAppSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('@app_settings', JSON.stringify(newSettings));
      setAppSettings(newSettings);
    } catch (e) {
      console.error('Failed to save app settings', e);
    }
  };

  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    const newSettings = { ...appSettings, [key]: value };
    saveAppSettings(newSettings);
  };

  const resetDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(SETTINGS_KEY);
            await AsyncStorage.removeItem('@app_settings');
            setAppSettings(DEFAULT_APP_SETTINGS);
            Alert.alert('Reset Complete', 'All settings have been reset to defaults');
          },
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all password history and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              PASSWORD_HISTORY_KEY,
              SETTINGS_KEY,
              '@app_settings',
            ]);
            setAppSettings(DEFAULT_APP_SETTINGS);
            Alert.alert('Data Cleared', 'All data has been permanently deleted');
          },
        },
      ]
    );
  };

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your experience</Text>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <SettingRow
              icon="copy-outline"
              label="Auto-copy on generate"
              description="Automatically copy password when generated"
              value={appSettings.autoCopy}
              onValueChange={(v) => updateSetting('autoCopy', v)}
              isDark={isDark}
            />
            <View style={styles.divider} />
            <SettingRow
              icon="time-outline"
              label="Save history"
              description="Keep a history of generated passwords"
              value={appSettings.saveHistory}
              onValueChange={(v) => updateSetting('saveHistory', v)}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Default Length Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Defaults</Text>
          <View style={styles.card}>
            <View style={styles.lengthRow}>
              <View style={styles.lengthInfo}>
                <Text style={styles.settingLabel}>Default Password Length</Text>
                <Text style={styles.settingDescription}>
                  Starting length for new passwords
                </Text>
              </View>
              <View style={styles.lengthControl}>
                <TouchableOpacity
                  style={styles.lengthButton}
                  onPress={() =>
                    updateSetting('defaultLength', Math.max(4, appSettings.defaultLength - 1))
                  }
                >
                  <Ionicons name="remove" size={18} color={isDark ? '#fff' : '#1F2937'} />
                </TouchableOpacity>
                <Text style={styles.lengthValue}>{appSettings.defaultLength}</Text>
                <TouchableOpacity
                  style={styles.lengthButton}
                  onPress={() =>
                    updateSetting('defaultLength', Math.min(64, appSettings.defaultLength + 1))
                  }
                >
                  <Ionicons name="add" size={18} color={isDark ? '#fff' : '#1F2937'} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutRow}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#3B82F6" />
              <View style={styles.aboutText}>
                <Text style={styles.aboutTitle}>Secure & Private</Text>
                <Text style={styles.aboutDescription}>
                  Passwords are generated locally on your device. No data is sent to any server.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.dangerRow} onPress={resetDefaults}>
              <Ionicons name="refresh-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerText}>Reset Settings to Default</Text>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.dangerRow} onPress={clearAllData}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
              <Text style={styles.dangerText}>Clear All Data</Text>
              <Ionicons name="chevron-forward" size={20} color={isDark ? '#64748B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isDark: boolean;
}) {
  const styles = getStyles(isDark);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color="#3B82F6" />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: isDark ? '#374151' : '#D1D5DB', true: '#3B82F6' }}
        thumbColor="#fff"
      />
    </View>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: isDark ? '#F8FAFC' : '#1E293B',
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#94A3B8' : '#64748B',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
      marginLeft: 4,
    },
    card: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 16,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.06,
      shadowRadius: 6,
      elevation: 3,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    settingIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: isDark ? '#334155' : '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#1E293B',
    },
    settingDescription: {
      fontSize: 13,
      color: isDark ? '#94A3B8' : '#64748B',
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      marginHorizontal: 12,
    },
    lengthRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    lengthInfo: {
      flex: 1,
    },
    lengthControl: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    lengthButton: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    lengthValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#3B82F6',
      minWidth: 30,
      textAlign: 'center',
    },
    aboutRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      gap: 12,
    },
    aboutText: {
      flex: 1,
    },
    aboutTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#F8FAFC' : '#1E293B',
      marginBottom: 4,
    },
    aboutDescription: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      lineHeight: 20,
    },
    dangerTitle: {
      color: '#EF4444',
    },
    dangerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    dangerText: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: '#EF4444',
    },
    version: {
      textAlign: 'center',
      fontSize: 14,
      color: isDark ? '#64748B' : '#94A3B8',
      marginTop: 8,
    },
  });
