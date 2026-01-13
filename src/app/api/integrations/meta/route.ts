import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId") || "tellus-teams";
    const db = getAdminDb();
    const docPath = "tenants/" + tenantId + "/integrations/meta";
    const metaConfig = await db.doc(docPath).get();
    if (!metaConfig.exists) {
      return NextResponse.json({ error: "Meta config not found" }, { status: 404 });
    }
    const data = metaConfig.data();
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.floor(((data?.expiresAt || 0) - now) / 86400);
    return NextResponse.json({
      isConfigured: !!data?.accessToken,
      expiresAt: data?.expiresAt,
      expiry: {
        daysRemaining,
        formatted: daysRemaining > 0 ? daysRemaining + " days" : "Expired",
        isExpired: daysRemaining <= 0
      }
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = body.tenantId || "tellus-teams";
    const db = getAdminDb();
    const docPath = "tenants/" + tenantId + "/integrations/meta";
    const metaConfig = await db.doc(docPath).get();
    if (!metaConfig.exists) {
      return NextResponse.json({ error: "Meta config not found" }, { status: 404 });
    }
    const configData = metaConfig.data();
    const currentToken = configData?.accessToken;
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret || !currentToken) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
    }
    const refreshUrl = "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=" + appId + "&client_secret=" + appSecret + "&fb_exchange_token=" + currentToken;
    const response = await fetch(refreshUrl, { method: "GET" });
    const result = await response.json();
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 400 });
    }
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = result.expires_in || 5184000;
    const expiresAt = now + expiresIn;
    await db.doc(docPath).update({
      accessToken: result.access_token,
      expiresAt,
      refreshedAt: now,
      tokenVersion: ((configData?.tokenVersion) || 0) + 1
    });
    return NextResponse.json({
      success: true,
      expiresAt,
      daysRemaining: Math.floor(expiresIn / 86400)
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
