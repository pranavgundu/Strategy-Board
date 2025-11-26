import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Match } from '../match';
import { GET, SET, DEL } from '../db';

export function useMatches() {
  const { matches, setMatches, addMatch: addToStore, updateMatch: updateInStore, deleteMatch: deleteFromStore } = useStore();

  // Load matches from IndexedDB on mount
  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const savedMatches = await GET<Match[]>('matches', (e) => {
        console.error('Failed to load matches:', e);
      });

      if (savedMatches && Array.isArray(savedMatches)) {
        const matchObjects = savedMatches.map((data: any) => Match.fromPacket(data));
        setMatches(matchObjects);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const saveMatchesToDB = async (matches: Match[]) => {
    try {
      const packets = matches.map(m => m.getAsPacket());
      await SET('matches', packets, (e) => {
        console.error('Failed to save matches:', e);
      });
    } catch (error) {
      console.error('Error saving matches:', error);
    }
  };

  const createMatch = async (
    matchName: string,
    redOne: string,
    redTwo: string,
    redThree: string,
    blueOne: string,
    blueTwo: string,
    blueThree: string
  ): Promise<string> => {
    const match = new Match(matchName, redOne, redTwo, redThree, blueOne, blueTwo, blueThree);
    addToStore(match);

    // Save to IndexedDB
    await saveMatchesToDB([match, ...matches]);

    return match.id;
  };

  const updateMatch = async (id: string) => {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    updateInStore(id, match);
    await saveMatchesToDB(matches);
  };

  const deleteMatch = async (id: string) => {
    deleteFromStore(id);
    const updatedMatches = matches.filter(m => m.id !== id);
    await saveMatchesToDB(updatedMatches);
  };

  const duplicateMatch = async (id: string) => {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    const duplicatedMatch = new Match(
      `Copy of ${match.matchName}`,
      match.redOne,
      match.redTwo,
      match.redThree,
      match.blueOne,
      match.blueTwo,
      match.blueThree
    );

    // Copy phase data
    duplicatedMatch.auto = JSON.parse(JSON.stringify(match.auto));
    duplicatedMatch.teleop = JSON.parse(JSON.stringify(match.teleop));
    duplicatedMatch.endgame = JSON.parse(JSON.stringify(match.endgame));
    duplicatedMatch.notes = JSON.parse(JSON.stringify(match.notes));

    addToStore(duplicatedMatch);
    await saveMatchesToDB([duplicatedMatch, ...matches]);

    return duplicatedMatch.id;
  };

  const importMatch = async (match: Match): Promise<string> => {
    addToStore(match);
    await saveMatchesToDB([match, ...matches]);
    return match.id;
  };

  return {
    matches,
    createMatch,
    updateMatch,
    deleteMatch,
    duplicateMatch,
    importMatch,
    loadMatches,
  };
}
