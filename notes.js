// Initialize Supabase Client (safe — never leave archive stuck on loading)
const SUPABASE_URL = 'https://cpgluhmswxgxakjfigsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9-mWecLyoWN-l9uXl85PzA__qDiyiY8';

let supabaseClient = null;
let allNotes = [];
let loadNotesInFlight = null;

function escapeHtml(text) {
  return text
    ? String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    : '';
}

function translateCategory(category) {
  const map = {
    Umum: 'cat-umum',
    'Setting Mesin': 'cat-setting',
    Maintenance: 'cat-maint',
    Safety: 'cat-safety',
  };
  const key = map[category];
  if (key) return t(key, category || 'Umum');
  return category || t('cat-umum', 'Umum');
}

function t(key, fallback) {
  try {
    if (typeof translations !== 'undefined' && typeof currentLang !== 'undefined') {
      const val = translations[currentLang] && translations[currentLang][key];
      if (val) return val;
    }
  } catch (_) { /* ignore */ }
  return fallback;
}

function setNotesStatus(message, isError) {
  const container = document.getElementById('notes-grid');
  if (!container) return;
  const color = isError ? 'var(--accent-danger, #e74c3c)' : 'var(--text-muted)';
  container.innerHTML = `<p class="notes-status" style="color: ${color};">${escapeHtml(message)}</p>`;
}

const HOME_NOTES_LIMIT = 4;

function truncateText(text, maxLen) {
  const s = text ? String(text).trim() : '';
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).trimEnd() + '…';
}

function setHomeNotesStatus(message, isError) {
  const container = document.getElementById('home-notes-preview');
  if (!container) return;
  const color = isError ? 'var(--accent-danger, #e74c3c)' : 'var(--text-muted)';
  container.innerHTML = `<p class="notes-status" style="color: ${color};">${escapeHtml(message)}</p>`;
}

function noteCardHtml(note, options) {
  const compact = options && options.compact;
  const content = compact
    ? truncateText(note.content, 140)
    : (note.content || '');
  const titleSize = compact ? '1rem' : '1.1rem';
  const openAttr = compact
    ? ` role="button" tabindex="0" onclick="showSection('notes-archive', event)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();showSection('notes-archive', event);}"`
    : '';
  return `
    <div class="note-card${compact ? ' note-card--home' : ''}"${openAttr}>
      <div>
        ${
          note.image_url
            ? `<div class="note-img-container${compact ? ' note-img-container--home' : ''}">
            <img src="${escapeHtml(note.image_url)}" alt="" loading="lazy">
          </div>`
            : ''
        }
        <div class="note-header">
          <span class="note-badge">${escapeHtml(translateCategory(note.category))}</span>
        </div>
        <h3 style="font-size: ${titleSize}; margin-bottom: 8px;">${escapeHtml(note.title)}</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${escapeHtml(content)}</p>
      </div>
      <div class="note-meta">
        <span><i class="fa-solid fa-user"></i> ${escapeHtml(note.author)}</span>
        <span>${note.created_at ? new Date(note.created_at).toLocaleDateString() : ''}</span>
      </div>
    </div>`;
}

function renderHomeNotesPreview(notesList) {
  const container = document.getElementById('home-notes-preview');
  if (!container) return;

  const latest = (notesList || []).slice(0, HOME_NOTES_LIMIT);
  if (latest.length === 0) {
    setHomeNotesStatus(t('home-notes-empty', 'Belum ada catatan di arsip.'), false);
    return;
  }

  container.innerHTML = latest.map((note) => noteCardHtml(note, { compact: true })).join('');
}


function initSupabase() {
  if (window.SAWMILL_AUTH && typeof SAWMILL_AUTH.getClient === 'function') {
    return SAWMILL_AUTH.getClient();
  }
  if (supabaseClient) return supabaseClient;
  if (typeof supabase === 'undefined' || typeof supabase.createClient !== 'function') {
    throw new Error('Supabase library failed to load');
  }
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label || 'Request timed out')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function loadNotes() {
  const container = document.getElementById('notes-grid');
  if (!container) return;

  // Deduplicate concurrent loads
  if (loadNotesInFlight) return loadNotesInFlight;

  setNotesStatus(t('notes-loading', 'Memuat catatan...'), false);
  setHomeNotesStatus(t('notes-loading', 'Memuat catatan...'), false);

  loadNotesInFlight = (async () => {
    try {
      const client = initSupabase();
      const query = client
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: notes, error } = await withTimeout(query, 12000, 'Notes request timed out');

      if (error) {
        const msg = t('notes-error', 'Gagal memuat catatan') + ': ' + (error.message || 'unknown');
        setNotesStatus(msg, true);
        setHomeNotesStatus(msg, true);
        return;
      }

      allNotes = notes || [];
      renderNotes(allNotes);
    } catch (err) {
      console.error('loadNotes failed:', err);
      const msg =
        t('notes-error', 'Gagal memuat catatan') +
        (err && err.message ? ': ' + err.message : '');
      setNotesStatus(msg, true);
      setHomeNotesStatus(msg, true);
    } finally {
      loadNotesInFlight = null;
    }
  })();

  return loadNotesInFlight;
}

