const SERVER = 'https://eve-proxy.onrender.com';
let accessToken = localStorage.getItem('access_token') || null;
let character = JSON.parse(localStorage.getItem('character') || 'null');
let network, nodes, edges;

const authInfo = document.getElementById('authInfo');
const mapContainer = document.getElementById('map');

function updateAuthUI(){
  if(character){
    authInfo.textContent = `Авторизован: ${character.CharacterName}`;
    document.getElementById('logoutBtn').style.display = 'inline-block';
  } else {
    authInfo.textContent = 'Не авторизован';
    document.getElementById('logoutBtn').style.display = 'none';
  }
}

// --- Инициализация карты ---
function initMap(){
  nodes = new vis.DataSet([]);
  edges = new vis.DataSet([]);
  const data = { nodes, edges };
  const options = { physics: { enabled:true }, edges: { smooth:true } };
  network = new vis.Network(mapContainer, data, options);
}

initMap();
updateAuthUI();

// --- Авторизация ---
document.getElementById('authBtn').onclick = async ()=>{
  const code = prompt('Вставьте код авторизации EVE SSO');
  if(!code) return;
  try{
    const resp = await fetch(`${SERVER}/exchange`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code })
    });
    const data = await resp.json();
    if(data.error) return alert('Ошибка авторизации: '+JSON.stringify(data));
    accessToken = data.access_token;
    character = data.character;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('character', JSON.stringify(character));
    updateAuthUI();
    alert('Авторизация прошла успешно!');
  } catch(e){ console.error(e); alert('Ошибка: '+e.message); }
};

// --- Выход ---
document.getElementById('logoutBtn').onclick = ()=>{
  accessToken = null;
  character = null;
  localStorage.removeItem('access_token');
  localStorage.removeItem('character');
  updateAuthUI();
};

// --- Сохранение маршрута ---
document.getElementById('saveMapBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  await fetch(`${SERVER}/route/${character.CharacterID}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ nodes: nodes.get(), edges: edges.get() })
  });
  alert('Маршрут сохранён!');
};

// --- Загрузка маршрута ---
document.getElementById('loadMapBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  const resp = await fetch(`${SERVER}/route/${character.CharacterID}`);
  const data = await resp.json();
  nodes.clear();
  edges.clear();
  nodes.add(data.nodes);
  edges.add(data.edges);
};

// --- Очистка маршрута ---
document.getElementById('clearBtn').onclick = async ()=>{
  if(!character) return alert('Не авторизован');
  await fetch(`${SERVER}/route/${character.CharacterID}`,{ method:'DELETE' });
  nodes.clear();
  edges.clear();
};
