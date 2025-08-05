let data = { execs: [], contracts: [], outcomes: [] };

// Load data
Promise.all([
  fetch('data/executives.json').then(r => r.json()),
  fetch('data/contracts.json').then(r => r.json()),
  fetch('data/outcomes.json').then(r => r.json())
])
.then(([execs, contracts, outcomes]) => {
  data = { execs, contracts, outcomes };
  renderTimeline();
  renderNetwork();
})
.catch(err => {
  console.error("Failed to load data", err);
  document.getElementById("results").innerHTML = `<p style="color:red">Error loading data.</p>`;
});

// Search
function searchData() {
  const query = document.getElementById("search-input").value.toLowerCase().trim();
  const resultsDiv = document.getElementById("results");

  if (!query) {
    resultsDiv.innerHTML = "Please enter a search term.";
    return;
  }

  const hits = [];

  data.execs.forEach(e => {
    if (e.name.toLowerCase().includes(query) || e.from.toLowerCase().includes(query) || e.to.toLowerCase().includes(query)) {
      hits.push(`<li><strong>${e.role}</strong>: ${e.name} → ${e.to} (${e.date.slice(0,4)}) <a href="${e.source}" target="_blank">[Gazette]</a></li>`);
    }
  });

  data.contracts.forEach(c => {
    if (c.vendor.toLowerCase().includes(query) || c.project.toLowerCase().includes(query)) {
      hits.push(`<li><strong>${c.vendor}</strong>: ${c.project} – $${c.value}M <a href="${c.source}" target="_blank">[Tender]</a></li>`);
    }
  });

  resultsDiv.innerHTML = hits.length ? `<ul>${hits.join("")}</ul>` : `<p>No matches for "${query}".</p>`;
}

// Timeline
function renderTimeline() {
  const tl = document.getElementById("timeline");
  const events = [
    ...data.execs.map(e => ({ type: "exec", ...e })),
    ...data.contracts.map(c => ({ type: "contract", ...c }))
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  const ul = document.createElement("ul");
  events.forEach(e => {
    const li = document.createElement("li");
    if (e.type === "exec") {
      li.innerHTML = `<strong>${e.role}</strong>: ${e.name} – ${e.from} → ${e.to} (${e.date.slice(0,4)}) <a href="${e.source}" target="_blank">[Gazette]</a>`;
    } else {
      li.innerHTML = `<strong>${e.vendor}: ${e.project}</strong> – ${e.agency} ($${e.value}M) <a href="${e.source}" target="_blank">[Tender]</a>`;
    }
    ul.appendChild(li);
  });
  tl.innerHTML = "";
  tl.appendChild(ul);
}

// Network
function renderNetwork() {
  const nodes = [];
  const links = [];
  const seen = new Set();

  data.execs.forEach(e => {
    if (!seen.has(e.name)) {
      nodes.push({ id: e.name, group: "exec", size: 8 });
      seen.add(e.name);
    }
    if (!seen.has(e.from)) {
      nodes.push({ id: e.from, group: "agency", size: 10 });
      seen.add(e.from);
    }
    if (!seen.has(e.to)) {
      nodes.push({ id: e.to, group: "agency", size: 10 });
      seen.add(e.to);
    }
    links.push({ source: e.name, target: e.to });
  });

  data.contracts.forEach(c => {
    if (!seen.has(c.vendor)) {
      nodes.push({ id: c.vendor, group: "vendor", size: 9 });
      seen.add(c.vendor);
    }
    if (!seen.has(c.agency)) {
      nodes.push({ id: c.agency, group: "agency", size: 10 });
      seen.add(c.agency);
    }
    links.push({ source: c.vendor, target: c.agency, value: c.value });
  });

  const width = 800, height = 400;
  const svg = d3.select("#network")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(120))
    .force("charge", d3.forceManyBody().strength(-400))
    .force("center", d3.forceCenter(width / 2, height / 2));

  const link = svg.append("g")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", "#999")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", d => Math.sqrt(d.value) / 3);

  const node = svg.append("g")
    .selectAll("circle")
    .data(nodes)
    .enter().append("circle")
    .attr("r", d => d.size)
    .attr("fill", d => d.group === "exec" ? "#003366" : d.group === "vendor" ? "#FF8800" : "#006633")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2);

  node.append("title").text(d => d.id);

  simulation.on("tick", () => {
    link.attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });
}