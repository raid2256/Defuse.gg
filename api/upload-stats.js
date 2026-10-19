export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  try {
    const payload = req.body || {};
    const player = payload.player || {};
    const provider = payload.provider || {};
    const matchStats = player.match_stats || {};
    const state = player.state || {};

    const steamId = String(player.steamid || provider.steamid || '');
    if (!steamId || steamId === '0' || !player.match_stats) {
      return res.status(200).json({ status: 'ignored', message: 'No active match payload.' });
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) {
      return res.status(500).json({ error: 'Database environment variables missing.' });
    }

    const playerName = String(player.name || 'Casual Player').substring(0, 32).replace(/[<>]/g, '');
    const kills = Math.max(0, parseInt(matchStats.kills, 10) || 0);
    const deaths = Math.max(0, parseInt(matchStats.deaths, 10) || 0);
    const assists = Math.max(0, parseInt(matchStats.assists, 10) || 0);
    const score = Math.max(0, parseInt(matchStats.score, 10) || 0);
    const mvps = Math.max(0, parseInt(matchStats.mvps, 10) || 0);

    const headshots = Math.max(0, parseInt(state.round_killhs || matchStats.headshots || 0, 10));
    const kdRatio = deaths === 0 ? kills : parseFloat((kills / deaths).toFixed(2));
    const hsPercent = kills === 0 ? 0 : Math.min(100, parseFloat(((headshots / kills) * 100).toFixed(1)));

    // Fetch existing profile to append history
    const existingRes = await fetch(`${kvUrl}/get/players:${steamId}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const existingData = await existingRes.json();
    let currentProfile = existingData.result ? (typeof existingData.result === 'string' ? JSON.parse(existingData.result) : existingData.result) : { history: [] };

    const matchSnapshot = {
      map: payload.map?.name || 'Casual Server',
      kills,
      deaths,
      assists,
      kdRatio,
      hsPercent,
      score,
      timestamp: new Date().toISOString()
    };

    const matchHistory = [matchSnapshot, ...(currentProfile.history || [])].slice(0, 10);

    const updatedProfile = {
      steamId,
      playerName,
      kills,
      deaths,
      assists,
      mvps,
      score,
      kdRatio,
      headshots,
      hsPercent,
      history: matchHistory,
      lastUpdated: new Date().toISOString()
    };

    await fetch(`${kvUrl}/set/players:${steamId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedProfile)
    });

    return res.status(200).json({ success: true, player: updatedProfile });

  } catch (error) {
    console.error('API Upload Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
