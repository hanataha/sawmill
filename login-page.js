(function () {
  function resolvePostLoginUrl() {
    var params = new URLSearchParams(window.location.search);
    var safe = SAWMILL_AUTH.safeNextUrl(params.get("next"));
    if (safe && safe.indexOf("login.html") === -1) return safe;
    return "account.html";
  }

  async function handleSignIn(event) {
    event.preventDefault();
    var status = document.getElementById("login-status");
    var email = (document.getElementById("signin-email") || {}).value || "";
    var password = (document.getElementById("signin-password") || {}).value || "";
    if (status) {
      status.textContent = "";
      status.style.color = "var(--text-muted)";
    }
    try {
      await SAWMILL_AUTH.signIn(email, password);
      if (status) {
        status.textContent = SAWMILL_AUTH.tAuth("auth-signin-ok", "Berhasil masuk.");
        status.style.color = "var(--accent-success)";
      }
      window.location.href = resolvePostLoginUrl();
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
    var form = document.getElementById("form-signin");
    if (form) form.addEventListener("submit", handleSignIn);
    if (!window.SAWMILL_AUTH) return;
    SAWMILL_AUTH.init().then(function () {
      if (SAWMILL_AUTH.isLoggedIn()) {
        window.location.replace(resolvePostLoginUrl());
      }
    }).catch(function () {});
  });
})();
