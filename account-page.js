(function () {
  async function handleAccountSave(event) {
    event.preventDefault();
    var status = document.getElementById('account-status');
    var btn = document.querySelector('#form-account button[type="submit"]');
    var name = (document.getElementById('account-display-name') || {}).value || '';

    if (status) {
      status.textContent = '';
      status.style.color = 'var(--text-muted)';
    }
    if (btn) btn.disabled = true;

    try {
      await SAWMILL_AUTH.init();
      await SAWMILL_AUTH.updateProfile(name);
      if (status) {
        status.textContent = SAWMILL_AUTH.tAuth('account-saved', 'Nama disimpan.');
        status.style.color = 'var(--accent-success)';
      }
      SAWMILL_AUTH.goHome();
    } catch (err) {
      if (status) {
        status.textContent =
          (err && err.message) ||
          SAWMILL_AUTH.tAuth('auth-error', 'Terjadi kesalahan autentikasi.');
        status.style.color = 'var(--accent-danger)';
      }
      if (btn) btn.disabled = false;
    }
  }

  async function handleSignOut() {
    var status = document.getElementById('account-status');
    var outBtn = document.getElementById('btn-signout');
    if (outBtn) outBtn.disabled = true;
    try {
      await SAWMILL_AUTH.init();
      await SAWMILL_AUTH.signOut();
      SAWMILL_AUTH.goHome();
    } catch (err) {
      if (status) {
        status.textContent =
          (err && err.message) ||
          SAWMILL_AUTH.tAuth('auth-error', 'Terjadi kesalahan autentikasi.');
        status.style.color = 'var(--accent-danger)';
      }
      if (outBtn) outBtn.disabled = false;
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        if (typeof toggleLanguage === 'function') toggleLanguage();
      });
    }
    if (typeof applyLanguage === 'function') applyLanguage();

    var form = document.getElementById('form-account');
    if (form) form.addEventListener('submit', handleAccountSave);
    var outBtn = document.getElementById('btn-signout');
    if (outBtn) outBtn.addEventListener('click', handleSignOut);

    if (!window.SAWMILL_AUTH) return;

    SAWMILL_AUTH.init()
      .then(function () {
        if (!SAWMILL_AUTH.isLoggedIn()) {
          SAWMILL_AUTH.goLogin('account.html');
        } else {
          SAWMILL_AUTH.updateAuthUI();
        }
      })
      .catch(function () {});
  });
})();
