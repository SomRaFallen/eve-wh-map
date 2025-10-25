const SERVER = 'https://eve-proxy.onrender.com';
let accessToken = localStorage.getItem('access_token');
let character = JSON.parse(localStorage.getItem('character')||'null');
let network, nodes, edges;

const authInfo = document.getElementById('authInfo');
const mapContainer = document.getElementById('map');

function updateAuthUI(){
  authInfo.textContent = character ? `Авторизован: ${character.CharacterName}` : 'Не авторизован';
  document.getElementById('logoutBtn').style.display = character?'inline-block':'none';
}

updateAuthUI();

// --- Карта vis-network ---
nodes = new vis.DataSet([]);
edges = new vis.DataSet([]);
network = new vis.Network(mapContainer,{nodes,edges},{physics:true});

// --- Авторизация ---
document.getElementById('authBtn').onclick = async ()=>{
  const code = prompt('Введите код (любой для теста)');
  if(!code) return;
  const resp = await fetch(`${SERVER}/exchange`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ code })
  });
  const data = await resp.json();
  accessToken = data.access_token;
  character = data.character;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('character', JSON.stringify(character));
  updateAuthUI();
};

// --- Выход ---
document.getElementById('logoutBtn').onclick = ()=>{
  accessToken=null; character=null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('character');
  updateAuthUI();
};

// --- Сохранить маршрут ---
document.getElementById('saveMapBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  await fetch(`${SERVER}/route/${character.CharacterID}`,{
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ nodes:nodes.get(), edges:edges.get() })
  });
  alert('Маршрут сохранён');
};

// --- Загрузить маршрут ---
document.getElementById('loadMapBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  const resp = await fetch(`${SERVER}/route/${character.CharacterID}`);
  const data = await resp.json();
  nodes.clear(); edges.clear();
  nodes.add(data.nodes); edges.add(data.edges);
};

// --- Очистка маршрута ---
document.getElementById('clearBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  await fetch(`${SERVER}/route/${character.CharacterID}`,{method:'DELETE'});
  nodes.clear(); edges.clear();
};

// --- Загрузка ZKB ---
document.getElementById('loadZkbBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  const resp = await fetch(`${SERVER}/zkbKills?characterId=${character.CharacterID}`);
  const data = await resp.json();
  const killsDiv = document.getElementById('killsList');
  killsDiv.innerHTML='';
  data.forEach(k=>{
    const el = document.createElement('div');
    el.textContent = `${k.date} — ${k.solarSystem} — ${k.ship}`;
    killsDiv.appendChild(el);
  });
};
