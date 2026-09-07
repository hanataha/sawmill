// Sawmill auth helpers (Supabase Auth) — uses public anon key only
const SAWMILL_AUTH = (() => {
  const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'https://cpgluhmswxgxakjfigsw.supabase.co';
  const anon = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : 'sb_publishable_9-mWecLyoWN-l9uXl85PzA__qDiyiY8';

  let client = null;
  let session = null;
  let listeners = [];

  function getClient() {
    if (client) return client;
    if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
      throw new Error('Supabase library failed to load');
    }
    client = supabase.createClient(url, anon);
    return client;
  }

  function tAuth(key, fallback) {
    try {
      if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
        const val = translations[currentLang] && translations[currentLang][key];
        if (val) return val;
      }
    } catch (_) {}
    return fallback;
  }

  function displayNameFromUser(user) {
    if (!user) return '';
    const meta = user.user_metadata || {};
    return (meta.display_name || meta.full_name || meta.name || '').trim() || (user.email || '');
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn(session); } catch (_) {}
    });
    updateAuthUI();
  }

  function onAuthChange(fn) {
    listeners.push(fn);
  }

  function getSession() { return session; }
  function getUser() { return session && session.user ? session.user : null; }
  function isLoggedIn() { return !!(session && session.user); }

  async function init() {
    const c = getClient();
    const { data } = await c.auth.getSession();
    session = data.session || null;
    c.auth.onAuthStateChange((_event, next) => {
      session = next || null;
      notify();
    });
    notify();
    return session;
  }

  async function signUp(email, password, displayName) {
    const c = getClient();
    const { data, error } = await c.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: (displayName || '').trim() },
        emailRedirectTo: window.location.origin + window.location.pathname,
      },
    });
    if (error) throw error;
    session = data.session || session;
    notify();
    return data;
  }

  async function signIn(email, password) {
    const c = getClient();
    const { data, error } = await c.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    session = data.session;
    notify();
    return data;
  }

  async function signOut() {
    const c = getClient();
    const { error } = await c.auth.signOut();
    if (error) throw error;
    session = null;
    notify();
  }

  async function updateProfile(displayName) {
    const c = getClient();
    const { data, error } = await c.auth.updateUser({
      data: { display_name: (displayName || '').trim() },
    });
    if (error) throw error;
    if (session) session.user = data.user;
    notify();
    return data.user;
  }

  function updateAuthUI() {
    const loggedIn = isLoggedIn();
    document.querySelectorAll('[data-auth-visible="in"]').forEach((el) => {
      el.hidden = !loggedIn;
    });
    document.querySelectorAll('[data-auth-visible="out"]').forEach((el) => {
      el.hidden = loggedIn;
    });

    const nameEls = document.querySelectorAll('[data-auth-display-name]');
    const user = getUser();
    const label = user ? displayNameFromUser(user) : '';
    nameEls.forEach((el) => { el.textContent = label; });

    const emailEls = document.querySelectorAll('[data-auth-email]');
    emailEls.forEach((el) => { el.textContent = user && user.email ? user.email : ''; });

    const accountNameInput = document.getElementById('account-display-name');
    if (accountNameInput && user && document.activeElement !== accountNameInput) {
      accountNameInput.value = (user.user_metadata && user.user_metadata.display_name) || '';
    }
  }

  function requireLogin(sectionId) {
    if (isLoggedIn()) return true;
    if (typeof showSection === 'function') {
      showSection('login', new Event('click'));
    }
    const status = document.getElementById('login-status');
    if (status) {
      status.textContent = tAuth('auth-need-login', 'Silakan masuk dulu untuk membuat catatan.');
      status.style.color = 'var(--accent-amber)';
    }
    return false;
  }

  return {
    getClient,
    init,
    signUp,
    signIn,
    signOut,
    updateProfile,
    getSession,
    getUser,
    isLoggedIn,
    displayNameFromUser,
    onAuthChange,
    requireLogin,
    updateAuthUI,
    tAuth,
  };
})();
