const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = 'https://www.football.org.il';

app.use(cors());
app.use(express.json());

const playersIndex = [
  {
    name: 'נתנאל חגאני',
    birthYear: '2000',
    playerId: '96293',
  },
];

function clean(html = '') {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 Chrome/125 Safari/537.36',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
    },
  });

  return await res.text();
}

function parsePlayer(html, playerId, fallbackName) {
  const text = clean(html);

  if (text.includes('Sorry, you have been blocked')) {
    throw new Error('Blocked by football.org.il');
  }

  const birth = text.match(/תאריך לידה:\s*([0-9/]+)/)?.[1] || '';

  const teamLeague = text.match(
    /נתוני השחקן בקבוצה:\s*([^(]+)\s*\(([^)]+)\)/
  );

  const goals = Number(
    text.match(/שערים\s+ליגה\s+(\d+)/)?.[1] ||
    text.match(/שערים הכל\s+(\d+)/)?.[1] ||
    0
  );

  const yellowCards = Number(text.match(/צהוב[^0-9]*(\d+)/)?.[1] || 0);
  const redCards = Number(text.match(/אדום[^0-9]*(\d+)/)?.[1] || 0);

  return {
    id: playerId,
    playerId,
    name: fallbackName,
    birth,
    birthYear: birth.split('/').pop() || '',
    team: teamLeague?.[1]?.trim() || 'לא נמצא',
    league: teamLeague?.[2]?.trim() || 'לא נמצא',
    season: '2025/2026',
    goals,
    apps: '—',
    yellowCards,
    redCards,
    totalMinutes: null,
    totalMinutesText: 'עדיין לא חושב',
    position: 'לא פורסם',
    similarity: 100,
    sourceUrl: `${BASE}/players/player/?player_id=${playerId}`,
  };
}

app.get('/search-player', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const birthYear = String(req.query.birthYear || '').trim();

    const matches = playersIndex.filter((p) => {
      const sameName = p.name.includes(name) || name.includes(p.name);
      const sameYear = !birthYear || p.birthYear === birthYear;
      return sameName && sameYear;
    });

    const players = [];

    for (const item of matches) {
      const url = `${BASE}/players/player/?player_id=${item.playerId}`;
      const html = await getHtml(url);
      players.push(parsePlayer(html, item.playerId, item.name));
    }

    return res.json({
      success: true,
      players,
      source: 'playersIndex + football.org.il player page',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      players: [],
      message: err.message,
    });
  }
});

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'SportMatch API' });
});

app.listen(PORT, () => {
  console.log(`SportMatch API running on ${PORT}`);
});
