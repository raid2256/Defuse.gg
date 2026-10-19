let leaderboardData = [];

document.addEventListener('DOMContentLoaded', () => {
  checkClaimedProfile();
  fetchLeaderboard();
  setInterval(fetchLeaderboard, 15000);
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

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
    console.error('Error:', error);
  }
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';

  const claimedId = localStorage.getItem('claimedSteamId');

  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    if (claimedId && player.steamId === claimedId) {
      tr.classList.add('claimed-row');
    }

    const kdColor = player.kdRatio >= 1.0 ? 'var(--green)' : 'var(--red)';

    tr.innerHTML = `
      <td><strong>#${index + 1}</strong></td>
      <td>
        <strong>${escapeHtml(player.playerName)}</strong>
        ${player.steamId === claimedId ? '<span class="verified-tag">YOU</span>' : ''}
      </td>
      <td>${player.kills}</td>
      <td>${player.deaths}</td>
      <td><span style="color: ${kdColor}">${player.kdRatio}</span></td>
      <td><strong>${player.hsPercent || 0}%</strong></td>
      <td>${player.score || 0}</td>
      <td>
        <button class="view-btn" onclick="openHistory('${player.steamId}')">View Matches</button>
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

function openHistory(steamId) {
  const player = leaderboardData.find(p => p.steamId === steamId);
  if (!player) return;

  document.getElementById('modalPlayerName').textContent = `${player.playerName}'s Match Snapshots`;
  const container = document.getElementById('modalHistoryContent');

  if (!player.history || player.history.length === 0) {
    container.innerHTML = '<p class="loading">No match history recorded yet.</p>';
  } else {
    container.innerHTML = player.history.map(m => `
      <div class="history-card">
        <div class="history-map">${m.map.replace('de_', '').toUpperCase()}</div>
        <div class="history-stats">
          <span>K/D: <strong>${m.kills}/${m.deaths}</strong> (${m.kdRatio})</span>
          <span>HS%: <strong>${m.hsPercent}%</strong></span>
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
