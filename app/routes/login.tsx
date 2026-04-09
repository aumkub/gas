import type { Route } from "./+types/login";
import { redirect, useActionData, useNavigation, Form } from "react-router";
import { hashPassword, verifyPassword, generateSessionToken, getSessionCookieName } from "~/lib/auth";
import {
  getUserByUsername,
  createUser,
  updateUserPassword,
} from "~/lib/db";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "เข้าสู่ระบบ" },
    { name: "description", content: "เข้าสู่ระบบบันทึกรายงานการขายประจำวัน" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const sessionCookie = request.headers.get("Cookie");
  const sessionToken = sessionCookie?.match(
    new RegExp(`(^|;)\\s*${getSessionCookieName()}=([^;]+)`)
  )?.[2];

  if (sessionToken) {
    return redirect("/");
  }

  const db = context.cloudflare.env.DB;

  // Initialize default user if not exists
  const defaultUser = await getUserByUsername(db, context.cloudflare.env.DEFAULT_USERNAME);
  if (!defaultUser) {
    const hashedPassword = await hashPassword(context.cloudflare.env.DEFAULT_PASSWORD);
    await createUser(db, context.cloudflare.env.DEFAULT_USERNAME, hashedPassword);
  } else {
    const isDefaultPasswordValid = await verifyPassword(
      context.cloudflare.env.DEFAULT_PASSWORD,
      defaultUser.password
    );

    // Keep default credentials in sync with wrangler vars.
    if (!isDefaultPasswordValid) {
      const hashedPassword = await hashPassword(context.cloudflare.env.DEFAULT_PASSWORD);
      await updateUserPassword(db, defaultUser.id, hashedPassword);
    }
  }

  return {};
}

export async function action({ context, request }: Route.ActionArgs) {
  const formData = await request.formData();
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  const db = context.cloudflare.env.DB;
  const user = await getUserByUsername(db, username);

  if (!user) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // Store session in database (you could use KV for better performance)
  await db
    .prepare(
      "INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)"
    )
    .bind(sessionToken, user.id, expiresAt.toISOString())
    .run();

  return redirect("/", {
    headers: {
      "Set-Cookie": `${getSessionCookieName()}=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`,
    },
  });
}

export default function Login({ }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 px-4 py-12 md:px-6">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl items-center justify-center">
        <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-lg md:p-10">
          <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-linear-to-br from-blue-100 to-purple-100 opacity-60" />
          <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-linear-to-br from-green-100 to-blue-100 opacity-50" />

          <div className="relative z-10">

            {/* <div className="flex justify-center">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-10 w-10 object-contain mb-2"
              />
            </div> */}

            <h1 className="mb-3 bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
              เข้าสู่ระบบ
            </h1>
            <p className="mb-8 text-center text-sm text-gray-600">
              เข้าสู่ระบบเพื่อบันทึกรายงานการขายประจำวัน
            </p>

            <Form method="post" className="space-y-5">

              <div>
                <label htmlFor="username" className="mb-2 block text-sm font-medium text-gray-700">
                  ชื่อผู้ใช้
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="กรอกชื่อผู้ใช้"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
                  รหัสผ่าน
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="กรอกรหัสผ่าน"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {actionData?.error && (
                <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {actionData.error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-linear-to-r from-blue-500 to-blue-600 font-medium text-white shadow-md transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
