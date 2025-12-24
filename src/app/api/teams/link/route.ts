import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { saveMicrosoftTokens } from "@/lib/tokenService";

export async function POST(req: Request) {
    const session: any = await getServerSession();

    if (!session?.accessToken || !session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Save tokens to Firestore
        await saveMicrosoftTokens(userId, {
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            expiresAt: session.expiresAt,
        });

        return NextResponse.json({ success: true, message: "Microsoft account linked successfully" });
    } catch (error: any) {
        console.error("Link Account Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
