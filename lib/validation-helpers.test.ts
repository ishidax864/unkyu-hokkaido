import { describe, it, expect } from 'vitest';
import {
    validateEmail,
    validateUrl,
    sanitizeString,
    validateAndSanitizeEmail,
    validateFeedbackType,
    validateReportType,
    isNonEmptyString,
    validateRouteId,
    extractIP,
} from './validation-helpers';
import { ValidationError } from './errors';

describe('validation-helpers', () => {
    describe('validateEmail', () => {
        it('should validate correct email addresses', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('user.name+tag@example.co.jp')).toBe(true);
        });

        it('should reject invalid email addresses', () => {
            expect(validateEmail('invalid')).toBe(false);
            expect(validateEmail('test@')).toBe(false);
            expect(validateEmail('@example.com')).toBe(false);
            expect(validateEmail('test @example.com')).toBe(false);
        });
    });

    describe('validateUrl', () => {
        it('should validate correct URLs', () => {
            expect(validateUrl('https://example.com')).toBe(true);
            expect(validateUrl('http://localhost:3000')).toBe(true);
        });

        it('should reject invalid URLs', () => {
            expect(validateUrl('not-a-url')).toBe(false);
            expect(validateUrl('ftp://example')).toBe(true); // FTP is valid
            expect(validateUrl('')).toBe(false);
        });
    });

    describe('sanitizeString', () => {
        it('should trim and limit string length', () => {
            expect(sanitizeString('  hello  ', 10)).toBe('hello');
            expect(sanitizeString('a'.repeat(100), 10)).toBe('a'.repeat(10));
        });

        it('should handle empty strings', () => {
            expect(sanitizeString('', 10)).toBe('');
            expect(sanitizeString('   ', 10)).toBe('');
        });
    });

    describe('validateAndSanitizeEmail', () => {
        it('should sanitize and validate correct emails', () => {
            expect(validateAndSanitizeEmail('  test@example.com  ')).toBe('test@example.com');
        });

        it('should throw ValidationError for invalid emails', () => {
            expect(() => validateAndSanitizeEmail('invalid')).toThrow(ValidationError);
            expect(() => validateAndSanitizeEmail('test@')).toThrow(ValidationError);
        });

        it('should respect max length', () => {
            const longEmail = 'a'.repeat(300) + '@example.com';
            expect(() => validateAndSanitizeEmail(longEmail)).toThrow(ValidationError);
        });
    });

    describe('validateFeedbackType', () => {
        it('should accept valid feedback types', () => {
            expect(validateFeedbackType('bug')).toBe(true);
            expect(validateFeedbackType('improvement')).toBe(true);
            expect(validateFeedbackType('other')).toBe(true);
        });

        it('should reject invalid feedback types', () => {
            expect(validateFeedbackType('invalid')).toBe(false);
            expect(validateFeedbackType('')).toBe(false);
        });
    });

    describe('validateReportType', () => {
        it('should accept valid report types', () => {
            expect(validateReportType('stopped')).toBe(true);
            expect(validateReportType('delayed')).toBe(true);
            expect(validateReportType('crowded')).toBe(true);
            expect(validateReportType('normal')).toBe(true);
        });

        it('should reject invalid report types', () => {
            expect(validateReportType('invalid')).toBe(false);
            expect(validateReportType('')).toBe(false);
        });
    });

    describe('isNonEmptyString', () => {
        it('should return true for non-empty strings', () => {
            expect(isNonEmptyString('hello')).toBe(true);
            expect(isNonEmptyString(' text ')).toBe(true);
        });

        it('should return false for empty or non-string values', () => {
            expect(isNonEmptyString('')).toBe(false);
            expect(isNonEmptyString('   ')).toBe(false);
            expect(isNonEmptyString(123)).toBe(false);
            expect(isNonEmptyString(null)).toBe(false);
            expect(isNonEmptyString(undefined)).toBe(false);
        });
    });

    describe('validateRouteId', () => {
        it('should accept valid route IDs', () => {
            expect(validateRouteId('route-123')).toBe(true);
            expect(validateRouteId('ABC123')).toBe(true);
            expect(validateRouteId('test-route-id')).toBe(true);
        });

        it('should reject invalid route IDs', () => {
            expect(validateRouteId('route_id')).toBe(false);
            expect(validateRouteId('route id')).toBe(false);
            expect(validateRouteId('route/id')).toBe(false);
        });
    });

    describe('extractIP', () => {
        it('should extract IP from x-forwarded-for header', () => {
            expect(extractIP('192.168.1.1, proxy1, proxy2')).toBe('192.168.1.1');
            expect(extractIP('10.0.0.1')).toBe('10.0.0.1');
        });

        it('should return fallback when header is null', () => {
            expect(extractIP(null)).toBe('unknown');
            expect(extractIP(null, 'custom')).toBe('custom');
        });

        it('should handle empty strings', () => {
            expect(extractIP('')).toBe('unknown');
        });
    });
});
