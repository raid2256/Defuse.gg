let leaderboardData = [];

const RAW_CFG_CONTENT = `"CS2 Global Stat Tracker Integration"
{
    "uri" "https://defusegg.vercel.app/api/upload-stats"
    "timeout" "5.0"
    "buffer"  "0.1"
    "throttle" "2.0"
    "heartbeat" "10.0"
    "auth"
    {
        "token" "CS2_TRACKER_TOKEN_2026"
    }
    "data"
    {
        "provider"              "1"
        "map"                   "1"
        "round"                 "1"
        "player_id"             "1"
        "player_state"          "1"
        "allplayers_id"         "1"
        "allplayers_state"      "1"
        "allplayers_match_stats" "1"
    }
}`;

document.addEventListener('DOMContentLoaded', () => {
  checkClaimedProfile();
  fetchLeaderboard();
  setInterval(fetchLeaderboard, 15000);
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
}

function checkClaimedProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const claimedSteamId = urlParams.get('claimedSteamId');
  if (claimedSteamId) {
    localStorage.setItem('claimedSteamId', claimedSteamId);
    window.history.replaceState({}, document.title, "/");
  }

  const savedSteamId = localStorage.getItem('claimedSteamId');
  if (savedSteamId) {
    document.getElementById('claimedBanner').style.display = 'block';
    document.getElementById('userSteamId').textContent = savedSteamId;
    document.getElementById('steamBtn').style.display = 'none';
  }
}

async function fetchLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');
  try {
    const response = await fetch('/api/get-stats');
    const data = await response.json();

    if (data.success && Array.isArray(data.leaderboard)) {
      leaderboardData = data.leaderboard;
      renderLeaderboard(leaderboardData);
      updateSummaryStats(leaderboardData);
    }
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';

  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-state">No players logged yet. Connect CS2 and play!</td></tr>';
    return;
  }

  const claimedId = localStorage.getItem('claimedSteamId');

  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    const kdColor = player.kdRatio >= 1.0 ? 'var(--green)' : 'var(--red)';

    tr.innerHTML = `
      <td><strong>#${index + 1}</strong></td>
      <td>
        <strong>${escapeHtml(player.playerName)}</strong>
        ${player.steamId === claimedId ? '<span style="color:var(--green); font-size:0.75rem; margin-left:6px;">(YOU)</span>' : ''}
      </td>
      <td>${player.kills}</td>
      <td>${player.deaths}</td>
      <td><span style="color: ${kdColor}">${player.kdRatio}</span></td>
      <td><strong>${player.hsPercent || 0}%</strong></td>
      <td>${player.score || 0}</td>
      <td>
        <button class="btn-view" onclick="openHistory('${player.steamId}')">View</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummaryStats(players) {
  document.getElementById('totalPlayers').textContent = players.length;
  const totalKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);
  document.getElementById('totalKills').textContent = totalKills;
  document.getElementById('topFragger').textContent = players.length > 0 ? players[0].playerName : '-';
}

function filterLeaderboard() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = leaderboardData.filter(player =>
    player.playerName.toLowerCase().includes(query) || player.steamId.includes(query)
  );
  renderLeaderboard(filtered);
}

function downloadConfigFile() {
  const blob = new Blob([RAW_CFG_CONTENT], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gamestate_integration_tracker.cfg';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyConfigCode() {
  navigator.clipboard.writeText(RAW_CFG_CONTENT).then(() => {
    alert('Config code copied to clipboard!');
  });
}

function openHistory(steamId) {
  const player = leaderboardData.find(p => p.steamId === steamId);
  if (!player) return;

  document.getElementById('modalPlayerName').textContent = `${player.playerName}'s Match History`;
  const container = document.getElementById('modalHistoryContent');

  if (!player.history || player.history.length === 0) {
    container.innerHTML = '<p class="loading-state">No recorded matches found.</p>';
  } else {
    container.innerHTML = player.history.map(m => `
      <div class="history-item">
        <span class="map-name">${m.map.replace('de_', '')}</span>
        <div class="stats-inline">
          <span>K/D: <strong>${m.kills}/${m.deaths}</strong></span> | 
          <span>HS: <strong>${m.hsPercent}%</strong></span> | 
          <span>Score: <strong>${m.score}</strong></span>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('historyModal').style.display = 'block';
}

function closeModal() {
  document.getElementById('historyModal').style.display = 'none';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
