const CLIENT_ID = "52ec9869958e47e2898e85242e0f061a";
const REDIRECT_URI = "http://floorballmusic.is-great.net/musicboard.html";
const SCOPES = "user-modify-playback-state user-read-playback-state user-read-private user-read-email user-top-read";
const sectionColors = ['#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090'];
let accessToken = "";
let availableDevices = [];
let selectedDevice = null;
let displayName = "";

const filenames = ['playlists.json', 'After.json', 'Intro.json', 'Periodpaus.json', 'Warmup.json', 'Pregame.json', 'Mål.json', 'Utvisning.json', 'Publik.json','Pepp.json', 'Spelpauser2.json', 'Heavy.json', 'Spelpauser.json', 'Local.json', 'Hgoal.json', 'Agoal.json'];


window.onload = function () {
const token = getAccessTokenFromUrl();
if (token) {
    accessToken = token;
    fetchSpotifyUserData(); // Fetch and display Spotify user info
    createRandomTrackButtons();  // Add random track buttons to header
    loadSongsFromFolder();
    fetchSpotifyDevices();
  }
else {
  authenticateSpotify()
}
};


async function authenticateSpotify() {
const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
window.location.href = authUrl;
}

function getAccessTokenFromUrl() {
const hash = window.location.hash.substring(1);
const params = new URLSearchParams(hash);
return params.get("access_token");
}

async function fetchSpotifyUserData() {
try {
const response = await fetch("https://api.spotify.com/v1/me", {
    headers: {
    'Authorization': `Bearer ${accessToken}`
    }
});
const userData = await response.json();
displayName = userData.display_name || "Unknown User";
//updateStatus(`Inloggning lyckades! Welcome, ${displayName}`);
addDisplayNameToHeader();
} catch (error) {
    console.error("Error fetching user data:", error);
}
}

function addDisplayNameToHeader() {
const header = document.createElement('h2');
header.textContent = displayName;
header.style.cursor = 'pointer';

header.addEventListener('click', function() {
// Check if Clipboard API is available
if (navigator.clipboard && navigator.clipboard.writeText) {
  navigator.clipboard.writeText(accessToken).then(() => {
    alert("Spotify token copied to clipboard!");
  }).catch(() => {
    alert("Failed to copy token to clipboard.");
  });
} else {
  // Fallback to document.execCommand if Clipboard API isn't available
  const textArea = document.createElement('textarea');
  textArea.value = accessToken;
  document.body.appendChild(textArea);
  textArea.select();
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      alert("Spotify token copied to clipboard!");
    } else {
      alert("Failed to copy token to clipboard.");
    }
  } catch (err) {
    alert("Error copying to clipboard.");
  }
  document.body.removeChild(textArea);
}
});

document.getElementById('status').appendChild(header);
}

