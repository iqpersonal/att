import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

/**
 * POST /api/integrations/whatsapp/disconnect
 * Disconnects WhatsApp integration by clearing the credentials from Firestore
 */
export async function POST(req: Request) {
  const requestId = Date.now();
  
  try {
    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      console.error(`[${requestId}] Missing tenantId`);
      return NextResponse.json(
        { error: "tenantId is required" },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Disconnecting WhatsApp for tenant: ${tenantId}`);

    const db = getAdminDb();
    const metaConfigRef = db.doc(`tenants/${tenantId}/integrations/meta`);

    // Update the document to clear credentials and set status to not_connected
    const updateData = {
      status: "not_connected",
      accessToken: null,
      refreshToken: null,
      phoneNumberId: null,
      wabaId: null,
      businessAccountId: null,
      connectedAt: null,
      expiresAt: null,
      refreshedAt: null,
      tokenVersion: 0,
      disconnectedAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await metaConfigRef.set(updateData, { merge: true });
    console.log(`[${requestId}] WhatsApp disconnected successfully for tenant: ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: "WhatsApp disconnected successfully",
      tenantId,
    });
  } catch (error) {
    console.error(`[${requestId}] Error disconnecting WhatsApp:`, error);
    return NextResponse.json(
      { error: "Failed to disconnect WhatsApp" },
      { status: 500 }
    );
  }
}
