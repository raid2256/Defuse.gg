export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Please send a GET request.' });
  }

  try {
    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) {
      return res.status(500).json({ 
        error: 'Database configuration missing. Connect Vercel KV / Upstash Redis in your Vercel Dashboard.' 
      });
    }

    const keysResponse = await fetch(`${kvUrl}/keys/players:*`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });

    if (!keysResponse.ok) {
      throw new Error('Failed to query database keys');
    }

    const keysData = await keysResponse.json();
    const keys = keysData.result || [];

    const playersList = [];

    for (const key of keys) {
      const playerResponse = await fetch(`${kvUrl}/get/${key}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const playerData = await playerResponse.json();

      if (playerData.result) {
        const parsed = typeof playerData.result === 'string' ? JSON.parse(playerData.result) : playerData.result;
        playersList.push(parsed);
      }
    }

    playersList.sort((a, b) => b.kills - a.kills);

    return res.status(200).json({
      success: true,
      count: playersList.length,
      leaderboard: playersList
    });

  } catch (error) {
    console.error('Fetch Stats Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve leaderboard stats' });
  }
}
