/**
 * UI Utility Functions
 * Centralized utilities for consistent styling and responsive design
 */

// cn() は lib/utils.ts に統一 — 二重定義を防止
export { cn } from '@/lib/utils';

/**
 * Risk level classification
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'severe';

export function getRiskLevel(risk: number): RiskLevel {
    if (risk >= 80) return 'severe';
    if (risk >= 50) return 'high';
    if (risk >= 30) return 'medium';
    return 'low';
}

/**
 * Get risk-based styling classes
 */
export function getRiskStyles(risk: number): {
    bg: string;
    text: string;
    border: string;
    ring: string;
} {
    const level = getRiskLevel(risk);

    const styles = {
        low: {
            bg: 'bg-emerald-50',
            text: 'text-emerald-700',
            border: 'border-emerald-200',
            ring: 'ring-emerald-500/20',
        },
        medium: {
            bg: 'bg-yellow-50',
            text: 'text-yellow-700',
            border: 'border-yellow-200',
            ring: 'ring-yellow-500/20',
        },
        high: {
            bg: 'bg-orange-50',
            text: 'text-orange-700',
            border: 'border-orange-200',
            ring: 'ring-orange-500/20',
        },
        severe: {
            bg: 'bg-red-50',
            text: 'text-red-700',
            border: 'border-red-200',
            ring: 'ring-red-500/20',
        },
    };

    return styles[level];
}

/**
 * Get risk label text
 */
export function getRiskLabel(risk: number): string {
    const level = getRiskLevel(risk);

    const labels = {
        low: '通常運行',
        medium: '注意',
        high: '警戒',
        severe: '運休見込み',
    };

    return labels[level];
}

/**
 * Responsive breakpoints (matches Tailwind defaults)
 */
export const breakpoints = {
    sm: 640,   // Small devices
    md: 768,   // Medium devices (tablets)
    lg: 1024,  // Large devices (desktops)
    xl: 1280,  // Extra large devices
    '2xl': 1536, // 2X large devices
} as const;

/**
 * Check if current viewport matches breakpoint
 * (Client-side only)
 */
export function matchesBreakpoint(breakpoint: keyof typeof breakpoints): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(min-width: ${breakpoints[breakpoint]}px)`).matches;
}

/**
 * Format time for display
 */
export function formatTime(time: string): string {
    return time.slice(0, 5); // HH:MM
}

/**
 * Get transport mode icon/emoji
 */
export function getTransportIcon(type: string): string {
    const icons: Record<string, string> = {
        bus: '🚌',
        subway: '🚇',
        taxi: '🚖',
        car: '🚗',
        train: '🚃',
        hotel: '🏨',
        cafe: '☕',
    };
    return icons[type] || '🚉';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format currency (JPY)
 */
export function formatCurrency(amount: number): string {
    return `¥${amount.toLocaleString('ja-JP')}`;
}
