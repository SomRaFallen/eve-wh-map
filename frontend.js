const backendUrl = 'https://eve-proxy.onrender.com';

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const characterSelect = document.getElementById('characterSelect');
const characterInfo = document.getElementById('characterInfo');
const killsDiv = document.getElementById('kills');
const mapDiv = document.getElementById('map');
const debugDiv = document.getElementById('debug');

let currentCharacterId = null;
let currentRoute = { nodes:[], edges:[] };

function logDebug(msg){
  console.log(msg);
  debugDiv.textContent += msg + '\n';
}

// --- поиск персонажей ---
searchBtn.addEventListener('click', async ()=>{
  const query = searchInput.value.trim();
  if(!query) return;
  const resp = await fetch(`${backendUrl}/search?query=${encodeURIComponent(query)}`);
  const data = await resp.json();
  characterSelect.innerHTML = '';
  data.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    characterSelect.appendChild(opt);
  });
});

// --- выбор персонажа ---
characterSelect.addEventListener('change', ()=>{
  currentCharacterId = characterSelect.value;
  loadCharacterData();
});

// --- загрузка данных персонажа ---
async function loadCharacterData(){
  if(!currentCharacterId) return;
  characterInfo.textContent = 'Loading...';
  killsDiv.textContent = '';
  mapDiv.innerHTML = '';

  // загружаем киллы
  try{
    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${currentCharacterId}`);
    const killsData = await killsResp.json();
    characterInfo.innerHTML = `<h3>Character ID: ${currentCharacterId}</h3>`;
    killsDiv.innerHTML = '<h4>Last 10 Kills:</h4>' +
      killsData.map(k=>`<p>${k.date}: ${k.ship} in ${k.solarSystem}</p>`).join('');
  }catch(e){ logDebug(`Error fetching kills: ${e}`); }

  // загружаем маршрут
  try{
    const routeResp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    currentRoute = await routeResp.json();
    drawMap(currentRoute);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

// --- функция рисования карты ---
function drawMap(route){
  mapDiv.innerHTML = '';
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width","100%");
  svg.setAttribute("height","400px");
  svg.setAttribute("style","background:#111");

  const nodeMap = {};
  route.nodes.forEach(n=>nodeMap[n.id]=n);

  // линии
  route.edges.forEach(e=>{
    const from = nodeMap[e.from], to = nodeMap[e.to];
    if(!from || !to) return;
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1", from.x); line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x); line.setAttribute("y2", to.y);
    line.setAttribute("stroke","#ffcc00"); line.setAttribute("stroke-width","2");
    svg.appendChild(line);
  });

  // узлы
  route.nodes.forEach(n=>{
    const circle = document.createElementNS(svgNS,"circle");
    circle.setAttribute("cx",n.x); circle.setAttribute("cy",n.y); circle.setAttribute("r",10);
    circle.setAttribute("fill","#00ccff");
    circle.setAttribute("cursor","pointer");

    // перетаскивание
    circle.addEventListener('mousedown', e=>{
      const onMove = evt=>{
        n.x = evt.offsetX; n.y = evt.offsetY;
        drawMap(currentRoute);
      };
      const onUp = ()=>{ document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); saveRoute(); };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });

    // подпись
    const text = document.createElementNS(svgNS,"text");
    text.setAttribute("x", n.x + 12); text.setAttribute("y", n.y + 4);
    text.setAttribute("fill","#fff"); text.setAttribute("font-size","12");
    text.textContent = n.id;

    svg.appendChild(circle);
    svg.appendChild(text);
  });

  mapDiv.appendChild(svg);
}

// --- сохранение маршрута ---
async function saveRoute(){
  if(!currentCharacterId) return;
  try{
    await fetch(`${backendUrl}/route/${currentCharacterId}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  }catch(e){ logDebug(`Error saving route: ${e}`); }
}

// --- тестовый стартовый маршрут ---
currentRoute = {
  nodes: [
    { id: 'J100001', x:100, y:100 },
    { id: 'J100002', x:300, y:100 },
    { id: 'J100003', x:200, y:250 }
  ],
  edges: [
    { from:'J100001', to:'J100002' },
    { from:'J100002', to:'J100003' },
    { from:'J100003', to:'J100001' }
  ]
};
drawMap(currentRoute);
