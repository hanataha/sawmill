function handleAuthChipClick() {
  if (!window.SAWMILL_AUTH) {
    window.location.href = "login.html";
    return;
  }
  if (SAWMILL_AUTH.isLoggedIn()) {
    window.location.href = "account.html";
  } else {
    window.location.href = "login.html";
  }
}
window.handleAuthChipClick = handleAuthChipClick;

document.addEventListener("DOMContentLoaded", function () {
  if (window.SAWMILL_AUTH && typeof SAWMILL_AUTH.init === "function") {
    SAWMILL_AUTH.init().then(function () {
      var hash = (window.location.hash || "").replace(/^#/, "");
      if (hash && typeof showSection === "function") {
        showSection(hash, null);
      }
    }).catch(function () {});
  }
});
