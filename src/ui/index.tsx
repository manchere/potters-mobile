import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode, Ref } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DEFAULT_MEMBER_COLOR, initials, textColorFor } from "../api/memberColors";
import { radius, requestColors, spacing, statusColors, usePalette } from "../theme";

export type IconName = ComponentProps<typeof Ionicons>["name"];

// A screen's scrolling body on the app background, with pull-to-refresh
// when onRefresh is given.
export function Screen({
  children,
  refreshing = false,
  onRefresh,
  scroll = true,
  padded = true,
  safeTop = false,
  scrollRef,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
  padded?: boolean;
  safeTop?: boolean;
  // To scroll the body from code (e.g. jump to a section).
  scrollRef?: Ref<ScrollView>;
}) {
  const palette = usePalette();
  const content = padded ? { padding: spacing.lg, gap: spacing.md } : undefined;
  const body = scroll ? (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={[content, { flexGrow: 1 }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, content]}>{children}</View>
  );
  return (
    <SafeAreaView
      edges={safeTop ? ["top", "left", "right"] : ["left", "right"]}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      {body}
    </SafeAreaView>
  );
}

export function Card({
  children,
  onPress,
  style,
  accent,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  // A colored stripe down the left edge (e.g. a warning).
  accent?: string;
}) {
  const palette = usePalette();
  const cardStyle = [
    styles.card,
    { backgroundColor: palette.surface, borderColor: palette.border },
    accent ? { borderLeftWidth: 4, borderLeftColor: accent } : null,
    style,
  ];
  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cardStyle, pressed && { backgroundColor: palette.subtle }]}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = usePalette();
  const inactive = disabled || loading;
  const colors = {
    primary: { bg: palette.primary, pressed: palette.primaryPressed, text: palette.primaryText, border: palette.primary },
    secondary: { bg: palette.surface, pressed: palette.subtle, text: palette.strongText, border: palette.inputBorder },
    danger: { bg: palette.surface, pressed: palette.errorBg, text: palette.error, border: palette.error },
    ghost: { bg: "transparent", pressed: palette.subtle, text: palette.dark ? palette.accentText : palette.primary, border: "transparent" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: inactive && variant === "primary" ? palette.primaryDisabled : pressed ? colors.pressed : colors.bg,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={colors.text} /> : null}
          <Text style={[styles.buttonText, { color: colors.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({ label, error, style, ...props }: TextInputProps & { label?: string; error?: string | null }) {
  const palette = usePalette();
  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text style={[styles.label, { color: palette.softText }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={palette.faintText}
        style={[
          styles.input,
          { backgroundColor: palette.input, borderColor: error ? palette.error : palette.inputBorder, color: palette.text },
          props.multiline ? { minHeight: 100, textAlignVertical: "top" } : null,
          style,
        ]}
        {...props}
      />
      {error ? <Text style={[styles.fieldError, { color: palette.error }]}>{error}</Text> : null}
    </View>
  );
}

// A Member's profile circle: initials on their chosen color (FR-1.2).
export function MemberBadge({ name, color, size = 32 }: { name: string; color?: string | null; size?: number }) {
  const fill = color || DEFAULT_MEMBER_COLOR;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: fill,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: textColorFor(fill), fontWeight: "700", fontSize: Math.round(size * 0.4) }}>{initials(name) || "?"}</Text>
    </View>
  );
}

// A duty type as a rounded pill with its icon -- the desktop's duty tag.
export function DutyPill({ icon, name }: { icon: string; name: string }) {
  const palette = usePalette();
  return (
    <View style={[styles.pill, { backgroundColor: palette.subtle }]}>
      <Text style={[styles.pillText, { color: palette.strongText }]}>
        {icon} {name}
      </Text>
    </View>
  );
}

// A small colored label: light tint behind the color as text (desktop Badge).
export function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return <Badge label={label} color={statusColors[status] ?? statusColors.lost} />;
}

export function RequestBadge({ status }: { status: string }) {
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", denied: "Denied" };
  return <Badge label={labels[status] ?? status} color={requestColors[status] ?? requestColors.pending} />;
}

export function Banner({
  tone = "info",
  icon,
  children,
}: {
  tone?: "info" | "warning" | "error" | "success";
  icon?: IconName;
  children: ReactNode;
}) {
  const palette = usePalette();
  const colors = {
    info: { bg: palette.subtle, fg: palette.softText },
    warning: { bg: palette.accentBg, fg: palette.accentText },
    error: { bg: palette.errorBg, fg: palette.error },
    success: { bg: palette.successBg, fg: palette.success },
  }[tone];
  const defaultIcon: IconName = { info: "information-circle", warning: "warning", error: "alert-circle", success: "checkmark-circle" }[tone] as IconName;
  return (
    <View style={[styles.banner, { backgroundColor: colors.bg }]}>
      <Ionicons name={icon ?? defaultIcon} size={18} color={colors.fg} />
      <Text style={[styles.bannerText, { color: colors.fg }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, message, action }: { icon: IconName; title: string; message?: string; action?: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: palette.subtle }]}>
        <Ionicons name={icon} size={30} color={palette.mutedText} />
      </View>
      <Text style={[styles.emptyTitle, { color: palette.strongText }]}>{title}</Text>
      {message ? <Text style={[styles.emptyMessage, { color: palette.mutedText }]}>{message}</Text> : null}
      {action}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, { color: palette.mutedText }]}>{children}</Text>
      {right}
    </View>
  );
}

// A tappable list row: icon tile, title + subtitle, chevron.
export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  iconColor,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  iconColor?: string;
}) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.listRow, pressed && onPress ? { backgroundColor: palette.subtle } : null]}
    >
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: palette.subtle }]}>
          <Ionicons name={icon} size={20} color={iconColor ?? (palette.dark ? palette.accentText : palette.primary)} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowTitle, { color: palette.strongText }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.rowSubtitle, { color: palette.mutedText }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={palette.faintText} /> : null}
    </Pressable>
  );
}

// A row of mutually exclusive choices, e.g. the Schedule's
// This Sunday / My duties / History.
export function Segmented<K extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string; icon?: IconName }[];
  value: K;
  onChange: (key: K) => void;
}) {
  const palette = usePalette();
  const tint = palette.dark ? palette.accentText : palette.primary;
  return (
    <View style={[styles.segmented, { backgroundColor: palette.subtle }]} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segment, active && { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            {option.icon ? <Ionicons name={option.icon} size={16} color={active ? tint : palette.mutedText} /> : null}
            <Text style={[styles.segmentText, { color: active ? tint : palette.mutedText }]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Divider() {
  const palette = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.divider, marginLeft: 64 }} />;
}

export function Loading() {
  const palette = usePalette();
  return (
    <View style={[styles.loading, { backgroundColor: palette.background }]}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 48,
  },
  buttonText: { fontSize: 15, fontWeight: "600" },
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, fontSize: 15 },
  fieldError: { fontSize: 12 },
  pill: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 5 },
  pillText: { fontSize: 14, fontWeight: "600" },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  banner: { flexDirection: "row", gap: spacing.sm, borderRadius: radius.md, padding: spacing.md, alignItems: "flex-start" },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyMessage: { fontSize: 14, textAlign: "center", maxWidth: 300, lineHeight: 20 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  rowIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowSubtitle: { fontSize: 13 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  segmented: { flexDirection: "row", borderRadius: radius.md, padding: 3, gap: 3 },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radius.md - 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  segmentText: { fontSize: 13, fontWeight: "700" },
});
