const SUPABASE_URL = 'https://kmkfdtimdlfipbgimval.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2ZkdGltZGxmaXBiZ2ltdmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjMxMjIsImV4cCI6MjA5ODUzOTEyMn0.ATkWYnp1uGr8NAhzgL2V_t4CNgvwOq0yinsSmWvNbtI';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const statusMessage = document.getElementById('statusMessage');
const productTable = document.getElementById('productTable');
const productForm = document.getElementById('productForm');
const productIdInput = document.getElementById('productId');
const nameInput = document.getElementById('productName');
const authorInput = document.getElementById('productAuthor');
const categoryInput = document.getElementById('productCategory');
const descriptionInput = document.getElementById('productDescription');
const priceInput = document.getElementById('productPrice');
const imageInput = document.getElementById('productImage');
const cancelEditButton = document.getElementById('cancelEdit');

function setStatusMessage(text, type = 'info') {
  statusMessage.textContent = text;
  statusMessage.className = `status-banner ${type}`;
}

function formatPrice(value) {
  return Number(value).toLocaleString('th-TH');
}

function resetForm() {
  productIdInput.value = '';
  nameInput.value = '';
  if (authorInput) authorInput.value = '';
  if (categoryInput) categoryInput.value = '';
  descriptionInput.value = '';
  priceInput.value = '';
  imageInput.value = '';
  cancelEditButton.style.display = 'none';
}

function fillForm(product) {
  productIdInput.value = product.id;
  nameInput.value = product.name;
  if (authorInput) authorInput.value = product.author || '';
  if (categoryInput) categoryInput.value = product.category || '';
  descriptionInput.value = product.description;
  priceInput.value = product.price;
  imageInput.value = product.image || '';
  cancelEditButton.style.display = 'inline-flex';
  nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ── Offline helpers ── */
const LOCAL_KEY = 'local_products';

function localGet() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || []; }
  catch { return []; }
}

function localSet(products) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(products));
}

function localNextId() {
  const items = localGet();
  return items.length > 0 ? Math.max(...items.map(p => p.id || 0)) + 1 : 1;
}

async function loadProducts() {
  try {
    const { data, error } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (error) throw error;
    const list = data || [];
    localSet(list);                          // keep local in sync
    renderProductTable(list);
    setStatusMessage('โหลดรายการสินค้าจาก Supabase สำเร็จ', 'success');
  } catch (error) {
    console.error('Load products failed – using localStorage', error);
    const local = localGet();
    renderProductTable(local);
    setStatusMessage(local.length ? '⚠️ ออฟไลน์: แสดงข้อมูลจากหน่วยความจำ' : 'ไม่พบสินค้า', local.length ? 'info' : 'error');
  }
}

function renderProductTable(products) {
  const tbody = productTable.querySelector('tbody');
  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">ไม่พบสินค้าในระบบ</td></tr>';
    return;
  }

  tbody.innerHTML = products
    .map(
      (product) => `
        <tr>
          <td><strong>${product.name}</strong></td>
          <td>${product.author || '-'}</td>
          <td>${product.category || '-'}</td>
          <td style="color:var(--gold-light);font-weight:600;">${formatPrice(product.price)} บาท</td>
          <td>
            <div class="admin-actions">
              <button class="btn-edit" data-action="edit" data-id="${product.id}">✏️ แก้ไข</button>
              <button class="btn-delete" data-action="delete" data-id="${product.id}">🗑️ ลบ</button>
            </div>
          </td>
        </tr>
      `
    )
    .join('');

  tbody.querySelectorAll('button[data-action="edit"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id);
      await selectProduct(id);
    });
  });

  tbody.querySelectorAll('button[data-action="delete"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id);
      if (confirm('คุณแน่ใจว่าจะลบสินค้านี้หรือไม่?')) {
        await deleteProduct(id);
      }
    });
  });
}

async function selectProduct(id) {
  try {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).single();
    if (error) throw error;
    fillForm(data);
    setStatusMessage('กรอกข้อมูลเพื่อแก้ไขสินค้า', 'info');
  } catch {
    // Offline: fetch from local
    const product = localGet().find(p => p.id === id);
    if (product) { fillForm(product); setStatusMessage('แก้ไขข้อมูล (ออฟไลน์)', 'info'); }
    else setStatusMessage('ไม่พบสินค้า', 'error');
  }
}

async function saveProduct(event) {
  event.preventDefault();
  const id     = productIdInput.value ? Number(productIdInput.value) : null;
  const name   = nameInput.value.trim();
  const author = authorInput ? authorInput.value.trim() : '';
  const category = categoryInput ? categoryInput.value.trim() : '';
  const description = descriptionInput.value.trim();
  const price  = Number(priceInput.value);
  const image  = imageInput.value.trim();

  if (!name || !description || isNaN(price) || price <= 0) {
    setStatusMessage('กรุณากรอกข้อมูลสินค้าให้ครบถ้วน', 'error');
    return;
  }

  const payload = { name, author, category, description, price, image };

  try {
    if (id) {
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) throw error;
      // sync local
      const items = localGet().map(p => p.id === id ? { ...p, ...payload } : p);
      localSet(items);
      setStatusMessage('แก้ไขสินค้าสำเร็จ', 'success');
    } else {
      const { data, error } = await supabase.from('products').insert(payload).select();
      if (error) throw error;
      const items = localGet(); items.push(data[0]); localSet(items);
      setStatusMessage('เพิ่มสินค้าสำเร็จ', 'success');
    }
  } catch {
    // Offline CRUD
    const items = localGet();
    if (id) {
      const idx = items.findIndex(p => p.id === id);
      if (idx !== -1) items[idx] = { ...items[idx], ...payload };
    } else {
      items.push({ id: localNextId(), ...payload });
    }
    localSet(items);
    setStatusMessage(id ? '⚠️ แก้ไขแล้ว (ออฟไลน์)' : '⚠️ เพิ่มแล้ว (ออฟไลน์)', 'info');
  }
  resetForm();
  await loadProducts();
}

async function deleteProduct(id) {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    const items = localGet().filter(p => p.id !== id); localSet(items);
    setStatusMessage('ลบสินค้าสำเร็จ', 'success');
  } catch {
    const items = localGet().filter(p => p.id !== id); localSet(items);
    setStatusMessage('⚠️ ลบแล้ว (ออฟไลน์)', 'info');
  }
  await loadProducts();
}

productForm.addEventListener('submit', saveProduct);
cancelEditButton.addEventListener('click', () => { resetForm(); setStatusMessage('ยกเลิกการแก้ไข', 'info'); });
loadProducts();


