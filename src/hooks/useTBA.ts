import { useState, useCallback } from 'react';
import { TBAService, TBAEvent, TBAMatch, TBATeam } from '../tba';

export function useTBA() {
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<TBAEvent[]>([]);
  const [teams, setTeams] = useState<TBATeam[]>([]);
  const [matches, setMatches] = useState<TBAMatch[]>([]);

  const tbaService = new TBAService(apiKey);

  const searchEvents = useCallback(
    async (query: string): Promise<TBAEvent[]> => {
      setLoading(true);
      setError(null);

      try {
        const results = await tbaService.searchEvents(query);
        setEvents(results);
        return results;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to search events';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  const getEventTeams = useCallback(
    async (eventKey: string): Promise<TBATeam[]> => {
      setLoading(true);
      setError(null);

      try {
        const results = await tbaService.getEventTeams(eventKey);
        setTeams(results);
        return results;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to fetch teams';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  const getTeamMatches = useCallback(
    async (eventKey: string, teamNumber: string): Promise<TBAMatch[]> => {
      setLoading(true);
      setError(null);

      try {
        const results = await tbaService.getTeamMatches(eventKey, teamNumber);
        setMatches(results);
        return results;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to fetch matches';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  const getAllMatches = useCallback(
    async (eventKey: string): Promise<TBAMatch[]> => {
      setLoading(true);
      setError(null);

      try {
        const results = await tbaService.getAllMatches(eventKey);
        setMatches(results);
        return results;
      } catch (err: any) {
        const errorMsg = err?.message || 'Failed to fetch all matches';
        setError(errorMsg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiKey],
  );

  return {
    apiKey,
    setApiKey,
    loading,
    error,
    events,
    teams,
    matches,
    searchEvents,
    getEventTeams,
    getTeamMatches,
    getAllMatches,
  };
}
