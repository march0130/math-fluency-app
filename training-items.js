/* Item generators for the daily training.
 *
 * Ported unchanged from the original single-task pages, so a lesson produces
 * exactly the same items in the same order as before. Both streams are seeded
 * from the lesson number: every student in a lesson meets the same items in
 * both conditions. Practice draws on a different seed of the same lesson.
 *
 * Everything sits inside one object so nothing collides with the page script.
 */

const TRAINING_ITEMS = (function () {
  const OPTION_COUNT = 4;

  /* ---------- multiplication ---------- */

  /* Lessons 1-5 drill the facts up to 5, lessons 6-15 the full 1-9 range. */
  function factorMax(lesson) {
    return lesson <= 5 ? 5 : 9;
  }

  function itemKey(item) {
    return item.a + "x" + item.b;
  }

  /* Distractors are the near misses students actually make: a factor off by
   * one, the product off by one or two, and adding instead of multiplying. */
  function answerOptions(a, b, product, rng) {
    const candidates = [
      a * (b + 1),
      a * (b - 1),
      (a + 1) * b,
      (a - 1) * b,
      a + b,
      product + 1,
      product - 1,
      product + 2,
      product - 2,
    ];

    const seen = {};
    seen[product] = true;
    const distractors = [];
    shuffle(candidates, rng).forEach(function (value) {
      if (value > 0 && !seen[value]) {
        seen[value] = true;
        distractors.push(value);
      }
    });

    /* Small products (1 × 1) exhaust the near misses, so widen outwards until
     * there are always OPTION_COUNT choices. */
    for (let step = 3; distractors.length < OPTION_COUNT - 1 && step < 40; step += 1) {
      [product + step, product - step].forEach(function (value) {
        if (value > 0 && !seen[value] && distractors.length < OPTION_COUNT - 1) {
          seen[value] = true;
          distractors.push(value);
        }
      });
    }

    const options = [product].concat(distractors.slice(0, OPTION_COUNT - 1));
    return shuffle(options, rng);
  }

  function multiplicationStream(lesson, seedOffset) {
    const rng = mulberry32(lesson * 6271 + 29 + (seedOffset || 0));
    const max = factorMax(lesson);
    const recent = [];

    function generate() {
      const a = 1 + Math.floor(rng() * max);
      const b = 1 + Math.floor(rng() * max);
      return { a: a, b: b, product: a * b };
    }

    return {
      next: function () {
        let item = generate();
        let guard = 0;
        while (recent.indexOf(itemKey(item)) !== -1 && guard < 24) {
          item = generate();
          guard += 1;
        }
        recent.push(itemKey(item));
        if (recent.length > 8) recent.shift();
        item.options = answerOptions(item.a, item.b, item.product, rng);
        return item;
      },
    };
  }

  /* ---------- fraction comparison ---------- */

  const DENOMS = ALLOWED_DENOMINATORS;
  const SAME_DEN_DENOMS = DENOMS.filter(function (d) {
    return d >= 3;
  });

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function pairKey(pair) {
    return fracKey(pair.left) + "|" + fracKey(pair.right);
  }

  function orient(rng, f1, f2, type) {
    const flip = rng() < 0.5;
    const left = flip ? f2 : f1;
    const right = flip ? f1 : f2;
    const largerSide = fracValue(left) > fracValue(right) ? "left" : "right";
    return { type: type, left: left, right: right, largerSide: largerSide };
  }

  function genSameDenominator(rng) {
    const d = pick(rng, SAME_DEN_DENOMS);
    const a = 1 + Math.floor(rng() * (d - 1));
    let b = 1 + Math.floor(rng() * (d - 1));
    while (b === a) b = 1 + Math.floor(rng() * (d - 1));
    return orient(rng, { n: a, d: d }, { n: b, d: d }, "sameDen");
  }

  function genSameNumerator(rng, allowNonUnit) {
    const n = allowNonUnit && rng() < 0.45 ? 2 + Math.floor(rng() * 2) : 1;
    const pool = DENOMS.filter(function (d) {
      return d > n;
    });
    const d1 = pick(rng, pool);
    let d2 = pick(rng, pool);
    while (d2 === d1) d2 = pick(rng, pool);
    return orient(rng, { n: n, d: d1 }, { n: n, d: d2 }, "sameNum");
  }

  function genVersusHalf(rng) {
    const pool = [];
    DENOMS.forEach(function (d) {
      if (d === 2) return;
      for (let a = 1; a < d; a++) {
        if (a / d > 0.5) pool.push({ n: a, d: d });
      }
    });
    return orient(rng, pick(rng, pool), { n: 1, d: 2 }, "vsHalf");
  }

  /* Item types follow the order in which the content is taught: lessons 1-4
   * use shared-denominator and shared-numerator pairs, lessons 5-15 add the
   * greater-than-one-half comparison. Shared-numerator pairs begin with unit
   * fractions. */
  function fractionStream(lesson, seedOffset) {
    const rng = mulberry32(lesson * 7919 + 13 + (seedOffset || 0));
    const types =
      lesson <= 4 ? ["sameDen", "sameNum"] : ["sameDen", "sameNum", "vsHalf"];
    const recent = [];
    let produced = 0;
    let sameNumCount = 0;

    function generate() {
      const type = produced < types.length ? types[produced] : pick(rng, types);
      if (type === "sameDen") return genSameDenominator(rng);
      if (type === "vsHalf") return genVersusHalf(rng);
      const allowNonUnit = lesson >= 3 && sameNumCount > 0;
      return genSameNumerator(rng, allowNonUnit);
    }

    return {
      next: function () {
        let pair = generate();
        let guard = 0;
        while (recent.indexOf(pairKey(pair)) !== -1 && guard < 24) {
          pair = generate();
          guard += 1;
        }
        recent.push(pairKey(pair));
        if (recent.length > 8) recent.shift();
        if (pair.type === "sameNum") sameNumCount += 1;
        produced += 1;
        return pair;
      },
    };
  }

  return {
    multiplication: { stream: multiplicationStream, factorMax: factorMax },
    fraction: { stream: fractionStream },
  };
})();
