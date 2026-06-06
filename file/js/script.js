document.addEventListener("DOMContentLoaded", () => {
  initLoginKeypad();
  initParametrePage();
});

function initLoginKeypad() {
  const MAX_LENGTH = 6;
  let code = '';

  const codeDisplay = document.getElementById('codeDisplay');
  const statusText = document.getElementById('status-text');
  const posBody = document.getElementById('posBody');

  const numberKeys = document.querySelectorAll('.key');
  const zeroBtn = document.querySelector('.zero-btn');
  const deleteBtn = document.querySelector('.delete-btn');
  const enterBtn = document.querySelector('.enter-btn');

  if (!codeDisplay || !enterBtn) return;

  function updateDisplay() {
    let display = '';
    for (let i = 0; i < MAX_LENGTH; i++) {
      display += i < code.length ? code[i] : '•';
    }
    codeDisplay.textContent = display;
  }

  function shakeError() {
    if (!statusText || !posBody) return;

    statusText.textContent = 'Wrong password';
    statusText.classList.add('error');
    posBody.classList.add('shake');

    setTimeout(() => {
      posBody.classList.remove('shake');
    }, 300);
  }

  numberKeys.forEach(btn => {
    btn.addEventListener('click', () => {
      if (code.length < MAX_LENGTH) {
        code += btn.textContent.trim();
        updateDisplay();
      }
    });
  });

  if (zeroBtn) {
    zeroBtn.addEventListener('click', () => {
      if (code.length < MAX_LENGTH) {
        code += '0';
        updateDisplay();
      }
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      code = code.slice(0, -1);
      updateDisplay();
    });
  }

  enterBtn.addEventListener('click', async () => {
    if (code.length < MAX_LENGTH) {
      shakeError();
      code = '';
      updateDisplay();
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.ok || !data.redirect) {
        shakeError();
        code = '';
        updateDisplay();
        return;
      }

      code = '';
      // Store username in sessionStorage for welcome notification
      if (data.username) {
        sessionStorage.setItem('welcomeUsername', data.username);
      }
      window.location.href = data.redirect;
    } catch (err) {
      shakeError();
      code = '';
      updateDisplay();
    }
  });

  updateDisplay();
}

