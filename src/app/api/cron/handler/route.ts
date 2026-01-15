import { NextRequest, NextResponse } from "next/server";

async function proxy(req: NextRequest, path: string) {
  const url = new URL(path, req.nextUrl.origin);
  const authorization = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(authorization ? { authorization } : {}),
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

  const daily = await proxy(req, "/en/api/notifications/daily");

  const digestRun = isMondayUtc(new Date());
  const digest = digestRun
    ? await proxy(req, "/en/api/notifications/digest")
    : { status: 204, headers: { "content-type": "application/json" }, body: "" };

  const processorRuns: Array<{ status: number; body: string }> = [];
  for (let i = 0; i < 10; i++) {
    const res = await proxy(req, "/en/api/notifications/processor");
    processorRuns.push({ status: res.status, body: res.body });

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
    (!digestRun || (digest.status >= 200 && digest.status < 300)) &&
    processorRuns.every((r) => r.status >= 200 && r.status < 300);

  return NextResponse.json(
    {
      ok,
      digestRun,
      durationMs: Date.now() - startedAt,
      daily: { status: daily.status, body: daily.body },
      digest: { status: digest.status, body: digest.body },
      processorRuns,
    },
    { status: ok ? 200 : 500 },
  );
}

export async function POST(req: NextRequest) {
  return GET(req);
}
