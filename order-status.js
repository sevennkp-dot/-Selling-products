const SUPABASE_URL = 'https://kmkfdtimdlfipbgimval.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2ZkdGltZGxmaXBiZ2ltdmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjMxMjIsImV4cCI6MjA5ODUzOTEyMn0.ATkWYnp1uGr8NAhzgL2V_t4CNgvwOq0yinsSmWvNbtI';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── DOM refs ── */
const lookupForm  = document.getElementById('lookupForm');
const phoneInput  = document.getElementById('phoneInput');
const lookupBtn   = document.getElementById('lookupBtn');
const resultsArea = document.getElementById('resultsArea');
const statusBanner = document.getElementById('statusBanner');

/* ── Status config (read-only, customer view) ── */
const STATUS_CONFIG = {
  pending:   { label: 'รอดำเนินการ',   icon: '⏳', pillClass: 'pill-pending',   est: 'เจ้าหน้าที่กำลังตรวจสอบคำสั่งซื้อของคุณ' },
  packing:   { label: 'กำลังแพ็คสินค้า', icon: '📦', pillClass: 'pill-packing',   est: 'กำลังเตรียมและแพ็คหนังสือให้คุณ' },
  shipped:   { label: 'จัดส่งแล้ว',    icon: '🚚', pillClass: 'pill-shipped',   est: 'หนังสืออยู่ระหว่างการจัดส่ง คาดว่าได้รับใน 1–3 วัน' },
  delivered: { label: 'ส่งสำเร็จ',   icon: '✅', pillClass: 'pill-delivered', est: 'คุณได้รับหนังสือแล้ว ขอบคุณที่อุดหนุนร้านเรา 🙏' },
  cancelled: { label: 'ยกเลิกแล้ว',  icon: '❌', pillClass: 'pill-cancelled', est: 'คำสั่งซื้อนี้ถูกยกเลิก กรุณาติดต่อร้านเพื่อสอบถาม' }
};

const TIMELINE_STEPS = [
  { key: 'pending',   icon: '📋', label: 'รับคำสั่งซื้อ' },
  { key: 'packing',   icon: '📦', label: 'แพ็คสินค้า' },
  { key: 'shipped',   icon: '🚚', label: 'จัดส่งแล้ว' },
  { key: 'delivered', icon: '✅', label: 'ได้รับสินค้า' }
];

const STATUS_ORDER = ['pending', 'packing', 'shipped', 'delivered'];

/* ── Helpers ── */
function showBanner(text, type = 'info') {
  statusBanner.style.display = '';
  statusBanner.textContent = text;
  statusBanner.className = `status-banner ${type}`;
}

function hideBanner() { statusBanner.style.display = 'none'; }

function formatPrice(v) { return Number(v).toLocaleString('th-TH'); }

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function parseItems(raw) {
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return []; }
}

/* ── Build timeline ── */
function buildTimeline(status) {
  if (status === 'cancelled') {
    return `
      <div style="display:flex;align-items:center;gap:8px;color:var(--rose);font-size:0.9rem;margin-bottom:20px;
        background:rgba(224,92,122,0.08);border:1px solid rgba(224,92,122,0.2);border-radius:10px;padding:12px 14px;">
        ❌ คำสั่งซื้อนี้ถูกยกเลิกแล้ว
      </div>`;
  }
  const currentIdx = STATUS_ORDER.indexOf(status);

  return `
    <div class="timeline-h" role="list" aria-label="ขั้นตอนการจัดส่ง">
      ${TIMELINE_STEPS.map((step, idx) => {
        const isDone   = idx < currentIdx;
        const isActive = idx === currentIdx;
        const circleCls = isDone ? 'done' : isActive ? 'active' : '';
        const labelCls  = isDone ? 'done' : isActive ? 'active' : '';
        return `
          <div class="tl-step" role="listitem">
            <div class="tl-circle ${circleCls}">${step.icon}</div>
            <div class="tl-label ${labelCls}">${step.label}</div>
          </div>`;
      }).join('')}
    </div>`;
}

