export default async function handler(req, res) {
  const { action, 'openid.claimed_id': claimedId } = req.query;
  const domain = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://defusegg.vercel.app';

  // Step 1: Redirect user to Steam OpenID Login
  if (action === 'login') {
    const steamOpenIdUrl = 'https://steamcommunity.com/openid/login?' + new URLSearchParams({
      'openid.ns': 'http://specs.openid.net/auth/2.0',
      'openid.mode': 'checkid_setup',
      'openid.return_to': `${domain}/api/auth-steam?action=callback`,
      'openid.realm': `${domain}/`,
      'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
      'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select'
    }).toString();

    return res.redirect(302, steamOpenIdUrl);
  }

  // Step 2: Handle authentication callback from Steam
  if (action === 'callback' && claimedId) {
    const steamIdMatches = claimedId.match(/https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)/);
    const steamId = steamIdMatches ? steamIdMatches[1] : null;

    if (steamId) {
      return res.redirect(302, `/?claimedSteamId=${steamId}`);
    }
  }

  return res.status(400).json({ error: 'Steam authentication failed.' });
}
