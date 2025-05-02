document.addEventListener("DOMContentLoaded", function () {
    const margin = { top: 20, right: 20, bottom: 110, left: 50 },
          margin2 = { top: 430, right: 20, bottom: 30, left: 50 },
          width = 960 - margin.left - margin.right,
          height = 500 - margin.top - margin.bottom,
          height2 = 500 - margin2.top - margin2.bottom;
  
    const svg = d3.select("#chart");
  
    const parseDate = d3.timeParse("%Y-%m");
    const formatMonth = d3.timeFormat("%Y-%m");
  
    const x = d3.scaleTime().range([0, width]),
          x2 = d3.scaleTime().range([0, width]),
          y = d3.scaleLinear().range([height, 0]),
          y2 = d3.scaleLinear().range([height2, 0]);
  
    const xAxis = d3.axisBottom(x),
          xAxis2 = d3.axisBottom(x2),
          yAxis = d3.axisLeft(y);
  
    const brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);
  
    const area = d3.area()
        .x(d => x(d.date))
        .y0(height)
        .y1(d => y(d.sales));
  
    const area2 = d3.area()
        .x(d => x2(d.date))
        .y0(height2)
        .y1(d => y2(d.sales));
  
    const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const context = svg.append("g")
        .attr("class", "context")
        .attr("transform", `translate(${margin2.left},${margin2.top})`);
  
    d3.csv("chocolate_sales.csv").then(rawData => {
      // --- 데이터 처리 ---
      const monthlySalesMap = d3.rollup(
        rawData,
        v => d3.sum(v, d => +d.Sales),
        d => formatMonth(new Date(d.Date))
      );
  
      let data = Array.from(monthlySalesMap, ([month, sales]) => ({
        date: parseDate(month),
        sales
      })).sort((a, b) => d3.ascending(a.date, b.date));
  
      // 누적 판매량 계산
      let cumulative = 0;
      data = data.map(d => {
        cumulative += d.sales;
        return { ...d, sales: cumulative };
      });
  
      // 도메인 설정
      x.domain(d3.extent(data, d => d.date));
      y.domain([0, d3.max(data, d => d.sales)]);
      x2.domain(x.domain());
      y2.domain(y.domain());
  
      // --- Main chart ---
      focus.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area);
  
      focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${height})`)
        .call(xAxis);
  
      focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);
  
      // --- Context chart ---
      context.append("path")
        .datum(data)
        .attr("class", "area context-area")
        .attr("d", area2);
  
      context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", `translate(0,${height2})`)
        .call(xAxis2);
  
      context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());
    });
  
    // 브러시 핸들러
    function brushed({selection}) {
      if (!selection) return;
      const [s0, s1] = selection;
      const newDomain = [x2.invert(s0), x2.invert(s1)];
      x.domain(newDomain);
      focus.select(".area").transition().duration(500).attr("d", area);
      focus.select(".axis--x").transition().duration(500).call(xAxis);
  
      // 추후 appState 연동 가능
      // if (typeof appState !== "undefined") {
      //   appState.updateTimeRange(newDomain);
      // }
    }
  });
  