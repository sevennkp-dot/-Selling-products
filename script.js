let products = [
  { id: 1, name: 'เรื่องเล่าจากปลายปากกา', author: 'กมลวรรณ ชูชัย', category: 'นวนิยาย', price: 320, description: 'รวมเรื่องสั้นอบอุ่นหัวใจ สำหรับคนรักการอ่าน', image: 'เรื่องเล่าจากปลายปากกา' },
  { id: 2, name: 'พงศาวดารแห่งความฝัน', author: 'สิริพงศ์ ธนศักดิ์', category: 'นวนิยาย', price: 420, description: 'นิยายแฟนตาซีภาพสวย เนื้อเรื่องลุ่มลึก', image: 'พงศาวดารแห่งความฝัน' },
  { id: 3, name: 'เคล็ดลับชีวิตฉบับมินิมอล', author: 'ดาริน กลิ่นหอม', category: 'พัฒนาตัวเอง', price: 280, description: 'หนังสือแนวพัฒนาตัวเอง เพื่อชีวิตที่เรียบง่าย', image: 'เคล็ดลับชีวิตฉบับมินิมอล' },
  { id: 4, name: 'สูตรอาหารพื้นบ้านไทย', author: 'วรรณา กุสุมา', category: 'อาหาร', price: 350, description: 'รวมสูตรเด็ดพร้อมภาพประกอบ เหมาะสำหรับทำกินที่บ้าน', image: 'สูตรอาหารพื้นบ้านไทย' },
  { id: 5, name: 'โลกแห่งศิลป์และการออกแบบ', author: 'ปริญญา สงวนสัตย์', category: 'ศิลปะ', price: 470, description: 'หนังสือภาพแรงบันดาลใจสำหรับนักออกแบบและคนรักศิลปะ', image: 'โลกแห่งศิลป์และการออกแบบ' },
  { id: 6, name: 'สัมภาษณ์ชีวิตนักเขียน', author: 'อาทิตยา จันทร์ฉาย', category: 'สัมภาษณ์', price: 390, description: 'บทสัมภาษณ์นักเขียนชื่อดัง พร้อมแนวคิดการสร้างสรรค์', image: 'สัมภาษณ์ชีวิตนักเขียน' }
];

const SUPABASE_URL = 'https://kmkfdtimdlfipbgimval.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtta2ZkdGltZGxmaXBiZ2ltdmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5NjMxMjIsImV4cCI6MjA5ODUzOTEyMn0.ATkWYnp1uGr8NAhzgL2V_t4CNgvwOq0yinsSmWvNbtI';
let supabaseClient = null;
const IS_FILE_PROTOCOL = typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
try {
  if (!IS_FILE_PROTOCOL && typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    // In file:// mode we intentionally avoid initializing the client (CORS will block requests).
    if (!IS_FILE_PROTOCOL) console.warn('Supabase SDK not available on window.supabase');
  }
} catch (e) {
  console.error('Error initializing Supabase client', e);
}

const cart = new Map();
const productGrid = document.getElementById('productGrid');
const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const cartFooterTotalEl = document.getElementById('cartFooterTotal');
const checkoutButton = document.getElementById('checkoutButton');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchInput');
const categoryButtons = Array.from(document.querySelectorAll('.chip'));

// Map category to an emoji icon for book covers
const CATEGORY_ICONS = {
  'นวนิยาย': '📖',
  'พัฒนาตัวเอง': '🌱',
  'อาหาร': '🍜',
  'ศิลปะ': '🎨',
  'สัมภาษณ์': '🎙️',
  'default': '📚'
};

let currentCategory = 'all';
let currentSearch = '';

function formatPrice(value) {
  return value.toLocaleString('th-TH');
}

function setStatusMessage(text, type = 'info') {
  statusMessage.textContent = text;
  statusMessage.className = `status-banner ${type}`;
}

