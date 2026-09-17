const SUPABASE_URL = 'https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY = 'cellbound-remember-device';

const authStorage = {
  getItem(key) {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  },
  setItem(key, value) {
    const remember = localStorage.getItem(REMEMBER_KEY) === '1';
    const primary = remember ? localStorage : sessionStorage;
    const secondary = remember ? sessionStorage : localStorage;
    primary.setItem(key, value);
    secondary.removeItem(key);
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: authStorage,
    },
  },
);

const shell = document.querySelector('.creator-shell');
const preview = document.getElementById('character-preview');
const nameInput = document.getElementById('character-name');
const nameCount = document.getElementById('name-count');
const previewName = document.getElementById('preview-name');
const previewPath = document.getElementById('preview-path');
const creatorMessage = document.getElementById('creator-message');
const bindButton = document.getElementById('bind-character');
const randomiseButton = document.getElementById('randomise');
const signOutButton = document.getElementById('sign-out');
const boundOverlay = document.getElementById('bound-overlay');
const boundName = document.getElementById('bound-name');
const boundDescription = document.getElementById('bound-description');
const continueTutorial = document.getElementById('continue-tutorial');

const pathCopy = {
  melee: { title: 'Vanguard', label: 'Melee', description: 'Your Vanguard binding has awakened Melee.' },
  ranged: { title: 'Ranger', label: 'Ranged', description: 'Your Ranger binding has awakened Ranged.' },
  magic: { title: 'Arcanist', label: 'Magic', description: 'Your Arcanist binding has awakened Magic.' },
};

const state = {
  user: null,
  characterId: null,
  build: 'balanced',
  face: 'one',
  hair: 'cropped',
  skin: '#dca27f',
  hairColor: '#171a1a',
  path: 'melee',
};

const choiceValues = {
  build: ['lean', 'balanced', 'broad'],
  face: ['one', 'two', 'three', 'four'],
  hair: ['cropped', 'swept', 'long', 'braided'],
  skin: ['#f1c7aa', '#dca27f', '#b97655', '#8b533d', '#5e382d'],
  hairColor: ['#171a1a', '#4a2e24', '#9b7650', '#c7b17b', '#712f2b'],
  path: ['melee', 'ranged', 'magic'],
};

function setMessage(text = '', tone = 'info') {
  creatorMessage.textContent = text;
  creatorMessage.dataset.tone = tone;
}

function cleanName(value) {
  return value.replace(/[^a-zA-ZÀ-ÿ' -]/g, '').replace(/\s{2,}/g, ' ').slice(0, 18);
}

function isValidName(value) {
  const name = value.trim();
  return name.length >= 3 && name.length <= 18 && /^[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ' -]*$/.test(name);
}

function updateName() {
  const cleaned = cleanName(nameInput.value);
  if (cleaned !== nameInput.value) nameInput.value = cleaned;
  nameCount.textContent = `${cleaned.length} / 18`;
  previewName.textContent = cleaned.trim() ? cleaned.trim().toUpperCase() : 'UNBOUND';
}

function applyStateToPreview() {
  preview.dataset.build = state.build;
  preview.dataset.face = state.face;
  preview.dataset.hair = state.hair;
  preview.dataset.path = state.path;
  preview.style.setProperty('--skin', state.skin);
  preview.style.setProperty('--hair', state.hairColor);
  previewPath.textContent = `${pathCopy[state.path].title} · ${pathCopy[state.path].label}`;

  document.querySelectorAll('[data-control]').forEach((group) => {
    const key = group.dataset.control;
    group.querySelectorAll('button[data-value]').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.value === state[key]);
    });
  });

  document.querySelectorAll('.path-card').forEach((card) => {
    const active = card.dataset.path === state.path;
    card.classList.toggle('is-active', active);
    const status = card.querySelector('.path-card__state');
    if (status) status.textContent = active ? 'BOUND' : 'CHOOSE';
  });
}

function selectControl(key, value) {
  if (!choiceValues[key]?.includes(value)) return;
  state[key] = value;
  applyStateToPreview();
}

