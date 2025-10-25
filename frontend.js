const SERVER = 'https://eve-proxy.onrender.com'; // твой сервер Render
const CLIENT_ID = '5a40c55151c241e3a007f2562fd4e1dd';
const REDIRECT_URI = 'https://somrafallen.github.io/eve-wh-map/';

const authBtn = document.getElementById('authBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authInfo = document.getElementById('authInfo');
const zkbAuthBtn = document.getElementById('zkbAuthBtn');

let accessToken = null;
let currentCharacter = null;

// авторизация EVE SSO
authBtn.addEventListener('click', ()=>{
  const state = Math.random().toString(36).substring(2);
  const url = `https://login.eveonline.com/v2/oauth/authorize?response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=publicData esi-location.read_location.v1&state=${state}`;
  window.location.href = url;
});

// проверка редиректа
async function handleRedirect(){
  const params = new URLSearchParams(window.location.search);
  if(params.has('code')){
    const code = params.get('code');
    try{
      const resp = await fetch(`${SERVER}/exchange`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ code })
      });
      if(!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      accessToken = data.access_token;
      currentCharacter = data.character;
      authInfo.textContent = `Авторизован: ${currentCharacter.CharacterName}`;
      authBtn.style.display = 'none';
      logoutBtn.style.display = 'inline-block';
      zkbAuthBtn.style.display = 'inline-block';
    } catch(e){
      authInfo.textContent = 'Ошибка авторизации: '+e.message;
      console.error(e);
    }
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// кнопка выхода
logoutBtn.addEventListener('click', ()=>{
  accessToken = null;
  currentCharacter = null;
  authInfo.textContent = 'Не авторизован';
  authBtn.style.display = 'inline-block';
  logoutBtn.style.display = 'none';
  zkbAuthBtn.style.display = 'none';
});

// авторизация ZKB
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
    alert('ZKB авторизация успешна!');
  } catch(e){
    console.error(e);
    alert('Ошибка ZKB: '+e.message);
  }
});

// инициализация карты vis-network
const nodes = new vis.DataSet();
const edges = new vis.DataSet();
const container = document.getElementById('map');
const data = { nodes, edges };
const options = {
  nodes:{color:{background:'#f5d742', border:'#ffea75'}, font:{color:'#061137'}},
  edges:{color:'#f5d742', width:2},
  physics:{enabled:true, stabilization:true},
  manipulation:{enabled:true}
};
const network = new vis.Network(container, data, options);

handleRedirect();