async function loadProducts() {
  // Initialize local fallback if not exists
  const initialDefault = [
    { id: 1, name: 'เรื่องเล่าจากปลายปากกา', author: 'กมลวรรณ ชูชัย', category: 'นวนิยาย', price: 320, description: 'รวมเรื่องสั้นอบอุ่นหัวใจ สำหรับคนรักการอ่าน', image: 'เรื่องเล่าจากปลายปากกา' },
    { id: 2, name: 'พงศาวดารแห่งความฝัน', author: 'สิริพงศ์ ธนศักดิ์', category: 'นวนิยาย', price: 420, description: 'นิยายแฟนตาซีภาพสวย เนื้อเรื่องลุ่มลึก', image: 'พงศาวดารแห่งความฝัน' },
    { id: 3, name: 'เคล็ดลับชีวิตฉบับมินิมอล', author: 'ดาริน กลิ่นหอม', category: 'พัฒนาตัวเอง', price: 280, description: 'หนังสือแนวพัฒนาตัวเอง เพื่อชีวิตที่เรียบง่าย', image: 'เคล็ดลับชีวิตฉบับมินิมอล' },
    { id: 4, name: 'สูตรอาหารพื้นบ้านไทย', author: 'วรรณา กุสุมา', category: 'อาหาร', price: 350, description: 'รวมสูตรเด็ดพร้อมภาพประกอบ เหมาะสำหรับทำกินที่บ้าน', image: 'สูตรอาหารพื้นบ้านไทย' },
    { id: 5, name: 'โลกแห่งศิลป์และการออกแบบ', author: 'ปริญญา สงวนสัตย์', category: 'ศิลปะ', price: 470, description: 'หนังสือภาพแรงบันดาลใจสำหรับนักออกแบบและคนรักศิลปะ', image: 'โลกแห่งศิลป์และการออกแบบ' },
    { id: 6, name: 'สัมภาษณ์ชีวิตนักเขียน', author: 'อาทิตยา จันทร์ฉาย', category: 'สัมภาษณ์', price: 390, description: 'บทสัมภาษณ์นักเขียนชื่อดัง พร้อมแนวคิดการสร้างสรรค์', image: 'สัมภาษณ์ชีวิตนักเขียน' }
  ];
  if (!localStorage.getItem('local_products')) {
    localStorage.setItem('local_products', JSON.stringify(initialDefault));
  }

  try {
    if (IS_FILE_PROTOCOL) {
      // Running from file:// — use local fallback and do not attempt network requests
      products = JSON.parse(localStorage.getItem('local_products')) || initialDefault;
      localStorage.setItem('local_products', JSON.stringify(products));
      setStatusMessage('โหมดออฟไลน์ (file://) — ใช้ข้อมูลในเครื่อง', 'info');
      return;
    }

    if (!supabaseClient) throw new Error('Supabase client not initialized');
    const { data, error } = await supabaseClient.from('products').select('*').order('id', { ascending: true });
    if (error) {
      throw error;
    }
    if (data && data.length > 0) {
      products = data.map((item) => ({
        id: item.id,
        name: item.name,
        author: item.author || 'ผู้เขียนไม่ระบุ',
        category: item.category || 'ทั่วไป',
        description: item.description,
        price: item.price,
        image: item.image || item.name
      }));
      localStorage.setItem('local_products', JSON.stringify(products));
      setStatusMessage('เชื่อมต่อฐานข้อมูล Supabase สำเร็จ', 'success');
    } else {
      products = JSON.parse(localStorage.getItem('local_products'));
      setStatusMessage('ใช้ฐานข้อมูลจำลอง (ไม่มีข้อมูลใน Supabase)', 'info');
    }
  } catch (error) {
    console.error('Supabase product load error:', error);
    products = JSON.parse(localStorage.getItem('local_products')) || initialDefault;
    if (IS_FILE_PROTOCOL) {
      setStatusMessage('โหมดออฟไลน์ (file://) — ใช้ข้อมูลในเครื่อง', 'info');
    } else if (error && String(error.message).includes('initialized')) {
      setStatusMessage('ไม่สามารถโหลด Supabase SDK — โปรดรันเว็บผ่าน http://localhost หรือเปิด Live Server', 'error');
    } else {
      setStatusMessage('⚠️ เชื่อมต่อขัดข้อง: กำลังใช้งานในโหมดฐานข้อมูล Offline (บันทึกในบราวเซอร์ของคุณ)', 'info');
    }
  }
}

