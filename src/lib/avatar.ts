export type AvatarStyle = "initials" | "notionists";

/**
 * Generates a professional avatar URL using Dicebear.
 * 
 * @param seed - The seed string (e.g., username, email, or random string)
 * @param style - The avatar style. Defaults to "initials" for users, use "notionists" for illustrations.
 * @returns The complete URL to the avatar image
 */
export function getAvatarUrl(seed: string, style: AvatarStyle = "initials"): string {
    // Sanitize seed to ensure valid URL
    const safeSeed = encodeURIComponent(seed || "User");

    // Base URL for Dicebear API
    const baseUrl = "https://api.dicebear.com/7.x";

    return `${baseUrl}/${style}/svg?seed=${safeSeed}`;
}
