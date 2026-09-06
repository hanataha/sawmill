// Sawmill PWA helper
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('./sw.js').catch(function (err) {
      console.warn('SW register failed:', err);
    });
  });
}

(function () {
  var dismissedKey = 'sawmill-pwa-dismissed';
  try {
    if (localStorage.getItem(dismissedKey) === '1') return;
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (navigator.standalone) return;
  } catch (e) {}

  var deferredPrompt = null;
  var bar = document.createElement('div');
  bar.id = 'pwa-install-bar';
  bar.className = 'pwa-install-bar';
  bar.hidden = true;

  var text = document.createElement('div');
  text.className = 'pwa-install-text';
  var title = document.createElement('strong');
  title.className = 'lang-text';
  title.setAttribute('data-id', 'pwa-title');
  title.textContent = 'Pasang aplikasi';
  var sub = document.createElement('span');
  sub.className = 'lang-text';
  sub.setAttribute('data-id', 'pwa-sub');
  sub.textContent = 'Buka lebih cepat dari layar utama HP.';
  text.appendChild(title);
  text.appendChild(sub);

  var actions = document.createElement('div');
  actions.className = 'pwa-install-actions';
  var dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.id = 'pwa-install-dismiss';
  dismiss.className = 'pwa-install-dismiss lang-text';
  dismiss.setAttribute('data-id', 'pwa-later');
  dismiss.textContent = 'Nanti';
  var install = document.createElement('button');
  install.type = 'button';
  install.id = 'pwa-install-btn';
  install.className = 'pwa-install-btn lang-text';
  install.setAttribute('data-id', 'pwa-install');
  install.textContent = 'Pasang';
  actions.appendChild(dismiss);
  actions.appendChild(install);
  bar.appendChild(text);
  bar.appendChild(actions);
  document.body.appendChild(bar);

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    bar.hidden = false;
  });

  install.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.finally(function () {
      deferredPrompt = null;
      bar.hidden = true;
    });
  });

  dismiss.addEventListener('click', function () {
    bar.hidden = true;
    try { localStorage.setItem(dismissedKey, '1'); } catch (e) {}
  });

  window.addEventListener('appinstalled', function () {
    bar.hidden = true;
    deferredPrompt = null;
  });
})());
