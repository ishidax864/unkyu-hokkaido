/**
 * Centralized caching utility with TTL support
 */

interface CacheEntry<T> {
    data: T;
    expires: number;
}

export class Cache<T> {
    private storage = new Map<string, CacheEntry<T>>();
    private readonly ttl: number;
    private readonly maxSize: number;

    constructor(ttlMs: number, maxSize: number = 1000) {
        this.ttl = ttlMs;
        this.maxSize = maxSize;
    }

    /**
     * Get value from cache
     */
    get(key: string): T | null {
        const entry = this.storage.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() >= entry.expires) {
            this.storage.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set value in cache
     */
    set(key: string, value: T, customTTL?: number): void {
        // Enforce max size with LRU (simple: delete oldest)
        if (this.storage.size >= this.maxSize) {
            const firstKey = this.storage.keys().next().value as string | undefined;
            if (firstKey) {
                this.storage.delete(firstKey);
            }
        }

        const expires = Date.now() + (customTTL ?? this.ttl);
        this.storage.set(key, { data: value, expires });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Delete specific key
     */
    delete(key: string): void {
        this.storage.delete(key);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        this.storage.clear();
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.storage.size,
            maxSize: this.maxSize,
            ttl: this.ttl,
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): number {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.storage.entries()) {
            if (now >= entry.expires) {
                this.storage.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }
}

/**
 * Get or set cached value with a fetcher function
 */
export async function getCached<T>(
    cache: Cache<T>,
    key: string | undefined,
    fetcher: () => Promise<T>
): Promise<T> {
    // If no key, always fetch
    if (!key) {
        return await fetcher();
    }

    // Try to get from cache
    const cached = cache.get(key);
    if (cached !== null) {
        return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    cache.set(key, data);
    return data;
}
