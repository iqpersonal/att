import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const startDateTime = searchParams.get("startDateTime");
    const endDateTime = searchParams.get("endDateTime");
    const userId = searchParams.get("userId");
    const session: any = await getServerSession(authOptions as any);

    let client;
    let targetEmail = userId || session?.user?.email || "me";

    if (session?.accessToken) {
        client = getGraphClient(session.accessToken);
    } else if (userId) {
        client = await getGraphClientForUser(userId);
        // Attempt to resolve targetEmail from userId (UID) to real email or "me"
        try {
            const { getAdminDb } = await import("@/lib/firebaseAdmin");
            const db = getAdminDb();
            const userSnap = await db.collection("users").doc(userId).get();
            if (userSnap.exists) {
                const userData = userSnap.data();
                const resolvedEmail = userData?.email || userData?.microsoftEmail || userData?.microsoftTokens?.email;
                if (resolvedEmail) targetEmail = resolvedEmail;
            }
        } catch (err) {
            console.error("Error fetching user data in calendar API:", err);
        }

        // If targetEmail is still the UID (and not an email), default to "me" for safety
        if (targetEmail === userId && !targetEmail.includes("@")) {
            targetEmail = "me";
        }
    } else {
        const { getAzureCredentials, getAppAccessToken } = await import("@/lib/azureAuth");
        const tenantId = searchParams.get("tenantId") || "tellus-teams";
        const credentials = await getAzureCredentials(tenantId);

        if (!credentials) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!credentials.azureCoordinatorEmail) {
            return NextResponse.json({ error: "Configuration Error: azureCoordinatorEmail is not set for this tenant." }, { status: 400 });
        }

        const appToken = await getAppAccessToken(credentials);
        client = getGraphClient(appToken);
        targetEmail = credentials.azureCoordinatorEmail;
    }

    if (!startDateTime || !endDateTime) {
        return NextResponse.json({ error: "startDateTime and endDateTime are required" }, { status: 400 });
    }

    try {
        // Fetch calendar events between start and end date
        // Note: calendarView is more accurate for recurring events than /me/events
        const queryOptions = {
            startDateTime,
            endDateTime
        };

        const fetchEvents = async (graphClient: any) => {
            return await graphClient.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
                .query(queryOptions)
                .select("subject,start,end,location,onlineMeeting,onlineMeetingUrl,bodyPreview")
                .top(50)
                .get();
        };

        let events;
        try {
            events = await fetchEvents(client);
        } catch (error: any) {
            if (error.statusCode === 401 && userId) {
                console.log("[Calendar API] 401 received, attempting token refresh...");
                client = await getGraphClientForUser(userId, true);
                events = await fetchEvents(client);
            } else {
                throw error;
            }
        }

        return NextResponse.json(events);
    } catch (error: any) {
        console.error("Calendar Fetch Error Details:", {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body,
            targetEmail
        });
        return NextResponse.json({
            error: error.message || "Failed to fetch calendar",
            details: error.body ? ((typeof error.body === 'string') ? JSON.parse(error.body) : error.body) : null
        }, { status: 500 });
    }
}

