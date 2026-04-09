import type { Route } from "./+types/login";
import { redirect, useActionData, useNavigation, Form } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/Card";
import { Heading } from "~/components/Heading";
import { Input } from "~/components/ui/input";
import { hashPassword, verifyPassword, generateSessionToken, getSessionCookieName } from "~/lib/auth";
import {
  getUserByUsername,
  createUser,
  updateUserPassword,
  getOrCreateCustomer,
  createProduct,
  addProductPrice,
  getAllProducts,
} from "~/lib/db";

export function meta({}: Route.MetaArgs) {
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

export default function Login({ loaderData }: Route.ComponentProps) {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <Card
        overrides={{
          Root: {
            style: {
              width: "100%",
              maxWidth: "400px",
              padding: "32px",
              borderRadius: "12px",
            },
          },
        }}
      >
        <Heading styleLevel={2} className="text-center mb-8">
          เข้าสู่ระบบ
        </Heading>

        <Form method="post" className="space-y-6">
          <div>
            <label htmlFor="username" className="block mb-1.5 font-medium text-sm">
              ชื่อผู้ใช้
            </label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="กรอกชื่อผู้ใช้"
              overrides={{
                Root: { style: { width: "100%" } },
                Input: { style: {} },
              }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block mb-1.5 font-medium text-sm">
              รหัสผ่าน
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่าน"
              overrides={{
                Root: { style: { width: "100%" } },
                Input: { style: {} },
              }}
            />
          </div>

          {actionData?.error && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444] text-[#DC2626] px-4 py-3 rounded-lg">
              {actionData.error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
        </Form>
      </Card>
    </div>
  );
}
