import { cn, getRiskLevel, getRiskStyles, getRiskLabel } from '@/lib/ui-utils';

interface StatusChipProps {
    risk: number;
    label?: string;
    showPercentage?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * Risk Level Status Chip
 * Displays risk percentage with appropriate color coding
 */
export function StatusChip({
    risk,
    label,
    showPercentage = true,
    size = 'md',
    className,
}: StatusChipProps) {
    const styles = getRiskStyles(risk);
    const riskLabel = getRiskLabel(risk);

    const sizeStyles = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded font-medium border',
                styles.bg,
                styles.text,
                styles.border,
                sizeStyles[size],
                className
            )}
        >
            {label && <span className="opacity-75">{label}:</span>}
            <span className="font-bold">
                {showPercentage ? `${risk}%` : riskLabel}
            </span>
        </div>
    );
}

/**
 * Large Risk Display (for main prediction result)
 */
export function RiskDisplay({ risk }: { risk: number }) {
    const styles = getRiskStyles(risk);
    const level = getRiskLevel(risk);

    return (
        <div
            className={cn(
                'rounded-xl p-6 border-2 ring-4',
                styles.bg,
                styles.border,
                styles.ring
            )}
        >
            <div className="text-center">
                <div className={cn('text-5xl md:text-6xl font-black mb-2', styles.text)}>
                    {risk}%
                </div>
                <div className={cn('text-base md:text-lg font-bold', styles.text)}>
                    {getRiskLabel(risk)}
                </div>
            </div>
        </div>
    );
}

/**
 * Compact Risk Badge (for lists)
 */
export function RiskBadge({ risk }: { risk: number }) {
    const styles = getRiskStyles(risk);

    return (
        <span
            className={cn(
                'inline-block text-xs font-bold px-2 py-0.5 rounded',
                styles.bg,
                styles.text
            )}
        >
            {risk}%
        </span>
    );
}
