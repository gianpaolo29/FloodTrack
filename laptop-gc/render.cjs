// Renders chat.html to output/laptop-gc.mp4 (1920x1080, 30fps, H.264) and output/laptop-gc.gif (960x540).
// Usage: node render.js            -> full render
//        node render.js --stills 1 4.6 13   -> PNG frames at those times (into output/stills)
const { chromium } = require("playwright");
const { spawn, execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

(async () => {
  const dir = __dirname, out = path.join(dir, "output");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(dir, "chat.html"));
  const { END, FPS } = await page.evaluate(() => window.ready);

  const si = process.argv.indexOf("--stills");
  if (si > 0) {
    fs.mkdirSync(path.join(out, "stills"), { recursive: true });
    for (const t of process.argv.slice(si + 1).map(Number)) {
      await page.evaluate(t => render(t), t);
      await page.screenshot({ path: path.join(out, "stills", `t${t.toFixed(2)}.png`) });
    }
    await browser.close(); return;
  }

  const mp4 = path.join(out, "laptop-gc.mp4");
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-movflags", "+faststart", mp4], { stdio: ["pipe", "inherit", "inherit"] });
  const frames = Math.round(END * FPS);
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => render(t), i / FPS);
    const buf = await page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`frame ${i}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
  await browser.close();

  const gif = path.join(out, "laptop-gc.gif");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", mp4, "-vf",
    "fps=15,scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle",
    gif]);
  console.log(`done: ${frames} frames, ${(frames / FPS).toFixed(2)}s -> ${mp4}, ${gif}`);
})();
