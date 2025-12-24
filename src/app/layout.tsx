import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { AuthContext as NextAuthContext } from "@/context/NextAuthContext";
import "./globals.css";

export const metadata: Metadata = {
    title: "StudioSchool - Management System",
    description: "Modern School Management System",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <NextAuthContext>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </NextAuthContext>
            </body>
        </html>
    );
}
