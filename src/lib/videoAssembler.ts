/**
 * Client-side video assembler: converts storyboard frames into a video with
 * zoom/pan effects, cinematic subtitle overlays, and optional TTS voiceover.
 */

export interface VideoFrame {
  imageUrl: string;
  scene: string;
  dialogue?: string;
}

export interface AssemblyOptions {
  frameDuration?: number; // ms per frame, default 3500
  width?: number; // default 720
  height?: number; // default 1280
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
  const boxY = h - boxHeight - 60;

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

/** Speak text using browser TTS */
function speak(text: string): Promise<void> {
  return new Promise((resolve) => {
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
    width = 720,
    height = 1280,
    enableTTS = false,
    showSubtitles = true,
    onProgress,
  } = options;

  const images = await Promise.all(frames.map((f) => loadImage(f.imageUrl)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const stream = canvas.captureStream(30);

  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  if (enableTTS && "speechSynthesis" in window) {
    try {
      const audioCtx = new AudioContext();
      audioDestination = audioCtx.createMediaStreamDestination();
      audioDestination.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      // TTS audio capture not supported
    }
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      resolve(new Blob(chunks, { type: "video/webm" }));
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

      if (enableTTS && !ttsStarted.has(currentFrameIdx) && frame.dialogue) {
        ttsStarted.add(currentFrameIdx);
        speak(frame.dialogue);
      }

      onProgress?.(Math.round((elapsed / totalDuration) * 100));
      requestAnimationFrame(animate);
    }

    animate();
  });
}
