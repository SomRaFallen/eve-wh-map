const mapContainer = document.getElementById('mapContainer');
const infoContent = document.getElementById('infoContent');
const addSystemBtn = document.getElementById('addSystemBtn');
const systemInput = document.getElementById('systemInput');
const systemType = document.getElementById('systemType');

let systems = [];
let edges = [];

function createSystem(name, type){
  const div = document.createElement('div');
  div.className='systemBlock';
  div.style.left = Math.random()*500+'px';
  div.style.top = Math.random()*300+'px';
  div.style.background = type==='wh' ? '#ff4500' : type==='low' ? '#00ff00' : type==='hi' ? '#0080ff' : '#888';
  div.textContent = type==='wh' ? 'J'+name : name;
  div.onclick = ()=>fetchWHInfo(div.textContent);
  div.draggable = true;
  div.addEventListener('dragstart', e=>{ e.dataTransfer.setData('text/plain', div.textContent); });
  mapContainer.appendChild(div);
  systems.push({name,type,el:div});
}

addSystemBtn.onclick=()=>{
  if(!systemInput.value) return alert('Введите номер системы');
  createSystem(systemInput.value, systemType.value);
  systemInput.value='';
}

// --- Загрузка информации WH ---
function fetchWHInfo(name){
  infoContent.innerHTML='Загрузка...';
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
