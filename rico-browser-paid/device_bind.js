'use strict';
const crypto = require('crypto');
const SUPABASE_URL = 'https://ytjwwgskilygayjrycfk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hNMbrbwaUMxkkuOmGyUL9w_d1Ci9Og8';
const SECRET = process.env.RICO_DEVICE_BIND_SECRET || '';

async function bindIphoneInstallation(accessId, installationId) {
  if (!SECRET || SECRET.length < 32) throw new Error('device_bind_secret_missing');
  if (!/^[a-zA-Z0-9_-]{9,210}$/.test(String(accessId))) throw new Error('invalid_access_id');
  const id = String(installationId || '').trim();
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(id)) {
    throw new Error('invalid_installation_id');
  }
  function hash(type, value) {
    return crypto.createHmac('sha256', SECRET).update(type + '|' + value).digest('hex');
  }
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/rico_browser_bind_device_v1', {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, Authorization:'Bearer '+SUPABASE_KEY, 'content-type':'application/json', accept:'application/json' },
    body: JSON.stringify({
      p_access_hash: hash('purchase', accessId),
      p_device_hash: hash('install', id.toLowerCase()),
      p_admin_secret: SECRET
    })
  });
  if (!response.ok) {
    console.error('iphone_device_bind_error', response.status);
    throw new Error('device_bind_unavailable');
  }
  const result = await response.json();
  if (result !== true && result !== false) throw new Error('device_bind_invalid_response');
  return result;
}
module.exports = {bindIphoneInstallation};
