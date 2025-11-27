// spotify_auth.js
// PKCE-based Spotify auth helper. Use dynamic redirectUri from the page.

// Globals available to pages that include this file:
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
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
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

// --- Start login (page must pass redirectUri string) ---
async function loginToSpotify(redirectUri) {
  if (!redirectUri) throw new Error('redirectUri required');

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

  // Redirect to Spotify login/consent
  window.location.href = authUrl;
}

// --- Handle redirect (page must pass redirectUri string) ---
// Call from page load: await handleRedirect(redirectUri);
async function handleRedirect(redirectUri) {
  if (!redirectUri) throw new Error('redirectUri required');

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return; // nothing to do

  const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
  if (!codeVerifier) {
    console.error("Missing code verifier (sessionStorage)");
    return;
  }

  // Build form data
  const formData = new FormData();
  formData.append("code", code);
  formData.append("code_verifier", codeVerifier);
  formData.append("redirect_uri", redirectUri);

  // POST to server-side token exchange
  const resp = await fetch("spotify_token_exchange.php", {
    method: "POST",
    body: formData
  });

  const data = await resp.json();

  if (data.error) {
    console.error("Failed to get tokens:", data);
    return;
  }

  // Save tokens (sessionStorage keeps them for reloads within this tab)
  accessToken = data.access_token || '';
  refreshToken = data.refresh_token || '';
  expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);

  sessionStorage.setItem('spotify_access_token', accessToken);
  if (refreshToken) sessionStorage.setItem('spotify_refresh_token', refreshToken);
  sessionStorage.setItem('spotify_expires_at', expiresAt.toString());

  // Schedule refresh ~1 minute before expiry
  setTimeout(refreshAccessToken, ((data.expires_in || 3600) - 60) * 1000);

  // Clean the URL (remove code and state)
  window.history.replaceState({}, document.title, redirectUri);
}

// --- Refresh token ---
async function refreshAccessToken() {
  // load from storage if page reloaded
  if (!refreshToken) refreshToken = sessionStorage.getItem('spotify_refresh_token') || '';

  if (!refreshToken) {
    console.error('No refresh token available.');
    return;
  }

  const formData = new FormData();
  formData.append('refresh_token', refreshToken);

  const resp = await fetch('spotify_token_exchange.php', {
    method: 'POST',
    body: formData
  });

  const data = await resp.json();
  if (data.error) {
    console.error('Failed to refresh token:', data);
    return;
  }

  accessToken = data.access_token || '';
  expiresAt = Date.now() + ((data.expires_in || 3600) * 1000);
  sessionStorage.setItem('spotify_access_token', accessToken);
  sessionStorage.setItem('spotify_expires_at', expiresAt.toString());

  // Spotify may or may not return a new refresh_token; if it does, update
  if (data.refresh_token) {
    refreshToken = data.refresh_token;
    sessionStorage.setItem('spotify_refresh_token', refreshToken);
  }

  // Schedule next refresh
  setTimeout(refreshAccessToken, ((data.expires_in || 3600) - 60) * 1000);
  console.log('Spotify token refreshed');
}

// --- Utility to get valid access token (throws if not logged in) ---
function ensureAccessToken() {
  // load from sessionStorage if needed
  if (!accessToken) {
    accessToken = sessionStorage.getItem('spotify_access_token') || '';
    const storedExpires = parseInt(sessionStorage.getItem('spotify_expires_at') || '0', 10);
    if (storedExpires && Date.now() > storedExpires) {
      // token expired — attempt refresh synchronously? we'll throw and let caller handle
      throw new Error('access_token_expired');
    }
  }

  if (!accessToken) throw new Error('Spotify not logged in');

  return accessToken;
}

// Optional convenience: logout (clears session storage)
function spotifyLogout() {
  accessToken = '';
  refreshToken = '';
  expiresAt = 0;
  sessionStorage.removeItem('spotify_access_token');
  sessionStorage.removeItem('spotify_refresh_token');
  sessionStorage.removeItem('spotify_expires_at');
  sessionStorage.removeItem('spotify_code_verifier');
}
