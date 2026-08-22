import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

interface LoginAttemptRecord {
  count: number;
  lockedUntil?: number;
  lastAttempt: number;
}

// In-memory stores (isolated per runtime instance)
const rateLimitStore = new Map<string, RateLimitRecord>();
const loginAttemptsStore = new Map<string, LoginAttemptRecord>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function performCleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const expirationThreshold = now - 60 * 60 * 1000; // 1 hour

  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => ts > expirationThreshold);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }

  for (const [key, record] of loginAttemptsStore.entries()) {
    if (record.lastAttempt < expirationThreshold && (!record.lockedUntil || record.lockedUntil < now)) {
      loginAttemptsStore.delete(key);
    }
  }
}

/**
 * Extracts client IP safely from request headers
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Sliding Window Rate Limiter
 * @param key Unique key (e.g. "submit:192.168.1.1")
 * @param limit Max allowed requests within window
 * @param windowMs Window duration in milliseconds
 * @returns { success: boolean, remaining: number, resetInMs: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { success: boolean; remaining: number; resetInMs: number } {
  performCleanup();
  const now = Date.now();
  const windowStart = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter timestamps within window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetInMs = Math.max(0, oldestTimestamp + windowMs - now);
    return {
      success: false,
      remaining: 0,
      resetInMs,
    };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  return {
    success: true,
    remaining,
    resetInMs: windowMs,
  };
}

/**
 * Records a failed login attempt and locks account if threshold is exceeded
 * @param identifier IP or username
 * @param maxAttempts Max attempts before lockout (default: 5)
 * @param lockoutDurationMs Duration of lockout in ms (default: 15 minutes)
 */
export function recordFailedLogin(
  identifier: string,
  maxAttempts = 5,
  lockoutDurationMs = 15 * 60 * 1000
): { isLocked: boolean; attemptsRemaining: number; lockedUntil?: number } {
  performCleanup();
  const now = Date.now();

  let record = loginAttemptsStore.get(identifier);
  if (!record) {
    record = { count: 0, lastAttempt: now };
    loginAttemptsStore.set(identifier, record);
  }

  // Reset count if last attempt was more than 30 mins ago
  if (now - record.lastAttempt > 30 * 60 * 1000 && !record.lockedUntil) {
    record.count = 0;
  }

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockoutDurationMs;
    return {
      isLocked: true,
      attemptsRemaining: 0,
      lockedUntil: record.lockedUntil,
    };
  }

  return {
    isLocked: false,
    attemptsRemaining: Math.max(0, maxAttempts - record.count),
  };
}

/**
 * Checks if an identifier is currently locked out from logging in
 */
export function isLoginLocked(identifier: string): { isLocked: boolean; lockedUntilMs: number } {
  const now = Date.now();
  const record = loginAttemptsStore.get(identifier);

  if (!record || !record.lockedUntil) {
    return { isLocked: false, lockedUntilMs: 0 };
  }

  if (now > record.lockedUntil) {
    // Lock expired, reset
    loginAttemptsStore.delete(identifier);
    return { isLocked: false, lockedUntilMs: 0 };
  }

  return { isLocked: true, lockedUntilMs: record.lockedUntil - now };
}

/**
 * Resets failed login counters upon successful authentication
 */
export function resetLoginAttempts(identifier: string) {
  loginAttemptsStore.delete(identifier);
}
