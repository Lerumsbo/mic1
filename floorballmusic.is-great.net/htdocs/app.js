const CLIENT_ID = "52ec9869958e47e2898e85242e0f061a";
const REDIRECT_URI = "http://floorballmusic.is-great.net/musicboard.html";
const SCOPES = "user-modify-playback-state user-read-playback-state user-read-private user-read-email user-top-read";
const sectionColors = ['#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090', '#4682B4', '#7B68EE','#5F9EA0', '#6A5ACD', '#708090'];
let accessToken = "";
let availableDevices = [];
let selectedDevice = null;
let displayName = "";
let filenames = ['playlists.json', 'After.json', 'Intro.json', 'Periodpaus.json', 'Warmup.json', 'Pregame.json', 'Mål.json', 'Utvisning.json', 'Publik.json','Pepp.json', 'Spelpauser2.json', 'Heavy.json', 'Spelpauser.json', 'Local.json', 'Hgoal.json', 'Agoal.json'];

// Function to authenticate the user
async function authenticateSpotify() {
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}`;
  window.location.href = authUrl;
}

// Function to get the access token from the URL
function getAccessTokenFromUrl() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
}

// Load data and initialize functions when the page is loaded
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

// Fetch user data from Spotify
async function fetchSpotifyUserData() {
  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const userData = await response.json();
    displayName = userData.display_name || "Unknown User";
    addDisplayNameToHeader();
  } catch (error) {
    console.error("Error fetching user data:", error);
  }
}

// Display the user's display name in the header
function addDisplayNameToHeader() {
  const header = document.createElement('h2');
  header.textContent = displayName;
  header.style.cursor = 'pointer';

  header.addEventListener('click', function() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(accessToken).then(() => {
        alert("Spotify token copied to clipboard!");
      }).catch(() => {
        alert("Failed to copy token to clipboard.");
      });
    } else {
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

// Fetch devices available for playback
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

// Stop playback on the selected device
function stopPlayback() {
  if (selectedDevice) {
    fetch(`https://api.spotify.com/v1/me/player/pause`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      console.error("Error stopping playback:", error);
    });
  }
}

// Load songs and playlists from a folder (Example implementation)
function loadSongsFromFolder() {
  // Example implementation: Load your songs here
}

// Generate random track buttons in the header
function createRandomTrackButtons() {
  const randomButtonsContainer = document.getElementById('random-buttons');
  randomButtonsContainer.innerHTML = '';

  for (let i = 0; i < 5; i++) {
    const button = document.createElement('button');
    button.textContent = `Random Track ${i + 1}`;
    button.classList.add('random-track-btn');
    button.addEventListener('click', function() {
      playRandomTrack();
    });
    randomButtonsContainer.appendChild(button);
  }
}

// Play a random track from the playlist (currently just logs to the console)
function playRandomTrack() {
  console.log("Playing a random track...");
  // Logic to play a random track from your playlist or a predefined track
}

// Function to load and display sections from the playlist files
function loadSectionData(filename) {
  // Logic to load data from a file and display sections
}

// Collapse all sections when the button is clicked
function collapseAllSections() {
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    const content = section.querySelector('.song-list');
    content.style.display = 'none';
  });
}

// Create buttons for each song in the playlist
function createTrackButtons(tracks, sectionName) {
  const section = document.getElementById('sections');
  const sectionElement = document.createElement('section');
  sectionElement.style.backgroundColor = sectionColors[section.childElementCount % sectionColors.length];

  const header = document.createElement('h2');
  header.textContent = sectionName;
  header.style.cursor = 'pointer';
  header.addEventListener('click', function() {
    const content = sectionElement.querySelector('.song-list');
    const displayStyle = content.style.display === 'none' ? 'block' : 'none';
    content.style.display = displayStyle;
  });
  sectionElement.appendChild(header);

  const songList = document.createElement('ul');
  songList.classList.add('song-list');
  sectionElement.appendChild(songList);

  tracks.forEach(track => {
    const listItem = document.createElement('li');
    const button = document.createElement('button');
    button.textContent = track.name;
    button.classList.add('song-button');
    button.addEventListener('click', () => playSong(track));
    listItem.appendChild(button);
    songList.appendChild(listItem);
  });

  section.appendChild(sectionElement);
}

// Play a specific song (add logic to play through Spotify API)
function playSong(track) {
  console.log(`Playing song: ${track.name}`);
  // Logic to play the song using the Spotify API
}

// Function to load data from the selected playlist file
function loadPlaylist(filename) {
  fetch(filename)
    .then(response => response.json())
    .then(data => {
      createTrackButtons(data.tracks, filename);
    })
    .catch(error => console.error("Error loading playlist:", error));
}

// Load all the playlists on initial page load
filenames.forEach(filename => loadPlaylist(filename));

// Display all sections when the button is clicked
function displayAllSections() {
  const sections = document.querySelectorAll('section');
  sections.forEach(section => {
    const content = section.querySelector('.song-list');
    content.style.display = 'block';
  });
}
