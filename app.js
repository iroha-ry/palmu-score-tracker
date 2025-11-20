// ====== 定数・状態 ======
const RANKS = ["D", "C1", "C2", "C3", "B1", "B2", "B3", "A1", "A2", "A3", "A4", "A5", "S", "SS"];
const STORAGE_KEY = "palmuRankState_v2";

const DEFAULT_STATE = {
  currentRank: "A1",
  coinsPerPoint: 0,
  entries: [] // {id, date: "YYYY-MM-DD", drp, coins, hours, memo}
};

let state = loadState();

// ====== ストレージ関連 ======
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(DEFAULT_STATE), parsed);
  } catch (e) {
    console.error("Failed to load state:", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ====== ユーティリティ ======
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

function dateDiffInDays(a, b) {
  // a, b: Date
  const ONE_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / ONE_DAY);
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return "-";
  return n.toLocaleString("ja-JP");
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

// ====== レンダリング ======
function initRankSelect() {
  const select = document.getElementById("currentRank");
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
    tdDrp.textContent = `${entry.drp} pt`;

    const tdCoins = document.createElement("td");
    tdCoins.className = "text-right";
    tdCoins.textContent = entry.coins ? `${formatNumber(entry.coins)} コイン` : "-";

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
      saveState();
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

function renderDashboard() {
  const sum7El = document.getElementById("sum7");
  const needUpPointsEl = document.getElementById("needUpPoints");
  const needKeepPointsEl = document.getElementById("needKeepPoints");
  const needUpCoinsEl = document.getElementById("needUpCoins");
  const needKeepCoinsEl = document.getElementById("needKeepCoins");
  const safeMarginPointsEl = document.getElementById("safeMarginPoints");
  const progressBar = document.getElementById("progressBar");
  const statusBadge = document.getElementById("statusBadge");
  const currentRankBadges = document.getElementById("currentRankBadges");
  const nextRankLabel = document.getElementById("nextRankLabel");
  const prevRankLabel = document.getElementById("prevRankLabel");

  // ランクまわり
  const rank = state.currentRank;
  const rankIndex = RANKS.indexOf(rank);
  const nextRank = rankIndex >= 0 && rankIndex < RANKS.length - 1 ? RANKS[rankIndex + 1] : null;
  const prevRank = rankIndex > 0 ? RANKS[rankIndex - 1] : null;
  nextRankLabel.textContent = nextRank || "これ以上はありません（最上位）";
  prevRankLabel.textContent = prevRank || "これ以上はありません（最下位）";

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

  // 直近7日の合計を計算
  const { sum7 } = calcLast7Days();
  sum7El.textContent = sum7;

  // 閾値
  const UP_THRESHOLD = 18;
  const KEEP_THRESHOLD = 12;

  const needUpPoints = Math.max(0, UP_THRESHOLD - sum7);
  const needKeepPoints = Math.max(0, KEEP_THRESHOLD - sum7);
  const safeMargin =
    sum7 === 0 && state.entries.length === 0
      ? "-"
      : sum7 <= 11
      ? `あと ${11 - sum7 + 1} pt でダウン域`
      : `${sum7 - 11} pt`;

  needUpPointsEl.textContent = needUpPoints;
  needKeepPointsEl.textContent = needKeepPoints;
  safeMarginPointsEl.textContent = safeMargin;

  const cpp = Number(state.coinsPerPoint) || 0;
  if (cpp > 0) {
    needUpCoinsEl.textContent = needUpPoints > 0 ? formatNumber(needUpPoints * cpp) : "0";
    needKeepCoinsEl.textContent = needKeepPoints > 0 ? formatNumber(needKeepPoints * cpp) : "0";
  } else {
    needUpCoinsEl.textContent = "-";
    needKeepCoinsEl.textContent = "-";
  }

  // プログレスバー（UPに対する達成度）
  const progress = clamp(sum7 / UP_THRESHOLD, 0, 1) * 100;
  progressBar.style.width = `${progress}%`;

  // 判定
  let statusText = "データ不足";
  let badgeClass = "badge badge-keep";

  if (state.entries.length === 0) {
    statusText = "データ不足";
    badgeClass = "badge badge-keep";
  } else if (sum7 >= UP_THRESHOLD) {
    statusText = "UP条件クリア（18pt以上）";
    badgeClass = "badge badge-up";
  } else if (sum7 >= KEEP_THRESHOLD) {
    statusText = "KEEP条件クリア（12〜17pt）";
    badgeClass = "badge badge-keep";
  } else {
    statusText = "DOWN域（0〜11pt）";
    badgeClass = "badge badge-down";
  }

  statusBadge.className = badgeClass;
  statusBadge.textContent = statusText;
}

function calcLast7Days() {
  if (!state.entries.length) return { sum7: 0 };

  const sorted = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));
  const latestEntry = sorted[0];
  const latestDate = parseDate(latestEntry.date);

  let sum7 = 0;
  for (const e of state.entries) {
    const d = parseDate(e.date);
    const diff = dateDiffInDays(d, latestDate); // e.date → latestDate
    if (diff >= 0 && diff < 7) {
      sum7 += Number(e.drp) || 0;
    }
  }
  return { sum7 };
}

function updateAll() {
  renderEntries();
  renderDashboard();
  saveState();
}

// ====== イベント登録 ======
function setupForm() {
  const form = document.getElementById("entryForm");
  const dateInput = document.getElementById("date");
  const drpInput = document.getElementById("drp");
  const coinsInput = document.getElementById("coins");
  const hoursInput = document.getElementById("hours");
  const memoInput = document.getElementById("memo");

  dateInput.value = todayString();

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

    const entry = {
      id: `${date}_${Date.now()}`,
      date,
      drp,
      coins,
      hours,
      memo
    };
    state.entries.push(entry);
    saveState();

    drpInput.value = "";
    coinsInput.value = "";
    hoursInput.value = "";
    memoInput.value = "";

    updateAll();
  });
}

function setupSettings() {
  const rankSelect = document.getElementById("currentRank");
  const cppInput = document.getElementById("coinsPerPoint");

  rankSelect.addEventListener("change", () => {
    state.currentRank = rankSelect.value;
    saveState();
    updateAll();
  });

  cppInput.value = state.coinsPerPoint || "";
  cppInput.addEventListener("change", () => {
    state.coinsPerPoint = Number(cppInput.value) || 0;
    saveState();
    updateAll();
  });
}

function setupClearAll() {
  const btn = document.getElementById("clearAll");
  btn.addEventListener("click", () => {
    if (!state.entries.length) return;
    if (!confirm("保存されている全ての入力データを削除しますか？（元に戻せません）")) return;
    state.entries = [];
    saveState();
    updateAll();
  });
}

// ====== 初期化 ======
document.addEventListener("DOMContentLoaded", () => {
  initRankSelect();
  setupForm();
  setupSettings();
  setupClearAll();
  updateAll();
});
