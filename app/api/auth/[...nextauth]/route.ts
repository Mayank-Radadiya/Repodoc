import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { AuthConfigurationError } from "@/lib/auth/config";

// Cache Components disallows an explicit runtime segment option; Node.js is the default.

export async function GET(request: NextRequest) {
  try {
    return await handlers[request.method === "POST" ? "POST" : "GET"](request);
  } catch (error) {
    if (!(error instanceof AuthConfigurationError)) throw error;
    console.error("[auth]", error.message);
    const body = error.code === "oauth_app_required"
      ? { error: error.message, code: error.code }
      : { error: "Authentication is not configured." };
    return Response.json(body, {
      status: 500,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export const POST = GET;
