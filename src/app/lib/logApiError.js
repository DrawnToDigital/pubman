// PubMan's platform API clients (thingiverse-lib.js, printables-lib.js, makerworld-lib.js,
// makerworld-client.ts) throw errors carrying rich diagnostic detail - either embedded in
// `.message` as a string, or as separate own-properties (url, method, requestBody,
// responseStatus, responseStatusText, responseBody, validationIssues) on custom error
// classes like MakerWorldAPIError. That detail was frequently being captured but never
// reaching the actual log output, since passing an Error object straight to a logger
// typically only surfaces `.message`/`.stack`, not arbitrary custom properties.
//
// formatApiError renders whichever of these is present, so `log.error(context,
// formatApiError(error))` always surfaces the full failure detail regardless of which
// platform/error shape it came from.

const DIAGNOSTIC_KEYS = [
  'url',
  'method',
  'requestBody',
  'responseStatus',
  'responseStatusText',
  'responseBody',
  'validationIssues',
];

export function formatApiError(error) {
  if (!(error instanceof Error)) {
    if (error === undefined || error === null) return String(error);
    return typeof error === 'string' ? error : JSON.stringify(error);
  }

  const parts = [error.message];
  for (const key of DIAGNOSTIC_KEYS) {
    const value = error[key];
    if (value === undefined || value === null) continue;
    const rendered = typeof value === 'string' ? value : JSON.stringify(value);
    parts.push(`${key}=${rendered}`);
  }
  return parts.join(' | ');
}
