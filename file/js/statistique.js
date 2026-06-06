
(async () => {
 
	const url = "/api/stat";

	let data = null;

	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
		data = await res.json();
	} catch (err) {
		console.error("Failed to load statistique:", err);
		return;
	}

	const dates = data.map(item => new Date(item.date).toLocaleDateString('en-CA'));

	console.log(dates)
	const totales = data.map(item => item.totale);

// 🎨 gradient من الفوق للقاع
const ctx = document.getElementById("myChart").getContext("2d");

// 🎨 gradient من الخط (الفوق) للقاع
const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
gradient.addColorStop(0, "rgba(0, 123, 255, 0.6)"); // أزرق
gradient.addColorStop(1, "rgba(0, 123, 255, 0)");   // transparent
new Chart(ctx, {
  type: "line",
  data: {
    labels: dates,
    datasets: [{
      label: "Totale par jour",
      data: totales,

      // 🎯 الكوربة smooth
      tension: 0.4,

      // 🎯 اللون متاع الخط
      borderColor: "#007bff",
      borderWidth: 3,

      // 🎯 النقاط
      pointBackgroundColor: "#007bff",
      pointBorderColor: "#fff",
      pointRadius: 5,
      pointHoverRadius: 7,

      // 🎯 اللون تحت الخط
      fill: true,
      backgroundColor: "rgba(0, 123, 255, 0.2)"
    }]
  },
  options: {
    responsive: true,

    plugins: {
      legend: {
        display: true
      }
    },

    scales: {
      y: {
        beginAtZero: true
      }
    },

    onClick: async (evt, elements) => {
      if (!elements.length) return;

      const index = elements[0].index;
      const selectedDate = dates[index];

      loadDetails(selectedDate);
    }
  }
});


})();


// 🔥 fonction details
async function loadDetails(date) {
	try {
		const res = await fetch(`/api/stat/${date}`);
		const details = await res.json();

		const tbody = document.querySelector("#detailsTable tbody");
		tbody.innerHTML = "";

		details.forEach(row => {
			const tr = document.createElement("tr");

			tr.innerHTML = `
				<td>${date}</td>
				<td>${row.idname}</td>
				<td>${row.quantity}</td>
			`;

			tbody.appendChild(tr);
		});

		document.getElementById("details").style.display = "block";

		// scroll automatique
		document.getElementById("details").scrollIntoView({ behavior: "smooth" });
    loadStats(date);
	} catch (err) {
		console.error(err);
	}
}
let myChart = null;

async function loadStats(date) {
    const res = await fetch(`/api/cercle-stats/${date}`);
    const data = await res.json();

    let total = data.reduce((sum, item) => sum + Number(item.total), 0);

    const labels = data.map(item => item.idcat);
    const values = data.map(item => Number(item.total));
    const colors = [
        "#4ECDC4", // Café
        "#FFD93D", // Glace
        "#FF6B6B", // Mojito
        "#1A535C", // a boire
        "#FF9F1C", // Te
        "#6A4C93"  // Frappuchino
    ];

    const ctx = document.getElementById("categorie");

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            cutout: "65%",
            plugins: {
                legend: { position: "bottom" }
            }
        }
    });

    // 🔹 afficher texte sous le cercle
    const statsDiv = document.getElementById("stats-text");
statsDiv.innerHTML = "";

data.forEach((item, i) => {
    const percent = ((item.total / total) * 100).toFixed(1) + "%";
    
    const p = document.createElement("p");

    p.innerHTML = `${item.idcat} <span style="color:#000000">  ${percent}</span>`;
    
    p.style.color = colors[i % colors.length];

    statsDiv.appendChild(p);
});
}
