const backendUrl = 'https://eve-proxy.onrender.com';

const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');
const addStepBtn = document.getElementById('addStepBtn');
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

let currentCharacterId = null;
let currentRoute = { steps: [] };
let selectedStep = null;
let selectedSystem = null;

function logDebug(msg){ debugDiv.textContent += msg+'\n'; }

function resizeCanvas(){
  const rect = stepsContainer.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.left = rect.left + window.scrollX + 'px';
  canvas.style.top = rect.top + window.scrollY + 'px';
}
window.addEventListener('resize', resizeCanvas);

// Load route
loadCharacterBtn.addEventListener('click', ()=>{
  const id = characterIdInput.value.trim();
  if(!id) return;
  currentCharacterId = id;
  loadRoute();
});

async function loadRoute(){
  if(!currentCharacterId) return;
  try{
    const resp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    currentRoute = await resp.json();
    renderSteps();
    logDebug(`Loaded route for ${currentCharacterId}`);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

function renderSteps(){
  stepsContainer.innerHTML='';
  selectedStep = null;
  selectedSystem = null;

  currentRoute.steps.forEach((step,i)=>{
    const stepDiv = document.createElement('div');
    stepDiv.className='stepBox';

    step.systems.forEach(sys=>{
      const sysDiv = document.createElement('div');
      sysDiv.className='systemBox';
      sysDiv.textContent = formatSystemText(sys);

      sysDiv.addEventListener('click', ()=>{
        selectedStep = step;
        selectedSystem = sys;
        sysTypeInput.value = sys.type || 'WH';
        sysIdInput.value = sys.id || '';
        sysEffectInput.value = sys.effect || '';
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

function formatSystemText(sys){
  if(sys.type==='WH') return `J${sys.id}`;
  if(sys.type==='Low' || sys.type==='High') return `${sys.id}`;
  return sys.id;
}

// Update system
updateSystemBtn.addEventListener('click', ()=>{
  if(!selectedSystem) return;
  selectedSystem.type = sysTypeInput.value;
  selectedSystem.id = sysIdInput.value.trim();
  selectedSystem.effect = sysEffectInput.value.trim();
  selectedSystem.statics = sysStaticsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
  renderSteps();
  saveRoute();
});

// Add system
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

// Add step
addStepBtn.addEventListener('click', ()=>{
  const nextStep = currentRoute.steps.length + 1;
  currentRoute.steps.push({ step: nextStep, systems: [] });
  renderSteps();
  saveRoute();
});

// Draw connections
function drawConnections(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  currentRoute.steps.forEach(step=>{
    step.systems.forEach((sys,i)=>{
      if(i===0) return;
      const prevSysDiv = findSystemDiv(step.systems[i-1]);
      const currSysDiv = findSystemDiv(sys);
      if(!prevSysDiv || !currSysDiv) return;

      const startX = prevSysDiv.offsetLeft + prevSysDiv.offsetWidth/2;
      const startY = prevSysDiv.offsetTop + prevSysDiv.offsetHeight/2;
      const endX = currSysDiv.offsetLeft + currSysDiv.offsetWidth/2;
      const endY = currSysDiv.offsetTop + currSysDiv.offsetHeight/2;

      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(startX,startY);
      ctx.lineTo(endX,endY);
      ctx.stroke();
    });
  });
}

function findSystemDiv(sys){
  const all = document.querySelectorAll('.systemBox');
  return Array.from(all).find(div=>div.textContent.startsWith(formatSystemText(sys)));
}

// Save route
async function saveRoute(){
  if(!currentCharacterId) return;
  try{
    await fetch(`${backendUrl}/route/${currentCharacterId}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  }catch(e){ logDebug(`Error saving route: ${e}`); }
}
