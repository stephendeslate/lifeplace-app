import React, { useState, forwardRef } from 'react';
import { TextInput, TouchableOpacity } from 'react-native';
import { Eye, EyeSlash } from 'phosphor-react-native';
import { Input, InputProps } from './Input';
import { colors, layout } from '@/theme';

export interface PasswordInputProps extends Omit<InputProps, 'rightIcon' | 'secureTextEntry'> {
  showPasswordToggle?: boolean;
}

export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  ({ showPasswordToggle = true, ...rest }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    const passwordToggleIcon = showPasswordToggle ? (
      <TouchableOpacity
        onPress={togglePasswordVisibility}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        accessibilityRole="button"
      >
        {showPassword ? (
          <EyeSlash size={layout.iconSize.sm} color={colors.neutral.gray} />
        ) : (
          <Eye size={layout.iconSize.sm} color={colors.neutral.gray} />
        )}
      </TouchableOpacity>
    ) : undefined;

    return (
      <Input
        ref={ref}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="password"
        textContentType="password"
        rightIcon={passwordToggleIcon}
        {...rest}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
