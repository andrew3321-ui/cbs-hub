import { publicPlatformOwnership } from "../../../../domain/platform-identity";

export async function GET() {
  return Response.json(publicPlatformOwnership(), { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}
