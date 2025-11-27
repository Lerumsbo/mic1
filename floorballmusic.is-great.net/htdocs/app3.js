const CLIENT_ID = "52ec9869958e47e2898e85242e0f061a";
const REDIRECT_URI = "https://floorballmusic.is-great.net/musicboard.html";
const SCOPES = "user-modify-playback-state user-read-playback-state user-read-private user-read-email user-top-read";
const sectionColors = ['#473b91'];
let accessToken = "";
let availableDevices = [];
let selectedDevice = null;
let displayName = "";

// --- PKCE helpers ---
function generateRandomString(length) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

async function sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(hash);
}

function base64urlencode(a) {
    let str = '';
    const len = a.byteLength;
    for (let i = 0; i < len; i++) {
        str += String.fromCharCode(a[i]);
    }
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
    const hashed = await sha256(verifier);
    return base64urlencode(hashed);
}
// --- End PKCE helpers ---

window.onload = async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");

    if (code) {
        await exchangeCodeForToken(code);
    } else if (!accessToken) {
        await authenticateSpotify();
    }

    if (accessToken) {
        fetchSpotifyUserData();
        createRandomTrackButtons();
        loadSongsFromFolder();
        fetchSpotifyDevices();
    }
};

async function authenticateSpotify() {
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('code_verifier', codeVerifier);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
    window.location.href = authUrl;
}

async function exchangeCodeForToken(code) {
    const codeVerifier = sessionStorage.getItem('code_verifier');
    if (!codeVerifier) {
        console.error("Missing code verifier.");
        return;
    }

    try {
        const response = await fetch('spotify_token_exchange.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code: code,
                code_verifier: codeVerifier,
                redirect_uri: REDIRECT_URI
            })
        });
        const data = await response.json();
        if (data.access_token) {
            accessToken = data.access_token;
            window.history.replaceState({}, document.title, REDIRECT_URI);
        } else {
            console.error("Failed to get access token:", data);
        }
    } catch (error) {
        console.error("Error exchanging code for token:", error);
    }
}

// --- Spotify user and device functions ---
async function fetchSpotifyUserData() {
    try {
        const response = await fetch("https://api.spotify.com/v1/me", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const userData = await response.json();
        displayName = userData.display_name || "Unknown User";
        addDisplayNameToHeader();
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
}

function addDisplayNameToHeader() {
    const header = document.createElement('h4');
    header.textContent = displayName;
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(accessToken).then(() => alert("Spotify token copied!"));
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = accessToken;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert("Spotify token copied!");
        }
    });
    document.getElementById('status').appendChild(header);
}

async function fetchSpotifyDevices() {
    try {
        const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await response.json();
        availableDevices = data.devices || [];
        const deviceSelect = document.getElementById("deviceSelect");
        deviceSelect.innerHTML = "";
        availableDevices.forEach(device => {
            const option = document.createElement("option");
            option.value = device.id;
            option.textContent = device.name;
            deviceSelect.appendChild(option);
        });
        selectedDevice = availableDevices.length > 0 ? availableDevices[0].id : null;
        deviceSelect.addEventListener('change', () => { selectedDevice = deviceSelect.value; });
    } catch (error) {
        console.error("Error fetching devices:", error);
    }
}

// --- File and track loading ---
async function loadFilenames(dir) {
  const res = await fetch(`getFileList.php?dir=${encodeURIComponent(dir)}`);
  if (!res.ok) throw new Error('Failed to load file list');
  return await res.json();
}

const filenames = ['playlists.json', 'After.json', 'Intro.json', 'Periodpaus.json', 'Warmup.json', 'Pregame.json', 'Goal.json', 'Spelpauser2.json', 'Spelpauser.json', 'Local.json', 'Heavy.json', 'Utvisning.json', 'Publik.json', 'GameEvents.json', 'Hgoal.json', 'Agoal.json'];

