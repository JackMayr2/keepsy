import { StyleSheet, View } from 'react-native';
import { Text } from '@/src/components/ui';

export default function DatabaseTestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Database Test</Text>
      <Text style={styles.subtitle}>Dev-only — Phase 1</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});
