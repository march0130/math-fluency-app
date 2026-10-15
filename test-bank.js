/* Fixed item bank for the pre/post tests.
 *
 * Nothing here is random at run time. Edit this file to change the test, and
 * keep the old version if any data has already been collected with it.
 *
 * MEMORY TEST — an adaptive span test that looks for the highest span passed.
 *
 *   Every student starts at span 2 and does at most 6 sets at each span.
 *   Recalling `passAt` sets correctly at a span — in any order, not
 *   necessarily in a row — passes it and moves up one; recalling `failAt`
 *   incorrectly at a span ends the part. 4 right or 3 wrong is always reached
 *   within 6 sets, so every span is decided. Each span has its own ordered
 *   list of sets, and the m-th set a student meets at span k is always
 *   `levels[k].sets[m]`, so every student at the same level sees the same
 *   items.
 *
 *   Multiplication — pass at 4 right, stop at 3 wrong, 6 sets per span (2–6).
 *     Item: [a, b, [four answer choices]]. Facts from 2×2 to 9×9.
 *     Easy ≤ 20, medium 21–40, hard > 40. Every set at a span has the same mix:
 *       span 2  easy + medium
 *       span 3  easy + medium + hard
 *       span 4  1 hard, plus easy/medium (EEMH or EMMH)
 *       span 5  2 easy + 2 medium + 1 hard
 *       span 6  2 easy + 2 medium + 2 hard
 *     No set opens on a hard fact, answers within a set are at least 2 apart,
 *     and no fact appears twice within a span.
 *
 *   Fraction comparison — pass at 4 right, stop at 3 wrong, 6 sets per span
 *   (2–6).
 *     Item: [type, left, right]; the student picks the larger.
 *     Easy: same denominator up to sixths, or unit fractions up to eighths.
 *     Medium: larger denominators, non-unit numerators, or compared with ½ up
 *     to sixths. Hard: compared with ½, eighths and above. Same mixes per span
 *     as multiplication. Span 2 never compares with ½; no set is more than
 *     half comparisons with ½; no fraction appears twice in a set (bar ½ as
 *     the benchmark); no pair appears twice within a span; the larger fraction
 *     is on the left in exactly half the pairs of every span.
 *     Denominators: 2, 3, 4, 5, 6, 8, 10, 12.
 *
 * NUMBER LINE TEST
 *   10 proper fractions on a 0–1 line, then 10 proper and improper fractions
 *   (4 proper, 6 improper) on a 0–2 line, in the order listed.
 */

