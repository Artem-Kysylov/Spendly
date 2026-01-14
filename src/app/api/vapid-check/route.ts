import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const okByBearer = bearer.startsWith("Bearer ")
    ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    : false;

  const okBySecret =
    !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  return okByBearer || okBySecret;
}

function mask(key: string | undefined): string {
  if (!key) return "(missing)";
  const trimmed = key.trim();
  if (trimmed.length < 12) return "(too short)";
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)} (len=${trimmed.length})`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publicKey = (
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
  ).trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim();
  const frontendPublicKey = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim();

  const diagnostics: Record<string, unknown> = {
    VAPID_PUBLIC_KEY: mask(process.env.VAPID_PUBLIC_KEY),
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: mask(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    VAPID_PRIVATE_KEY: mask(process.env.VAPID_PRIVATE_KEY),
    publicKeyUsedByProcessor: mask(publicKey),
    keysPresent: {
      publicKey: !!publicKey,
      privateKey: !!privateKey,
      frontendPublicKey: !!frontendPublicKey,
    },
  };

  // Check if frontend and backend public keys match
  if (frontendPublicKey && publicKey) {
    diagnostics.publicKeysMatch = frontendPublicKey === publicKey;
  }

  // Attempt to verify key pair by setting VAPID details
  let keyPairValid = false;
  let keyPairError: string | null = null;

  if (publicKey && privateKey) {
    try {
      webpush.setVapidDetails("mailto:test@example.com", publicKey, privateKey);
      keyPairValid = true;
    } catch (e: any) {
      keyPairError = e?.message || String(e);
    }
  }

  diagnostics.keyPairValid = keyPairValid;
  diagnostics.keyPairError = keyPairError;

  // Expected key lengths for base64url-encoded VAPID keys
  // Public key: 65 bytes raw = 87 chars base64url (no padding)
  // Private key: 32 bytes raw = 43 chars base64url (no padding)
  diagnostics.expectedLengths = {
    publicKey: "87 chars (base64url, no padding)",
    privateKey: "43 chars (base64url, no padding)",
  };
  diagnostics.actualLengths = {
    publicKey: publicKey.length,
    privateKey: privateKey.length,
  };

  // Hint for generating fresh keys
  diagnostics.howToGenerateFreshKeys = 
    "Run: npx web-push generate-vapid-keys";

  return NextResponse.json(diagnostics);
}
