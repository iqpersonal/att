import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId"); // Optional: for background sync
    let tenantId = searchParams.get("tenantId");

    if (!tenantId || tenantId === "null") {
        tenantId = "tellus-teams";
    }

    const session: any = await getServerSession();

    try {
        let client;
        let targetEmail = userId || session?.user?.email || "me";

        // Priority 1: User Session (Delegated)
        if (session?.accessToken) {
            client = getGraphClient(session.accessToken);
        }
        // Priority 2: Stored User Token (Delegated - background)
        else if (userId) {
            client = await getGraphClientForUser(userId);
        }
        // Priority 3: App Credentials (Application Permissions)
        else {
            const { getAzureCredentials, getAppAccessToken } = await import("@/lib/azureAuth");
            const credentials = await getAzureCredentials(tenantId);

            if (!credentials) {
                return NextResponse.json({
                    error: `Unauthorized: No credentials for tenant ${tenantId}.`
                }, { status: 401 });
            }

            if (!credentials.azureCoordinatorEmail) {
                return NextResponse.json({ error: "Configuration Error: azureCoordinatorEmail is not set for this tenant." }, { status: 400 });
            }

            const appToken = await getAppAccessToken(credentials);
            client = getGraphClient(appToken);
            targetEmail = credentials.azureCoordinatorEmail;
        }

        // Fetch meetings with the resolved client
        // Optimized window: 15 days back (for history) and 30 days forward (for upcoming)
        const startDateTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();
        const endDateTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        const result = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
            .query({ startDateTime, endDateTime })
            .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting")
            .top(50) // Reduced from 100 to 50 for faster processing
            .get();

        const onlineMeetings = (result.value || []).filter((event: any) =>
            event.isOnlineMeeting === true || event.onlineMeeting !== null
        );

        return NextResponse.json({ value: onlineMeetings });
    } catch (error: any) {
        console.error("Meetings Fetch Error Details:", {
            message: error.message,
            statusCode: error.statusCode,
            body: error.body,
            tenantId
        });
        return NextResponse.json({
            error: error.message || "Failed to fetch meetings",
            details: error.body ? JSON.parse(error.body) : null
        }, { status: 500 });
    }
}
