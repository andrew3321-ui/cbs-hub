export const REPOSITORY_ATTACK_SURFACE_VERSION = "repository-attack-surface.2026-09-19.v1";
export const MAX_ATTACK_SURFACE_ROUTES = 60;

export type AttackSurfaceRoute = {
  route: string;
  method: string;
  sourceFile: string;
  line: number;
  priority: "high" | "medium" | "low";
  checks: string[];
};

function frameworkRoute(path: string) {
  const app = path.match(/(?:^|\/)(?:src\/)?app\/api\/(.*?)route\.[cm]?[jt]sx?$/i);
  if (app && (app[1] === "" || app[1].endsWith("/"))) return { framework: "next-app", segments: app[1].split("/").filter(Boolean) };
  const pages = path.match(/(?:^|\/)(?:src\/)?pages\/api\/(.+)\.[cm]?[jt]sx?$/i);
  if (pages) return { framework: "next-pages", segments: pages[1].split("/").filter(Boolean) };
  return null;
}

export function isWebRouteFile(path: string) {
  return path.length <= 240 && !path.split("/").some((segment) => ["node_modules", "vendor", "dist", "build", ".git", ".next", "fixtures"].includes(segment)) && Boolean(frameworkRoute(path));
}

export function isOpenApiDocument(path: string) {
  return path.length <= 240 && !path.split("/").some((segment) => ["node_modules", "vendor", "dist", "build", ".git", ".next", "fixtures"].includes(segment))
    && /(?:^|\/)(?:openapi|swagger|api[-_.]spec)(?:[-_.][a-z0-9_-]+)?\.json$/i.test(path);
}

export function isAttackSurfaceFile(path: string) {
  return isWebRouteFile(path) || isOpenApiDocument(path);
}

function publicRoute(segments: string[], pages: boolean) {
  const resolved = segments.filter((segment, index) => !/^\(.+\)$/.test(segment) && !segment.startsWith("@") && !(pages && segment === "index" && index === segments.length - 1))
    .map((segment) => /^\[\[?\.\.\.[^\]]+\]\]?$/.test(segment) ? "*" : /^\[[^\]]+\]$/.test(segment) ? `:${segment.slice(1, -1)}` : segment);
  const route = `/api${resolved.length ? `/${resolved.join("/")}` : ""}`;
  return route.length <= 200 && !/[?#\\]/.test(route) ? route : null;
}

function reviewFor(route: string, method: string): Pick<AttackSurfaceRoute, "priority" | "checks"> {
  if (/\/(?:webhook|callback)(?:\/|$)/i.test(route)) return { priority: "high", checks: ["Validar assinatura ou state", "Rejeitar repetição da entrega"] };
  if (/\/(?:login|register|cadastro|reset-password|recuperar-senha)(?:\/|$)/i.test(route)) return { priority: "high", checks: ["Limitar tentativas", "Revisar emissão e expiração de tokens"] };
  if (/^\/api\/(?:health|public)(?:\/|$)/i.test(route)) return { priority: "low", checks: ["Confirmar dados realmente públicos", "Revisar limites de requisição"] };
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const sensitive = /\/(?:admin|billing|account|users?|workspace|payments?|checkout)(?:\/|$)/i.test(route);
  return { priority: mutating || sensitive ? "high" : "medium", checks: ["Comparar acesso sem sessão e com perfil limitado", "Verificar isolamento entre contas", ...(mutating ? ["Validar entrada e proteção contra CSRF"] : [])] };
}

export function discoverWebRoutes(path: string, source: string): AttackSurfaceRoute[] {
  if (!isWebRouteFile(path)) return [];
  const parsed = frameworkRoute(path);
  if (!parsed) return [];
  const route = publicRoute(parsed.segments, parsed.framework === "next-pages");
  if (!route) return [];
  const methods = new Map<string, number>();
  if (parsed.framework === "next-app") {
    for (const [index, line] of source.split(/\r?\n/).entries()) {
      const declaration = line.match(/^\s*export\s+(?:(?:async\s+)?function\s+|(?:const|let)\s+)(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/);
      if (declaration) methods.set(declaration[1], index + 1);
      const group = line.match(/^\s*export\s*\{([^}]{1,200})\}/);
      if (group) for (const item of group[1].split(",")) {
        const method = item.trim().match(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)(?:\s+as\s+\1)?$/)?.[1];
        if (method) methods.set(method, index + 1);
      }
    }
  }
  if (!methods.size) methods.set("UNKNOWN", 1);
  return [...methods].map(([method, line]) => ({ route, method, sourceFile: path, line, ...reviewFor(route, method) }));
}

export function discoverOpenApiRoutes(path: string, source: string): AttackSurfaceRoute[] {
  if (!isOpenApiDocument(path)) return [];
  let document: unknown;
  try { document = JSON.parse(source); } catch { return []; }
  if (!document || typeof document !== "object" || Array.isArray(document)) return [];
  const spec = document as Record<string, unknown>;
  if (!(typeof spec.openapi === "string" && spec.openapi.startsWith("3.") || spec.swagger === "2.0") || !spec.paths || typeof spec.paths !== "object" || Array.isArray(spec.paths)) return [];
  const routes: AttackSurfaceRoute[] = [];
  for (const [rawPath, operations] of Object.entries(spec.paths as Record<string, unknown>)) {
    if (!rawPath.startsWith("/") || rawPath.length > 200 || /[?#\\]/.test(rawPath) || !operations || typeof operations !== "object" || Array.isArray(operations)) continue;
    const route = rawPath.replace(/\{[a-zA-Z0-9_-]{1,60}\}/g, (part) => `:${part.slice(1, -1)}`);
    for (const method of ["get", "post", "put", "patch", "delete", "head", "options"]) {
      if (!Object.hasOwn(operations, method)) continue;
      const upperMethod = method.toUpperCase();
      routes.push({ route, method: upperMethod, sourceFile: path, line: 1, ...reviewFor(route, upperMethod) });
      if (routes.length > MAX_ATTACK_SURFACE_ROUTES) return routes;
    }
  }
  return routes;
}

export function discoverAttackSurface(path: string, source: string) {
  return isOpenApiDocument(path) ? discoverOpenApiRoutes(path, source) : discoverWebRoutes(path, source);
}
