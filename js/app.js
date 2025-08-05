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
    ...data.execs.map(e => ({ type: "exec", ...e, label: `${e.role}: ${e.name}` })),
    ...data.contracts.map(c => ({ type: "contract", ...c, label: `${c.vendor}: ${c.project}` }))
  ]
  .sort((a, b) => new Date(a.date) - new Date(b.date));

  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.marginLeft = "40px";

  events.forEach((e, i) => {
    const item = document.createElement("div");
    item.style.margin = "20px 0";
    item.style.paddingLeft = "20px";
    item.style.borderLeft = "2px solid #003366";

    const date = document.createElement("strong");
    date.textContent = new Date(e.date).toLocaleDateString('en-AU', { year: 'numeric', month: 'short' });
    date.style.display = "block";
    date.style.color = "#003366";

    const label = document.createElement("span");
    label.textContent = e.label;
    label.style.display = "block";
    label.style.margin = "4px 0";

    const link = document.createElement("a");
    link.href = e.source;
    link.target = "_blank";
    link.textContent = e.type === "exec" ? "Gazette notice" : "Tender details";
    link.style.fontSize = "0.9em";

    const outcome = data.outcomes.find(o => o.contract_id === e.id);
    if (outcome) {
      const tag = document.createElement("span");
      tag.textContent = ` (${outcome.outcome})`;
      tag.style.backgroundColor = outcome.outcome === "Open Tender" ? "#006633" : "#D2691E";
      tag.style.color = "white";
      tag.style.padding = "2px 6px";
      tag.style.borderRadius = "4px";
      tag.style.fontSize = "0.8em";
      tag.style.marginLeft = "8px";
      label.appendChild(tag);
    }

    item.appendChild(date);
    item.appendChild(label);
    item.appendChild(link);
    container.appendChild(item);
  });

  tl.innerHTML = "";
  tl.appendChild(container);
}

// Network
function renderNetwork() {
  const width = 800, height = 600;
  let zoom = d3.zoom()
    .scaleExtent([0.5, 4])
    .on("zoom", (event) => {
      svgGroup.attr("transform", event.transform);
    });

  const svg = d3.select("#network")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom);

  const svgGroup = svg.append("g");

  // Add zoom controls (for screen readers)
  svg.append("title").text("Interactive network graph showing executives, vendors, and agencies. Use zoom to navigate.");

  const svgGroup = svg.append("g");

  const nodes = [];
  const links = [];
  const seen = new Set();

  // Add executives
  data.execs.forEach(e => {
    if (!seen.has(e.name)) {
      nodes.push({ 
        id: e.name, 
        group: "exec", 
        size: 8,
        type: "Executive",
        role: e.role,
        from: e.from,
        to: e.to,
        date: e.date
      });
      seen.add(e.name);
    }
    if (!seen.has(e.from)) {
      nodes.push({ id: e.from, group: "agency", size: 10, type: "Agency" });
      seen.add(e.from);
    }
    if (!seen.has(e.to)) {
      nodes.push({ id: e.to, group: "agency", size: 10, type: "Agency" });
      seen.add(e.to);
    }
    links.push({ source: e.name, target: e.to });
  });

  // Add contracts
  data.contracts.forEach(c => {
    if (!seen.has(c.vendor)) {
      nodes.push({ 
        id: c.vendor, 
        group: "vendor", 
        size: 9, 
        type: "Vendor" 
      });
      seen.add(c.vendor);
    }
    if (!seen.has(c.agency)) {
      nodes.push({ id: c.agency, group: "agency", size: 10, type: "Agency" });
      seen.add(c.agency);
    }
    links.push({ source: c.vendor, target: c.agency, value: c.value });
  });

  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(150))
    .force("charge", d3.forceManyBody().strength(-500))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("x", d3.forceX(width / 2).strength(0.1))
    .force("y", d3.forceY(height / 2).strength(0.1));

  // Add links
  const link = svgGroup.append("g")
    .selectAll("line")
    .data(links)
    .enter().append("line")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.6)
    .attr("stroke-width", d => Math.sqrt(d.value) / 4)
    .attr("class", "link");

  // Add nodes
  const node = svgGroup.append("g")
    .selectAll("g")
    .data(nodes)
    .enter().append("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

  // Circles
  node.append("circle")
    .attr("r", d => d.size)
    .attr("fill", d => {
      if (d.group === "exec") return "#003366";   // Dark Blue
      if (d.group === "vendor") return "#D2691E"; // Brown
      if (d.group === "agency") return "#006633"; // Green
      return "#999";
    })
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("aria-label", d => `${d.id}, ${d.type}`);

  // Labels
  node.append("text")
    .text(d => d.id)
    .attr("x", d => d.size + 5)
    .attr("y", ".31em")
    .attr("fill", "#1a1a1a")
    .attr("font-size", "10px")
    .attr("font-family", "Arial")
    .attr("aria-hidden", "true");

  // Legend
  const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", "translate(20,20)");

  const legendData = [
    { label: "Executive", color: "#003366" },
    { label: "Vendor", color: "#D2691E" },
    { label: "Agency", color: "#006633" }
  ];

  legend.selectAll("rect")
    .data(legendData)
    .enter().append("rect")
    .attr("y", (d, i) => i * 20)
    .attr("width", 12)
    .attr("height", 12)
    .attr("fill", d => d.color);

  legend.selectAll("text")
    .data(legendData)
    .enter().append("text")
    .attr("x", 16)
    .attr("y", (d, i) => i * 20 + 10)
    .attr("dy", ".35em")
    .text(d => d.label)
    .attr("fill", "#1a1a1a")
    .attr("font-size", "12px");

  // Drag functions
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  simulation.on("tick", () => {
    link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

    node
        .attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // Accessibility
  d3.select("#network").append("p")
    .attr("class", "sr-only")
    .style("position", "absolute")
    .style("left", "-9999px")
    .text("Network shows connections between executives, vendors, and agencies. Use zoom to explore.");

  // End of renderNetwork

  function filterContracts(type) {
  const tl = document.getElementById("timeline");
  const events = [];

  if (type === "all" || type === "limited") {
    events.push(...data.execs.map(e => ({ type: "exec", ...e, label: `${e.role}: ${e.name}` })));
  }

  data.contracts.forEach(c => {
    const outcome = data.outcomes.find(o => o.contract_id === c.id);
    if (type === "all") {
      events.push({ type: "contract", ...c, label: `${c.vendor}: ${c.project}` });
    } else if (type === "limited" && outcome?.outcome === "Limited Tender") {
      events.push({ type: "contract", ...c, label: `${c.vendor}: ${c.project}` });
    } else if (type === "open" && outcome?.outcome === "Open Tender") {
      events.push({ type: "contract", ...c, label: `${c.vendor}: ${c.project}` });
    }
  });

  // Sort and render (reuse timeline code)
  events.sort((a, b) => new Date(a.date) - new Date(b.date));
  // ... (same render logic)
}
}

    node.attr("cx", d => d.x)
        .attr("cy", d => d.y);
  });
}
