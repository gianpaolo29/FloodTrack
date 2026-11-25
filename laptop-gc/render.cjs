// Renders scene.html to output/laptop-gc.mp4 (1920x1080, 30fps, H.264) and output/laptop-gc.gif (960x540).
// Usage: node laptop-gc/render.cjs
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const root = path.resolve(__dirname, '..');
  const outDir = path.join(root, 'output');
  const framesDir = path.join(__dirname, '.frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.waitForFunction(() => window.__ready);
  await page.evaluate(() => document.fonts.ready);
  const { duration, fps } = await page.evaluate(() => window.CONFIG);
  const total = Math.round(duration * fps);
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.renderAt(t), i / fps);
    await page.screenshot({ path: path.join(framesDir, `f${String(i).padStart(4, '0')}.png`) });
  }
  await browser.close();

  const mp4 = path.join(outDir, 'laptop-gc.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(fps), '-i', path.join(framesDir, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mp4, '-vf',
    'fps=15,scale=960:540:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    path.join(outDir, 'laptop-gc.gif')], { stdio: 'inherit' });
  fs.rmSync(framesDir, { recursive: true, force: true });
  console.log('done', total, 'frames');
})();
