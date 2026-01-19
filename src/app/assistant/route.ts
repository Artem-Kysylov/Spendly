import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { userId, message, locale } = (body || {}) as {
    userId?: string;
    message?: string;
    locale?: string;
  };

  const res = await fetch(new URL("/api/chat", req.nextUrl.origin), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, message, locale }),
  });

  return new Response(res.body, {
    status: res.status,
    headers: new Headers(res.headers),
  });
}
