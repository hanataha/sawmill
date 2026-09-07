(function () {
  async function handleAccountSave(event) {
    event.preventDefault();
    var status = document.getElementById("account-status");
    var name = (document.getElementById("account-display-name") || {}).value || "";
    if (status) {
      status.textContent = "";
      status.style.color = "var(--text-muted)";
    }
    try {
      await SAWMILL_AUTH.updateProfile(name);
      if (status) {
        status.textContent = SAWMILL_AUTH.tAuth("account-saved", "Nama disimpan.");
        status.style.color = "var(--accent-success)";
      }
      window.location.href = "./";
    } catch (err) {
      if (status) {
        status.textContent = (err && err.message) || SAWMILL_AUTH.tAuth("auth-error", "Terjadi kesalahan autentikasi.");
        status.style.color = "var(--accent-danger)";
      }
    }
  }

  async function handleSignOut() {
    var status = document.getElementById("account-status");
    try {
      await SAWMILL_AUTH.signOut();
      window.location.href = "./";
    } catch (err) {
      if (status) {
        status.textContent = (err && err.message) || SAWMILL_AUTH.tAuth("auth-error", "Terjadi kesalahan autentikasi.");
        status.style.color = "var(--accent-danger)";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    var langBtn = document.getElementById("lang-toggle-btn");
    if (langBtn) langBtn.addEventListener("click", function () { if (typeof toggleLanguage === "function") toggleLanguage(); });
    if (typeof applyLanguage === "function") applyLanguage();
    var form = document.getElementById("form-account");
    if (form) form.addEventListener("submit", handleAccountSave);
    var outBtn = document.getElementById("btn-signout");
    if (outBtn) outBtn.addEventListener("click", handleSignOut);
    if (!window.SAWMILL_AUTH) return;
    SAWMILL_AUTH.init().then(function () {
      if (!SAWMILL_AUTH.isLoggedIn()) {
        window.location.replace("login.html?next=" + encodeURIComponent("account.html"));
      }
    }).catch(function () {});
  });
})();
