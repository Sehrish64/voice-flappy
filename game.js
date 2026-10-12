// Voice Flappy
// Shout mode: loud sound or spoken word = flap (Web Audio + Web Speech API)
// Pitch mode: your voice pitch moves the bird up and down (autocorrelation)
// Share: renders a score card PNG and shares/downloads it.

const $ = (id) => document.getElementById(id);
const canvas = $("game"), ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// ---------- Sound effects (generated, no files) ----------
let sfxCtx;
function tone(f1, f2, dur, type = "square", vol = 0.08, delay = 0) {
  if (!$("sfx").checked) return;
  sfxCtx = sfxCtx || new (window.AudioContext || window.webkitAudioContext)();
  const t = sfxCtx.currentTime + delay;
  const o = sfxCtx.createOscillator(), g = sfxCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxCtx.destination);
  o.start(t); o.stop(t + dur);
}
const sfx = {
  flap: () => tone(520, 780, 0.09),
  score: () => { tone(880, 880, 0.08, "sine", 0.1); tone(1320, 1320, 0.12, "sine", 0.1, 0.08); },
  die: () => tone(260, 50, 0.45, "sawtooth", 0.1),
};

// ---------- Game state ----------
const GRAVITY = 0.42, FLAP = -7.2, PIPE_W = 56, GAP = 150, SPEED = 2.2, PIPE_EVERY = 95;
let bird, pipes, score, best = 0, frame, state = "ready", overAt = 0; // ready | play | over
let mode = "shout", pitchTarget = null, pitchStamp = 0;

try { best = +localStorage.getItem("vf-best") || 0; } catch {}

function reset() {
  bird = { x: 80, y: H / 2, vy: 0, r: 13 };
  pipes = []; score = 0; frame = 0;
  $("shareRow").hidden = true; // hide share button when a new run starts
}
reset();

function startOrRetry() {
  if (state === "ready") state = "play";
  else if (state === "over" && Date.now() - overAt > 500) { reset(); state = "ready"; }
}

function flap() {
  if (state !== "play") { startOrRetry(); if (state !== "play") return; }
  if (mode === "shout") { bird.vy = FLAP; sfx.flap(); }
}

function die() {
  state = "over"; overAt = Date.now(); sfx.die();
  if (score > best) {
    best = score;
    try { localStorage.setItem("vf-best", best); } catch {}
  }
  $("shareRow").hidden = false; // game over -> offer the share card
}

function update() {
  if (state === "ready") { bird.y = H / 2 + Math.sin(Date.now() / 250) * 8; return; }
  if (state !== "play") return;

  const hasPitch = mode === "pitch" && pitchTarget !== null && Date.now() - pitchStamp < 150;
  if (hasPitch) {
    bird.y += (pitchTarget - bird.y) * 0.18;
    bird.vy = (pitchTarget - bird.y) * 0.18;
  } else {
    bird.vy += GRAVITY; bird.y += bird.vy;
  }
  frame++;

  if (frame % PIPE_EVERY === 1) {
    const top = 70 + Math.random() * (H - GAP - 140);
    pipes.push({ x: W, top, passed: false });
  }
  pipes.forEach((p) => {
    p.x -= SPEED;
    if (!p.passed && p.x + PIPE_W < bird.x) { p.passed = true; score++; sfx.score(); }
    const hitX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W;
    const hitY = bird.y - bird.r < p.top || bird.y + bird.r > p.top + GAP;
    if (hitX && hitY) die();
  });
  pipes = pipes.filter((p) => p.x > -PIPE_W);
  if (bird.y + bird.r > H - 40 || bird.y - bird.r < 0) die();
}

function draw() {
  ctx.fillStyle = "#6ec6ff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#4caf50";
  pipes.forEach((p) => {
    ctx.fillRect(p.x, 0, PIPE_W, p.top);
    ctx.fillRect(p.x, p.top + GAP, PIPE_W, H);
  });
  ctx.fillStyle = "#c8a46a"; ctx.fillRect(0, H - 40, W, 40);

  drawBird(ctx, bird.x, bird.y, bird.vy, bird.r);

  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#000"; ctx.lineWidth = 4; ctx.textAlign = "center";
  ctx.font = "bold 44px system-ui"; ctx.strokeText(score, W / 2, 70); ctx.fillText(score, W / 2, 70);
  ctx.font = "bold 20px system-ui";
  const call = mode === "pitch" ? "Sing or hum to start!" : "Shout to start!";
  if (state === "ready") { ctx.strokeText(call, W / 2, H / 2 - 60); ctx.fillText(call, W / 2, H / 2 - 60); }
  if (state === "over") {
    ctx.strokeText("Game over", W / 2, H / 2 - 20); ctx.fillText("Game over", W / 2, H / 2 - 20);
    const s = `Best: ${best}  ·  ${mode === "pitch" ? "hum" : "shout"} to retry`;
    ctx.font = "16px system-ui"; ctx.strokeText(s, W / 2, H / 2 + 12); ctx.fillText(s, W / 2, H / 2 + 12);
  }
}

