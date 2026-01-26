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

    const editBtn = document.createElement("button");
    editBtn.className = "btn-sm";
    editBtn.type = "button";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => {
      enterEntryEditMode(tr, entry);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "btn-sm danger";
    delBtn.type = "button";
    delBtn.textContent = "削除";
    delBtn.style.marginLeft = "6px";
    delBtn.addEventListener("click", () => {
      if (!confirm(`${entry.date} のデータを削除しますか？`)) return;
      state.entries = state.entries.filter(e => e.id !== entry.id);
      updateAll();
    });

    tdActions.appendChild(editBtn);
    tdActions.appendChild(delBtn);

    tr.appendChild(tdDate);
    tr.appendChild(tdDrp);
    tr.appendChild(tdCoins);
    tr.appendChild(tdMemo);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }
}

function enterEntryEditMode(tr, entry) {
  tr.innerHTML = "";

  // 日付
  const tdDate = document.createElement("td");
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = entry.date || "";
  tdDate.appendChild(dateInput);

  // ＋
  const tdDrp = document.createElement("td");
  tdDrp.className = "text-right";
  const drpSelect = document.createElement("select");
  [1, 2, 4, 6].forEach(p => {
    const opt = document.createElement("option");
    opt.value = String(p);
    opt.textContent = `＋${p}`;
    if (Number(entry.drp) === p) opt.selected = true;
    drpSelect.appendChild(opt);
  });
  tdDrp.appendChild(drpSelect);

  // コイン
  const tdCoins = document.createElement("td");
  tdCoins.className = "text-right";
  const coinsInput = document.createElement("input");
  coinsInput.type = "number";
  coinsInput.min = "0";
  coinsInput.placeholder = "コイン";
  coinsInput.value = entry.coins ? String(entry.coins) : "";
  coinsInput.style.maxWidth = "140px";
  tdCoins.appendChild(coinsInput);

  // メモ
  const tdMemo = document.createElement("td");
  const memoInput = document.createElement("input");
  memoInput.type = "text";
  memoInput.placeholder = "時間/メモ";
  const texts = [];
  if (entry.hours) texts.push(entry.hours);
  if (entry.memo) texts.push(entry.memo);
  memoInput.value = texts.join(" / ");
  tdMemo.appendChild(memoInput);

  // 操作
  const tdActions = document.createElement("td");
  tdActions.className = "text-right";

  const saveBtn = document.createElement("button");
  saveBtn.className = "btn-sm";
  saveBtn.type = "button";
  saveBtn.textContent = "保存";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "btn-sm";
  cancelBtn.type = "button";
  cancelBtn.textContent = "取消";
  cancelBtn.style.marginLeft = "6px";

  saveBtn.addEventListener("click", () => {
    const newDate = dateInput.value;
    const newDrp = sanitizePlus(drpSelect.value);
    const newCoins = coinsInput.value ? Number(coinsInput.value) : 0;

    // hoursとmemoは簡易的にまとめ入力扱いでもOK
    const mergedMemo = memoInput.value.trim();

    // 同日統合（date基準で1本化運用）
    // いったん元idレコードを除外
    state.entries = (state.entries || []).filter(e => e.id !== entry.id);

    upsertEntryByDate(newDate, {
      drp: newDrp,
      coins: newCoins,
      hours: "",        // 必要なら分けてUI作る
      memo: mergedMemo
    });

    updateAll();
  });

  cancelBtn.addEventListener("click", () => updateAll());

  tdActions.appendChild(saveBtn);
  tdActions.appendChild(cancelBtn);

  tr.appendChild(tdDate);
  tr.appendChild(tdDrp);
  tr.appendChild(tdCoins);
  tr.appendChild(tdMemo);
  tr.appendChild(tdActions);
}

function renderSkipDateInputs() {
  const container = document.getElementById("skipDatesContainer");
  if (!container) return;
  container.innerHTML = "";

  const n = Number(state.skipDays) || 0;
  if (n <= 0) {
    // ★ skipDays=0 のときは内部もリセット
    state.skipDates = [];
    saveState();

    const p = document.createElement("div");
    p.className = "text-small muted";
    p.textContent = "スキップカードを使わない週です。";
    container.appendChild(p);
    return;
  }

  for (let i = 0; i < n; i++) {
    const row = document.createElement("div");
    row.className = "skip-dates-row";

    const label = document.createElement("span");
    label.className = "text-small";
    label.textContent = `スキップ${i + 1}枚目：`;

    const input = document.createElement("input");
    input.type = "date";
    input.dataset.index = String(i);
    input.value = state.skipDates?.[i] || "";

    // モバイル/PC両方でタップしたらカレンダー出しやすく
    if (input.showPicker) {
      input.addEventListener("focus", () => {
        input.showPicker();
      });
    }

    input.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.index);
      if (!state.skipDates) state.skipDates = [];
      state.skipDates[idx] = e.target.value || null;
      saveState();
    });

    row.appendChild(label);
    row.appendChild(input);
    container.appendChild(row);
  }
}

