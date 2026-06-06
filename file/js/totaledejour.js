import { createClient } from 'https://esm.sh/@supabase/supabase-js'

document.addEventListener("DOMContentLoaded", async () => {

  const supabase = createClient(
    "https://ewciynnuevuzbcrwcjut.supabase.co",
    "sb_publishable_Wmg-8fvM8hCvb9UEm3AmFA_WuWHlooj"
  );

  console.log('Supabase client initialized:', supabase);
  const recuChannel = supabase
  .channel('realtime-recu')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'recu' }, payload => {
      console.log('Recu change detected:', payload);
       loadTotaleDeJour(); // Recharge les données à chaque changement
      totale(); // Recharge les stats à chaque changement
  })
  .subscribe(status => console.log('Recu realtime status:', status));
const orderrChannel = supabase
  .channel('realtime-orderr')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orderr' }, payload => {
      console.log('orderr change detected:', payload);
      loadTotaleDeJour(); // Recharge les données à chaque changement
     totale(); // Recharge les stats à chaque changement
  })
  .subscribe(status => console.log('Recu realtime status:', status));
  await loadTotaleDeJour();
});

// Récupère les commandes du jour
async function loadTotaleDeJour() {
  try {
    const response = await fetch('/api/totaledejour');
    if (!response.ok) throw new Error('Failed to fetch data');
    const result = await response.json();

    const overallRounded = await totale(); // total général
    displayOrders(result.data || [], overallRounded);

  } catch (error) {
    console.error('Error loading daily totals:', error);
    document.getElementById('ordersContainer').innerHTML =
      '<p style="text-align:center;color:red;">Erreur lors du chargement des commandes</p>';
  }
}

// Récupère le total de toutes les commandes
async function totale() {
  try {
    const resp = await fetch('/api/sum');
    const data = await resp.json();
    console.log('Total fetched:', data);
    return Number(data[0].sum); // Convertit en nombre
  } catch (err) {
    console.error('Error fetching total:', err);
    return 0;
  }
}

// Affiche les commandes et le total général
function displayOrders(orders, overallRounded) {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align:center;">Aucune commande pour aujourd\'hui</p>';
    return;
  }
  
  // Grouper commandes par idrecu
  const groupedOrders = {};
  orders.forEach(order => {
    if (!groupedOrders[order.idrecu]) {
      groupedOrders[order.idrecu] = {
        idrecu: order.idrecu,
        numtable: order.id,
        totale: order.totale,
        date: order.date,
        heurd: order.heurd,
        heurf: order.heurf,
        items: []
      };
    }
    if (order.idname && order.price) {
      groupedOrders[order.idrecu].items.push({
        idname: order.idname,
        price: order.price
      });
    }
  });

  // Générer HTML des commandes
  const s=0
  let html = '<div  class="orders-table">';
  Object.values(groupedOrders).forEach(order => {
    
    html += `
      <div class="order-card">
        <div class="order-header">
          <div>
            <strong>Commande #${order.idrecu}</strong> | Table ${order.numtable}
          </div>
          <div>
            ${formatTime(order.heurd)} - ${formatTime(order.heurf)}
          </div>
        </div>
        <div class="order-items">
          ${order.items.map(item => `
            <div class="order-item5">
              <span>${item.idname}</span>
              <span>${item.price} DT</span>
            </div>
          `).join('')}
        </div>
        <div>
          <strong>Total: ${order.totale} DT</strong>
        </div>
      </div>
    `;
  });
  html += '</div>';

  // Overall total
  html += `
    <div id="overallTotalCard" class="overall-total-card">
            <div class="overall-total-content">
                <div class="overall-total-info">
                    <i class="fa-solid fa-calculator"></i>
                    <span>Total de toutes les commandes</span>
                </div>
                <div class="overall-total-amount">
                    <strong>${overallRounded} DT</strong>
                </div>
            </div>
        </div>
  `;

  container.innerHTML = html;

  // Click handler pour close-day
  const overallCard = document.getElementById('overallTotalCard');
  if (overallCard) {
    overallCard.addEventListener('click', async () => {
      if (!confirm('Confirmer: enregistrer le total et réinitialiser les commandes ?')) return;

      const payload = {
        date: new Date().toISOString(),
        totale: overallRounded
      };

      try {
        const resp = await fetch('/api/close-day', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text || 'Server error');
        }

        let data = {};
        try { data = await resp.json(); } catch (e) {}

        alert('Opération terminée: ' + (data.message || 'Succès'));
        // Recharge la page des commandes
        await loadTotaleDeJour();

      } catch (err) {
        console.error('Close-day error:', err);
        alert('Erreur lors de l\'opération : ' + (err.message || err));
      }
    });
  }
}

// Helpers pour formater date & heure
function formatTime(timeString) {
  if (!timeString) return '--:--';
  const [hours, minutes] = timeString.split(':');
  return `${hours}:${minutes}`;
}
