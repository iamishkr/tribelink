import React, { useState, forwardRef } from 'react';
import {
  View, TextInput, Text, TouchableOpacity,
  StyleSheet, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  isPassword?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(({
  label, error, hint,
  leftIcon, rightIcon, onRightIconPress,
  containerStyle, inputStyle,
  isPassword, value, ...props
}, ref) => {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  const borderColor = error
    ? theme.colors.error
    : focused
    ? theme.colors.borderFocus
    : theme.colors.border;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && (
        <Text style={[styles.label, {
          color: error ? theme.colors.error : theme.colors.textSecondary,
          fontFamily: 'Inter-Medium',
        }]}>
          {label}
        </Text>
      )}

      <View style={[styles.inputRow, {
        backgroundColor: theme.colors.surface,
        borderColor,
        borderWidth: focused ? 2 : 1.5,
      }]}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textTertiary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          ref={ref}
          {...props}
          value={value ?? ''}
          secureTextEntry={isPassword && !showPass}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor={theme.colors.textTertiary}
          style={[styles.input, {
            color: theme.colors.text,
            fontFamily: 'Inter-Regular',
          }, inputStyle]}
        />

        {isPassword && (
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.rightIconBtn}>
            <Ionicons
              name={showPass ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !isPassword && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconBtn}>
            <Ionicons name={rightIcon} size={18} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {(error || hint) && (
        <Text style={[styles.hint, {
          color: error ? theme.colors.error : theme.colors.textTertiary,
          fontFamily: 'Inter-Regular',
        }]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper:     { gap: 6 },
  label:       { fontSize: 13, marginLeft: 2 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  leftIcon:    { marginRight: 10 },
  rightIconBtn: { marginLeft: 8, padding: 4 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
  },
  hint: { fontSize: 12, marginLeft: 2 },
});

export default Input;
