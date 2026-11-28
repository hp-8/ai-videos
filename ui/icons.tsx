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
export const Mark = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5" y="1.5" width="14" height="21" rx="4" fill="currentColor" />
    <path d="M10 9.2v5.6l4.8-2.8z" fill="var(--sand)" />
  </svg>
);
