const SUPABASE_URL = 'https://kmkfdtimdlfipbgimval.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2ZkdGltZGxmaXBiZ2ltdmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjMxMjIsImV4cCI6MjA5ODUzOTEyMn0.ATkWYnp1uGr8NAhzgL2V_t4CNgvwOq0yinsSmWvNbtI';
let supabaseClient = null;
const IS_FILE_PROTOCOL = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
try {
  if (!IS_FILE_PROTOCOL && typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    if (!IS_FILE_PROTOCOL) console.warn('Supabase SDK not available on window.supabase');
  }
} catch (e) {
  console.error('Error initializing Supabase client', e);
}

const statusMessage = document.getElementById('statusMessage');
const shippingForm = document.getElementById('shippingForm');
const recipientName = document.getElementById('recipientName');
const recipientPhone = document.getElementById('recipientPhone');
const recipientAddress = document.getElementById('recipientAddress');
const noteInput = document.getElementById('note');
const shippingSummary = document.getElementById('shippingSummary');
const shippingTotalEl = document.getElementById('shippingTotal');
let currentReceiptUrl = null;

function setStatusMessage(text, type = 'info') {
  statusMessage.textContent = text;
  statusMessage.className = `status-banner ${type}`;
}

function formatPrice(value) {
  return Number(value).toLocaleString('th-TH');
}

