// Initialize Supabase Client
const SUPABASE_URL = 'https://cpgluhmswxgxakjfigsw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9-mWecLyoWN-l9uXl85PzA__qDiyiY8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Store loaded notes globally for instant client-side filtering
let allNotes = [];

// Utility function to prevent XSS injection
function escapeHtml(text) {
  return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
}

// Fetch notes from Supabase
async function loadNotes() {
  const container = document.getElementById('notes-grid');
  if (!container) return;

  container.innerHTML = '<p style="color: var(--text-muted);">Memuat catatan...</p>';

  const { data: notes, error } = await supabaseClient
    .from('notes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<p style="color: #e74c3c;">Gagal memuat catatan: ${escapeHtml(error.message)}</p>`;
    return;
  }

  allNotes = notes || [];
  renderNotes(allNotes);
}

// Render notes array into HTML
function renderNotes(notesToRender) {
  const container = document.getElementById('notes-grid');
  if (!container) return;

  if (!notesToRender || notesToRender.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted);">Tidak ada catatan yang ditemukan.</p>';
    return;
  }

  container.innerHTML = notesToRender.map(note => `
    <div class="note-card">
      <div>
        ${note.image_url ? `
          <div class="note-img-container">
            <img src="${escapeHtml(note.image_url)}" alt="Lampiran Catatan" loading="lazy">
          </div>
        ` : ''}
        <div class="note-header">
          <span class="note-badge">${escapeHtml(note.category || 'Umum')}</span>
        </div>
        <h3 style="font-size: 1.1rem; margin-bottom: 8px;">${escapeHtml(note.title)}</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${escapeHtml(note.content)}</p>
      </div>
      <div class="note-meta">
        <span><i class="fa-solid fa-user"></i> ${escapeHtml(note.author)}</span>
        <span>${new Date(note.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

// Live filter function triggered on search input
function filterNotes() {
  const searchInput = document.getElementById('search-notes');
  if (!searchInput) return;

  const query = searchInput.value.toLowerCase().trim();

  if (!query) {
    renderNotes(allNotes);
    return;
  }

  const filtered = allNotes.filter(note => {
    const titleMatch = note.title && note.title.toLowerCase().includes(query);
    const authorMatch = note.author && note.author.toLowerCase().includes(query);
    const categoryMatch = note.category && note.category.toLowerCase().includes(query);
    const contentMatch = note.content && note.content.toLowerCase().includes(query);

    return titleMatch || authorMatch || categoryMatch || contentMatch;
  });

  renderNotes(filtered);
}

// Handle form submission with Image Upload
async function handleCreateNote(event) {
  event.preventDefault();

  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Mengunggah...';
  }

  const title = document.getElementById('note-title').value.trim();
  const author = document.getElementById('note-author').value.trim();
  const category = document.getElementById('note-category').value;
  const content = document.getElementById('note-content').value.trim();
  const imageInput = document.getElementById('note-image');
  const imageFile = imageInput ? imageInput.files[0] : null;

  let imageUrl = null;

  // 1. Upload image to Supabase Storage if selected
  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('note-images')
      .upload(filePath, imageFile);

    if (uploadError) {
      alert('Gagal mengunggah gambar: ' + uploadError.message);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Simpan Catatan';
      }
      return;
    }

    // Get public URL of uploaded file
    const { data: publicUrlData } = supabaseClient.storage
      .from('note-images')
      .getPublicUrl(filePath);

    imageUrl = publicUrlData.publicUrl;
  }

  // 2. Insert note into Database
  const { error: insertError } = await supabaseClient
    .from('notes')
    .insert([{ title, author, category, content, image_url: imageUrl }]);

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Simpan Catatan';
  }

  if (insertError) {
    alert('Gagal menyimpan catatan: ' + insertError.message);
    return;
  }

  alert('Catatan berhasil disimpan!');
  document.getElementById('note-form').reset();

  // Reset search input if present
  const searchInput = document.getElementById('search-notes');
  if (searchInput) searchInput.value = '';

  // Switch to archive pane if showSection exists
  if (typeof showSection === 'function') {
    showSection('notes-archive', new Event('click'));
  }

  loadNotes();
}

// Test Supabase Connection
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabaseClient.from('notes').select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Supabase Connection Failed:', error.message);
    } else {
      console.log('✅ Supabase Connected Successfully! Database is reachable.');
    }
  } catch (err) {
    console.error('❌ Supabase Error:', err);
  }
}

// Run test and load notes on initial page load
document.addEventListener('DOMContentLoaded', () => {
  testSupabaseConnection();
  loadNotes();
});