const SUPABASE_URL = 'https://jvydqeikdpelmtloulnd.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_R79iqkCPo4hRgXNNzzTmAg_ODAiA1fl';
const REMEMBER_KEY = 'cellbound-remember-device';

const passwordInput = document.getElementById('password');
const emailInput = document.getElementById('email');
const togglePassword = document.getElementById('toggle-password');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');
const loginIntro = document.getElementById('login-intro');
const forgotPassword = document.getElementById('forgot-password');
const createAccount = document.getElementById('create-account');
const rememberDevice = document.getElementById('remember-device');
const enterButton = document.getElementById('enter-button');
const enterButtonLabel = enterButton?.querySelector('span');

let recoveryMode = false;
let routingToCharacter = false;

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

function setMessage(message, tone = 'info') {
  loginMessage.hidden = false;
  loginMessage.dataset.tone = tone;
  loginMessage.textContent = message;
}

function clearMessage() {
  loginMessage.hidden = true;
  loginMessage.textContent = '';
  delete loginMessage.dataset.tone;
}

function setBusy(busy, label = 'ENTER THE WORLD') {
  enterButton.disabled = busy;
  createAccount.disabled = busy;
  forgotPassword.disabled = busy;
  if (enterButtonLabel) enterButtonLabel.textContent = busy ? 'CONNECTING…' : label;
}

function setRememberPreference() {
  localStorage.setItem(REMEMBER_KEY, rememberDevice.checked ? '1' : '0');
}

function validateCredentials({ requirePassword = true } = {}) {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !emailInput.validity.valid) {
    setMessage('Enter a valid email address.', 'error');
    emailInput.focus();
    return null;
  }

  if (requirePassword && password.length < 6) {
    setMessage('Your password must be at least 6 characters.', 'error');
    passwordInput.focus();
    return null;
  }

  return { email, password };
}

async function ensureProfile(user) {
  if (!user?.id) return;

  const { error } = await supabaseClient
    .from('profiles')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' });

  if (error) {
    console.error('Could not ensure Cellbound profile:', error.message);
  }
}

function enterAuthenticatedState(user) {
  if (routingToCharacter || recoveryMode) return;
  routingToCharacter = true;
  const player = user?.email || 'player';
  setMessage(`Welcome back, ${player}. Entering the bound world…`, 'success');
  setBusy(true);
  window.setTimeout(() => window.location.replace('./character.html'), 450);
}

function friendlyAuthError(error) {
  const message = error?.message || 'Something went wrong.';
  if (/invalid login credentials/i.test(message)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email before entering Cellbound.';
  if (/user already registered/i.test(message)) return 'That email already has a Cellbound account.';
  if (/email address not authorized|email_address_not_authorized/i.test(message)) {
    return 'Supabase is still using its restricted test email service. For now, use the email address that owns the Supabase project, or configure a custom SMTP provider for public signups.';
  }
  if (/redirect/i.test(message) && /allow|authoriz|invalid/i.test(message)) {
    return 'The signup redirect is not allowed yet. I have removed that dependency from new account creation.';
  }
  if (/rate limit/i.test(message)) return 'Too many attempts. Try again shortly.';
  return message;
}

togglePassword?.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePassword.textContent = showing ? 'Show' : 'Hide';
});

loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage();

  if (recoveryMode) {
    const password = passwordInput.value;
    if (password.length < 6) {
      setMessage('Your new password must be at least 6 characters.', 'error');
      return;
    }

    setBusy(true, 'SET NEW PASSWORD');
    const { error } = await supabaseClient.auth.updateUser({ password });
    setBusy(false, 'ENTER THE WORLD');

    if (error) {
      setMessage(friendlyAuthError(error), 'error');
      return;
    }

    recoveryMode = false;
    passwordInput.autocomplete = 'current-password';
    loginIntro.textContent = 'Sign in to continue your journey.';
    setMessage('Password updated. You are signed in.', 'success');
    return;
  }

  const credentials = validateCredentials();
  if (!credentials) return;

  setRememberPreference();
  setBusy(true);

  const { data, error } = await supabaseClient.auth.signInWithPassword(credentials);

  if (error) {
    setBusy(false);
    setMessage(friendlyAuthError(error), 'error');
    return;
  }

  await ensureProfile(data.user);
  enterAuthenticatedState(data.user);
});

createAccount?.addEventListener('click', async () => {
  clearMessage();
  const credentials = validateCredentials();
  if (!credentials) return;

  setRememberPreference();
  setBusy(true);

  // Do not force a redirect URL here. A new Supabase project rejects
  // un-allow-listed redirects before an account can be created.
  const { data, error } = await supabaseClient.auth.signUp(credentials);

  if (error) {
    console.error('Cellbound signup failed:', error);
    setBusy(false);
    setMessage(friendlyAuthError(error), 'error');
    return;
  }

  if (data.session && data.user) {
    await ensureProfile(data.user);
    enterAuthenticatedState(data.user);
    return;
  }

  setBusy(false);
  setMessage('Account created. Check your email to confirm it, then return to enter Cellbound.', 'success');
});

forgotPassword?.addEventListener('click', async () => {
  clearMessage();
  const credentials = validateCredentials({ requirePassword: false });
  if (!credentials) return;

  setBusy(true);
  const { error } = await supabaseClient.auth.resetPasswordForEmail(credentials.email);
  setBusy(false);

  if (error) {
    setMessage(friendlyAuthError(error), 'error');
    return;
  }

  setMessage('Password reset requested. Check your email for the recovery link.', 'success');
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    recoveryMode = true;
    routingToCharacter = false;
    loginIntro.textContent = 'Choose a new password for your Cellbound account.';
    passwordInput.value = '';
    passwordInput.autocomplete = 'new-password';
    passwordInput.focus();
    if (enterButtonLabel) enterButtonLabel.textContent = 'SET NEW PASSWORD';
    setMessage('Recovery link accepted. Enter your new password below.', 'info');
    return;
  }

  if (event === 'SIGNED_IN' && session?.user && !recoveryMode) {
    window.setTimeout(async () => {
      await ensureProfile(session.user);
      enterAuthenticatedState(session.user);
    }, 0);
  }
});

(async () => {
  rememberDevice.checked = localStorage.getItem(REMEMBER_KEY) === '1';

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('Cellbound session check failed:', error.message);
    return;
  }

  if (data.session?.user && !recoveryMode) {
    await ensureProfile(data.session.user);
    enterAuthenticatedState(data.session.user);
  }
})();
