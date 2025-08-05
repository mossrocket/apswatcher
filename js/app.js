let data = { executives: [], contracts: [], outcomes: [] };

// Load all data
Promise.all([
  fetch('data/executives.json').then(r => r.json()),
  fetch('data/contracts.json').then(r => r.json()),
  fetch('data/outcomes.json').then(r => r.json())
])
.then(([execs, contracts, outcomes]) => {
  data = { execs, contracts, outcomes };
  console.log("Data loaded:", data);
})
.catch(err => {
  console.error("Failed to load data:", err);
  document.getElementById("results").innerHTML = `<p style="color:red">Error loading data. Please try again later.</p>`;
});

function searchData() {
  const query = document.getElementById("search-input").value.toLowerCase().trim();
  const resultsDiv = document.getElementById("results");

  if (!query) {
    resultsDiv.innerHTML = "Please enter a search term.";
    return;
  }

  const hits = [];

  // Search executives
  data.execs.forEach(e => {
    if (e.name.toLowerCase().includes(query) || e.from.toLowerCase().includes(query) || e.to.toLowerCase().includes(query)) {
      hits.push(`<li><strong>${e.role}</strong>: ${e.name} – ${e.from} → ${e.to} (${e.date.slice(0,4)}) <a href="${e.source}" target="_blank">[Gazette]</a></li>`);
    }
  });

  // Search contracts
  data.contracts.forEach(c => {
    if (c.vendor.toLowerCase().includes(query) || c.project.toLowerCase().includes(query)) {
      hits.push(`<li><strong>${c.vendor}</strong>: ${c.project} – ${c.agency} ($${c.value}M) <a href="${c.source}" target="_blank">[Tender]</a></li>`);
    }
  });

  resultsDiv.innerHTML = hits.length ? `<ul>${hits.join("")}</ul>` : `<p>No matches for "${query}".</p>`;
}

// Timeline and network functions will go here (next step)