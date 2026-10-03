import { CameraView, useCameraPermissions, type CameraViewProps } from "expo-camera";
import { forwardRef, type ReactNode } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";

import { spacing, usePalette } from "../theme";
import { Button, EmptyState, Loading } from "./index";

// The camera, or -- until access is granted -- why it's needed with a way
// to grant it (FR1: a denial shows an explanation and a retry, never a dead
// screen). If the phone won't ask again, the button opens Settings.
const CameraWithPermission = forwardRef<CameraView, CameraViewProps & { reason: string; children?: ReactNode }>(
  function CameraWithPermission({ reason, children, ...cameraProps }, ref) {
    const [permission, requestPermission] = useCameraPermissions();
    const palette = usePalette();
    if (!permission) {
      return <Loading />;
    }
    if (!permission.granted) {
      return (
        <View style={{ flex: 1, backgroundColor: palette.background, padding: spacing.xl }}>
          <EmptyState
            icon="camera-outline"
            title="Camera access needed"
            message={reason}
            action={
              <Button
                title={permission.canAskAgain ? "Allow Camera" : "Open Settings"}
                icon={permission.canAskAgain ? "camera" : "settings-outline"}
                onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
                style={{ marginTop: spacing.md, alignSelf: "stretch" }}
              />
            }
          />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <CameraView ref={ref} style={StyleSheet.absoluteFill} facing="back" {...cameraProps} />
        {children}
      </View>
    );
  },
);

export default CameraWithPermission;

// A round shutter button for the bottom of a camera view.
export function Shutter({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  return (
    <View style={styles.shutterArea} pointerEvents="box-none">
      <Button title="" onPress={onPress} disabled={disabled} variant="ghost" style={styles.shutterButton} />
    </View>
  );
}

export function CameraHint({ children }: { children: ReactNode }) {
  return (
    <View style={styles.hintArea} pointerEvents="none">
      <Text style={styles.hint}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  shutterArea: { position: "absolute", bottom: 40, left: 0, right: 0, alignItems: "center" },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: 0,
  },
  hintArea: { position: "absolute", top: 20, left: 0, right: 0, alignItems: "center" },
  hint: {
    color: "#fff",
    backgroundColor: "rgba(11,26,51,0.75)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    overflow: "hidden",
    fontWeight: "600",
  },
});
