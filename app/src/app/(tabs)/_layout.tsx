import { Tabs } from 'expo-router/js-tabs';
import { Clock, Compass, PenLine, User, Users } from '../../icons';
import { font, useTheme } from '../../theme';

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.ink,
        tabBarInactiveTintColor: theme.muted,
        tabBarActiveBackgroundColor: theme.surface,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: 11 },
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color, focused }) => <Compass color={focused ? theme.accent : color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="create" options={{ title: 'Create', tabBarIcon: ({ color, focused }) => <PenLine color={focused ? theme.accent : color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="community" options={{ title: 'Community', tabBarIcon: ({ color, focused }) => <Users color={focused ? theme.accent : color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color, focused }) => <Clock color={focused ? theme.accent : color} size={24} strokeWidth={2.25} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color, focused }) => <User color={focused ? theme.accent : color} size={24} strokeWidth={2.25} /> }} />
    </Tabs>
  );
}