async function loadSongsFromFolder() {
    document.getElementById('sections').innerHTML = "";
    for (const [index, filename] of filenames.entries()) {
        const fileUrl = `/tracks/${filename}`;
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) continue;
            const json = await response.json();
            if (!json) continue;

            if (json.tracks && filename != 'Hgoal.json' && filename != 'Agoal.json') {
                createSection(json.tracks, filename.split('.')[0], sectionColors[index % sectionColors.length]);
            }
            if (json.playlists) {
                createPlaylistSection(json.playlists, 'Spellistor', '#FFD700');
            }
        } catch (error) {
            console.error(`Fel vid inläsning av ${filename}:`, error);
        }
    }
}

function truncateText(text, maxLength) {
    return text.length > maxLength+3 ? text.slice(0, maxLength) + '…' : text;
}

function createSection(tracks, sectionName, color) {
    const sectionElement = document.createElement('section');
    const header = document.createElement('h2');
    header.textContent = sectionName;
    sectionElement.appendChild(header);

    const content = document.createElement('div');
    content.classList.add('song-list');
    content.style.display = "none";

    tracks.forEach(track => {
        const button = document.createElement('button');
        button.style.backgroundColor = color;
        button.textContent = `${truncateText(track.title || 'Unknown Title', 18)}\n${truncateText(track.artist || 'Unknown Artist', 18)}\n${formatTime(track.starttime || 0)}`;
        button.onclick = function (event) {
            button.style.borderColor = 'red';
            playTrack(event, track);
        };
        content.appendChild(button);
    });

    sectionElement.appendChild(content);
    document.getElementById('sections').prepend(sectionElement);

    header.addEventListener('click', () => {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
}

function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
}

function playTrack(event, track) {
    const { spotifyURI, starttime } = track;
    if (!spotifyURI) {
        console.error("Ingen URI tillgänglig för spår:", track);
        return;
    }
    if (spotifyURI.startsWith("spotify:")) {
        playSpotifyTrack(spotifyURI, starttime);
    } else if (spotifyURI.endsWith('.mp3')) {
        playLocalTrack(event, spotifyURI);
    } else {
        console.error("Okänt format:", spotifyURI);
    }
}

// --- Playlist section ---
function createPlaylistSection(playlists, sectionName, color) {
    const sectionElement = document.createElement('section');
    const header = document.createElement('h2');
    header.textContent = sectionName;
    sectionElement.appendChild(header);

    const content = document.createElement('div');
    content.classList.add('song-list');
    content.style.display = "none";

    playlists.forEach(playlist => {
        const button = document.createElement('button');
        button.style.backgroundColor = color || '#000';
        button.textContent = playlist.name || 'Unknown Playlist';
        if (playlist.spotifyURI) {
            button.onclick = () => playPlaylist(playlist.spotifyURI);
        }
        content.appendChild(button);
    });

    sectionElement.appendChild(content);
    document.getElementById('sections').prepend(sectionElement);

    header.addEventListener('click', () => {
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
}

// --- Random track buttons ---
function createRandomTrackButtons() {
    const header = document.querySelector('.random-buttons');
    const goalheader = document.querySelector('.goal-buttons');

    filenames.forEach((filename) => {
        if (['playlists.json','Local.json','After.json','Intro.json','Pregame.json'].includes(filename)) return;

        const button = document.createElement('button');
        button.textContent = filename.split('.')[0];
        button.onclick = (event) => { loadAndPlayRandomTrack(event, filename); };

        if (filename === 'Hgoal.json') {
            button.style.backgroundColor = '#228122';
            button.textContent = 'Hemmamål';
            button.classList.add('random-goal-btn');
            goalheader.appendChild(button);
        } else if (filename === 'Agoal.json') {
            button.style.backgroundColor = '#6f2d2d';
            button.textContent = 'Bortamål';
            button.classList.add('random-goal-btn');
            goalheader.appendChild(button);
        } else {
            button.classList.add('random-track-btn');
            header.appendChild(button);
        }
    });
}

function loadAndPlayRandomTrack(event, filename) {
    fetch(`/tracks/${filename}`)
        .then(res => res.json())
        .then(data => {
            const randomTrack = data.tracks ? data.tracks[Math.floor(Math.random() * data.tracks.length)] : null;
            if (randomTrack) playTrack(event, randomTrack);
        })
        .catch(err => console.error("Error loading random track:", err));
}

// --- Spotify playback ---
function playSpotifyTrack(spotifyURI, starttime) {
    if (!selectedDevice) { alert("No device selected!"); return; }
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [spotifyURI], position_ms: starttime || 0 })
    });
}

