export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please send a POST request.' });
  }

  try {
    const { steamId, playerName, kills, deaths, assists, mvps, score } = req.body || {};

    if (!steamId || typeof steamId !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing steamId' });
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!kvUrl || !kvToken) {
      return res.status(500).json({ 
        error: 'Database configuration missing. Connect Vercel KV / Upstash Redis in your Vercel Dashboard.' 
      });
    }

    const sanitizedName = String(playerName || 'Casual Player')
      .substring(0, 32)
      .replace(/[<>]/g, '');

    const validKills = Math.max(0, parseInt(kills, 10) || 0);
    const validDeaths = Math.max(0, parseInt(deaths, 10) || 0);
    const validAssists = Math.max(0, parseInt(assists, 10) || 0);
    const validMvps = Math.max(0, parseInt(mvps, 10) || 0);
    const validScore = Math.max(0, parseInt(score, 10) || 0);

    const kdRatio = validDeaths === 0 ? validKills : parseFloat((validKills / validDeaths).toFixed(2));

    const playerData = {
      steamId,
      playerName: sanitizedName,
      kills: validKills,
      deaths: validDeaths,
      assists: validAssists,
      mvps: validMvps,
      score: validScore,
      kdRatio,
      lastUpdated: new Date().toISOString()
    };

    const kvEndpoint = `${kvUrl}/set/players:${steamId}`;
    const kvResponse = await fetch(kvEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${kvToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(playerData)
    });

    if (!kvResponse.ok) {
      throw new Error(`Database error: ${kvResponse.statusText}`);
    }

    return res.status(200).json({ success: true, message: 'Stats recorded successfully', player: playerData });

  } catch (error) {
    console.error('API Upload Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
