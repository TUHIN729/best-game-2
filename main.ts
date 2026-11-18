// Lumen Breaker — the entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ (the playable game,
// plain static files a desktop browser loads offline) and screenshots/ (the
// real renders of the game) into the output directory, then writes
// dossier.json there with the vendored make.fun library, so the judge can
// read the entry. The grader runs this program in a fresh container with a
// read-only repository and a writable /output; outside the grader,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Serve the game locally first with any static server, e.g. a plain
// python http server rooted at game/, then open it and play it.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The dossier caps are the scorer's own (reference/gate.json): the text cap
// shapes the dossier bytes; the others refuse an entry the scorer would
// refuse, so a bad entry fails here, loudly, instead of silently later.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  throw new Error(`Lumen Breaker entry: ${message}`);
}

function checkTree(root, label) {
  if (!existsSync(root)) fail(`missing ${label} directory at ${root}`);
  if (!statSync(root).isDirectory()) fail(`${label} at ${root} is not a directory`);
}

function checkShots(dir) {
  const names = readdirSync(dir)
    .filter((n) => !n.startsWith('.'))
    .sort();
  if (names.length < 3 || names.length > 4) {
    fail(`screenshots/ must hold 3 or 4 images, found ${names.length}`);
  }
  for (const name of names) {
    const file = join(dir, name);
    if (!statSync(file).isFile()) fail(`screenshot ${name} is not a regular file`);
    if (statSync(file).size > 262144) fail(`screenshot ${name} is over 256 KiB`);
    if (!/\.(png|jpe?g)$/i.test(name)) fail(`screenshot ${name} is not a PNG or JPEG`);
  }
  return names;
}

function main() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');

  checkTree(gameDir, 'game');
  checkTree(shotsDir, 'screenshots');
  const shotNames = checkShots(shotsDir);

  mkdirSync(outDir, { recursive: true });
  cpSync(gameDir, join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  console.log(
    `Lumen Breaker handed in: ${shotNames.length} screenshots, ` +
      `${dossier.length} dossier bytes -> ${outDir}`,
  );
}

main();
