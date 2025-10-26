const backendUrl = 'https://eve-proxy.onrender.com';

const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');
const mapDiv = document.getElementById('map');
const debugDiv = document.getElementById('debug');

let currentCharacterId = null;
let currentRoute = { nodes: [], edges: [] };

function logDebug(msg){ debugDiv.textContent += msg + '\n'; }

// --- Load Character Route ---
loadCharacterBtn.addEventListener('click', async ()=>{
  const id = characterIdInput.value.trim();
  if(!id) return;
  currentCharacterId = id;
  await loadRoute();
});

// --- Load route from server ---
async function loadRoute(){
  try{
    const resp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    currentRoute = await resp.json();
    logDebug(`Loaded route for character ${currentCharacterId}: ${JSON.stringify(currentRoute)}`);
    drawMap(currentRoute);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

// --- Draw route ---
function drawMap(route){
  mapDiv.innerHTML = '';
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "400px");
  svg.setAttribute("style", "background:#111");
  mapDiv.appendChild(svg);

  const nodeMap = {};
  route.nodes.forEach(n => nodeMap[n.id] = n);

  // Draw edges
  route.edges.forEach(e => {
    const from = nodeMap[e.from], to = nodeMap[e.to];
    if(!from || !to) return;
    const line = document.createElementNS(svgNS,"line");
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("stroke","#ffcc00");
    line.setAttribute("stroke-width","2");
    svg.appendChild(line);
  });

  // Draw nodes
  route.nodes.forEach(n => {
    const circle = document.createElementNS(svgNS,"circle");
    circle.setAttribute("cx", n.x);
    circle.setAttribute("cy", n.y);
    circle.setAttribute("r", 10);
    circle.setAttribute("fill","#00ccff");
    svg.appendChild(circle);

    const text = document.createElementNS(svgNS,"text");
    text.setAttribute("x", n.x + 12);
    text.setAttribute("y", n.y + 4);
    text.setAttribute("fill","#fff");
    text.setAttribute("font-size","12");
    text.textContent = n.id;
    svg.appendChild(text);
  });
}
