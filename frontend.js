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

let accessToken = localStorage.getItem('accessToken') || null;
let zkbToken = localStorage.getItem('zkbToken') || null;
let currentCharacter = JSON.parse(localStorage.getItem('currentCharacter')) || null;

// --- Карта ---
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
network.on("selectNode", params=>{
  const node = nodes.get(params.nodes[0]);
  systemTitle.textContent = "Система: " + node.label;
  systemMeta.textContent = node.meta || "Информации нет";
});

// --- Язык ---
let currentLang = 'ru';
const translations = {
  ru:{auth:"Авторизоваться (EVE SSO)", logout:"Выйти", zkbAuth:"Авторизация ZKB", saveLoc:"Сохранить локацию", clearRoute:"Очистить маршрут",
      loadZkb:"Загрузить киллы ZKB", searchPlaceholder:"Поиск персонажа или ID", lastKills:"Последние киллмейлы",
      map:"Карта (vis-network)", saveMap:"Сохранить карту", loadMap:"Загрузить карту", actions:"Действия",
      authInfo:"Авторизован: ", notAuth:"Не авторизован"},
  ua:{auth:"Авторизуватися (EVE SSO)", logout:"Вийти", zkbAuth:"Авторизація ZKB", saveLoc:"Зберегти локацію", clearRoute:"Очистити маршрут",
      loadZkb:"Завантажити кілли ZKB", searchPlaceholder:"Пошук персонажа або ID", lastKills:"Останні кіллмейли",
      map:"Карта (vis-network)", saveMap:"Зберегти карту", loadMap:"Завантажити карту", actions:"Дії",
      authInfo:"Авторизований: ", notAuth:"Не авторизований"}
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

// --- Обработчики кнопок и SSO ---
authBtn.addEventListener('click', ()=>{
  const state = Math.random().toString(36).substring(2);
  const url = `https://login.eveonline.com/v2/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=publicData esi-location.read_location.v1&state=${state}`;
  window.location.href = url;
});

logoutBtn.addEventListener('click', ()=>{
  accessToken=null; currentCharacter=null; zkbToken=null;
  localStorage.clear();
  authInfo.textContent = translations[currentLang].notAuth;
  authBtn.style.display='inline-block';
  logoutBtn.style.display='none';
  zkbAuthBtn.style.display='none';
  saveLocBtn.style.display='none';
  clearBtn.style.display='none';
  loadZkbBtn.style.display='none';
});

// --- Обработка редиректа после SSO ---
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
      const data = await resp.json();
      accessToken = data.access_token;
      currentCharacter = data.character;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('currentCharacter', JSON.stringify(currentCharacter));
      authInfo.textContent = translations[currentLang].authInfo + currentCharacter.CharacterName;
      authBtn.style.display='none';
      logoutBtn.style.display='inline-block';
      zkbAuthBtn.style.display='inline-block';
      saveLocBtn.style.display='inline-block';
      clearBtn.style.display='inline-block';
      loadZkbBtn.style.display='inline-block';
      nodes.clear(); edges.clear();
      nodes.add({ id: 1, label: "J114337", meta: "Текущая система" });
    }catch(e){ authInfo.textContent='Ошибка авторизации: '+e.message; console.error(e);}
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if(currentCharacter){
    // уже авторизован
    authInfo.textContent = translations[currentLang].authInfo + currentCharacter.CharacterName;
    authBtn.style.display='none';
    logoutBtn.style.display='inline-block';
    zkbAuthBtn.style.display='inline-block';
    saveLocBtn.style.display='inline-block';
    clearBtn.style.display='inline-block';
    loadZkbBtn.style.display='inline-block';
    nodes.clear(); edges.clear();
    nodes.add({ id: 1, label: "J114337", meta: "Текущая система" });
  }
}

handleRedirect();
setLanguage('ru');

langSelect.addEventListener('change', ()=>setLanguage(langSelect.value));
