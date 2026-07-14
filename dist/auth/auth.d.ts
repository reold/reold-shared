export interface UserData {
    id: string;
    username: string;
    avatar: string | null;
    email?: string;
    email_verified?: boolean;
    provider: string;
}
interface AuthPlatform {
    token: string;
    user: UserData;
}
export interface AuthState {
    [provider: string]: AuthPlatform;
}
export declare const authState: import("svelte/store").Writable<AuthState>;
export declare const currentUser: import("svelte/store").Readable<{
    provider: string;
    id: string;
    username: string;
    avatar: string | null;
    email?: string;
    email_verified?: boolean;
} | null>;
/** Silently verify an existing token on app mount */
export declare function initAuth(): Promise<void>;
/** Process ?jwt=...&auth=... from the URL — handles the redirect fallback when the popup was blocked */
export declare function processAuthFromUrl(): void;
/** Store credentials from a successful popup flow */
export declare function handlePopupAuth(token: string, user: UserData): void;
/** Log out a provider */
export declare function logout(provider: string): void;
/** Opens the Discord auth popup and resolves when logged in, rejects if blocked/closed */
export declare function startDiscordAuthPopup(): Promise<void>;
export {};
