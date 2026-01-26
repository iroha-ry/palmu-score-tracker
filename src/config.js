// =====================
// ランク定義 & 設定
// =====================

// 1日に取りうる＋値
const ALLOWED_PLUS = [0, 1, 2, 4, 6];

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