/* ── Build a single order card ── */
function buildResultCard(order, idx) {
  const status  = order.status || 'pending';
  const cfg     = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const items   = parseItems(order.items);
  const total   = order.total || items.reduce((s, i) => s + i.price * i.quantity, 0);
  const accentCls = `status-${status}`;

  const itemsHtml = items.length === 0 ? '' : `
    <div class="items-section">
      <button class="items-toggle" data-id="${order.id}" aria-expanded="false">
        <span>📚 หนังสือที่สั่ง (${items.length} รายการ)</span>
        <span class="chevron">▼</span>
      </button>
      <div class="items-body" id="ibody-${order.id}">
        ${items.map(item => `
          <div class="item-row">
            <span class="item-name">${item.name}</span>
            <span class="item-qty">× ${item.quantity}</span>
            <span class="item-price">${formatPrice(item.price * item.quantity)} บาท</span>
          </div>`).join('')}
        <div class="items-total">
          <span>ยอดรวม</span>
          <span class="total-val">${formatPrice(total)} บาท</span>
        </div>
      </div>
    </div>`;

  return `
    <div class="result-card" style="animation-delay:${idx * 0.08}s">
      <div class="result-card-top ${accentCls}"></div>
      <div class="result-card-body">

        <!-- Meta row -->
        <div class="result-card-meta">
          <div>
            <div class="result-order-id">คำสั่งซื้อ #${order.id}</div>
            <div class="result-order-date">🗓 ${formatDate(order.created_at)}</div>
            ${order.recipient_address
              ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">📍 ${order.recipient_address}</div>`
              : ''}
          </div>
          <div class="current-status-pill">
            <div class="status-pill ${cfg.pillClass}">${cfg.icon} ${cfg.label}</div>
            <div class="pill-label">สถานะปัจจุบัน</div>
          </div>
        </div>

        <!-- Timeline -->
        <div class="progress-section">
          <div class="progress-label">ความคืบหน้า</div>
          ${buildTimeline(status)}
        </div>

        <!-- Estimated message -->
        <div class="est-note">
          <span class="est-icon">💬</span>
          <span>${cfg.est}</span>
        </div>

        <!-- Note -->
        ${order.note ? `
          <div style="margin-top:12px;padding:10px 14px;background:rgba(255,255,255,0.03);
            border-left:2px solid var(--gold);border-radius:0 8px 8px 0;font-size:0.82rem;color:var(--text-muted);">
            📝 หมายเหตุ: ${order.note}
          </div>` : ''}

        <!-- Items toggle -->
        ${itemsHtml}

      </div>
    </div>`;
}

/* ── Render results ── */
function renderResults(orders, phone) {
  if (orders.length === 0) {
    resultsArea.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">🔍</div>
        <h3>ไม่พบคำสั่งซื้อ</h3>
        <p>ไม่พบคำสั่งซื้อสำหรับเบอร์ <strong>${phone}</strong><br/>
           ตรวจสอบเบอร์โทรให้ถูกต้อง หรือ <a href="shipping.html" style="color:var(--gold);">สั่งซื้อเลย →</a></p>
      </div>`;
    return;
  }

  resultsArea.innerHTML = `
    <p class="results-heading">พบ ${orders.length} คำสั่งซื้อ สำหรับเบอร์ ${phone}</p>
    <div class="result-list">
      ${orders.map((order, i) => buildResultCard(order, i)).join('')}
    </div>`;

  /* Attach item toggle events */
  resultsArea.querySelectorAll('.items-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const id   = btn.dataset.id;
      const body = document.getElementById(`ibody-${id}`);
      const open = body.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open);
    });
  });
}

/* ── Lookup by phone ── */
async function lookupOrders(phone) {
  if (!phone) return;

  lookupBtn.textContent = '⌛ กำลังค้นหา...';
  lookupBtn.disabled    = true;
  resultsArea.innerHTML = '';
  hideBanner();

  // Try exact match first, then fuzzy (strip dashes/spaces)
  const cleanPhone = phone.replace(/[-\s]/g, '');

  try {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .or(`recipient_phone.eq.${phone},recipient_phone.eq.${cleanPhone}`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderResults(data || [], phone);
    if (data && data.length > 0) {
      showBanner(`✅ พบ ${data.length} คำสั่งซื้อ`, 'success');
    } else {
      showBanner('ไม่พบคำสั่งซื้อสำหรับเบอร์นี้', 'error');
    }
  } catch (err) {
    console.error('Lookup failed:', err);
    showBanner('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง', 'error');
    resultsArea.innerHTML = `
      <div class="empty-state">
        <div class="big-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p>ไม่สามารถเชื่อมต่อระบบได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>
      </div>`;
  } finally {
    lookupBtn.textContent = '🔍 ค้นหา';
    lookupBtn.disabled    = false;
  }
}

/* ── Events ── */
lookupForm.addEventListener('submit', e => {
  e.preventDefault();
  const phone = phoneInput.value.trim();
  if (!phone) {
    phoneInput.focus();
    showBanner('กรุณากรอกเบอร์โทรศัพท์', 'error');
    return;
  }
  lookupOrders(phone);
});

/* Auto-fill phone from URL param: order-status.html?phone=089xxx */
const urlPhone = new URLSearchParams(window.location.search).get('phone');
if (urlPhone) {
  phoneInput.value = urlPhone;
  lookupOrders(urlPhone);
}
