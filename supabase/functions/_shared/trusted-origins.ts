/**
 * Cross-origin requests from the Vercel QA host and the customer's Cloudflare
 * Pages host may coexist during cutover. This is an explicit exact-origin allowlist:
 * no wildcard origins, no arbitrary request Host or forwarded headers.
 */
export function normalizeHttpsOrigin(value: string | null | undefined): string | null {
 if (!value || !value.trim()) return null;
 try {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) return null;
  return url.origin;
 } catch { return null; }
}

export function allowedAppOrigins(primary: string, additional: string): Set<string> {
 const all = [primary, ...additional.split(/[\s,]+/)];
 return new Set(all.map(normalizeHttpsOrigin).filter((x): x is string => x!==null));
}

export function trustedRequestOrigin(
 req: Request,
 primary = Deno.env.get('PUBLIC_APP_URL') || '',
 additional = Deno.env.get('ADDITIONAL_APP_ORIGINS') || ''
): string | null {
 const origin = req.headers.get('Origin');
 if (!origin) return null;
 return allowedAppOrigins(primary,additional).has(origin) ? origin : null;
}

export function isDisallowedBrowserOrigin(
 req: Request,
 primary = Deno.env.get('PUBLIC_APP_URL') || '',
 additional = Deno.env.get('ADDITIONAL_APP_ORIGINS') || ''
): boolean {
 return req.headers.has('Origin') && trustedRequestOrigin(req,primary,additional)===null;
}

export function corsForRequest(req: Request): Record<string,string> {
 const origin = trustedRequestOrigin(req);
 return {
  ...(origin ? {'Access-Control-Allow-Origin':origin} : {}),
  'Vary':'Origin',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS'
 };
}

export function checkoutReturnOrigin(req: Request): string | null {
 return trustedRequestOrigin(req) || normalizeHttpsOrigin(Deno.env.get('PUBLIC_APP_URL'));
}
