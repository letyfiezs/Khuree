import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { MovieDetailScreen } from '../screens/detail/MovieDetailScreen';
import { SeriesDetailScreen } from '../screens/detail/SeriesDetailScreen';
import { SubscriptionScreen } from '../screens/detail/SubscriptionScreen';
import { WatchPlayerScreen } from '../screens/detail/WatchPlayerScreen';
import { SearchScreen } from '../screens/main/SearchScreen';
import { useAuth } from '../store/AuthContext';
import { colors } from '../theme';
import { MainTabs } from './MainTabs';
import type { AuthStackParamList, RootStackParamList } from './types';

const Root = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
      <Auth.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Auth.Navigator>
  );
}

export function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.red} />
      </View>
    );
  }
  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: { ...DarkTheme.colors, background: colors.ink, card: colors.ink, primary: colors.red },
      }}
    >
      <Root.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
        {user ? (
          <>
            <Root.Screen name="Main" component={MainTabs} />
            <Root.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
            <Root.Screen name="MovieDetail" component={MovieDetailScreen} />
            <Root.Screen name="SeriesDetail" component={SeriesDetailScreen} />
            <Root.Screen name="Watch" component={WatchPlayerScreen} options={{ orientation: 'all', statusBarHidden: true }} />
            <Root.Screen name="Subscription" component={SubscriptionScreen} />
          </>
        ) : (
          <Root.Screen name="Auth" component={AuthStack} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
