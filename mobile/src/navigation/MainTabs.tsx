import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { HomeScreen } from '../screens/main/HomeScreen';
import { LiveScreen } from '../screens/main/LiveScreen';
import { MoviesScreen } from '../screens/main/MoviesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { SeriesScreen } from '../screens/main/SeriesScreen';
import { colors } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const icons: Record<keyof MainTabParamList, string> = {
  Home: '⌂',
  Movies: '▷',
  Series: '☰',
  Live: '●',
  Profile: '☺',
};

function TabIcon({ name, focused }: { name: keyof MainTabParamList; focused: boolean }) {
  return <Text style={{ color: focused ? colors.red : '#8d8d8d', fontSize: 16, lineHeight: 24, fontFamily: 'Rubik-Regular' }}>{icons[name]}</Text>;
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? colors.red : '#9a9a9a', fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Bold', marginBottom: 4 }}>{label}</Text>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: '#090909', borderTopColor: '#222', height: 68, paddingTop: 6 },
        tabBarActiveTintColor: colors.red,
        tabBarInactiveTintColor: '#9a9a9a',
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: ({ focused }) => <TabLabel label="Нүүр" focused={focused} /> }} />
      <Tab.Screen name="Movies" component={MoviesScreen} options={{ tabBarLabel: ({ focused }) => <TabLabel label="Кино" focused={focused} /> }} />
      <Tab.Screen name="Series" component={SeriesScreen} options={{ tabBarLabel: ({ focused }) => <TabLabel label="Цуврал" focused={focused} /> }} />
      <Tab.Screen name="Live" component={LiveScreen} options={{ tabBarLabel: ({ focused }) => <TabLabel label="Шууд" focused={focused} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: ({ focused }) => <TabLabel label="Профайл" focused={focused} /> }} />
    </Tab.Navigator>
  );
}
