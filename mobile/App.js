import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import DashboardScreen from './src/screens/mobile/DashboardScreen';
import DashboardDesktopScreen from './src/screens/desktop/DashboardDesktopScreen';

const Stack = createStackNavigator();
const isWeb = Platform.OS === 'web';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isWeb
          ? <Stack.Screen name="Dashboard" component={DashboardDesktopScreen} />
          : <Stack.Screen name="Dashboard" component={DashboardScreen} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
