import { cn } from '@/lib/ui-utils';
import { type ReactNode } from 'react';

interface ResponsiveGridProps {
    children: ReactNode;
    cols?: {
        mobile?: number;
        tablet?: number;
        desktop?: number;
    };
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Mobile-First Responsive Grid
 * Automatically adjusts columns based on screen size
 */
export function ResponsiveGrid({
    children,
    cols = { mobile: 1, tablet: 2, desktop: 3 },
    gap = 'md',
    className,
}: ResponsiveGridProps) {
    const { mobile = 1, tablet = 2, desktop = 3 } = cols;

    const gapStyles = {
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
    };

    // Build responsive grid classes
    const gridCols = cn(
        `grid-cols-${mobile}`,
        `sm:grid-cols-${tablet}`,
        `lg:grid-cols-${desktop}`
    );

    return (
        <div className={cn('grid', gridCols, gapStyles[gap], className)}>
            {children}
        </div>
    );
}

/**
 * Responsive Container with max-width constraints
 */
export function Container({
    children,
    size = 'md',
    className,
}: {
    children: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    className?: string;
}) {
    const sizeStyles = {
        sm: 'max-w-lg',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full',
    };

    return (
        <div className={cn('mx-auto px-4 sm:px-6', sizeStyles[size], className)}>
            {children}
        </div>
    );
}

/**
 * Stack layout with consistent spacing
 */
export function Stack({
    children,
    spacing = 'md',
    className,
}: {
    children: ReactNode;
    spacing?: 'sm' | 'md' | 'lg';
    className?: string;
}) {
    const spacingStyles = {
        sm: 'space-y-2',
        md: 'space-y-4',
        lg: 'space-y-6',
    };

    return (
        <div className={cn(spacingStyles[spacing], className)}>
            {children}
        </div>
    );
}
