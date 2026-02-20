import crypto from 'crypto';
import { ValidationError } from './errors';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate and sanitize email (throws ValidationError if invalid)
 */
export function validateAndSanitizeEmail(email: string): string {
    const sanitized = email.trim().slice(0, 255);
    if (!validateEmail(sanitized)) {
        throw new ValidationError('email', 'Invalid email format');
    }
    return sanitized;
}

/**
 * Validate feedback type
 */
export function validateFeedbackType(type: string): type is 'bug' | 'improvement' | 'other' {
    return ['bug', 'improvement', 'other'].includes(type);
}

/**
 * Type guard for non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Create secure hash from IP address (SHA-256, async)
 */
export async function hashIP(ip: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(ip);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create secure hash from IP address (SHA-256, sync — Node.js only)
 */
export function hashIPSync(ip: string): string {
    return crypto.createHash('sha256').update(ip).digest('hex');
}

/**
 * Validate route ID format (alphanumeric with optional hyphens/dots)
 */
export function validateRouteId(routeId: string): boolean {
    return /^[a-zA-Z0-9.-]+$/.test(routeId);
}

/**
 * Extract and validate IP from request headers
 */
export function extractIP(forwardedFor: string | null, fallback = 'unknown'): string {
    if (!forwardedFor) return fallback;
    const ip = forwardedFor.split(',')[0].trim();
    return ip || fallback;
}
