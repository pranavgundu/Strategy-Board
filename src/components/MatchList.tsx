import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Match } from '../match';
import { useMatches } from '../hooks/useMatches';
import { useStore } from '../store/useStore';
import { QRExport } from '../qr';
import { PDFExport } from '../pdf';

interface MatchListProps {
  matches: Match[];
}

export default function MatchList({ matches }: MatchListProps) {
  const navigate = useNavigate();
  const { deleteMatch, duplicateMatch } = useMatches();
  const { setShowQRExportDialog, setCurrentQRExportMatch } = useStore();
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const handleMatchClick = (match: Match) => {
    navigate(`/whiteboard/${match.id}`);
  };

  const handleDeleteMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    await deleteMatch(matchId);
    setExpandedMatchId(null);
  };

  const handleDuplicateMatch = async (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    await duplicateMatch(matchId);
    setExpandedMatchId(null);
  };

  const handleExportQR = (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedMatchId(null);
    // Set match first, then open dialog
    setCurrentQRExportMatch(match);
    // Use setTimeout to ensure state update propagates
    setTimeout(() => {
      setShowQRExportDialog(true);
    }, 0);
  };

  const handleExportPNG = async (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    setExpandedMatchId(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `strategy-board-${match.matchName}-${timestamp}.png`;

      // Store the export request in sessionStorage
      sessionStorage.setItem('pendingPNGExport', filename);

      // Navigate to whiteboard to render canvases
      navigate(`/whiteboard/${match.id}`);
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('Failed to export PNG. Please try again.');
    }
  };

  const handleExportPDF = async (e: React.MouseEvent, match: Match) => {
    e.stopPropagation();
    setExpandedMatchId(null);

    try {
      const pdfExport = new PDFExport();
      const packet = match.getAsPacket();
      packet.splice(7, 1);
      const raw = JSON.stringify(packet);

      const encoder = new TextEncoder();
      const bytes = encoder.encode(raw);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);

      const MAX_CHUNK_PAYLOAD = 200;
      const HEADER_SIZE = 4;
      const TOTAL_CHUNKS_HEADER_SIZE = 4;

      const chunks: string[] = [];
      for (let i = 0; i < b64.length; i += MAX_CHUNK_PAYLOAD) {
        chunks.push(b64.slice(i, i + MAX_CHUNK_PAYLOAD));
      }

      const totalChunks = Math.max(1, chunks.length);
      const payloads: string[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const payload =
          i.toString().padStart(HEADER_SIZE, '0') +
          totalChunks.toString().padStart(TOTAL_CHUNKS_HEADER_SIZE, '0') +
          (chunks[i] || '');
        payloads.push(payload);
      }

      await pdfExport.exportToPDFLarge(payloads, match.matchName);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const toggleOptions = (e: React.MouseEvent, matchId: string) => {
    e.stopPropagation();
    setExpandedMatchId(expandedMatchId === matchId ? null : matchId);
  };

  return (
    <div id="home-match-list" className="w-full p-6 flex-1 flex flex-col gap-2 items-center overflow-y-auto bg-slate-800">
      {matches.length === 0 ? (
        <div className="absolute top-1/2 text-slate-300 text-base sm:text-lg md:text-xl italic pointer-events-none">
          Click <span className="not-italic text-white bg-green-500 px-2 py-1 rounded-lg">New</span> to add matches
        </div>
      ) : (
        matches.map((match) => (
          <div
            key={match.id}
            className="w-full h-20 sm:h-22 md:h-24 bg-slate-700 flex shrink-0 justify-between items-center rounded-xl glass-card px-4 sm:px-6 md:px-8 cursor-pointer hover:bg-slate-600 transition-colors"
            onClick={() => handleMatchClick(match)}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleMatchClick(match);
              }
            }}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setExpandedMatchId(null);
              }
            }}
          >
            <div className="grow-1 basis-0 text-slate-200 font-bold text-base sm:text-lg md:text-xl lg:text-2xl select-none overflow-hidden text-ellipsis whitespace-nowrap">
              {match.matchName || 'Untitled'}
            </div>
            <div className="w-1/2 flex justify-center items-center gap-2 sm:gap-4 md:gap-6">
              <div className="w-1/2 text-red-400 text-sm sm:text-base md:text-lg lg:text-2xl text-right select-none overflow-hidden text-ellipsis whitespace-nowrap">
                {match.redThree || '---'} {match.redTwo || '---'} {match.redOne || '---'}
              </div>
              <div className="text-slate-200 text-sm sm:text-base md:text-lg lg:text-2xl select-none">
                VS
              </div>
              <div className="w-1/2 text-blue-400 text-sm sm:text-base md:text-lg lg:text-2xl select-none overflow-hidden text-ellipsis whitespace-nowrap">
                {match.blueOne || '---'} {match.blueTwo || '---'} {match.blueThree || '---'}
              </div>
            </div>
            <div className="grow-1 basis-0 flex h-full justify-end items-center">
              {expandedMatchId !== match.id ? (
                <button
                  className="flex flex-col w-8 sm:w-10 md:w-12 gap-1 items-center justify-center"
                  onClick={(e) => toggleOptions(e, match.id)}
                >
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="w-24 sm:w-32 p-1 sm:p-2 text-xs sm:text-sm md:text-base lg:text-xl text-white bg-green-500 rounded-xl glass-button glossy-shine"
                    onClick={(e) => handleDuplicateMatch(e, match.id)}
                  >
                    Duplicate
                  </button>
                  <button
                    className="w-24 sm:w-32 p-1 sm:p-2 text-xs sm:text-sm md:text-base lg:text-xl text-white bg-blue-500 rounded-xl glass-button glossy-shine whitespace-nowrap"
                    onClick={(e) => handleExportQR(e, match)}
                  >
                    Export QR
                  </button>
                  <button
                    className="w-24 sm:w-32 p-1 sm:p-2 text-xs sm:text-sm md:text-base lg:text-xl text-white bg-cyan-500 rounded-xl glass-button glossy-shine whitespace-nowrap"
                    onClick={(e) => handleExportPNG(e, match)}
                  >
                    Export PNG
                  </button>
                  <button
                    className="w-24 sm:w-32 p-1 sm:p-2 text-xs sm:text-sm md:text-base lg:text-xl text-white bg-purple-500 rounded-xl glass-button glossy-shine whitespace-nowrap"
                    onClick={(e) => handleExportPDF(e, match)}
                  >
                    Export PDF
                  </button>
                  <button
                    className="w-20 sm:w-24 p-1 sm:p-2 text-xs sm:text-sm md:text-base lg:text-xl text-white bg-red-500 rounded-xl glass-button glossy-shine"
                    onClick={(e) => handleDeleteMatch(e, match.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
