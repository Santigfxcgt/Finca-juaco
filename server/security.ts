import { Request, Response, NextFunction } from 'express';

/**
 * High-precision SQL Injection regex patterns.
 * Designed to catch classic, blind, time-based, union-based, and stacked queries
 * while avoiding false positives on legitimate Spanish text or names.
 */
const SQLI_PATTERNS: RegExp[] = [
  // 1. Classic Boolean/Tautology Injection: ' OR 1=1, ' OR 'a'='a', " OR ""="
  /(\b(OR|AND)\b\s+(['"]?[\w\d]+['"]?\s*=\s*['"]?[\w\d]+['"]?|\d+\s*=\s*\d+))/i,

  // 2. UNION-based injection
  /(\bUNION\s+(ALL\s+)?SELECT\b)/i,

  // 3. Stacked SQL statements (semicolon followed by SQL keywords)
  /(;\s*(DROP|ALTER|TRUNCATE|DELETE\s+FROM|UPDATE\s+\w+\s+SET|INSERT\s+INTO|CREATE\s+TABLE|GRANT|REVOKE)\b)/i,

  // 4. SQL comment injections: inline comments used to truncate queries
  /(\/\*[\s\S]*?\*\/|--[^\r\n]*)/i,

  // 5. System table lookups and schema discovery
  /(\b(INFORMATION_SCHEMA|pg_catalog|pg_tables|pg_user|pg_database|sys\.tables|sysobjects)\b)/i,

  // 6. Time-based blind injection functions
  /(\b(pg_sleep|sleep\s*\(|benchmark\s*\(|waitfor\s+delay)\b)/i,

  // 7. Dangerous system execution commands
  /(\b(xp_cmdshell|exec\s*\(|execute\s+immediate)\b)/i,

  // 8. Hexadecimal or Char conversion bypass tricks
  /(\bCHAR\s*\(\s*\d+\s*\)|\bCHR\s*\(\s*\d+\s*\)|0x[0-9a-fA-F]{4,})/i,

  // 9. File reading/writing commands
  /(\b(LOAD_FILE|INTO\s+(OUTFILE|DUMPFILE))\b)/i
];

/**
 * Inspects a value recursively to check if it contains any SQL Injection pattern.
 */
export function containsSqlInjection(value: any, path: string = ''): { detected: boolean; pattern?: string; path?: string } {
  if (value === null || value === undefined) {
    return { detected: false };
  }

  if (typeof value === 'string') {
    // Skip base64 image data strings or data URIs (e.g., voucher uploads)
    if (value.startsWith('data:image/') || (value.length > 500 && /^[A-Za-z0-9+/=]+$/.test(value))) {
      return { detected: false };
    }

    // Check each pattern
    for (const pattern of SQLI_PATTERNS) {
      if (pattern.test(value)) {
        return {
          detected: true,
          pattern: pattern.toString(),
          path
        };
      }
    }
    return { detected: false };
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const check = containsSqlInjection(value[i], `${path}[${i}]`);
      if (check.detected) return check;
    }
    return { detected: false };
  }

  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // Also check the key itself for SQL injection
      for (const pattern of SQLI_PATTERNS) {
        if (pattern.test(key)) {
          return { detected: true, pattern: pattern.toString(), path: `${path}.${key}` };
        }
      }

      const check = containsSqlInjection(value[key], path ? `${path}.${key}` : key);
      if (check.detected) return check;
    }
  }

  return { detected: false };
}

/**
 * Sanitizes input strings by stripping null bytes and non-printable control characters
 * while preserving valid Spanish accents, punctuation, and newlines.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  // Strip null bytes and control chars (except \n, \r, \t)
  return input.replace(/\0/g, '').replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Recursively cleans all string fields in an object or array.
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return sanitizeString(data) as any;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizePayload(item)) as any;
  }

  if (typeof data === 'object') {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(data)) {
      cleaned[key] = sanitizePayload(val);
    }
    return cleaned;
  }

  return data;
}

/**
 * Express Middleware: SQL Injection Defense & Input Sanitization Firewall.
 * Intercepts every incoming HTTP request and validates query params, body, and route params.
 */
export function sqlInjectionProtection(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Sanitize incoming payload strings (null bytes, control chars)
    if (req.query) req.query = sanitizePayload(req.query);
    if (req.body) req.body = sanitizePayload(req.body);
    if (req.params) req.params = sanitizePayload(req.params);

    // 2. Analyze decoded URL (catches path parameter SQL injection e.g. /api/reservations/res-1' OR '1'='1)
    try {
      const decodedUrl = decodeURIComponent(req.originalUrl || req.url || '');
      const urlCheck = containsSqlInjection(decodedUrl, 'url');
      if (urlCheck.detected) {
        console.warn(`🚨 [SEGURIDAD] Intento de Inyección SQL bloqueado en URL: ${decodedUrl}`);
        return res.status(403).json({
          error: 'Acceso denegado: La URL o identificador de ruta contiene sintaxis SQL no permitida.',
          field: 'url',
          status: 403
        });
      }
    } catch {
      // ignore URI decode error
    }

    // 3. Analyze query parameters
    const queryCheck = containsSqlInjection(req.query, 'query');
    if (queryCheck.detected) {
      console.warn(`🚨 [SEGURIDAD] Intento de Inyección SQL bloqueado en Query: ${queryCheck.path} desde IP: ${req.ip || req.socket.remoteAddress}`);
      return res.status(403).json({
        error: 'Acceso denegado: Se ha detectado un patrón de inyección SQL o parámetro sospechoso en la solicitud.',
        field: queryCheck.path,
        status: 403
      });
    }

    // 3. Analyze request body
    const bodyCheck = containsSqlInjection(req.body, 'body');
    if (bodyCheck.detected) {
      console.warn(`🚨 [SEGURIDAD] Intento de Inyección SQL bloqueado en Body: ${bodyCheck.path} desde IP: ${req.ip || req.socket.remoteAddress}`);
      return res.status(403).json({
        error: 'Acceso denegado: Se ha detectado un patrón de inyección SQL en los datos enviados.',
        field: bodyCheck.path,
        status: 403
      });
    }

    // 4. Analyze route parameters (e.g., /api/reservations/:id)
    const paramsCheck = containsSqlInjection(req.params, 'params');
    if (paramsCheck.detected) {
      console.warn(`🚨 [SEGURIDAD] Intento de Inyección SQL bloqueado en Params: ${paramsCheck.path}`);
      return res.status(403).json({
        error: 'Acceso denegado: El identificador en la ruta contiene caracteres o sintaxis SQL no permitidos.',
        field: paramsCheck.path,
        status: 403
      });
    }

    // 5. Analyze custom authorization token header
    const tokenHeader = req.headers['x-admin-token'];
    if (typeof tokenHeader === 'string') {
      const headerCheck = containsSqlInjection(tokenHeader, 'header.x-admin-token');
      if (headerCheck.detected) {
        return res.status(403).json({ error: 'Token con formato inválido o inyección SQL detectada.' });
      }
    }

    next();
  } catch (err: any) {
    console.error('Error en middleware de seguridad SQL:', err);
    next();
  }
}

/**
 * Strict identifier validator: verifies IDs match safe patterns (e.g. room-1, res-1234, tx-5678, col-2026-1001)
 */
export function isValidIdentifier(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_\-.:]{1,100}$/.test(id);
}

/**
 * Strict date validator: verifies string is strictly YYYY-MM-DD
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}