function initParametrePage() {
  const formUpdateAccessCodeGerant = document.getElementById('formUpdateAccessCodeGerant');
  const formUpdateAccessCodeServeur = document.getElementById('formUpdateAccessCodeServeur');
  const formAddGerant = document.getElementById('formAddGerant');
  const formAddServeur = document.getElementById('formAddServeur');
  const formUpdateProductPrice = document.getElementById('formUpdateProductPrice');
  const formUpdateProductName = document.getElementById('formUpdateProductName');
  const formUpdateProductImg = document.getElementById('formUpdateProductImg');
  const formProductCategory = document.getElementById('formProductCategory');
  const formAddCategory=document.getElementById('formAddCategory');
  const formAddTableCategoryProduct = document.getElementById('formAddTable');
  const formAddProduct = document.getElementById('formAddProduct');
  const formDeleteGerant = document.getElementById('formDeleteGerant');
  const formDeleteServeur = document.getElementById('formDeleteServeur');
  const formDeleteTable = document.getElementById('formDeleteTable');
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const formDeleteCategory = document.getElementById('formDeleteCategory');
  const formDeleteProduct = document.getElementById('formDeleteProduct');
  passwordInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/\D/g, '').slice(0, 6);
      if (input.value.length !== 6) {
        input.setCustomValidity('Password must be exactly 6 digits');
      } else {
        input.setCustomValidity('');
      }
    });
  });

  async function fetchJson(url, options) {
    console.log('Fetching:', url);
    console.log('Options:', options);
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    return { response, data };
  }

  function populateSelect(selectEl, rows, valueKey, labelKey) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    rows.forEach(row => {
      const option = document.createElement('option');
      option.value =String(row[labelKey]);
      
      option.textContent =valueKey+String(row[labelKey])
      selectEl.appendChild(option);
    });
  }

  async function loadLists() {
    const [gerantsRes, serveursRes, produitsRes, categoriesRes, tablesRes] = await Promise.all([
      fetchJson('/api/gerants'),
      fetchJson('/api/serveurs'),
      fetchJson('/api/products'),
      fetchJson('/api/categories'),
      fetchJson('/api/tables'),
    ]);

    const gerants = Array.isArray(gerantsRes.data) ? gerantsRes.data : [];
    const serveurs = Array.isArray(serveursRes.data) ? serveursRes.data : [];
    const produits = Array.isArray(produitsRes.data) ? produitsRes.data : [];
    const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
    const tables = Array.isArray(tablesRes.data) ? tablesRes.data : [];
    console.log('Loaded gerants:', gerants);
    console.log('Loaded serveurs:', serveurs);
    console.log('Loaded produits:', produits);
    console.log('Loaded categories:', categories);
    console.log('Loaded tables:', tables);

    populateSelect(document.getElementById('gerantSelectForPassword'), gerants, '', 'name');
    populateSelect(document.getElementById('serveurSelectForPassword'), serveurs, '', 'name');
    populateSelect(document.getElementById('deleteGerantSelect'), gerants, '', 'name');
    populateSelect(document.getElementById('deleteServeurSelect'), serveurs, '', 'name');

    populateSelect(document.getElementById('productSelectPrice'), produits, '', 'idname');
    populateSelect(document.getElementById('productSelectName'), produits, '', 'idname');
    populateSelect(document.getElementById('productSelectImg'), produits, '', 'idname');
    populateSelect(document.getElementById('productSelectAddToCat'), produits, '', 'idname');
    populateSelect(document.getElementById('productSelectMoveToCat'), produits, '', 'idname');
    populateSelect(document.getElementById('deleteProductSelect'), produits, '', 'idname');

    populateSelect(document.getElementById('categorySelectAddProd'), categories, '', 'idcat');
    populateSelect(document.getElementById('categorySelectMoveProd'), categories, '', 'idcat');
    populateSelect(document.getElementById('newProductCategorySelect'), categories, '', 'idcat');
    populateSelect(document.getElementById('deleteCategorySelect'), categories, '', 'idcat');

    populateSelect(document.getElementById('deleteTableSelect'), tables, 'table num ', 'id');
    console.log(categories)
    console.log(document.getElementById('deleteTableSelect'))
    console.log(tables)
  }

  function passwordsMatch(a, b) {
    return String(a || '') === String(b || '');
  }

  function requireSixDigitPassword(value) {
    return /^\d{6}$/.test(String(value || ''));
  }

  function handleForm(form, handler) {
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitter = e.submitter;
      await handler(submitter);
    });
  }

  handleForm(formUpdateAccessCodeGerant, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';
    if (submitId === 'saveGerantPasswordBtn') {
      let sel = document.getElementById('gerantSelectForPassword') || document.querySelector('#formUpdateAccessCodeGerant select[name="id"]') || document.querySelector('select[name="id"]');
      let id = sel ? sel.value : undefined;
      const pw1 = document.getElementById('gerantPasswordNew')?.value;
      const pw2 = document.getElementById('gerantPasswordRepeat')?.value;
      if (!id) {
        await loadLists();
        sel = document.getElementById('gerantSelectForPassword') || document.querySelector('#formUpdateAccessCodeGerant select[name="id"]') || document.querySelector('select[name="id"]');
        id = sel ? sel.value : undefined;
      }
      if (!id) {
        alert('Aucun gerant sélectionné — rechargez la page si nécessaire');
        return;
      }
      if (!requireSixDigitPassword(pw1) || !passwordsMatch(pw1, pw2)) {
        alert('Please provide matching 6-digit codes');
        return;
      }

      res=await fetchJson(`/api/gerants/${encodeURIComponent(String(id))}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw1 }),
      });
      
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to update password ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Password updated successfully ✅');
      }
      pw1.value = '';
      pw2.value = '';
      return;
    }
  }); 
  handleForm(formUpdateAccessCodeServeur, async (submitter) => {
        const submitId = submitter && submitter.id ? submitter.id : '';
        if (submitId === 'saveServeurPasswordBtn') {
          let sel = document.getElementById('serveurSelectForPassword') || document.querySelector('#formUpdateAccessCodeServeur select[name="id"]') || document.querySelector('select[name="id"]');
          let id = sel ? sel.value : undefined;
          const pw1 = document.getElementById('serveurPasswordNew')?.value;
          const pw2 = document.getElementById('serveurPasswordRepeat')?.value;
          if (!id) {
            await loadLists();
            sel = document.getElementById('serveurSelectForPassword') || document.querySelector('#formUpdateAccessCodeServeur select[name="id"]') || document.querySelector('select[name="id"]');
            id = sel ? sel.value : undefined;
          }
          if (!id) {
            alert('Aucun serveur sélectionné — rechargez la page si nécessaire');
            return;
          }
          if (!requireSixDigitPassword(pw1) || !passwordsMatch(pw1, pw2)) {
            alert('Please provide matching 6-digit codes');
            return;
          }

          res=await fetchJson(`/api/serveurs/${encodeURIComponent(String(id))}/password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw1 }),
          });
          await loadLists();
          if (!res.response.ok) { 
        alert('Failed to update password ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Password updated successfully ✅');
      }
      pw1.value = '';
      pw2.value = '';
        }
      });
  

  handleForm(formAddGerant, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';
    console.log(submitId)
    console.log(submitId === 'saveGerantBtn')
    if (submitId === 'saveGerantBtn') {
      console.log(submitId === 'saveGerantBtn')
      const name = document.getElementById('newGerant')?.value;
      const pw1 = document.getElementById('newGerantPassword')?.value;
      const pw2 = document.getElementById('newGerantPasswordRepeat')?.value;
      if (pw2!=pw1) {
        alert('le mot passe doit etre le meme');
        return;
      }
      console.log(name, pw1)
      const res = await fetch('/api/gerants', {
    method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name:name, password: pw1 }),
});