const TEST_BANK = {
  multiplication: {
    passAt: 4,
    failAt: 3,
    practice: [
      [[2, 3, [7, 9, 6, 8]], [5, 2, [15, 9, 10, 12]]],
      [[3, 3, [12, 7, 8, 9]], [2, 4, [10, 8, 6, 9]]],
    ],
    levels: [
      {
        span: 2,
        sets: [
          [[2, 2, [2, 6, 4, 3]], [3, 7, [20, 23, 10, 21]]],
          [[9, 2, [27, 20, 18, 19]], [8, 5, [39, 41, 40, 32]]],
          [[6, 6, [38, 42, 35, 36]], [4, 5, [25, 18, 20, 15]]],
          [[9, 4, [45, 13, 36, 38]], [3, 5, [13, 15, 10, 12]]],
          [[4, 6, [26, 18, 24, 30]], [2, 9, [18, 17, 16, 20]]],
          [[4, 7, [21, 32, 35, 28]], [3, 6, [21, 19, 18, 15]]],
        ],
      },
      {
        span: 3,
        sets: [
          [[6, 2, [14, 18, 12, 10]], [7, 9, [63, 70, 65, 16]], [4, 8, [32, 30, 31, 28]]],
          [[5, 3, [16, 15, 14, 12]], [6, 9, [54, 52, 48, 45]], [7, 5, [35, 36, 30, 28]]],
          [[8, 2, [18, 16, 17, 14]], [6, 7, [49, 42, 36, 13]], [8, 4, [24, 32, 30, 31]]],
          [[5, 6, [29, 28, 25, 30]], [7, 8, [57, 55, 56, 58]], [3, 2, [4, 9, 7, 6]]],
          [[2, 7, [21, 14, 12, 16]], [4, 9, [27, 32, 36, 45]], [6, 8, [49, 48, 14, 50]]],
          [[3, 4, [12, 15, 7, 9]], [9, 9, [90, 72, 18, 81]], [7, 3, [14, 20, 22, 21]]],
        ],
      },
      {
        span: 4,
        sets: [
          [[9, 4, [45, 13, 36, 38]], [2, 6, [10, 18, 6, 12]], [8, 7, [64, 57, 58, 56]], [3, 9, [29, 27, 24, 36]]],
          [[5, 8, [40, 41, 45, 38]], [9, 6, [63, 54, 56, 15]], [2, 5, [10, 12, 11, 9]], [6, 3, [18, 17, 24, 21]]],
          [[4, 9, [27, 32, 36, 45]], [8, 3, [27, 26, 24, 22]], [2, 9, [18, 17, 16, 20]], [6, 8, [49, 48, 14, 50]]],
          [[4, 2, [8, 9, 4, 6]], [4, 4, [18, 14, 8, 16]], [9, 3, [12, 27, 28, 24]], [7, 6, [41, 35, 40, 42]]],
          [[7, 4, [35, 28, 24, 26]], [2, 8, [14, 16, 10, 8]], [5, 9, [43, 40, 45, 47]], [3, 8, [32, 22, 24, 16]]],
          [[5, 4, [18, 20, 16, 25]], [9, 8, [73, 72, 74, 63]], [6, 4, [20, 25, 28, 24]], [4, 3, [16, 8, 10, 12]]],
        ],
      },
      {
        span: 5,
        sets: [
          [[2, 7, [21, 14, 12, 16]], [3, 8, [32, 22, 24, 16]], [5, 4, [18, 20, 16, 25]], [9, 3, [12, 27, 28, 24]], [7, 7, [56, 49, 48, 42]]],
          [[5, 7, [35, 42, 33, 37]], [3, 4, [12, 15, 7, 9]], [9, 5, [14, 45, 36, 46]], [4, 7, [21, 32, 35, 28]], [2, 8, [14, 16, 10, 8]]],
          [[3, 5, [13, 15, 10, 12]], [4, 2, [8, 9, 4, 6]], [8, 9, [72, 80, 74, 64]], [4, 6, [26, 18, 24, 30]], [7, 3, [14, 20, 22, 21]]],
          [[6, 4, [20, 25, 28, 24]], [6, 5, [11, 30, 25, 31]], [9, 8, [73, 72, 74, 63]], [3, 2, [4, 9, 7, 6]], [4, 4, [18, 14, 8, 16]]],
          [[4, 3, [16, 8, 10, 12]], [5, 5, [25, 26, 30, 20]], [7, 4, [35, 28, 24, 26]], [3, 6, [21, 19, 18, 15]], [5, 9, [43, 40, 45, 47]]],
          [[7, 2, [9, 14, 21, 16]], [5, 6, [29, 28, 25, 30]], [8, 4, [24, 32, 30, 31]], [7, 6, [41, 35, 40, 42]], [2, 2, [2, 6, 4, 3]]],
        ],
      },
      {
        span: 6,
        sets: [
          [[5, 5, [25, 26, 30, 20]], [7, 6, [41, 35, 40, 42]], [8, 8, [64, 16, 72, 66]], [7, 4, [35, 28, 24, 26]], [3, 6, [21, 19, 18, 15]], [7, 2, [9, 14, 21, 16]]],
          [[6, 5, [11, 30, 25, 31]], [3, 2, [4, 9, 7, 6]], [4, 4, [18, 14, 8, 16]], [9, 7, [62, 72, 63, 16]], [8, 6, [47, 48, 14, 49]], [6, 4, [20, 25, 28, 24]]],
          [[5, 6, [29, 28, 25, 30]], [9, 8, [73, 72, 74, 63]], [4, 3, [16, 8, 10, 12]], [8, 5, [39, 41, 40, 32]], [9, 9, [90, 72, 18, 81]], [5, 4, [18, 20, 16, 25]]],
          [[8, 3, [27, 26, 24, 22]], [5, 9, [43, 40, 45, 47]], [7, 8, [57, 55, 56, 58]], [9, 3, [12, 27, 28, 24]], [2, 2, [2, 6, 4, 3]], [6, 3, [18, 17, 24, 21]]],
          [[3, 5, [13, 15, 10, 12]], [7, 9, [63, 70, 65, 16]], [4, 8, [32, 30, 31, 28]], [3, 9, [29, 27, 24, 36]], [2, 5, [10, 12, 11, 9]], [9, 6, [63, 54, 56, 15]]],
          [[4, 7, [21, 32, 35, 28]], [9, 2, [27, 20, 18, 19]], [6, 6, [38, 42, 35, 36]], [8, 7, [64, 57, 58, 56]], [2, 6, [10, 18, 6, 12]], [8, 9, [72, 80, 74, 64]]],
        ],
      },
    ],
  },

  fraction: {
    passAt: 4,
    failAt: 3,
    practice: [
      [["sameDen", "1/4", "3/4"], ["sameNum", "1/3", "1/6"]],
      [["sameDen", "2/5", "1/5"], ["sameNum", "1/4", "1/2"]],
    ],
    levels: [
      {
        span: 2,
        sets: [
          [["sameNum", "1/2", "1/3"], ["sameDen", "7/8", "6/8"]],
          [["sameDen", "5/6", "1/6"], ["sameNum", "2/12", "2/3"]],
          [["sameDen", "1/6", "2/6"], ["sameDen", "4/10", "7/10"]],
          [["sameDen", "9/10", "7/10"], ["sameNum", "1/3", "1/5"]],
          [["sameDen", "1/5", "3/5"], ["sameNum", "2/3", "2/10"]],
          [["sameNum", "1/4", "1/3"], ["sameDen", "2/12", "10/12"]],
        ],
      },
      {
        span: 3,
        sets: [
          [["sameNum", "1/5", "1/10"], ["sameDen", "2/3", "1/3"], ["vsHalf", "10/12", "1/2"]],
          [["sameDen", "3/12", "5/12"], ["vsHalf", "1/2", "9/10"], ["sameNum", "1/8", "1/6"]],
          [["sameDen", "3/4", "2/4"], ["sameNum", "2/5", "2/3"], ["vsHalf", "1/2", "7/10"]],
          [["sameDen", "2/6", "5/6"], ["sameNum", "1/4", "1/12"], ["vsHalf", "1/2", "6/8"]],
          [["sameNum", "2/6", "2/10"], ["vsHalf", "1/2", "5/8"], ["sameNum", "1/5", "1/8"]],
          [["sameDen", "11/12", "6/12"], ["vsHalf", "7/8", "1/2"], ["sameNum", "1/6", "1/4"]],
        ],
      },
      {
        span: 4,
        sets: [
          [["sameNum", "1/4", "1/3"], ["vsHalf", "8/10", "1/2"], ["vsHalf", "1/2", "4/6"], ["sameDen", "2/8", "3/8"]],
          [["vsHalf", "4/5", "1/2"], ["sameDen", "2/6", "5/6"], ["sameNum", "1/5", "1/3"], ["vsHalf", "6/8", "1/2"]],
          [["vsHalf", "1/2", "5/6"], ["vsHalf", "1/2", "6/10"], ["sameNum", "1/3", "1/8"], ["sameDen", "7/12", "3/12"]],
          [["sameDen", "2/5", "4/5"], ["vsHalf", "9/12", "1/2"], ["sameNum", "1/5", "1/4"], ["vsHalf", "1/2", "3/5"]],
          [["sameNum", "1/3", "1/10"], ["sameDen", "1/8", "3/8"], ["vsHalf", "11/12", "1/2"], ["sameNum", "1/5", "1/6"]],
          [["sameDen", "5/6", "3/6"], ["sameNum", "1/8", "1/4"], ["vsHalf", "8/12", "1/2"], ["vsHalf", "3/4", "1/2"]],
        ],
      },
      {
        span: 5,
        sets: [
          [["sameDen", "4/6", "1/6"], ["vsHalf", "7/8", "1/2"], ["sameDen", "8/12", "10/12"], ["sameNum", "1/3", "1/10"], ["sameNum", "1/4", "1/8"]],
          [["sameDen", "4/5", "3/5"], ["vsHalf", "1/2", "5/6"], ["sameNum", "2/6", "2/5"], ["vsHalf", "1/2", "8/12"], ["sameDen", "3/4", "2/4"]],
          [["sameNum", "2/12", "2/10"], ["sameDen", "7/8", "3/8"], ["sameNum", "1/6", "1/4"], ["sameNum", "1/3", "1/8"], ["vsHalf", "1/2", "7/12"]],
          [["sameDen", "4/6", "3/6"], ["vsHalf", "1/2", "9/12"], ["sameDen", "1/8", "2/8"], ["vsHalf", "1/2", "3/5"], ["sameDen", "4/5", "1/5"]],
          [["sameDen", "4/6", "5/6"], ["sameNum", "2/10", "2/5"], ["vsHalf", "5/8", "1/2"], ["sameNum", "1/5", "1/8"], ["vsHalf", "1/2", "2/3"]],
          [["vsHalf", "1/2", "3/4"], ["vsHalf", "6/10", "1/2"], ["sameNum", "2/5", "2/12"], ["sameNum", "1/4", "1/5"], ["sameDen", "2/6", "4/6"]],
        ],
      },
      {
        span: 6,
        sets: [
          [["vsHalf", "1/2", "3/5"], ["sameNum", "1/3", "1/8"], ["vsHalf", "7/12", "1/2"], ["sameDen", "3/8", "7/8"], ["vsHalf", "1/2", "9/12"], ["sameDen", "4/6", "3/6"]],
          [["vsHalf", "2/3", "1/2"], ["sameNum", "1/5", "1/8"], ["vsHalf", "1/2", "11/12"], ["sameNum", "1/6", "1/4"], ["sameDen", "4/12", "2/12"], ["vsHalf", "1/2", "7/10"]],
          [["sameNum", "1/4", "1/5"], ["vsHalf", "5/8", "1/2"], ["sameDen", "1/10", "4/10"], ["sameDen", "2/5", "3/5"], ["vsHalf", "6/8", "1/2"], ["sameDen", "2/12", "5/12"]],
          [["sameDen", "1/5", "3/5"], ["vsHalf", "1/2", "9/10"], ["vsHalf", "7/8", "1/2"], ["sameDen", "4/12", "5/12"], ["sameNum", "1/3", "1/4"], ["sameNum", "1/10", "1/6"]],
          [["sameNum", "3/5", "3/6"], ["sameDen", "2/6", "4/6"], ["sameNum", "3/10", "3/12"], ["vsHalf", "10/12", "1/2"], ["vsHalf", "8/10", "1/2"], ["sameDen", "2/4", "3/4"]],
          [["vsHalf", "1/2", "3/4"], ["vsHalf", "6/10", "1/2"], ["vsHalf", "1/2", "8/12"], ["sameDen", "7/10", "3/10"], ["sameDen", "2/6", "1/6"], ["sameNum", "1/8", "1/4"]],
        ],
      },
    ],
  },

  numberLine: [
    {
      key: "0-1",
      max: 1,
      items: ["1/3", "3/4", "1/5", "5/8", "1/12", "5/6", "2/5", "9/10", "1/4", "2/3"],
    },
    {
      key: "0-2",
      max: 2,
      items: ["4/3", "3/8", "7/4", "11/12", "1/6", "8/5", "7/10", "19/10", "7/6", "3/2"],
    },
  ],
};
