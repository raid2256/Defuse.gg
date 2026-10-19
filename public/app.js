let leaderboardData = [];

document.addEventListener('DOMContentLoaded', () => {
  fetchLeaderboard();
  setInterval(fetchLeaderboard, 15000);
});

function switchTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(tabId).classList.add('active');
  event.target.classList.add('active');
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
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="loading">No player stats recorded yet. Launch CS2 and play a round!</td></tr>';
    }
  } catch (error) {
    console.error('Leaderboard Fetch Error:', error);
    tbody.innerHTML = '<tr><td colspan="7" class="loading">Unable to connect to leaderboard backend. Check database connection.</td></tr>';
  }
}

function renderLeaderboard(players) {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';

  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading">No players found matching your search.</td></tr>';
    return;
  }

  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    const kdColor = player.kdRatio >= 1.0 ? 'var(--green)' : 'var(--red)';

    tr.innerHTML = `
      <td><strong>#${index + 1}</strong></td>
      <td><strong>${escapeHtml(player.playerName)}</strong></td>
      <td>${player.kills}</td>
      <td>${player.deaths}</td>
      <td>${player.assists || 0}</td>
      <td><span style="color: ${kdColor}">${player.kdRatio}</span></td>
      <td>${player.score || 0}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSummaryStats(players) {
  document.getElementById('totalPlayers').textContent = players.length;

  const totalKills = players.reduce((sum, p) => sum + (p.kills || 0), 0);
  document.getElementById('totalKills').textContent = totalKills;

  if (players.length > 0) {
    document.getElementById('topFragger').textContent = players[0].playerName;
  } else {
    document.getElementById('topFragger').textContent = '-';
  }
}

function filterLeaderboard() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const filtered = leaderboardData.filter(player =>
    player.playerName.toLowerCase().includes(query) ||
    player.steamId.includes(query)
  );
  renderLeaderboard(filtered);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.innerText = text;
  return div.innerHTML;
}