// Bird drawn in code (reused by the game and the share card).
function drawBird(c, x, y, vy, r) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.max(-0.5, Math.min(1.1, vy / 10)));
  c.fillStyle = "#ffcc33"; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(5, -4, 4, 0, 7); c.fill();
  c.fillStyle = "#000"; c.beginPath(); c.arc(6, -4, 2, 0, 7); c.fill();
  c.fillStyle = "#ff7043"; c.fillRect(9, 1, 9, 5);
  c.restore();
}

// ---------- Fallback controls ----------
addEventListener("keydown", (e) => {
  if (e.code === "Space" || e.code === "ArrowUp") {
    e.preventDefault();
    if (mode === "pitch") startOrRetry(); else flap();
  }
});
canvas.addEventListener("pointerdown", () => (mode === "pitch" ? startOrRetry() : flap()));

// ---------- Mic ----------
const micBtn = $("micBtn"), level = $("level"), thresh = $("thresh"), sens = $("sens"),
      langSel = $("lang"), modeSel = $("mode"), rangeSel = $("range");
let analyser, buf, sampleRate = 48000, micOn = false, lastFlap = 0, armed = true;

function threshold() {
  if (mode === "pitch") return 0.02;            // voice present
  return 0.30 - (sens.value / 100) * 0.27;      // higher sensitivity = lower threshold
}
function drawThresh() { thresh.style.left = Math.min(100, threshold() * 250) + "%"; }
sens.oninput = drawThresh;

modeSel.onchange = () => {
  mode = modeSel.value;
  const pitch = mode === "pitch";
  $("sensRow").hidden = pitch; $("langRow").hidden = pitch; $("rangeRow").hidden = !pitch;
  $("pitchOut").hidden = !pitch;
  $("sub").innerHTML = pitch
    ? "Hum or sing: <b>high note = fly up</b>, <b>low note = go down</b>. Stay silent and you fall."
    : 'Shout, clap, or say <b>"up"</b> / <b>"oopar"</b> to flap. Keyboard and tap work too.';
  $("note").textContent = pitch
    ? "Pick your voice range so the bird covers the full screen. Use headphones if sound effects confuse it."
    : "Tip: loud sounds flap. Lower the sensitivity if it flaps by itself.";
  reset(); state = "ready"; drawThresh();
};
drawThresh();

async function enableMic() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } });
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    sampleRate = ac.sampleRate;
    analyser = ac.createAnalyser(); analyser.fftSize = 2048;
    ac.createMediaStreamSource(stream).connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    micOn = true; micBtn.textContent = "🎙️ Mic on"; micBtn.disabled = true;
    startSpeech(); pollMic();
  } catch (err) {
    $("note").textContent = "Microphone blocked: " + err.message + ". Keyboard and tap still work.";
  }
}

// Pitch detection by autocorrelation. Returns Hz or null.
// Raw-sum peak with 0.4 correlation gate: the un-normalized sum naturally favors
// the smallest lag, which kills octave errors on pure tones (verified: 110/165/
// 220/330/440 Hz synthetic sines and voice-like signals all read correctly,
// white noise rejected). 70-700 Hz covers the Low/Normal/High voice ranges.
function detectPitch(b, sr) {
  const n = b.length;
  let energy = 0;
  for (let i = 0; i < n; i++) energy += b[i] * b[i];
  if (Math.sqrt(energy / n) < 0.02) return null;

  const minLag = Math.floor(sr / 700), maxLag = Math.min(Math.floor(sr / 70), n >> 1);
  let bestLag = -1, bestCorr = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let i = 0; i < n - lag; i += 2) c += b[i] * b[i + lag];
    if (c > bestCorr) { bestCorr = c; bestLag = lag; }
  }
  // reject weak, noisy matches
  if (bestLag < 0 || bestCorr / (energy / 2) < 0.4) return null;
  return sr / bestLag;
}

