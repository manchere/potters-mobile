import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigation, type NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../auth/AuthContext";
import AddItemScreen from "../screens/AddItemScreen";
import AvailabilityCalendarScreen from "../screens/AvailabilityCalendarScreen";
import IdentifyScreen from "../screens/IdentifyScreen";
import ItemDetailScreen from "../screens/ItemDetailScreen";
import ItemListScreen from "../screens/ItemListScreen";
import LoginScreen from "../screens/LoginScreen";
import MemberHomeScreen from "../screens/MemberHomeScreen";
import MyDutiesScreen from "../screens/MyDutiesScreen";
import MyRequestsScreen from "../screens/MyRequestsScreen";
import NonAvailabilityRequestScreen from "../screens/NonAvailabilityRequestScreen";
import ProfileScreen from "../screens/ProfileScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ScanScreen from "../screens/ScanScreen";
import { usePalette } from "../theme";
import { Loading, type IconName } from "../ui";

export type TabParamList = {
  Home: undefined;
  Duties: undefined;
  Calendar: undefined;
  Inventory: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  MyRequests: undefined;
  NonAvailabilityRequest: { dutyId: number; dutyTitle: string; serviceDate: string };
  ItemDetail: { itemId: number };
  AddItem:
    | { prefillImageBase64?: string; prefillName?: string; prefillDescription?: string; prefillBarcode?: string }
    | undefined;
  Scan: undefined;
  Identify: undefined;
};

// Any screen (tab or stack) can push the stack screens above.
export function useAppNavigation() {
  return useNavigation<NativeStackNavigationProp<RootStackParamList>>();
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [IconName, IconName]> = {
  Home: ["home", "home-outline"],
  Duties: ["calendar-number", "calendar-number-outline"],
  Calendar: ["calendar-clear", "calendar-clear-outline"],
  Inventory: ["cube", "cube-outline"],
  Profile: ["person-circle", "person-circle-outline"],
};

function Tabs() {
  const palette = usePalette();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: palette.surface },
        headerTitleStyle: { color: palette.strongText, fontWeight: "700" },
        headerShadowVisible: false,
        tabBarStyle: { backgroundColor: palette.tabBar, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.tabActive,
        tabBarInactiveTintColor: palette.tabInactive,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={MemberHomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Duties" component={MyDutiesScreen} options={{ title: "My Duties", tabBarLabel: "Duties" }} />
      <Tab.Screen name="Calendar" component={AvailabilityCalendarScreen} options={{ title: "Availability", tabBarLabel: "Calendar" }} />
      <Tab.Screen name="Inventory" component={ItemListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { status } = useAuth();
  const palette = usePalette();

  if (status === "loading") {
    return <Loading />;
  }

  const base = palette.dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.dark ? palette.accentText : palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.strongText,
      border: palette.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.strongText, fontWeight: "700" },
          headerTintColor: palette.dark ? palette.accentText : palette.primary,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        {status === "signedOut" ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: "Create Profile" }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: "My Requests" }} />
            <Stack.Screen
              name="NonAvailabilityRequest"
              component={NonAvailabilityRequestScreen}
              options={{ title: "Request Time Off", presentation: "modal" }}
            />
            <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item" }} />
            <Stack.Screen name="AddItem" component={AddItemScreen} options={{ title: "Add Item" }} />
            <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan Barcode" }} />
            <Stack.Screen name="Identify" component={IdentifyScreen} options={{ title: "Identify Item" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
