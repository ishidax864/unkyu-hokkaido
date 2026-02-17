import { cn } from '@/lib/ui-utils';
import { type ReactNode } from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
    children: ReactNode;
    variant?: BadgeVariant;
    size?: BadgeSize;
    className?: string;
    pulse?: boolean;
}

/**
 * Reusable Badge Component
 * Replaces hard-coded badge styles across the app
 */
export function Badge({
    children,
    variant = 'default',
    size = 'md',
    className,
    pulse = false,
}: BadgeProps) {
    const variantStyles = {
        success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        danger: 'bg-red-100 text-red-700 border-red-200',
        info: 'bg-blue-100 text-blue-700 border-blue-200',
        default: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const sizeStyles = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    return (
        <span
            className={cn(
                'inline-flex items-center font-medium rounded border',
                variantStyles[variant],
                sizeStyles[size],
                pulse && 'animate-pulse',
                className
            )}
        >
            {children}
        </span>
    );
}

/**
 * Compact Badge for tight spaces (like corner ribbons)
 */
export function CompactBadge({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'inline-block text-xs font-bold px-2 py-1 rounded',
                className
            )}
        >
            {children}
        </span>
    );
}

/**
 * Ribbon Badge (for "RECOMMENDED" style badges)
 */
export function RibbonBadge({
    children,
    variant = 'success',
}: {
    children: ReactNode;
    variant?: 'success' | 'warning' | 'info';
}) {
    const variantStyles = {
        success: 'bg-emerald-500 text-white',
        warning: 'bg-orange-500 text-white',
        info: 'bg-blue-500 text-white',
    };

    return (
        <div className={cn(
            'absolute top-0 right-0 text-xs font-bold px-2 py-1 rounded-bl-lg',
            variantStyles[variant]
        )}>
            {children}
        </div>
    );
}
