import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, path: string, method: "GET" | "POST" = "GET") {
  const url = new URL(path, req.nextUrl.origin);
  const authorization = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  const fallbackAuthorization = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const injectedAuthorization = authorization ?? fallbackAuthorization;

  const res = await fetch(url, {
    method,
    headers: {
      ...(injectedAuthorization ? { authorization: injectedAuthorization } : {}),
      ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
    },
    cache: "no-store",
  });

  const body = await res.text();
  return {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/json",
    },
    body,
  };
}

function isMondayUtc(d: Date) {
  return d.getUTCDay() === 1;
}

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  console.log("[Handler] Starting cron handler");

  const daily = await proxy(req, "/en/api/notifications/daily", "POST");
  console.log(`[Handler] daily: status=${daily.status} body=${daily.body.slice(0, 160)}`);

  const digestRun = isMondayUtc(new Date());
  const digest = digestRun
    ? await proxy(req, "/en/api/notifications/digest", "POST")
    : { status: 204, headers: { "content-type": "application/json" }, body: "" };
  if (digestRun) {
    console.log(`[Handler] digest: status=${digest.status} body=${digest.body.slice(0, 160)}`);
  } else {
    console.log("[Handler] digest: skipped (not Monday UTC)");
  }

  // Process recurring transactions — note: /api/cron/recurring, no locale prefix
  const recurring = await proxy(req, "/api/cron/recurring");
  console.log(`[Handler] recurring: status=${recurring.status} body=${recurring.body.slice(0, 160)}`);

  const processorRuns: Array<{ status: number; body: string }> = [];
  for (let i = 0; i < 10; i++) {
    const res = await proxy(req, "/en/api/notifications/processor", "POST");
    processorRuns.push({ status: res.status, body: res.body });
    console.log(`[Handler] processor run ${i + 1}: status=${res.status} body=${res.body.slice(0, 120)}`);

    let processed = 0;
    try {
      const json = JSON.parse(res.body);
      processed = Number(json?.processed || 0);
    } catch {
      // ignore
    }

    if (res.status < 200 || res.status >= 300) break;
    if (processed < 20) break;
  }

  const ok =
    daily.status >= 200 &&
    daily.status < 300 &&
    recurring.status >= 200 &&
    recurring.status < 300 &&
    (!digestRun || (digest.status >= 200 && digest.status < 300)) &&
    processorRuns.every((r) => r.status >= 200 && r.status < 300);

  console.log(`[Handler] Finished. ok=${ok} durationMs=${Date.now() - startedAt}`);

  return NextResponse.json(
    {
      ok,
      digestRun,
      durationMs: Date.now() - startedAt,
      daily: { status: daily.status, body: daily.body },
      digest: { status: digest.status, body: digest.body },
      recurring: { status: recurring.status, body: recurring.body },
      processorRuns,
    },
    { status: ok ? 200 : 500 },
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
