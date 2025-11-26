import { kv } from '@vercel/kv';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Generate a short, URL-safe ID (8 characters)
function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const matchData = req.body;

    // Validate that we have match data
    if (!matchData || !Array.isArray(matchData)) {
      return res.status(400).json({ error: 'Invalid match data format' });
    }

    // Generate a unique short ID
    let id = generateShortId();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure the ID is unique (check for collisions)
    while (attempts < maxAttempts) {
      const existing = await kv.get(`match:${id}`);
      if (!existing) {
        break;
      }
      id = generateShortId();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return res.status(500).json({ error: 'Failed to generate unique ID' });
    }

    // Store the match data with a 30-day TTL (time to live)
    // 60 * 60 * 24 * 30 = 2592000 seconds
    await kv.set(`match:${id}`, matchData, { ex: 2592000 });

    // Return the share ID and full URL
    const shareUrl = `${req.headers.origin || 'https://strategy-board.vercel.app'}/m/${id}`;

    return res.status(200).json({
      success: true,
      id,
      shareUrl,
    });
  } catch (error) {
    console.error('Error saving match:', error);
    return res.status(500).json({
      error: 'Failed to save match',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
