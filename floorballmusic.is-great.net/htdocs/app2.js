const CLIENT_ID = "52ec9869958e47e2898e85242e0f061a";
const REDIRECT_URI = "http://floorballmusic.is-great.net/index.html";
const SCOPES = "user-modify-playback-state user-read-playback-state user-read-private user-read-email user-top-read";
const sectionColors = ['#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090'];
let accessToken = "";
let availableDevices = [];
let selectedDevice = null;
let displayName = "";

const filenames = ['playlists.json', 'After.json', 'Intro.json', 'Periodpaus.json', 'Warmup.json', 'Pregame.json', 'Mål.json', 'Utvisning.json', 'Publik.json','Pepp.json', 'Spelpauser2.json', 'Heavy.json', 'Spelpauser.json', 'Local.json', 'Hgoal.json', 'Agoal.json'];


window.onload = function () {
createRandomTrackButtons();  // Add random track buttons to header
loadSongsFromFolder();
const token = getAccessTokenFromUrl();
if (token) {
    accessToken = token;
    fetchSpotifyUserData(); // Fetch and display Spotify user info
}
fetchSpotifyDevices();
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
  
        if (json.tracks) {
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
      button.onclick = () => playTrack(track);
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

  
  function playLocalTrack(filePath) {
    const localUrl = `/tracks/${filePath}`;
    let currentPlayer = document.getElementById('local-audio-player');
  
    if (!currentPlayer) {
      currentPlayer = document.createElement('div');
      currentPlayer.id = 'local-audio-player';
      currentPlayer.style.position = 'absolute';
      currentPlayer.style.top = '220px';
      currentPlayer.style.left = '10px';
      currentPlayer.style.width = '120px';
      currentPlayer.style.padding = '10px';
      currentPlayer.style.backgroundColor = '#AAAAAA';
      currentPlayer.style.borderRadius = '5px';
      currentPlayer.style.zIndex = 1000;
  
      const audioElement = document.createElement('audio');
      audioElement.controls = true;
      audioElement.style.width = '100%';
      currentPlayer.appendChild(audioElement);
  
      const closeButton = document.createElement('button');
      closeButton.textContent = 'Close';
      closeButton.style.backgroundColor = '#A67';
      closeButton.style.color = '#fff';
      closeButton.style.border = 'none';
      closeButton.onclick = function () {
        audioElement.pause();
        document.body.removeChild(currentPlayer);
      };
  
      currentPlayer.appendChild(closeButton);
      document.body.appendChild(currentPlayer);
    }
  
    const audioElement = currentPlayer.querySelector('audio');
    audioElement.src = localUrl;
    audioElement.play();
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
      button.style.backgroundColor = color;
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
    button.classList.add('random-track-btn');
    button.onclick = () => loadAndPlayRandomTrack(filename);
    header.appendChild(button);
  });
}

function loadAndPlayRandomTrack(filename) {
  fetch(`/tracks/${filename}`)
    .then(response => response.json())
    .then(data => {
      if (filename === 'Local.json' || filename === 'Hgoal.json') {
        const randomTrack = data.tracks ? data.tracks[Math.floor(Math.random() * data.tracks.length)] : null;
        if (randomTrack) {
          const localUrl = `/tracks/${randomTrack.spotifyURI}`;
          window.open(localUrl, '_blank');
        }
      } else {
        const randomTrack = data.tracks ? data.tracks[Math.floor(Math.random() * data.tracks.length)] : null;
        if (randomTrack) {
          const { spotifyURI, starttime } = randomTrack;
          if (spotifyURI) {
            playSpotifyTrack(spotifyURI, starttime);
          }
        }
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

