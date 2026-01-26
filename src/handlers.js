// =====================
// イベントハンドラ
// =====================

function setupForm() {
  const form = document.getElementById("entryForm");
  const dateInput = document.getElementById("date");
  const drpInput = document.getElementById("drp");
  const coinsInput = document.getElementById("coins");
  const hoursInput = document.getElementById("hours");
  const memoInput = document.getElementById("memo");

  if (!form) return;

  dateInput.value = todayString();

  if (dateInput && dateInput.showPicker) {
    dateInput.addEventListener("focus", () => {
      dateInput.showPicker();
    });
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const date = dateInput.value;
    const drp = Number(drpInput.value);
    const coins = coinsInput.value ? Number(coinsInput.value) : 0;
    const hours = hoursInput.value.trim();
    const memo = memoInput.value.trim();

    if (!date || isNaN(drp)) {
      alert("日付と＋数を入力してください。");
      return;
    }
    if (![1, 2, 4, 6].includes(drp)) {
      alert("＋数は 1 / 2 / 4 / 6 のいずれかを選んでください。");
      return;
    }

    upsertEntryByDate(date, {
      drp: sanitizePlus(drp),
      coins,
      hours,
      memo
    });

    updateAll();

    drpInput.value = "1";
    coinsInput.value = "";
    hoursInput.value = "";
    memoInput.value = "";
  });
}

function setupSettings() {
  const rankSelect = document.getElementById("currentRank");
  const goalTypeSelect = document.getElementById("goalType");
  const skipDaysInput = document.getElementById("skipDays");
  const periodStartInput = document.getElementById("periodStartInput");

  if (rankSelect) {
    rankSelect.value = state.currentRank;
    rankSelect.addEventListener("change", () => {
      state.currentRank = rankSelect.value;
      saveState();
    });
  }

  if (goalTypeSelect) {
    goalTypeSelect.value = state.goalType || "UP";
    goalTypeSelect.addEventListener("change", () => {
      state.goalType = goalTypeSelect.value;
      saveState();
    });
  }

  if (skipDaysInput) {
    skipDaysInput.value = state.skipDays || 0;
    skipDaysInput.addEventListener("change", () => {
      let v = Number(skipDaysInput.value);
      if (isNaN(v) || v < 0) v = 0;
      if (v > 7) v = 7;
      state.skipDays = v;
      skipDaysInput.value = v;

      // ★ skipDates を skipDays に合わせて揃える
      if (!state.skipDates) state.skipDates = [];
      if (v === 0) {
        state.skipDates = [];        // ← 枚数0なら全部リセット
      } else {
        state.skipDates = state.skipDates.slice(0, v);
      }

      saveState();
      renderSkipDateInputs();         // UIも更新
    });
  }

  if (periodStartInput) {
    periodStartInput.value = state.periodStart || "";
    if (periodStartInput.showPicker) {
      periodStartInput.addEventListener("focus", () => {
        periodStartInput.showPicker();
      });
    }
    periodStartInput.addEventListener("change", () => {
      state.periodStart = periodStartInput.value || null;
      saveState();
    });
  }

  const applyBtn = document.getElementById("applySettings");
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      updateAll();
    });
  }

  const autoPrevToggle = document.getElementById("autoPlus1PrevDayToggle");
  if (autoPrevToggle) {
    autoPrevToggle.checked = !!state.autoPlus1PrevDay;
    autoPrevToggle.addEventListener("change", () => {
      state.autoPlus1PrevDay = autoPrevToggle.checked;
      saveState();
      updateAll();
    });
  }
}

function setupClearAll() {
  const btn = document.getElementById("clearAll");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (!state.entries.length) return;
    if (!confirm("保存されている全ての入力データを削除しますか？（元に戻せません）")) return;
    state.entries = [];
    updateAll();
  });
}

function setupPlanControls() {
  const btn = document.getElementById("recalcPlan");
  if (!btn) return;
  btn.addEventListener("click", () => {
    recalcPlanFromActual();
  });
}

function setupLiveCalculator() {
  const plusSelect = document.getElementById("calcPlusSelect");
  const currentScoreInput = document.getElementById("calcCurrentScore");

  if (plusSelect) {
    plusSelect.addEventListener("change", () => {
      updateLiveCalculator();
    });
  }

  if (currentScoreInput) {
    currentScoreInput.addEventListener("input", () => {
      updateLiveCalculator();
    });
  }
}
