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

const debugDiv = document.getElementById('debug');

let currentCharacterId = null;
let currentRoute = { steps: [] };
let selectedStep = null;
let selectedSystem = null;

function logDebug(msg){ debugDiv.textContent += msg+'\n'; }

// --- Load route ---
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

// --- Render steps ---
function renderSteps(){
  stepsContainer.innerHTML='';
  selectedStep = null;
  selectedSystem = null;

  currentRoute.steps.forEach((step,i)=>{
    const stepDiv = document.createElement('div');
    stepDiv.className='stepBox';
    const h3 = document.createElement('h3');
    h3.textContent = `Step ${step.step}`;
    stepDiv.appendChild(h3);

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
}

// --- Format system text based on type ---
function formatSystemText(sys){
  if(sys.type==='WH') return `J${sys.id}`;
  if(sys.type==='Low' || sys.type==='High') return `${sys.id} | ${sys.effect || ''}`;
  return sys.id;
}

// --- Update system ---
updateSystemBtn.addEventListener('click', ()=>{
  if(!selectedSystem) return;
  selectedSystem.type = sysTypeInput.value;
  selectedSystem.id = sysIdInput.value.trim();
  selectedSystem.effect = sysEffectInput.value.trim();
  selectedSystem.statics = sysStaticsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
  renderSteps();
  saveRoute();
});

// --- Add system ---
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

// --- Add step ---
addStepBtn.addEventListener('click', ()=>{
  const nextStep = currentRoute.steps.length + 1;
  currentRoute.steps.push({ step: nextStep, systems: [] });
  renderSteps();
  saveRoute();
});

// --- Save route ---
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
});
