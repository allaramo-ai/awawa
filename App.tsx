import { StatusBar } from 'expo-status-bar';

import { SetupScreen } from './src/screens/SetupScreen';

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <SetupScreen />
    </>
  );
}
