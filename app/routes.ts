import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("export-csv", "routes/export-csv.ts"),
  route("products", "routes/products.tsx"),
  route("banks", "routes/banks.tsx"),
  route("customers", "routes/customers.tsx"),
  route("analytics", "routes/analytics.tsx"),
  route("api/customers", "routes/api.customers.tsx"),
  route("report/create", "routes/report-create.tsx"),
  route("report/view", "routes/report-view.tsx"),
  route("share/month/:id", "routes/share-month.tsx"),
  route("share/:id", "routes/share.tsx"),
] satisfies RouteConfig;
