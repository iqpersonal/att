import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

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
        const events = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
            .query({
                startDateTime,
                endDateTime
            })
            .select("subject,start,end,location,onlineMeeting,onlineMeetingUrl,bodyPreview")
            .top(50)
            .get();

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
            details: error.body ? JSON.parse(error.body) : null
        }, { status: 500 });
    }
}
