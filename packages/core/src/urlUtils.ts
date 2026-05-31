/**
 * URL normalization helpers for Symbiont Runtime API clients.
 *
 * The runtime serves every route under a single `/api/v1` version segment.
 * Base URLs are configured WITHOUT the version segment (e.g. http://localhost:8080),
 * and call sites use BARE paths (e.g. `/metrics`). This helper guarantees the final
 * URL contains exactly one `/api/v1` prefix regardless of whether the base URL already
 * ends with `/api/v1` or the endpoint already starts with `/api/v1`.
 */
export function buildRuntimeUrl(
  baseUrl: string | undefined,
  endpoint: string
): string {
  // Strip trailing slashes from the base URL.
  let base = (baseUrl ?? '').replace(/\/+$/, '');

  // Remove a trailing /api/v1 from the base URL if present.
  base = base.replace(/\/api\/v1$/, '');

  // Ensure the endpoint starts with a single leading slash.
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Remove a leading /api/v1 from the endpoint if present.
  path = path.replace(/^\/api\/v1(?=\/|$)/, '');

  // Ensure the remaining path still has a leading slash.
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }

  return `${base}/api/v1${path}`;
}
