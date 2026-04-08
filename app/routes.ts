import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("products", "routes/products.tsx"),
  route("banks", "routes/banks.tsx"),
  route("api/customers", "routes/api.customers.tsx"),
  route("report/create", "routes/report-create.tsx"),
  route("report/view", "routes/report-view.tsx"),
  route("share/:id", "routes/share.tsx"),
] satisfies RouteConfig;
