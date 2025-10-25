const SERVER = 'https://eve-proxy.onrender.com';
const CLIENT_ID = '5a40c55151c241e3a007f2562fd4e1dd';
const REDIRECT_URI = 'https://somrafallen.github.io/eve-wh-map/';

const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const zkbAuthBtn = document.getElementById('zkbAuthBtn');
const saveLocBtn = document.getElementById('saveLocBtn');
const clearBtn = document.getElementById('clearBtn');
const loadZkbBtn = document.getElementById('loadZkbBtn');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const killsList = document.getElementById('killsList');

const systemTitle = document.getElementById('systemTitle');
const systemMeta = document.getElementById('systemMeta');

const saveMapBtn = document.getElementById('saveMapBtn');
const loadMapBtn = document.getElementById('loadMapBtn');

const langSelect = document.getElementById('langSelect');
const authInfo = document.getElementById('authInfo');

let accessToken = null;
let zkbToken = null;
let currentCharacter = null;

// --- Мультиязычность ---
let currentLang = 'ru';
const translations = {
  ru:{ auth:"Авторизоваться (EVE SSO)", logout:"Выйти", zkbAuth:"Авторизация ZKB", saveLoc:"Сохранить локацию",
       clearRoute:"Очистить маршрут", loadZkb:"Загрузить киллы ZKB", lastKills:"Последние киллмейлы",
       searchPlaceholder:"Поиск персонажа или ID", map:"Карта (vis-network)", actions:"Действия",
       saveMap:"Сохранить карту", loadMap:"Загрузить карту", notAuth:"Не авторизован",
       authInfo:"Авторизован: " },
  ua:{ auth:"Авторизуватися (EVE SSO)", logout:"Вийти", zkbAuth:"Авторизація ZKB", saveLoc:"Зберегти локацію",
       clearRoute:"Очистити маршрут", loadZkb:"Завантажити килли ZKB", lastKills:"Останні киллмейли",
       searchPlaceholder:"Пошук персонажа або ID", map:"Карта (vis-network)", actions:"Дії",
       saveMap:"Зберегти карту", loadMap:"Завантажити карту", notAuth:"Не авторизований",
       authInfo:"Авторизований: " }
};

function setLanguage(lang){
  currentLang = lang;
  const t = translations[lang];
  authBtn.textContent = t.auth;
  logoutBtn.textContent = t.logout;
  zkbAuthBtn.textContent = t.zkbAuth;
  saveLocBtn.textContent = t.saveLoc;
  clearBtn.textContent = t.clearRoute;
  loadZkbBtn.textContent = t.loadZkb;
  searchInput.placeholder = t.searchPlaceholder;
  document.getElementById('lastKillsLabel').textContent = t.lastKills;
  document.getElementById('map').textContent = t.map;
  saveMapBtn.textContent = t.saveMap;
  loadMapBtn.textContent = t.loadMap;
  document.getElementById('actionsTitle').textContent = t.actions;
  authInfo.textContent = currentCharacter ? t.authInfo + currentCharacter.CharacterName : t.notAuth;
}

langSelect.addEventListener('change', e=>setLanguage(e.target.value));

// --- Инициализация карты ---
let nodes = new vis.DataSet();
let edges = new vis.DataSet();

const container = document.getElementById('map');
const data = { nodes, edges };
const options = {
  nodes:{color:{background:'#f5d742', border:'#ffea75'}, font:{color:'#061137'}},
  edges:{color:'#f5d742', width:2},
  physics:{enabled:true, stabilization:true},
  manipulation:{enabled:true, addNode:true, addEdge:true, editNode:true, editEdge:true, deleteNode:true, deleteEdge:true}
};
const network = new vis.Network(container, data, options);

network.on("selectNode", function(params){
  const node = nodes.get(params.nodes[0]);
  systemTitle.textContent = "Система: " + node.label;
  systemMeta.textContent = node.meta || "Информации нет";
});

// --- EVE SSO ---
authBtn.addEventListener('click', ()=>{
  const state = Math.random().toString(36).substring(2);
  const url = `https://login.eveonline.com/v2/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=publicData esi-location.read_location.v1&state=${state}`;
  window.location.href = url;
});

