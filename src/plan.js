// =====================
// 計画再配分
// =====================

function recalcPlanFromActual() {
  const { sumPlus, daily, startDate, endDate } = calcActualSummary();
  if (!startDate || !endDate) {
    alert("期間が未設定 or 実績がありません。先に開始日とデータを入力してください。");
    return;
  }

  const cfg = getRankConfig(state.currentRank);
  const targetPlus =
    state.goalType === "UP" ? cfg.upThreshold : cfg.keepThreshold;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = formatDateYMD(today);

  const cal = buildCalendarInfo();
  if (!cal) {
    alert("期間情報が取得できませんでした。開始日やスキップ設定を確認してください。");
    return;
  }
  const { activeIndexToDate } = cal;

  // ① 今日まで（≦今日）の実績＋数を合計し、計画を実績ベースに固定
  //    - 過去日：実績があればその値、なければ＋0
  //    - 当日：実績があればその値、なければ「最低＋1」で扱う
  let sumDone = 0;
  for (let idx = 0; idx < activeIndexToDate.length; idx++) {
    const ds = activeIndexToDate[idx];
    const actual = daily[ds]?.plus || 0;
    let used = actual;

    if (ds === todayStr) {
      // 当日は配信つければ＋1が確定なので、実績なしなら＋1として扱う
      if (actual === 0) {
        used = 1;
      }
    } else if (ds < todayStr) {
      // 過去日は実績がなければ本当に＋0（休み）扱い
      used = actual;
    }

    if (ds <= todayStr) {
      sumDone += used;
      if (!state.plan.days[idx]) {
        state.plan.days[idx] = { offset: idx, plannedPlus: 0, memo: "" };
      }
      state.plan.days[idx].plannedPlus = used;
    }
  }

  // ② 残り必要pt（今日までの分を引いた分）
  let remainingNeed = targetPlus - sumDone;
  if (remainingNeed < 0) remainingNeed = 0;

  // ③ 「今日より後（＞今日）」のアクティブ日を取得
  const futureIdx = [];
  for (let idx = 0; idx < activeIndexToDate.length; idx++) {
    const ds = activeIndexToDate[idx];
    if (ds > todayStr) {
      futureIdx.push(idx);
    }
  }

  if (!futureIdx.length) {
    // もう先のアクティブ日がない → そのまま
    updateAll();
    return;
  }

  // ④ 残り必要ptを futureIdx の日数で割って再配分（0/1/2/4/6に丸める）
  let slots = futureIdx.length;
  let remainingPoints = remainingNeed;

  for (const idx of futureIdx) {
    let newPlus = 0;
    if (remainingPoints > 0) {
      const basePerDay = Math.ceil(remainingPoints / slots);
      newPlus = pickRealisticPlus(basePerDay); // 0/1/2/4/6 に切り上げ
      if (newPlus > 6) newPlus = 6;
      remainingPoints -= newPlus;
    }
    if (!state.plan.days[idx]) {
      state.plan.days[idx] = { offset: idx, plannedPlus: 0, memo: "" };
    }
    state.plan.days[idx].plannedPlus = newPlus;
    slots--;
  }

  updateAll();
}
