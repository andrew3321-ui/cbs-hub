const allowedProtocols = new Set(["https:", "http:"]);

function normalizedConfiguredOrigin(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!allowedProtocols.has(url.protocol) || url.username || url.password) return null;
    if (url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function publicAppOrigin(request: Request, configuredUrl?: unknown) {
  const configured = normalizedConfiguredOrigin(configuredUrl);
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function publicAppUrl(pathname: string, request: Request, configuredUrl?: unknown) {
  if (!pathname.startsWith("/")) throw new Error("public_path_must_be_absolute");
  return new URL(pathname, `${publicAppOrigin(request, configuredUrl)}/`).toString();
}

