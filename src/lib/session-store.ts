import crypto from "crypto";

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export type UserRole = "admin" | "commissary" | "cafe" | "driver";

type SessionRecord = {
  email: string;
  role: UserRole;
  expiresAt: number;
};

const sessions = new Map<string, SessionRecord>();

function now() {
  return Date.now();
}

function cleanupExpiredSessions() {
  const current = now();

  for (const [token, session] of sessions.entries()) {
    if (session.expiresAt <= current) {
      sessions.delete(token);
    }
  }
}

export function createSession(email: string, role: UserRole = "cafe") {
  cleanupExpiredSessions();

  const token = crypto.randomBytes(32).toString("hex");

  sessions.set(token, {
    email,
    role,
    expiresAt: now() + SESSION_MAX_AGE_MS,
  });

  return {
    token,
    maxAgeSec: Math.floor(SESSION_MAX_AGE_MS / 1000),
  };
}

export function getSession(token?: string) {
  cleanupExpiredSessions();

  if (!token) {
    return null;
  }

  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  return session;
}

export function deleteSession(token?: string) {
  if (!token) {
    return;
  }

  sessions.delete(token);
}

export function updateSessionRole(token: string, role: UserRole) {
  const session = sessions.get(token);
  if (!session) return false;
  session.role = role;
  sessions.set(token, session);
  return true;
}
