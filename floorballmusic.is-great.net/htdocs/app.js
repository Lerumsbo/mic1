const CLIENT_ID = "52ec9869958e47e2898e85242e0f061a";
const REDIRECT_URI = "https://floorballmusic.is-great.net/musicboard.html";
const SCOPES = "user-modify-playback-state user-read-playback-state user-read-private user-read-email user-top-read";
const sectionColors = ['#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090'];
let accessToken = "";
let availableDevices = [];
let selectedDevice = null;
let displayName = "";

const filenames = ['playlists.json', 'After.json', 'Intro.json', 'Periodpaus.json', 'Warmup.json', 'Pregame.json', 'Mål.json', 'Utvisning.json', 'Publik.json','GameEvents.json', 'Spelpauser2.json', 'Heavy.json', 'Spelpauser.json', 'Local.json', 'Hgoal.json', 'Agoal.json'];

async function authenticateSpotify() {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
  window.location.href = authUrl;
}

function getAccessTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

window.onload = function () {
  createRandomTrackButtons();  // Add random track buttons to header
  loadSongsFromFolder();
  const token = getAccessTokenFromUrl();
  if (token) {
    accessToken = token;
//        updateStatus("Inloggning lyckades!");
    fetchSpotifyUserData(); // Fetch and display Spotify user info
  }
  fetchSpotifyDevices();
};

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
  document.getElementById('file-buttons').innerHTML = "";  // Reset file buttons

  try {
    for (const [index, filename] of filenames.entries()) {
      const fileUrl = `/tracks/${filename}`;
      const response = await fetch(fileUrl);

      if (!response.ok) {
        console.error(`Kunde inte ladda filen: ${filename}`);
        continue;
      }

      let json;
      try {
        const text = await response.text();
        json = JSON.parse(text);
      } catch (error) {
        console.error(`Ogiltig JSON i filen: ${filename}`, error);
        continue;
      }

      if (!json) {
        console.error(`Ogiltigt innehåll i filen: ${filename}`);
        continue;
      }

      if (json.tracks && filename !='Hgoal.json' && filename !='Agoal.json') {
        createSection(json.tracks, filename.split('.')[0], sectionColors[index]);
      }

      if (json.playlists) {
        createPlaylistSection(json.playlists, 'Spellistor', '#FFD700');
      }

      if (filename === 'Local.json' && json.local) {
        createSection(json.local, 'Lokala Låtar', '#32CD32');
        createLocalFileButton(json.local);
      }
    }
    
  } catch (error) {
    updateStatus("Fel vid inläsning av filer.");
    console.error("Laddningsfel:", error);
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
    const { spotifyURI, artist, title, starttime } = track;

    const button = document.createElement('button');
    button.style.backgroundColor = color;
    button.textContent = `${title || 'Unknown Title'}\n${artist || 'Unknown Artist'}\n${formatTime(starttime || 0)}`;

let currentPlayer = null; // Håller reda på den aktuella spelaren

if (spotifyURI) {
if (spotifyURI.startsWith("spotify:")) {
button.onclick = function () {
  button.style.borderColor = 'red';
  playSpotifyTrack(spotifyURI, starttime);
};
} else if (spotifyURI.endsWith('.mp3')) {
const localUrl = `mp3/${spotifyURI}`;
button.onclick = function (event) {
  event.preventDefault();

  // Kontrollera att filen finns på servern
  fetch(localUrl).then(response => {
    if (!response.ok) {
      console.error("Fil kunde inte hittas:", localUrl);
      alert("Filen finns inte.");
      return;
    }

    // Om en spelare redan finns, ersätt ljudkällan och spela den nya filen
    if (currentPlayer) {
      currentPlayer.audioElement.pause(); // Stoppa aktuell fil
      currentPlayer.audioElement.currentTime = 0; // Återställ till början
      currentPlayer.audioElement.src = localUrl; // Uppdatera ljudkällan
      currentPlayer.audioElement.play(); // Börja spela den nya låten

      // Uppdatera play/pause-knappen
      const playPauseButton = currentPlayer.playerDiv.querySelector('button');
      playPauseButton.textContent = 'Pause';
    } else {
      // Om ingen spelare finns, skapa en ny spelare
      currentPlayer = {
        playerDiv: document.createElement('div'),
        audioElement: document.createElement('audio'),
      };

      // Styla spelaren
      currentPlayer.playerDiv.style.position = 'absolute';
      currentPlayer.playerDiv.style.top = '220px'; // Precis under headern
      currentPlayer.playerDiv.style.left = '10px';
      currentPlayer.playerDiv.style.width = '120px';
      currentPlayer.playerDiv.style.padding = '10px';
      currentPlayer.playerDiv.style.backgroundColor = '#AAAAAA';
      currentPlayer.playerDiv.style.borderRadius = '5px';
      currentPlayer.playerDiv.style.zIndex = 1000;

      // Lägg till ljudet
      currentPlayer.audioElement.src = localUrl;
      currentPlayer.audioElement.autoplay = true;
      currentPlayer.audioElement.controls = false; // Ingen standardkontroll
      currentPlayer.audioElement.style.width = '100%';
      currentPlayer.playerDiv.appendChild(currentPlayer.audioElement);

      // Lägg till egna kontroller (play/pause)
      const playPauseButton = document.createElement('button');
      playPauseButton.style.backgroundColor = '#2c7'; // Färg på knappen
      playPauseButton.style.color = '#fff'; // Textfärg (vit text)
      playPauseButton.style.border = 'none'; // Ingen kantlinje
      playPauseButton.textContent = 'Play';
      playPauseButton.style.marginTop = '5px';
      playPauseButton.onclick = function () {
        if (currentPlayer.audioElement.paused) {
          currentPlayer.audioElement.play();
          playPauseButton.textContent = 'Pause';
        } else {
          currentPlayer.audioElement.pause();
          playPauseButton.textContent = 'Play';
        }
      };
      currentPlayer.playerDiv.appendChild(playPauseButton);

      // Lägg till stängknapp
      const closeButton = document.createElement('button');
      closeButton.style.backgroundColor = '#A67'; // Färg på knappen
      closeButton.style.color = '#fff'; // Textfärg (vit text)
      closeButton.style.border = 'none'; // Ingen kantlinje
      closeButton.textContent = 'Close';
      closeButton.style.position = 'absolute';
      closeButton.style.marginTop = '5px';
      closeButton.style.right = '10px';
      closeButton.onclick = function () {
        currentPlayer.audioElement.pause();
        currentPlayer.audioElement.currentTime = 0;
        document.body.removeChild(currentPlayer.playerDiv); // Ta bort spelaren
        currentPlayer = null; // Sätt currentPlayer till null när spelaren stängs
      };
      currentPlayer.playerDiv.appendChild(closeButton);

      // Lägg till spelaren på sidan
      document.body.appendChild(currentPlayer.playerDiv);
    }
  }).catch(error => {
    console.error("Fel vid laddning av filen:", error);
    alert("Det uppstod ett problem med att ladda filen.");
  });
};
}
}







    content.appendChild(button);
  });

  sectionElement.appendChild(content);
  document.getElementById('sections').prepend(sectionElement);

  header.addEventListener('click', function () {
    content.style.display = content.style.display === 'none' ? 'block' : 'none';
  });
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

