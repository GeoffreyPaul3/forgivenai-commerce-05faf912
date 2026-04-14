/**
 * Client-side video assembler: converts storyboard frames into a video with
 * zoom/pan effects, cinematic subtitle overlays, and optional TTS voiceover.
 */

export interface VideoFrame {
  imageUrl: string;
  scene: string;
  dialogue?: string;
  audioUrl?: string;
}

export interface AssemblyOptions {
  frameDuration?: number; // ms per frame, default 3500
  resolution?: 'sd' | 'hd' | '4k'; // 720p, 1080p, 4k
  format?: 'mp4' | 'webm';
  enableTTS?: boolean;
  showSubtitles?: boolean; // default true
  onProgress?: (pct: number) => void;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

/** Draw cinematic subtitle with rounded pill background and word wrap */
function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  h: number,
  opacity: number
) {
  if (!text || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  const fontSize = Math.round(w * 0.038);
  const lineHeight = fontSize * 1.4;
  const maxWidth = w * 0.85;
  const padding = { x: 24, y: 16 };

  ctx.font = `bold ${fontSize}px "SF Pro Display", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = "center";

  // Word-wrap
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const totalTextHeight = lines.length * lineHeight;
  const boxWidth = Math.min(
    maxWidth + padding.x * 2,
    Math.max(...lines.map((l) => ctx.measureText(l).width)) + padding.x * 2
  );
  const boxHeight = totalTextHeight + padding.y * 2;
  const boxX = (w - boxWidth) / 2;
  const boxY = h - boxHeight - (h * 0.06);

  // Frosted glass background
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  const radius = 16;
  ctx.beginPath();
  ctx.moveTo(boxX + radius, boxY);
  ctx.lineTo(boxX + boxWidth - radius, boxY);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
  ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
  ctx.lineTo(boxX + radius, boxY + boxHeight);
  ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
  ctx.lineTo(boxX, boxY + radius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
  ctx.closePath();
  ctx.fill();

  // Text with slight shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#ffffff";

  let textY = boxY + padding.y + fontSize;
  for (const line of lines) {
    ctx.fillText(line, w / 2, textY);
    textY += lineHeight;
  }

  ctx.restore();
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progress: number,
  subtitle: string,
  showSubtitles: boolean
) {
  // Ken Burns: zoom + slow pan
  const zoom = 1 + progress * 0.12;
  const panX = Math.sin(progress * Math.PI) * w * 0.02;
  const panY = Math.cos(progress * Math.PI * 0.5) * h * 0.01;

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2 + panX, h / 2 + panY);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -h / 2);

  // Cover-fit the image
  const imgAspect = img.width / img.height;
  const canvasAspect = w / h;
  let dw: number, dh: number, dx: number, dy: number;
  if (imgAspect > canvasAspect) {
    dh = h;
    dw = h * imgAspect;
    dx = (w - dw) / 2;
    dy = 0;
  } else {
    dw = w;
    dh = w / imgAspect;
    dx = 0;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();

  // Subtitle with fade in/out
  if (showSubtitles && subtitle) {
    let subtitleOpacity = 1;
    if (progress < 0.1) subtitleOpacity = progress / 0.1; // fade in
    else if (progress > 0.85) subtitleOpacity = (1 - progress) / 0.15; // fade out
    drawSubtitle(ctx, subtitle, w, h, Math.max(0, Math.min(1, subtitleOpacity)));
  }
}

/** Speak text using browser TTS or play audio URL */
function playAudio(text: string, audioUrl?: string): Promise<void> {
  return new Promise((resolve) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
      return;
    }

    if (!("speechSynthesis" in window) || !text) {
      resolve();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export async function assembleVideo(
  frames: VideoFrame[],
  options: AssemblyOptions = {}
): Promise<Blob> {
  const {
    frameDuration = 3500,
    resolution = 'hd',
    format = 'mp4',
    enableTTS = false,
    showSubtitles = true,
    onProgress,
  } = options;

  // Resolution mapping (Vertical 9:16)
  const resMap = {
    sd: { w: 720, h: 1280, bitrate: 2500000 },
    hd: { w: 1080, h: 1920, bitrate: 8000000 },
    '4k': { w: 2160, h: 3840, bitrate: 30000000 }
  };
  const { w: width, h: height, bitrate } = resMap[resolution];

  const images = await Promise.all(frames.map((f) => loadImage(f.imageUrl)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Determine MIME type based on requested format and browser support
  let mimeType = "video/webm;codecs=vp9";
  if (format === 'mp4') {
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }
  } else {
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = "video/webm";
    }
  }

  const stream = canvas.captureStream(30);

  const recorder = new MediaRecorder(stream, { 
    mimeType,
    videoBitsPerSecond: bitrate
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const type = mimeType.includes("mp4") ? "video/mp4" : "video/webm";
      resolve(new Blob(chunks, { type }));
    };
    recorder.onerror = () => reject(new Error("MediaRecorder error"));
    recorder.start(100);

    const totalDuration = frames.length * frameDuration;
    const startTime = performance.now();
    const ttsStarted = new Set<number>();

    function animate() {
      const elapsed = performance.now() - startTime;
      const currentFrameIdx = Math.min(
        Math.floor(elapsed / frameDuration),
        images.length - 1
      );

      if (elapsed >= totalDuration) {
        setTimeout(() => recorder.stop(), 200);
        onProgress?.(100);
        return;
      }

      const frameProgress = (elapsed % frameDuration) / frameDuration;
      const frame = frames[currentFrameIdx];
      const img = images[currentFrameIdx];

      drawFrame(
        ctx,
        img,
        width,
        height,
        frameProgress,
        frame.dialogue || frame.scene,
        showSubtitles
      );

      if (enableTTS && !ttsStarted.has(currentFrameIdx) && (frame.dialogue || frame.audioUrl)) {
        ttsStarted.add(currentFrameIdx);
        playAudio(frame.dialogue || "", frame.audioUrl);
      }

      onProgress?.(Math.round((elapsed / totalDuration) * 100));
      requestAnimationFrame(animate);
    }

    animate();
  });
}
