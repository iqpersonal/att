import { getServerSession } from "next-auth/next";
import { getGraphClient, getGraphClientForUser } from "@/lib/microsoftGraph";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("meetingId");
    const userId = searchParams.get("userId");
    const tenantId = searchParams.get("tenantId") || "tellus-teams";
    const session: any = await getServerSession();

    try {
        let client;
        let targetEmail = userId || session?.user?.email || "me";

        // 1. Resolve Graph Client
        if (session?.accessToken) {
            client = getGraphClient(session.accessToken);
        } else if (userId) {
            client = await getGraphClientForUser(userId);
        } else {
            // Application Permissions flow
            const { getAzureCredentials, getAppAccessToken } = await import("@/lib/azureAuth");
            const credentials = await getAzureCredentials(tenantId);
            if (!credentials) {
                return NextResponse.json({ error: `Unauthorized: No credentials for tenant ${tenantId}.` }, { status: 401 });
            }
            if (!credentials.azureCoordinatorEmail) {
                return NextResponse.json({ error: "Configuration Error: azureCoordinatorEmail is not set for this tenant. Attendance sync requires a coordinator email." }, { status: 400 });
            }
            const appToken = await getAppAccessToken(credentials);
            client = getGraphClient(appToken);
            targetEmail = credentials.azureCoordinatorEmail;
        }

        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        console.log(`[Attendance API] Fetching for event: ${eventId}, target: ${targetEmail}, mode: ${session?.accessToken ? 'session' : (userId ? 'user' : 'app')}`);

        // 2. Map Event ID to Online Meeting ID
        const event = await client.api(`/users/${encodeURIComponent(targetEmail)}/calendar/events/${encodeURIComponent(eventId)}`)
            .select("onlineMeeting,subject")
            .get();

        const joinUrl = event.onlineMeeting?.joinUrl;
        if (!joinUrl) {
            return NextResponse.json({ error: "The selected event is not a Teams Online Meeting." }, { status: 400 });
        }

        // 3. Find the online meeting object
        // NOTE: We escape single quotes in the Join URL to prevent OData filter errors
        const escapedJoinUrl = joinUrl.replace(/'/g, "''");
        const meetingQuery = await client.api(`/users/${encodeURIComponent(targetEmail)}/onlineMeetings`)
            .filter(`joinWebUrl eq '${escapedJoinUrl}'`)
            .get();

        if (!meetingQuery.value || meetingQuery.value.length === 0) {
            return NextResponse.json({ error: "Corresponding Online Meeting not found for this event." }, { status: 404 });
        }

        const meetingId = meetingQuery.value[0].id;

        // 4. Get the attendance reports
        // We fetch the last 10 reports and MERGE unique participants
        const reports = await client.api(`/users/${encodeURIComponent(targetEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports`)
            .top(10)
            .get();

        if (reports.value && reports.value.length > 0) {
            const participantMap = new Map();

            // Fetch all reports in parallel for speed
            const reportPromises = reports.value.map((report: any) =>
                client.api(`/users/${encodeURIComponent(targetEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}/attendanceReports/${encodeURIComponent(report.id)}`)
                    .expand("attendanceRecords")
                    .get()
                    .catch((e: any) => {
                        console.warn(`[Attendance API] Failed to fetch sub-report ${report.id}:`, e.message);
                        return null;
                    })
            );

            const allReportDetails = await Promise.all(reportPromises);

            for (const details of allReportDetails) {
                if (details && details.attendanceRecords) {
                    for (const record of details.attendanceRecords) {
                        try {
                            const displayName = record.identity?.displayName || "Unknown User";
                            const existing = participantMap.get(displayName);

                            if (!existing) {
                                participantMap.set(displayName, { ...record });
                            } else {
                                // Accumulate duration if the same person appears in multiple reports
                                existing.totalAttendanceInSeconds = (existing.totalAttendanceInSeconds || 0) + (record.totalAttendanceInSeconds || 0);
                                // Keep the earliest join time
                                if (record.joinDateTime && existing.joinDateTime) {
                                    if (new Date(record.joinDateTime) < new Date(existing.joinDateTime)) {
                                        existing.joinDateTime = record.joinDateTime;
                                    }
                                }
                            }
                        } catch (aggErr) {
                            console.warn("[Attendance API] Record aggregation failed for one entry:", aggErr);
                        }
                    }
                }
            }

            const combinedRecords = Array.from(participantMap.values());

            if (combinedRecords.length > 0) {
                return NextResponse.json({
                    subject: event.subject,
                    meetingId,
                    attendanceRecords: combinedRecords
                });
            }
        }

        // 5. Fallback: If no reports, check the online meeting's direct participants (Organizer/Invited)
        // This is a "Best Effort" view when the formal attendance report isn't ready.
        try {
            const meetingDetails = await client.api(`/users/${encodeURIComponent(targetEmail)}/onlineMeetings/${encodeURIComponent(meetingId)}`)
                .get();

            if (meetingDetails.participants) {
                const fallbackRecords: any[] = [];

                // Add Organizer
                if (meetingDetails.participants.organizer) {
                    fallbackRecords.push({
                        identity: { displayName: meetingDetails.participants.organizer.identity?.user?.displayName || "Organizer" },
                        joinDateTime: new Date().toISOString(),
                        totalAttendanceInSeconds: 0,
                        role: "Organizer (Fallback)"
                    });
                }

                // Add Attendees (if any are explicitly listed in the meeting object)
                if (meetingDetails.participants.attendees) {
                    for (const att of meetingDetails.participants.attendees) {
                        fallbackRecords.push({
                            identity: { displayName: att.identity?.user?.displayName || "Attendee" },
                            joinDateTime: new Date().toISOString(),
                            totalAttendanceInSeconds: 0,
                            role: "Attendee (Fallback)"
                        });
                    }
                }

                if (fallbackRecords.length > 0) {
                    return NextResponse.json({
                        subject: event.subject,
                        meetingId,
                        attendanceRecords: fallbackRecords,
                        message: "Formal attendance report not yet generated by Microsoft. Showing meeting participants instead."
                    });
                }
            }
        } catch (fallbackErr) {
            console.warn("[Attendance API] Fallback participant lookup failed:", fallbackErr);
        }

        return NextResponse.json({
            subject: event.subject,
            meetingId,
            attendanceRecords: [],
            message: "No attendance records found yet. Microsoft usually takes 5-10 minutes after a meeting ends to generate the report."
        });
    } catch (error: any) {
        let errorDetails = null;
        try {
            if (error.body) {
                errorDetails = typeof error.body === "string" ? JSON.parse(error.body) : error.body;
            }
        } catch (e) {
            errorDetails = error.body;
        }

        console.error("Attendance Fetch Error Details:", {
            message: error.message,
            statusCode: error.statusCode,
            details: errorDetails,
            eventId,
            tenantId
        });

        return NextResponse.json({
            error: error.message || "Internal Server Error",
            details: errorDetails
        }, { status: error.statusCode || 500 });
    }
}
