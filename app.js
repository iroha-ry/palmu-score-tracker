// =====================
// Firebase 初期化
// =====================

const firebaseConfig = {
  apiKey: "AIzaSyAwXA9NUKbFEj8rpBOnjTDvdxtlPU914ZI",
  authDomain: "palmu-rank-tracker.firebaseapp.com",
  projectId: "palmu-rank-tracker",
  storageBucket: "palmu-rank-tracker.firebasestorage.app",
  messagingSenderId: "475887212310",
  appId: "1:475887212310:web:c4ec10f408596a887ca237"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const STATE_COLLECTION = "palmuStates";
const STATE_DOC_ID = "main";
const stateDocRef = db.collection(STATE_COLLECTION).doc(STATE_DOC_ID);

// 1日に取りうる＋値
const ALLOWED_PLUS = [0, 1, 2, 4, 6];

// =====================
// ランク定義 & 設定
// =====================

const RANKS = ["D", "C1", "C2", "C3", "B1", "B2", "B3", "A1", "A2", "A3", "A4", "A5", "S", "SS"];

const DEFAULT_RANK_CONFIG = {
  D: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 0,
    plusScore: {},
    plusCoins: {}
  },
  C1: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 0,
    plusScore: {},
    plusCoins: {}
  },
  C2: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 0,
    plusScore: {},
    plusCoins: {}
  },
  C3: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 0,
    plusScore: {},
    plusCoins: {}
  },

  B1: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 4162,
    plusScore: { 2: 14200, 4: 31000, 6: 74900 },
    plusCoins: { 2: 4734, 4: 10334, 6: 24967 }
  },
  B2: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 5084,
    plusScore: { 2: 14200, 4: 38100, 6: 91500 },
    plusCoins: { 2: 4734, 4: 12700, 6: 30500 }
  },
  B3: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 5556,
    plusScore: { 2: 26600, 4: 59900, 6: 100000 },
    plusCoins: { 2: 8867, 4: 19967, 6: 33334 }
  },
  A1: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 9889,
    plusScore: { 2: 51100, 4: 90500, 6: 178000 },
    plusCoins: { 2: 17034, 4: 30167, 6: 59334 }
  },
  A2: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 13389,
    plusScore: { 2: 77000, 4: 126000, 6: 241000 },
    plusCoins: { 2: 25667, 4: 42000, 6: 80334 }
  },
  A3: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 19945,
    plusScore: { 2: 84900, 4: 182000, 6: 359000 },
    plusCoins: { 2: 28300, 4: 60667, 6: 119667 }
  },
  A4: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 33500,
    plusScore: { 2: 98200, 4: 224000, 6: 603000 },
    plusCoins: { 2: 32734, 4: 74667, 6: 201000 }
  },
  A5: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 36167,
    plusScore: { 2: 144000, 4: 331000, 6: 651000 },
    plusCoins: { 2: 48000, 4: 110334, 6: 217000 }
  },
  S: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 46389,
    plusScore: { 2: 183000, 4: 442000, 6: 835000 },
    plusCoins: { 2: 61000, 4: 147334, 6: 278334 }
  },
  SS: {
    upThreshold: 18,
    keepThreshold: 12,
    coinsPerPoint: 73334,
    plusScore: { 2: 375000, 4: 792000, 6: 1320000 },
    plusCoins: { 2: 125000, 4: 264000, 6: 440000 }
  }
};

function getRankConfig(rank) {
  const base = DEFAULT_RANK_CONFIG[rank] || DEFAULT_RANK_CONFIG["A1"];
  const overrideMap = state.rankConfig || {};
  const override = overrideMap[rank] || {};
  return {
    upThreshold: override.upThreshold ?? base.upThreshold,
    keepThreshold: override.keepThreshold ?? base.keepThreshold,
    coinsPerPoint: override.coinsPerPoint ?? base.coinsPerPoint,
    plusScore: Object.assign({}, base.plusScore, override.plusScore || {}),
    plusCoins: Object.assign({}, base.plusCoins, override.plusCoins || {})
  };
}

// =====================
// 状態
// =====================

