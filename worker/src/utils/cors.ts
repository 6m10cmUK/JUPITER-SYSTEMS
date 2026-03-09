export function corsHeaders(origin: string, allowedOrigins: string): Record<string, string> {
  if (!allowedOrigins) return {};
  const origins = allowedOrigins.split(',').map((o) => o.trim());
  const allowed = origins.includes(origin) || origins.includes('*');
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
