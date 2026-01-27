import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: "Lemon Squeezy webhooks are deprecated" },
    { status: 410 },
  );
}
