'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, X, Check, RotateCcw } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Démarrer le flux caméra
  const startStream = useCallback(async (mode: 'environment' | 'user') => {
    // Arrêter le flux précédent si existant
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setSnapshot(null);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // play() peut être interrompu par un nouveau flux (changement de caméra,
        // double-effet React en dev) — l'AbortError résultant est sans conséquence.
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error(err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions de votre navigateur.");
    }
  }, []);

  // Démarrer au montage
  useEffect(() => {
    startStream(facingMode);
    // Cleanup : arrêter le flux quand le composant est démonté
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, startStream]);

  // Prendre la photo
  const takeSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // --- COMPRESSION D'IMAGE POUR SAUVER LE QUOTA LOCALSTORAGE ---
    const MAX_WIDTH = 800; // Largeur maximale cible (suffisant HD)
    let width = video.videoWidth;
    let height = video.videoHeight;
    
    // Si l'image est trop grande, on calcule la nouvelle hauteur pour garder le ratio
    if (width > MAX_WIDTH) {
      height = Math.round((height * MAX_WIDTH) / width);
      width = MAX_WIDTH;
    }

    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Dessiner en redimensionnant
    ctx.drawImage(video, 0, 0, width, height);
    
    // Convertir en JPEG fortement compressé (0.6 réduit considérablement le poids Base64)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
    // -----------------------------------------------------------

    setSnapshot(dataUrl);
    // Pauser le flux pendant l'aperçu
    streamRef.current?.getTracks().forEach(t => t.enabled = false);
  };

  // Confirmer et retourner la photo
  const confirmSnapshot = () => {
    if (snapshot) {
      onCapture(snapshot);
      onClose();
    }
  };

  // Reprendre une photo
  const retake = () => {
    setSnapshot(null);
    streamRef.current?.getTracks().forEach(t => t.enabled = true);
  };

  // Switcher la caméra (avant/arrière sur mobile)
  const switchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  return (
    // Overlay plein écran
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Barre de contrôle du haut */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <span className="text-white font-medium text-sm">
          {snapshot ? 'Aperçu de la photo' : 'Prendre une photo'}
        </span>
        {/* Switcher caméra (avant/arrière) */}
        {!snapshot && (
          <button onClick={switchCamera} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30 transition-colors" title="Retourner la caméra">
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
        {snapshot && <div className="w-9" />}
      </div>

      {/* Zone vidéo / aperçu */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6">
            <Camera className="w-12 h-12 text-white/40 mx-auto mb-3" />
            <p className="text-white/80 text-sm">{error}</p>
            <button onClick={() => startStream(facingMode)} className="mt-4 px-4 py-2 bg-white/20 text-white rounded-xl text-sm hover:bg-white/30">
              Réessayer
            </button>
          </div>
        ) : (
          <>
            {/* Flux vidéo en direct */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-opacity duration-300 ${snapshot ? 'opacity-0' : 'opacity-100'}`}
            />
            {/* Aperçu de la Photo prise */}
            {snapshot && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={snapshot} alt="Aperçu" className="absolute inset-0 w-full h-full object-cover" />
            )}
          </>
        )}
      </div>

      {/* Canvas caché pour la capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Barre de contrôle du bas */}
      <div className="px-6 py-6 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-8">
        {snapshot ? (
          // Mode aperçu : Reprendre ou Confirmer
          <>
            <button onClick={retake} className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition-colors">
              <div className="p-3 bg-white/20 rounded-full hover:bg-white/30">
                <RotateCcw className="w-6 h-6" />
              </div>
              <span className="text-xs">Reprendre</span>
            </button>
            <button onClick={confirmSnapshot} className="flex flex-col items-center gap-1 text-white">
              <div className="p-4 bg-blue-600 rounded-full hover:bg-blue-700 shadow-lg shadow-blue-900/50">
                <Check className="w-8 h-8" />
              </div>
              <span className="text-xs font-medium">Utiliser cette photo</span>
            </button>
          </>
        ) : (
          // Mode capture : Bouton déclencheur
          <button
            onClick={takeSnapshot}
            disabled={!!error}
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 active:scale-90 transition-all shadow-lg flex items-center justify-center disabled:opacity-40"
          >
            <Camera className="w-8 h-8 text-gray-800" />
          </button>
        )}
      </div>
    </div>
  );
}
