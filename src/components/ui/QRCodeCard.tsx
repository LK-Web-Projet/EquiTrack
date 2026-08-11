'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer } from 'lucide-react';
import type { Equipment } from '@/types';

interface Props {
  equipment: Equipment;
  baseUrl?: string;
}

export function QRCodeCard({ equipment, baseUrl }: Props) {
  const url = `${baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')}/equipment/${equipment.id}`;
  const label = `${equipment.category?.code ?? '???'}-${equipment.display_number}`;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (!win) return;
    const svg = document.getElementById(`qr-svg-${equipment.id}`)?.outerHTML ?? '';
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Étiquette ${label}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: system-ui, sans-serif;
              display: flex; align-items: center; justify-content: center;
              min-height: 100vh; background: #fff;
            }
            .label {
              width: 200px;
              border: 2px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
              text-align: center;
            }
            .brand {
              font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
              color: #3b82f6; margin-bottom: 10px; text-transform: uppercase;
            }
            .qr { margin: 0 auto 10px; }
            .number {
              font-family: monospace; font-size: 16px; font-weight: 700;
              color: #0f172a; letter-spacing: 0.05em;
              background: #f1f5f9; padding: 4px 10px; border-radius: 6px;
              display: inline-block; margin-bottom: 6px;
            }
            .category {
              font-size: 11px; color: #64748b;
            }
            .hint {
              font-size: 9px; color: #94a3b8; margin-top: 8px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="label">
            <div class="brand">EquiTrack</div>
            <div class="qr">${svg}</div>
            <div class="number">${label}</div>
            <div class="category">${equipment.category?.icon ?? ''} ${equipment.category?.name ?? ''}</div>
            ${equipment.serial_number ? `<div class="category" style="margin-top:3px">S/N: ${equipment.serial_number}</div>` : ''}
            <div class="hint">Scannez pour accéder à la fiche</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleDownloadSVG = () => {
    const svg = document.getElementById(`qr-svg-${equipment.id}`);
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${label}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="card p-5 flex flex-col items-center gap-4">
      <p className="section-label self-start">QR Code</p>

      {/* QR Code */}
      <div
        className="p-4 rounded-2xl"
        style={{ background: '#fff', border: '2px solid var(--et-border)' }}
      >
        <QRCodeSVG
          id={`qr-svg-${equipment.id}`}
          value={url}
          size={160}
          level="H"
          includeMargin={false}
          style={{ display: 'block' }}
        />
      </div>

      {/* Label */}
      <div className="text-center">
        <p className="eq-number text-base">{label}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--et-text-muted)' }}>
          {equipment.category?.icon} {equipment.category?.name}
        </p>
      </div>

      {/* URL (tronquée) */}
      <p
        className="text-[10px] text-center px-2 break-all"
        style={{ color: 'var(--et-text-muted)', maxWidth: '200px' }}
      >
        {url}
      </p>

      {/* Actions */}
      <div className="flex gap-2 w-full">
        <button onClick={handlePrint} className="btn btn-primary flex-1 justify-center btn-sm">
          <Printer className="w-3.5 h-3.5" /> Imprimer
        </button>
        <button onClick={handleDownloadSVG} className="btn btn-secondary btn-sm btn-icon" title="Télécharger SVG">
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
