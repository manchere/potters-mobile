import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { hslToHex, isHexColor, MEMBER_COLORS } from "../api/memberColors";
import { spacing, usePalette } from "../theme";
import { TextField } from "./index";

// Rows of the "More colors" grid: 12 hues from dark to light, then greys.
const HUES = Array.from({ length: 12 }, (_, i) => i * 30);
const SHADES = [0.25, 0.4, 0.55, 0.7, 0.85];
const SPECTRUM = [
  ...SHADES.map((lightness) => HUES.map((hue) => hslToHex(hue, 0.75, lightness))),
  Array.from({ length: 12 }, (_, i) => hslToHex(0, 0, i / 11)),
];

// Picks a Member's profile color: the quick picks, then "More colors" for
// a full spectrum and a hex box for any exact color.
export default function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const palette = usePalette();
  const isQuickPick = MEMBER_COLORS.some((option) => option.hex === value);
  const [expanded, setExpanded] = useState(!isQuickPick);
  const [hex, setHex] = useState(value);
  const [hexError, setHexError] = useState<string | null>(null);

  const pick = (color: string) => {
    setHex(color);
    setHexError(null);
    onChange(color);
  };

  const onHexChange = (text: string) => {
    const typed = text.startsWith("#") ? text : `#${text}`;
    setHex(typed);
    if (isHexColor(typed)) {
      setHexError(null);
      onChange(typed.toLowerCase());
    } else {
      setHexError(typed.length >= 7 ? "Use six hex digits, like #3a7bd5." : null);
    }
  };

  const swatch = (color: string, size: number, label?: string) => {
    const selected = color.toLowerCase() === value.toLowerCase();
    return (
      <Pressable
        key={color + size}
        accessibilityLabel={label ?? color}
        accessibilityState={{ selected }}
        onPress={() => pick(color)}
        style={[
          { width: size, height: size, borderRadius: size / 2, borderWidth: 3, backgroundColor: color },
          { borderColor: selected ? palette.strongText : "transparent" },
        ]}
      />
    );
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={[styles.label, { color: palette.softText }]}>Your color</Text>
      <View style={styles.swatches}>{MEMBER_COLORS.map((option) => swatch(option.hex, 38, option.name))}</View>
      <Pressable onPress={() => setExpanded((open) => !open)} accessibilityRole="button" hitSlop={8}>
        <Text style={[styles.toggle, { color: palette.primary }]}>{expanded ? "Fewer colors" : "More colors"}</Text>
      </Pressable>
      {expanded ? (
        <View style={{ gap: spacing.sm }}>
          <View style={styles.grid}>
            {SPECTRUM.map((row, index) => (
              <View key={index} style={styles.gridRow}>
                {row.map((color) => swatch(color, 24))}
              </View>
            ))}
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
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  toggle: { fontSize: 14, fontWeight: "600" },
  grid: { gap: 4 },
  gridRow: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
});
