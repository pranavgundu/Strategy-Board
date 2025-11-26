import { useEffect, useRef } from 'react';
import { useStore } from '../../store/useStore';
import { useMatches } from '../../hooks/useMatches';
import { QRImport } from '../../qr';
import { Match } from '../../match';

export default function QRImportDialog() {
  const { setShowQRImportDialog } = useStore();
  const { importMatch } = useMatches();
  const qrImportRef = useRef<QRImport | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      qrImportRef.current = new QRImport();

      qrImportRef.current.start((data: any) => {
        try {
          console.log('QR Import received data:', data);
          const match = Match.fromPacket(data);
          importMatch(match);
          setShowQRImportDialog(false);
          alert('Match imported successfully!');
        } catch (err) {
          console.error('Failed to create match from QR data:', err);
          alert('Failed to import match: ' + (err as Error).message);
        }
      }).catch((err) => {
        console.error('Failed to start QR import:', err);
      });
    }

    return () => {
      if (qrImportRef.current) {
        qrImportRef.current.stop();
      }
    };
  }, [importMatch, setShowQRImportDialog]);

  const handleClose = () => {
    if (qrImportRef.current) {
      qrImportRef.current.stop();
    }
    setShowQRImportDialog(false);
  };

  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none z-50">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center bg-slate-600 rounded-3xl p-8 glass-modal max-h-[90vh] overflow-y-auto">
        <div className="mb-4 text-slate-100 font-bold text-2xl select-none">
          Import Match via QR Code
        </div>

        {/* Camera Selection */}
        <div className="mb-4 w-full max-w-md">
          <label className="text-slate-200 text-sm mb-2 block">Select Camera:</label>
          <select
            id="qr-import-camera-select"
            className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg border border-slate-500 focus:outline-none focus:border-blue-400"
          >
            <option>Loading cameras...</option>
          </select>
        </div>

        {/* Video Display */}
        <div className="relative mb-4 rounded-xl overflow-hidden bg-black">
          <video
            id="qr-import-video"
            className="max-w-full max-h-[50vh] w-auto h-auto"
            playsInline
          />
        </div>

        {/* Status */}
        <div className="flex flex-col items-center mb-4">
          <div id="qr-import-status" className="text-slate-100 text-lg mb-2"></div>
          <div id="qr-import-dots" className="flex gap-1" style={{ display: 'none' }}>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="px-6 py-3 text-white bg-red-500 rounded-xl glass-button glossy-shine"
        >
          Cancel
        </button>

        <div className="mt-4 text-slate-300 text-sm text-center max-w-md">
          Point your camera at a QR code generated from another device to import the match.
        </div>
      </div>
    </div>
  );
}
