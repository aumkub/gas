import type { D1Database } from "@cloudflare/workers-types";
import type { Request } from "react-router";
import { getSessionCookieName } from "./auth";
import { getUserBySession } from "./db";

export async function requireAuth(
  request: Request,
  db: D1Database
): Promise<{ user: { id: number; username: string } }> {
  const sessionCookie = request.headers.get("Cookie");
  const sessionToken = sessionCookie?.match(
    new RegExp(`(^|;)\\s*${getSessionCookieName()}=([^;]+)`)
  )?.[2];

  if (!sessionToken) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const user = await getUserBySession(db, sessionToken);
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  return { user: { id: user.id, username: user.username } };
}

export async function getOptionalAuth(
  request: Request,
  db: D1Database
): Promise<{ user: { id: number; username: string } | null }> {
  const sessionCookie = request.headers.get("Cookie");
  const sessionToken = sessionCookie?.match(
    new RegExp(`(^|;)\\s*${getSessionCookieName()}=([^;]+)`)
  )?.[2];

  if (!sessionToken) {
    return { user: null };
  }

  const user = await getUserBySession(db, sessionToken);
  if (!user) {
    return { user: null };
  }

  return { user: { id: user.id, username: user.username } };
}
