import { Tabs } from 'expo-router';

import { BottomTabBar } from '../../src/components/BottomTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="navegacao" />
      <Tabs.Screen name="enderecos" />
      <Tabs.Screen name="otimizar" />
      <Tabs.Screen name="importar" />
      <Tabs.Screen name="conta" />
    </Tabs>
  );
}
