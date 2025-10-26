const backendUrl = 'https://eve-proxy.onrender.com';
const characterId = 1; // тестовый персонаж

const characterInfo = document.getElementById('characterInfo');
const killsDiv = document.getElementById('kills');
const debugDiv = document.getElementById('debug');

function logDebug(msg){
  console.log(msg);
  debugDiv.textContent += msg + '\n';
}

// --- загрузка данных ---
async function loadData() {
  try {
    // Персонаж (заглушка)
    const searchResp = await fetch(`${backendUrl}/search?query=test`);
    const characters = await searchResp.json();
    const character = characters[0];
    characterInfo.innerHTML = `<h3>${character.name}</h3><p>ID: ${character.id}</p>`;

    logDebug(`Loaded character: ${character.name}`);

    // Kills (заглушка)
    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${character.id}`);
    const killsData = await killsResp.json();
    killsDiv.innerHTML = '<h4>Last 10 Kills:</h4>' +
      killsData.map(k => `<p>${k.date}: ${k.ship} in ${k.solarSystem}</p>`).join('');

    logDebug(`Loaded ${killsData.length} kills`);

    // Маршрут (заглушка)
    const routeResp = await fetch(`${backendUrl}/route/${character.id}`);
    const routeData = await routeResp.json();
    logDebug(`Loaded route nodes: ${routeData.nodes.length}, edges: ${routeData.edges.length}`);

  } catch(e){
    logDebug(`Exception: ${e}`);
  }
}

loadData();
