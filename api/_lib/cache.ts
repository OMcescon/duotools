type CacheEntry<T> = { data: T; timestamp: number };

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Short-lived in-memory cache scoped to a warm serverless instance.
 * On a cache miss that also fails to fetch, falls back to stale data
 * if any exists, so a transient upstream error doesn't surface as a
 * hard failure to the client.
 */
export async function fetchWithCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const cached = cache.get(key) as CacheEntry<T> | undefined;

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.data;
  }

  try {
    const data = await fetcher();
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    if (cached) return cached.data;
    throw error;
  }
}
