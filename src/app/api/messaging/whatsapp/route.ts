import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";

// Log available environment variables at startup
function logEnvironmentStatus() {
  const hasAccessToken = !!process.env.WHATSAPP_ACCESS_TOKEN;
  const hasPhoneNumberId = !!process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  console.log("[WhatsApp] Environment startup check:", {
    hasAccessToken,
    hasPhoneNumberId,
    timestamp: new Date().toISOString()
  });
}

// Call once at module load time
logEnvironmentStatus();

// These will be used as fallbacks if no tenant configuration is found
const DEFAULT_WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const DEFAULT_WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

export async function POST(req: Request) {
    const requestId = Date.now();
    
    try {
        console.log([WhatsApp:}{requestId}] Incoming request received, {
            timestamp: new Date().toISOString()
        });

        const { to, templateName, components, tenantId, languageCode, text, type = "template" } = await req.json();

        console.log([WhatsApp:}{requestId}] Request payload parsed:, {
            to,
            templateName,
            tenantId,
            languageCode,
            type,
            hasComponents: !!components,
            hasText: !!text
        });

        let accessToken = DEFAULT_WHATSAPP_ACCESS_TOKEN;
        let phoneNumberId = DEFAULT_WHATSAPP_PHONE_NUMBER_ID;
        let credentialSource = "environment_defaults";

        console.log([WhatsApp:}{requestId}] Initial credentials from env:, {
            hasAccessToken: !!accessToken,
            hasPhoneNumberId: !!phoneNumberId
        });

        // Fetch tenant-specific configuration if provided
        if (tenantId) {
            console.log([WhatsApp:}{requestId}] Attempting to fetch config for tenant: }{tenantId});
            
            try {
                let adminDb;
                
                try {
                    adminDb = getAdminDb();
                    console.log([WhatsApp:}{requestId}] Firebase Admin SDK initialized successfully);
                } catch (adminErr) {
                    console.error([WhatsApp:}{requestId}] Firebase Admin SDK initialization failed:, {
                        error: adminErr instanceof Error ? adminErr.message : String(adminErr)
                    });
                    throw new Error("Firebase Admin SDK failed to initialize");
                }

                // Fetch WhatsApp config
                let configSnap;
                try {
                    configSnap = await adminDb.doc(	enants/}{tenantId}/config/whatsapp).get();
                    console.log([WhatsApp:}{requestId}] Firestore read successful for tenant config, {
                        docExists: configSnap.exists
                    });
                } catch (firestoreErr) {
                    console.error([WhatsApp:}{requestId}] Firestore read failed for tenant config:, {
                        path: 	enants/}{tenantId}/config/whatsapp,
                        error: firestoreErr instanceof Error ? firestoreErr.message : String(firestoreErr)
                    });
                    throw new Error(Failed to read Firestore config: }{firestoreErr instanceof Error ? firestoreErr.message : "Unknown error"});
                }

                const configData = configSnap.data() || {};
                console.log([WhatsApp:}{requestId}] Tenant config retrieved:, {
                    hasAccessToken: !!configData.accessToken,
                    hasPhoneNumberId: !!configData.phoneNumberId
                });

                // Use WhatsApp config token if available
                if (configData.accessToken) {
                    accessToken = configData.accessToken;
                    credentialSource = "tenant_whatsapp_config";
                    console.log([WhatsApp:}{requestId}] Using access token from tenant WhatsApp config);
                }
                
                if (configData.phoneNumberId) {
                    phoneNumberId = configData.phoneNumberId;
                    console.log([WhatsApp:}{requestId}] Using phone number ID from tenant WhatsApp config);
                }

                // Fallback to Meta integration token only if WhatsApp token is missing
                if (!accessToken) {
                    console.log([WhatsApp:}{requestId}] Access token still missing, checking Meta integration);
                    
                    let metaSnap;
                    try {
                        metaSnap = await adminDb.doc(	enants/}{tenantId}/integrations/meta).get();
                        console.log([WhatsApp:}{requestId}] Firestore read successful for Meta integration, {
                            docExists: metaSnap.exists
                        });
                    } catch (metaErr) {
                        console.error([WhatsApp:}{requestId}] Firestore read failed for Meta integration:, {
                            path: 	enants/}{tenantId}/integrations/meta,
                            error: metaErr instanceof Error ? metaErr.message : String(metaErr)
                        });
                        // Don't throw here, just continue with defaults
                    }

                    if (metaSnap?.exists) {
                        const metaData = metaSnap.data() || {};
                        if (metaData.accessToken) {
                            accessToken = metaData.accessToken;
                            credentialSource = "tenant_meta_integration";
                            console.log([WhatsApp:}{requestId}] Using access token from tenant Meta integration);
                        }
                    }
                }
            } catch (e) {
                console.error([WhatsApp:}{requestId}] Error during tenant config fetch process:, {
                    tenantId,
                    error: e instanceof Error ? e.message : String(e),
                    stack: e instanceof Error ? e.stack : undefined
                });
                // Continue to credential validation - will catch missing credentials below
            }
        }

        // Validate credentials
        console.log([WhatsApp:}{requestId}] Final credential check:, {
            hasAccessToken: !!accessToken,
            hasPhoneNumberId: !!phoneNumberId,
            credentialSource,
            tenantId: tenantId || "none"
        });

        if (!accessToken) {
            console.warn([WhatsApp:}{requestId}] Missing WhatsApp access token, {
                credentialSource,
                tenantId: tenantId || "none"
            });
            return NextResponse.json(
                { 
                    success: false, 
                    error: "WhatsApp access token not configured",
                    details: Credential source attempted: }{credentialSource}
                },
                { status: 400 }
            );
        }

        if (!phoneNumberId) {
            console.warn([WhatsApp:}{requestId}] Missing WhatsApp phone number ID, {
                credentialSource,
                tenantId: tenantId || "none"
            });
            return NextResponse.json(
                { 
                    success: false, 
                    error: "WhatsApp phone number ID not configured",
                    details: Credential source attempted: }{credentialSource}
                },
                { status: 400 }
            );
        }

        const cleanTo = to.replace(/\D/g, "");
        const url = https://graph.facebook.com/v21.0/}{phoneNumberId}/messages;

        console.log([WhatsApp:}{requestId}] Preparing Meta API call:, {
            phoneNumberId,
            cleanTo,
            url,
            messageType: type
        });

        // Build Payload based on type
        const payload: any = {
            messaging_product: "whatsapp",
            to: cleanTo,
            type: type
        };

        if (type === "template") {
            payload.template = {
                name: templateName,
                language: { code: languageCode || "en_US" },
                components: components || [],
            };
        } else if (type === "text") {
            payload.text = { body: text };
        }

        console.log([WhatsApp:}{requestId}] Sending request to Meta API:, {
            url,
            payloadType: type,
            hasTemplate: !!payload.template,
            hasText: !!payload.text
        });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": Bearer }{accessToken},
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        console.log([WhatsApp:}{requestId}] Meta API response received:, {
            status: response.status,
            statusOk: response.ok,
            hasMessageId: !!data.messages?.[0]?.id,
            hasError: !!data.error
        });

        if (response.ok) {
            console.log([WhatsApp:}{requestId}] Message sent successfully:, {
                messageId: data.messages?.[0]?.id
            });
            return NextResponse.json({ success: true, data });
        } else {
            const errorMessage = data.error?.message || "Failed to send WhatsApp message";
            const errorCode = data.error?.code || response.status;
            
            console.error([WhatsApp:}{requestId}] Meta WhatsApp API Error:, {
                status: response.status,
                errorCode,
                errorMessage,
                fullError: data.error
            });
            
            return NextResponse.json(
                { 
                    success: false, 
                    error: errorMessage,
                    code: errorCode
                },
                { status: response.status }
            );
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        console.error([WhatsApp:}{requestId}] Unhandled route error:, {
            error: errorMessage,
            stack: errorStack
        });
        
        return NextResponse.json(
            { 
                success: false, 
                error: "Internal server error",
                details: process.env.NODE_ENV === "development" ? errorMessage : undefined
            },
            { status: 500 }
        );
    }
}
