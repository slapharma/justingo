import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { setSim } from '../simControls';
import { font, runTheme, space } from '../theme';
import SimPanel from './SimPanel';

const PHONE = { width: 390, height: 844 };
/** Below this the browser is a phone or a narrow window: show the app full screen, no frame. */
const FRAME_MIN_WIDTH = 1080;

/**
 * Desktop browser preview: the real app inside a phone-sized frame, with demo controls beside it.
 * On a phone, or a narrow window, the app simply fills the screen.
 */
export default function PreviewShell({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const framed = width >= FRAME_MIN_WIDTH && height >= 700;

  useEffect(() => {
    setSim({ panelVisible: framed });
  }, [framed]);

  // Scale the phone down on short screens rather than cropping it.
  const scale = Math.min(1, (height - 48) / PHONE.height);

  // `children` must sit at the same position in the tree framed or not. Otherwise resizing across
  // the breakpoint (docking devtools, snapping the window) remounts the app and restarts a run.
  return (
    <View style={framed ? styles.page : styles.fill}>
      {framed && (
        <View style={styles.intro}>
          <Text style={styles.brand}>
            Justin<Text style={{ color: runTheme.accent }}>Go</Text>
          </Text>
          <Text style={styles.tagline}>Run anywhere in London. Just listen for the next turn.</Text>
          <Text style={styles.note}>
            This is the working app running in your browser, the same code that will ship to iPhone and Android.
          </Text>
          <a href="/" style={{ color: runTheme.accentText, fontFamily: font.bodyBold, fontSize: 15, textDecoration: 'none' }}>
            ← Back to the website
          </a>
        </View>
      )}

      <View style={framed ? { width: PHONE.width * scale, height: PHONE.height * scale } : styles.fill}>
        <View style={framed ? ([styles.phone, { transform: [{ scale }], transformOrigin: 'top left' }] as never) : styles.fill}>
          <View style={framed ? styles.screen : styles.fill}>{children}</View>
        </View>
      </View>

      {framed && <SimPanel />}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    backgroundColor: '#0B0907',
    backgroundImage: 'radial-gradient(circle at 50% 40%, rgba(255,106,43,0.18), transparent 55%)',
    padding: space.xl,
  } as never,
  intro: { width: 280, gap: space.md },
  brand: { fontFamily: font.display, fontSize: 64, color: runTheme.ink, textTransform: 'uppercase', lineHeight: 64 },
  tagline: { fontFamily: font.displaySemi, fontSize: 26, lineHeight: 30, color: runTheme.ink },
  note: { fontFamily: font.body, fontSize: 15, lineHeight: 22, color: runTheme.muted },
  phone: {
    width: PHONE.width,
    height: PHONE.height,
    borderRadius: 56,
    borderWidth: 12,
    borderColor: '#2A2420',
    backgroundColor: '#000',
    boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 0 2px #3A322C',
  } as never,
  screen: { flex: 1, borderRadius: 44, overflow: 'hidden' },
});
