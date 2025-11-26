import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the ID from the query parameters
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    // Retrieve the match data from Vercel KV
    const matchData = await kv.get(`match:${id}`);

    if (!matchData) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Return the match data
    return res.status(200).json({
      success: true,
      data: matchData,
    });
  } catch (error) {
    console.error('Error retrieving match:', error);
    return res.status(500).json({
      error: 'Failed to retrieve match',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