logoutBtn.addEventListener('click', ()=>{
  accessToken=null; currentCharacter=null;
  authInfo.textContent = translations[currentLang].notAuth;
  authBtn.style.display='inline-block';
  logoutBtn.style.display='none';
  zkbAuthBtn.style.display='none';
  saveLocBtn.style.display='none';
  clearBtn.style.display='none';
  loadZkbBtn.style.display='none';
});

// --- Обработка редиректа SSO ---
async function handleRedirect(){
  const params = new URLSearchParams(window.location.search);
  if(params.has('code')){
    const code = params.get('code');
    try{
      const resp = await fetch(`${SERVER}/exchange`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code })
      });
      if(!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      accessToken = data.access_token;
      currentCharacter = data.character || { CharacterID:0, CharacterName:'Unknown' };
      authInfo.textContent = translations[currentLang].authInfo + currentCharacter.CharacterName;
      authBtn.style.display='none';
      logoutBtn.style.display='inline-block';
      zkbAuthBtn.style.display='inline-block';
      saveLocBtn.style.display='inline-block';
      clearBtn.style.display='inline-block';
      loadZkbBtn.style.display='inline-block';

      // Добавляем узел с текущей системой для карты
      nodes.clear();
      edges.clear();
      nodes.add({ id: 1, label: "J114337", meta: "Текущая система" });
    }catch(e){ authInfo.textContent='Ошибка авторизации: '+e.message; console.error(e);}
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// --- ZKB ---
zkbAuthBtn.addEventListener('click', async ()=>{
  if(!currentCharacter) return alert('Сначала авторизуйтесь через EVE SSO');
  try{
    const resp = await fetch(`${SERVER}/zkb/exchange`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ characterId: currentCharacter.CharacterID })
    });
    if(!resp.ok) throw new Error(await resp.text());
    const data = await resp.json();
    zkbToken = data.access_token;
    alert('ZKB авторизация успешна!');
  }catch(e){console.error(e); alert('Ошибка ZKB: '+e.message);}
});

// --- Маршрут ---
saveLocBtn.addEventListener('click', async ()=>{
  if(!currentCharacter) return alert('Авторизуйтесь');
  try{
    await fetch(`${SERVER}/route`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ characterId: currentCharacter.CharacterID, nodes: nodes.get(), edges: edges.get() })
    });
    alert('Маршрут сохранен');
  }catch(e){console.error(e); alert('Ошибка сохранения');}
});

clearBtn.addEventListener('click', async ()=>{
  nodes.clear(); edges.clear();
  try{
    await fetch(`${SERVER}/route`, {
      method:'DELETE',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ characterId: currentCharacter.CharacterID })
    });
    alert('Маршрут очищен');
  }catch(e){console.error(e);}
});

loadMapBtn.addEventListener('click', async ()=>{
  if(!currentCharacter) return alert('Авторизуйтесь');
  try{
    const resp = await fetch(`${SERVER}/route?characterId=${currentCharacter.CharacterID}`);
    const data = await resp.json();
    nodes.clear(); edges.clear();
    nodes.add(data.nodes || []);
    edges.add(data.edges || []);
  }catch(e){console.error(e);}
});

// --- Киллы ZKB ---
loadZkbBtn.addEventListener('click', async ()=>{
  if(!zkbToken) return alert('Сначала авторизуйтесь в ZKB');
  try{
    const resp = await fetch(`${SERVER}/zkb/kills?characterId=${currentCharacter.CharacterID}`);
    const data = await resp.json();
    killsList.innerHTML='';
    data.kills.forEach(k=>{
      const div = document.createElement('div');
      div.className='kill';
      div.innerHTML=`<div class="system">${k.system}</div><div class="meta">${k.date}</div><div class="ship">${k.ship}</div>`;
      killsList.appendChild(div);
    });
  }catch(e){console.error(e);}
});

// --- Поиск персонажа (заглушка) ---
searchBtn.addEventListener('click', ()=>{
  const val = searchInput.value.trim();
  if(!val) return;
  alert('Поиск персонажей пока не реализован на фронтенде. Можно подключить сервер /search.');
});

handleRedirect();
setLanguage(currentLang);
