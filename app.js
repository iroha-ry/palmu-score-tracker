// =====================
// 初期化
// =====================

async function initApp() {
  await loadStateFromFirestore();
  initRankSelect();
  setupForm();
  setupSettings();
  setupClearAll();
  setupPlanControls();
  setupLiveCalculator();
  setupHaneCounter();
  startMidnightWatcher();

  ensurePrevDayAutoPlus1();

  updateAll();
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
