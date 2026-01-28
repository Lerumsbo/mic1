(function () {
  const shortcuts = {
    m: { uri: "spotify:track:5O6JuXxnhwG3W5YClY2mEb", start: 46700 },
    s: { uri: "spotify:track:10AwlsmVEASSiWORkKcgRo", start: 73467 },
    t: { uri: "spotify:track:6MWkewqqntx7y6AyOqEoXM", start: 67009 },
    c: { uri: "spotify:track:1AfdWCYXaJHzHWsgGVkjhe", start: 47000 }
  };

  document.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    if (["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;

    const key = e.key.toLowerCase();
    if (!shortcuts[key]) return;

    playSpotifyTrack(shortcuts[key].uri, shortcuts[key].start);
  });
})();
