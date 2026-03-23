import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAR_SETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
};

const PASSWORD_HISTORY_KEY = '@password_history';
const SETTINGS_KEY = '@password_settings';

interface PasswordSettings {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

const DEFAULT_SETTINGS: PasswordSettings = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
};

function calculateStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Very Weak', color: '#FF4444' },
    { label: 'Weak', color: '#FF8800' },
    { label: 'Fair', color: '#FFCC00' },
    { label: 'Good', color: '#88CC00' },
    { label: 'Strong', color: '#00AA44' },
    { label: 'Very Strong', color: '#00CC66' },
  ];
  return levels[Math.min(score, 5)];
}

export default function GenerateScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [password, setPassword] = useState('');
  const [settings, setSettings] = useState<PasswordSettings>(DEFAULT_SETTINGS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCopied, setShowCopied] = useState(false);

  const scale = useSharedValue(1);
  const shake = useSharedValue(0);
  const copiedOpacity = useSharedValue(0);

  const animatedPasswordStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: shake.value }],
  }));

  const copiedStyle = useAnimatedStyle(() => ({
    opacity: copiedOpacity.value,
  }));

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    generatePassword();
  }, [settings]);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    }
  };

  const saveSettings = async (newSettings: PasswordSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  const generatePassword = useCallback(async () => {
    setIsGenerating(true);
    
    // Animate button press
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10 })
    );

    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 150));

    let chars = '';
    if (settings.includeUppercase) chars += CHAR_SETS.uppercase;
    if (settings.includeLowercase) chars += CHAR_SETS.lowercase;
    if (settings.includeNumbers) chars += CHAR_SETS.numbers;
    if (settings.includeSymbols) chars += CHAR_SETS.symbols;

    if (chars === '') {
      chars = CHAR_SETS.lowercase;
    }

    let newPassword = '';
    const array = new Uint32Array(settings.length);
    crypto.getRandomValues(array);

    for (let i = 0; i < settings.length; i++) {
      newPassword += chars[array[i] % chars.length];
    }

    setPassword(newPassword);
    setIsGenerating(false);
  }, [settings]);

  const copyToClipboard = async () => {
    if (!password) return;
    
    await Clipboard.setStringAsync(password);
    
    // Show copied feedback
    setShowCopied(true);
    copiedOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1000 }),
      withTiming(0, { duration: 200 })
    );
    setTimeout(() => setShowCopied(false), 1400);

    // Save to history
    await saveToHistory(password);
  };

  const saveToHistory = async (pwd: string) => {
    try {
      const existing = await AsyncStorage.getItem(PASSWORD_HISTORY_KEY);
      const history = existing ? JSON.parse(existing) : [];
      const newEntry = { password: pwd, timestamp: Date.now(), id: Date.now().toString() };
      const updated = [newEntry, ...history].slice(0, 50);
      await AsyncStorage.setItem(PASSWORD_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history', e);
    }
  };

  const updateSetting = <K extends keyof PasswordSettings>(
    key: K,
    value: PasswordSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const strength = calculateStrength(password);
  const strengthWidth = `${((strength.score + 1) / 6) * 100}%`;

  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Password Generator</Text>
          <Text style={styles.subtitle}>Create secure passwords instantly</Text>
        </View>

        {/* Password Display */}
        <View style={styles.passwordContainer}>
          <Animated.View style={[styles.passwordCard, animatedPasswordStyle]}>
            <Text style={styles.passwordText} selectable>
              {password || 'Generating...'}
            </Text>
            
            <View style={styles.passwordActions}>
              <TouchableOpacity style={styles.iconButton} onPress={generatePassword}>
                <Ionicons name="refresh" size={24} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={copyToClipboard}>
                <Ionicons name="copy-outline" size={24} color={isDark ? '#60A5FA' : '#3B82F6'} />
              </TouchableOpacity>
            </View>

            {/* Copied Indicator */}
            <Animated.View style={[styles.copiedBadge, copiedStyle]}>
              <Text style={styles.copiedText}>Copied!</Text>
            </Animated.View>
          </Animated.View>

          {/* Strength Indicator */}
          <View style={styles.strengthContainer}>
            <View style={styles.strengthHeader}>
              <Text style={styles.strengthLabel}>Strength</Text>
              <Text style={[styles.strengthValue, { color: strength.color }]}>
                {strength.label}
              </Text>
            </View>
            <View style={styles.strengthBar}>
              <View style={[styles.strengthFill, { width: strengthWidth, backgroundColor: strength.color }]} />
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>Settings</Text>

          {/* Length Slider */}
          <View style={styles.settingItem}>
            <View style={styles.settingHeader}>
              <Text style={styles.settingLabel}>Length</Text>
              <Text style={styles.settingValue}>{settings.length}</Text>
            </View>
            <View style={styles.sliderContainer}>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('length', Math.max(4, settings.length - 1))}
              >
                <Ionicons name="remove" size={20} color={isDark ? '#fff' : '#1F2937'} />
              </TouchableOpacity>
              <View style={styles.sliderTrack}>
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${((settings.length - 4) / (64 - 4)) * 100}%` },
                  ]}
                />
              </View>
              <TouchableOpacity
                style={styles.sliderButton}
                onPress={() => updateSetting('length', Math.min(64, settings.length + 1))}
              >
                <Ionicons name="add" size={20} color={isDark ? '#fff' : '#1F2937'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Character Toggles */}
          <View style={styles.toggleContainer}>
            <ToggleRow
              icon="text"
              label="Uppercase (A-Z)"
              value={settings.includeUppercase}
              onValueChange={(v) => updateSetting('includeUppercase', v)}
              isDark={isDark}
            />
            <ToggleRow
              icon="text-outline"
              label="Lowercase (a-z)"
              value={settings.includeLowercase}
              onValueChange={(v) => updateSetting('includeLowercase', v)}
              isDark={isDark}
            />
            <ToggleRow
              icon="calculator-outline"
              label="Numbers (0-9)"
              value={settings.includeNumbers}
              onValueChange={(v) => updateSetting('includeNumbers', v)}
              isDark={isDark}
            />
            <ToggleRow
              icon="at-outline"
              label="Symbols (!@#$%)"
              value={settings.includeSymbols}
              onValueChange={(v) => updateSetting('includeSymbols', v)}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Generate Button */}
        <TouchableOpacity style={styles.generateButton} onPress={generatePassword}>
          <Ionicons name="shuffle-outline" size={24} color="#fff" />
          <Text style={styles.generateButtonText}>Generate New Password</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({
  icon,
  label,
  value,
  onValueChange,
  isDark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  isDark: boolean;
}) {
  const styles = getStyles(isDark);
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <Ionicons name={icon} size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
      </View>
      <Text style={styles.toggleLabel}>{label}</Text>
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
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#94A3B8' : '#64748B',
    },
    passwordContainer: {
      marginBottom: 24,
    },
    passwordCard: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
      elevation: 8,
      alignItems: 'center',
    },
    passwordText: {
      fontSize: 24,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#1E293B',
      textAlign: 'center',
      letterSpacing: 1,
      marginBottom: 16,
      fontFamily: 'monospace',
    },
    passwordActions: {
      flexDirection: 'row',
      gap: 12,
    },
    iconButton: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: isDark ? '#334155' : '#EFF6FF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    copiedBadge: {
      position: 'absolute',
      top: -10,
      backgroundColor: '#10B981',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    copiedText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    strengthContainer: {
      marginTop: 16,
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    strengthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    strengthLabel: {
      fontSize: 14,
      color: isDark ? '#94A3B8' : '#64748B',
      fontWeight: '500',
    },
    strengthValue: {
      fontSize: 14,
      fontWeight: '700',
    },
    strengthBar: {
      height: 8,
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    strengthFill: {
      height: '100%',
      borderRadius: 4,
    },
    settingsContainer: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    settingsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#F8FAFC' : '#1E293B',
      marginBottom: 16,
    },
    settingItem: {
      marginBottom: 20,
    },
    settingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#E2E8F0' : '#374151',
    },
    settingValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#3B82F6',
    },
    sliderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    sliderButton: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
    },
    sliderTrack: {
      flex: 1,
      height: 8,
      backgroundColor: isDark ? '#334155' : '#E2E8F0',
      borderRadius: 4,
      overflow: 'hidden',
    },
    sliderFill: {
      height: '100%',
      backgroundColor: '#3B82F6',
      borderRadius: 4,
    },
    toggleContainer: {
      gap: 4,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
    },
    toggleIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? '#334155' : '#F1F5F9',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    toggleLabel: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#E2E8F0' : '#374151',
    },
    generateButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 16,
      paddingVertical: 18,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      shadowColor: '#3B82F6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    generateButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
  });
