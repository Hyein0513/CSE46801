document.addEventListener("DOMContentLoaded", function () {
    const state = {
      timeRange: null,
      selectedRow: null,
      selectedCategory: null,
      currentPage: 0,
      pageSize: 10,
      filters: {},
      sortKey: null,
      sortOrder: 'asc'
    };
  
    const parseDate = d3.timeParse("%d-%b-%y");
    const formatDate = d3.timeFormat("%Y-%m-%d");
    const formatNumber = d3.format(",.0f");
    const formatShort = d3.format("~s");
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  
    document.getElementById("reset-btn").addEventListener("click", () => {
      state.timeRange = null;
      state.selectedRow = null;
      state.selectedCategory = null;
      state.currentPage = 0;
      state.filters = {};
      updateAll();
    });
  
    d3.csv("chocolate_sales.csv").then(rawData => {
      const cleanData = rawData.map(d => ({
        ...d,
        Date: parseDate(d.Date.trim()),
        Sales: +d.Amount.replace(/[^0-9.]/g, ""),
        Category: d.Product
      }));
      window.rawData = cleanData;
      updateAll();
    });
  
    function updateAll() {
      updateFilterInfo();
      updateTable();
      updateAreaChart();
      updateBarChart();
      updateContextChart();
    }
  
    function updateFilterInfo() {
      const div = document.getElementById("filters-info");
      const parts = [];
      if (state.timeRange) {
        parts.push(`Date: ${formatDate(state.timeRange[0])} ~ ${formatDate(state.timeRange[1])}`);
      }
      if (state.selectedCategory) {
        parts.push(`Category: ${state.selectedCategory}`);
      }
      div.textContent = parts.length ? `Filters - ${parts.join(" | ")}` : "No filters applied.";
    }
  
    function filteredData() {
      return (window.rawData || []).filter(d => {
        const inTimeRange = !state.timeRange || (d.Date >= state.timeRange[0] && d.Date <= state.timeRange[1]);
        const inCategory = !state.selectedCategory || d.Category === state.selectedCategory;
        const matchFilters = Object.entries(state.filters).every(([key, val]) => {
          return val === "" || (d[key] && d[key].toLowerCase().includes(val.toLowerCase()));
        });
        return inTimeRange && inCategory && matchFilters;
      });
    }
 

    function updateTable() {
      const container = d3.select("#table-container");
      const paginationDiv = d3.select("#pagination");
      container.html("");
      paginationDiv.html("");
    
      let data = filteredData();
    
      // 정렬 적용
      if (state.sortKey) {
        data.sort((a, b) => {
          let valA = a[state.sortKey] || "";
          let valB = b[state.sortKey] || "";
    
          // 날짜 처리
          if (a[state.sortKey] instanceof Date) {
            valA = a[state.sortKey].getTime();
            valB = b[state.sortKey].getTime();
          }
    
          if (valA < valB) return state.sortOrder === "asc" ? -1 : 1;
          if (valA > valB) return state.sortOrder === "asc" ? 1 : -1;
          return 0;
        });
      }
    
      const start = state.currentPage * state.pageSize;
      const paged = data.slice(start, start + state.pageSize);
      const keys = ["Sales Person", "Country", "Product", "Date", "Amount", "Boxes Shipped", "Sales", "Category"];
    
      const table = container.append("table");
      const thead = table.append("thead");
      const tbody = table.append("tbody");
    
      // Filter row
      const filterRow = thead.append("tr");
      keys.forEach(k => {
        const cell = filterRow.append("th");
        cell.append("input")
          .attr("class", "filter-input")
          .attr("placeholder", `Filter ${k}`)
          .property("value", state.filters[k] || "")
          .on("input", function () {
            state.filters[k] = this.value;
            state.currentPage = 0;
            updateTable();
          });
      });
    
      // Header row with sorting
      const headerRow = thead.append("tr");
      headerRow.selectAll("th")
        .data(keys).enter()
        .append("th")
        .text(d => d)
        .style("cursor", "pointer")
        .on("click", function (event, d) {
          if (state.sortKey === d) {
            state.sortOrder = state.sortOrder === "asc" ? "desc" : "asc";
          } else {
            state.sortKey = d;
            state.sortOrder = "asc";
          }
          updateTable();
        });
    
      const rows = tbody.selectAll("tr")
        .data(paged).enter()
        .append("tr")
        .attr("class", d => (state.selectedRow === d ? "selected" : ""))
        .on("click", function (event, d) {
          state.selectedRow = d;
          updateAll();
        });
    
      rows.selectAll("td")
        .data(d => keys.map(k => {
          if (k === "Date") return d.Date ? formatDate(d.Date) : "";
          if (k === "Sales") return d.Sales;
          return d[k] || "";
        }))
        .enter()
        .append("td")
        .text(d => d);
    
      // Pagination
      const pageCount = Math.ceil(data.length / state.pageSize);
      for (let i = 0; i < pageCount; i++) {
        paginationDiv.append("button")
          .text(i + 1)
          .attr("class", i === state.currentPage ? "active" : null)
          .on("click", () => {
            state.currentPage = i;
            updateTable();
          });
      }
    }
    
  
    function updateAreaChart() {
      const container = d3.select("#area-chart");
      container.html("");
      const margin = { top: 10, right: 20, bottom: 80, left: 50 },
            width = container.node().clientWidth - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;
  
      const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + 100);
  
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      const data = d3.rollup(filteredData(),
        v => d3.sum(v, d => d.Sales),
        d => d3.timeMonth(d.Date)
      );
      const parsed = Array.from(data, ([date, sales]) => ({ date, sales })).sort((a, b) => d3.ascending(a.date, b.date));
  
      const x = d3.scaleTime().domain(d3.extent(parsed, d => d.date)).range([0, width]);
      const y = d3.scaleLinear().domain([0, d3.max(parsed, d => d.sales)]).range([height, 0]);
  
      const area = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.sales));
  
      g.append("path").datum(parsed).attr("fill", "steelblue").attr("d", area);
      g.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x).tickFormat(d3.timeFormat("%b")));
      g.append("g").call(d3.axisLeft(y).tickFormat(formatShort));
    }
  
    function updateBarChart() {
      const container = d3.select("#bar-chart");
      container.html("");
      const margin = { top: 10, right: 20, bottom: 80, left: 50 },
            width = container.node().clientWidth - margin.left - margin.right,
            height = 300 - margin.top - margin.bottom;
  
      const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
  
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      const data = d3.rollup(filteredData(),
        v => d3.sum(v, d => d.Sales),
        d => d.Category
      );
  
      const parsed = Array.from(data, ([category, sales]) => ({ category, sales }))
        .sort((a, b) => d3.descending(a.sales, b.sales));
  
      const x = d3.scaleBand().domain(parsed.map(d => d.category)).range([0, width]).padding(0.2);
      const y = d3.scaleLinear().domain([0, d3.max(parsed, d => d.sales)]).range([height, 0]);
  
      g.selectAll("rect")
        .data(parsed)
        .enter().append("rect")
        .attr("x", d => x(d.category))
        .attr("y", d => y(d.sales))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.sales))
        .attr("fill", d => colorScale(d.category))
        .on("click", function (event, d) {
          state.selectedCategory = state.selectedCategory === d.category ? null : d.category;
          updateAll();
        });
  
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");
  
      g.append("g").call(d3.axisLeft(y).tickFormat(formatShort));
    }
  
    function updateContextChart() {
      const container = d3.select("#context-chart");
      container.html("");
      const margin = { top: 10, right: 20, bottom: 40, left: 50 },
            width = container.node().clientWidth - margin.left - margin.right,
            height = 100 - margin.top - margin.bottom;
  
      const svg = container.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);
  
      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
      const data = d3.rollup(window.rawData || [],
        v => d3.sum(v, d => d.Sales),
        d => d3.timeMonth(d.Date)
      );
  
      const parsed = Array.from(data, ([date, sales]) => ({ date, sales }))
        .sort((a, b) => d3.ascending(a.date, b.date));
  
      const x = d3.scaleTime().domain(d3.extent(parsed, d => d.date)).range([0, width]);
      const y = d3.scaleLinear().domain([0, d3.max(parsed, d => d.sales)]).range([height, 0]);
  
      const area = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.sales));
  
      g.append("path")
        .datum(parsed)
        .attr("fill", "lightsteelblue")
        .attr("d", area);
  
      g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b")));
  
      g.append("g")
        .call(d3.axisLeft(y).ticks(3).tickFormat(formatShort));
    
    const brush = d3.brushX().extent([[0, 0], [width, height]])
        .on("brush end", ({ selection }) => {
          if (!selection) return;
          const [x0, x1] = selection.map(x.invert);
          state.timeRange = [x0, x1];
          updateAreaChart(); // ❗ 이걸로 위 그래프만 업데이트
          updateTable();     // ❗ 필터 적용된 표 갱신
          updateFiltersInfo();
        });
    
      g.append("g").attr("class", "brush").call(brush);
    }
  });
  