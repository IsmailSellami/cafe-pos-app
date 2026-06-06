import { createClient } from 'https://esm.sh/@supabase/supabase-js'

document.addEventListener("DOMContentLoaded", async () => {
  const divv = document.getElementById("table-lieu");
  // const categoriesContainer = document.getElementById("categories");
  // const productsContainer = document.getElementById("products");
  const supabase = createClient(
  "https://ewciynnuevuzbcrwcjut.supabase.co",
  "sb_publishable_Wmg-8fvM8hCvb9UEm3AmFA_WuWHlooj" // anon key
);
// Supabase client موجود عندك
const tablesChannel = supabase
  .channel('realtime-tables')
  .on(
    
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tablee' },
    payload => {
      console.log('Table change detected:', payload.new.status);
      console.log(payload);
    if(payload.new.status=='online' ){
      console.log("ahemd")
      loadOrdersForTable(payload.new.id)
    }
    console.log(payload.new.type=='libre')
    if(payload.new.type=='libre' ){
        const btn = document.getElementById(`btn-${payload.new.id}`);
        btn.style.backgroundColor = "#ffffff;";

    }

      console.log('tables change:', payload);
      console.log('Current order items for this table:', orderItemsByTable[payload.new.id]); 
      // هنا تعمل update للـ UI
    }
  )
  .subscribe(status => console.log('tables realtime:', status));

 


  const recuChannel = supabase
  .channel('realtime-recu')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'recu' }, payload => {
      console.log('Recu change detected:', payload);
      if (payload.new.type === 'accepted'&& payload.new.heurf === null) 
       loadOrdersForTable(payload.new.id)
      

    // هنا تحدث واجهة الإيصالات أو الفواتير
    if (orderInboxOpen) loadRecuInbox();
  })
  .subscribe(status => console.log('Recu realtime status:', status));
