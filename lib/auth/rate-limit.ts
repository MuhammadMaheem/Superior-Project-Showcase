interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired keys periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, 60000);
}

export interface RateLimitOptions {
  windowMs: number; // e.g. 15 * 60 * 1000
  maxRequests: number; // e.g. 5
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 15 * 60 * 1000, maxRequests: 50 }
): { success: boolean; limit: number; remaining: number; resetTime: number } {
  // Allow unlimited attempts in development / localhost
  if (process.env.NODE_ENV !== "production" || identifier.includes("127.0.0.1") || identifier.includes("::1")) {
    return {
      success: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 60000,
    };
  }

  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      success: true,
      limit: options.maxRequests,
      remaining: options.maxRequests - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    return {
      success: false,
      limit: options.maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.count += 1;
  return {
    success: true,
    limit: options.maxRequests,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}
