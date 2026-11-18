import type { CapacitorConfig } from '@capacitor/cli'
const config: CapacitorConfig = {
  appId: 'de.manhunt.game', appName: 'In the Zone', webDir: 'dist',
  android: { backgroundColor: '#0b121b' },
  ios: { backgroundColor: '#0b121b', contentInset: 'automatic' },
}
export default config
