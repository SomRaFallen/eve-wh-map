// --- Настройка ---
const backendUrl = 'https://eve-proxy.onrender.com'; // твой сервер на Render

const mapDiv = document.getElementById('map');
const debugDiv = document.getElementById('debug');

const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');

const addNodeBtn = document.getElementById('addNodeBtn');
const addEdgeBtn = document.getElementById('addEdgeBtn');
const deleteNodeBtn = document.getElementById('deleteNodeBtn');
const deleteEdgeBtn = document.getElementById('deleteEdgeBtn');

let currentCharacterId = null;
let currentRoute = { nodes: [], edges: [] };
let mode = null;
let selectedNodeForEdge = null;

function logDebug(msg){ debugDiv.textContent += msg + '\n'; }

// --- Режимы ---
addNodeBtn.addEventListener('click', ()=>{ mode="addNode"; selectedNodeForEdge=null; });
addEdgeBtn.addEventListener('click', ()=>{ mode="addEdge"; selectedNodeForEdge=null; });
deleteNodeBtn.addEventListener('click', ()=>{ mode="deleteNode"; });
deleteEdgeBtn.addEventListener('click', ()=>{ mode="deleteEdge"; selectedNodeForEdge=null; });

// --- Загрузка маршрута ---
loadCharacterBtn.addEventListener('click', ()=>{
  const id = characterIdInput.value.trim();
  if(!id) return;
  currentCharacterId = id;
  loadRoute();
});

// --- Загрузка маршрута с сервера ---
async function loadRoute(){
  if(!currentCharacterId) return;
  try{
    const resp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    if(!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    currentRoute = await resp.json();
    drawMap(currentRoute);
    logDebug(`Loaded route for character ${currentCharacterId}`);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

// --- Отрисовка карты ---
function drawMap(route){
  mapDiv.innerHTML='';
  const svgNS="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(svgNS,"svg");
  svg.setAttribute("width","100%");
  svg.setAttribute("height","400px");
  svg.setAttribute("style","background:#111");
  mapDiv.appendChild(svg);

  const nodeMap={};
  route.nodes.forEach(n=>nodeMap[n.id]=n);

  // Edges
  route.edges.forEach(e=>{
    const from=nodeMap[e.from], to=nodeMap[e.to];
    if(!from||!to) return;
    const line=document.createElementNS(svgNS,"line");
    line.setAttribute("x1",from.x); line.setAttribute("y1",from.y);
    line.setAttribute("x2",to.x); line.setAttribute("y2",to.y);
    line.setAttribute("stroke","#ffcc00");
    line.setAttribute("stroke-width","2");
    line.style.cursor="pointer";
    line.addEventListener('click', evt=>{
      evt.stopPropagation();
      if(mode==="deleteEdge"){
        currentRoute.edges=currentRoute.edges.filter(edge=>edge!==e);
        drawMap(currentRoute);
        saveRoute();
      }
    });
    svg.appendChild(line);
  });

  // Nodes
  route.nodes.forEach(n=>{
    const circle=document.createElementNS(svgNS,"circle");
    circle.setAttribute("cx",n.x); circle.setAttribute("cy",n.y); circle.setAttribute("r",10);
    circle.setAttribute("fill","#00ccff");
    circle.style.cursor="pointer";
    svg.appendChild(circle);

    const text=document.createElementNS(svgNS,"text");
    text.setAttribute("x",n.x+12); text.setAttribute("y",n.y+4);
    text.setAttribute("fill","#fff"); text.setAttribute("font-size","12");
    text.textContent=n.id;
    svg.appendChild(text);

    // Перетаскивание
    circle.addEventListener('mousedown', e=>{
      e.stopPropagation();
      const onMove=evt=>{
        const rect=svg.getBoundingClientRect();
        n.x=evt.clientX-rect.left;
        n.y=evt.clientY-rect.top;
        drawMap(currentRoute);
      };
      const onUp=()=>{
        document.removeEventListener('mousemove',onMove);
        document.removeEventListener('mouseup',onUp);
        saveRoute();
      };
      document.addEventListener('mousemove',onMove);
      document.addEventListener('mouseup',onUp);
    });

    // Клик по узлу
    circle.addEventListener('click', e=>{
      e.stopPropagation();
      if(mode==="deleteNode"){
        currentRoute.edges=currentRoute.edges.filter(edge=>edge.from!==n.id && edge.to!==n.id);
        currentRoute.nodes=currentRoute.nodes.filter(node=>node.id!==n.id);
        drawMap(currentRoute);
        saveRoute();
      } else if(mode==="addEdge"){
        if(!selectedNodeForEdge) selectedNodeForEdge=n;
        else{
          currentRoute.edges.push({from:selectedNodeForEdge.id,to:n.id});
          selectedNodeForEdge=null;
          drawMap(currentRoute);
          saveRoute();
        }
      }
    });
  });

  // Добавление узла кликом по пустому месту
  svg.addEventListener('click', e=>{
    if(mode!=="addNode") return;
    if(e.target.tagName !== 'svg') return;
    const rect=svg.getBoundingClientRect();
    const x=e.clientX-rect.left;
    const y=e.clientY-rect.top;
    const newId='J'+Math.floor(Math.random()*1000000);
    currentRoute.nodes.push({id:newId,x,y});
    drawMap(currentRoute);
    saveRoute();
  });
}

// --- Сохранение маршрута на сервер ---
async function saveRoute(){
  if(!currentCharacterId) return;
  try{
    await fetch(`${backendUrl}/route/${currentCharacterId}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  }catch(e){ logDebug(`Error saving route: ${e}`); }
}
