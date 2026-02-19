import React from 'react';

/**
 * Extracts the estimated resumption time from JR Hokkaido status text.
 * Covers patterns like:
 * - "19時頃運転再開" -> Date object with 19:00 today
 * - "20:30再開見込" -> Date object with 20:30 today
 * - "14:00頃から再開" -> Date object with 14:00 today
 * 
 * @param text The raw status text from JR.
 * @param referenceDate The date to use as a base (default: now).
 * @returns Date object if found, null otherwise.
 */
export function extractResumptionTime(text: string, referenceDate: Date = new Date()): Date | null {
    if (!text) return null;

    // Normalize text (full-width digits to half-width)
    const normalized = text.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

    // Common patterns for resumption time
    const patterns = [
        /(\d{1,2})時(\d{1,2})分頃?.*再開/, // 19時30分頃再開
        /(\d{1,2}):(\d{1,2}).*再開/,       // 19:30再開
        /(\d{1,2})時頃?.*再開/,           // 19時頃再開
    ];

    for (const pattern of patterns) {
        const match = normalized.match(pattern);
        if (match) {
            const hour = parseInt(match[1], 10);
            const minute = match[2] ? parseInt(match[2], 10) : 0;

            if (hour >= 0 && hour <= 24 && minute >= 0 && minute < 60) {
                const resumptionDate = new Date(referenceDate);
                resumptionDate.setHours(hour, minute, 0, 0);

                // If extracted time is significantly in the past (e.g. > 12 hours ago), 
                // it might mean "tomorrow" or it's an old message, but for "Resumption", 
                // it usually implies the *next* occurrence of that time if it's already passed 
                // OR it refers to today if we are currently suspended.
                // However, simplistic logic: assume it refers to "Today" or "Tomorrow".
                // If now is 23:00 and extraction is 05:00, it's likely tomorrow.
                if (resumptionDate.getTime() < referenceDate.getTime() - 6 * 60 * 60 * 1000) {
                    // If prediction is for 6 hours ago, assume it means tomorrow? 
                    // Or just keep it as today (maybe it resumed already).
                    // Let's stick to "Today" for now unless explicit "tomorrow" (翌日) text found.
                }

                return resumptionDate;
            }
        }
    }

    return null;
}

/**
 * Formats the raw status text for display.
 * - Replaces <BR> and newlines with <br/>
 * - Highlights time and keywords.
 * - Filters out some common noise if needed.
 */
/**
 * Formats the raw status text for display.
 * - Replaces <BR> and newlines with <br/>
 * - Highlights time and keywords.
 * - Filters out some common noise if needed.
 */
export function formatStatusText(text: string): React.ReactNode[] {
    if (!text) return [];

    // 1. Initial cleanup
    // Remove "■" bullets if they are just clutter, or keep them?
    // Replace <BR> with actual newlines for splitting
    let cleanText = text
        .replace(/<BR>/gi, '\n')
        .replace(/<br>/gi, '\n')
        .replace(/■/g, '\n■') // Ensure bullets start on new lines
        .replace(/\n\s*\n/g, '\n'); // Remove extra empty lines

    // 2. Split by newlines
    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    // 3. Process each line
    return lines.map((line, index) => {
        // Highlight keywords
        // Added '減便', '間引き', '本数を減ら' for Reduced Service highlighting
        const parts = line.split(/(\d{1,2}[:時]\d{0,2}分?頃?)|(運転再開)|(再開)|(見合わせ)|(運休)|(遅れ)|(減便)|(本数を減ら)|(間引き)/g).filter(Boolean);

        const formattedLine = parts.map((part, i) => {
            if (part.match(/\d{1,2}[:時]\d{0,2}分?頃?/)) {
                return <span key={i} className="font-bold text-orange-600 bg-orange-50 px-1 rounded">{part}</span>;
            }
            if (part.match(/運転再開|再開/)) {
                return <span key={i} className="font-bold text-green-600">{part}</span>;
            }
            if (part.match(/見合わせ|運休/)) {
                return <span key={i} className="font-bold text-red-600">{part}</span>;
            }
            if (part.match(/遅れ|減便|本数を減ら|間引き/)) {
                return <span key={i} className="font-bold text-yellow-600">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });

        return (
            <div key={index} className="mb-1 last:mb-0 leading-relaxed text-sm">
                {formattedLine}
            </div>
        );
    });
}

/**
 * Splits the raw status text into a summary (headline) and details.
 * - Summary: The first line or sentence.
 * - Details: The rest of the text.
 */
export function splitStatusText(text: string): { summary: string; details: string } {
    if (!text) return { summary: '', details: '' };

    // Initial cleanup similar to formatStatusText
    let cleanText = text
        .replace(/<BR>/gi, '\n')
        .replace(/<br>/gi, '\n')
        .replace(/■/g, '\n■')
        .replace(/\n\s*\n/g, '\n');

    const lines = cleanText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) return { summary: '', details: '' };

    const summary = lines[0];
    const details = lines.slice(1).join('\n');

    return { summary, details };
}

