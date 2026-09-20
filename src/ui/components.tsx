import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronRight, CircleHelp, Plus, X, type LucideIcon } from 'lucide-react-native';
import { fonts, useTheme } from './theme';

export function Txt({
  children,
  style,
  muted,
  ...props
}: React.ComponentProps<typeof Text> & { muted?: boolean }) {
  const { colors: c } = useTheme();
  return (
    <Text
      {...props}
      style={[{ fontFamily: fonts.regular, fontSize: 16, color: muted ? c.secondary : c.text }, style]}
    >
      {children}
    </Text>
  );
}

export function Label({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const { colors: c } = useTheme();
  return (
    <Text style={[s.label, { color: c.secondary }, style]}>
      {children}
    </Text>
  );
}

export function Card({
  children,
  style,
  dark = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  const { colors: c, isDark } = useTheme();
  const bg = dark ? (isDark ? '#262628' : c.dark) : c.surface;
  const border = dark ? 'transparent' : c.border;
  return <View style={[s.card, { backgroundColor: bg, borderColor: border }, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  icon: Icon,
  variant = 'primary',
  small,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'dark' | 'outline' | 'ghost';
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c, isDark } = useTheme();
  const color = variant === 'primary' || variant === 'dark' ? '#FFF' : c.text;
  const bg =
    variant === 'primary'
      ? c.red
      : variant === 'dark'
      ? isDark
        ? '#2E2E34'
        : c.dark
      : variant === 'outline'
      ? isDark
        ? c.surfaceSubtle
        : '#FFF'
      : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        s.button,
        {
          backgroundColor: variant === 'primary' && pressed ? c.redPressed : bg,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: c.border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          paddingHorizontal: small ? 16 : 22,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : Icon ? (
        <Icon size={18} color={color} strokeWidth={1.7} />
      ) : null}
      <Txt style={{ color, fontSize: small ? 13 : 14, fontFamily: fonts.semibold }}>{title}</Txt>
    </Pressable>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onPress,
  color,
  style,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c } = useTheme();
  const iconColor = color ?? c.secondary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, pressed && { backgroundColor: c.border }, style]}
    >
      <Icon size={21} strokeWidth={1.7} color={iconColor} />
    </Pressable>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  dark,
  style,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'red' | 'green' | 'amber';
  dark?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { isDark } = useTheme();
  const theme: Record<string, [string, string, string]> = isDark
    ? {
        neutral: ['#27272A', '#E4E4E7', '#3F3F46'],
        red: ['#3A1619', '#FCA5A5', '#7F1D1D'],
        green: ['#123220', '#86EFAC', '#166534'],
        amber: ['#38240D', '#FCD34D', '#92400E'],
      }
    : {
        neutral: ['#F3F4F6', '#374151', '#D1D5DB'],
        red: ['#FEE2E2', '#B91C1C', '#FCA5A5'],
        green: ['#DCFCE7', '#15803D', '#86EFAC'],
        amber: ['#FEF3C7', '#B45309', '#FCD34D'],
      };

  const [bg, fg, border] = theme[tone] || theme.neutral;
  return (
    <View
      style={[
        s.badge,
        {
          backgroundColor: dark ? '#333333' : bg,
          borderWidth: dark ? 0 : 1,
          borderColor: dark ? 'transparent' : border,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: 11, fontFamily: fonts.semibold, color: dark ? '#F9FAFB' : fg }}>
        {children}
      </Text>
    </View>
  );
}

export function Avatar({
  name,
  color = '#EEE',
  size = 44,
  anonymous,
}: {
  name: string;
  color?: string;
  size?: number;
  anonymous?: boolean;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.36,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.31, color: '#1A1A1A' }}>
        {anonymous ? 'P' : name.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('')}
      </Text>
    </View>
  );
}

export function Field({
  label,
  error,
  style,
  containerStyle,
  labelStyle,
  labelContainerStyle,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  labelContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors: c, isDark } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[{ gap: 7, flexGrow: 1, flexBasis: 140, minWidth: 0 }, containerStyle]}>
      {Boolean(label) && (
        <View style={labelContainerStyle}>
          <Txt style={[{ fontSize: 13, fontFamily: fonts.medium }, labelStyle]}>{label}</Txt>
        </View>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.tertiary}
        {...props}
        onFocus={e => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          s.input,
          {
            backgroundColor: isDark ? '#242428' : '#FFF',
            borderColor: focused ? c.red : Boolean(error) ? c.red : c.border,
            color: c.text,
          },
          props.multiline && { minHeight: 100, textAlignVertical: 'top' },
          style,
        ]}
      />
      {Boolean(error) ? <Txt style={{ color: c.red, fontSize: 12 }}>{error}</Txt> : null}
    </View>
  );
}

