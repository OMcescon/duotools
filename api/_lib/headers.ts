// Realistic browser-like headers for upstream scraping/API calls made from
// Vercel's serverless IPs, which some sites treat more strictly than
// ordinary browser traffic.

export const BCB_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-BO,es;q=0.9',
  Referer: 'https://www.bcb.gob.bo/',
};

export const P2P_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  Accept: 'application/json',
};
