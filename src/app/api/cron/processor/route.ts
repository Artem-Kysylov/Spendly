import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, path: string) {
  const url = new URL(path, req.nextUrl.origin);
  const authorization = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  const fallbackAuthorization = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const injectedAuthorization = authorization ?? fallbackAuthorization;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(injectedAuthorization ? { authorization: injectedAuthorization } : {}),
      ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
    },
    cache: "no-store",
  });

  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
  });
}

export async function GET(req: NextRequest) {
  return proxy(req, "/en/api/notifications/processor");
}

export async function POST(req: NextRequest) {
  return GET(req);
}
