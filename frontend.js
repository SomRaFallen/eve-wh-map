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

let accessToken = null;
let currentCharacterId = null;
let currentRoute = { nodes:[], edges:[] };
let mode = null;
let selectedNodeForEdge = null;

function logDebug(msg){
  console.log(msg);
  debugDiv.textContent += msg + '\n';
}

// --- OAuth login ---
loginBtn.addEventListener('click', ()=>{
  const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(location.origin)}&client_id=${process.env.CLIENT_ID}&scope=publicData esi-location.read_location.v1&state=map`;
  window.location.href = url;
});

// --- получить код из URL ---
const params = new URLSearchParams(window.location.search);
const code = params.get('code');
if(code){
  fetch(`${backendUrl}/exchange`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ code })
  })
  .then(r=>r.json())
  .then(data=>{
    if(data.access_token){
      accessToken = data.access_token;
      currentCharacterId = data.character.CharacterID;
      loadCharacterData();
    } else logDebug('Auth error');
  });
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

  try{
    const killsResp = await fetch(`${backendUrl}/zkbKills?characterId=${currentCharacterId}`);
    const killsData = await killsResp.json();
    characterInfo.innerHTML = `<h3>Character ID: ${currentCharacterId}</h3>`;
    killsDiv.innerHTML = '<h4>Last 10 Kills:</h4>' +
      killsData.map(k=>`<p>${k.date}: ${k.ship} in ${k.solarSystem}</p>`).join('');
  }catch(e){ logDebug(`Error fetching kills: ${e}`); }

  try{
    const routeResp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    currentRoute = await routeResp.json();
    drawMap(currentRoute);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

// --- режимы ---
addNodeBtn.addEventListener('click', ()=>{ mode="addNode"; });
addEdgeBtn.addEventListener('click', ()=>{ mode="addEdge"; selectedNodeForEdge=null; });
deleteNodeBtn.addEventListener('click', ()=>{ mode="deleteNode"; });

// --- клик по карте ---
mapDiv.addEventListener('click', e=>{
  if(mode!=="addNode") return;
  const rect = mapDiv.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const newId = 'J' + Math.floor(Math.random()*1000000);
  currentRoute.nodes.push({ id:newId, x, y });
  drawMap(currentRoute);
  saveRoute();
});

// --- рисование карты ---
function drawMap(route){
  mapDiv.innerHTML = '';
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS,"svg");
  svg.setAttribute("width","100%");
  svg.setAttribute("height","400px");
  svg.setAttribute("style","background:#111");

  const nodeMap = {};
  route.nodes.forEach(n=>nodeMap[n.id]=n);

  route.edges.forEach(e=>{
    const from = nodeMap[e.from], to = nodeMap[e.to];
    if(!from || !to) return;
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1",from.x); line.setAttribute("y1",from.y);
    line.setAttribute("x2",to.x); line.setAttribute("y2",to.y);
    line.setAttribute("stroke","#ffcc00"); line.setAttribute("stroke-width","2");
    svg.appendChild(line);
  });

  route.nodes.forEach(n=>{
    const circle = document.createElementNS(svgNS,"circle");
    circle.setAttribute("cx",n.x); circle.setAttribute("cy",n.y); circle.setAttribute("r",10);
    circle.setAttribute("fill","#00ccff");
    circle.setAttribute("cursor","pointer");

    circle.addEventListener('mousedown', e=>{
      e.stopPropagation();
      const onMove = evt=>{
        n.x = evt.offsetX; n.y = evt.offsetY;
        drawMap(currentRoute);
      };
      const onUp = ()=>{
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        saveRoute();
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });

    circle.addEventListener('click', e=>{
      e.stopPropagation();
      if(mode==="deleteNode"){
        currentRoute.edges = currentRoute.edges.filter(edge=>edge.from!==n.id && edge.to!==n.id);
        currentRoute.nodes = currentRoute.nodes.filter(node=>node.id!==n.id);
        drawMap(currentRoute);
        saveRoute();
      } else if(mode==="addEdge"){
        if(!selectedNodeForEdge) selectedNodeForEdge=n;
        else {
          currentRoute.edges.push({ from:selectedNodeForEdge.id, to:n.id });
          selectedNodeForEdge=null;
          drawMap(currentRoute);
          saveRoute();
        }
      }
    });

    const text = document.createElementNS(svgNS,"text");
    text.setAttribute("x",n.x+12); text.setAttribute("y",n.y+4);
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
