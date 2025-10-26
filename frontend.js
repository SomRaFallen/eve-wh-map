const mapContainer = document.getElementById('mapContainer');
const infoContent = document.getElementById('infoContent');
const addSystemBtn = document.getElementById('addSystemBtn');
const systemInput = document.getElementById('systemInput');
const systemType = document.getElementById('systemType');

let systems = [];
let edges = [];
let homeSystem = null;

// Создание системы
function createSystem(name, type){
  const div = document.createElement('div');
  div.className='systemBlock';
  div.style.left = Math.random()*500+'px';
  div.style.top = Math.random()*300+'px';
  div.style.background = type==='wh' ? '#ff4500' : type==='low' ? '#00ff00' : type==='hi' ? '#0080ff' : '#888';
  div.textContent = type==='wh' ? 'J'+name : name;
  
  div.onclick = ()=>fetchWHInfo(div);
  div.draggable = true;

  // Drag & Drop
  div.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', div.textContent);
    div.dataset.dragging = true;
  });
  div.addEventListener('dragend', e => {
    div.dataset.dragging = false;
    drawEdges();
  });

  mapContainer.appendChild(div);
  const system = {name, type, el:div, x:parseInt(div.style.left), y:parseInt(div.style.top), connections:[]};
  systems.push(system);

  // Контейнер стрелок
  const svg = document.getElementById('svgEdges');
  if(!svg){
    const s = document.createElementNS('http://www.w3.org/2000/svg','svg');
    s.id='svgEdges';
    s.style.position='absolute';
    s.style.top='0';
    s.style.left='0';
    s.style.width='100%';
    s.style.height='100%';
    s.style.pointerEvents='none';
    mapContainer.appendChild(s);
  }

  drawEdges();
}

// Добавление системы
addSystemBtn.onclick=()=>{
  if(!systemInput.value) return alert('Введите номер системы');
  createSystem(systemInput.value, systemType.value);
  systemInput.value='';
}

// --- Drag & Drop перетаскивание ---
mapContainer.addEventListener('dragover', e=>{e.preventDefault();});
mapContainer.addEventListener('drop', e=>{
  const div = systems.find(s=>s.el.dataset.dragging==='true').el;
  div.style.left = (e.offsetX-50)+'px';
  div.style.top = (e.offsetY-25)+'px';
  const sys = systems.find(s=>s.el===div);
  sys.x = parseInt(div.style.left);
  sys.y = parseInt(div.style.top);
  drawEdges();
});

// --- Соединение систем ---
function connectSystems(from, to){
  const f = systems.find(s=>s.el===from);
  const t = systems.find(s=>s.el===to);
  if(!f || !t || f.connections.includes(t.name)) return;
  f.connections.push(t.name);
  drawEdges();
}

// --- Рисование стрелок ---
function drawEdges(){
  const svg = document.getElementById('svgEdges');
  svg.innerHTML='';
  systems.forEach(s=>{
    s.connections.forEach(targetName=>{
      const t = systems.find(sys=>sys.name===targetName);
      if(t){
        const line = document.createElementNS('http://www.w3.org/2000/svg','line');
        line.setAttribute('x1',s.x+50);
        line.setAttribute('y1',s.y+25);
        line.setAttribute('x2',t.x+50);
        line.setAttribute('y2',t.y+25);
        line.setAttribute('stroke','#fff');
        line.setAttribute('stroke-width','2');
        svg.appendChild(line);
      }
    });
  });
}

// --- Загрузка информации WH ---
function fetchWHInfo(system){
  infoContent.innerHTML='Загрузка...';
  const name = system.textContent;
  if(!name.startsWith('J')) { infoContent.innerHTML='Данные доступны только для WH'; return; }
  const whName = name;
  const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://evewh.ru/'+whName)}`;
  fetch(url).then(r=>r.json()).then(data=>{
    const parser = new DOMParser();
    const doc = parser.parseFromString(data.contents,'text/html');
    const infoDiv = doc.querySelector('.solarsystem_info');
    if(!infoDiv){ infoContent.innerHTML='Нет данных'; return; }
    const whClass = infoDiv.querySelector('blockquote .info_hl')?.textContent || '-';
    const effect = infoDiv.querySelector('blockquote span.info_hl:nth-of-type(2)')?.textContent || '-';
    const statics = Array.from(infoDiv.querySelectorAll('.static_name')).map(s=>s.textContent).join(', ');
    infoContent.innerHTML=`<b>Класс WH:</b> ${whClass}<br><b>Эффект:</b> ${effect}<br><b>Статики:</b> ${statics}`;
  }).catch(()=>{ infoContent.innerHTML='Ошибка загрузки'; });
}

// --- Установка домашней системы ---
function setHomeSystem(system){
  if(homeSystem) homeSystem.el.style.border='';
  homeSystem = system;
  system.el.style.border='3px solid yellow';
}
