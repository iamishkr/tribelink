import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onSubmit?: () => void;
  style?: ViewStyle;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value, onChangeText, placeholder = 'Search...',
  onClear, onFocus, onBlur, onSubmit, style, autoFocus,
}) => {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const focused  = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    borderColor: focused.value === 1
      ? theme.colors.borderFocus
      : theme.colors.border,
    borderWidth: focused.value === 1 ? 2 : 1.5,
  }));

  return (
    <Animated.View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      height: 48,
      gap: 10,
    }, animStyle, style]}>
      <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        autoFocus={autoFocus}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        onFocus={() => { focused.value = withTiming(1); onFocus?.(); }}
        onBlur={() => { focused.value = withTiming(0); onBlur?.(); }}
        style={{
          flex: 1,
          color: theme.colors.text,
          fontSize: 15,
          fontFamily: 'Inter-Regular',
          paddingVertical: 0,
        }}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={onClear} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default SearchBar;
