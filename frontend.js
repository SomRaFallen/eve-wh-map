const backendUrl = 'https://eve-proxy.onrender.com';

const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');

const stepsContainer = document.getElementById('stepsContainer');

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

function logDebug(msg){ debugDiv.textContent += msg+'\n'; }

// --- Загрузка персонажа ---
loadCharacterBtn.addEventListener('click', ()=>{
  const id = characterIdInput.value.trim();
  if(!id) return;
  currentCharacterId = id;
  loadRoute();
});

// --- Загрузка маршрута ---
async function loadRoute(){
  if(!currentCharacterId) return;
  try{
    const resp = await fetch(`${backendUrl}/route/${currentCharacterId}`);
    if(!resp.ok) throw new Error(`HTTP error ${resp.status}`);
    currentRoute = await resp.json();
    renderSteps();
    logDebug(`Loaded route for character ${currentCharacterId}`);
  }catch(e){ logDebug(`Error loading route: ${e}`); }
}

// --- Рендер ступеней с визуализацией ---
function renderSteps(){
  stepsContainer.innerHTML='';
  currentRoute.steps.forEach((step, i)=>{
    const stepDiv = document.createElement('div');
    stepDiv.className='stepBox';
    const h3 = document.createElement('h3');
    h3.textContent = `Step ${step.step}`;
    stepDiv.appendChild(h3);

    step.systems.forEach(sys=>{
      const sysDiv = document.createElement('div');
      sysDiv.className='systemBox';
      sysDiv.textContent = sys.id;
      if(selectedSystem===sys) sysDiv.classList.add('selected');

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

    // --- Рисуем стрелки к следующей ступени ---
    if(i < currentRoute.steps.length - 1){
      const nextStepDiv = document.createElement('div');
      nextStepDiv.className='arrow';
      const rect1 = stepDiv.getBoundingClientRect();
      const rect2 = stepDiv.nextSibling.getBoundingClientRect();
      stepDiv.style.position='relative';
    }
  });
}

// --- Обновление системы ---
updateSystemBtn.addEventListener('click', ()=>{
  if(!selectedSystem) return;
  selectedSystem.id = sysIdInput.value.trim();
  selectedSystem.class = sysClassInput.value.trim();
  selectedSystem.effect = sysEffectInput.value.trim();
  selectedSystem.statics = sysStaticsInput.value.split(',').map(s=>s.trim()).filter(s=>s);
  renderSteps();
  saveRoute();
});

// --- Добавление системы ---
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

// --- Сохранение маршрута ---
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

// --- Добавление ступени (по двойному клику) ---
loadCharacterBtn.addEventListener('dblclick', ()=>{
  const nextStep = currentRoute.steps.length + 1;
  currentRoute.steps.push({ step: nextStep, systems: [] });
  renderSteps();
  saveRoute();
});