const DEFAULT_STATE = {
  currentRank: "A1",
  goalType: "UP",
  coinsPerPoint: 0, // もう使ってないが互換用に残す
  skipDays: 0,
  periodStart: null,
  rankConfig: {},
  plan: {
    days: [] // {offset, plannedPlus, memo}
  },
  entries: [] // {id, date, drp, coins, hours, memo}
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
  if (!state.plan) state.plan = { days: [] };
  if (!Array.isArray(state.entries)) state.entries = [];
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

// =====================
// ユーティリティ
// =====================

function todayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDate(str) {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return "-";
  return n.toLocaleString("ja-JP");
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function dateDiffInDays(a, b) {
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / ONE_DAY);
}

function pickRealisticPlus(targetPerDay) {
  for (const v of ALLOWED_PLUS) {
    if (v >= targetPerDay) return v;
  }
  return 6;
}

// =====================
// 期間 & 集計
// =====================

function calcPeriod() {
  if (!state.entries.length && !state.periodStart) {
    return { startDate: null, endDate: null };
  }

  const skip = Number(state.skipDays) || 0;
  let startDate;
  let endDate;

  if (state.periodStart) {
    startDate = parseDate(state.periodStart);
    endDate = new Date(startDate.getTime());
    endDate.setDate(endDate.getDate() + 6 + skip);
  } else if (state.entries.length) {
    const sorted = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
    const baseEnd = parseDate(sorted[0].date);
    endDate = new Date(baseEnd.getTime());
    endDate.setDate(endDate.getDate() + skip);
    startDate = new Date(endDate.getTime());
    startDate.setDate(startDate.getDate() - 6);
  }

  return { startDate, endDate };
}

function calcActualSummary() {
  const { startDate, endDate } = calcPeriod();
  if (!startDate || !endDate) {
    return { sumPlus: 0, sumCoins: 0, daily: {}, startDate: null, endDate: null };
  }

  const daily = {};
  let sumPlus = 0;
  let sumCoins = 0;

  for (const e of state.entries) {
    if (!e.date) continue;
    const d = parseDate(e.date);
    if (d < startDate || d > endDate) continue;

    const key = formatDateYMD(d);
    const plus = Number(e.drp) || 0;
    const coins = Number(e.coins) || 0;

    sumPlus += plus;
    sumCoins += coins;

    if (!daily[key]) daily[key] = { plus: 0, coins: 0 };
    daily[key].plus += plus;
    daily[key].coins += coins;
  }

  return { sumPlus, sumCoins, daily, startDate, endDate };
}

function calcPlanSummary() {
  normalizePlan();
  let planTotal = 0;
  for (const d of state.plan.days) {
    planTotal += Number(d.plannedPlus) || 0;
  }
  return { planTotal };
}

// =====================
// レンダリング
// =====================

function initRankSelect() {
  const select = document.getElementById("currentRank");
  if (!select) return;
  select.innerHTML = "";
  for (const r of RANKS) {
    const opt = document.createElement("option");
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  }
  select.value = state.currentRank;
}

function renderEntries() {
  const tbody = document.querySelector("#entriesTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!state.entries.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.className = "text-small muted";
    td.textContent = "まだデータがありません。上のフォームから追加してください。";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const sorted = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
  const limited = sorted.slice(0, 30);

  for (const entry of limited) {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = entry.date;

    const tdDrp = document.createElement("td");
    tdDrp.className = "text-right";
    tdDrp.textContent = `＋${entry.drp}`;

    const tdCoins = document.createElement("td");
    tdCoins.className = "text-right";
    if (entry.coins) {
      const span = document.createElement("span");
      span.className = "coin-text";
      span.textContent = `${formatNumber(entry.coins)} コイン`;
      tdCoins.appendChild(span);
    } else {
      tdCoins.textContent = "-";
    }

    const tdMemo = document.createElement("td");
    const texts = [];
    if (entry.hours) texts.push(`[時間] ${entry.hours}`);
    if (entry.memo) texts.push(entry.memo);
    tdMemo.textContent = texts.join(" / ") || "-";

    const tdActions = document.createElement("td");
    tdActions.className = "text-right";
    const delBtn = document.createElement("button");
    delBtn.className = "btn-sm danger";
    delBtn.type = "button";
    delBtn.textContent = "削除";
    delBtn.addEventListener("click", () => {
      if (!confirm(`${entry.date} のデータを削除しますか？`)) return;
      state.entries = state.entries.filter(e => e.id !== entry.id);
      updateAll();
    });
    tdActions.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdDrp);
    tr.appendChild(tdCoins);
    tr.appendChild(tdMemo);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }
}

function renderPlan() {
  const tbody = document.getElementById("planTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  normalizePlan();

  const { startDate } = calcPeriod();
  const cfg = getRankConfig(state.currentRank);
  const skip = Number(state.skipDays) || 0;

  const baseRows = 7;
  const totalRows = baseRows + skip;

  for (let i = 0; i < totalRows; i++) {
    const tr = document.createElement("tr");

    // 日付
    const tdDate = document.createElement("td");
    if (startDate) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + i);
      tdDate.textContent = formatDateYMD(d);
    } else {
      tdDate.textContent = `Day ${i + 1}`;
    }
    tr.appendChild(tdDate);

    const tdPlus = document.createElement("td");
    const tdCoins = document.createElement("td");
    tdCoins.className = "text-right";
    const tdMemo = document.createElement("td");

    if (i < baseRows) {
      const day = state.plan.days[i];

      const select = document.createElement("select");
      select.dataset.offset = String(i);
      for (const v of ALLOWED_PLUS) {
        const opt = document.createElement("option");
        opt.value = String(v);
        opt.textContent = v === 0 ? "休み（＋0）" : `＋${v}`;
        select.appendChild(opt);
      }
      const currentVal = ALLOWED_PLUS.includes(Number(day.plannedPlus))
        ? String(day.plannedPlus)
        : "0";
      select.value = currentVal;
      select.addEventListener("change", e => {
        const off = Number(e.target.dataset.offset);
        let v = Number(e.target.value);
        if (!ALLOWED_PLUS.includes(v)) v = 0;
        state.plan.days[off].plannedPlus = v;
        updateAll();
      });
      tdPlus.appendChild(select);

      const plus = Number(currentVal);
      if (plus > 1 && cfg.plusCoins && cfg.plusCoins[plus] != null) {
        const span = document.createElement("span");
        span.className = "coin-text";
        span.textContent = `${formatNumber(cfg.plusCoins[plus])} コイン`;
        tdCoins.appendChild(span);
      } else if (plus === 1) {
        tdCoins.textContent = "配信ONで＋1";
      } else {
        tdCoins.textContent = "-";
      }

      const memoInput = document.createElement("input");
      memoInput.type = "text";
      memoInput.placeholder = "メモ";
      memoInput.value = day.memo || "";
      memoInput.dataset.offset = String(i);
      memoInput.addEventListener("input", e => {
        const off = Number(e.target.dataset.offset);
        state.plan.days[off].memo = e.target.value;
        saveState();
      });
      tdMemo.appendChild(memoInput);
    } else {
      // スキップ日行
      const label = document.createElement("span");
      label.textContent = "スキップ日（＋0固定）";
      tdPlus.appendChild(label);

      tdCoins.textContent = "-";

      const memo = document.createElement("span");
      memo.className = "text-small muted";
      memo.textContent = "スキップカード分の自動付与日";
      tdMemo.appendChild(memo);
    }

    tr.appendChild(tdPlus);
    tr.appendChild(tdCoins);
    tr.appendChild(tdMemo);

    tbody.appendChild(tr);
  }

  const { planTotal } = calcPlanSummary();
  const planTotalPlusEl = document.getElementById("planTotalPlus");
  const planMarginPlusEl = document.getElementById("planMarginPlus");
  const goalTypeLabel = document.getElementById("goalTypeLabel");
  const targetPlusLabel = document.getElementById("targetPlusLabel");
  const cfg2 = getRankConfig(state.currentRank);
  const targetPlus =
    state.goalType === "UP" ? cfg2.upThreshold : cfg2.keepThreshold;

  if (planTotalPlusEl) planTotalPlusEl.textContent = planTotal;
  if (goalTypeLabel)
    goalTypeLabel.textContent =
      state.goalType === "UP" ? "ランクアップ狙い" : "ランクキープ狙い";
  if (targetPlusLabel) targetPlusLabel.textContent = targetPlus;

  if (planMarginPlusEl) {
    const diff = planTotal - targetPlus;
    let text;
    if (diff === 0) text = "目標ぴったり";
    else if (diff > 0) text = `目標より +${diff}pt（余裕あり）`;
    else text = `目標まであと ${-diff}pt`;
    planMarginPlusEl.textContent = text;
  }
}

