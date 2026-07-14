import { clearSessionCookieHeader, destroyCurrentSession } from "../auth";

export async function GET(request: Request) {
  await destroyCurrentSession();
  return new Response(null, { status: 302, headers: { Location: new URL("/", request.url).toString(), "Set-Cookie": clearSessionCookieHeader(request) } });
}