const orderrChannel = supabase
  .channel('realtime-orderr')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orderr' }, payload => {
      console.log('orderr change detected:', payload);
      if (payload.new.type === 'Accepted') 
       loadOrdersForTable(payload.new.id)
      

    // هنا تحدث واجهة الإيصالات أو الفواتير
    if (orderInboxOpen) loadRecuInbox();
  })
  .subscribe(status => console.log('Recu realtime status:', status));
  const containersByTable = {}; // map tableId -> { menuSectionEl, categoriesEl, productsEl, orderListEl, totalEl, selectedCategory }
  const orderList = document.getElementById("orderList");
  const totalAmount = document.getElementById("totalAmount");
  const orderingContainer = document.querySelector(".ordering-container");
  const orderingTemplate = document.getElementById('ordering-template');



  let selectedCategory = null;
  let orderItems = [];
  let currentTable = null;
  const orderItemsByTable = {};
  let itemss = [];
  let orderInboxOpen = false;

  function setupOrderInbox() {
    const listHost = document.querySelector('.liste');
    if (!listHost) return;

    listHost.innerHTML = `
      <button class="order-inbox-trigger" type="button" title="Commandes">
        <i class="fa-solid fa-list"></i>
      </button>
      <div class="order-inbox-overlay" id="orderInboxOverlay" aria-hidden="true">
        <section class="order-inbox" role="dialog" aria-label="Commandes">
          <div class="order-inbox-header">
            <h2>Commandes</h2>
            <button class="order-inbox-close" type="button" title="Fermer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="order-inbox-columns" id="orderInboxColumns"></div>
        </section>
      </div>
      <div class="pending-order-modal" id="pendingOrderModal" aria-hidden="true">
        <section class="pending-order-dialog" role="dialog" aria-label="Details commande pending">
          <div class="pending-order-header">
            <div>
              <span class="pending-order-eyebrow">Pending</span>
              <h2 id="pendingOrderTitle">Commande</h2>
            </div>
            <button class="pending-order-close" type="button" title="Fermer">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="pending-order-body" id="pendingOrderBody"></div>
          <div class="pending-order-footer">
            <button class="pending-order-refuse" type="button">
              <i class="fa-solid fa-ban"></i>
              Refuse
            </button>
            <button class="pending-order-accept" type="button">
              <i class="fa-solid fa-check"></i>
              Accept
            </button>
          </div>
        </section>
      </div>
    `;

    listHost.querySelector('.order-inbox-trigger')?.addEventListener('click', async () => {
      if (orderInboxOpen) {
        closeOrderInbox();
        return;
      }

      if (currentTable) {
        closeOrderingInterface();
      }

      orderInboxOpen = true;
      document.body.classList.add('order-inbox-active');
      document.getElementById('orderInboxOverlay')?.classList.add('show');
      await loadRecuInbox();
    });

    listHost.querySelector('.order-inbox-close')?.addEventListener('click', closeOrderInbox);
    listHost.querySelector('#orderInboxOverlay')?.addEventListener('click', (event) => {
      if (event.target.id === 'orderInboxOverlay') closeOrderInbox();
    });

    listHost.querySelector('#orderInboxColumns')?.addEventListener('click', async (event) => {
      const card = event.target.closest('.recu-card[data-recu-type="pending"]');
      if (!card) return;

      await openPendingOrderModal(card.dataset.idrecu);
    });

    listHost.querySelector('.pending-order-close')?.addEventListener('click', closePendingOrderModal);
    listHost.querySelector('#pendingOrderModal')?.addEventListener('click', (event) => {
      if (event.target.id === 'pendingOrderModal') closePendingOrderModal();
    });

    listHost.querySelector('#pendingOrderBody')?.addEventListener('click', async (event) => {
      const itemButton = event.target.closest('[data-pending-item-action]');
      if (!itemButton) return;

      const modal = document.getElementById('pendingOrderModal');
      const idrecu = modal?.dataset.idrecu;
      const rowKey = itemButton.dataset.rowKey;
      const action = itemButton.dataset.pendingItemAction;
      if (!idrecu || !rowKey) return;

      itemButton.disabled = true;

      try {
        let result = null;
        if (action === 'accept') {
          result = await updatePendingItem(idrecu, rowKey, 'accept');
        } else if (action === 'refuse') {
          result = await updatePendingItem(idrecu, rowKey, 'refuse');
        }

        if (result?.recuAccepted) {
          closePendingOrderModal();
          await loadRecuInbox();
          return;
        }

        await refreshPendingOrderModal(idrecu);
        await loadRecuInbox();
      } catch (error) {
        console.warn('Pending item action failed:', error);
        alert(error.message || 'Action impossible');
      } finally {
        itemButton.disabled = false;
      }
    });

    listHost.querySelector('.pending-order-accept')?.addEventListener('click', async () => {
      const modal = document.getElementById('pendingOrderModal');
      const idrecu = modal?.dataset.idrecu;
      if (!idrecu) return;

      try {
        await acceptPendingOrder(idrecu);
        closePendingOrderModal();
        await loadRecuInbox();
      } catch (error) {
        console.warn('Pending order accept failed:', error);
        alert(error.message || 'Action impossible');
      }
    });
  }

  function closeOrderInbox() {
    orderInboxOpen = false;
    document.body.classList.remove('order-inbox-active');
    document.getElementById('orderInboxOverlay')?.classList.remove('show');
  }

  function normalizeRecuType(type) {
    console.log('Normalizing recu type:', type);
    const value = String(type || 'pending').toLowerCase();
    if (value === 'accept') return 'accepted';
    return value;
  }

  async function fetchRecuInbox() {
    try {
      const response = await fetch('/api/recu-status');
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching recu inbox:', error);
      return [];
    }
  }

  async function fetchPendingOrderDetails(idrecu) {
    const response = await fetch(`/api/recu-status/${encodeURIComponent(idrecu)}/items`);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to load pending order');
    }
    return data;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(data?.error || 'Action impossible');
    }
    return data;
  }

  async function updatePendingItem(idrecu, rowKey, action) {
    const url = `/api/recu-status/${encodeURIComponent(idrecu)}/items/${encodeURIComponent(rowKey)}`;
    if (action === 'accept') {
      return requestJson(`${url}/accept`, { method: 'PUT' });
    }
    return requestJson(url, { method: 'DELETE' });
  }

  async function acceptPendingOrder(idrecu) {
    return requestJson(`/api/recu-status/${encodeURIComponent(idrecu)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Accepted' }),
    });
  }

  function closePendingOrderModal() {
    const modal = document.getElementById('pendingOrderModal');
    if (!modal) return;
    modal.classList.remove('show');
    delete modal.dataset.idrecu;
  }

  function formatPrice(value) {
    const num = Number(value);
    return Number.isFinite(num) ? `${num.toFixed(3)} DT` : '0.000 DT';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char]));
  }

  function renderPendingOrderDetails(data) {
    const body = document.getElementById('pendingOrderBody');
    const title = document.getElementById('pendingOrderTitle');
    if (!body || !title) return;

    const recu = data.recu || {};
    const items = Array.isArray(data.items) ? data.items : [];
    const total = items.reduce((sum, item) => sum + Number(item.price || 0), 0);

    title.textContent = `Table ${recu.numtable ?? ''} - Recu ${recu.idrecu ?? ''}`;

    if (items.length === 0) {
      body.innerHTML = '<p class="pending-order-empty">Aucun produit dans cette commande.</p>';
      return;
    }

    body.innerHTML = `
      <div class="pending-order-summary">
        <span><strong>${items.length}</strong> produits</span>
        <span><strong>${formatPrice(total)}</strong></span>
      </div>
      <div class="pending-order-items">
        ${items.map(item => `
          <article class="pending-order-item">
            <div>
              <h3>${escapeHtml(item.idname)}</h3>
              <p>${item.option ? escapeHtml(item.option) : 'Sans option'}</p>
            </div>
            <div class="pending-order-item-side">
              <strong>${formatPrice(item.price)}</strong>
              <div class="pending-order-item-actions">
                <button class="pending-item-add" type="button" title="Accepter" data-pending-item-action="accept" data-row-key="${escapeHtml(item.row_key)}">
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
                <button class="pending-item-refuse" type="button" title="Refuser" data-pending-item-action="refuse" data-row-key="${escapeHtml(item.row_key)}">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  async function openPendingOrderModal(idrecu) {
    const modal = document.getElementById('pendingOrderModal');
    const body = document.getElementById('pendingOrderBody');
    const title = document.getElementById('pendingOrderTitle');
    if (!modal || !body || !title) return;

    modal.classList.add('show');
    modal.dataset.idrecu = idrecu;
    title.textContent = 'Commande';
    body.innerHTML = '<p class="pending-order-loading">Chargement de la commande...</p>';

    await refreshPendingOrderModal(idrecu);
  }

  async function refreshPendingOrderModal(idrecu) {
    const body = document.getElementById('pendingOrderBody');
    if (!body) return;

    try {
      const data = await fetchPendingOrderDetails(idrecu);
      renderPendingOrderDetails(data);
    } catch (error) {
      console.warn('Failed to load pending order details:', error);
      body.innerHTML = `<p class="pending-order-empty">${error.message}</p>`;
    }
  }

  function makeInboxCard(row) {
    console.log(row);
    const type = normalizeRecuType(row.type);
    const card = document.createElement('article');
    card.className = `recu-card recu-${type}`;
    card.dataset.idrecu = row.idrecu;
    card.dataset.recuType = type;

    const meta = document.createElement('div');
    meta.className = 'recu-card-meta';

    const recuId = document.createElement('span');
    recuId.innerHTML = '<strong>id</strong>';
    recuId.append(` ${row.idrecu}`);

    const tableNum = document.createElement('span');
    tableNum.innerHTML = '<strong>num</strong>';
    tableNum.append(` ${row.numtable}`);

    meta.append(recuId, tableNum);
    card.appendChild(meta);

    if (type === 'pending') {
      const hint = document.createElement('span');
      hint.className = 'recu-open-hint';
      hint.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      card.appendChild(hint);
    }

    return card;
  }

  async function loadRecuInbox() {
    const container = document.getElementById('orderInboxColumns');
    if (!container) return;

    container.innerHTML = '<p class="recu-loading">Chargement...</p>';
    const rows = await fetchRecuInbox();
    const groups = {
      pending: [],
      accepted: [],
      served: [],
      
    };

    rows.forEach(row => {
      const type = normalizeRecuType(row.type);
      if (!groups[type]) groups[type] = [];
      groups[type].push(row);
    });

    container.innerHTML = '';
    [
      ['pending', 'Pending'],
      ['accepted', 'Accept'],
      ['served', 'Served'],
    ].forEach(([type, label]) => {
      const column = document.createElement('div');
      column.className = `recu-column recu-column-${type}`;
      const title = document.createElement('h3');
      title.innerHTML = `
        <span>${label}</span>
        <strong>${groups[type]?.length || 0}</strong>
      `;
      column.appendChild(title);

      if (!groups[type] || groups[type].length === 0) {
        const empty = document.createElement('p');
        empty.className = 'recu-empty';
        empty.textContent = 'Vide';
        column.appendChild(empty);
      } else {
        groups[type].forEach(row => column.appendChild(makeInboxCard(row)));
      }

      container.appendChild(column);
    });
  }

  // hide template if present
 
  if (orderingTemplate) {
    orderingTemplate.style.display = 'none';
  }
  setupOrderInbox();
  // --- SOCKET.IO client init (after state vars declared) ---
  
supabase
const commandesChannel = supabase

  .channel('commandes-realtime')

  .subscribe(status => console.log('commandes realtime:', status));
  // Fetch tables from database
  async function fetchTables() {
    try {
      const response = await fetch('/api/tables');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tables:', error);
      return [];
    }
  }

  // Fetch categories from database
  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  // Fetch products from database
  async function fetchProducts() {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }
    async function fetchTableOrder(id) {
    try {
      const response = await fetch(`/api/tablee/${id}/order`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching table order:', error);
      return null;
    }
  }

  // Open ordering interface for a specific table
  function openOrderingInterface(tableNum) {
    if (orderInboxOpen) {
      closeOrderInbox();
    }

    currentTable = tableNum;
    document.body.classList.add('ordering-active');
    document.querySelectorAll('.table-title').forEach(h2 => {
    h2.textContent = 'Table ' + tableNum;
  })

    // hide all other per-table ordering panels
    document.querySelectorAll('.ordering-container-per-table').forEach(el => el.style.display = 'none');


    const container = document.getElementById(`ordering-${tableNum}`);
    const product=document.getElementById('menu-section');
    if (!container) return;
      product.style.display = 'flex';
      container.style.display = 'flex';
    
    
    // ensure data structure for this table
    if (!orderItemsByTable[tableNum]) orderItemsByTable[tableNum] = [];

    // set current orderItems to the table-specific array and refresh UI
    orderItems = orderItemsByTable[tableNum];
    updateOrderDisplay();
  }

  // Close ordering interface (hides current table's panel)
  function closeOrderingInterface() {
    if (currentTable) {
      const container = document.getElementById(`ordering-${currentTable}`);
      const product=document.getElementById('menu-section');
      if (container) {
        container.style.display = 'none';
        product.style.display = 'none';
      }
    }
    currentTable = null;
    orderItems = [];
    document.body.classList.remove('ordering-active');
  }
   async function fetchOccupiedTables() {
    try {
      const resp = await fetch('/api/tables/occupied');
      const data = await resp.json();
      return data.map(r => r.id);
    } catch (err) {
      console.error('Error fetching occupied tables:', err);
      return [];
    }
  }
  async function loadOrdersForTable(id) {
    console.log('Loading orders for table', id);
    try {
      console.log('Loading orders for table ' + id);
      const tblOrder = await fetchTableOrder(id);
      const tableBtn = document.getElementById(`btn-${id}`);
      const tableWrap = document.getElementById(`table-${id}`);
      if (tableBtn) tableBtn.style.backgroundColor = "#913535ff";
      if (tableWrap) tableWrap.classList.add('occupied');
      // enable Change/Imprimer/Sortire for this table panel
      const panel = document.getElementById(`ordering-${id}`);
      if (panel) {
        const bch = panel.querySelector('#ch');
        const bim = panel.querySelector('#im');
        const bso = panel.querySelector('#so');
        if (bch) bch.disabled = false;
        if (bim) bim.disabled = false;
        if (bso) bso.disabled = false;
      }
      if (tblOrder) {
        console.log('Fetched order for table', id, tblOrder,tblOrder.items);
        currentTable = id;
        // store the server items into the table-scoped array
        // normalize server items to include addedAt (older items get earlier timestamps)
        const now = Date.now();
        const serverItems = (tblOrder.items || []);
        console.log('Fetched order items from server for table', id, serverItems);
        orderItemsByTable[id] = serverItems.map((it, idx, arr) => ({ ...it, addedAt: it.addedAt || (now - ((arr.length - idx) * 1000)), removable: false }));
        console.log('Normalized order items with addedAt:', orderItemsByTable[id]);
        orderItems = orderItemsByTable[id];
        updateOrderDisplayForTable(id);
        // start a timer for visual feedback (optional)
        
      }
    } catch (err) {
      console.error('Error loading orders for table', id, err);
    }
  }
  // Render tables
  function renderTables(tables) {
        divv.innerHTML = '';

        // group tables by lieu
        const groups = tables.reduce((acc, t) => {
          const lieu = t.lieu ? String(t.lieu) : 'Default';
          if (!acc[lieu]) acc[lieu] = [];
          acc[lieu].push(t);
          return acc;
        }, {});

        const lieux = Object.keys(groups).sort();
        // top buttons row
        const topRow = document.createElement('div');
        topRow.className = 'lieu-buttons';
        divv.appendChild(topRow);

        // container for table sections (one section per lieu)
        const sectionsContainer = document.createElement('div');
        sectionsContainer.className = 'lieu-sections';
        divv.appendChild(sectionsContainer);

        lieux.forEach((lieu, idx) => {
          // button
          const btnLieu = document.createElement('button');
          btnLieu.className = 'lieu-btn';
          btnLieu.textContent = lieu;
          btnLieu.onclick = () => {
            // show only this section
            sectionsContainer.querySelectorAll('.lieu-wrap').forEach(w => w.style.display = 'none');
            const target = sectionsContainer.querySelector(`.lieu-wrap[data-lieu="${CSS.escape(lieu)}"]`);
            if (target) target.style.display = 'block';
          };
          topRow.appendChild(btnLieu);

          // section for this lieu
          const lieuWrap = document.createElement('div');
          lieuWrap.className = 'lieu-wrap';
          lieuWrap.setAttribute('data-lieu', lieu);
          // hide all except first
          lieuWrap.style.display = idx === 0 ? 'block' : 'none';

          // create table cards inside this section
          groups[lieu].forEach(table => {
            const wrap = document.createElement('div');
            wrap.id = `table-${table.id}`;
            wrap.className = 'table-wrap';

            const track = document.createElement('div');
            track.className = 'track';

            const btn = document.createElement('div');
            btn.id = `btn-${table.id}`;
            btn.className = 'btn-totale';
            btn.onclick = () => openOrderingInterface(table.id);
            btn.innerHTML = `
              <img id="karizma" class="table-icon" src="https://i.postimg.cc/NjcTQG3h/table.png">
              <p class="table-number">Table ${table.id}</p>
            `;
            track.appendChild(btn);
            wrap.appendChild(track);
            lieuWrap.appendChild(wrap);

            // clone ordering template for this table (order panel only)
            if (orderingTemplate) {
              const clone = orderingTemplate.cloneNode(true);
              clone.classList.remove('template');
              clone.classList.add('ordering-container-per-table');
              clone.style.display = 'none';
              clone.id = `ordering-${table.id}`;

              // ensure unique inner IDs for order-list and total
              const orderListEl = clone.querySelector('#orderList');
              if (orderListEl) orderListEl.id = `orderList-${table.id}`;
              const totalEl = clone.querySelector('#totalAmount');
              if (totalEl) totalEl.id = `totalAmount-${table.id}`;

              // rename menu-section, categories and products inside the clone so they are unique and can be targeted per table
              const menuSection = clone.querySelector('#menu-section');
              if (menuSection) menuSection.id = `menu-section-${table.id}`;
              const categoriesEl = clone.querySelector('#categories');
              if (categoriesEl) categoriesEl.id = `categories-${table.id}`;
              const productsEl = clone.querySelector('#products');
              if (productsEl) productsEl.id = `products-${table.id}`;

              // disable Change / Imprimer / Sortire buttons by default for this table panel
              const btnChange = clone.querySelector('#ch');
              const btnImprimer = clone.querySelector('#im');
              const btnSortire = clone.querySelector('#so');
              if (btnChange) btnChange.disabled = true;
              if (btnImprimer) btnImprimer.disabled = true;
              if (btnSortire) btnSortire.disabled = true;

              // store references for this table
              containersByTable[table.id] = {
                menuSectionEl: menuSection || clone.querySelector(`.menu-section`),
                categoriesEl: categoriesEl || clone.querySelector(`.categories`),
                productsEl: productsEl || clone.querySelector(`.products`),
                orderListEl: document.getElementById(`orderList-${table.id}`),
                totalEl: document.getElementById(`totalAmount-${table.id}`),
                selectedCategory: null
              };

              // put clone inside the table wrapper so it's scoped visually to that table
              wrap.appendChild(clone);
            }
          });

          sectionsContainer.appendChild(lieuWrap);
        });

        // auto-select first lieu button (visual feedback)
        const firstBtn = topRow.querySelector('.lieu-btn');
        if (firstBtn) firstBtn.classList.add('active');
        const buttons = document.querySelectorAll('.lieu-btn');

buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    // نحي active من الكل
    buttons.forEach(b => b.classList.remove('active'));

    // نحط active كان على اللي تزاد
    btn.classList.add('active');
  });
});

  }

  // Render categories for a specific table
  async function renderCategoriesForTable(tableId, categories) {
    const container = containersByTable[tableId] && containersByTable[tableId].categoriesEl;
    if (!container) return;
    container.innerHTML = '';
    
    categories.forEach(category => {
      const categoryBtn = document.createElement('button');
      categoryBtn.className = 'category-btn';
      categoryBtn.textContent = category.idcat;
      categoryBtn.onclick = () => selectCategoryForTable(tableId, category.idcat);
      container.appendChild(categoryBtn);
    });
  }

  // Select category for a table and filter products for that table
  function selectCategoryForTable(tableId, categoryId) {
    const ctx = containersByTable[tableId];
    if (!ctx) return;
    ctx.selectedCategory = categoryId;
    
    // Update UI to show selected category inside this table's container
    ctx.categoriesEl.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.textContent === categoryId);
    });
    
    loadProductsForTable(tableId);
  }

  // Load and render products for selected category for a given table
  async function loadProductsForTable(tableId) {
    const ctx = containersByTable[tableId];
    if (!ctx) return;
    const products = await fetchProducts();
    const filteredProducts = products.filter(product => product.idcat === ctx.selectedCategory);
    
    ctx.productsEl.innerHTML = '';
    
    filteredProducts.forEach(product => {
      const productDiv = document.createElement('div');
      productDiv.className = 'product-item';
      productDiv.innerHTML = `
        <img src="${product.img}" alt="${product.idname}" class="product-img">
        <div class="product-info">
          <h4>${product.idname}</h4>
          <p>${product.price} DT</p>
        </div>
        <button class="add-btn">Ajouter</button>
      `;
      // attach add handler bound to this table
      const btn = productDiv.querySelector('.add-btn');
      if (btn){
        btn.addEventListener('click', () => {
          itemss.push({
          name: product.idname,
          price: product.price
        });

      addToOrderForTable(tableId, product.idname, product.price);
});

      }
      ctx.productsEl.appendChild(productDiv);
      
  
    });
  }

  // Add product to order for a specific table
  function addToOrderForTable(tableId, name, price) {
    if (!orderItemsByTable[tableId]) orderItemsByTable[tableId] = [];
    // attach a timestamp and mark as removable because user added it via UI
    const item = { name, price, addedAt: Date.now(), removable: true };
    orderItemsByTable[tableId].push(item);
    // if this table is currently open, reflect the change in UI
    if (currentTable === tableId) {
      orderItems = orderItemsByTable[tableId];
    }
    updateOrderDisplayForTable(tableId);
    return item;
  }
  // Update order display and total for a specific table
  function updateOrderDisplayForTable(tableId) {
    const btn = document.getElementById(`btn-${tableId}`);
    btn.style.backgroundColor = "#ffffff;";
    const ctx = containersByTable[tableId];
    if (!ctx) return;
    const orderListEl = document.getElementById(`orderList-${tableId}`) || ctx.orderListEl;
    const totalEl = document.getElementById(`totalAmount-${tableId}`) || ctx.totalEl;
    const items = orderItemsByTable[tableId] || [];
    if (!orderListEl || !totalEl) return;

    // enable/disable per-table action buttons depending on occupancy / items
    const panel = document.getElementById(`ordering-${tableId}`);
    const wrap = document.getElementById(`table-${tableId}`);
    const isOccupied = !!(wrap && wrap.classList.contains('occupied'));
    const shouldEnable = items.length > 0 || isOccupied;
    if (panel) {
      const bch = panel.querySelector('#ch');
      const bim = panel.querySelector('#im');
      const bso = panel.querySelector('#so');
      if (bch) bch.disabled = !shouldEnable;
      if (bim) bim.disabled = !shouldEnable;
      if (bso) bso.disabled = !shouldEnable;
    }

    if (items.length === 0) {
      orderListEl.innerHTML = '<p>Commande vide.</p>';
      totalEl.textContent = '0.000 DT';
      return;
    }
    
    orderListEl.innerHTML = '';
    let total = 0;
    
    // ensure already-existing (older) items appear first by sorting ascending addedAt
    console.log(items, 'before sorting');
    const itemsSorted = [...items].sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
    itemsSorted.forEach(item => {
      console.log('Rendering item', item);
      const orderItem = document.createElement('div');
      orderItem.className = 'order-item';
      orderItem.innerHTML = `
        <span>${item.name}</span>
        <span>${item.price} DT</span>
      `;
      
      // Only products added locally, before "Demander", can be removed.
      if (item.removable === true) {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btnn';
        delBtn.innerHTML = '<i class="fas fa-trash"></i> <!-- أيقونة Trash -->';
        delBtn.addEventListener('click', () => {
          // remove the specific item by its addedAt timestamp
          orderItemsByTable[tableId] = (orderItemsByTable[tableId] || []).filter(it => it.addedAt !== item.addedAt);
          // also remove one matching entry from the global itemss array (first match)
          for (let i = 0; i < itemss.length; i++) {
            if (itemss[i] && itemss[i].name === item.name && Number(itemss[i].price) === Number(item.price)) {
              itemss.splice(i, 1);
              break;
            }
          }
          // refresh UI
          if (currentTable === tableId) orderItems = orderItemsByTable[tableId];
          updateOrderDisplayForTable(tableId);
        });
        orderItem.appendChild(delBtn);
      }

      orderListEl.appendChild(orderItem);
      total += parseFloat(item.price || 0);
    });
    
    totalEl.textContent = `${total.toFixed(3)} DT`;
  }

  // compatibility wrapper used throughout the file
  function updateOrderDisplay() {
    if (currentTable) updateOrderDisplayForTable(currentTable);
  }
  // When user clicks "Demander", send order via socket (and also POST to server if desired)
  document.addEventListener('click', async (e) => {
    // "Demander" (send order)
    if (e.target && e.target.id === 'de') {
      
      if (!currentTable) { alert('Sélectionnez une table avant de demander'); return; }
      

      const totale = itemss.reduce((s, it) => s + Number(it.price || 0), 0);
      const payload = { numtable: currentTable, itemss, totale };
      if (itemss.length === 0) { alert('Le panier est vide'); return; }
      try {
        const response = await fetch('/demander', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error(await response.text().catch(() => 'Commande non envoyee'));
        }
      } catch (err) {
        console.warn('POST /api/demander failed', err);
        alert('Commande non envoyee');
        return;
      }
      alert('Commande envoyée');
      // hide Supprimer buttons for this table's items (they are now server-side)
      try {
        
        if (orderItemsByTable[currentTable]) orderItemsByTable[currentTable].forEach(it => it.removable = false

        );
        console.log('Marked items as non-removable for table', currentTable, orderItemsByTable[currentTable]);
      } catch (err) { console.warn('Failed to clear removable flags', err); }
      itemss = [];

      updateOrderDisplayForTable(currentTable);
       const oldBtn = document.getElementById(`btn-${currentTable}`);
       oldBtn.style.backgroundColor = "#913535ff";

      return;
    }
    if (e.target && e.target.id === 'ch') {
      // Change table logic
      if (!currentTable) { alert('Sélectionnez d\'abord une table'); return; }
      const tablesResp = await fetch('/api/tables');
      const tablesList = await tablesResp.json().catch(()=>[]);
      const totalTables = Array.isArray(tablesList) ? tablesList.length : 0;
      const input = prompt(`Entrez le numéro de table (1 - ${totalTables}):`);
      if (!input) return;
      const target = Number(input);
      if (!Number.isFinite(target) || target < 1 || target > totalTables) { alert('Numéro de table invalide'); return; }
      if (target === currentTable) { alert('La table cible doit être différente de la table actuelle'); return; }
      const x=currentTable;
      
      // Ensure arrays exist
      if (!orderItemsByTable[currentTable]) orderItemsByTable[currentTable] = [];
      if (!orderItemsByTable[target]) orderItemsByTable[target] = [];

      const hadItemsTarget = (orderItemsByTable[target] || []).length > 0;

      if (hadItemsTarget) {
        // merge: keep target's existing items first, then append current table's items
        orderItemsByTable[target] = [
          ...orderItemsByTable[target],
          ...orderItemsByTable[currentTable]
        ];
      } else {
        // move: transfer items
        orderItemsByTable[target] = [...orderItemsByTable[currentTable]];
      }
      // clear old table
    
      const oldBtn = document.getElementById(`btn-${currentTable}`);
      const newBtn = document.getElementById(`btn-${target}`);
      const oldWrap = document.getElementById(`table-${currentTable}`);
      const newWrap = document.getElementById(`table-${target}`);
      if (oldBtn) oldBtn.style.backgroundColor = '';
      if (newBtn) newBtn.style.backgroundColor = "#913535ff";
      if (oldWrap) oldWrap.classList.remove('occupied');
      if (newWrap) newWrap.classList.add('occupied');

      // update order displays & totals for both tables
      updateOrderDisplayForTable(currentTable);
      updateOrderDisplayForTable(target);

      // switch currentTable to target (open its panel)
      openOrderingInterface(target);

      // notify server to update DB (table statuses and recu/orderr ids)
      try {
        const resp = await fetch('/api/change-table', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          
          body: JSON.stringify({ oldTable: x, newTable: target })
        });
        if (!resp.ok) console.warn('Server change-table request failed', await resp.text().catch(()=>'')); 
      } catch (err) {
        console.warn('Failed to call /api/change-table', err);
      }
    }

    // "Sortire" (automatic exit): stop timer, update DB (tablee.type and recu.heurf), update UI
    if (e.target && e.target.id === 'so') {
      orderItemsByTable[currentTable] = [];
      orderItems = [];
      // determine table id from clicked panel or fallback to currentTable
      let tableId = currentTable;
      const panel = e.target.closest('.ordering-container-per-table');
      if (panel && panel.id && panel.id.startsWith('ordering-')) {
        const parsed = Number(panel.id.replace('ordering-', ''));
        if (Number.isFinite(parsed)) tableId = parsed;
      }
         // Render tables grouped by `lieu` (location). Top buttons allow selecting a location and
          try {
  const resp = await fetch(
    `/api/recu/${encodeURIComponent(currentTable)}/endtime`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' }
    }
  );

  if (!resp.ok) {
    console.warn(
      'Server change-table request failed',
      await resp.text().catch(() => '')
    );
  }
} catch (err) {
  console.warn('Failed to call /api/recu/.../endtime', err);
}


      // only the tables for that location will be displayed (matching the requested UI).

        orderItems = [];
      const oldBtn = document.getElementById(`btn-${currentTable}`);

      const oldWrap = document.getElementById(`table-${currentTable}`);
      if (oldBtn) oldBtn.style.backgroundColor = '';
      if (oldWrap) oldWrap.classList.remove('occupied');
      closeOrderingInterface();
      }
      return;
    });

  // Make functions globally accessible
  window.openOrderingInterface = openOrderingInterface;
  window.closeOrderingInterface = closeOrderingInterface;


  // Add close button event listener (delegated)
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('fa-xmark')) {
      // find the parent ordering container of the clicked close icon
      const panel = e.target.closest('.ordering-container-per-table');
      if (panel) {
        panel.style.display = 'none';
        // clear currentTable if it was this panel
        if (currentTable && panel.id === `ordering-${currentTable}`) {
          currentTable = null;
          orderItems = [];
          document.body.classList.remove('ordering-active');
        }
      } else {
        // fallback to old behavior
        closeOrderingInterface();
      }
    }
  });

  // Initialize everything
  async function init() {
    const tables = await fetchTables();

    renderTables(tables);
    

    const categories = await fetchCategories();
    // render categories into each table's clone container
    tables.forEach(t => {
      if (containersByTable[t.id]) renderCategoriesForTable(t.id, categories);
    });

    const occupied = await fetchOccupiedTables();
    if (occupied && occupied.length > 0) {
      // mark all occupied tables visually
      occupied.forEach(id => {
        console.log(occupied);
        loadOrdersForTable(id)
        console.log('Marking table', id, 'as occupied');
        const btn = document.getElementById(`btn-${id}`);
        const wrap = document.querySelector(`#table-${id}`);
        if (btn) btn.style.backgroundColor = "#913535ff";
        if (wrap) wrap.classList.add('occupied');
      });
      // load orders for first occupied table into the order-list
      await loadOrdersForTable(occupied[0]);
      
    }
    // Auto-select first category for the currently opened table clones
    if (categories.length > 0) {
      tables.forEach(t => {
        if (containersByTable[t.id]) selectCategoryForTable(t.id, categories[0].idcat);
      });
    }
  }

  init();

});

