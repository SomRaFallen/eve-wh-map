const backendUrl = 'https://eve-proxy.onrender.com';

const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');

const stepsContainer = document.getElementById('stepsContainer');
const canvas = document.getElementById('connectionsCanvas');
const ctx = canvas.getContext('2d');

const sysIdInput = document.getElementById('sysId');
const sysClassInput = document.getElementById('sysClass');
const sysEffectInput = document.getElementById('sysEffect');
const sysStaticsInput = document.getElementById('sysStatics');
const updateSystemBtn = document.getElementById('updateSystemBtn');
const addSystemBtn = document.getElementById('addSystemBtn');

const debugDiv = document.getElementById('debug');

let currentCharacterId = null;
let currentRoute = { steps: [] };
let selectedStep = null;
let selectedSystem = null;

// --- Utility ---
function logDebug(msg){ debugDiv.textContent += msg+'\n'; }

function resizeCanvas(){
  canvas.width = stepsContainer.scrollWidth + 100;
  canvas.height = stepsContainer.scrollHeight + 100;
}

// --- Load Route ---
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
  }catch(e){ logDebug(`Error: ${e}`); }
}

// --- Render Steps and Systems ---
function renderSteps(){
  stepsContainer.innerHTML='';
  selectedStep = null;
  selectedSystem = null;
  resizeCanvas();
  currentRoute.steps.forEach((step,i)=>{
    const stepDiv = document.createElement('div');
    stepDiv.className='stepBox';
    stepDiv.dataset.stepIndex = i;
    const h3 = document.createElement('h3');
    h3.textContent = `Step ${step.step}`;
    stepDiv.appendChild(h3);

    step.systems.forEach((sys,j)=>{
      const sysDiv = document.createElement('div');
      sysDiv.className='systemBox';
      sysDiv.textContent = sys.id;

      sysDiv.addEventListener('click', ()=>{
        selectedStep = step;
        selectedSystem = sys;
        sysIdInput.value = sys.id || '';
        sysClassInput.value = sys.class || '';
        sysEffectInput.value = sys.effect || '';
        sysStaticsInput.value = (sys.statics||[]).join(',');
        renderSteps();
      });

      stepDiv.appendChild(sysDiv);
    });

    stepsContainer.appendChild(stepDiv);
  });
  drawConnections();
}

// --- Draw Connections ---
function drawConnections(){
  resizeCanvas();
  ctx.clearRect(0,0,canvas.width,canvas.height);

  currentRoute.steps.forEach((step,i)=>{
    const stepDiv = stepsContainer.children[i];
    step.systems.forEach((sys,j)=>{
      const sysDiv = stepDiv.children[j+1];
      const rect = sysDiv.getBoundingClientRect();
      const parentRect = stepsContainer.getBoundingClientRect();
      sys._x = rect.left + rect.width/2 - parentRect.left;
      sys._y = rect.top + rect.height/2 - parentRect.top;

      // connect to next step's first system (basic linear connection)
      if(i < currentRoute.steps.length-1 && currentRoute.steps[i+1].systems[0]){
        const nextSys = currentRoute.steps[i+1].systems[0];
        ctx.strokeStyle='#ffcc00';
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(sys._x, sys._y);
        ctx.lineTo(nextSys._x, nextSys._y);
        ctx.stroke();
      }

      // draw additional arrows if statics defined (for cycles)
      (sys.statics||[]).forEach(staticId=>{
        const target = findSystemById(staticId);
        if(target){
          ctx.strokeStyle='#00ccff';
          ctx.beginPath();
          ctx.moveTo(sys._x, sys._y);
          ctx.lineTo(target._x, target._y);
          ctx.stroke();
        }
      });
    });
  });
}

// --- Helpers ---
function findSystemById(id){
  for(const step of currentRoute.steps){
    for(const sys of step.systems){
      if(sys.id===id) return sys;
    }
  }
  return null;
}

// --- Update System ---
updateSystemBtn.addEventListener('click', ()=>{
  if(!selectedSystem) return;
  selectedSystem.id = sysIdInput.value.trim();
  selectedSystem.class = sysClassInput.value.trim();
  selectedSystem.effect = sysEffectInput.value.trim();
  selectedSystem.statics = sysStaticsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
  renderSteps();
  saveRoute();
});

// --- Add System ---
addSystemBtn.addEventListener('click', ()=>{
  if(!selectedStep) return;
  const nextId = selectedStep.step*10 + selectedStep.systems.length + 1;
  const newSys = { id: nextId.toString(), class:'', effect:'', statics:[] };
  selectedStep.systems.push(newSys);
  selectedSystem = newSys;
  sysIdInput.value = newSys.id;
  sysClassInput.value = '';
  sysEffectInput.value = '';
  sysStaticsInput.value = '';
  renderSteps();
  saveRoute();
});

// --- Save Route ---
async function saveRoute(){
  if(!currentCharacterId) return;
  try{
    await fetch(`${backendUrl}/route/${currentCharacterId}`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(currentRoute)
    });
    logDebug('Route saved');
  }catch(e){ logDebug(`Error saving: ${e}`); }
}

// --- Add Step (double click) ---
loadCharacterBtn.addEventListener('dblclick', ()=>{
  const nextStep = currentRoute.steps.length + 1;
  currentRoute.steps.push({ step: nextStep, systems: [] });
  renderSteps();
  saveRoute();
});
