import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useMatches } from '../../hooks/useMatches';
import { useTBA } from '../../hooks/useTBA';
import { TBAEvent, TBATeam, TBAMatch } from '../../tba';

export default function TBAImportDialog() {
  const { setShowTBADialog } = useStore();
  const { createMatch } = useMatches();
  const {
    apiKey,
    setApiKey,
    loading,
    error,
    searchEvents,
    getEventTeams,
    getTeamMatches,
    getAllMatches,
  } = useTBA();

  const [eventSearch, setEventSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<TBAEvent | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TBATeam | null>(null);
  const [eventsList, setEventsList] = useState<TBAEvent[]>([]);
  const [teamsList, setTeamsList] = useState<TBATeam[]>([]);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    // Load saved API key from localStorage
    const savedKey = localStorage.getItem('tba_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('tba_api_key', key);
  };

  const handleEventSearch = async (query: string) => {
    setEventSearch(query);

    if (query.length < 2) {
      setEventsList([]);
      setShowEventDropdown(false);
      return;
    }

    const results = await searchEvents(query);
    setEventsList(results);
    setShowEventDropdown(results.length > 0);
  };

  const handleEventSelect = async (event: TBAEvent) => {
    setSelectedEvent(event);
    setEventSearch(event.name);
    setShowEventDropdown(false);

    // Fetch teams for this event
    setStatusMessage('Loading teams...');
    const teams = await getEventTeams(event.key);
    setTeamsList(teams);
    setStatusMessage('');
    setTeamSearch('Select team or view all matches');
    setShowTeamDropdown(true);
  };

  const handleTeamSearch = (query: string) => {
    setTeamSearch(query);

    if (!selectedEvent) return;

    // Filter teams based on search
    const filtered = teamsList.filter(
      (team) =>
        team.team_number.toString().includes(query) ||
        team.nickname.toLowerCase().includes(query.toLowerCase()),
    );

    setShowTeamDropdown(filtered.length > 0 || query.length > 0);
  };

  const handleTeamSelect = async (team: TBATeam) => {
    setSelectedTeam(team);
    setTeamSearch(`${team.team_number} - ${team.nickname}`);
    setShowTeamDropdown(false);
  };

  const handleImportMatches = async () => {
    if (!selectedEvent) {
      setStatusMessage('Please select an event first');
      return;
    }

    setStatusMessage('Importing matches...');

    try {
      let matches: TBAMatch[];

      if (selectedTeam) {
        // Import matches for specific team
        matches = await getTeamMatches(selectedEvent.key, selectedTeam.team_number.toString());
      } else {
        // Import all matches
        matches = await getAllMatches(selectedEvent.key);
      }

      if (matches.length === 0) {
        setStatusMessage('No matches found');
        return;
      }

      // Create a match for each TBA match
      let importedCount = 0;
      for (const tbaMatch of matches) {
        const alliances = tbaMatch.alliances;
        if (!alliances || !alliances.red || !alliances.blue) continue;

        const redTeams = alliances.red.team_keys.map((key) => key.replace('frc', ''));
        const blueTeams = alliances.blue.team_keys.map((key) => key.replace('frc', ''));

        await createMatch(
          tbaMatch.match_number
            ? `${tbaMatch.comp_level.toUpperCase()} ${tbaMatch.match_number}`
            : tbaMatch.key,
          redTeams[0] || '',
          redTeams[1] || '',
          redTeams[2] || '',
          blueTeams[0] || '',
          blueTeams[1] || '',
          blueTeams[2] || '',
        );

        importedCount++;
      }

      setStatusMessage(`Successfully imported ${importedCount} matches!`);

      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowTBADialog(false);
      }, 2000);
    } catch (err) {
      setStatusMessage('Failed to import matches');
      console.error(err);
    }
  };

  const filteredTeams = teamsList.filter(
    (team) =>
      team.team_number.toString().includes(teamSearch) ||
      team.nickname.toLowerCase().includes(teamSearch.toLowerCase()),
  );

  return (
    <div className="absolute top-0 left-0 w-dvw h-dvh backdrop-blur-xs touch-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between w-11/12 sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-2xl bg-slate-600 rounded-2xl md:rounded-3xl glass-modal max-h-[90vh] overflow-hidden">
        <div className="w-full pt-4 sm:pt-5 md:pt-6 pb-3 sm:pb-4 text-lg sm:text-xl md:text-2xl text-center text-slate-200 font-bold flex-shrink-0">
          Import from The Blue Alliance
        </div>

        <div className="w-full flex-1 overflow-y-auto">
          {/* API Key Input */}
          <div className="w-full px-4 sm:px-6 md:px-8 pb-3 sm:pb-4">
            <input
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="TBA API Key (optional)"
              type="password"
              className="w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg lg:text-xl text-center text-slate-300 rounded-lg md:rounded-xl bg-slate-700 outline-0"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {!apiKey && (
              <div className="text-xs sm:text-sm text-slate-400 text-center mt-2">
                Using shared API key. Add your own at{' '}
                <a
                  href="https://www.thebluealliance.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  thebluealliance.com/account
                </a>{' '}
                for higher rate limits
              </div>
            )}
          </div>

          {/* Event Search */}
          <div className="w-full px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 relative">
            <input
              value={eventSearch}
              onChange={(e) => handleEventSearch(e.target.value)}
              placeholder="Search events..."
              className="w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg lg:text-xl text-center text-slate-300 rounded-lg md:rounded-xl bg-slate-700 outline-0"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {showEventDropdown && (
              <div className="absolute top-full left-4 right-4 sm:left-6 sm:right-6 md:left-8 md:right-8 mt-1 bg-slate-700 rounded-lg md:rounded-xl max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto z-50 shadow-2xl">
                {eventsList.map((event) => (
                  <div
                    key={event.key}
                    onClick={() => handleEventSelect(event)}
                    className="p-3 hover:bg-slate-600 cursor-pointer border-b border-slate-600 last:border-b-0"
                  >
                    <div className="text-white font-semibold">{event.name}</div>
                    <div className="text-slate-400 text-sm">
                      {event.city}, {event.state_prov} • {event.year}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team Search */}
          <div className="w-full px-4 sm:px-6 md:px-8 pb-4 sm:pb-5 md:pb-6 relative">
            <input
              value={teamSearch}
              onChange={(e) => handleTeamSearch(e.target.value)}
              placeholder={selectedEvent ? 'Search teams or select all matches...' : 'Select event first...'}
              disabled={!selectedEvent}
              className="w-full p-2 sm:p-3 md:p-4 text-sm sm:text-base md:text-lg lg:text-xl text-center text-slate-300 rounded-lg md:rounded-xl bg-slate-700 outline-0 disabled:opacity-50"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            {showTeamDropdown && selectedEvent && (
              <div className="absolute top-full left-4 right-4 sm:left-6 sm:right-6 md:left-8 md:right-8 mt-1 bg-slate-700 rounded-lg md:rounded-xl max-h-64 sm:max-h-80 md:max-h-96 overflow-y-auto z-50 shadow-2xl">
                {filteredTeams.slice(0, 20).map((team) => (
                  <div
                    key={team.key}
                    onClick={() => handleTeamSelect(team)}
                    className="p-3 hover:bg-slate-600 cursor-pointer border-b border-slate-600"
                  >
                    <div className="text-white font-semibold">
                      {team.team_number} - {team.nickname}
                    </div>
                    {team.city && team.state_prov && (
                      <div className="text-slate-400 text-sm">
                        {team.city}, {team.state_prov}
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => {
                    setSelectedTeam(null);
                    setTeamSearch('All Matches');
                    setShowTeamDropdown(false);
                  }}
                  className="w-full p-3 sm:p-4 text-sm sm:text-base md:text-lg text-center text-slate-200 font-bold bg-green-500 hover:bg-green-600 transition-colors"
                >
                  All Matches
                </button>
              </div>
            )}
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="w-full px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 text-center text-sm sm:text-base text-slate-300">
              {statusMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="w-full px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 text-center text-sm sm:text-base text-red-400">
              {error}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="w-full px-4 sm:px-6 md:px-8 pb-3 sm:pb-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-shrink-0">
          <button
            onClick={handleImportMatches}
            disabled={!selectedEvent || loading}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-green-500 p-4 sm:p-5 md:p-6 rounded-bl-2xl md:rounded-bl-3xl glossy-shine hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Import
          </button>
          <button
            onClick={() => setShowTBADialog(false)}
            className="w-1/2 text-center text-lg sm:text-xl md:text-2xl font-bold text-white bg-red-500 p-4 sm:p-5 md:p-6 rounded-br-2xl md:rounded-br-3xl glossy-shine hover:bg-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
