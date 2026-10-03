import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, DefaultTheme, NavigationContainer, useNavigation, type NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { Duty, Song } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import AddItemScreen from "../screens/AddItemScreen";
import AvailabilityCalendarScreen from "../screens/AvailabilityCalendarScreen";
import DutyEditScreen from "../screens/DutyEditScreen";
import FeedbackScreen from "../screens/FeedbackScreen";
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
import ReportsScreen from "../screens/ReportsScreen";
import ScanScreen from "../screens/ScanScreen";
import ScheduleScreen from "../screens/ScheduleScreen";
import SongDetailScreen from "../screens/SongDetailScreen";
import SongEditScreen from "../screens/SongEditScreen";
import SongsScreen from "../screens/SongsScreen";
import { usePalette } from "../theme";
import { Loading, type IconName } from "../ui";

export type TabParamList = {
  Home: undefined;
  Schedule: undefined;
  Calendar: undefined;
  Inventory: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  MyDuties: undefined;
  MyRequests: undefined;
  // Admins only; no duty means adding one to that Sunday.
  DutyEdit: { date: string; duty?: Duty };
  Reports: undefined;
  Songs: undefined;
  SongDetail: { song: Song };
  // No song means adding one.
  SongEdit: { song?: Song };
  Feedback: undefined;
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
  Schedule: ["people", "people-outline"],
  Calendar: ["calendar-clear", "calendar-clear-outline"],
  Inventory: ["cube", "cube-outline"],
  Profile: ["person-circle", "person-circle-outline"],
};

function Tabs() {
  const palette = usePalette();
  const { access } = useAuth();
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
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: "Schedule" }} />
      <Tab.Screen name="Calendar" component={AvailabilityCalendarScreen} options={{ title: "Days Away", tabBarLabel: "Away" }} />
      {access.sections.inventory.view ? <Tab.Screen name="Inventory" component={ItemListScreen} /> : null}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { status, firstLaunch } = useAuth();
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
        // A phone no one has signed in on yet opens on Create Profile.
        initialRouteName={status === "signedOut" && firstLaunch ? "Register" : undefined}
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
            <Stack.Screen name="MyDuties" component={MyDutiesScreen} options={{ title: "My Duties" }} />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: "My Requests" }} />
            <Stack.Screen name="DutyEdit" component={DutyEditScreen} options={{ title: "Duty", presentation: "modal" }} />
            <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: "Reports" }} />
            <Stack.Screen name="Songs" component={SongsScreen} options={{ title: "Songs" }} />
            <Stack.Screen name="SongDetail" component={SongDetailScreen} options={{ title: "Song" }} />
            <Stack.Screen name="SongEdit" component={SongEditScreen} options={{ title: "Song" }} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ title: "Feedback" }} />
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
