// One stroke family: 24px grid, 1.75 stroke, round caps.
const I = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
export const Check = () => <I d="M5 12.5l4.5 4.5L19 7.5" />;
export const Alert = () => <I d="M12 8v5M12 16.5v.01M10.3 3.9L2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />;
export const Dot = () => <I d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0" />;
export const Copy = () => <I d="M9 9h10v10H9zM5 15V5h10" size={16} />;
export const Refresh = () => <I d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4" size={16} />;
export const Arrow = () => <I d="M5 12h14M13 6l6 6-6 6" size={16} />;
export const Film = () => <I d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM10.5 9.5v5l4-2.5z" />;
export const Gear = () => <I d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />;
export const Back = () => <I d="M15 5l-7 7 7 7" />;
export const Export = () => <I d="M12 15V3M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" size={16} />;
export const Sparkle = () => <I d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" size={16} />;
export const Plus = () => <I d="M12 5v14M5 12h14" />;
export const Mic = () => <I d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" size={16} />;
export const Upload = () => <I d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" size={16} />;
export const Stop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2.5" fill="currentColor" /></svg>
);
export const Mark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="1.5" width="14" height="21" rx="4" fill="currentColor" />
    <path d="M10 9.2v5.6l4.8-2.8z" fill="var(--sand)" />
  </svg>
);
