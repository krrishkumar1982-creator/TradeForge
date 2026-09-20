import { CustomTag } from '../types';

/**
 * Standard System Tag Colors mapped to canonical institutional palettes.
 */
export const DEFAULT_TAG_COLORS: Record<string, string> = {
  'moved stop': '#DC2626',      // Red
  'early exit': '#EC4899',      // Pink / Magenta
  'breakout': '#8B5CF6',        // Violet / Blue
  'fomo': '#F59E0B',            // Amber / Orange
  'clean trend': '#14B8A6',     // Teal / Green
  'a+ setup': '#10B981',        // Emerald
  'opening drive': '#3B82F6',   // Royal Blue
  'revenge trading': '#EF4444', // Crimson Red
  'disciplined': '#06B6D4',     // Cyan
  'news volatility': '#6366F1', // Indigo
  'fomc': '#8B5CF6',            // Purple / Violet
  'plan': '#3B82F6',            // Blue
  'mistake': '#EF4444',         // Red
  'equities': '#F59E0B',        // Amber
  'futures': '#06B6D4',         // Cyan
  'forex': '#6366F1',           // Indigo
  'crypto': '#A855F7',          // Purple
  'stocks': '#10B981',          // Emerald
  'cfds': '#3B82F6',            // Blue
  'indices': '#8B5CF6',         // Violet
  'commodities': '#F59E0B',     // Amber
};

const COLOR_HASH_PALETTE = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F43F5E', // Rose
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#14B8A6', // Teal
  '#EC4899', // Pink
  '#DC2626', // Red
];

/**
 * Parse hex string to rgba with specified alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex) return `rgba(99, 102, 241, ${alpha})`;
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(char => char + char).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Deterministically resolve a tag color from user's customTags list, default map, or hash.
 */
export function getTagColor(
  tagName: string,
  customTags?: Array<{ id?: string; name: string; color: string; [key: string]: any }>
): string {
  if (!tagName) return '#6366F1';
  const cleanName = tagName.trim().toLowerCase();

  // 1. Check user custom tags list
  if (customTags && customTags.length > 0) {
    const found = customTags.find(
      t => t.name.toLowerCase() === cleanName || t.id.toLowerCase() === cleanName
    );
    if (found?.color) return found.color;
  }

  // 2. Check canonical default tag colors
  if (DEFAULT_TAG_COLORS[cleanName]) {
    return DEFAULT_TAG_COLORS[cleanName];
  }

  // 3. Fallback to deterministic hash palette
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_HASH_PALETTE.length;
  return COLOR_HASH_PALETTE[index];
}

/**
 * Returns dynamic styling for Tag Management Cards.
 * Features a subtle tinted background, tinted border, and soft glow based on the tag's color.
 */
export function getTagCardStyle(color: string, isLight = false): React.CSSProperties {
  const bgTint = hexToRgba(color, isLight ? 0.08 : 0.12);
  const bgBase = isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(18, 22, 29, 0.96)';
  const borderColor = hexToRgba(color, isLight ? 0.32 : 0.28);
  const glow = `0 4px 20px -2px ${hexToRgba(color, isLight ? 0.10 : 0.16)}`;

  return {
    background: `linear-gradient(145deg, ${bgTint} 0%, ${bgBase} 100%)`,
    borderColor,
    boxShadow: glow,
  };
}

/**
 * Returns inline styling for Tag Badges/Chips anywhere in the app.
 */
export function getTagBadgeStyle(
  tagName: string,
  customTags?: Array<{ id?: string; name: string; color: string; [key: string]: any }>,
  isLight = false
): React.CSSProperties {
  const color = getTagColor(tagName, customTags);
  return {
    backgroundColor: hexToRgba(color, isLight ? 0.12 : 0.16),
    borderColor: hexToRgba(color, isLight ? 0.40 : 0.35),
    color: isLight ? color : color,
  };
}
