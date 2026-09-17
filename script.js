const passwordInput = document.getElementById('password');
const togglePassword = document.getElementById('toggle-password');
const loginForm = document.getElementById('login-form');
const loginMessage = document.getElementById('login-message');

togglePassword?.addEventListener('click', () => {
  const showing = passwordInput.type === 'text';
  passwordInput.type = showing ? 'password' : 'text';
  togglePassword.textContent = showing ? 'Show' : 'Hide';
});

loginForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  loginMessage.hidden = false;
  loginMessage.textContent = 'Account authentication is ready to be connected.';
});