function renderSummary(items) {
  if (!items || items.length === 0) {
    shippingSummary.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">ยังไม่มีสินค้าในตะกร้า</p>';
    if (shippingTotalEl) shippingTotalEl.textContent = '0 บาท';
    return;
  }

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (shippingTotalEl) shippingTotalEl.textContent = `${formatPrice(total)} บาท`;

  shippingSummary.innerHTML = `
    <div class="cart-items">
      ${items.map((item) => `
        <div class="cart-item">
          <div class="cart-item-info">
            <strong>${item.name}</strong>
            <span>${formatPrice(item.price)} บาท × ${item.quantity} เล่ม</span>
          </div>
          <div class="cart-item-actions">
            <span style="color:var(--gold-light);font-weight:600;">${formatPrice(item.price * item.quantity)} บาท</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ---------------- Receipt upload helpers ----------------
function initReceiptUpload() {
  const input = document.getElementById('receiptInput');
  const preview = document.getElementById('receiptPreview');
  const status = document.getElementById('receiptStatus');
  if (!input) return;
  input.addEventListener('change', async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // show preview
    try {
      const reader = new FileReader();
      reader.onload = function(ev) {
        preview.src = ev.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Preview failed', err);
    }

    status.textContent = 'กำลังอัปโหลดสลิป...';
    try {
      const url = await uploadReceipt(file);
      currentReceiptUrl = url || null;
      if (currentReceiptUrl) {
        status.innerHTML = `อัปโหลดสลิปเรียบร้อย <a href="${currentReceiptUrl}" target="_blank">ดูสลิป</a>`;
      } else {
        status.textContent = 'บันทึกสลิปไว้ในเครื่อง (offline)';
      }
    } catch (err) {
      console.error('Upload receipt failed', err);
      status.textContent = 'ไม่สามารถอัปโหลดสลิปได้';
    }
  });
}

async function uploadReceipt(file) {
  if (!file) return null;
  if (!supabaseClient) {
    // store dataURL locally for offline mode
    const dataUrl = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const pending = JSON.parse(localStorage.getItem('pending_receipts') || '[]');
    const id = Date.now() + '_' + Math.random().toString(36).slice(2,8);
    pending.push({ id, name: file.name, dataUrl, created_at: new Date().toISOString(), synced: false });
    localStorage.setItem('pending_receipts', JSON.stringify(pending));
    return null;
  }

  // upload to Supabase Storage bucket 'receipts'
  const path = `receipts/${Date.now()}_${Math.random().toString(36).slice(2,8)}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'')}`;
  try {
    const { error: uploadError } = await supabaseClient.storage.from('receipts').upload(path, file);
    if (uploadError) {
      throw uploadError;
    }
    const { data: publicData, error: urlError } = supabaseClient.storage.from('receipts').getPublicUrl(path);
    if (urlError) throw urlError;
    return publicData && publicData.publicUrl ? publicData.publicUrl : null;
  } catch (err) {
    console.error('Supabase storage upload error', err);
    throw err;
  }
}

function getCartItems() {
  const stored = localStorage.getItem('shoppingCart');
  const items = stored ? JSON.parse(stored) : [];
  // Normalize items: ensure price (number) and quantity
  const productsStore = localStorage.getItem('local_products');
  const localProducts = productsStore ? JSON.parse(productsStore) : [];
  return items.map((it) => {
    const item = { ...it };
    if (typeof item.quantity === 'undefined') item.quantity = 1;
    if (typeof item.price === 'undefined' || item.price === null) {
      // try to find from local_products by id or name
      const found = localProducts.find((p) => p.id === item.id || p.name === item.name);
      item.price = found ? Number(found.price || 0) : 0;
    } else {
      item.price = Number(item.price || 0);
    }
    return item;
  });
}

function clearCart() {
  localStorage.removeItem('shoppingCart');
}

async function submitShipping(event) {
  event.preventDefault();
  const items = getCartItems();
  if (items.length === 0) {
    setStatusMessage('ไม่มีสินค้าที่จะจัดส่ง', 'error');
    return;
  }

  const name    = recipientName.value.trim();
  const phone   = recipientPhone.value.trim();
  const address = recipientAddress.value.trim();
  const note    = noteInput.value.trim();
  const total   = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Payment method
  const payRadio = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = payRadio ? payRadio.value : 'cod';
  const paymentLabel  = paymentMethod === 'transfer' ? 'โอนเงิน/จ่ายเลย' : 'เก็บเงินปลายทาง (COD)';

  if (!name || !phone || !address) {
    setStatusMessage('กรุณากรอกชื่อ เบอร์โทร และที่อยู่ให้ครบ', 'error');
    return;
  }

  try {
    if (!supabaseClient) {
      // Fallback: save shipment locally for later sync
      const pending = JSON.parse(localStorage.getItem('pending_shipments') || '[]');
      pending.push({
        recipient_name: name,
        recipient_phone: phone,
        recipient_address: address,
        note,
        items,
        total,
        payment_method: paymentMethod,
        receipt_url: currentReceiptUrl || null,
        created_at: new Date().toISOString(),
        synced: false
      });
      localStorage.setItem('pending_shipments', JSON.stringify(pending));
      setStatusMessage(`บันทึกคำสั่งซื้อไว้ในเครื่อง (ยังไม่ส่งไป Supabase). วิธีชำระ: ${paymentLabel}`, 'info');
      clearCart();
      renderSummary([]);
      shippingForm.reset();
    } else {
      const { error } = await supabaseClient.from('shipments').insert({
        recipient_name: name,
        recipient_phone: phone,
        recipient_address: address,
        note,
        items: JSON.stringify(items),
        total,
        receipt_url: currentReceiptUrl || null,
        payment_method: paymentMethod,
        created_at: new Date().toISOString()
      });
      if (error) {
        throw error;
      }
      setStatusMessage(`✅ ยืนยันคำสั่งซื้อแล้ว! วิธีชำระ: ${paymentLabel}`, 'success');
      clearCart();
      renderSummary([]);
      shippingForm.reset();
    }
    // Show tracking links
    const trackBtn = document.createElement('div');
    trackBtn.style.cssText = 'display:flex;flex-direction:column;gap:10px;margin-top:20px;';
    trackBtn.innerHTML = `
      <a href="order-status.html?phone=${encodeURIComponent(phone)}" class="btn-primary" style="justify-content:center;">
        📦 ตรวจสอบสถานะคำสั่งซื้อของฉัน →
      </a>
      <a href="index.html" class="btn-ghost" style="justify-content:center;">
        ← กลับไปเลือกหนังสือต่อ
      </a>
    `;
    document.querySelector('.shipping-form-panel')?.appendChild(trackBtn);
  } catch (error) {
    console.error('Shipping submit failed', error);
    setStatusMessage('ไม่สามารถบันทึกข้อมูลจัดส่งได้', 'error');
  }
}

shippingForm.addEventListener('submit', submitShipping);

const cartItems = getCartItems();
renderSummary(cartItems);
if (cartItems.length > 0) {
  setStatusMessage('พร้อมจัดส่งสินค้า', 'success');
} else {
  setStatusMessage('กรุณาใส่สินค้าลงตะกร้าในหน้าร้านก่อน', 'info');
}

// initialize receipt upload wiring
initReceiptUpload();

// Listen for storage changes so totals update when cart changes in another tab/page
window.addEventListener('storage', function(e) {
  if (e.key === 'shoppingCart') {
    try {
      const items = getCartItems();
      renderSummary(items);
      if (items.length > 0) setStatusMessage('พร้อมจัดส่งสินค้า', 'success');
      else setStatusMessage('กรุณาใส่สินค้าลงตะกร้าในหน้าร้านก่อน', 'info');
    } catch (err) {
      console.error('Storage event handling failed', err);
    }
  }
});
