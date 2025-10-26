const backendUrl = 'https://eve-proxy.onrender.com';

const loginBtn = document.getElementById('loginBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const characterSelect = document.getElementById('characterSelect');
const characterInfo = document.getElementById('characterInfo');
const killsDiv = document.getElementById('kills');
const mapDiv = document.getElementById('map');
const debugDiv = document.getElementById('debug');

const addNodeBtn = document.getElementById('addNodeBtn');
const addEdgeBtn = document.getElementById('addEdgeBtn');
const deleteNodeBtn = document.getElementById('deleteNodeBtn');
const deleteEdgeBtn = document.getElementById('deleteEdgeBtn');

let accessToken = null;
let currentCharacterId = null;
let currentRoute = { nodes: [], edges: [] };
let mode = null;
let selectedNodeForEdge = null;

function logDebug(msg){
  debugDiv.textContent += msg + '\n';
}

// --- Режимы ---
addNodeBtn.addEventListener('click', () => { mode = "addNode"; });
addEdgeBtn.addEventListener('click', () => { mode = "addEdge"; selectedNodeForEdge = null; });
deleteNodeBtn.addEventListener('click', () => { mode = "deleteNode"; });
deleteEdgeBtn.addEventListener('click', () => { mode = "deleteEdge"; });

// --- Поиск персонажей ---
searchBtn.addEventListener('click', async () => {
  const query = searchInput.value.trim();
  if (!query) return;
  const resp = await fetch(`${backendUrl}/search?query=${encodeURIComponent(query)}`);
  const data = await resp.json();
  characterSelect.innerHTML = '';
  data.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    characterSelect.appendChild(opt);
  });
});

// --- Выбор персонажа ---
characterSelect.addEventListener('change', () => {
  currentCharacterId = characterSelect.value;
  loadCharacterData();
});

// --- Клик по карте ---
mapDiv.addEventListener('click', e => {
  if (mode !== "addNode") return;
  const rect = mapDiv.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const newId = 'J' + Math.floor(Math.random() * 1000000);
  currentRoute.nodes.push({ id: newId, x, y });
  drawMap(currentRoute);
  saveRoute();
});

// --- Загрузка данных персонажа ---
async function loadCharacterData() {
  if (!currentCharacterId) return;
  characterInfo.textContent = 'Loading...';
  killsDiv.textContent = '';
  mapDiv.innerHTML = '';

  try {
    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${currentCharacterId}`);
    const killsData = await killsResp.json();
    characterInfo.innerHTML = `<h3>Character ID: ${currentCharacterId}</h3>`;
    killsDiv.innerHTML = '<h4>Last 10 Kills:</h4>' +
      killsData.map(k => `<p>${k.date}: ${k.ship} in ${k.solarSystem}</p>`).join('');
  } catch (e) { logDebug(`Error fetching kills: ${e}`); }

  try {
    const routeResp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    currentRoute = await routeResp.json();
    drawMap(currentRoute);
  } catch (e) { logDebug(`Error loading route: ${e}`); }
}

// --- Рисование карты ---
function drawMap(route) {
  mapDiv.innerHTML = '';
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "400px");
  svg.setAttribute("style", "background:#111");
  mapDiv.appendChild(svg);

  const nodeMap = {};
  route.nodes.forEach(n => nodeMap[n.id] = n);

  // --- Линии ---
  route.edges.forEach(e => {
    const from = nodeMap[e.from], to = nodeMap[e.to];
    if (!from || !to) return;
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", from.x); line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x); line.setAttribute("y2", to.y);
    line.setAttribute("stroke", "#ffcc00");
    line.setAttribute("stroke-width", "2");
    line.style.cursor = "pointer";

    line.addEventListener('click', evt => {
      evt.stopPropagation();
      if (mode === "deleteEdge") {
        currentRoute.edges = currentRoute.edges.filter(edge => edge !== e);
        drawMap(currentRoute);
        saveRoute();
      }
    });

    svg.appendChild(line);
  });

  // --- Узлы ---
  route.nodes.forEach(n => {
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", n.x); circle.setAttribute("cy", n.y); circle.setAttribute("r", 10);
    circle.setAttribute("fill", "#00ccff");
    circle.style.cursor = "pointer";
    svg.appendChild(circle);

    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", n.x + 12); text.setAttribute("y", n.y + 4);
    text.setAttribute("fill", "#fff"); text.setAttribute("font-size", "12");
    text.textContent = n.id;
    svg.appendChild(text);

    // --- Перетаскивание ---
    circle.addEventListener('mousedown', e => {
      e.stopPropagation();
      const onMove = evt => {
        const rect = svg.getBoundingClientRect();
        n.x = evt.clientX - rect.left;
        n.y = evt.clientY - rect.top;
        drawMap(currentRoute);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveRoute();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    // --- Клик по узлу ---
    circle.addEventListener('click', e => {
      e.stopPropagation();
      if (mode === "deleteNode") {
        currentRoute.edges = currentRoute.edges.filter(edge => edge.from !== n.id && edge.to !== n.id);
        currentRoute.nodes = currentRoute.nodes.filter(node => node.id !== n.id);
        drawMap(currentRoute);
        saveRoute();
      } else if (mode === "addEdge") {
        if (!selectedNodeForEdge) selectedNodeForEdge = n;
        else {
          currentRoute.edges.push({ from: selectedNodeForEdge.id, to: n.id });
          selectedNodeForEdge = null;
          drawMap(currentRoute);
          saveRoute();
        }
      }
    });
  });
}

// --- Сохранение маршрута ---
async function saveRoute() {
  if (!currentCharacterId) return;
  try {
    await fetch(`${backendUrl}/route/${currentCharacterId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  } catch (e) { logDebug(`Error saving route: ${e}`); }
}

// --- OAuth init ---
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
if (code) {
  fetch(`${backendUrl}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  })
    .then(r => r.json())
    .then(data => {
      if (data.access_token) {
        accessToken = data.access_token;
        currentCharacterId = data.character.CharacterID;
        loadCharacterData();
      } else logDebug('Auth error');
    });
}