const data = await res.json(); // 👈 اقرا الردّ

if (!res.ok) {
  alert('Failed to add Gerant ❌');
  alert(data.error);           // 👈 هنا يطلع السبب
  return;
}

alert('Gerant added successfully ✅');
name.value = '';
pw1.value = '';
pw2.value = '';

  

    }
  });
  handleForm(formAddServeur, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';
    console.log(submitId)
    console.log(submitId === 'saveGerantBtn')
    if (submitId === 'saveServeurBtn') {
      console.log(submitId === 'saveGerantBtn')
      const name = document.getElementById('newServeur')?.value;
      const pw1 = document.getElementById('newServeurPassword')?.value;
      const pw2 = document.getElementById('newServeurPasswordRepeat')?.value;
      if (pw2!=pw1) {
        alert('le mot passe doit etre le meme');
        return;
      }
      console.log(name, pw1)
      const res = await fetch('/api/serveurs', {
    method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name:name, password: pw1 }),
});

const data = await res.json(); // 👈 اقرا الردّ

if (!res.ok) {
  alert('Failed to add Serveur ❌');
  alert(data.error);           // 👈 هنا يطلع السبب
  return;
}

alert('serveur added successfully ✅');
name.value = '';
pw1.value = '';
pw2.value = '';

  

    }
  });

  handleForm(formUpdateProductPrice, async () => {
    const idname = document.getElementById('productSelectPrice')?.value;
    const price = Number(document.getElementById('productPriceNew')?.value);
    if (!idname || !Number.isFinite(price)) return;
    res=await fetchJson(`/api/products/${encodeURIComponent(idname)}/price`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price }),
    });
    await loadLists();
    if (!res.response.ok) { 
        alert('Failed to update price ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Price updated successfully ✅');
      }
  });

  handleForm(formUpdateProductName, async () => {
    const idname = document.getElementById('productSelectName')?.value;
    const idnameNew = document.getElementById('productNameNew')?.value;
    if (!idname || !idnameNew) return;
    res=await fetchJson(`/api/products/${encodeURIComponent(idname)}/name`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idnameNew }),
    });
    await loadLists();
    if (!res.response.ok) { 
        alert('Failed to update name ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Name updated successfully ✅');
      }
  });

  handleForm(formUpdateProductImg, async () => {
    const idname = document.getElementById('productSelectImg')?.value;
    const file = document.getElementById('productImgFile')?.files?.[0];
    if (!idname) return;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const updata = await up.json().catch(() => null);
      const imgPath = updata && updata.path ? updata.path : (file ? file.name : '');
      if (!imgPath) return;
      res=await fetchJson(`/api/products/${encodeURIComponent(idname)}/img`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ img: imgPath }),
      });
      await loadLists();
    }
    if (!res.response.ok) { 
        alert('Failed to update image ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Image updated successfully ✅');
      }
  });

  handleForm(formProductCategory, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'saveMoveProductToCategoryBtn') {
      console.log('saveMoveProductToCategoryBtn clicked');
      const idcat = document.getElementById('categorySelectMoveProd')?.value;
      const idname = document.getElementById('productSelectMoveToCat')?.value;
      console.log(idcat, idname);
      alert(idcat + ' ' + idname);
      if (!idcat || !idname) return;
      res=await fetchJson(`/api/products/${encodeURIComponent(idname)}/categorie`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idcat }),
      });
      await loadLists();
      if (!res.response.ok) {
        alert('Failed to update category ❌');
        alert(res.data.error);
        return;
      }
      else{
      alert('Category updated successfully ✅');
      }
    }
  });

  handleForm(formAddTableCategoryProduct, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'addTableBtn') {
      console.log('addTableBtn clicked');
      const numtable = Number(document.getElementById('newTableNum')?.value);
      alert(numtable);
      const lieu = document.getElementById('newTableLieu')?.value;
      alert(lieu);
      if (!Number.isFinite(numtable)) return;
      res=await fetchJson('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numtable , lieu }),
      });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to add table ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Table added successfully ✅');
      }
      return;
    }
  });
  handleForm(formAddCategory, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'addCategoryBtn') {
      const idcat = document.getElementById('newCategoryIdcat')?.value;
      if (!idcat) return;
      res=await fetchJson('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idcat }),
      });
      await loadLists();
      if (!res.response.ok) {
        alert('Failed to add category ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Category added successfully ✅');
      }
      return;
    }
  });
  handleForm(formAddProduct, async (submitter) => {
    console.log('formAddProduct submitted');
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'addProductBtn') {
      console.log('addProductBtn clicked');
      const idname = document.getElementById('newProductName')?.value;
      const price = Number(document.getElementById('newProductPrice')?.value);
      const idcat = document.getElementById('newProductCategorySelect')?.value;
      const file = document.getElementById('newProductImgFile')?.files?.[0];
      const img = file ? file.name : '';
      if (!idname || !Number.isFinite(price) || !idcat) return;
      res=await fetchJson('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idname, price, img, idcat }),
      });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to add product ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Product added successfully ✅');
      }

    }
  });

  handleForm(formDeleteGerant, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'deleteGerantBtn') {
      const id = document.getElementById('deleteGerantSelect')?.value;
      if (!id) return;
      res=await fetchJson(`/api/gerants/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to delete Gerant ❌');
        alert(res.data.error);
      }
      else{
        alert('Gerant deleted successfully ✅');
      }
      return;
    }
  });

  handleForm(formDeleteServeur, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'deleteServeurBtn') {
      const id = document.getElementById('deleteServeurSelect')?.value;
      if (!id) return;
      res=await fetchJson(`/api/serveurs/${encodeURIComponent(id)}`, { method: 'DELETE' });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to delete Serveur ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Serveur deleted successfully ✅');
      }
      return;
    }
  });

  handleForm(formDeleteTable, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'deleteTableBtn') {
      const numtable = document.getElementById('deleteTableSelect')?.value;
      if (!numtable) return;
      res=await fetchJson(`/api/tables/${encodeURIComponent(numtable)}`, { method: 'DELETE' });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to delete Table ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Table deleted successfully ✅');
      }
      return;
    }
  });

  handleForm(formDeleteCategory, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'deleteCategoryBtn') {
      const idcat = document.getElementById('deleteCategorySelect')?.value;
      if (!idcat) return;
      res=await fetchJson(`/api/categories/${encodeURIComponent(idcat)}`, { method: 'DELETE' });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to delete Category ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Category deleted successfully ✅');
      }
      return;
    }
  });

  handleForm(formDeleteProduct, async (submitter) => {
    const submitId = submitter && submitter.id ? submitter.id : '';

    if (submitId === 'deleteProductBtn') {
      const idname = document.getElementById('deleteProductSelect')?.value;
      if (!idname) return;
      res=await fetchJson(`/api/products/${encodeURIComponent(idname)}`, { method: 'DELETE' });
      await loadLists();
      if (!res.response.ok) { 
        alert('Failed to delete Product ❌');
        alert(res.data.error);
        return;
      }
      else{
        alert('Product deleted successfully ✅');
      }
    }
  });

  loadLists();
}
