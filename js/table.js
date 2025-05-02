document.addEventListener("DOMContentLoaded", function () {
    const pageSize = 10;
    let currentPage = 0;
    let tableData = [], filteredData = [], selectedRow = null;
    const selectedInfo = {};
  
    d3.csv("chocolate_sales.csv").then(data => {
      tableData = data;
      filteredData = [...data];
      renderTable(filteredData);
    });
  
    function renderTable(data) {
      d3.select("#table-container").html("");
      const keys = Object.keys(data[0]);
      const container = d3.select("#table-container");
  
      const filters = {};
      const table = container.append("table");
      const thead = table.append("thead");
      const headerRow = thead.append("tr");
      const filterInputRow = thead.append("tr");
  
      // Header and filter row
      keys.forEach(col => {
        headerRow.append("th")
          .text(col)
          .on("click", () => sortByColumn(col));
  
        filterInputRow.append("th")
          .append("input")
          .attr("class", "filter")
          .attr("placeholder", `Filter ${col}`)
          .on("input", function () {
            filters[col] = this.value.toLowerCase();
            applyFilters();
          });
      });
  
      const tbody = table.append("tbody");
      drawTableBody();
      renderPagination();
  
      function applyFilters() {
        filteredData = tableData.filter(row => {
          return keys.every(k => {
            return !filters[k] || row[k].toLowerCase().includes(filters[k]);
          });
        });
        currentPage = 0;
        drawTableBody();
        renderPagination();
      }
  
      function drawTableBody() {
        tbody.html("");
        const start = currentPage * pageSize;
        const pageRows = filteredData.slice(start, start + pageSize);
        pageRows.forEach(row => {
          const tr = tbody.append("tr")
            .on("click", function () {
              tbody.selectAll("tr").classed("selected", false);
              d3.select(this).classed("selected", true);
              selectedRow = row;
              Object.assign(selectedInfo, row);
              console.log("Selected Row:", selectedInfo);
            });
  
          keys.forEach(col => tr.append("td").text(row[col]));
        });
      }
  
      function sortByColumn(col) {
        const ascending = !tableData._sortDir || tableData._sortKey !== col || tableData._sortDir === "desc";
        tableData.sort((a, b) => d3.ascending(a[col], b[col]) * (ascending ? 1 : -1));
        tableData._sortKey = col;
        tableData._sortDir = ascending ? "asc" : "desc";
        applyFilters();
      }
  
      function renderPagination() {
        d3.select(".pagination").remove();
        const totalPages = Math.ceil(filteredData.length / pageSize);
        const pagDiv = container.append("div").attr("class", "pagination");
  
        for (let i = 0; i < totalPages; i++) {
          pagDiv.append("button")
            .text(i + 1)
            .style("font-weight", i === currentPage ? "bold" : "normal")
            .on("click", () => {
              currentPage = i;
              drawTableBody();
              renderPagination();
            });
        }
      }
    }
  });
  