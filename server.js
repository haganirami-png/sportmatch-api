const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE = 'https://www.football.org.il';

app.use(cors());
app.use(express.json());

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
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8'
    }
  });

  return await res.text();
}

function findPlayerIds(html) {
  const ids = [];
  const regex = /player_id=(\d+)/g;
  let m;

  while ((m = regex.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }

  return ids.slice(0, 5);
}

function parsePlayer(html, playerId, nameQuery) {
  const text = clean(html);

  if (text.includes('Sorry, you have been blocked')) {
    throw new Error('Blocked by football.org.il');
  }

  const name =
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      ?.trim() || nameQuery;

  const birth = text.match(/תאריך לידה:\s*([0-9/]+)/)?.[1] || '';

  const teamLeague = text.match(/נתוני השחקן בקבוצה:\s*([^(]+)\s*\(([^)]+)\)/);

  const team = teamLeague?.[1]?.trim() || 'לא נמצא';
  const league = teamLeague?.[2]?.trim() || 'לא נמצא';

  const season =
    text.match(/עונה:\s*([0-9]{4}\/[0-9]{4})/)?.[1] || '2025/2026';

  const goals =
    Number(text.match(/שערים\s+ליגה\s+(\d+)/)?.[1] ||
    text.match(/שערים הכל\s+(\d+)/)?.[1] || 0);

  const yellowCards =
    Number(text.match(/צהוב[^0-9]*(\d+)/)?.[1] || 0);

  const redCards =
    Number(text.match(/אדום[^0-9]*(\d+)/)?.[1] || 0);

  return {
    id: playerId,
    playerId,
    name,
    birth,
    birthYear: birth.split('/').pop() || '',
    team,
    league,
    season,
    goals,
    apps: '—',
    yellowCards,
    redCards,
    totalMinutes: null,
    totalMinutesText: 'עדיין לא חושב',
    position: 'לא פורסם',
    similarity: 100,
    sourceUrl: `${BASE}/players/player/?player_id=${playerId}`
  };
}

app.get('/search-player', async (req, res) => {
  try {
    const name = String(req.query.name || '').trim();
    const birthYear = String(req.query.birthYear || '').trim();

    if (!name) {
      return res.json({ success: true, players: [] });
    }

    const searchUrl = `${BASE}/search-results/?text=${encodeURIComponent(name)}`;
    const searchHtml = await getHtml(searchUrl);

    let ids = findPlayerIds(searchHtml);

    const players = [];

    for (const id of ids) {
      const playerUrl = `${BASE}/players/player/?player_id=${id}`;
      const playerHtml = await getHtml(playerUrl);
      const player = parsePlayer(playerHtml, id, name);

      if (!birthYear || !player.birthYear || player.birthYear === birthYear) {
        players.push(player);
      }
    }

    return res.json({
      success: true,
      players,
      source: searchUrl
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      players: [],
      message: err.message
    });
  }
});

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'SportMatch API' });
});

app.listen(PORT, () => {
  console.log(`SportMatch API running on ${PORT}`);
});
