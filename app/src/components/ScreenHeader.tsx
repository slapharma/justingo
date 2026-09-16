import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from '../icons';
import { space } from '../theme';
import { Heading, IconButton } from './ui';

/** Back button and title for stack screens that aren't tabs. */
export default function ScreenHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <IconButton icon={ChevronLeft} onPress={back} label="Back" />
      <Heading size={30} style={{ flex: 1 }}>
        {title}
      </Heading>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
});
