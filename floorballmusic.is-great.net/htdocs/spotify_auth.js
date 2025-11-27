// spotify_auth.js
let accessToken = '';
let refreshToken = '';
let expiresAt = 0;

const clientId = "52ec9869958e47e2898e85242e0f061a";
const scopes = [
    "user-read-private",
    "user-read-email",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-top-read"
];

// --- PKCE helpers ---
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hashBuffer);
}

function base64UrlEncode(arrayBuffer) {
    let str = '';
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Start login (dynamic redirectUri) ---
async function loginToSpotify(redirectUri) {
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(hashed);

    const authUrl =
        "https://accounts.spotify.com/authorize?" +
        new URLSearchParams({
            response_type: "code",
            client_id: clientId,
            scope: scopes.join(" "),
            redirect_uri: redirectUri,
            code_challenge_method: "S256",
            code_challenge: codeChallenge
        });

    window.location.href = authUrl;
}

// --- Handle redirect (dynamic redirectUri) ---
async function handleRedirect(redirectUri) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return;

    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
        console.error("Missing code verifier");
        return;
    }

    const formData = new FormData();
    formData.append("code", code);
    formData.append("code_verifier", codeVerifier);

    const response = await fetch("spotify_auth.php", {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.error) {
        console.error("Failed to get tokens:", data);
        return;
    }

    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    expiresAt = Date.now() + data.expires_in * 1000;

    console.log("Spotify login successful", accessToken);

    // Auto refresh 1 min before expiry
    setTimeout(refreshAccessToken, (data.expires_in - 60) * 1000);

    // Clean URL
    window.history.replaceState({}, document.title, redirectUri);
}

async function refreshAccessToken() {
    if (!refreshToken) return;

    const formData = new FormData();
    formData.append("refresh_token", refreshToken);

    const response = await fetch("spotify_auth.php", {
        method: "POST",
        body: formData
    });

    const data = await response.json();
    if (data.error) {
        console.error("Failed to refresh token:", data);
        return;
    }

    accessToken = data.access_token;
    expiresAt = Date.now() + data.expires_in * 1000;

    console.log("Spotify token refreshed", accessToken);

    setTimeout(refreshAccessToken, (data.expires_in - 60) * 1000);
}

// --- Utility to check login ---
function ensureAccessToken() {
    if (!accessToken) throw new Error("Spotify not logged in");
    return accessToken;
}
