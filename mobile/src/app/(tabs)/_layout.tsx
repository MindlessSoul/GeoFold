import { Tabs } from 'expo-router/js-tabs';

import { GridIcon, ListIcon, PersonIcon, Pin } from '@/components/icons';
import { C, Fonts } from '@/constants/theme';

/**
 * The design's four destinations. Capture is deliberately not one of them — it is the floating
 * action button on Map and Projects, which is how the prototype gets to it.
 */
export default function TabsLayout() {
  // The navigator hands icons a ColorValue; both tints here are plain hex strings, which is what
  // the icon components draw with.
  const hex = (c: unknown) => c as string;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.ink60,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', fontFamily: Fonts.sans },
        tabBarStyle: { height: 64, paddingTop: 8, paddingBottom: 8, borderTopColor: C.line90, backgroundColor: C.surface },
        sceneStyle: { backgroundColor: C.surface },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Pin color={hex(color)} size={22} filled={false} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color }) => <ListIcon color={hex(color)} />,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color }) => <GridIcon color={hex(color)} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <PersonIcon color={hex(color)} />,
        }}
      />
    </Tabs>
  );
}