function pick(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomiseAppearance() {
  state.build = pick(choiceValues.build);
  state.face = pick(choiceValues.face);
  state.hair = pick(choiceValues.hair);
  state.skin = pick(choiceValues.skin);
  state.hairColor = pick(choiceValues.hairColor);
  applyStateToPreview();
}

function setBusy(busy) {
  bindButton.disabled = busy;
  randomiseButton.disabled = busy;
  const label = bindButton.querySelector('span');
  if (label) label.textContent = busy ? 'BINDING…' : 'BIND THIS CHARACTER';
}

function loadAppearance(appearance = {}) {
  for (const key of ['build', 'face', 'hair', 'skin', 'hairColor']) {
    if (choiceValues[key].includes(appearance[key])) state[key] = appearance[key];
  }
}

async function loadExistingCharacter() {
  const { data, error } = await supabaseClient
    .from('characters')
    .select('id,name,combat_style,appearance,creation_complete')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Character load failed:', error.message);
    setMessage('Could not load your character. You can still create one.', 'error');
    return;
  }

  if (!data) return;

  state.characterId = data.id;
  nameInput.value = data.name || '';
  if (choiceValues.path.includes(data.combat_style)) state.path = data.combat_style;
  loadAppearance(data.appearance || {});
  updateName();
  applyStateToPreview();

  if (data.creation_complete) {
    setMessage('Your current character is loaded. Changes here will update its appearance.', 'info');
  }
}

async function saveCharacter() {
  const name = nameInput.value.trim();
  if (!isValidName(name)) {
    setMessage('Choose a valid character name between 3 and 18 characters.', 'error');
    nameInput.focus();
    return;
  }

  setMessage('Binding your character…');
  setBusy(true);

  const payload = {
    user_id: state.user.id,
    name,
    combat_style: state.path,
    appearance: {
      build: state.build,
      face: state.face,
      hair: state.hair,
      skin: state.skin,
      hairColor: state.hairColor,
    },
    creation_complete: true,
    updated_at: new Date().toISOString(),
  };

  let response;
  if (state.characterId) {
    response = await supabaseClient
      .from('characters')
      .update(payload)
      .eq('id', state.characterId)
      .eq('user_id', state.user.id)
      .select('id')
      .single();
  } else {
    response = await supabaseClient
      .from('characters')
      .insert(payload)
      .select('id')
      .single();
  }

  setBusy(false);

  if (response.error) {
    console.error('Character bind failed:', response.error.message);
    setMessage(response.error.message || 'The binding failed. Try again.', 'error');
    return;
  }

  state.characterId = response.data.id;
  setMessage('Binding complete.', 'success');
  shell.classList.add('is-flash');
  window.setTimeout(() => shell.classList.remove('is-flash'), 700);

  boundName.textContent = `${name}, the ${pathCopy[state.path].title}.`;
  boundDescription.textContent = `${pathCopy[state.path].description} The rest must be earned.`;
  window.setTimeout(() => {
    boundOverlay.hidden = false;
  }, 280);
}

document.querySelectorAll('[data-control]').forEach((group) => {
  group.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    selectControl(group.dataset.control, button.dataset.value);
  });
});

document.getElementById('path-options')?.addEventListener('click', (event) => {
  const card = event.target.closest('.path-card');
  if (!card) return;
  selectControl('path', card.dataset.path);
});

nameInput.addEventListener('input', updateName);
randomiseButton.addEventListener('click', randomiseAppearance);
bindButton.addEventListener('click', saveCharacter);

signOutButton.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.replace('./index.html');
});

continueTutorial.addEventListener('click', () => {
  boundOverlay.hidden = true;
  setMessage('Character complete. The tutorial is the next Cellbound system to build.', 'success');
});

(async () => {
  applyStateToPreview();
  updateName();

  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.user) {
    window.location.replace('./index.html');
    return;
  }

  state.user = data.session.user;
  await loadExistingCharacter();
})();
