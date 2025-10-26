const backendUrl = 'https://eve-proxy.onrender.com';
const clientId = '5a40c55151c241e3a007f2562fd4e1dd';
const redirectUri = 'https://somrafallen.github.io/eve-wh-map/';
const scopes = 'publicData esi-location.read_location.v1';

const loginBtn = document.getElementById('loginBtn');
const characterInfo = document.getElementById('characterInfo');
const killsDiv = document.getElementById('kills');
const debugDiv = document.getElementById('debug');

function logDebug(msg) {
  console.log(msg);
  debugDiv.textContent += msg + '\n';
}

function generateState() {
  return Math.random().toString(36).substring(2, 15);
}

loginBtn.addEventListener('click', () => {
  const state = generateState();
  localStorage.setItem('oauthState', state);

  const authUrl = `https://login.eveonline.com/v2/oauth/authorize/` +
    `?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&client_id=${clientId}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  window.location.href = authUrl;
});

async function handleAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');

  if (!code) return;

  const savedState = localStorage.getItem('oauthState');
  if (savedState !== state) {
    logDebug('❌ State mismatch!');
    return;
  }

  logDebug(`Code: ${code}`);
  logDebug(`State: ${state}`);

  try {
    const resp = await fetch(`${backendUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    const text = await resp.text();
    logDebug(`HTTP status: ${resp.status}`);
    logDebug(`Raw response:\n${text}`);

    let data;
    try { data = JSON.parse(text); } catch {
      characterInfo.innerText = '❌ Server returned non-JSON response.';
      return;
    }

    if (data.error) {
      characterInfo.innerText = `❌ Error: ${data.error_description || data.error}`;
      return;
    }

    characterInfo.innerHTML = `<h3>${data.character.CharacterName}</h3><p>System ID: ${data.character.SystemID || 'Unknown'}</p>`;

    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${data.character.CharacterID}`);
    const killsData = await killsResp.json();
    killsDiv.innerHTML = '<h4>Last 10 Kills:</h4>' +
      killsData.map(k => `<p>${k.date}: ${k.ship} in ${k.solarSystem}</p>`).join('');

  } catch (e) {
    characterInfo.innerText = '❌ Error fetching character info';
    logDebug(`Exception: ${e}`);
  }
}

handleAuth();
