#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';

interface CommitInfo {
  sha: string;
  fullSha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

try {
  const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const shortSha = sha.substring(0, 7);
  const date = execSync('git log -1 --format=%cI', { encoding: 'utf-8' }).trim();
  const message = execSync('git log -1 --format=%s', { encoding: 'utf-8' }).trim();
  const author = execSync('git log -1 --format=%an', { encoding: 'utf-8' }).trim();
  
  const commitInfo: CommitInfo = {
    sha: shortSha,
    fullSha: sha,
    message,
    author,
    date,
    url: `https://github.com/pranavgundu/Strategy-Board/commit/${sha}`
  };

  const content = `// do not edit manually - pranav :)
export const BUILD_COMMIT = ${JSON.stringify(commitInfo, null, 2)};
`;

  fs.writeFileSync('src/build.ts', content);
  console.log('Build info generated:', shortSha);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.warn('Warning: Could not get git commit info:', errorMessage);
  
  const fallback: CommitInfo = {
    sha: 'unknown',
    fullSha: 'unknown',
    message: 'Development build',
    author: 'Unknown',
    date: new Date().toISOString(),
    url: 'https://github.com/pranavgundu/Strategy-Board'
  };
  
  const content = `do not edit manually :) - pranav
export const BUILD_COMMIT = ${JSON.stringify(fallback, null, 2)};
`;

  fs.writeFileSync('src/build.ts', content);
  console.log('Build info generated (fallback)');
}