function renderPlan() {
  const tbody = document.getElementById("planTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  normalizePlan();

  const cal = buildCalendarInfo();
  const cfg = getRankConfig(state.currentRank);

  if (!cal) {
    // 期間未設定時は「Day1〜Day7」で7行だけ出す
    for (let i = 0; i < 7; i++) {
      const day = state.plan.days[i];
      const tr = document.createElement("tr");

      const tdDate = document.createElement("td");
      tdDate.textContent = `Day ${i + 1}`;

      const tdPlus = document.createElement("td");
      const select = document.createElement("select");
      select.dataset.planIndex = String(i);
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
        const idx = Number(e.target.dataset.planIndex);
        let v = Number(e.target.value);
        if (!ALLOWED_PLUS.includes(v)) v = 0;
        state.plan.days[idx].plannedPlus = v;
        updateAll();
      });
      tdPlus.appendChild(select);

      const tdCoins = document.createElement("td");
      tdCoins.className = "text-right";
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

      const tdMemo = document.createElement("td");
      const memoInput = document.createElement("input");
      memoInput.type = "text";
      memoInput.placeholder = "メモ";
      memoInput.value = day.memo || "";
      memoInput.dataset.planIndex = String(i);
      memoInput.addEventListener("input", e => {
        const idx = Number(e.target.dataset.planIndex);
        state.plan.days[idx].memo = e.target.value;
        saveState();
      });
      tdMemo.appendChild(memoInput);

      tr.appendChild(tdDate);
      tr.appendChild(tdPlus);
      tr.appendChild(tdCoins);
      tr.appendChild(tdMemo);

      tbody.appendChild(tr);
    }

    // 合計など
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
    return;
  }

  // ここから「期間＋スキップ日」あり
  const { dates, skipSet, activeDateToIndex } = cal;

  for (const ds of dates) {
    const tr = document.createElement("tr");

    // 日付
    const tdDate = document.createElement("td");
    tdDate.textContent = ds;

    const tdPlus = document.createElement("td");
    const tdCoins = document.createElement("td");
    tdCoins.className = "text-right";
    const tdMemo = document.createElement("td");

    if (skipSet.has(ds)) {
      // スキップ日
      const label = document.createElement("span");
      label.textContent = "スキップ日（＋0固定）";
      tdPlus.appendChild(label);

      tdCoins.textContent = "-";

      const memo = document.createElement("span");
      memo.className = "text-small muted";
      memo.textContent = "スキップカード分の自動付与日";
      tdMemo.appendChild(memo);
    } else {
      // 非スキップ日 → 計画7日のうちのどこか
      const planIdx = activeDateToIndex[ds];
      const day = state.plan.days[planIdx] || { plannedPlus: 0, memo: "" };

      const select = document.createElement("select");
      select.dataset.planIndex = String(planIdx);
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
        const idx = Number(e.target.dataset.planIndex);
        let v = Number(e.target.value);
        if (!ALLOWED_PLUS.includes(v)) v = 0;
        state.plan.days[idx].plannedPlus = v;
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
      memoInput.dataset.planIndex = String(planIdx);
      memoInput.addEventListener("input", e => {
        const idx = Number(e.target.dataset.planIndex);
        state.plan.days[idx].memo = e.target.value;
        saveState();
      });
      tdMemo.appendChild(memoInput);
    }

    tr.appendChild(tdDate);
    tr.appendChild(tdPlus);
    tr.appendChild(tdCoins);
    tr.appendChild(tdMemo);

    tbody.appendChild(tr);
  }

  // 合計など（ここは今まで通り 7日分の合計）
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

  const { sumPlus, daily, startDate, endDate } = calcActualSummary();

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
    const goalMax =
      state.goalType === "UP" ? UP_THRESHOLD : KEEP_THRESHOLD;
    const progress = clamp(
      goalMax > 0 ? sumPlus / goalMax : 0,
      0,
      1
    ) * 100;
    progressBar.style.width = `${progress}%`;
  }

  // 今日の目安（計画・スキップ日とリンク）
  if (todayTargetPtEl && todayTargetCoinsEl) {
    if (!startDate || !endDate) {
      todayTargetPtEl.textContent = "期間が未設定 or 実績がありません";
      todayTargetCoinsEl.textContent = "-";
    } else {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayStr = formatDateYMD(today);

      if (today < startDate || today > endDate) {
        todayTargetPtEl.textContent = "今日の日付はこの週の期間外です";
        todayTargetCoinsEl.textContent = "-";
      } else {
        const cal = buildCalendarInfo();
        const { skipSet, activeDateToIndex, dates } = cal;

        const targetPlus =
          state.goalType === "UP" ? UP_THRESHOLD : KEEP_THRESHOLD;
        const remainingWeek = targetPlus - sumPlus;

        if (skipSet.has(todayStr)) {
          // スキップ日
          todayTargetPtEl.textContent = "今日はスキップ日（＋0固定）です。";
          if (remainingWeek > 0) {
            todayTargetCoinsEl.textContent = `週目標までは残り ${remainingWeek}pt。非スキップ日に上乗せして調整しましょう。`;
          } else {
            todayTargetCoinsEl.textContent = "週目標はすでに達成済みです。";
          }
        } else {
          // 非スキップ日 → 7日計画のどこか
          const planIdx = activeDateToIndex[todayStr];
          const planPlusToday =
            planIdx != null ? Number(state.plan.days[planIdx].plannedPlus) || 0 : 0;
          const actualToday = daily[todayStr]?.plus || 0;

          if (planPlusToday > 0) {
            if (actualToday >= planPlusToday) {
              todayTargetPtEl.textContent = `今日の目標 ＋${planPlusToday} は達成済み（実績 ＋${actualToday}）`;
              if (remainingWeek > 0) {
                todayTargetCoinsEl.textContent = `週目標までは残り ${remainingWeek}pt。明日以降の計画で調整しましょう。`;
              } else {
                todayTargetCoinsEl.textContent = "週目標も達成済みです。";
              }
            } else {
              const diff = planPlusToday - actualToday;
              todayTargetPtEl.textContent = `今日の目標: ＋${planPlusToday}（現在 ＋${actualToday} → あと ＋${diff} 欲しい）`;
              const ps = cfg.plusScore || {};
              const pc = cfg.plusCoins || {};
              if (planPlusToday > 1 && ps[planPlusToday] != null && pc[planPlusToday] != null) {
                todayTargetCoinsEl.textContent =
                  `この日の目標に必要な最低スコア目安: ${formatNumber(
                    ps[planPlusToday]
                  )} / 目安コイン: ${formatNumber(pc[planPlusToday])} コイン`;
              } else if (planPlusToday === 1) {
                todayTargetCoinsEl.textContent =
                  "配信を1秒でもつければ＋1は確定。必要ならギフトで＋2/4/6を狙う想定で。";
              } else {
                todayTargetCoinsEl.textContent = "-";
              }
            }
          } else {
            // 計画が0のとき → 非スキップだけど今日は休み計画 or 未設定 → 残り日平均モード
            const cal2 = buildCalendarInfo();
            const { dates: allDates, skipSet: skip2 } = cal2;
            const todayIndex = allDates.indexOf(todayStr);
            const remainingActiveDays = allDates.slice(todayIndex).filter(ds => !skip2.has(ds)).length || 1;
            const remaining = targetPlus - sumPlus;

            if (remaining <= 0) {
              todayTargetPtEl.textContent = "今週の目標ptはすでに達成済み";
              todayTargetCoinsEl.textContent = "-";
            } else {
              const basePerDay = Math.ceil(remaining / remainingActiveDays);
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
  }
}

function updateLiveCalculator() {
  const rankLabel = document.getElementById("liveCalcRankLabel");
  const plusSelect = document.getElementById("calcPlusSelect");
  const targetScoreEl = document.getElementById("calcTargetScore");
  const currentScoreInput = document.getElementById("calcCurrentScore");
  const remainingScoreEl = document.getElementById("calcRemainingScore");
  const requiredCoinsEl = document.getElementById("calcRequiredCoins");

  if (!plusSelect || !targetScoreEl || !currentScoreInput || !remainingScoreEl || !requiredCoinsEl || !rankLabel) {
    return; // 初期ロード中など
  }

  // 現在ランクを表示
  rankLabel.textContent = state.currentRank || "-";

  const cfg = getRankConfig(state.currentRank);
  const targetPlus = Number(plusSelect.value) || 2;

  // このランクの＋2/4/6用ボーダースコアを取得
  const scoreMap = cfg.plusScore || {};
  const targetScore = scoreMap[targetPlus];

  if (!targetScore) {
    // ボーダー未設定のとき
    targetScoreEl.textContent = "-";
    remainingScoreEl.textContent = "-";
    requiredCoinsEl.textContent = "-";
    return;
  }

  targetScoreEl.textContent = formatNumber(targetScore);

  const currentScore = Number(currentScoreInput.value) || 0;
  let remainingScore = targetScore - currentScore;
  if (remainingScore < 0) remainingScore = 0;

  remainingScoreEl.textContent = formatNumber(remainingScore);

  // ★ 差分スコアを 1/3 → 10コイン単位に切り上げ
  const baseCoins = remainingScore > 0 ? Math.ceil(remainingScore / 3) : 0;

  // 最低10コイン、かつ10の位で切り上げ（例: 1→10, 11→20, 20→20）
  let requiredCoins = 0;
  if (baseCoins > 0) {
    requiredCoins = Math.ceil(baseCoins / 10) * 10;
  }

  requiredCoinsEl.textContent =
    requiredCoins > 0 ? `${formatNumber(requiredCoins)} コイン` : "0 コイン";
}

function updateAll() {
  normalizeState();
  renderSkipDateInputs();
  renderPlan();
  renderEntries();
  renderDashboard();
  updateLiveCalculator();
  saveState();
}
