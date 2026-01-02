import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        // 1. Validate Request Body
        const contentType = req.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            return NextResponse.json({ success: false, error: "Invalid Content-Type. Expected application/json" }, { status: 400 });
        }

        const body = await req.json().catch(() => null);
        if (!body || !body.tenantId) {
            return NextResponse.json({ success: false, error: "Missing or malformed request body (tenantId required)" }, { status: 400 });
        }

        const { tenantId } = body;
        console.log(`[Sync] Triggering manual Lead Sync for tenant: ${tenantId}`);

        // 2. Safely Initialize Firebase Admin
        let adminDb;
        try {
            adminDb = getAdminDb();
        } catch (dbError: any) {
            console.error("[Sync] Firebase initialization failed:", dbError.message);
            return NextResponse.json({ success: false, error: "Database connection failed", details: dbError.message }, { status: 500 });
        }

        // 3. Fetch Configuration
        const configRef = adminDb.doc(`tenants/${tenantId}/integrations/meta`);
        const configSnap = await configRef.get();

        if (!configSnap.exists) {
            return NextResponse.json({ success: false, error: `Meta integration not found for tenant: ${tenantId}` }, { status: 404 });
        }

        const config = configSnap.data();
        let { accessToken, pageId } = config || {};

        if (!accessToken || !pageId) {
            return NextResponse.json({ success: false, error: "Missing Meta credentials (Page ID or Access Token)" }, { status: 400 });
        }

        // 4. Exchange System User Token for Page Access Token
        // This resolves the "(#190) This method must be called with a Page Access Token" error
        try {
            console.log(`[Sync] Exchanging System User token for Page Access Token for ${pageId}...`);
            const pageTokenUrl = `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${accessToken}`;
            const pageTokenRes = await fetch(pageTokenUrl);
            const pageTokenData = await pageTokenRes.json();

            if (pageTokenData.access_token) {
                console.log("[Sync] Successfully obtained Page Access Token.");
                accessToken = pageTokenData.access_token;
            } else if (pageTokenData.error) {
                console.warn("[Sync] Page Token Exchange failed (Falling back to original):", pageTokenData.error.message);
                // We keep original token and try, but often it fails with the #190 error shown by user
            }
        } catch (tokenErr: any) {
            console.error("[Sync] Token exchange fatal error:", tokenErr.message);
        }

        // 5. Fetch Forms from Meta API
        const formsUrl = `https://graph.facebook.com/v21.0/${pageId}/leadgen_forms?access_token=${accessToken}`;
        const formsResponse = await fetch(formsUrl);
        const formsData = await formsResponse.json();

        if (formsData.error) {
            console.error("[Sync] Meta API Error (Forms):", formsData.error);
            return NextResponse.json({ success: false, error: `Meta API Error: ${formsData.error.message}` }, { status: 500 });
        }

        let syncCount = 0;
        const forms = formsData.data || [];

        // 5. Process Leads from each form
        for (const form of forms) {
            // Include campaign and ad fields in the request
            const fields = "id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,platform,is_organic";
            const leadsUrl = `https://graph.facebook.com/v21.0/${form.id}/leads?fields=${fields}&limit=50&access_token=${accessToken}`;
            const leadsResponse = await fetch(leadsUrl);
            const leadsData = await leadsResponse.json();

            if (leadsData.data) {
                console.log(`[Sync] Sample Lead Data for form ${form.id}:`, JSON.stringify(leadsData.data[0], null, 2));
                for (const lead of leadsData.data) {
                    try {
                        // Check for duplicates
                        const existingLeadQuery = await adminDb.collection("leads")
                            .where("tenantId", "==", tenantId)
                            .where("metaLeadId", "==", lead.id)
                            .limit(1)
                            .get();

                        const fieldData = lead.field_data || [];
                        const getValue = (key: string) => {
                            const found = fieldData.find((f: any) => f.name.toLowerCase().includes(key.toLowerCase()));
                            return found?.values?.[0] || "";
                        };

                        const campaignData = {
                            campaignId: lead.campaign_id || "",
                            campaignName: lead.campaign_name || "Unknown Campaign",
                            adId: lead.ad_id || "",
                            adName: lead.ad_name || "",
                            adsetId: lead.adset_id || "",
                            adsetName: lead.adset_name || "",
                            source: lead.platform === "ig" ? "Instagram" : "Facebook",
                            isOrganic: !!lead.is_organic,
                            updatedAt: FieldValue.serverTimestamp()
                        };

                        if (existingLeadQuery.empty) {
                            const fullName = getValue("full_name") || getValue("name") || "Meta Lead";
                            const email = getValue("email") || "";
                            const phone = getValue("phone") || "";

                            await adminDb.collection("leads").add({
                                tenantId,
                                fullName,
                                email,
                                phone,
                                status: "new",
                                metaLeadId: lead.id,
                                formId: lead.form_id || form.id,
                                formName: form.name || "", // Save form name
                                ...campaignData,
                                createdAt: FieldValue.serverTimestamp(),
                                notes: `Synced from Meta Form: ${form.name}`
                            });
                            syncCount++;
                        } else {
                            // Update existing lead if campaign information or formName is missing
                            const existingLead = existingLeadQuery.docs[0];
                            const existingData = existingLead.data();

                            const needsUpdate = !existingData.campaignName ||
                                existingData.campaignName === "Unknown Campaign" ||
                                !existingData.formName;

                            if (needsUpdate) {
                                console.log(`[Sync] Updating existing lead ${lead.id} with enriched data.`);
                                await existingLead.ref.update({
                                    ...campaignData,
                                    formName: existingData.formName || form.name || ""
                                });
                                syncCount++;
                            }
                        }
                    } catch (innerLeadError: any) {
                        console.warn(`[Sync] Failed to process individual lead ${lead.id}:`, innerLeadError.message);
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully processed ${forms.length} forms and synced ${syncCount} leads.`
        });

    } catch (error: any) {
        console.error("[Sync] Fatal Unhandled Error:", error);
        return NextResponse.json({
            success: false,
            error: "An internal server error occurred",
            details: error.message
        }, { status: 500 });
    }
}
