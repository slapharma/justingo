import * as Speech from 'expo-speech';

// Spoken cues, plus a log the UI shows as captions. Captions matter: the preview is often
// demonstrated with the sound off, and a runner may miss a cue over traffic.

type Listener = (text: string) => void;
const listeners = new Set<Listener>();
let muted = false;
let pending = 0;

/** At demo speeds cues arrive faster than they can be spoken; past this many queued, skip ahead. */
const MAX_QUEUE = 2;

export function speak(text: string) {
  listeners.forEach((l) => l(text));
  if (muted) return;
  if (pending >= MAX_QUEUE) {
    Speech.stop();
    pending = 0;
  }
  pending++;
  const done = () => {
    pending = Math.max(0, pending - 1);
  };
  Speech.speak(text, { language: 'en-GB', rate: 1.0, onDone: done, onStopped: done, onError: done });
}

export function onSpoken(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setMuted(value: boolean) {
  muted = value;
  if (value) {
    Speech.stop();
    pending = 0;
  }
}

export function stopSpeaking() {
  Speech.stop();
  pending = 0;
}
