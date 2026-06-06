const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'SportMatch API',
  });
});

app.get('/health', (req, res) => {
  res.json({
    ok: true,
  });
});

app.get('/search-player', async (req, res) => {
  try {
    const name = req.query.name || '';
    const birthYear = req.query.birthYear || '';

    // בדיקה זמנית
    if (
      name.includes('נתנאל חגאני')
    ) {
      return res.json({
        success: true,
        players: [
          {
            id: '96293',
            name: 'נתנאל חגאני',
            birth: '2000',
            team: 'הפועל חדרה',
            league: 'ליגה א׳',
            goals: 2,
            apps: 18,
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
  } catch (err) {
    return res.status(500).json({
      success: false,
      players: [],
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `SportMatch API running on ${PORT}`
  );
});
