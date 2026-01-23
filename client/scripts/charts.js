// ============================================================================
// CHART LIFECYCLE MANAGEMENT
// ============================================================================

// Track Chart.js instances for cleanup
const chartInstances = new Map();

export function destroyAllCharts() {
  chartInstances.forEach((chart, key) => {
    chart.destroy();
  });
  chartInstances.clear();
}

export function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  // Destroy existing chart on this canvas if any
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
  }
  
  const chart = new Chart(canvas.getContext('2d'), config);
  chartInstances.set(canvasId, chart);
  return chart;
}

