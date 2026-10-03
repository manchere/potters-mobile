import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import {
  GestureResponderEvent,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hexToHsv, hsvToHex, isHexColor, MEMBER_COLORS, textColorFor } from "../api/memberColors";
import { radius, spacing, usePalette } from "../theme";
import { Button, MemberBadge, TextField } from "./index";

// The four quick picks shown on the page; every other color is one tap
// away in the picker sheet.
const QUICK_PICKS = ["Navy", "Teal", "Gold", "Pink"]
  .map((name) => MEMBER_COLORS.find((option) => option.name === name))
  .filter((option): option is { name: string; hex: string } => option !== undefined);

const SQUARE_HEIGHT = 200;
const HUE_HEIGHT = 28;
const HUE_STOPS = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"] as const;
const SWATCH = 44;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const sameColor = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

// Picks a Member's profile color: four quick colors right on the page, and
// a palette button that opens a sheet with the full picker -- drag in the
// square for how strong and how bright, along the rainbow bar for the hue,
// or type an exact hex color -- with a live preview of the member's badge.
// Nothing changes until "Use this color"; Cancel (or tapping outside)
// leaves the color as it was.
export default function ColorPicker({
  value,
  onChange,
  name,
}: {
  value: string;
  onChange: (hex: string) => void;
  // For the badge preview in the sheet; "?" when empty.
  name?: string;
}) {
  const palette = usePalette();
  const [sheetOpen, setSheetOpen] = useState(false);
  const isQuickPick = QUICK_PICKS.some((option) => sameColor(option.hex, value));

  const swatch = (color: string, label: string) => {
    const selected = sameColor(color, value);
    return (
      <Pressable
        key={color}
        onPress={() => onChange(color)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        hitSlop={4}
        style={({ pressed }) => [
          styles.swatchRing,
          { borderColor: selected ? color : "transparent", transform: [{ scale: pressed ? 0.92 : 1 }] },
        ]}
      >
        <View style={[styles.swatch, { backgroundColor: color }]}>
          {selected ? <Ionicons name="checkmark" size={22} color={textColorFor(color)} /> : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.label, { color: palette.softText }]}>Your color</Text>
      <View style={styles.row}>
        {QUICK_PICKS.map((option) => swatch(option.hex, option.name))}

        {/* Opens the full picker; shows the custom color once one is chosen. */}
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={isQuickPick ? "More colors" : `Custom color ${value}, change`}
          accessibilityState={{ selected: !isQuickPick }}
          hitSlop={4}
          style={({ pressed }) => [
            styles.swatchRing,
            { borderColor: isQuickPick ? "transparent" : value, transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
        >
          {isQuickPick ? (
            <LinearGradient colors={HUE_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.swatch}>
              <View style={styles.paletteIcon}>
                <Ionicons name="color-palette" size={18} color="#1f2430" />
              </View>
            </LinearGradient>
          ) : (
            <View style={[styles.swatch, { backgroundColor: value }]}>
              <Ionicons name="checkmark" size={22} color={textColorFor(value)} />
            </View>
          )}
        </Pressable>
      </View>

      <ColorSheet
        visible={sheetOpen}
        initial={value}
        name={name}
        onCancel={() => setSheetOpen(false)}
        onDone={(color) => {
          setSheetOpen(false);
          onChange(color);
        }}
      />
    </View>
  );
}

// The full picker, as a sheet that slides up from the bottom. Works on its
// own copy of the color until Done.
function ColorSheet({
  visible,
  initial,
  name,
  onCancel,
  onDone,
}: {
  visible: boolean;
  initial: string;
  name?: string;
  onCancel: () => void;
  onDone: (hex: string) => void;
}) {
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  // Kept as hue/saturation/value so the hue survives dragging to grey or
  // black, where the hex alone can't say which hue it was.
  const [hsv, setHsv] = useState(() => hexToHsv(initial));
  const [hex, setHex] = useState(initial);
  const [hexError, setHexError] = useState<string | null>(null);
  const [squareWidth, setSquareWidth] = useState(0);
  const [hueWidth, setHueWidth] = useState(0);
  const color = hsvToHex(hsv.h, hsv.s, hsv.v);

  // Start from the current color each time the sheet opens.
  const onShow = () => {
    setHsv(hexToHsv(initial));
    setHex(initial);
    setHexError(null);
  };

  const apply = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    setHex(hsvToHex(next.h, next.s, next.v));
    setHexError(null);
  };

  const onSquareTouch = (event: GestureResponderEvent) => {
    if (squareWidth <= 0) return;
    const { locationX, locationY } = event.nativeEvent;
    apply({ h: hsv.h, s: clamp(locationX / squareWidth, 0, 1), v: clamp(1 - locationY / SQUARE_HEIGHT, 0, 1) });
  };

  const onHueTouch = (event: GestureResponderEvent) => {
    if (hueWidth <= 0) return;
    apply({ ...hsv, h: clamp(event.nativeEvent.locationX / hueWidth, 0, 1) * 359.9 });
  };

  const onHexChange = (text: string) => {
    const typed = text.startsWith("#") ? text : `#${text}`;
    setHex(typed);
    if (isHexColor(typed)) {
      setHexError(null);
      setHsv(hexToHsv(typed));
    } else {
      setHexError(typed.length >= 7 ? "Use six hex digits, like #3a7bd5." : null);
    }
  };

  // Keep a drag inside the picker (instead of moving the sheet or page)
  // and follow the finger.
  const dragHandlers = (handler: (event: GestureResponderEvent) => void) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: handler,
    onResponderMove: handler,
  });

  const pureHue = hsvToHex(hsv.h, 1, 1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} onShow={onShow}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Tap outside the sheet to cancel. */}
        <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close color picker" />
        <View
          style={[
            styles.sheet,
            { backgroundColor: palette.surface, paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: palette.border }]} />

          <View style={styles.header}>
            <MemberBadge name={name?.trim() || "?"} color={color} size={56} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: palette.strongText }]}>Pick your color</Text>
              <Text style={[styles.subtitle, { color: palette.mutedText }]}>
                Drag in the square and along the rainbow.
              </Text>
            </View>
          </View>

          {/* Saturation (across) x brightness (down) for the current hue. */}
          <View
            style={[styles.square, { backgroundColor: pureHue }]}
            onLayout={(event: LayoutChangeEvent) => setSquareWidth(event.nativeEvent.layout.width)}
            {...dragHandlers(onSquareTouch)}
          >
            <LinearGradient
              pointerEvents="none"
              colors={["#ffffff", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              pointerEvents="none"
              colors={["rgba(0,0,0,0)", "#000000"]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={[
                styles.thumb,
                { left: hsv.s * squareWidth - 13, top: (1 - hsv.v) * SQUARE_HEIGHT - 13, backgroundColor: color },
              ]}
            />
          </View>

          {/* Hue. */}
          <View
            style={styles.hueBar}
            onLayout={(event: LayoutChangeEvent) => setHueWidth(event.nativeEvent.layout.width)}
            {...dragHandlers(onHueTouch)}
          >
            <LinearGradient
              pointerEvents="none"
              colors={HUE_STOPS}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={[StyleSheet.absoluteFill, { borderRadius: HUE_HEIGHT / 2 }]}
            />
            <View
              pointerEvents="none"
              style={[styles.hueThumb, { left: (hsv.h / 360) * hueWidth - 9, backgroundColor: pureHue }]}
            />
          </View>

          <TextField
            label="Exact color (hex)"
            placeholder="#3a7bd5"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            value={hex}
            onChangeText={onHexChange}
            error={hexError}
          />

          <View style={styles.actions}>
            <Button title="Cancel" variant="secondary" onPress={onCancel} style={{ flex: 1 }} />
            <Button title="Use this color" onPress={() => onDone(color)} style={{ flex: 1.4 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatchRing: { padding: 3, borderRadius: (SWATCH + 12) / 2, borderWidth: 2.5 },
  swatch: {
    width: SWATCH,
    height: SWATCH,
    borderRadius: SWATCH / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  paletteIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: { flex: 1, backgroundColor: "rgba(5,12,26,0.55)" },
  sheet: {
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  grabber: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, marginBottom: spacing.xs },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  title: { fontSize: 19, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  square: { height: SQUARE_HEIGHT, borderRadius: radius.lg, overflow: "hidden" },
  thumb: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  hueBar: { height: HUE_HEIGHT, justifyContent: "center" },
  hueThumb: {
    position: "absolute",
    width: 18,
    height: HUE_HEIGHT + 8,
    top: -4,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
});
