import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider } from '../src/auth/AuthContext';
import { StopsProvider } from '../src/stops/StopsContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StopsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="add-stop" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen
            name="pick-location"
            options={{ presentation: 'modal', headerShown: false }}
          />
        </Stack>
        <StatusBar style="auto" />
      </StopsProvider>
    </AuthProvider>
  );
}
