export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Please enter a Steam ID or profile link.' });
  }

  try {
    // 1. Extract 64-bit Steam ID from input string/URL
    const steamIdMatch = query.match(/7656119\d{10}/);
    const steamId = steamIdMatch ? steamIdMatch[0] : (query.length === 17 && /^\d+$/.test(query) ? query : null);

    if (!steamId) {
      return res.status(400).json({ 
        error: 'Please enter a valid 17-digit SteamID64 (e.g. 76561197960287930).' 
      });
    }

    // 2. Fetch public player page from csstats.gg
    const targetUrl = `https://csstats.gg/player/${steamId}`;
    const targetRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (targetRes.status === 404) {
      return res.status(404).json({ error: 'Player profile not found or has never been indexed.' });
    }

    const html = await targetRes.text();

    // 3. Extract player name
    const nameMatch = html.match(/<span class="player-name">([^<]+)<\/span>/i) || 
                      html.match(/<title>CS2 Stats - ([^|-]+)/i);
    const personaName = nameMatch ? nameMatch[1].trim() : `Player ${steamId.slice(-4)}`;

    // 4. Extract Avatar
    const avatarMatch = html.match(/<img class="player-avatar"[^>]+src="([^"]+)"/i) ||
                        html.match(/https:\/\/avatars\.steamstatic\.com\/[a-f0-9_]+_full\.jpg/i);
    const avatar = avatarMatch ? avatarMatch[0] : 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg';

    // 5. Parse Stat Values using HTML Regex Patterns
    const kills = parseStatNumber(html, 'Kills') || parseRegexValue(html, /Kills<\/div>\s*<div[^>]*>([\d,]+)/i);
    const kdRatio = parseRegexValue(html, /K\/D Ratio<\/div>\s*<div[^>]*>([\d\.]+)/i) || '1.00';
    const hsPercent = parseRegexValue(html, /HS %<\/div>\s*<div[^>]*>([\d\.]+%)/i) || '0%';
    const winRate = parseRegexValue(html, /Win %<\/div>\s*<div[^>]*>([\d\.]+%)/i) || '0%';
    const rating = parseRegexValue(html, /HLTV Rating<\/div>\s*<div[^>]*>([\d\.]+)/i) || '1.00';

    return res.status(200).json({
      success: true,
      player: {
        steamId,
        personaName,
        avatar,
        profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        stats: {
          kills: kills || 'N/A',
          kdRatio,
          hsPercent,
          winRate,
          rating
        }
      }
    });

  } catch (error) {
    console.error('Scraper Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve stats from public index.' });
  }
}

function parseRegexValue(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function parseStatNumber(html, label) {
  const regex = new RegExp(`${label}<\\/div>\\s*<div[^>]*>([\\d,]+)`, 'i');
  const match = html.match(regex);
  return match ? match[1] : null;
}
