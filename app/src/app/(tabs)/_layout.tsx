import { Tabs } from 'expo-router/js-tabs';
import { Clock, Compass, PenLine } from '../../icons';
import { font, useTheme } from '../../theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentText,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 12 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Compass color={color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: ({ color }) => <PenLine color={color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Clock color={color} size={24} strokeWidth={2.25} /> }} />
    </Tabs>
  );
}
