import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId") || "tellus-teams";
    const organizerEmail = searchParams.get("organizerEmail");
    const fetchAll = searchParams.get("fetchAll") === "true";

    // Window: 15 days back and 30 days forward
    const startDateTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
    const endDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const session: any = await getServerSession(authOptions as any);

    try {
        let client;
        let targetEmail = session?.user?.email || "me";

        if (session?.accessToken) {
            client = getGraphClient(session.accessToken);
        } else if (userId && userId.length > 5) {
            client = await getGraphClientForUser(userId);
            try {
                const { getAdminDb } = await import("@/lib/firebaseAdmin");
                const db = getAdminDb();
                const userSnap = await db.collection("users").doc(userId).get();
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    targetEmail = userData?.email || userData?.microsoftEmail || userData?.microsoftTokens?.email || "me";
                    // CRITICAL: Ensure targetEmail is never the Firebase UID
                    if (targetEmail === userId) targetEmail = "me";
                }
            } catch (err) {
                console.error("Error fetching user data using Admin SDK:", err);
                targetEmail = "me"; // Fallback
            }
        } else {
            const { getAzureCredentials, getAppAccessToken } = await import("@/lib/azureAuth");
            const credentials = await getAzureCredentials(tenantId);
            if (!credentials) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            const appToken = await getAppAccessToken(credentials);
            client = getGraphClient(appToken);
            targetEmail = organizerEmail || credentials.azureCoordinatorEmail;
        }

        if (targetEmail === "me" && !session?.accessToken && !userId) {
            // Fallback to app coordinator if we are truly lost
            const { getAzureCredentials } = await import("@/lib/azureAuth");
            const credentials = await getAzureCredentials(tenantId);
            if (credentials?.azureCoordinatorEmail) targetEmail = credentials.azureCoordinatorEmail;
        }

        console.log(`[Meetings API] Target: ${targetEmail}, Tenant: ${tenantId}, FetchAll: ${fetchAll}`);

        let result;

        try {
            if (fetchAll) {
                // Fetch ALL meetings from connected user's calendar (including meetings from other organizers they attend)
                console.log("[Meetings API] Fetching all meetings with fetchAll=true");
                const query = {
                    startDateTime: startDateTime,
                    endDateTime: endDateTime
                };
                result = await client.api(`/me/calendarview`)
                    .query(query)
                    .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting,organizer,attendees,categories")
                    .orderby("start/dateTime")
                    .top(500)
                    .get();
                console.log(`[Meetings API] Retrieved ${result.value?.length || 0} total events`);
            } else {
                // Original: Fetch for specific user/organizer only
                const info = { startDateTime, endDateTime };
                result = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
                    .query(info)
                    .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting,organizer")
                    .top(50)
                    .get();
            }
        } catch (error: any) {
            // Retry logic for 401 Unauthorized
            if (error.statusCode === 401 && userId && userId.length > 5) {
                console.log("[Meetings API] 401 received, attempting token refresh...");
                client = await getGraphClientForUser(userId, true);
                
                if (fetchAll) {
                    const query = {
                        startDateTime: startDateTime,
                        endDateTime: endDateTime
                    };
                    result = await client.api(`/me/calendarview`)
                        .query(query)
                        .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting,organizer,attendees,categories")
                        .orderby("start/dateTime")
                        .top(500)
                        .get();
                } else {
                    const info = { startDateTime, endDateTime };
                    result = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
                        .query(info)
                        .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting,organizer")
                        .top(50)
                        .get();
                }
            } else {
                throw error;
            }
        }


        const onlineMeetings = (result.value || []).filter((event: any) =>
            event.isOnlineMeeting === true || event.onlineMeeting !== null
        ).map((event: any) => ({
            ...event,
            mailboxEmail: targetEmail,
            organizerEmail: event.organizer?.emailAddress?.address,
            joinUrl: event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || event.webLink,
            onlineMeetingId: event.onlineMeeting?.id
        }));

        return NextResponse.json({ value: onlineMeetings });
    } catch (error: any) {
        console.error("Meetings API Error:", error.message, error.statusCode);
        return NextResponse.json({ error: error.message || "Failed to fetch meetings" }, { status: error.statusCode || 500 });
    }
}





