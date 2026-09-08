// Sawmill auth helpers (Supabase Auth) — public anon key only.
// Solid session: single ready Promise, one onAuthStateChange listener, JS-only chip.
const SAWMILL_AUTH = (() => {
  const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'https://cpgluhmswxgxakjfigsw.supabase.co';
  const anon = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : 'sb_publishable_9-mWecLyoWN-l9uXl85PzA__qDiyiY8';

  let client = null;
  let session = null;
  let listeners = [];
  let readyPromise = null;
  let authListenerBound = false;
  let chipBound = false;

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

  /**
   * Idempotent init. Returns the same ready Promise every time.
   * Wires onAuthStateChange exactly once.
   */
  function init() {
    if (readyPromise) return readyPromise;

    readyPromise = (async () => {
      const c = getClient();
      const { data } = await c.auth.getSession();
      session = data.session || null;

      if (!authListenerBound) {
        authListenerBound = true;
        c.auth.onAuthStateChange((_event, next) => {
          session = next || null;
          notify();
        });
      }

      notify();
      return session;
    })();

    return readyPromise;
  }

  function whenReady() {
    return init();
  }

  async function signIn(email, password) {
    await init();
    const c = getClient();
    const { data, error } = await c.auth.signInWithPassword({
      email: String(email || '').trim(),
      password,
    });
    if (error) throw error;
    session = data.session;
    notify();
    return data;
  }

  async function signOut() {
    await init();
    const c = getClient();
    const { error } = await c.auth.signOut();
    if (error) throw error;
    session = null;
    notify();
  }

  async function updateProfile(displayName) {
    await init();
    const c = getClient();
    const { data, error } = await c.auth.updateUser({
      data: { display_name: (displayName || '').trim() },
    });
    if (error) throw error;
    if (session) session.user = data.user;
    notify();
    return data.user;
  }

  function avatarInitials(user) {
    const name = displayNameFromUser(user) || '?';
    const parts = name.replace(/@.*/, '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
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

    const avatar = document.getElementById('auth-avatar');
    const chipLabel = document.getElementById('auth-chip-label');
    const chip = document.getElementById('auth-chip');
    if (avatar) {
      if (loggedIn) {
        avatar.innerHTML = '';
        avatar.textContent = avatarInitials(user);
      } else {
        avatar.textContent = '';
        avatar.innerHTML = '<i class="fa-solid fa-user"></i>';
      }
      avatar.classList.toggle('auth-avatar--in', loggedIn);
    }
    if (chipLabel) {
      if (loggedIn) {
        const short = label.length > 14 ? label.slice(0, 13) + '…' : label;
        chipLabel.textContent = short || tAuth('nav-account', 'Akun');
        chipLabel.classList.remove('lang-text');
        chipLabel.removeAttribute('data-id');
      } else {
        chipLabel.textContent = tAuth('nav-login', 'Masuk');
        chipLabel.classList.add('lang-text');
        chipLabel.setAttribute('data-id', 'nav-login');
      }
    }
    if (chip) {
      chip.classList.toggle('auth-chip--in', loggedIn);
      chip.setAttribute(
        'aria-label',
        loggedIn ? tAuth('nav-account', 'Akun') : tAuth('nav-login', 'Masuk')
      );
    }
  }

  function safeNextUrl(raw) {
    if (!raw) return '';
    try {
      const decoded = decodeURIComponent(String(raw));
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(decoded) || decoded.startsWith('//')) return '';
      if (decoded.startsWith('/') && !decoded.startsWith('//')) return decoded;
      if (decoded.startsWith('./') || decoded.startsWith('../') || /^[A-Za-z0-9_./?#&=%-]+$/.test(decoded)) {
        return decoded;
      }
    } catch (_) {}
    return '';
  }

  function loginPageUrl(next) {
    let href = 'login.html';
    if (next) href += '?next=' + encodeURIComponent(next);
    return href;
  }

  function accountPageUrl() {
    return 'account.html';
  }

  function goHome() {
    window.location.href = './';
  }

  function goLogin(next) {
    window.location.href = loginPageUrl(next || undefined);
  }

  function goAccount() {
    window.location.href = accountPageUrl();
  }

  function requireLogin(sectionId) {
    if (isLoggedIn()) return true;
    let next = './';
    if (sectionId) next = './#' + encodeURIComponent(sectionId);
    goLogin(next);
    return false;
  }

  async function handleChipClick(ev) {
    if (ev) ev.preventDefault();
    try {
      await init();
    } catch (_) {
      goLogin();
      return;
    }
    if (isLoggedIn()) goAccount();
    else goLogin();
  }

  function bindAuthChip() {
    const chip = document.getElementById('auth-chip');
    if (!chip || chipBound) return;
    chipBound = true;
    chip.addEventListener('click', handleChipClick);
  }


  // Public API — admin-provisioned accounts only (no public signup)
  return {
    getClient,
    init,
    whenReady,
    get ready() { return readyPromise || init(); },
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
    safeNextUrl,
    loginPageUrl,
    accountPageUrl,
    goHome,
    goLogin,
    goAccount,
    handleChipClick,
    bindAuthChip,
  };
})();

(function bootstrapAuth() {
  function run() {
    if (typeof SAWMILL_AUTH.bindAuthChip === 'function') SAWMILL_AUTH.bindAuthChip();
    if (document.getElementById('auth-chip')) {
      SAWMILL_AUTH.init()
        .then(function () {
          var hash = (window.location.hash || '').replace(/^#/, '');
          if (hash && typeof showSection === 'function') {
            showSection(hash, null);
          }
        })
        .catch(function () {});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
