import type { Route } from "./+types/logout";
import { redirect } from "react-router";
import { deleteSession } from "~/lib/db";
import { getSessionCookieName } from "~/lib/auth";

export async function loader({ context, request }: Route.LoaderArgs) {
  const sessionCookie = request.headers.get("Cookie");
  const sessionToken = sessionCookie?.match(
    new RegExp(`(^|;)\\s*${getSessionCookieName()}=([^;]+)`)
  )?.[2];

  if (sessionToken) {
    await deleteSession(context.cloudflare.env.DB, sessionToken);
  }

  return redirect("/login", {
    headers: {
      "Set-Cookie": `${getSessionCookieName()}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    },
  });
}

export default function Logout() {
  return null;
}