function renderNotes(notesToRender) {
  const container = document.getElementById('notes-grid');
  if (!container) return;

  if (!notesToRender || notesToRender.length === 0) {
    setNotesStatus(t('notes-empty', 'Tidak ada catatan yang ditemukan.'), false);
  } else {
    container.innerHTML = notesToRender.map((note) => noteCardHtml(note, { compact: false })).join('');
  }

  // Home always shows the newest from the full cache (not search filters)
  renderHomeNotesPreview(allNotes);
}

function filterNotes() {
  const searchInput = document.getElementById('search-notes');
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase().trim();
  if (!query) {
    renderNotes(allNotes);
    return;
  }

  const filtered = allNotes.filter((note) => {
    const fields = [note.title, note.author, note.category, note.content];
    return fields.some((f) => f && String(f).toLowerCase().includes(query));
  });

  renderNotes(filtered);
}

async function handleCreateNote(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('btn-submit');
  const saveLabel = t('btn-save', 'Simpan Catatan');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = t('notes-uploading', 'Mengunggah...');
  }

  try {
    if (window.SAWMILL_AUTH && typeof SAWMILL_AUTH.whenReady === 'function') {
      await SAWMILL_AUTH.whenReady();
    }
    if (window.SAWMILL_AUTH && !SAWMILL_AUTH.isLoggedIn()) {
      SAWMILL_AUTH.requireLogin('notes-add');
      return;
    }

    const client = initSupabase();
    const user = window.SAWMILL_AUTH ? SAWMILL_AUTH.getUser() : null;
    if (!user) {
      if (window.SAWMILL_AUTH && typeof SAWMILL_AUTH.requireLogin === 'function') {
        SAWMILL_AUTH.requireLogin('notes-add');
      } else {
        window.location.href = 'login.html?next=' + encodeURIComponent('./#notes-add');
      }
      return;
    }

    const title = document.getElementById('note-title').value.trim();
    const author = window.SAWMILL_AUTH.displayNameFromUser(user);
    const category = document.getElementById('note-category').value;
    const content = document.getElementById('note-content').value.trim();
    const imageInput = document.getElementById('note-image');
    const imageFile = imageInput ? imageInput.files[0] : null;

    let imageUrl = null;

    if (imageFile) {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await client.storage
        .from('note-images')
        .upload(filePath, imageFile);

      if (uploadError) {
        alert(t('notes-upload-fail', 'Gagal mengunggah gambar') + ': ' + uploadError.message);
        return;
      }

      const { data: publicUrlData } = client.storage
        .from('note-images')
        .getPublicUrl(filePath);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await client
      .from('notes')
      .insert([{ title, author, category, content, image_url: imageUrl, user_id: user.id }]);

    if (insertError) {
      alert(t('notes-save-fail', 'Gagal menyimpan catatan') + ': ' + insertError.message);
      return;
    }

    alert(t('notes-save-ok', 'Catatan berhasil disimpan!'));
    const form = document.getElementById('note-form');
    if (form) form.reset();

    const searchInput = document.getElementById('search-notes');
    if (searchInput) searchInput.value = '';

    if (typeof showSection === 'function') {
      showSection('notes-archive', new Event('click'));
    } else {
      await loadNotes();
    }
  } catch (err) {
    console.error('handleCreateNote failed:', err);
    alert(t('notes-save-fail', 'Gagal menyimpan catatan') + (err && err.message ? ': ' + err.message : ''));
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${escapeHtml(saveLabel)}`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Delay slightly so CDN supabase script is available; still fail visibly if not
  setTimeout(() => {
    loadNotes();
  }, 0);
});
