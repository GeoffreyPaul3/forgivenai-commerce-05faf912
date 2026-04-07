/**
 * Client-side video assembler: converts storyboard frames into a video with
 * zoom/pan effects and optional TTS voiceover using browser APIs.
 */

export interface VideoFrame {
  imageUrl: string;
  scene: string;
  dialogue?: string;
}

export interface AssemblyOptions {
  frameDuration?: number; // ms per frame, default 3000
  width?: number; // default 720
  height?: number; // default 1280
  enableTTS?: boolean;
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

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  progress: number,
  text: string
) {
  const zoom = 1 + progress * 0.15;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
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

  // Text overlay
  if (text) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, h - 130, w, 130);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    const words = text.split(" ");
    let line = "";
    let y = h - 95;
    for (const word of words) {
      const test = line + word + " ";
      if (ctx.measureText(test).width > w - 50) {
        ctx.fillText(line.trim(), w / 2, y);
        line = word + " ";
        y += 28;
      } else {
        line = test;
      }
    }
    ctx.fillText(line.trim(), w / 2, y);
  }
}

/** Speak text using browser TTS, returns a promise that resolves when done */
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
  const { frameDuration = 3500, width = 720, height = 1280, enableTTS = false, onProgress } = options;

  // Load all images in parallel
  const images = await Promise.all(frames.map((f) => loadImage(f.imageUrl)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Determine supported mimeType
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const stream = canvas.captureStream(30);

  // If TTS enabled, create audio context and destination
  let audioDestination: MediaStreamAudioDestinationNode | null = null;
  if (enableTTS && "speechSynthesis" in window) {
    try {
      const audioCtx = new AudioContext();
      audioDestination = audioCtx.createMediaStreamDestination();
      // Add audio track to stream
      audioDestination.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      // TTS audio capture not supported, continue without
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
    recorder.start(100); // collect data every 100ms

    const totalDuration = frames.length * frameDuration;
    const startTime = performance.now();
    let ttsStarted = new Set<number>();

    function animate() {
      const elapsed = performance.now() - startTime;
      const currentFrameIdx = Math.min(Math.floor(elapsed / frameDuration), images.length - 1);

      if (elapsed >= totalDuration) {
        // Final frame rendered, stop
        setTimeout(() => recorder.stop(), 200);
        onProgress?.(100);
        return;
      }

      const frameProgress = (elapsed % frameDuration) / frameDuration;
      const frame = frames[currentFrameIdx];
      const img = images[currentFrameIdx];

      drawFrame(ctx, img, width, height, frameProgress, frame.dialogue || frame.scene);

      // TTS for each frame (once)
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