function pollMic() {
  requestAnimationFrame(pollMic);
  analyser.getFloatTimeDomainData(buf);
  let sum = 0; for (const v of buf) sum += v * v;
  const rms = Math.sqrt(sum / buf.length);
  level.style.width = Math.min(100, rms * 250) + "%";

  if (mode === "pitch") {
    const hz = detectPitch(buf, sampleRate);
    if (hz) {
      const [lo, hi] = rangeSel.value.split(",").map(Number);
      const t = Math.max(0, Math.min(1, Math.log(hz / lo) / Math.log(hi / lo)));
      pitchTarget = (H - 60) - t * (H - 100);      // high pitch = top of screen
      pitchStamp = Date.now();
      $("pitchOut").textContent = `Pitch: ${Math.round(hz)} Hz`;
      if (state !== "play") startOrRetry();
    } else {
      $("pitchOut").textContent = "Pitch: (silent)";
    }
    return;
  }

  const t = threshold();
  if (rms > t && armed && Date.now() - lastFlap > 220) { flap(); lastFlap = Date.now(); armed = false; }
  if (rms < t * 0.6) armed = true; // one shout = one flap
}
micBtn.onclick = enableMic;

// ---------- Spoken words (shout mode) ----------
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const WORDS = /(\bup\b|\bjump\b|\bflap\b|\boopar\b|\bupar\b|\booper\b|اوپر)/gi;
let rec, seen = {};

function startSpeech() {
  if (!SR) return;
  rec = new SR();
  rec.continuous = true; rec.interimResults = true; rec.lang = langSel.value;
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const hits = (e.results[i][0].transcript.match(WORDS) || []).length;
      if (hits > (seen[i] || 0) && mode === "shout") { flap(); lastFlap = Date.now(); }
      seen[i] = hits;
    }
  };
  rec.onend = () => { seen = {}; if (micOn) try { rec.start(); } catch {} };
  rec.start();
}
langSel.onchange = () => { if (rec) { rec.lang = langSel.value; rec.stop(); } };

// ---------- Share score card ----------
// Renders a 1080x1080 PNG card (title, score, best, code-drawn bird, dark theme).
function drawShareCard() {
  const S = 1080;
  const c = document.createElement("canvas");
  c.width = S; c.height = S;
  const g = c.getContext("2d");

  g.fillStyle = "#0f1115"; g.fillRect(0, 0, S, S);
  // faint pipes silhouette
  g.fillStyle = "#1b2b1f";
  g.fillRect(120, 0, 150, 300); g.fillRect(120, 700, 150, 380);
  g.fillRect(810, 0, 150, 220); g.fillRect(810, 620, 150, 460);

  g.textAlign = "center";
  g.fillStyle = "#ffcc33"; g.font = "bold 84px system-ui";
  g.fillText("VOICE FLAPPY", S / 2, 180);

  drawBird(g, S / 2, 330, 0, 70);

  g.fillStyle = "#8b92a5"; g.font = "600 44px system-ui";
  g.fillText(mode === "pitch" ? "PITCH MODE" : "SHOUT MODE", S / 2, 500);

  g.fillStyle = "#ffcc33"; g.font = "bold 300px system-ui";
  g.fillText(String(score), S / 2, 800);

  g.fillStyle = "#e8eaf0"; g.font = "600 56px system-ui";
  g.fillText("BEST  " + best, S / 2, 900);

  g.fillStyle = "#8b92a5"; g.font = "40px system-ui";
  g.fillText("shout or sing to fly", S / 2, 990);

  return c;
}

$("shareBtn").onclick = async () => {
  const card = drawShareCard();
  const blob = await new Promise((r) => card.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "voice-flappy-score.png", { type: "image/png" });
  // Mobile: native share sheet with the image attached.
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Voice Flappy", text: `I scored ${score} in Voice Flappy!` });
      return;
    } catch (e) { if (e && e.name === "AbortError") return; /* fall through to download */ }
  }
  // Desktop / unsupported: download the PNG.
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "voice-flappy-score.png";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
};

// ---------- Game loop (starts last so all state above is initialized) ----------
(function loop() { update(); draw(); requestAnimationFrame(loop); })();
