import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AddressBookProvider } from '../src/addressBook/AddressBookContext';
import { AuthProvider } from '../src/auth/AuthContext';
import { PreferencesProvider } from '../src/preferences/PreferencesContext';
import { StopsProvider } from '../src/stops/StopsContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StopsProvider>
        <PreferencesProvider>
          <AddressBookProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="add-stop"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="pick-location"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="upgrade"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen name="faq" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen
                name="contact"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen name="about" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen
                name="pick-default-address"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="add-saved-address"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="address-detail"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="edit-client"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="add-stops-batch"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="pick-saved-address"
                options={{ presentation: 'modal', headerShown: false }}
              />
            </Stack>
            <StatusBar style="light" />
          </AddressBookProvider>
        </PreferencesProvider>
      </StopsProvider>
    </AuthProvider>
  );
}
