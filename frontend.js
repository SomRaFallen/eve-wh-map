const characterIdInput = document.getElementById('characterIdInput');
const loadCharacterBtn = document.getElementById('loadCharacterBtn');
const zkbContainer = document.getElementById('zkbContainer');

loadCharacterBtn.addEventListener('click', () => {
  const id = characterIdInput.value.trim();
  if(!id) return;

  // Открываем zKillboard в iframe
  zkbContainer.innerHTML = `<iframe src="https://zkillboard.com/character/${encodeURIComponent(id)}/" width="100%" height="600"></iframe>`;
});
