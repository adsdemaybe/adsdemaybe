// Draws the profile header as a SuperCHIP-style pixel display (128x32 slice).
// Pixels "boot" onto the screen left-to-right like sprites being drawn.
// Run: node scripts/header.js  (GITHUB_TOKEN optional, used for the stats line)

const fs = require("fs");
const path = require("path");

const USER = "adsdemaybe";
const W = 128, H = 32, PX = 7, PAD = 20;

// 5x7 font for the name
const BIG = {
  A: ["01110","10001","10001","11111","10001","10001","10001"],
  C: ["01110","10001","10000","10000","10000","10001","01110"],
  D: ["11110","10001","10001","10001","10001","10001","11110"],
  E: ["11111","10000","10000","11110","10000","10000","11111"],
  H: ["10001","10001","10001","11111","10001","10001","10001"],
  I: ["01110","00100","00100","00100","00100","00100","01110"],
  M: ["10001","11011","10101","10101","10001","10001","10001"],
  T: ["11111","00100","00100","00100","00100","00100","00100"],
  V: ["10001","10001","10001","10001","10001","01010","00100"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

// 3x5 font for everything else
const SMALL = {
  A: ["010","101","111","101","101"], B: ["110","101","110","101","110"],
  C: ["011","100","100","100","011"], D: ["110","101","101","101","110"],
  E: ["111","100","110","100","111"], F: ["111","100","110","100","100"],
  G: ["011","100","101","101","011"], H: ["101","101","111","101","101"],
  I: ["111","010","010","010","111"], J: ["001","001","001","101","010"],
  K: ["101","101","110","101","101"], L: ["100","100","100","100","111"],
  M: ["101","111","111","101","101"], N: ["110","101","101","101","101"],
  O: ["010","101","101","101","010"], P: ["110","101","110","100","100"],
  Q: ["010","101","101","110","011"], R: ["110","101","110","101","101"],
  S: ["011","100","010","001","110"], T: ["111","010","010","010","010"],
  U: ["101","101","101","101","111"], V: ["101","101","101","101","010"],
  W: ["101","101","111","111","101"], X: ["101","101","010","101","101"],
  Y: ["101","101","010","010","010"], Z: ["111","001","010","100","111"],
  0: ["111","101","101","101","111"], 1: ["010","110","010","010","111"],
  2: ["110","001","010","100","111"], 3: ["110","001","010","001","110"],
  4: ["101","101","111","001","001"], 5: ["111","100","110","001","110"],
  6: ["011","100","111","101","111"], 7: ["111","001","010","010","010"],
  8: ["111","101","111","101","111"], 9: ["111","101","111","001","110"],
  " ": ["000","000","000","000","000"], "/": ["001","001","010","100","100"],
  ".": ["000","000","000","000","010"], "-": ["000","000","111","000","000"],
  ":": ["000","010","000","010","000"], ">": ["100","010","001","010","100"],
};

// returns [{x, y}] of lit pixels for a string at (x0, y0)
function draw(text, font, x0, y0) {
  const out = [];
  let x = x0;
  for (const ch of text.toUpperCase()) {
    const glyph = font[ch] || font[" "];
    glyph.forEach((row, dy) => {
      [...row].forEach((bit, dx) => { if (bit === "1") out.push({ x: x + dx, y: y0 + dy }); });
    });
    x += glyph[0].length + 1;
  }
  return { pixels: out, end: x };
}

async function stats() {
  const headers = { "User-Agent": USER };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  try {
    const res = await fetch(`https://api.github.com/users/${USER}/repos?per_page=100&type=owner`, { headers });
    if (!res.ok) throw new Error(res.status);
    const repos = (await res.json()).filter((r) => !r.fork);
    const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);
    return { repos: repos.length, stars };
  } catch {
    return null;
  }
}

(async () => {
  const s = await stats();

  // each line: pixels + when it starts drawing (seconds)
  const lines = [
    { ...draw("> LOAD ADVAITH.CH8", SMALL, 3, 2), t: 0.2 },
    { ...draw("ADVAITH VECHAM", BIG, 3, 10), t: 1.2 },
    { ...draw("CS UW  RUST  CUDA  ROBOTS", SMALL, 3, 20), t: 2.4 },
    {
      ...draw(s ? `REPOS ${s.repos}  STARS ${s.stars}  SEATTLE` : "SEATTLE WA", SMALL, 3, 26),
      t: 3.2,
    },
  ];

  const rects = [];
  for (const line of lines) {
    const span = line.end - 3;
    for (const p of line.pixels) {
      const delay = (line.t + ((p.x - 3) / span) * 0.8).toFixed(2);
      rects.push(`<rect x="${p.x * PX}" y="${p.y * PX}" width="${PX}" height="${PX}" style="animation-delay:${delay}s"/>`);
    }
  }
  const cursorX = lines[3].end + 1;

  const vw = W * PX + PAD * 2, vh = H * PX + PAD * 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}">
<style>
  .on rect { fill: #ffb000; opacity: 0; animation: lit .12s steps(1) forwards; }
  .cursor { fill: #ffb000; opacity: 0; animation: blink 1s steps(1) 4.1s infinite; }
  .scan { animation: scan 6s linear infinite; }
  @keyframes lit { to { opacity: 1; } }
  @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes scan { from { transform: translateY(-40px); } to { transform: translateY(${H * PX + 40}px); } }
</style>
<defs>
  <pattern id="grid" width="${PX}" height="${PX}" patternUnits="userSpaceOnUse">
    <rect width="${PX}" height="${PX}" fill="#140d02"/>
    <rect x="1" y="1" width="${PX - 2}" height="${PX - 2}" fill="#1c1305"/>
  </pattern>
  <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffb000" stop-opacity="0"/>
    <stop offset=".5" stop-color="#ffb000" stop-opacity=".07"/>
    <stop offset="1" stop-color="#ffb000" stop-opacity="0"/>
  </linearGradient>
  <filter id="glow"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="screen"><rect width="${W * PX}" height="${H * PX}" rx="6"/></clipPath>
</defs>
<rect width="${vw}" height="${vh}" rx="14" fill="#0b0803"/>
<g transform="translate(${PAD} ${PAD})" clip-path="url(#screen)">
  <rect width="${W * PX}" height="${H * PX}" fill="url(#grid)"/>
  <g class="on" filter="url(#glow)">
${rects.join("\n")}
  </g>
  <rect class="cursor" x="${cursorX * PX}" y="${26 * PX}" width="${3 * PX}" height="${5 * PX}"/>
  <rect class="scan" width="${W * PX}" height="40" fill="url(#beam)"/>
</g>
</svg>
`;

  const out = path.join(__dirname, "..", "assets", "header.svg");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, svg);
  console.log(`wrote ${out} (${rects.length} pixels)`);
})();