function playPlaylist(playlistURI) {
    if (!selectedDevice) { alert("No device selected!"); return; }

    fetch(`https://api.spotify.com/v1/me/player/shuffle?state=true&device_id=${selectedDevice}`, { method: 'PUT', headers: { 'Authorization': `Bearer ${accessToken}` } });

    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ context_uri: playlistURI })
    }).catch(err => console.error('Error playing playlist:', err));
}

// --- Local MP3 playback ---
let currentPlayer = null;
function playLocalTrack(event, filePath) {
    const localUrl = `mp3/${filePath}`;
    if (currentPlayer) {
        currentPlayer.audioElement.pause();
        currentPlayer.audioElement.currentTime = 0;
        currentPlayer.audioElement.src = localUrl;
        currentPlayer.audioElement.play();
        currentPlayer.playPauseButton.textContent = 'Pause';
    } else {
        currentPlayer = { playerDiv: document.createElement('div'), audioElement: document.createElement('audio'), playPauseButton: document.createElement('button') };
        const mouseX = event.clientX, mouseY = event.clientY;
        Object.assign(currentPlayer.playerDiv.style, { position:'fixed', top:`${mouseY}px`, left:`${mouseX}px`, width:'120px', padding:'10px', backgroundColor:'#AAAAAA', borderRadius:'5px', zIndex:1000 });
        currentPlayer.audioElement.src = localUrl;
        currentPlayer.audioElement.autoplay = true;
        currentPlayer.audioElement.controls = false;
        currentPlayer.audioElement.style.width = '100%';
        currentPlayer.playerDiv.appendChild(currentPlayer.audioElement);
        Object.assign(currentPlayer.playPauseButton.style, { backgroundColor:'#2c7', color:'#fff', border:'none', marginTop:'5px' });
        currentPlayer.playPauseButton.textContent = 'Pause';
        currentPlayer.playPauseButton.onclick = () => {
            if (currentPlayer.audioElement.paused) { currentPlayer.audioElement.play(); currentPlayer.playPauseButton.textContent='Pause'; }
            else { currentPlayer.audioElement.pause(); currentPlayer.playPauseButton.textContent='Play'; }
        };
        currentPlayer.playerDiv.appendChild(currentPlayer.playPauseButton);
        const closeButton = document.createElement('button');
        Object.assign(closeButton.style, { backgroundColor:'#A67', color:'#fff', border:'none', position:'absolute', marginTop:'5px', right:'10px' });
        closeButton.textContent = 'Close';
        closeButton.onclick = () => { currentPlayer.audioElement.pause(); currentPlayer.audioElement.currentTime=0; document.body.removeChild(currentPlayer.playerDiv); currentPlayer=null; };
        currentPlayer.playerDiv.appendChild(closeButton);
        document.body.appendChild(currentPlayer.playerDiv);
    }
}

// --- Playback controls ---
function updateStatus(message) { document.getElementById('status').textContent = message; }
function stopPlayback() {
    if (!selectedDevice) { alert("No device selected!"); return; }
    fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${selectedDevice}`, { method:'PUT', headers:{ 'Authorization': `Bearer ${accessToken}` } });
}
