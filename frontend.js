const backendUrl = 'https://eve-proxy.onrender.com';

const loginBtn = document.getElementById('loginBtn');
const characterNameSpan = document.getElementById('characterName');
const characterContainer = document.getElementById('characterContainer');
const characterIdInput = document.getElementById('characterIdInput');
const loadRouteBtn = document.getElementById('loadRouteBtn');
const addStepBtn = document.getElementById('addStepBtn');
const loadZKBBtn = document.getElementById('loadZKBBtn');

const stepsContainer = document.getElementById('stepsContainer');
const sysTypeInput = document.getElementById('sysType');
const sysIdInput = document.getElementById('sysId');
const sysEffectInput = document.getElementById('sysEffect');
const sysStaticsInput = document.getElementById('sysStatics');
const updateSystemBtn = document.getElementById('updateSystemBtn');
const addSystemBtn = document.getElementById('addSystemBtn');

const canvas = document.getElementById('connectionsCanvas');
const ctx = canvas.getContext('2d');
const debugDiv = document.getElementById('debug');
const zkbContainer = document.getElementById('zkbContainer');

let accessToken = null;
let currentCharacter = null;
let currentCharacterId = null;
let currentRoute = { steps: [] };
let selectedStep = null;
let selectedSystem = null;

function logDebug(msg){ debugDiv.textContent += msg+'\n'; }

// --- Login ---
loginBtn.addEventListener('click', ()=>{
  const clientId = '5a40c55151c241e3a007f2562fd4e1dd';
  const redirectUri = 'https://somrafallen.github.io/eve-wh-map/';
  const scopes = ['publicData','esi-location.read_location.v1','esi-skills.read_skills.v1'];
  const url = `https://login.eveonline.com/v2/oauth/authorize/?response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&client_id=${clientId}&scope=${encodeURIComponent(scopes.join(' '))}`;
  window.location.href = url;
});

// --- Check URL for code ---
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
if(code){
  fetch(`${backendUrl}/exchange`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ code })
  })
  .then(r=>r.json())
  .then(data=>{
    if(data.access_token){
      accessToken = data.access_token;
      currentCharacter = data.character;
      currentCharacterId = currentCharacter.CharacterID;
      characterNameSpan.textContent = currentCharacter.CharacterName;
      characterContainer.style.display='block';
      logDebug(`Logged in as ${currentCharacter.CharacterName}`);
      loadRoute();
    } else logDebug(JSON.stringify(data));
  })
  .catch(e=>logDebug(e));
}

// --- Resize canvas ---
function resizeCanvas(){
  const rect = stepsContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.left = rect.left + window.scrollX + 'px';
  canvas.style.top = rect.top + window.scrollY + 'px';
}
window.addEventListener('resize', resizeCanvas);

// --- Load/Save Route ---
loadRouteBtn.addEventListener('click', loadRoute);

async function loadRoute(){
  if(!currentCharacterId) return;
  try{
    const resp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    currentRoute = await resp.json();
    renderSteps();
    logDebug('Route loaded');
  }catch(e){ logDebug(`Error: ${e}`); }
}

async function saveRoute(){
  if(!currentCharacterId) return;
  try{
    await fetch(`${backendUrl}/route/${currentCharacterId}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  }catch(e){ logDebug(e); }
}

// --- Steps & Systems ---
addStepBtn.addEventListener('click', ()=>{
  const nextStep = currentRoute.steps.length+1;
  currentRoute.steps.push({ step: nextStep, systems: [] });
  renderSteps();
  saveRoute();
});

addSystemBtn.addEventListener('click', ()=>{
  if(!selectedStep) return;
  const newSys = { id:`New${selectedStep.systems.length+1}`, type:'WH', effect:'', statics:[] };
  selectedStep.systems.push(newSys);
  selectedSystem = newSys;
  sysTypeInput.value = newSys.type;
  sysIdInput.value = newSys.id;
  sysEffectInput.value = '';
  sysStaticsInput.value = '';
  renderSteps();
  saveRoute();
});

updateSystemBtn.addEventListener('click', ()=>{
  if(!selectedSystem) return;
  selectedSystem.type = sysTypeInput.value;
  selectedSystem.id = sysIdInput.value.trim();
  selectedSystem.effect = sysEffectInput.value.trim();
  selectedSystem.statics = sysStaticsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
  renderSteps();
  saveRoute();
});

function renderSteps(){
  stepsContainer.innerHTML='';
  selectedStep = null;
  selectedSystem = null;
  currentRoute.steps.forEach((step)=>{
    const stepDiv = document.createElement('div');
    stepDiv.className='stepBox';
    step.systems.forEach(sys=>{
      const sysDiv = document.createElement('div');
      sysDiv.className='systemBox';
      sysDiv.textContent = sys.type==='WH'?`J${sys.id}`:sys.id;
      sysDiv.addEventListener('click', ()=>{
        selectedStep = step;
        selectedSystem = sys;
        sysTypeInput.value = sys.type;
        sysIdInput.value = sys.id;
        sysEffectInput.value = sys.effect;
        sysStaticsInput.value = (sys.statics||[]).join(',');
        renderSteps();
      });
      stepDiv.appendChild(sysDiv);
    });
    stepsContainer.appendChild(stepDiv);
  });
  setTimeout(()=>{
    resizeCanvas();
    drawConnections();
  },0);
}

// --- Connections ---
function drawConnections(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  currentRoute.steps.forEach(step=>{
    step.systems.forEach((sys,i)=>{
      if(i===0) return;
      const prev = findSystemDiv(step.systems[i-1]);
      const curr = findSystemDiv(sys);
      if(!prev || !curr) return;
      const x1 = prev.offsetLeft + prev.offsetWidth/2;
      const y1 = prev.offsetTop + prev.offsetHeight/2;
      const x2 = curr.offsetLeft + curr.offsetWidth/2;
      const y2 = curr.offsetTop + curr.offsetHeight/2;
      ctx.strokeStyle='#ffcc00';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.stroke();
    });
  });
}
function findSystemDiv(sys){
  const all = document.querySelectorAll('.systemBox');
  return Array.from(all).find(d=>d.textContent.startsWith(sys.type==='WH'?`J${sys.id}`:sys.id));
}

// --- ZKB Search ---
loadZKBBtn.addEventListener('click', ()=>{
  const charId = characterIdInput.value.trim();
  if(!charId) return;
  zkbContainer.innerHTML = `<iframe src="https://zkillboard.com/character/${charId}"></iframe>`;
});
