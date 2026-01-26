// =====================
// 状態
// =====================

const DEFAULT_STATE = {
  currentRank: "A1",
  goalType: "UP",
  coinsPerPoint: 0,     // 互換用。今は使わない。
  skipDays: 0,
  periodStart: null,
  skipDates: [],        // スキップカードを使う日（任意）
  rankConfig: {},
  plan: {
    days: []            // {offset, plannedPlus, memo}
  },
  autoPlus1PrevDay: false,
  lastPrevAutoFillYMD: null,
  entries: []           // {id, date, drp, coins, hours, memo}
};

let state = JSON.parse(JSON.stringify(DEFAULT_STATE));

function normalizePlan() {
  if (!state.plan || !Array.isArray(state.plan.days)) {
    state.plan = { days: [] };
  }
  const days = [];
  for (let i = 0; i < 7; i++) {
    let existing =
      state.plan.days.find(d => d && d.offset === i) || state.plan.days[i];
    const plannedPlus =
      existing && typeof existing.plannedPlus === "number"
        ? existing.plannedPlus
        : 0;
    const memo =
      existing && typeof existing.memo === "string" ? existing.memo : "";
    days.push({ offset: i, plannedPlus, memo });
  }
  state.plan.days = days;
}

function normalizeState() {
  if (!state.goalType) state.goalType = "UP";
  if (typeof state.skipDays !== "number") state.skipDays = 0;
  if (!Array.isArray(state.skipDates)) state.skipDates = [];
  if (!state.plan) state.plan = { days: [] };
  if (!Array.isArray(state.entries)) state.entries = [];
  if (typeof state.autoPlus1PrevDay !== "boolean") {
    state.autoPlus1PrevDay = false;
  }
  if (typeof state.lastPrevAutoFillYMD !== "string") {
    state.lastPrevAutoFillYMD = null;
  }

  normalizePlan();
}

async function loadStateFromFirestore() {
  try {
    const snap = await stateDocRef.get();
    if (snap.exists) {
      const data = snap.data();
      state = Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), data || {});
    } else {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      normalizeState();
      await stateDocRef.set(state);
      return;
    }
    normalizeState();
  } catch (e) {
    console.error("Firestore 読み込み失敗:", e);
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    normalizeState();
  }
}

function saveState() {
  normalizeState();
  stateDocRef.set(state).catch(err => console.error("Firestore 保存失敗:", err));
}

function genEntryId(dateStr) {
  return `${dateStr}_${Date.now()}`;
}

function findEntryIndexByDate(dateStr) {
  return (state.entries || []).findIndex(e => e && e.date === dateStr);
}

// 同じdateがあれば上書き、なければ追加
function upsertEntryByDate(dateStr, patch) {
  if (!Array.isArray(state.entries)) state.entries = [];

  const idx = findEntryIndexByDate(dateStr);

  if (idx >= 0) {
    state.entries[idx] = {
      ...state.entries[idx],
      ...patch,
      date: dateStr,
      id: state.entries[idx].id || genEntryId(dateStr)
    };
  } else {
    state.entries.push({
      id: genEntryId(dateStr),
      date: dateStr,
      drp: 0,
      coins: 0,
      hours: "",
      memo: "",
      ...patch
    });
  }
}
