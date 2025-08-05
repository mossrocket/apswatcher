// app.js - Updated to fix variable redeclaration and basic functionality

// --- Wait for the DOM to load ---
document.addEventListener('DOMContentLoaded', function () {

    // --- Basic Data Fetching ---
    // Assuming your data is in a file named data.json in the same directory
    fetch('data.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status} - Check if data.json exists and is accessible.`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data loaded successfully:", data);
            // Store data globally or pass it to functions that need it
            window.APS_DATA = data;

            // --- Initialize Components ---
            initializeSearch(data);
            initializeGraph(data);
            initializeTimeline(data);

        })
        .catch(error => {
            console.error("Failed to load or parse data.json:", error);
            // Display an error message on the page
            document.body.innerHTML += `<p style="color:red; padding: 20px;">Error loading data. Please check the console for details.</p>`;
        });
});

// --- Search Functionality ---
function initializeSearch(data) {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (!searchInput || !searchResults) {
        console.warn("Search elements not found, skipping search initialization.");
        return;
    }

    // Simple example: search by executive name
    // Assumes data has a structure like { executives: [ { name: "...", department: "..." } ] }
    searchInput.addEventListener('input', function () {
        const term = this.value.toLowerCase();
        searchResults.innerHTML = ''; // Clear previous results

        if (term.trim() === '') return; // Don't search on empty

        const results = data.executives?.filter(exec => exec.name.toLowerCase().includes(term)) || [];

        if (results.length > 0) {
            results.forEach(exec => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.textContent = `${exec.name} - ${exec.department || 'N/A'}`;
                searchResults.appendChild(item);
            });
        } else {
            searchResults.innerHTML = '<p>No results found.</p>';
        }
    });

    console.log("Search initialized.");
}

// --- Network Graph Functionality ---
function initializeGraph(data) {
    const graphContainer = document.getElementById('network-graph');

    if (!graphContainer) {
        console.warn("Network Graph container not found, skipping graph initialization.");
        return;
    }

    // --- Basic D3 Graph Setup ---
    // Ensure D3.js is correctly loaded via <script> tag in index.html
    if (typeof d3 === 'undefined') {
        console.error("D3.js library not found. Please check your script includes in index.html.");
        graphContainer.innerHTML = '<p style="color:red;">Graph error: D3.js library missing.</p>';
        return;
    }

    // Clear any existing content
    graphContainer.innerHTML = '';

    // Set up dimensions and margins
    const width = graphContainer.clientWidth || 800;
    const height = Math.max(400, window.innerHeight * 0.6); // Responsive height

    // Create SVG element
    const svg = d3.select("#network-graph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;");

    // Create a group element for zooming/panning (if needed later)
    const svgGroup = svg.append("g"); // <-- This is the ONLY declaration of svgGroup for the graph

    // Example: Draw a simple static node-link diagram
    // You would replace this with your actual graph logic using data.nodes and data.links
    const nodes = data.nodes || [{ id: "Example Dept A" }, { id: "Example Vendor B" }];
    const links = data.links || [{ source: "Example Dept A", target: "Example Vendor B" }];

    // Create link elements
    const link = svgGroup.selectAll(".link")
        .data(links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke", "#999")
        .style("stroke-width", 2);

    // Create node elements
    const node = svgGroup.selectAll(".node")
        .data(nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", 10)
        .style("fill", "#69b3a2")
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

    // Add labels
    const label = svgGroup.selectAll(".label")
        .data(nodes)
        .enter().append("text")
        .attr("class", "label")
        .attr("dx", 12)
        .attr("dy", ".35em")
        .text(d => d.id);

    // Simulation setup (force-directed layout)
    const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        label
            .attr("x", d => d.x)
            .attr("y", d => d.y);
    });

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

    console.log("Network Graph initialized.");
}

// --- Timeline Functionality ---
function initializeTimeline(data) {
    const timelineContainer = document.getElementById('timeline');

    if (!timelineContainer) {
        console.warn("Timeline container not found, skipping timeline initialization.");
        return;
    }

    // --- Basic D3 Timeline Setup ---
    if (typeof d3 === 'undefined') {
        console.error("D3.js library not found for Timeline.");
        timelineContainer.innerHTML = '<p style="color:red;">Timeline error: D3.js library missing.</p>';
        return;
    }

    timelineContainer.innerHTML = ''; // Clear previous content

    // Set up dimensions and margins for timeline
    const width = timelineContainer.clientWidth || 800;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 50, left: 60 };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG for timeline
    const svg = d3.select("#timeline")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Create a group element for the timeline chart area
    const timelineGroup = svg.append("g") // <-- Different variable name for timeline
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Example: Simple timeline of appointments
    // Assumes data has a structure like { appointments: [ { date: "YYYY-MM-DD", name: "...", role: "..." } ] }
    const appointments = data.appointments || [
        { date: "2023-01-15", name: "John Doe", role: "Director" },
        { date: "2023-03-22", name: "Jane Smith", role: "CIO" }
    ];

    // Parse dates
    const parseTime = d3.timeParse("%Y-%m-%d");
    appointments.forEach(d => d.parsedDate = parseTime(d.date));

    // Set up scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(appointments, d => d.parsedDate))
        .range([0, innerWidth]);

    const yScale = d3.scaleBand()
        .domain(appointments.map(d => d.name)) // Simple Y axis by name
        .range([0, innerHeight])
        .padding(0.1);

    // Add X axis
    timelineGroup.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

    // Add Y axis
    timelineGroup.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

    // Draw points for appointments
    timelineGroup.selectAll(".dot")
        .data(appointments)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => xScale(d.parsedDate))
        .attr("cy", d => yScale(d.name) + yScale.bandwidth() / 2) // Center vertically
        .attr("r", 5)
        .style("fill", "steelblue");

    // Add labels for points (optional)
    timelineGroup.selectAll(".dot-label")
        .data(appointments)
        .enter().append("text")
        .attr("class", "dot-label")
        .attr("x", d => xScale(d.parsedDate) + 8)
        .attr("y", d => yScale(d.name) + yScale.bandwidth() / 2 + 4) // Adjust for text baseline
        .text(d => d.role)
        .style("font-size", "12px");

    console.log("Timeline initialized.");
}
