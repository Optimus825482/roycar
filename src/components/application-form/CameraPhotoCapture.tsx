"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Camera,
  RotateCcw,
  Check,
  Crop,
  Sparkles,
  ZoomIn,
  ZoomOut,
  X,
  FlipHorizontal,
} from "lucide-react";

// ─── Types ───

interface CameraPhotoCaptureProps {
  onPhotoReady: (file: File) => void;
  existingPreview?: string | null;
}

type CaptureStep = "idle" | "camera" | "preview" | "crop";

// ─── Helpers ───

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.crossOrigin = "anonymous";
    img.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return canvas.toDataURL("image/jpeg", 0.92);
}

async function blurBackground(imageSrc: string): Promise<string> {
  const image = await createImage(imageSrc);
  const w = image.width;
  const h = image.height;

  // Canvas 1: Blurred full image
  const blurCanvas = document.createElement("canvas");
  blurCanvas.width = w;
  blurCanvas.height = h;
  const blurCtx = blurCanvas.getContext("2d")!;
  blurCtx.filter = "blur(12px) brightness(0.92)";
  blurCtx.drawImage(image, 0, 0, w, h);
  blurCtx.filter = "none";

  // Canvas 2: Final composite
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  // Step 1: Draw blurred background
  ctx.drawImage(blurCanvas, 0, 0);

  // Step 2: Cut an ellipse in the center (portrait area) and draw sharp image there
  // Ellipse covers ~55% width, ~80% height, centered slightly above middle (face area)
  const ellipseW = w * 0.55;
  const ellipseH = h * 0.8;
  const centerX = w / 2;
  const centerY = h * 0.45; // slightly above center for face framing

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, ellipseW / 2, ellipseH / 2, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, 0, 0, w, h);
  ctx.restore();

  // Step 3: Soft edge — draw a feathered ring around the ellipse for smooth transition
  // We do this by drawing the sharp image with a radial gradient mask
  const gradCanvas = document.createElement("canvas");
  gradCanvas.width = w;
  gradCanvas.height = h;
  const gradCtx = gradCanvas.getContext("2d")!;

  // Draw sharp image
  gradCtx.drawImage(image, 0, 0, w, h);

  // Create gradient mask for feathering
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d")!;

  const gradient = maskCtx.createRadialGradient(
    centerX,
    centerY,
    Math.min(ellipseW, ellipseH) * 0.35,
    centerX,
    centerY,
    Math.max(ellipseW, ellipseH) * 0.55,
  );
  gradient.addColorStop(0, "rgba(0,0,0,1)");
  gradient.addColorStop(0.7, "rgba(0,0,0,0.8)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");

  maskCtx.fillStyle = gradient;
  maskCtx.fillRect(0, 0, w, h);

  // Apply mask using destination-in
  gradCtx.globalCompositeOperation = "destination-in";
  gradCtx.drawImage(maskCanvas, 0, 0);

  // Composite feathered sharp image over blurred background
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = w;
  finalCanvas.height = h;
  const finalCtx = finalCanvas.getContext("2d")!;
  finalCtx.drawImage(blurCanvas, 0, 0);
  finalCtx.drawImage(gradCanvas, 0, 0);

  return finalCanvas.toDataURL("image/jpeg", 0.92);
}

