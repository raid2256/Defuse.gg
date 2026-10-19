function handleKeyPress(event) {
  if (event.key === 'Enter') {
    fetchPlayerStats();
  }
}

async function fetchPlayerStats() {
  const query = document.getElementById('steamInput').value.trim();
  const errorBanner = document.getElementById('errorMessage');
  const dashboard = document.getElementById('dashboard');

  errorBanner.style.display = 'none';

  if (!query) {
    showError('Please enter a valid 17-digit SteamID64.');
    return;
  }

  try {
    const response = await fetch(`/api/get-player-stats?query=${encodeURIComponent(query)}`);
    const data = await response.json();

    if (!data.success) {
      showError(data.error || 'Failed to fetch player stats.');
      dashboard.style.display = 'none';
      return;
    }

    renderDashboard(data.player);
  } catch (err) {
    console.error('Lookup Error:', err);
    showError('Unable to connect to the server.');
  }
}

function renderDashboard(player) {
  const dashboard = document.getElementById('dashboard');
  const stats = player.stats || {};

  // Profile Header
  document.getElementById('playerAvatar').src = player.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';
  document.getElementById('playerName').textContent = player.personaName || 'Unknown Player';
  document.getElementById('steamIdDisplay').textContent = `SteamID: ${player.steamId}`;
  document.getElementById('profileLink').href = player.profileUrl || '#';

  // Safe Metric Rendering (Handles strings and missing values without crashing)
  const kdVal = parseFloat(stats.kdRatio) || 1.0;
  const kdElem = document.getElementById('kdRatio');
  kdElem.textContent = stats.kdRatio || 'N/A';
  kdElem.style.color = kdVal >= 1.0 ? 'var(--green)' : 'var(--red)';

  document.getElementById('hsPercent').textContent = stats.hsPercent || 'N/A';
  document.getElementById('totalKills').textContent = stats.kills || 'N/A';
  document.getElementById('winRate').textContent = stats.winRate || 'N/A';
  document.getElementById('hltvRating').textContent = stats.rating || 'N/A';

  dashboard.style.display = 'flex';
}

function showError(msg) {
  const errorBanner = document.getElementById('errorMessage');
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}
