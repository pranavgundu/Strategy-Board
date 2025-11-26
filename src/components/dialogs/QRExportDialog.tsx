import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { QRExport } from '../../qr';
import { Match } from '../../match';

interface QRExportDialogProps {
  match: Match;
}

export default function QRExportDialog({ match }: QRExportDialogProps) {
  const { setShowQRExportDialog, setCurrentQRExportMatch } = useStore();
  const qrExportRef = useRef<QRExport | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!match) return;

    const instance = new QRExport();
    qrExportRef.current = instance;

    rafRef.current = window.requestAnimationFrame(() => {
      instance.export(match, () => {
        const prepared = document.getElementById('qr-export-prepared');
        if (prepared) {
          prepared.classList.remove('hidden');
          prepared.style.display = 'inline';
        }
        const status = document.getElementById('qr-export-status');
        if (status) {
          status.style.display = 'block';
          status.setAttribute('aria-hidden', 'false');
        }
        const startBtn = document.getElementById('qr-export-start-btn') as HTMLButtonElement | null;
        startBtn?.focus();
      });
    });

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      instance.close();
      if (qrExportRef.current === instance) {
        qrExportRef.current = null;
      }
    };
  }, [match]);

  const handleClose = () => {
    if (qrExportRef.current) {
      qrExportRef.current.close();
    }
    setCurrentQRExportMatch(null);
    setShowQRExportDialog(false);
  };

  return (
    <div
      id="qr-export-container"
      className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none z-50"
      style={{ touchAction: 'auto' }}
      onClick={handleClose}
    >
      <div
        id="qr-export-inner-container"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-3 bg-slate-600 rounded-3xl p-6 glass-modal"
        style={{ maxHeight: '95vh', maxWidth: '95vw', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full flex justify-end">
          <button
            id="qr-export-close-btn"
            type="button"
            onClick={handleClose}
            className="text-white bg-red-500 px-3 py-1 rounded-xl hover:bg-red-600 glass-button glossy-shine"
            title="Close export"
          >
            Close
          </button>
        </div>

        <div className="w-full flex flex-col items-center min-h-[60px] gap-3">
          <div className="flex gap-3">
            <button
              id="qr-export-start-btn"
              type="button"
              className="px-8 py-3 text-xl font-bold text-white bg-green-500 rounded-xl glass-button glossy-shine hover:bg-green-600 transition-colors"
            >
              Start
            </button>
            <button
              id="qr-export-pdf-btn"
              type="button"
              className="px-8 py-3 text-xl font-bold text-white bg-blue-500 rounded-xl glass-button glossy-shine hover:bg-blue-600 transition-colors"
              style={{ display: 'none' }}
            >
              Export as PDF
            </button>
          </div>

          <div
            id="qr-export-status"
            className="text-slate-100 font-bold select-none"
            aria-hidden="true"
            style={{ display: 'none' }}
          >
            <span id="qr-export-status-text" aria-hidden="false"></span>
            <span id="qr-export-prepared" className="hidden" aria-hidden="true">
              Prepared
            </span>
            <div
              id="qr-export-dots"
              className="qr-dots"
              aria-hidden="true"
              style={{ display: 'none' }}
            >
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
              <div className="qr-dot"></div>
            </div>
          </div>

          <div
            id="qr-export-progress-wrap"
            className="w-full flex justify-center"
            style={{ display: 'none' }}
          >
            <div id="qr-export-progress" className="qr-progress-wrap" aria-hidden="true">
              <div
                id="qr-export-progress-bar"
                className="qr-progress-bar"
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>
        </div>

        <div
          className="w-full flex items-center justify-center"
          style={{ minHeight: '65vh', maxHeight: '65vh', overflow: 'hidden' }}
        >
          <div
            id="qr-export-code-worker-0"
            className="w-full flex items-center justify-center"
            style={{ zIndex: 1, display: 'none' }}
          ></div>
          <div
            id="qr-export-code-worker-1"
            className="w-full flex items-center justify-center"
            style={{ zIndex: 2, display: 'none' }}
          ></div>
          <div
            id="qr-export-code-worker-2"
            className="w-full flex items-center justify-center"
            style={{ zIndex: 3, display: 'none' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
