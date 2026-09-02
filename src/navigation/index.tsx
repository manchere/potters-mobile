import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import * as authStorage from "../api/authStorage";
import AddItemScreen from "../screens/AddItemScreen";
import AvailabilityCalendarScreen from "../screens/AvailabilityCalendarScreen";
import IdentifyScreen from "../screens/IdentifyScreen";
import ItemDetailScreen from "../screens/ItemDetailScreen";
import ItemListScreen from "../screens/ItemListScreen";
import LoginScreen from "../screens/LoginScreen";
import MemberHomeScreen from "../screens/MemberHomeScreen";
import MyAssignmentsScreen from "../screens/MyAssignmentsScreen";
import MyRequestsScreen from "../screens/MyRequestsScreen";
import NonAvailabilityRequestScreen from "../screens/NonAvailabilityRequestScreen";
import RegisterScreen from "../screens/RegisterScreen";
import ScanScreen from "../screens/ScanScreen";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MemberHome: undefined;
  MyAssignments: undefined;
  AvailabilityCalendar: undefined;
  MyRequests: undefined;
  NonAvailabilityRequest: { assignmentId: number; assignmentTitle: string };
  ItemList: undefined;
  ItemDetail: { itemId: number };
  AddItem:
    | { prefillImageBase64?: string; prefillName?: string; prefillDescription?: string }
    | undefined;
  Scan: undefined;
  Identify: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // null while the stored token is being checked at startup.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    authStorage.getToken().then((token) => setIsAuthenticated(!!token));
  }, []);

  if (isAuthenticated === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isAuthenticated ? "MemberHome" : "Login"}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" options={{ title: "Log In" }}>
              {(props) => <LoginScreen {...props} onAuthenticated={() => setIsAuthenticated(true)} />}
            </Stack.Screen>
            <Stack.Screen name="Register" options={{ title: "Create Profile" }}>
              {(props) => <RegisterScreen {...props} onAuthenticated={() => setIsAuthenticated(true)} />}
            </Stack.Screen>
          </>
        ) : (
          <>
            <Stack.Screen name="MemberHome" options={{ title: "Home" }}>
              {(props) => <MemberHomeScreen {...props} onLogout={() => setIsAuthenticated(false)} />}
            </Stack.Screen>
            <Stack.Screen name="MyAssignments" component={MyAssignmentsScreen} options={{ title: "My Assignments" }} />
            <Stack.Screen
              name="AvailabilityCalendar"
              component={AvailabilityCalendarScreen}
              options={{ title: "Availability" }}
            />
            <Stack.Screen name="MyRequests" component={MyRequestsScreen} options={{ title: "My Requests" }} />
            <Stack.Screen
              name="NonAvailabilityRequest"
              component={NonAvailabilityRequestScreen}
              options={{ title: "Request Time Off" }}
            />
            <Stack.Screen name="ItemList" component={ItemListScreen} options={{ title: "Inventory" }} />
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