function renderDashboard() {
  const sum7El = document.getElementById("sum7");
  const needUpPointsEl = document.getElementById("needUpPoints");
  const needKeepPointsEl = document.getElementById("needKeepPoints");
  const safeMarginPointsEl = document.getElementById("safeMarginPoints");
  const progressBar = document.getElementById("progressBar");
  const statusBadge = document.getElementById("statusBadge");
  const currentRankBadges = document.getElementById("currentRankBadges");
  const nextRankLabel = document.getElementById("nextRankLabel");
  const prevRankLabel = document.getElementById("prevRankLabel");
  const periodStartLabel = document.getElementById("periodStart");
  const periodEndLabel = document.getElementById("periodEnd");
  const upConditionLabel = document.getElementById("upConditionLabel");
  const keepConditionLabel = document.getElementById("keepConditionLabel");
  const chipUpThreshold = document.getElementById("chipUpThreshold");
  const chipKeepThreshold = document.getElementById("chipKeepThreshold");
  const chipDownThreshold = document.getElementById("chipDownThreshold");
  const todayTargetPtEl = document.getElementById("todayTargetPt");
  const todayTargetCoinsEl = document.getElementById("todayTargetCoins");

  const rank = state.currentRank;
  const cfg = getRankConfig(rank);

  const rankIndex = RANKS.indexOf(rank);
  const nextRank =
    rankIndex >= 0 && rankIndex < RANKS.length - 1
      ? RANKS[rankIndex + 1]
      : null;
  const prevRank = rankIndex > 0 ? RANKS[rankIndex - 1] : null;

  if (nextRankLabel)
    nextRankLabel.textContent = nextRank || "これ以上はありません（最上位）";
  if (prevRankLabel)
    prevRankLabel.textContent = prevRank || "これ以上はありません（最下位）";

  if (currentRankBadges) {
    currentRankBadges.innerHTML = "";
    const rankBadge = document.createElement("span");
    rankBadge.className = "badge badge-rank";
    rankBadge.textContent = `現在ランク: ${rank}`;
    currentRankBadges.appendChild(rankBadge);
    if (nextRank) {
      const nextBadge = document.createElement("span");
      nextBadge.className = "badge badge-keep";
      nextBadge.textContent = `次: ${nextRank}`;
      currentRankBadges.appendChild(nextBadge);
    }
  }

  const { sumPlus, startDate, endDate } = calcActualSummary();

  if (sum7El) sum7El.textContent = sumPlus;
  if (periodStartLabel)
    periodStartLabel.textContent = startDate ? formatDateYMD(startDate) : "-";
  if (periodEndLabel)
    periodEndLabel.textContent = endDate ? formatDateYMD(endDate) : "-";

  const UP_THRESHOLD = cfg.upThreshold;
  const KEEP_THRESHOLD = cfg.keepThreshold;

  if (upConditionLabel)
    upConditionLabel.textContent = `ランクアップ条件（${UP_THRESHOLD}pt以上）`;
  if (keepConditionLabel)
    keepConditionLabel.textContent = `キープ条件（${KEEP_THRESHOLD}pt以上）`;
  if (chipUpThreshold) chipUpThreshold.textContent = UP_THRESHOLD;
  if (chipKeepThreshold) chipKeepThreshold.textContent = KEEP_THRESHOLD;
  if (chipDownThreshold) chipDownThreshold.textContent = KEEP_THRESHOLD - 1;

  const needUpPoints = Math.max(0, UP_THRESHOLD - sumPlus);
  const needKeepPoints = Math.max(0, KEEP_THRESHOLD - sumPlus);
  const safeMargin =
    sumPlus === 0 && state.entries.length === 0
      ? "-"
      : sumPlus <= KEEP_THRESHOLD - 1
      ? `あと ${(KEEP_THRESHOLD - 1) - sumPlus + 1} pt でダウン域`
      : `${sumPlus - (KEEP_THRESHOLD - 1)} pt`;

  if (needUpPointsEl) needUpPointsEl.textContent = needUpPoints;
  if (needKeepPointsEl) needKeepPointsEl.textContent = needKeepPoints;
  if (safeMarginPointsEl) safeMarginPointsEl.textContent = safeMargin;

  if (progressBar) {
    const progress = clamp(sumPlus / UP_THRESHOLD, 0, 1) * 100;
    progressBar.style.width = `${progress}%`;
  }

  if (statusBadge) {
    let statusText = "データ不足";
    let badgeClass = "badge badge-keep";

    if (state.entries.length === 0) {
      statusText = "データ不足";
      badgeClass = "badge badge-keep";
    } else if (sumPlus >= UP_THRESHOLD) {
      statusText = `UP条件クリア（${UP_THRESHOLD}pt以上）`;
      badgeClass = "badge badge-up";
    } else if (sumPlus >= KEEP_THRESHOLD) {
      statusText = `KEEP条件クリア（${KEEP_THRESHOLD}〜${UP_THRESHOLD - 1}pt）`;
      badgeClass = "badge badge-keep";
    } else {
      statusText = `DOWN域（〜${KEEP_THRESHOLD - 1}pt）`;
      badgeClass = "badge badge-down";
    }

    statusBadge.className = badgeClass;
    statusBadge.textContent = statusText;
  }

  // 今日のノルマ
  if (todayTargetPtEl && todayTargetCoinsEl) {
    if (!startDate || !endDate) {
      todayTargetPtEl.textContent = "期間が未設定 or 実績がありません";
      todayTargetCoinsEl.textContent = "-";
    } else {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (today < startDate || today > endDate) {
        todayTargetPtEl.textContent = "今日の日付はこの週の期間外です";
        todayTargetCoinsEl.textContent = "-";
      } else {
        let remainingDays = dateDiffInDays(today, endDate) + 1;
        if (remainingDays < 1) remainingDays = 1;

        const targetPlus =
          state.goalType === "UP" ? UP_THRESHOLD : KEEP_THRESHOLD;
        const remaining = targetPlus - sumPlus;

        if (remaining <= 0) {
          todayTargetPtEl.textContent = "今週の目標ptはすでに達成済み";
          todayTargetCoinsEl.textContent = "-";
        } else {
          const basePerDay = Math.ceil(remaining / remainingDays);
          const realistic = pickRealisticPlus(basePerDay);
          const ps = cfg.plusScore || {};
          const pc = cfg.plusCoins || {};
          const scoreNeeded =
            realistic > 1 && ps[realistic] != null ? ps[realistic] : null;
          const coinsNeeded =
            realistic > 1 && pc[realistic] != null ? pc[realistic] : null;

          if (realistic === 0) {
            todayTargetPtEl.textContent = `理論値 ${basePerDay}pt/日ですが、今日は休みでも達成可能なペース。`;
            todayTargetCoinsEl.textContent = "-";
          } else if (realistic === 1) {
            todayTargetPtEl.textContent = `今日は＋1を取ればOK（理論値 ${basePerDay}pt/日 計算）。`;
            todayTargetCoinsEl.textContent =
              "配信を1秒でもつける。追加コインは必須ではありません。";
          } else {
            todayTargetPtEl.textContent = `今日は ＋${realistic} を目標（理論値 ${basePerDay}pt/日 → ＋${realistic} に切り上げ）。`;
            if (scoreNeeded != null && coinsNeeded != null) {
              todayTargetCoinsEl.textContent =
                `最低スコア目安: ${formatNumber(scoreNeeded)} / ` +
                `目安コイン: ${formatNumber(coinsNeeded)} コイン`;
            } else {
              todayTargetCoinsEl.textContent = "-";
            }
          }
        }
      }
    }
  }
}

function updateAll() {
  normalizeState();
  renderPlan();
  renderEntries();
  renderDashboard();
  saveState();
}

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

  // フォーカス時にカレンダー開けるブラウザでは自動で開く
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

    const entry = {
      id: `${date}_${Date.now()}`,
      date,
      drp,
      coins,
      hours,
      memo
    };
    state.entries.push(entry);
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
      saveState();
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

// =====================
// 初期化
// =====================

async function initApp() {
  await loadStateFromFirestore();
  initRankSelect();
  setupForm();
  setupSettings();
  setupClearAll();
  updateAll();
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
