const SUPABASE_URL = 'https://kmkfdtimdlfipbgimval.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2ZkdGltZGxmaXBiZ2ltdmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjMxMjIsImV4cCI6MjA5ODUzOTEyMn0.ATkWYnp1uGr8NAhzgL2V_t4CNgvwOq0yinsSmWvNbtI';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ══════════════════════════════════════════
   ── ADMIN PIN GATE ──
   Default PIN: 1234  (change via UI after login)
   Session stored in sessionStorage (clears on tab close)
══════════════════════════════════════════ */
(function initPinGate() {
  const PIN_KEY     = 'admin_pin';
  const AUTH_KEY    = 'admin_authed';
  const DEFAULT_PIN = '1234';

  function getPin()  { return localStorage.getItem(PIN_KEY) || DEFAULT_PIN; }
  function isAuthed(){ return sessionStorage.getItem(AUTH_KEY) === '1'; }

  if (isAuthed()) return; // already unlocked this session

  /* Inject modal styles */
  const style = document.createElement('style');
  style.textContent = `
    #pin-gate {
      position: fixed; inset: 0; z-index: 9999;
      display: flex; align-items: center; justify-content: center;
      background: rgba(13,13,18,0.97);
      backdrop-filter: blur(12px);
      animation: fadeInUp 0.3s ease;
    }
    #pin-box {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(201,169,110,0.25);
      border-radius: 20px;
      padding: 48px 40px;
      text-align: center;
      max-width: 380px;
      width: 90%;
      position: relative;
    }
    #pin-box::before {
      content: '';
      position: absolute;
      top: -1px; left: 30%; right: 30%; height: 2px;
      background: linear-gradient(90deg, transparent, #c9a96e, transparent);
    }
    #pin-box .pin-icon  { font-size: 3rem; margin-bottom: 12px; }
    #pin-box h2         { font-size: 1.4rem; color: #f0e0b8; margin-bottom: 6px; }
    #pin-box p          { font-size: 0.85rem; color: #888; margin-bottom: 28px; }
    #pin-input {
      width: 100%; padding: 14px 18px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(201,169,110,0.3);
      border-radius: 12px;
      color: #f0e0b8; font-size: 1.4rem;
      text-align: center; letter-spacing: 0.4em;
      font-family: monospace; outline: none;
      margin-bottom: 16px;
      transition: border-color 0.2s;
    }
    #pin-input:focus   { border-color: #c9a96e; }
    #pin-input.shake   { animation: pinShake 0.4s ease; }
    @keyframes pinShake {
      0%,100%{ transform:translateX(0); }
      20%    { transform:translateX(-8px); }
      40%    { transform:translateX(8px); }
      60%    { transform:translateX(-6px); }
      80%    { transform:translateX(6px); }
    }
    #pin-submit {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, #c9a96e, #f5a623);
      border: none; border-radius: 12px;
      font-size: 1rem; font-weight: 700;
      color: #1a1206; cursor: pointer;
      transition: opacity 0.2s;
      font-family: 'Sarabun', sans-serif;
    }
    #pin-submit:hover   { opacity: 0.85; }
    #pin-error          { color: #e05c7a; font-size: 0.85rem; margin-top: 10px; min-height: 20px; }
    #pin-hint           { font-size: 0.75rem; color: #555; margin-top: 16px; }
  `;
  document.head.appendChild(style);

  /* Build modal */
  const gate = document.createElement('div');
  gate.id = 'pin-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.innerHTML = `
    <div id="pin-box">
      <div class="pin-icon">🔐</div>
      <h2>เข้าสู่ระบบแอดมิน</h2>
      <p>กรอก PIN เพื่อเข้าถึงหน้าจัดการคำสั่งซื้อ</p>
      <input id="pin-input" type="password" inputmode="numeric" maxlength="4"
             placeholder="••••" autocomplete="off" autofocus />
      <button id="pin-submit">🔓 ยืนยัน PIN</button>
      <div id="pin-error"></div>
      <div id="pin-hint">PIN เริ่มต้น: 1234 · สามารถเปลี่ยนได้หลังล็อกอิน</div>
    </div>
  `;
  document.body.appendChild(gate);

  function tryUnlock() {
    const entered = document.getElementById('pin-input').value.trim();
    if (entered === getPin()) {
      sessionStorage.setItem(AUTH_KEY, '1');
      gate.style.opacity = '0';
      gate.style.transition = 'opacity 0.25s';
      setTimeout(() => gate.remove(), 260);
    } else {
      document.getElementById('pin-error').textContent = '❌ PIN ไม่ถูกต้อง กรุณาลองใหม่';
      const inp = document.getElementById('pin-input');
      inp.value = '';
      inp.classList.remove('shake');
      void inp.offsetWidth; // reflow to restart animation
      inp.classList.add('shake');
    }
  }

  document.getElementById('pin-submit').addEventListener('click', tryUnlock);
  document.getElementById('pin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') tryUnlock();
  });
})();

/* ── Change-PIN button injected after page loads ── */
function injectChangePinButton() {
  const btn = document.createElement('button');
  btn.textContent = '🔑 เปลี่ยน PIN';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999;padding:8px 16px;' +
    'background:rgba(201,169,110,0.12);border:1px solid rgba(201,169,110,0.3);border-radius:99px;' +
    'color:#c9a96e;font-size:0.8rem;cursor:pointer;font-family:Sarabun,sans-serif;';
  btn.addEventListener('click', () => {
    const newPin = prompt('กรอก PIN ใหม่ (4 ตัวเลข):');
    if (newPin && /^\d{4}$/.test(newPin)) {
      localStorage.setItem('admin_pin', newPin);
      alert('เปลี่ยน PIN สำเร็จ!');
    } else if (newPin !== null) {
      alert('PIN ต้องเป็นตัวเลข 4 หลัก');
    }
  });
  document.body.appendChild(btn);
}
injectChangePinButton();



/* ── DOM refs ── */
const statusMessage  = document.getElementById('statusMessage');
const ordersList     = document.getElementById('ordersList');
const searchInput    = document.getElementById('searchInput');
const searchBtn      = document.getElementById('searchBtn');
const filterChips    = Array.from(document.querySelectorAll('.filter-row .chip'));

const statTotal     = document.getElementById('statTotal');
const statPending   = document.getElementById('statPending');
const statShipped   = document.getElementById('statShipped');
const statDelivered = document.getElementById('statDelivered');

/* ── State ── */
let allOrders     = [];
let currentFilter = 'all';
let currentSearch = '';

/* ── Status config ── */
const STATUS_CONFIG = {
  pending:   { label: 'รอดำเนินการ', cls: 'status-pending',  icon: '⏳' },
  packing:   { label: 'กำลังแพ็คสินค้า', cls: 'status-packing',  icon: '📦' },
  shipped:   { label: 'จัดส่งแล้ว',   cls: 'status-shipped',   icon: '🚚' },
  delivered: { label: 'ส่งสำเร็จ',  cls: 'status-delivered', icon: '✅' },
  cancelled: { label: 'ยกเลิกแล้ว', cls: 'status-cancelled', icon: '❌' }
};

const TIMELINE_STEPS = [
  { key: 'pending',   icon: '📋', label: 'รับคำสั่งซื้อ' },
  { key: 'packing',   icon: '📦', label: 'แพ็คสินค้า' },
  { key: 'shipped',   icon: '🚚', label: 'จัดส่งแล้ว' },
  { key: 'delivered', icon: '✅', label: 'ได้รับสินค้า' }
];

const STATUS_ORDER = ['pending', 'packing', 'shipped', 'delivered'];

/* ── Helpers ── */
function setStatus(text, type = 'info') {
  statusMessage.textContent = text;
  statusMessage.className = `status-banner ${type}`;
}

function formatPrice(v) {
  return Number(v).toLocaleString('th-TH');
}

function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function parseItems(raw) {
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return []; }
}

/* ── Supabase: load all shipments ── */
async function loadOrders() {
  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    allOrders = (data || []).map(row => ({
      ...row,
      status: row.status || 'pending'
    }));
    setStatus(`โหลดคำสั่งซื้อสำเร็จ · ${allOrders.length} รายการ`, 'success');
    updateStats();
    renderOrders();
  } catch (err) {
    console.error('Load orders failed:', err);
    setStatus('ไม่สามารถโหลดข้อมูลจาก Supabase ได้', 'error');
    renderOrders();
  }
}

/* ── Update status in DB ── */
async function updateStatus(id, newStatus) {
  try {
    const { error } = await supabase
      .from('shipments')
      .update({ status: newStatus })
      .eq('id', id);
    if (error) throw error;

    // Update local state
    const order = allOrders.find(o => o.id === id);
    if (order) order.status = newStatus;
    updateStats();
    renderOrders();
    setStatus(`อัปเดตสถานะสำเร็จ`, 'success');
  } catch (err) {
    console.error('Update status failed:', err);
    setStatus('อัปเดตสถานะล้มเหลว', 'error');
  }
}

/* ── Stats ── */
function updateStats() {
  statTotal.textContent     = allOrders.length;
  statPending.textContent   = allOrders.filter(o => o.status === 'pending').length;
  statShipped.textContent   = allOrders.filter(o => o.status === 'shipped').length;
  statDelivered.textContent = allOrders.filter(o => o.status === 'delivered').length;
}

/* ── Filter & search ── */
function getFiltered() {
  const q = currentSearch.toLowerCase();
  return allOrders.filter(o => {
    const matchStatus = currentFilter === 'all' || o.status === currentFilter;
    const haystack = `${o.recipient_name} ${o.recipient_phone} ${o.recipient_address}`.toLowerCase();
    const matchSearch = q === '' || haystack.includes(q);
    return matchStatus && matchSearch;
  });
}

/* ── Build timeline HTML ── */
function buildTimeline(status) {
  if (status === 'cancelled') {
    return `<div style="color:var(--rose);font-size:0.9rem;margin-bottom:20px;">❌ คำสั่งซื้อนี้ถูกยกเลิก</div>`;
  }
  const currentIdx = STATUS_ORDER.indexOf(status);
  return `
    <div class="timeline" role="list" aria-label="ขั้นตอนการจัดส่ง">
      ${TIMELINE_STEPS.map((step, idx) => {
        let cls = '';
        let labelCls = '';
        if (idx < currentIdx)       { cls = 'done';   labelCls = 'done'; }
        else if (idx === currentIdx) { cls = 'active'; labelCls = 'active'; }
        return `
          <div class="timeline-step" role="listitem">
            <div class="step-circle ${cls}">${step.icon}</div>
            <div class="step-label ${labelCls}">${step.label}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ── Build status select ── */
function buildStatusSelect(order) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const options = Object.entries(STATUS_CONFIG).map(([val, c]) =>
    `<option value="${val}" ${val === order.status ? 'selected' : ''}>${c.icon} ${c.label}</option>`
  ).join('');

  // Inline styles for the select to match the badge
  const styles = {
    pending:   'background:rgba(245,166,35,0.12);color:#f5a623;border-color:rgba(245,166,35,0.3)',
    packing:   'background:rgba(100,150,255,0.12);color:#8ab4ff;border-color:rgba(100,150,255,0.25)',
    shipped:   'background:rgba(160,100,255,0.12);color:#c49dff;border-color:rgba(160,100,255,0.25)',
    delivered: 'background:rgba(80,200,120,0.12);color:#6dd99a;border-color:rgba(80,200,120,0.25)',
    cancelled: 'background:rgba(224,92,122,0.1);color:#e05c7a;border-color:rgba(224,92,122,0.25)'
  };

  return `
    <select
      class="status-select"
      data-id="${order.id}"
      aria-label="เปลี่ยนสถานะ"
      style="${styles[order.status] || ''}"
    >
      ${options}
    </select>
  `;
}

/* ── Build items list HTML ── */
function buildItems(order) {
  const items = parseItems(order.items);
  if (items.length === 0) return '';

  const itemsHtml = items.map(item => `
    <div class="item-row">
      <span class="item-name">${item.name}</span>
      <span class="item-qty">× ${item.quantity}</span>
      <span class="item-price">${formatPrice(item.price * item.quantity)} บาท</span>
    </div>
  `).join('');

  return `
    <button class="order-items-toggle" data-id="${order.id}" aria-expanded="false">
      <span>📚 หนังสือที่สั่ง (${items.length} รายการ)</span>
      <span class="chevron">▼</span>
    </button>
    <div class="order-items-list" id="items-${order.id}">
      ${itemsHtml}
    </div>
  `;
}

/* ── Render all orders ── */
function renderOrders() {
  const filtered = getFiltered();

  if (filtered.length === 0) {
    ordersList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>ไม่พบคำสั่งซื้อ</h3>
        <p>${allOrders.length === 0
          ? 'ยังไม่มีคำสั่งซื้อในระบบ'
          : 'ลองเปลี่ยนตัวกรองหรือคำค้นหา'}</p>
      </div>
    `;
    return;
  }

  ordersList.innerHTML = filtered.map((order, idx) => {
    const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    return `
      <div class="order-card" style="animation-delay:${idx * 0.06}s">
        <div class="order-card-header">
          <div class="order-meta">
            <span class="order-id">คำสั่งซื้อ #${order.id}</span>
            <span class="order-recipient">${order.recipient_name || '-'}</span>
            <span class="order-phone">📞 ${order.recipient_phone || '-'}</span>
            ${order.recipient_address
              ? `<span class="order-address">📍 ${order.recipient_address}</span>`
              : ''}
          </div>
          <div class="order-header-right">
            <span class="order-date">🗓 ${formatDate(order.created_at)}</span>
            ${buildStatusSelect(order)}
            <span class="order-total-badge">${formatPrice(order.total || 0)} บาท</span>
            ${ order.payment_method === 'transfer'
              ? `<span style="font-size:0.75rem;padding:3px 10px;border-radius:99px;background:rgba(100,150,255,0.12);border:1px solid rgba(100,150,255,0.25);color:#8ab4ff;">💳 โอนเงิน</span>`
              : `<span style="font-size:0.75rem;padding:3px 10px;border-radius:99px;background:rgba(245,166,35,0.1);border:1px solid rgba(245,166,35,0.25);color:#f5a623;">🏠 COD</span>`
            }
          </div>
        </div>

        <div class="order-card-body">
          ${buildTimeline(order.status)}
          ${buildItems(order)}
          ${order.note
            ? `<div class="order-note">📝 หมายเหตุ: ${order.note}</div>`
            : ''}
        </div>
      </div>
    `;
  }).join('');

  /* Attach event listeners */
  // Status change dropdowns
  ordersList.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const id    = Number(sel.dataset.id);
      const newSt = sel.value;
      await updateStatus(id, newSt);
    });
  });

  // Items toggle
  ordersList.querySelectorAll('.order-items-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const list = document.getElementById(`items-${id}`);
      const open = list.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });
}

/* ── Search & filter events ── */
filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    currentFilter = chip.dataset.status;
    filterChips.forEach(c => c.classList.toggle('active', c === chip));
    renderOrders();
  });
});

function doSearch() {
  currentSearch = searchInput.value;
  renderOrders();
}

searchInput.addEventListener('input', doSearch);
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

/* ── Bootstrap ── */
loadOrders();
