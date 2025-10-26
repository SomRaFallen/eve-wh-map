let systems = [];
let selectedSystem = null;
let connectingFrom = null;

// Модель для масштабирования карты
let scale = 1;
let offsetX = 0, offsetY = 0;
let isPanning = false, panStart = {x:0,y:0};

// Добавляем систему
function addSystem(){
  const input = document.getElementById('newSystem').value.trim();
  if(!input) return;
  let sysName = input.toUpperCase();
  if(!sysName.startsWith('J')) sysName = 'J'+sysName;

  fetch(`https://eve-proxy.onrender.com/wh/${sysName}`)
    .then(res=>res.json())
    .then(data=>{
      const sys = {
        name: sysName,
        class: data.class || '',
        effects: data.effects || '',
        statics: data.statics || '',
        home:false,
        x:50+systems.length*20,
        y:50+systems.length*20,
        connections:[]
      };
      systems.push(sys);
      saveSystems();
      renderSystems();
      selectSystem(sys);
    })
    .catch(err=>{
      alert("Система не найдена на EveOK");
      console.error(err);
    });
}

// Выбор системы
function selectSystem(sys){
  selectedSystem = sys;
  const infoDiv = document.getElementById('info');
  infoDiv.innerHTML = `
    <b>${sys.name}</b><br>
    <label>Класс:</label><input value="${sys.class}" onchange="updateSystemField('class',this.value)"><br>
    <label>Эффекты:</label><input value="${sys.effects}" onchange="updateSystemField('effects',this.value)"><br>
    <label>Статики:</label><input value="${sys.statics}" onchange="updateSystemField('statics',this.value)"><br>
    <button onclick="makeHome()">Сделать домашней</button><br>
    <button onclick="startConnection(sys)">Создать соединение</button><br><br>
    <button onclick="openZKB(sys)">Открыть ZKB</button>
    <button onclick="openEveOK(sys)">Открыть EveOK WH</button>
  `;
}

function updateSystemField(field,value){
  if(selectedSystem){ selectedSystem[field]=value; saveSystems(); renderSystems(); }
}

function makeHome(){
  systems.forEach(s=>s.home=false);
  selectedSystem.home = true;
  saveSystems();
  renderSystems();
}

function startConnection(sys){
  connectingFrom = sys;
  alert(`Выберите систему, чтобы соединить с ${sys.name}`);
}

function openZKB(sys){ window.open(`https://zkillboard.com/system/${sys.name}/`,'_blank'); }
function openEveOK(sys){ window.open(`https://eveok.ru/wh/${sys.name}`,'_blank'); }

// Сохранение на сервер
function saveSystems(){
  fetch('https://eve-proxy.onrender.com/save',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(systems)
  });
}

// Рендер карты
function renderSystems(){
  const map = document.getElementById('map');
  map.innerHTML = '';

  // Соединения
  systems.forEach(sys=>{
    sys.connections.forEach(connName=>{
      const target = systems.find(s=>s.name===connName);
      if(target) drawLine(map, sys.x, sys.y, target.x, target.y);
    });
  });

  // Системы
  systems.forEach(sys=>{
    const el = document.createElement('div');
    el.className = 'system' + (sys.home ? ' home':'' );
    el.style.left = sys.x+'px';
    el.style.top = sys.y+'px';
    el.textContent = sys.name;
    el.onmousedown = e=>startDrag(e,sys);
    el.onclick = e=>{
      e.stopPropagation();
      if(connectingFrom && connectingFrom!==sys){
        connectingFrom.connections.push(sys.name);
        connectingFrom=null;
        saveSystems();
        renderSystems();
      } else selectSystem(sys);
    };
    map.appendChild(el);
  });
}

// Рисуем линии
function drawLine(parent,x1,y1,x2,y2){
  const line = document.createElement('canvas');
  line.width = parent.clientWidth;
  line.height = parent.clientHeight;
  line.className = 'connection';
  const ctx = line.getContext('2d');
  ctx.strokeStyle='yellow'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(x1+50,y1+20); ctx.lineTo(x2+50,y2+20); ctx.stroke();
  parent.appendChild(line);
}

// Перетаскивание
let dragSys = null, offsetX=0, offsetY=0;
function startDrag(e,sys){
  dragSys=sys;
  offsetX=e.offsetX; offsetY=e.offsetY;
  document.onmousemove=dragMove;
  document.onmouseup=dragEnd;
}
function dragMove(e){
  if(dragSys){
    const map = document.getElementById('map');
    dragSys.x = e.clientX-map.offsetLeft-offsetX;
    dragSys.y = e.clientY-map.offsetTop-offsetY;
    renderSystems();
  }
}
function dragEnd(){ if(dragSys){ saveSystems(); dragSys=null; document.onmousemove=null; document.onmouseup=null; } }

// Масштабирование и панорамирование карты
const map = document.getElementById('map');
map.onwheel = e=>{
  e.preventDefault();
  const delta = e.deltaY>0?0.9:1.1;
  scale*=delta;
  map.style.transform = `scale(${scale}) translate(${offsetX}px,${offsetY}px)`;
};
map.onmousedown = e=>{
  if(e.target!==map) return;
  isPanning=true; panStart={x:e.clientX,y:e.clientY};
};
map.onmousemove = e=>{
  if(isPanning){
    offsetX += (e.clientX-panStart.x)/scale;
    offsetY += (e.clientY-panStart.y)/scale;
    panStart={x:e.clientX,y:e.clientY};
    map.style.transform = `scale(${scale}) translate(${offsetX}px,${offsetY}px)`;
  }
};
map.onmouseup = map.onmouseleave = ()=>{ isPanning=false; };
