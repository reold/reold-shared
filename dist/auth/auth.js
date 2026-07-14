import { writable, derived, get } from 'svelte/store';
/* ---------- localStorage ---------- */
function getAuthFromStorage() {
    try {
        const raw = localStorage.getItem('auth');
        if (raw)
            return JSON.parse(raw);
    }
    catch {
        /* ignore */
    }
    return {};
}
function setAuthToStorage(state) {
    localStorage.setItem('auth', JSON.stringify(state));
}
/* ---------- store ---------- */
export const authState = writable(getAuthFromStorage());
export const currentUser = derived(authState, ($auth) => {
    const providers = Object.keys($auth);
    if (providers.length === 0)
        return null;
    const primary = providers[0]; // first logged‑in provider
    return { ...$auth[primary].user, provider: primary };
});
authState.subscribe((state) => setAuthToStorage(state));
/* ---------- helpers ---------- */
const AUTH_SERVER = 'https://auth.reold.workers.dev';
const ALLOWED_ORIGIN = 'https://auth.reold.workers.dev';
function decodeJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    }
    catch {
        return null;
    }
}
/* ---------- public API ---------- */
/** Silently verify an existing token on app mount */
export async function initAuth() {
    const state = get(authState);
    const providers = Object.keys(state);
    if (providers.length === 0)
        return;
    const provider = providers[0];
    const { token } = state[provider];
    try {
        const res = await fetch(`${AUTH_SERVER}/discord/me`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
            // invalid / expired → clear
            authState.update((s) => {
                delete s[provider];
                return s;
            });
            return;
        }
        const user = await res.json();
        authState.update((s) => {
            s[provider] = {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    avatar: user.avatar,
                    email: user.email,
                    email_verified: user.email_verified,
                    provider
                }
            };
            return s;
        });
    }
    catch {
        console.warn('Auth verification failed, using cached data');
    }
}
/** Process ?jwt=...&auth=... from the URL — handles the redirect fallback when the popup was blocked */
export function processAuthFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const jwt = params.get('jwt');
    const auth = params.get('auth');
    if (!jwt || !auth)
        return;
    // Clean the query string off the address bar
    window.history.replaceState({}, '', window.location.pathname);
    const decoded = decodeJwt(jwt);
    if (!decoded)
        return;
    const user = {
        id: decoded.sub,
        username: decoded.username,
        avatar: decoded.avatar,
        email: decoded.email,
        email_verified: decoded.email_verified,
        provider: auth
    };
    authState.update((state) => {
        state[auth] = { token: jwt, user };
        return state;
    });
}
/** Store credentials from a successful popup flow */
export function handlePopupAuth(token, user) {
    authState.update((s) => {
        s[user.provider] = { token, user };
        return s;
    });
}
/** Log out a provider */
export function logout(provider) {
    authState.update((s) => {
        delete s[provider];
        return s;
    });
}
/** Opens the Discord auth popup and resolves when logged in, rejects if blocked/closed */
export function startDiscordAuthPopup() {
    return new Promise((resolve, reject) => {
        const origin = window.location.origin;
        const popupUrl = `${AUTH_SERVER}/discord?popup=1&origin=${encodeURIComponent(origin)}`;
        const popup = window.open(popupUrl, 'discord-auth', 'width=500,height=650');
        if (!popup) {
            // Popup blocked → fallback to full redirect; processAuthFromUrl()
            // picks up the result once the browser lands back on this page.
            window.location.href = `${AUTH_SERVER}/discord`;
            return reject(new Error('Popup blocked'));
        }
        const handleMessage = (event) => {
            if (event.origin !== ALLOWED_ORIGIN)
                return;
            const data = event.data;
            if (data && data.type === 'discord-auth' && data.token && data.user) {
                handlePopupAuth(data.token, data.user);
                popup.close();
                window.removeEventListener('message', handleMessage);
                clearInterval(checkClosed);
                resolve();
            }
        };
        window.addEventListener('message', handleMessage);
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                window.removeEventListener('message', handleMessage);
                clearInterval(checkClosed);
                reject(new Error('Popup closed by user'));
            }
        }, 500);
    });
}
