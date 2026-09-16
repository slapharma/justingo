import type { ReactNode } from 'react';

/** On iOS and Android the app is the whole screen; the desktop frame lives in PreviewShell.web.tsx. */
export default function PreviewShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
