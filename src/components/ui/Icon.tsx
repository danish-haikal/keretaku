import type { CSSProperties } from 'react';
import type { BodyType } from '@/types/database';

/**
 * Single inline-SVG icon set. Each icon keeps its own viewBox — the prototype's
 * squashed-chevron bug came from forcing one viewBox onto every glyph.
 */
export type IconName =
  | 'garage'
  | 'bell'
  | 'user'
  | 'chevron-right'
  | 'chevron-left'
  | 'close'
  | 'plus'
  | 'check'
  | 'edit'
  | 'trash'
  | 'search'
  | 'doc'
  | 'wrench'
  | 'wallet'
  | 'fuel'
  | 'bolt'
  | 'hybrid'
  | 'sun'
  | 'moon'
  | 'auto'
  | 'gauge'
  | 'logout'
  | BodyIconName;

type BodyIconName = `body-${BodyType}`;

interface Path {
  viewBox: string;
  content: React.ReactNode;
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const ICONS: Record<IconName, Path> = {
  garage: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M4 17V8.5a2 2 0 0 1 .4-1.2L6 5h12l1.6 2.3a2 2 0 0 1 .4 1.2V17" />
        <circle cx="7.5" cy="17" r="1.6" />
        <circle cx="16.5" cy="17" r="1.6" />
      </g>
    ),
  },
  bell: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M6 8a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 12 6 8Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </g>
    ),
  },
  user: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M4.5 20c1.6-3.6 4.6-5.5 7.5-5.5s5.9 1.9 7.5 5.5" />
      </g>
    ),
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M9 5l7 7-7 7" />,
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M15 5l-7 7 7 7" />,
  },
  close: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M6 6l12 12M18 6L6 18" />,
  },
  plus: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M12 5v14M5 12h14" />,
  },
  check: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M4 12.5 9.5 18 20 6" />,
  },
  edit: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  },
  trash: {
    viewBox: '0 0 24 24',
    content: (
      <path
        {...stroke}
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-9 0 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
      />
    ),
  },
  search: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </g>
    ),
  },
  doc: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M6 4h9l3 3v13H6z" />
        <path d="M9 12h6M9 16h6" />
      </g>
    ),
  },
  wrench: {
    viewBox: '0 0 24 24',
    content: (
      <path
        {...stroke}
        d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2Z"
      />
    ),
  },
  wallet: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path d="M3 10h18" />
        <circle cx="16.5" cy="14" r="1" />
      </g>
    ),
  },
  fuel: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M4 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15" />
        <path d="M4 11h8" />
        <path d="M14 8h2l3 3v6a1.5 1.5 0 0 1-3 0v-1a1 1 0 0 0-1-1h-1" />
        <path d="M2 21h14" />
      </g>
    ),
  },
  bolt: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  },
  hybrid: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M4 20V9a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v11" />
        <path d="M2 20h13" />
        <path d="M19 6l-3 5h3l-3 5" />
      </g>
    ),
  },
  sun: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
      </g>
    ),
  },
  moon: {
    viewBox: '0 0 24 24',
    content: <path {...stroke} d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5Z" />,
  },
  auto: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <rect x="3" y="4" width="18" height="16" rx="3" />
        <path d="M12 4v16" />
      </g>
    ),
  },
  gauge: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M4 17a8 8 0 1 1 16 0" />
        <path d="M12 17l4-5" />
      </g>
    ),
  },
  logout: {
    viewBox: '0 0 24 24',
    content: (
      <g {...stroke}>
        <path d="M14 5H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7" />
        <path d="M17 15l3-3-3-3M20 12h-9" />
      </g>
    ),
  },
  'body-compact': {
    viewBox: '0 0 32 20',
    content: (
      <g {...stroke} strokeWidth={1.7}>
        <path d="M4.5 13.5 6 8c.4-1.3 1.6-2 3-2h10c1.2 0 2.3.6 2.9 1.7L24.5 12" />
        <path d="M2.5 13.5h27" />
        <circle cx="9" cy="16" r="2.6" />
        <circle cx="23" cy="16" r="2.6" />
      </g>
    ),
  },
  'body-sedan': {
    viewBox: '0 0 32 20',
    content: (
      <g {...stroke} strokeWidth={1.7}>
        <path d="M3 13.5 5 8.5c.4-1 1.3-1.6 2.3-1.7L13 6h4l5 2 4.5 3.5" />
        <path d="M1.5 13.5h29" />
        <circle cx="8.5" cy="16" r="2.6" />
        <circle cx="23.5" cy="16" r="2.6" />
      </g>
    ),
  },
  'body-suv': {
    viewBox: '0 0 32 22',
    content: (
      <g {...stroke} strokeWidth={1.7}>
        <path d="M4 14.5 5 6.5C5.3 5.1 6.5 4.2 8 4.2h11c1.1 0 2.1.5 2.8 1.4L25.5 11l3 1.2" />
        <path d="M1.5 14.5h29" />
        <circle cx="9" cy="17.5" r="2.9" />
        <circle cx="23.5" cy="17.5" r="2.9" />
        <path d="M14 4.4v9.6" />
      </g>
    ),
  },
  'body-mpv': {
    viewBox: '0 0 32 22',
    content: (
      <g {...stroke} strokeWidth={1.7}>
        <path d="M4 14.5V6.6C4 5.2 5.2 4 6.7 4h14.6c1.4 0 2.7.8 3.4 2l3.3 5.6v2.9" />
        <path d="M1.5 14.5h29" />
        <circle cx="9" cy="17.5" r="2.9" />
        <circle cx="23.5" cy="17.5" r="2.9" />
        <path d="M12 4.2v10.3M19 4.2v10.3" />
      </g>
    ),
  },
  'body-motorcycle': {
    viewBox: '0 0 32 22',
    content: (
      <g {...stroke} strokeWidth={1.7}>
        <circle cx="7" cy="15.5" r="4" />
        <circle cx="25" cy="15.5" r="4" />
        <path d="M7 15.5 12.5 9H18l3.5 3.5h3.5" />
        <path d="M12.5 9l2.5 4h5" />
        <path d="M17.5 8.5 21 6h3.5" />
      </g>
    ),
  },
};

interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function Icon({ name, size = 20, className, style }: IconProps) {
  const icon = ICONS[name];
  return (
    <svg
      viewBox={icon.viewBox}
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {icon.content}
    </svg>
  );
}
