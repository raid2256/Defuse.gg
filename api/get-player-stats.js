export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { query } = req.query;
  const apiKey = process.env.STEAM_API_KEY;

  if (!query) {
    return res.status(400).json({ error: 'Please enter a Steam ID or profile link.' });
  }

  if (!apiKey) {
    return res.status(500).json({ 
      error: 'STEAM_API_KEY is not configured in Vercel environment variables.' 
    });
  }

  try {
    // 1. Resolve query into a valid SteamID64
    let steamId = extractSteamId(query);

    // If query is a custom vanity URL (e.g. steamcommunity.com/id/s1mple), resolve via Steam API
    if (!steamId) {
      const vanityName = extractVanityName(query);
      const vanityUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${vanityName}`;
      const vanityRes = await fetch(vanityUrl);
      const vanityData = await vanityRes.json();

      if (vanityData.response && vanityData.response.success === 1) {
        steamId = vanityData.response.steamid;
      } else {
        return res.status(404).json({ error: 'Could not resolve Steam profile URL.' });
      }
    }

    // 2. Fetch Steam Profile Summary (Avatar, Name, Profile URL)
    const summaryUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;
    const summaryRes = await fetch(summaryUrl);
    const summaryData = await summaryRes.json();
    const playerSummary = summaryData.response?.players?.[0];

    if (!playerSummary) {
      return res.status(404).json({ error: 'Steam player profile not found.' });
    }

    // 3. Fetch Official CS2 Stats (AppID 730)
    const statsUrl = `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?key=${apiKey}&steamid=${steamId}&appid=730`;
    const statsRes = await fetch(statsUrl);

    if (statsRes.status === 500 || statsRes.status === 403) {
      return res.status(403).json({
        error: 'Profile is private. Ask the player to set Steam Profile & Game Details to Public in their Steam Privacy Settings.'
      });
    }

    const statsData = await statsRes.json();
    const rawStatsArray = statsData.playerstats?.stats || [];

    // Map raw stats key-value array into a accessible dictionary
    const statsMap = {};
    rawStatsArray.forEach(item => {
      statsMap[item.name] = item.value;
    });

    // Extract Core Metrics
    const totalKills = statsMap['total_kills'] || 0;
    const totalDeaths = statsMap['total_deaths'] || 0;
    const totalHeadshots = statsMap['total_kills_headshot'] || 0;
    const totalTimePlayed = statsMap['total_time_played'] || 0; // In seconds
    const totalRounds = statsMap['total_rounds_played'] || 0;
    const totalMvps = statsMap['total_mvps'] || 0;
    const totalDamage = statsMap['total_damage_done'] || 0;
    const bombsPlanted = statsMap['total_planted_bombs'] || 0;
    const bombsDefused = statsMap['total_defused_bombs'] || 0;

    // Derived Metrics
    const kdRatio = totalDeaths === 0 ? totalKills : parseFloat((totalKills / totalDeaths).toFixed(2));
    const hsPercent = totalKills === 0 ? 0 : parseFloat(((totalHeadshots / totalKills) * 100).toFixed(1));
    const hoursPlayed = (totalTimePlayed / 3600).toFixed(1);

    // Weapon Frags Breakdown
    const weapons = [
      { id: 'ak47', name: 'AK-47', kills: statsMap['total_kills_ak47'] || 0 },
      { id: 'm4a1', name: 'M4A4 / M4A1-S', kills: statsMap['total_kills_m4a1'] || 0 },
      { id: 'awp', name: 'AWP', kills: statsMap['total_kills_awp'] || 0 },
      { id: 'deagle', name: 'Desert Eagle', kills: statsMap['total_kills_deagle'] || 0 },
      { id: 'p90', name: 'P90', kills: statsMap['total_kills_p90'] || 0 },
      { id: 'knife', name: 'Knife', kills: statsMap['total_kills_knife'] || 0 },
      { id: 'hegrenade', name: 'HE Grenade', kills: statsMap['total_kills_hegrenade'] || 0 }
    ].sort((a, b) => b.kills - a.kills);

    return res.status(200).json({
      success: true,
      player: {
        steamId,
        personaName: playerSummary.personaname,
        avatar: playerSummary.avatarfull,
        profileUrl: playerSummary.profileurl,
        stats: {
          kills: totalKills,
          deaths: totalDeaths,
          kdRatio,
          headshots: totalHeadshots,
          hsPercent,
          hoursPlayed,
          roundsPlayed: totalRounds,
          mvps: totalMvps,
          bombsPlanted,
          bombsDefused,
          weapons
        }
      }
    });

  } catch (error) {
    console.error('Steam API Error:', error);
    return res.status(500).json({ error: 'Failed to retrieve Steam stats.' });
  }
}

// Helper: Extract 64-bit Steam ID from raw string or URL
function extractSteamId(input) {
  const match = input.match(/7656119\d{10}/);
  return match ? match[0] : (input.length === 17 && /^\d+$/.test(input) ? input : null);
}

// Helper: Extract custom vanity name from URL
function extractVanityName(input) {
  const cleanInput = input.trim().replace(/\/$/, '');
  if (cleanInput.includes('/id/')) {
    return cleanInput.split('/id/')[1].split('/')[0];
  }
  return cleanInput;
}
