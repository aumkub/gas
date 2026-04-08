import type { Route } from "./+types/api.customers";
import { requireAuth } from "~/lib/session";
import { getOrCreateCustomer } from "~/lib/db";

export async function action({ context, request }: Route.ActionArgs) {
  const { user } = await requireAuth(request, context.cloudflare.env.DB);

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const customer = await getOrCreateCustomer(context.cloudflare.env.DB, name.trim());

    return Response.json({ id: customer.id, name: customer.name }, { status: 200 });
  } catch (error) {
    console.error("Customer API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
