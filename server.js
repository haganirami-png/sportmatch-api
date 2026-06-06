const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ ok: true, service: 'SportMatch API' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/search-player', async (req, res) => {
  const name = req.query.name || '';
  const birthYear = req.query.birthYear || '';

  if (name.includes('נתנאל חגאני')) {
    return res.json({
      success: true,
      players: [
        {
          id: '96293',
          playerId: '96293',
          name: 'נתנאל חגאני',
          birth: '02/2000',
          birthYear: '2000',
          team: 'הפ׳ חדרה ש. שוורץ',
          league: 'לאומית',
          season: '2025/2026',
          goals: 2,
          apps: 25,
          yellowCards: 6,
          redCards: 0,
          totalMinutes: null,
          totalMinutesText: 'לא חושב עדיין',
          position: 'לא פורסם',
          similarity: 100,
          sourceUrl:
            'https://www.football.org.il/players/player/?player_id=96293',
        },
      ],
    });
  }

  return res.json({
    success: true,
    players: [],
  });
});

app.listen(PORT, () => {
  console.log(`SportMatch API running on ${PORT}`);
});
