import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useMatches } from '../hooks/useMatches';
import MatchList from '../components/MatchList';
import CreateMatchDialog from '../components/dialogs/CreateMatchDialog';
import TBAImportDialog from '../components/dialogs/TBAImportDialog';
import QRImportDialog from '../components/dialogs/QRImportDialog';
import QRExportDialog from '../components/dialogs/QRExportDialog';
import ClearConfirmDialog from '../components/dialogs/ClearConfirmDialog';
import ContributorsDialog from '../components/dialogs/ContributorsDialog';
import { ContributorsService } from '../contributors';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    showCreateMatchDialog,
    showTBADialog,
    showQRImportDialog,
    showQRExportDialog,
    showClearConfirmDialog,
    showContributorsDialog,
    currentQRExportMatch,
    setShowCreateMatchDialog,
    setShowTBADialog,
    setShowQRImportDialog,
    setShowClearConfirmDialog,
    setShowContributorsDialog,
  } = useStore();

  const { matches } = useMatches();
  const [lastCommit, setLastCommit] = useState<any>(null);

  useEffect(() => {
    // Load last commit info
    const contributorsService = new ContributorsService();
    contributorsService.fetchLastCommit().then((commit) => {
      if (commit) {
        setLastCommit(commit);
      }
    }).catch(console.error);
  }, []);

  const getTimeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    const intervals: { [key: string]: number } = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
      }
    }

    return 'just now';
  };

  return (
    <div id="home-container" className="flex flex-col w-dvw h-dvh touch-none" style={{ backgroundColor: '#192334' }}>
      {/* Toolbar */}
      <div id="home-toolbar" className="flex items-center justify-between w-full h-16 sm:h-20 md:h-24 bg-slate-600 px-4 sm:px-8 md:px-12">
        <div
          id="home-toolbar-logo"
          className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white select-none cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Strategy Board
        </div>
        <div className="flex gap-2 sm:gap-3 md:gap-4 text-base sm:text-xl md:text-2xl text-white">
          <button
            onClick={() => setShowCreateMatchDialog(true)}
            className="flex items-center justify-center w-16 sm:w-20 md:w-24 lg:w-36 h-10 sm:h-11 md:h-12 rounded-xl md:rounded-2xl bg-green-500 glass-button glossy-shine text-sm sm:text-base md:text-lg lg:text-xl"
          >
            New
          </button>
          <button
            onClick={() => setShowTBADialog(true)}
            className="flex items-center justify-center w-16 sm:w-20 md:w-24 lg:w-36 h-10 sm:h-11 md:h-12 rounded-xl md:rounded-2xl bg-blue-500 glass-button glossy-shine gap-1 sm:gap-2 text-sm sm:text-base md:text-lg lg:text-xl"
          >
            <span>TBA</span>
            <img src="/tba.svg" alt="TBA" className="h-5 sm:h-6 md:h-8 w-auto" />
          </button>
          <button
            onClick={() => setShowQRImportDialog(true)}
            className="flex items-center justify-center w-20 sm:w-28 md:w-32 lg:w-40 h-10 sm:h-11 md:h-12 rounded-xl md:rounded-2xl bg-orange-500 glass-button glossy-shine text-sm sm:text-base md:text-lg lg:text-xl"
          >
            <span className="hidden sm:inline">Import QR</span>
            <span className="sm:hidden">Import</span>
          </button>
          <button
            onClick={() => setShowClearConfirmDialog(true)}
            className="flex items-center justify-center w-16 sm:w-20 md:w-24 lg:w-36 h-10 sm:h-11 md:h-12 rounded-xl md:rounded-2xl bg-red-500 glass-button glossy-shine text-sm sm:text-base md:text-lg lg:text-xl"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Match List */}
      <MatchList matches={matches} />

      {/* Bottom Bar */}
      <div id="home-bottom-bar" className="w-full h-16 bg-slate-700 flex items-center justify-center border-t border-slate-600 transition-all duration-300 relative">
        <a
          href="https://github.com/pranavgundu/Strategy-Board"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <i className="fab fa-github text-2xl"></i>
          <span className="text-lg font-semibold"></span>
        </a>
        {lastCommit && (
          <div className="absolute left-6 text-slate-400 text-xs">
            <a
              href={lastCommit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors flex items-center gap-2"
              title={`latest commit: ${lastCommit.message}`}
            >
              <span className="font-mono">{lastCommit.sha}</span>
              <span>•</span>
              <span>{getTimeAgo(new Date(lastCommit.date))}</span>
            </a>
          </div>
        )}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setShowContributorsDialog(true);
          }}
          className="absolute right-6 text-slate-300 hover:text-white transition-colors text-lg font-semibold"
        >
          strategyboard.app
        </a>
      </div>

      {/* Dialogs */}
      {showCreateMatchDialog && <CreateMatchDialog />}
      {showTBADialog && <TBAImportDialog />}
      {showQRImportDialog && <QRImportDialog />}
      {showQRExportDialog && currentQRExportMatch && <QRExportDialog match={currentQRExportMatch} />}
      {showClearConfirmDialog && <ClearConfirmDialog />}
      {showContributorsDialog && <ContributorsDialog />}
    </div>
  );
}
