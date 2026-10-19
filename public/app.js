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
    showError('Please enter a valid SteamID64 or profile link.');
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
    showError('Unable to connect to Steam server.');
  }
}

function renderDashboard(player) {
  const dashboard = document.getElementById('dashboard');
  const stats = player.stats;

  // Render Header
  document.getElementById('playerAvatar').src = player.avatar;
  document.getElementById('playerName').textContent = player.personaName;
  document.getElementById('steamIdDisplay').textContent = `SteamID: ${player.steamId}`;
  document.getElementById('profileLink').href = player.profileUrl;

  // Render Metrics
  const kdElem = document.getElementById('kdRatio');
  kdElem.textContent = stats.kdRatio;
  kdElem.style.color = stats.kdRatio >= 1.0 ? 'var(--green)' : 'var(--red)';

  document.getElementById('hsPercent').textContent = `${stats.hsPercent}%`;
  document.getElementById('totalKills').textContent = stats.kills.toLocaleString();
  document.getElementById('totalDeaths').textContent = stats.deaths.toLocaleString();
  document.getElementById('hoursPlayed').textContent = stats.hoursPlayed;
  document.getElementById('totalMvps').textContent = stats.mvps.toLocaleString();

  // Render Weapon Cards
  const weaponsGrid = document.getElementById('weaponsGrid');
  weaponsGrid.innerHTML = stats.weapons.map(w => `
    <div class="weapon-card">
      <span class="weapon-name">${w.name}</span>
      <span class="weapon-kills">${w.kills.toLocaleString()} Kills</span>
    </div>
  `).join('');

  dashboard.style.display = 'flex';
}

function showError(msg) {
  const errorBanner = document.getElementById('errorMessage');
  errorBanner.textContent = msg;
  errorBanner.style.display = 'block';
}
