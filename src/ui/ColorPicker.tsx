import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { GestureResponderEvent, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";

import { hexToHsv, hsvToHex, isHexColor } from "../api/memberColors";
import { radius, spacing, usePalette } from "../theme";
import { TextField } from "./index";

const SQUARE_HEIGHT = 120;
const HUE_HEIGHT = 26;
const HUE_STOPS = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Picks a Member's profile color: drag in the square for how strong and
// how bright, along the rainbow bar for the hue, or type an exact hex
// color. Compact enough for the Create Profile screen to fit a phone
// without scrolling; that screen's badge shows the result.
export default function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const palette = usePalette();
  // Kept separately from `value` so the hue survives dragging to grey/black,
  // where the hex alone can't say which hue it was.
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [hex, setHex] = useState(value);
  const [hexError, setHexError] = useState<string | null>(null);
  const [squareWidth, setSquareWidth] = useState(0);
  const [hueWidth, setHueWidth] = useState(0);

  // Follow a color chosen from outside unless it's the one the picker
  // itself just produced.
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

  const pureHue = hsvToHex(hsv.h, 1, 1);

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[styles.label, { color: palette.softText }]}>Your color</Text>

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

        <View style={styles.hueRow}>
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
          <View style={styles.hexBox}>
            <TextField
              accessibilityLabel="Exact color (hex)"
              placeholder="#3a7bd5"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={7}
              value={hex}
              onChangeText={onHexChange}
              style={styles.hexInput}
            />
          </View>
        </View>
        {hexError ? <Text style={[styles.hexError, { color: palette.error }]}>{hexError}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  panel: { gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md },
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
  hueRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hueBar: { flex: 1, height: HUE_HEIGHT, justifyContent: "center" },
  hexBox: { width: 104 },
  hexInput: { paddingVertical: 8, paddingHorizontal: spacing.sm },
  hexError: { fontSize: 12 },
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
});