function getFilteredProducts() {
  return products.filter((product) => {
    const category = product.category || 'ทั่วไป';
    const matchesCategory = currentCategory === 'all' || category === currentCategory;
    const text = `${product.name} ${product.author || ''} ${product.description} ${category}`.toLowerCase();
    const matchesSearch = currentSearch === '' || text.includes(currentSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  if (filtered.length === 0) {
    productGrid.innerHTML = '<div class="empty-results"><div class="empty-icon">📭</div><p>ไม่พบหนังสือที่ตรงกับการค้นหา</p></div>';
    return;
  }

  productGrid.innerHTML = filtered
    .map(
      (product) => {
        const icon = CATEGORY_ICONS[product.category] || CATEGORY_ICONS['default'];
        return `
      <article class="product-card" role="listitem">
        <div class="product-image" data-category="${product.category}">
          <div class="product-image-inner" style="--icon:'${icon}'">
            <span style="font-size:2.4rem;">${icon}</span>
          </div>
        </div>
        <div class="product-body">
          <div class="category-label">${product.category}</div>
          <h3>${product.name}</h3>
          <p class="product-author">โดย ${product.author || 'ผู้เขียนไม่ระบุ'}</p>
          <p class="product-desc">${product.description}</p>
          <div class="product-footer">
            <span class="product-price">${formatPrice(product.price)}<span class="currency">บาท</span></span>
            <button class="add-button" data-id="${product.id}">ใส่ตะกร้า</button>
          </div>
        </div>
      </article>
    `;
      })
    .join('');

  productGrid.querySelectorAll('.add-button').forEach((button) => {
    button.addEventListener('click', () => {
      const id = Number(button.dataset.id);
      addToCart(id);
    });
  });
}

function updateCartDisplay() {
  const items = Array.from(cart.values());
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCountEl) cartCountEl.textContent = count;
  if (cartTotalEl) cartTotalEl.textContent = `${formatPrice(total)} บาท`;
  if (cartFooterTotalEl) cartFooterTotalEl.textContent = `${formatPrice(total)} บาท`;
  checkoutButton.disabled = total === 0;
  saveCartToStorage();

  if (items.length === 0) {
    cartItemsEl.innerHTML = '<p class="empty-cart">ยังไม่มีสินค้าในตะกร้า</p>';
    return;
  }


  cartItemsEl.innerHTML = items
    .map(
      (item) => `
      <div class="cart-item">
        <div class="cart-item-info">
          <strong>${item.name}</strong>
          <span>${formatPrice(item.price)} บาท x ${item.quantity} = ${formatPrice(item.price * item.quantity)} บาท</span>
        </div>
        <div class="cart-item-actions">
          <div class="quantity-control">
            <button data-id="${item.id}" class="decrease">-</button>
            <span>${item.quantity}</span>
            <button data-id="${item.id}" class="increase">+</button>
          </div>
          <button data-id="${item.id}" class="remove-button">ลบ</button>
        </div>
      </div>
    `
    )
    .join('');

  cartItemsEl.querySelectorAll('.decrease').forEach((button) => {
    button.addEventListener('click', () => changeQuantity(Number(button.dataset.id), -1));
  });

  cartItemsEl.querySelectorAll('.increase').forEach((button) => {
    button.addEventListener('click', () => changeQuantity(Number(button.dataset.id), 1));
  });

  cartItemsEl.querySelectorAll('.remove-button').forEach((button) => {
    button.addEventListener('click', () => removeFromCart(Number(button.dataset.id)));
  });
}

function loadCartFromStorage() {
  const stored = localStorage.getItem('shoppingCart');
  if (!stored) return;
  try {
    const items = JSON.parse(stored);
    items.forEach((item) => {
      cart.set(item.id, { ...item });
    });
  } catch (error) {
    console.error('Load cart from storage failed', error);
  }
}

function saveCartToStorage() {
  const items = Array.from(cart.values()).map((it) => ({
    id: it.id,
    name: it.name,
    price: Number(it.price || 0),
    quantity: Number(it.quantity || 0),
    image: it.image,
    category: it.category,
    author: it.author,
    description: it.description
  }));
  localStorage.setItem('shoppingCart', JSON.stringify(items));
}

function clearCartStorage() {
  localStorage.removeItem('shoppingCart');
}

function updateFilterState(category, search) {
  if (category) {
    currentCategory = category;
  }
  if (typeof search === 'string') {
    currentSearch = search;
  }
  categoryButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.category === currentCategory);
  });
  renderProducts();
}

function addSearchListeners() {
  searchInput.addEventListener('input', (event) => {
    updateFilterState(null, event.target.value);
  });
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      updateFilterState(button.dataset.category, currentSearch);
    });
  });
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  const existing = cart.get(productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(productId, { ...product, quantity: 1 });
  }

  updateCartDisplay();
}

function changeQuantity(productId, delta) {
  const item = cart.get(productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) {
    cart.delete(productId);
  }

  updateCartDisplay();
}

function removeFromCart(productId) {
  cart.delete(productId);
  updateCartDisplay();
}

checkoutButton.addEventListener('click', () => {
  const items = Array.from(cart.values());
  if (items.length === 0) return;

  saveCartToStorage();
  window.location.href = 'shipping.html';
});

(async function initApp() {
  try {
    loadCartFromStorage();
    addSearchListeners();
    await loadProducts();
    renderProducts();
    updateCartDisplay();
  } catch (e) {
    console.error('Initialization error:', e);
    setStatusMessage('เกิดข้อผิดพลาดขณะเริ่มต้นแอป โปรดดู Console', 'error');
  }
})();
