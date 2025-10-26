const backendUrl = 'https://eve-proxy.onrender.com';
const clientId = '5a40c55151c241e3a007f2562fd4e1dd';
const redirectUri = 'https://somrafallen.github.io/eve-wh-map/';

const loginBtn = document.getElementById('loginBtn');
const characterInfo = document.getElementById('characterInfo');
const killsDiv = document.getElementById('kills');

// Добавляем мини-лог на страницу
const logDiv = document.createElement('pre');
logDiv.style.textAlign = 'left';
logDiv.style.marginTop = '20px';
logDiv.style.padding = '10px';
logDiv.style.background = '#111';
logDiv.style.border = '1px solid #555';
logDiv.style.overflowX = 'auto';
document.body.appendChild(logDiv);

function log(message) {
  console.log(message);
  logDiv.textContent += message + '\n';
}

function generateState() {
  return Math.random().toString(36).substring(2, 15);
}

loginBtn.addEventListener('click', () => {
  const state = generateState();
  const authUrl = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&client_id=${clientId}&scope=publicData&state=${state}`;
  window.location.href = authUrl;
});

async function handleAuth() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  if (!code) return;

  try {
    const resp = await fetch(`${backendUrl}/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    log(`HTTP status: ${resp.status}`);

    let text = await resp.text();
    log('Raw response from server:\n' + text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      characterInfo.innerText = '❌ Server returned non-JSON response. See log below.';
      return;
    }

    if (data.error) {
      characterInfo.innerText = `❌ Error: ${data.error_description || data.error}`;
      return;
    }

    characterInfo.innerHTML = `
      <h2>${data.character.CharacterName}</h2>
      <p>System ID: ${data.character.SystemID}</p>
    `;

    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${data.character.CharacterID}`);
    const killsData = await killsResp.json();
    killsDiv.innerHTML = '<h3>Last 10 Kills:</h3>' + killsData.map(k => `
      <p>${k.date}: ${k.ship} in ${k.solarSystem}</p>
    `).join('');

  } catch (e) {
    characterInfo.innerText = '❌ Error fetching character info';
    log('Exception:\n' + e);
  }
}

handleAuth();
