import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../utils/constants';

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
  suffix,
  multiline,
  editable = true,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputContainer, !editable && styles.disabled]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[styles.input, multiline && styles.multiline]}
          value={String(value ?? '')}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          keyboardType={keyboardType || 'default'}
          multiline={multiline}
          editable={editable}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  prefix: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginRight: 6,
    fontWeight: '600',
  },
  suffix: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  disabled: {
    backgroundColor: '#F0F0F0',
  },
});
