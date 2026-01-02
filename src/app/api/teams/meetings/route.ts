import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId") || "tellus-teams";
    const organizerEmail = searchParams.get("organizerEmail");

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
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const userSnap = await getDoc(doc(db, "users", userId));
            if (userSnap.exists()) {
                const userData = userSnap.data();
                targetEmail = userData?.email || userData?.microsoftEmail || userData?.microsoftTokens?.email || "me";
                // CRITICAL: Ensure targetEmail is never the Firebase UID
                if (targetEmail === userId) targetEmail = "me";
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

        console.log(`[Meetings API] Target: ${targetEmail}, Tenant: ${tenantId}`);

        const result = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
            .query({ startDateTime, endDateTime })
            .select("id,subject,start,end,onlineMeeting,webLink,isOnlineMeeting,organizer")
            .top(50)
            .get();

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