async function fetchSpotifyDevices() {
try {
const response = await fetch("https://api.spotify.com/v1/me/player/devices", {
    headers: {
    'Authorization': `Bearer ${accessToken}`
    }
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

deviceSelect.addEventListener('change', function() {
    selectedDevice = deviceSelect.value;
});
} catch (error) {
console.error("Error fetching devices:", error);
}
}

function formatTime(ms) {
const minutes = Math.floor(ms / 60000);
const seconds = Math.floor((ms % 60000) / 1000);
return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function collapseAllSections() {
const sections = document.querySelectorAll(".song-list");
sections.forEach(section => {
section.style.display = "none";
});
}

async function loadSongsFromFolder() {
    document.getElementById('sections').innerHTML = "";
  
    for (const [index, filename] of filenames.entries()) {
      const fileUrl = `/tracks/${filename}`;
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) continue;
        const json = await response.json();
        if (!json) continue;
  
        if  (json.tracks && filename !='Hgoal.json' && filename !='Agoal.json') {
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
      button.textContent = `${track.title || 'Unknown Title'}\n${track.artist || 'Unknown Artist'}`;
      button.onclick = function () {
        button.style.borderColor = 'red';
        playTrack(track);
      }
      content.appendChild(button);
    });
  
    sectionElement.appendChild(content);
    document.getElementById('sections').prepend(sectionElement);
  
    header.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
  }

  function playTrack(track) {
    const { spotifyURI, starttime } = track;
  
    if (!spotifyURI) {
      console.error("Ingen URI tillgänglig för spår:", track);
      return;
    }
  
    if (spotifyURI.startsWith("spotify:")) {
      playSpotifyTrack(spotifyURI, starttime);
    } else if (spotifyURI.endsWith('.mp3')) {
      playLocalTrack(spotifyURI);
    } else {
      console.error("Okänt format:", spotifyURI);
    }
  }

function createPlaylistSection(playlists, sectionName, color) {
  const sectionElement = document.createElement('section');
  const header = document.createElement('h2');
  header.textContent = sectionName;
  sectionElement.appendChild(header);

  const content = document.createElement('div');
  content.classList.add('song-list');
  content.style.display = "none";

  playlists.forEach(playlist => {
    const { spotifyURI, name } = playlist;

    const button = document.createElement('button');
    button.style.backgroundColor = color;
    button.textContent = name || 'Unknown Playlist';

    if (spotifyURI) {
      button.onclick = function () {
        playPlaylist(spotifyURI);
      };
    }

    content.appendChild(button);
  });

  sectionElement.appendChild(content);
  document.getElementById('sections').prepend(sectionElement);

  header.addEventListener('click', function () {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });
}

  
let currentPlayer = null; // Håller reda på aktuell spelare

function playLocalTrack(filePath) {
    const localUrl = `/tracks/${filePath}`;

    // Om spelaren redan finns, byt ljudkälla och spela
    if (currentPlayer) {
        currentPlayer.audioElement.pause();
        currentPlayer.audioElement.currentTime = 0;
        currentPlayer.audioElement.src = localUrl;
        currentPlayer.audioElement.play();

        // Uppdatera play/pause-knappen
        currentPlayer.playPauseButton.textContent = 'Pause';
    } else {
        // Skapa en ny spelare om ingen finns
        currentPlayer = {
            playerDiv: document.createElement('div'),
            audioElement: document.createElement('audio'),
            playPauseButton: document.createElement('button')
        };

        // Styla spelaren
        Object.assign(currentPlayer.playerDiv.style, {
            position: 'absolute',
            top: '220px',
            left: '10px',
            width: '120px',
            padding: '10px',
            backgroundColor: '#AAAAAA',
            borderRadius: '5px',
            zIndex: 1000
        });

        // Lägg till ljudet
        currentPlayer.audioElement.src = localUrl;
        currentPlayer.audioElement.autoplay = true;
        currentPlayer.audioElement.controls = false; // Ingen standardkontroll
        currentPlayer.audioElement.style.width = '100%';
        currentPlayer.playerDiv.appendChild(currentPlayer.audioElement);

        // Play/Pause-knapp
        Object.assign(currentPlayer.playPauseButton.style, {
            backgroundColor: '#2c7',
            color: '#fff',
            border: 'none',
            marginTop: '5px'
        });
        currentPlayer.playPauseButton.textContent = 'Pause';
        currentPlayer.playPauseButton.onclick = function () {
            if (currentPlayer.audioElement.paused) {
                currentPlayer.audioElement.play();
                currentPlayer.playPauseButton.textContent = 'Pause';
            } else {
                currentPlayer.audioElement.pause();
                currentPlayer.playPauseButton.textContent = 'Play';
            }
        };
        currentPlayer.playerDiv.appendChild(currentPlayer.playPauseButton);

        // Stäng-knapp
        const closeButton = document.createElement('button');
        Object.assign(closeButton.style, {
            backgroundColor: '#A67',
            color: '#fff',
            border: 'none',
            position: 'absolute',
            marginTop: '5px',
            right: '10px'
        });
        closeButton.textContent = 'Close';
        closeButton.onclick = function () {
            currentPlayer.audioElement.pause();
            currentPlayer.audioElement.currentTime = 0;
            document.body.removeChild(currentPlayer.playerDiv);
            currentPlayer = null; // Återställ
        };
        currentPlayer.playerDiv.appendChild(closeButton);

        // Lägg till spelaren på sidan
        document.body.appendChild(currentPlayer.playerDiv);
    }
}

  
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
      button.style.backgroundColor = '#000';
      button.textContent = playlist.name || 'Unknown Playlist';
      button.onclick = () => playPlaylist(playlist.spotifyURI);
      content.appendChild(button);
    });
  
    sectionElement.appendChild(content);
    document.getElementById('sections').prepend(sectionElement);
  
    header.addEventListener('click', function () {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
  }

function createRandomTrackButtons() {
  const header = document.querySelector('.random-buttons');

  filenames.forEach((filename) => {
     if (filename === 'playlists.json' || filename === 'Local.json'|| filename === 'After.json' || filename === 'Intro.json' || filename === 'Pregame.json') {
        // Skip creating a random button for these
        return;
    }
    
    const button = document.createElement('button');
    button.textContent = filename.split('.')[0];
    if (filename === 'Hgoal.json') {
      button.style.backgroundColor = '#0A0';
      button.textContent ='Hemmamål'
    }
    if (filename === 'Agoal.json') {
      button.style.backgroundColor = '#A00';
      button.textContent ='Bortamål'
    }
    button.classList.add('random-track-btn');
    button.onclick = () => loadAndPlayRandomTrack(filename);
    header.appendChild(button);
  });
}

function loadAndPlayRandomTrack(filename) {
    fetch(`/tracks/${filename}`)
        .then(response => response.json())
        .then(data => {
            const randomTrack = data.tracks ? data.tracks[Math.floor(Math.random() * data.tracks.length)] : null;
            if (randomTrack) {
                playTrack(randomTrack); // Use the unified playTrack function
            }
        })
        .catch(err => console.error("Error loading random track:", err));
}


function playSpotifyTrack(spotifyURI, starttime) {
  if (!selectedDevice) {
    alert("No device selected!");
    return;
  }
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: [spotifyURI],
      position_ms: starttime || 0
    })
  });
}

function playPlaylist(playlistURI) {
  if (!selectedDevice) {
    alert("No device selected!");
    return;
  }
  console.log(`Now playing playlist: ${playlistURI}`);
  fetch(`https://api.spotify.com/v1/me/player/play?device_id=${selectedDevice}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ context_uri: playlistURI })
  })
  .catch(error => {
    console.error('Error playing playlist:', error);
  });
}

function updateStatus(message) {
  document.getElementById('status').textContent = message;
}

function stopPlayback() {
  if (!selectedDevice) {
    alert("No device selected!");
    return;
  }
  fetch(`https://api.spotify.com/v1/me/player/pause?device_id=${selectedDevice}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
}