function optimizeImage(
  dataUrl: string,
  maxWidth = 800,
  quality = 0.85,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = (h * maxWidth) / w;
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

function dataURLtoFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

// ─── Component ───

export function CameraPhotoCapture({
  onPhotoReady,
  existingPreview,
}: CameraPhotoCaptureProps) {
  const [step, setStep] = useState<CaptureStep>(
    existingPreview ? "preview" : "idle",
  );
  const [imageSrc, setImageSrc] = useState<string | null>(
    existingPreview || null,
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Bg blur
  const [bgBlurred, setBgBlurred] = useState(false);
  const [processing, setProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setStep("camera");

      // Wait for ref to be available
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setCameraError(
        "Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarından kamera iznini verin.",
      );
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d")!;

    // Mirror if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setImageSrc(dataUrl);
    setBgBlurred(false);
    stopCamera();
    setStep("preview");
  }, [facingMode, stopCamera]);

  const switchCamera = useCallback(() => {
    stopCamera();
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    // Restart with new facing mode
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: newMode,
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        setStream(mediaStream);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch(() => {});
          }
        });
      } catch {
        setCameraError("Kamera değiştirilemedi.");
      }
    }, 300);
  }, [facingMode, stopCamera]);

  const retake = useCallback(() => {
    setImageSrc(null);
    setBgBlurred(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    startCamera();
  }, [startCamera]);

  const handleCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const applyCrop = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setProcessing(true);
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      setImageSrc(cropped);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setStep("preview");
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, croppedAreaPixels]);

  const handleBlurBg = useCallback(async () => {
    if (!imageSrc) return;
    setProcessing(true);
    try {
      const result = await blurBackground(imageSrc);
      setImageSrc(result);
      setBgBlurred(true);
    } finally {
      setProcessing(false);
    }
  }, [imageSrc]);

  const confirmPhoto = useCallback(async () => {
    if (!imageSrc) return;
    setProcessing(true);
    try {
      const optimized = await optimizeImage(imageSrc);
      const file = dataURLtoFile(optimized, `photo_${Date.now()}.jpg`);
      onPhotoReady(file);
      setStep("preview");
    } finally {
      setProcessing(false);
    }
  }, [imageSrc, onPhotoReady]);

  const cancelAll = useCallback(() => {
    stopCamera();
    if (!existingPreview) {
      setImageSrc(null);
    }
    setStep(existingPreview ? "preview" : "idle");
    setBgBlurred(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [stopCamera, existingPreview]);

  // ─── Render: Idle ───
  if (step === "idle") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={startCamera}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all text-blue-700 font-medium"
        >
          <Camera className="w-6 h-6" />
          <span>Fotoğraf Çek</span>
        </button>
        {cameraError && (
          <p className="text-sm text-red-600 text-center">{cameraError}</p>
        )}
      </div>
    );
  }

  // ─── Render: Camera ───
  if (step === "camera") {
    return (
      <div className="space-y-3">
        <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={facingMode === "user" ? { transform: "scaleX(-1)" } : {}}
          />
          {/* Overlay guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-60 border-2 border-white/40 rounded-full" />
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={cancelAll}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label="İptal"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
          <button
            type="button"
            onClick={capturePhoto}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg ring-4 ring-blue-200"
            aria-label="Fotoğraf çek"
          >
            <Camera className="w-7 h-7 text-white" />
          </button>
          <button
            type="button"
            onClick={switchCamera}
            className="p-3 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            aria-label="Kamerayı değiştir"
          >
            <FlipHorizontal className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center">
          Yüzünüzü oval çerçeveye hizalayın ve fotoğraf çekin
        </p>
      </div>
    );
  }

  // ─── Render: Crop ───
  if (step === "crop" && imageSrc) {
    return (
      <div className="space-y-3">
        <div className="relative h-72 rounded-xl overflow-hidden bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={3 / 4}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
        <div className="flex items-center gap-3 px-2">
          <ZoomOut className="w-4 h-4 text-gray-600" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-blue-600"
            aria-label="Yakınlaştırma"
          />
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStep("preview")}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={applyCrop}
            disabled={processing}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              "İşleniyor..."
            ) : (
              <>
                <Check className="w-4 h-4" /> Kırp
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: Preview ───
  if (step === "preview" && imageSrc) {
    return (
      <div className="space-y-3">
        <div className="relative flex justify-center">
          <div className="w-40 h-52 rounded-xl overflow-hidden border-2 border-gray-200 shadow-md bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Çekilen fotoğraf"
              className="w-full h-full object-cover"
            />
          </div>
          {bgBlurred && (
            <span className="absolute top-1 right-1/2 translate-x-[5.5rem] bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              Arka plan bulanık
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={retake}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
            Tekrar Çek
          </button>
          <button
            type="button"
            onClick={() => setStep("crop")}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700"
          >
            <Crop className="w-4 h-4" />
            Kırp
          </button>
          <button
            type="button"
            onClick={handleBlurBg}
            disabled={processing || bgBlurred}
            className="flex flex-col items-center gap-1 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-xs font-medium text-gray-700 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {processing ? "..." : "Arka Plan Blur"}
          </button>
        </div>

        <button
          type="button"
          onClick={confirmPhoto}
          disabled={processing}
          className="w-full py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {processing ? (
            "Optimize ediliyor..."
          ) : (
            <>
              <Check className="w-5 h-5" />
              Fotoğrafı Onayla
            </>
          )}
        </button>
      </div>
    );
  }

  // ─── Render: Remove BG (shouldn't reach here normally) ───
  return null;
}
