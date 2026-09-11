type CacheEntry<T> = { data: T; timestamp: number };

const cache = new Map<string, CacheEntry<unknown>>();
// Límite defensivo: algunos endpoints derivan la cache key de un parámetro de
// query (ver crypto-rates.ts), así que sin tope el Map podría crecer sin
// límite en una instancia serverless caliente. Al superarlo, se descarta la
// entrada más antigua (Map conserva el orden de inserción).
const MAX_CACHE_ENTRIES = 200;

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
    if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(key, { data, timestamp: now });
    return data;
  } catch (error) {
    if (cached) return cached.data;
    throw error;
  }
}
