import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { ContributorsService } from '../../contributors';

export default function ContributorsDialog() {
  const { setShowContributorsDialog } = useStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [contributors, setContributors] = useState<any[]>([]);

  const contributorsService = new ContributorsService();

  useEffect(() => {
    loadContributors();
  }, []);

  const loadContributors = async () => {
    setLoading(true);
    setError(false);

    try {
      const data = await contributorsService.fetchContributors();
      setContributors(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading contributors:', err);
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none z-50">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-11/12 sm:w-5/6 md:w-4/5 lg:w-3/4 max-w-6xl bg-slate-600 rounded-2xl md:rounded-3xl glass-modal max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full pt-6 pb-4 px-6 flex justify-between items-center border-b border-slate-500">
          <h2 className="text-2xl sm:text-3xl md:text-4xl text-slate-200 font-bold">
            Top Contributors
          </h2>
          <button
            onClick={() => setShowContributorsDialog(false)}
            className="text-white bg-red-500 px-4 py-2 rounded-xl hover:bg-red-600 transition-colors glass-button glossy-shine font-semibold"
          >
            Close
          </button>
        </div>

        <div className="w-full flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
              <p className="text-slate-300 text-lg">Loading contributors...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-red-400 text-lg mb-4">Failed to load contributors</p>
              <button
                onClick={loadContributors}
                className="px-6 py-3 bg-green-500 text-white rounded-xl glass-button glossy-shine hover:bg-green-600 transition-colors font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contributors.slice(0, 10).map((contributor, index) => {
                const rank = index + 1;
                const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';

                return (
                  <div
                    key={contributor.login}
                    className="flex items-center gap-4 p-4 bg-slate-700 rounded-xl glass-card transition-all cursor-pointer"
                  >
                    <div className="flex-shrink-0 relative">
                      {medalEmoji && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-3xl z-10" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                          {medalEmoji}
                        </div>
                      )}
                      <img
                        src={`${contributor.avatar_url}?s=128`}
                        alt={contributor.login}
                        className={`w-16 h-16 rounded-full border-2 ${
                          rank === 1 ? 'border-yellow-400' : rank === 2 ? 'border-gray-400' : rank === 3 ? 'border-orange-400' : 'border-slate-500'
                        }`}
                        style={{ imageRendering: '-webkit-optimize-contrast', backfaceVisibility: 'hidden', transform: 'translateZ(0)', willChange: 'transform' }}
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <a
                          href={contributor.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-bold text-white hover:text-blue-400 transition-colors truncate"
                        >
                          {contributor.name || contributor.login}
                        </a>
                      </div>
                      <p className="text-sm text-slate-400 truncate">@{contributor.login}</p>
                      {contributor.bio && <p className="text-sm text-slate-300 mt-1 line-clamp-2">{contributor.bio}</p>}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-2xl font-bold text-white">{contributor.contributions}</div>
                      <div className="text-xs text-slate-400">commits</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