export function Pills({
  options,
  value,
  onChange,
  style,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: c, isDark } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[{ flexGrow: 0, alignSelf: 'flex-start', maxWidth: '100%' }, style]}
      contentContainerStyle={[s.pillContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFF', borderColor: c.border }]}
    >
      {options.map(option => {
        const isSelected = value === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(option)}
            style={[
              s.pill,
              isSelected && { backgroundColor: isDark ? '#2E2E34' : c.dark },
            ]}
          >
            <Text
              style={{
                color: isSelected ? '#FFF' : c.secondary,
                fontFamily: fonts.medium,
                fontSize: 12.5,
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Choices({
  options,
  value,
  onChange,
  multiple = false,
}: {
  options: string[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
}) {
  const { colors: c, isDark } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map(option => {
        const selected = multiple ? (value as string[]).includes(option) : value === option;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option}
            style={[
              s.choice,
              {
                backgroundColor: selected ? c.redSoft : isDark ? '#222226' : '#FFF',
                borderColor: selected ? c.red : c.border,
              },
            ]}
            onPress={() =>
              onChange(
                multiple
                  ? selected
                    ? (value as string[]).filter(v => v !== option)
                    : [...(value as string[]), option]
                  : option
              )
            }
          >
            <Text style={{ fontSize: 13, color: selected ? c.red : c.secondary, fontFamily: fonts.medium }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionTitle({
  title,
  action,
  onPress,
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={s.between}>
      <Label>{title}</Label>
      {Boolean(action) ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Text style={{ fontSize: 12, color: c.secondary, fontFamily: fonts.medium }}>{action}</Text>
          <ChevronRight size={14} color={c.secondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({
  title,
  description,
  action,
  onPress,
  icon: Icon = CircleHelp,
}: {
  title: string;
  description: string;
  action?: string;
  onPress?: () => void;
  icon?: LucideIcon;
}) {
  const { colors: c } = useTheme();
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
      <View style={{ padding: 18, backgroundColor: c.redSoft, borderRadius: 24 }}>
        <Icon size={32} color={c.red} strokeWidth={1.3} />
      </View>
      <Txt style={{ fontFamily: fonts.semibold, fontSize: 18, textAlign: 'center' }}>{title}</Txt>
      <Txt muted style={{ textAlign: 'center', lineHeight: 22, maxWidth: 320 }}>
        {description}
      </Txt>
      {Boolean(action && onPress) ? <Button title={action!} onPress={onPress!} icon={Plus} small /> : null}
    </View>
  );
}

export function Accordion({
  title,
  children,
  initialOpen = false,
  subtitle,
}: {
  title: string;
  children: React.ReactNode;
  initialOpen?: boolean;
  subtitle?: string;
}) {
  const { colors: c } = useTheme();
  const [open, setOpen] = useState(initialOpen);
  return (
    <Card style={{ padding: 0 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={[s.between, { padding: 22 }]}
      >
        <View style={{ gap: 5, flex: 1 }}>
          <Txt style={{ fontFamily: fonts.semibold, fontSize: 16 }}>{title}</Txt>
          {Boolean(subtitle) ? <Txt muted style={{ fontSize: 12 }}>{subtitle}</Txt> : null}
        </View>
        {open ? <ChevronDown size={18} color={c.secondary} /> : <ChevronRight size={18} color={c.secondary} />}
      </Pressable>
      {open ? <View style={{ padding: 22, paddingTop: 0, gap: 18 }}>{children}</View> : null}
    </Card>
  );
}

export function Divider() {
  const { colors: c } = useTheme();
  return <View style={{ height: 1, backgroundColor: c.border }} />;
}

export function Skeleton() {
  const { colors: c, isDark } = useTheme();
  const blockBg = isDark ? '#26262B' : '#F0F0F0';
  return (
    <View style={{ gap: 20, padding: 28 }}>
      <View style={{ width: 220, height: 36, backgroundColor: c.border, borderRadius: 12 }} />
      {[1, 2, 3].map(i => (
        <View key={i} style={{ height: 150, backgroundColor: blockBg, borderRadius: 24 }} />
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  text: { fontFamily: fonts.regular, fontSize: 16 },
  label: { fontSize: 11, letterSpacing: 1.4, fontFamily: fonts.semibold },
  card: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 16 },
  button: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  iconButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.regular,
    fontSize: 15,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  badge: { alignSelf: 'flex-start', borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  pillContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 4, 
    borderRadius: 24, 
    borderWidth: 1, 
    gap: 4 
  },
  pill: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 20 },
  choice: { borderWidth: 1, paddingHorizontal: 14, minHeight: 48, justifyContent: 'center', borderRadius: 12 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  h1: { fontFamily: fonts.brand, fontSize: 32, lineHeight: 42 },
  h2: { fontFamily: fonts.semibold, fontSize: 19 },
});
