// Lumen Breaker — level layouts. Each level is a grid of characters; every
// character is one brick slot. '.' is empty. The grid is centered on the field.
//   1 plain (1 hit)   2 tough (2 hits)   3 gold (3 hits)
//   S steel (never breaks)   B bonus (drops a power-up)

export const LEVELS = [
  {
    name: 'First Light',
    rows: [
      '..........',
      '.11111111.',
      '.11111111.',
      '..222222..',
      '..........',
      '..........',
    ],
  },
  {
    name: 'Twin Arches',
    rows: [
      '..........',
      '.11.22.11.',
      '.111222111',
      '..1B11B1..',
      '...1111...',
      '..........',
    ],
  },
  {
    name: 'The Vault',
    rows: [
      '..........',
      '.S111111S.',
      '.12222221.',
      '.1B3333B1.',
      '..222222..',
      '...1111...',
    ],
  },
  {
    name: 'Prism Storm',
    rows: [
      '..........',
      '1233333321',
      '2B111111B2',
      '.S222222S.',
      '..1333331.',
      '...2..2...',
    ],
  },
  {
    name: 'Heart of Lumen',
    rows: [
      '..........',
      '.S333333S.',
      '.32222223.',
      '.2B1111B2.',
      '..1333331.',
      '...S33S...',
    ],
  },
];

const CHAR_TO_KIND = { 1: 'plain', 2: 'tough', 3: 'gold', S: 'steel', B: 'bonus' };

// Turn a level's rows into a list of brick descriptors with pixel positions.
export function buildBricks(levelIndex, field) {
  const level = LEVELS[levelIndex];
  const cols = 10;
  const gap = 6;
  const bw = (field.w - gap * (cols + 1)) / cols;
  const bh = 26;
  const top = 92;
  const bricks = [];
  level.rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const kind = CHAR_TO_KIND[ch];
      if (!kind) continue;
      bricks.push({
        kind,
        x: field.x + gap + c * (bw + gap),
        y: top + r * (bh + gap),
        w: bw,
        h: bh,
        hp: kind === 'steel' ? Infinity : kind === 'tough' ? 2 : kind === 'gold' ? 3 : 1,
        maxHp: kind === 'steel' ? 1 : kind === 'tough' ? 2 : kind === 'gold' ? 3 : 1,
        flash: 0,
      });
    }
  });
  return bricks;
}

// How many bricks in this level can actually be broken (steel does not count).
export function breakableCount(bricks) {
  return bricks.filter((b) => b.kind !== 'steel').length;
}
