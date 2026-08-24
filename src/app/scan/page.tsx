'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle2, XCircle } from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

export default function ScanPage() {
  const router = useRouter();
  const scannerRef = useRef<unknown>(null);
  const handledRef = useRef(false); // Verrou — empêche les appels multiples
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [started, setStarted] = useState(false);

  const extractEquipmentId = (text: string): string | null => {
    try {
      const urlMatch = text.match(/\/equipment\/([0-9a-f-]{36})/i);
      if (urlMatch) return urlMatch[1];
      const uuidMatch = text.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      if (uuidMatch) return text;
      return null;
    } catch {
      return null;
    }
  };

  const stopScanner = async () => {
    if (!scannerRef.current) return;
    try {
      // @ts-expect-error html5-qrcode types
      const isRunning = scannerRef.current.isScanning;
      if (isRunning) {
        // @ts-expect-error html5-qrcode types
        await scannerRef.current.stop();
      }
    } catch {
      // Ignorer toutes les erreurs de stop — déjà arrêté
    }
    scannerRef.current = null;
  };

  const handleSuccess = async (text: string) => {
    // Verrou : si déjà traité, on ignore tous les appels suivants
    if (handledRef.current) return;
    handledRef.current = true;

    await stopScanner();

    setState('success');
    setResult(text);
    setStarted(false);

    const equipmentId = extractEquipmentId(text);
    if (equipmentId) {
      setTimeout(() => {
        router.push(`/equipment/${equipmentId}`);
      }, 1200);
    }
  };

  const startScanner = async () => {
    handledRef.current = false; // Reset le verrou à chaque démarrage
    setState('scanning');
    setStarted(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { handleSuccess(decodedText); },
        () => { /* ignorer les erreurs de détection continues */ }
      );
    } catch {
      setState('error');
      setErrorMsg('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
      setStarted(false);
    }
  };

  const reset = async () => {
    handledRef.current = false;
    await stopScanner();
    setState('idle');
    setResult('');
    setErrorMsg('');
    setStarted(false);
  };

  // Nettoyage au démontage du composant
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  const isEquitrackQR = result ? !!extractEquipmentId(result) : false;

  return (
    <div className="fade-in">
      <div className="page-header flex items-center gap-3">
        <Link href="/" className="btn btn-ghost btn-icon" aria-label="Retour au tableau de bord">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="page-title">Scanner un équipement</h1>
          <p className="page-subtitle">Scannez le QR code collé sur le matériel</p>
        </div>
      </div>

      <div className="px-4 md:px-7 pb-8 max-w-lg mx-auto space-y-5">

        <div className="card overflow-hidden">
          {/* Zone caméra */}
          <div
            className="relative flex items-center justify-center"
            style={{ background: '#000', minHeight: '320px' }}
          >
            {/* Conteneur html5-qrcode */}
            <div
              id="qr-reader"
              style={{ width: '100%', display: started && state === 'scanning' ? 'block' : 'none' }}
            />

            {/* Idle */}
            {state === 'idle' && (
              <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <Camera className="w-10 h-10" style={{ color: 'var(--et-primary)' }} />
                </div>
                <div>
                  <p className="font-semibold text-white">Caméra non démarrée</p>
                  <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                    Appuyez sur le bouton ci-dessous pour démarrer le scan
                  </p>
                </div>
              </div>
            )}

            {/* Viseur animé pendant le scan */}
            {state === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64">
                  {[
                    'top-0 left-0 border-t-4 border-l-4 rounded-tl-xl',
                    'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl',
                    'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl',
                    'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl',
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-8 h-8 ${cls}`}
                      style={{ borderColor: 'var(--et-primary)' }} />
                  ))}
                  <div className="absolute left-2 right-2 h-0.5 rounded-full"
                    style={{ background: 'var(--et-primary)', top: '50%', animation: 'scanLine 2s ease-in-out infinite', opacity: 0.8 }} />
                </div>
              </div>
            )}

            {/* Succès */}
            {state === 'success' && (
              <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.15)' }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">QR Code détecté !</p>
                  {isEquitrackQR ? (
                    <p className="text-sm mt-1" style={{ color: '#10b981' }}>
                      Redirection vers la fiche équipement…
                    </p>
                  ) : (
                    <p className="text-sm mt-1" style={{ color: '#fbbf24' }}>
                      Ce QR code n&apos;est pas un équipement EquiTrack.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Erreur */}
            {state === 'error' && (
              <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
                <div className="flex items-center justify-center w-20 h-20 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <XCircle className="w-10 h-10" style={{ color: '#ef4444' }} />
                </div>
                <div>
                  <p className="font-semibold text-white">Erreur caméra</p>
                  <p className="text-sm mt-1" style={{ color: '#fca5a5' }}>{errorMsg}</p>
                </div>
              </div>
            )}
          </div>

          {/* Boutons */}
          <div className="p-4 space-y-3">
            {state === 'idle' && (
              <button onClick={startScanner} className="btn btn-primary w-full justify-center btn-lg">
                <Camera className="w-5 h-5" /> Démarrer le scan
              </button>
            )}
            {state === 'scanning' && (
              <button onClick={reset} className="btn btn-secondary w-full justify-center">
                Arrêter le scan
              </button>
            )}
            {(state === 'success' || state === 'error') && (
              <button onClick={reset} className="btn btn-primary w-full justify-center">
                <Camera className="w-4 h-4" /> Scanner à nouveau
              </button>
            )}
            {state === 'success' && !isEquitrackQR && result && (
              <div className="alert alert-warning text-xs break-all">
                Contenu scanné : {result}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="card p-5 space-y-3">
          <p className="section-label">Comment utiliser</p>
          <div className="space-y-3">
            {[
              { num: '1', text: 'Appuyez sur "Démarrer le scan"' },
              { num: '2', text: 'Autorisez l\'accès à la caméra si demandé' },
              { num: '3', text: 'Pointez la caméra vers le QR code collé sur l\'équipement' },
              { num: '4', text: 'La fiche s\'ouvre automatiquement' },
            ].map(({ num, text }) => (
              <div key={num} className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
                  style={{ background: 'var(--et-primary)' }}>
                  {num}
                </div>
                <p className="text-sm" style={{ color: 'var(--et-text-secondary)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Accès sans scanner */}
        <div className="card p-5">
          <p className="section-label">Accès sans scanner</p>
          <p className="text-sm mb-3" style={{ color: 'var(--et-text-muted)' }}>
            Si le scan ne fonctionne pas, cherchez l&apos;équipement manuellement.
          </p>
          <Link href="/equipment" className="btn btn-secondary w-full justify-center">
            Voir tous les équipements
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-60px); opacity: 0.3; }
          50%       { transform: translateY(60px);  opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
