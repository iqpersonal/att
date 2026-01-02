import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("meetingId");
    const msMeetingId = searchParams.get("onlineMeetingId");
    const joinUrlParam = searchParams.get("joinUrl");
    const organizerEmail = searchParams.get("organizerEmail");
    const mailboxEmail = searchParams.get("mailboxEmail");
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId") || "tellus-teams";

    const session: any = await getServerSession(authOptions as any);

    try {
        let client;
        let targetEmail = session?.user?.email || "me";
        let mode: "session" | "user" | "app" = "app";

        console.log(`[Attendance API] Start resolution for user: ${userId}, mailbox: ${mailboxEmail}`);

        // 1. Resolve Graph Client with Fallbacks
        if (session?.accessToken) {
            client = getGraphClient(session.accessToken);
            mode = "session";
            console.log(`[Attendance API] Using active session client for: ${targetEmail}`);
        } else if (userId && userId.length > 5) {
            try {
                console.log(`[Attendance API] Attempting token lookup for userId: ${userId}`);
                client = await getGraphClientForUser(userId);
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const userSnap = await getDoc(doc(db, "users", userId));
                if (userSnap.exists()) {
                    const userData = userSnap.data();
                    targetEmail = userData?.email || userData?.microsoftEmail || userData?.microsoftTokens?.email || "me";
                    if (targetEmail === userId) targetEmail = "me";
                    mode = "user";
                    console.log(`[Attendance API] Resolved background targetEmail: ${targetEmail}`);
                }
            } catch (err) {
                console.warn(`[Attendance API] User tokens failed/absent, falling back to app mode.`);
            }
        }

        if (!client) {
            const { getAzureCredentials, getAppAccessToken } = await import("@/lib/azureAuth");
            const credentials = await getAzureCredentials(tenantId);
            if (!credentials) {
                return NextResponse.json({ error: `Unauthorized: No credentials for ${tenantId}` }, { status: 401 });
            }
            const appToken = await getAppAccessToken(credentials);
            client = getGraphClient(appToken);
            mode = "app";
            // In app mode, 'me' doesn't work. We must use a mailbox.
            targetEmail = mailboxEmail || organizerEmail || credentials.azureCoordinatorEmail;
            console.log(`[Attendance API] Using Application Mode. Target: ${targetEmail}`);
        }

        if (!eventId) {
            return NextResponse.json({ error: "Calendar Event ID is required" }, { status: 400 });
        }

        // 2. Resolve Online Meeting Metadata
        let meetingId = msMeetingId || "";
        let subject = "Meeting Session";
        let joinUrl = joinUrlParam ? decodeURIComponent(joinUrlParam) : "";
        // Double decode protection
        if (joinUrl.includes('%')) {
            try { joinUrl = decodeURIComponent(joinUrl); } catch (e) { }
        }

        console.log(`[Attendance API] Resolved Params - MeetingID: ${meetingId || 'null'}, JoinURL: ${joinUrl ? 'present' : 'absent'}, targetEmail: ${targetEmail}`);

        // Resolve IDs from Calendar if missing
        if (!meetingId && eventId) {
            try {
                console.log(`[Attendance API] Querying calendar event: ${eventId}`);
                const event = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/events/${encodeURIComponent(eventId)}`)
                    .select("onlineMeeting,subject,onlineMeetingUrl")
                    .get();

                subject = event.subject;
                joinUrl = event.onlineMeeting?.joinUrl || event.onlineMeetingUrl || joinUrl;
                meetingId = event.onlineMeeting?.id || "";
                console.log(`[Attendance API] Calendar Check Result: ${meetingId ? 'Found Teams ID' : 'No Teams ID in event'}`);
            } catch (e: any) {
                console.warn(`[Attendance API] Calendar event lookup failed: ${e.message}`);
                // Fallback: Deep search via calendarView
                try {
                    console.log(`[Attendance API] Performing deep search in calendarView...`);
                    const startView = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
                    const endView = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString();
                    const search = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/calendarView`)
                        .query({ startDateTime: startView, endDateTime: endView })
                        .select("id,subject,onlineMeeting,onlineMeetingUrl")
                        .top(100)
                        .get();

                    const found = (search.value || []).find((e: any) => e.id === eventId);
                    if (found) {
                        subject = found.subject;
                        joinUrl = found.onlineMeeting?.joinUrl || found.onlineMeetingUrl || joinUrl;
                        meetingId = found.onlineMeeting?.id || "";
                        console.log(`[Attendance API] Found in deep search: ${meetingId ? 'Has Teams ID' : 'Still no Teams ID'}`);
                    }
                } catch (deepErr) {
                    console.error(`[Attendance API] Deep search also failed.`);
                }
            }
        }

        // 3. Last Resort: Resolve Meeting ID from Join URL
        if (!meetingId && joinUrl) {
            const { getAzureCredentials } = await import("@/lib/azureAuth");
            const creds = await getAzureCredentials(tenantId);
            const searchEmails = new Set([
                targetEmail.toLowerCase(),
                mailboxEmail?.toLowerCase(),
                organizerEmail?.toLowerCase(),
                creds?.azureCoordinatorEmail?.toLowerCase()
            ].filter(e => e && e !== "me") as string[]);

            console.log(`[Attendance API] Exhaustive search in onlineMeetings for: ${Array.from(searchEmails).join(', ')}`);

            for (const email of searchEmails) {
                try {
                    // Method A: Direct Filter
                    const filterRes = await client.api(`/users/${encodeURIComponent(email)}/onlineMeetings`)
                        .filter(`joinWebUrl eq '${joinUrl.split('?')[0].replace(/'/g, "''")}'`)
                        .get();

                    if (filterRes.value?.length > 0) {
                        meetingId = filterRes.value[0].id;
                        subject = filterRes.value[0].subject || subject;
                        console.log(`[Attendance API] Resolved via Filter in ${email}`);
                        break;
                    }

                    // Method B: Manual Match (Top 50)
                    const listRes = await client.api(`/users/${encodeURIComponent(email)}/onlineMeetings`).top(50).get();
                    const targetBaseUrl = joinUrl.split('?')[0].replace(/\/0$/, '').replace(/\/$/, '').toLowerCase();

                    const match = (listRes.value || []).find((m: any) => {
                        const mUrl = (m.joinWebUrl || m.joinUrl || "").split('?')[0].replace(/\/$/, '').toLowerCase();
                        return mUrl === targetBaseUrl;
                    });

                    if (match) {
                        meetingId = match.id;
                        subject = match.subject || subject;
                        console.log(`[Attendance API] Resolved via Manual Match in ${email}`);
                        break;
                    }
                } catch (err: any) {
                    console.warn(`[Attendance API] OnlineMeeting lookup failed for ${email}: ${err.message}`);
                }
            }
        }

        if (!meetingId) {
            console.error(`[Attendance API] Final Failure: Could not resolve Teams ID.`);
            return NextResponse.json({
                error: "Meeting Tracker Not Found",
                message: "We found the calendar event, but Microsoft Teams hasn't activated the attendance tracker for it yet. Ensure the host has joined the meeting."
            }, { status: 404 });
        }

        // 4. Fetch Attendance Reports
        console.log(`[Attendance API] Fetching reports for Meeting ID: ${meetingId}`);
        let reportsResult;
        try {
            reportsResult = await client.api(`/users/${encodeURIComponent(targetEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports`)
                .expand("attendanceRecords")
                .top(10)
                .get();
        } catch (e: any) {
            // If direct fetch fails, try as a different user if possible
            console.warn(`[Attendance API] Reports fetch failed for ${targetEmail}.`);
            reportsResult = { value: [] };
        }

        // Processing Logic
        const participantMap = new Map();
        if (reportsResult.value && reportsResult.value.length > 0) {
            for (const report of reportsResult.value) {
                // If records are already expanded
                if (report.attendanceRecords) {
                    for (const record of report.attendanceRecords) {
                        const name = record.identity?.displayName || "Unknown Person";
                        const existing = participantMap.get(name);
                        if (!existing) {
                            participantMap.set(name, { ...record });
                        } else {
                            existing.totalAttendanceInSeconds = (existing.totalAttendanceInSeconds || 0) + (record.totalAttendanceInSeconds || 0);
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            attendanceRecords: Array.from(participantMap.values()),
            meetingId,
            subject,
            count: participantMap.size
        });

    } catch (error: any) {
        console.error("Attendance API Global Error:", error.message, error.statusCode);
        return NextResponse.json({
            error: error.message || "Internal Server Error",
            details: error.statusCode
        }, { status: error.statusCode || 500 });
    }
}
