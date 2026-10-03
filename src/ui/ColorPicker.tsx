import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { hexToHsv, hsvToHex, isHexColor, MEMBER_COLORS, textColorFor } from "../api/memberColors";
import { radius, spacing, usePalette } from "../theme";
import { TextField } from "./index";

const SQUARE_HEIGHT = 170;
const HUE_HEIGHT = 26;
const HUE_STOPS = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Picks a Member's profile color: a palette of quick picks, then "Custom"
// for a full picker -- drag in the square for how strong and how bright,
// along the rainbow bar for the hue -- with a live preview and a hex box
// for an exact color.
export default function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const palette = usePalette();
  const isQuickPick = MEMBER_COLORS.some((option) => option.hex.toLowerCase() === value.toLowerCase());
  const [custom, setCustom] = useState(!isQuickPick);
  // Kept separately from `value` so the hue survives dragging to grey/black,
  // where the hex alone can't say which hue it was.
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value);
  const [hexError, setHexError] = useState<string | null>(null);
  const [squareWidth, setSquareWidth] = useState(0);
  const [hueWidth, setHueWidth] = useState(0);

  // Follow a color chosen from outside (or a quick pick) unless it's the
  // one the picker itself just produced.
  useEffect(() => {
    if (value.toLowerCase() !== hsvToHex(hsv.h, hsv.s, hsv.v)) {
      setHsv(hexToHsv(value));
    }
    setHex(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const apply = (next: { h: number; s: number; v: number }) => {
    setHsv(next);
    setHexError(null);
    onChange(hsvToHex(next.h, next.s, next.v));
  };

  const pickQuick = (color: string) => {
    setHexError(null);
    onChange(color);
  };

  const onSquareTouch = (event: GestureResponderEvent) => {
    if (squareWidth <= 0) return;
    const { locationX, locationY } = event.nativeEvent;
    apply({
      h: hsv.h,
      s: clamp(locationX / squareWidth, 0, 1),
      v: clamp(1 - locationY / SQUARE_HEIGHT, 0, 1),
    });
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
      onChange(typed.toLowerCase());
    } else {
      setHexError(typed.length >= 7 ? "Use six hex digits, like #3a7bd5." : null);
    }
  };

  // Touch handlers that keep the drag inside the picker (instead of the
  // page scrolling) and follow the finger.
  const dragHandlers = (handler: (event: GestureResponderEvent) => void) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onMoveShouldSetResponderCapture: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: handler,
    onResponderMove: handler,
  });

  const swatch = (color: string, name: string) => {
    const selected = color.toLowerCase() === value.toLowerCase();
    return (
      <Pressable
        key={color}
        accessibilityLabel={name}
        accessibilityState={{ selected }}
        onPress={() => pickQuick(color)}
        style={[styles.swatch, { backgroundColor: color, borderColor: selected ? palette.strongText : "transparent" }]}
      />
    );
  };

  const pureHue = hsvToHex(hsv.h, 1, 1);

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.label, { color: palette.softText }]}>Your color</Text>

      <View style={styles.swatches}>
        {MEMBER_COLORS.map((option) => swatch(option.hex, option.name))}
        <Pressable
          onPress={() => setCustom((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel="Custom color"
          accessibilityState={{ expanded: custom }}
          style={[styles.swatch, styles.customSwatch, { borderColor: custom || !isQuickPick ? palette.strongText : palette.border }]}
        >
          <LinearGradient colors={HUE_STOPS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.customFill} />
          <Text style={styles.customPlus}>+</Text>
        </Pressable>
      </View>

      {custom ? (
        <View style={[styles.panel, { backgroundColor: palette.subtle }]}>
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
                {
                  left: hsv.s * squareWidth - 11,
                  top: (1 - hsv.v) * SQUARE_HEIGHT - 11,
                  backgroundColor: value,
                },
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
              style={[styles.hueThumb, { left: (hsv.h / 360) * hueWidth - 8, backgroundColor: pureHue }]}
            />
          </View>

          <View style={styles.previewRow}>
            <View style={[styles.preview, { backgroundColor: value }]}>
              <Text style={{ color: textColorFor(value), fontWeight: "700" }}>Aa</Text>
            </View>
            <View style={{ flex: 1 }}>
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
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  customSwatch: { overflow: "hidden", alignItems: "center", justifyContent: "center" },
  customFill: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  customPlus: { color: "#ffffff", fontSize: 20, fontWeight: "800", textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 3 },
  panel: { gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  square: { height: SQUARE_HEIGHT, borderRadius: radius.md, overflow: "hidden" },
  thumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
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
    width: 16,
    height: HUE_HEIGHT + 6,
    top: -3,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  previewRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  preview: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 2 },
});
