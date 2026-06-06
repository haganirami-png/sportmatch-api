from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import urllib.request

app = Flask(__name__)
CORS(app)

PLAYERS = []
MINUTES = {}

def load_players():
    global PLAYERS, MINUTES
    try:
        url = "http://103.214.23.203/players.json"
        with urllib.request.urlopen(url, timeout=10) as r:
            PLAYERS = json.loads(r.read().decode("utf-8"))
        print(f"טעינה: {len(PLAYERS)} שחקנים")
    except Exception as e:
        print(f"שגיאה: {e}")
        PLAYERS = []
    try:
        url2 = "http://103.214.23.203/all_minutes.json"
        with urllib.request.urlopen(url2, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
            MINUTES = {p["player_id"]: p for p in data}
        print(f"דקות: {len(MINUTES)} שחקנים")
    except Exception as e:
        print(f"שגיאה בדקות: {e}")
        MINUTES = {}

load_players()

def similarity(name1, name2):
    words1 = set(name1.strip().split())
    words2 = set(name2.strip().split())
    if not words1 or not words2: return 0
    common = words1 & words2
    return int((len(common) / max(len(words1), len(words2))) * 100)

@app.route("/search", methods=["GET"])
def search():
    first = request.args.get("first", "").strip()
    last = request.args.get("last", "").strip()
    year = request.args.get("year", "").strip()
    full_name = f"{first} {last}"
    results = []
    for p in PLAYERS:
        sim = similarity(full_name, p.get("שם", ""))
        if sim >= 40:
            dob = p.get("תאריך לידה", "")
            if year and year in dob:
                sim = min(100, sim + 20)
            pid = p.get("player_id", "")
            mins = MINUTES.get(pid, {})
            results.append({
                "name": p.get("שם"),
                "team": p.get("קבוצה", ""),
                "league": p.get("ליגה", "ליגה לאומית"),
                "goals": p.get("שערים", "0"),
                "yellow": p.get("צהובים", "0"),
                "red": p.get("אדומים", "0"),
                "birth": p.get("תאריך לידה", ""),
                "photo": p.get("תמונה", ""),
                "apps": str(mins.get("games", 0)) if mins else "0",
                "minutes": str(mins.get("minutes", 0)) if mins else "0",
                "position": p.get("עמדה", "—"),
                "value_eur": p.get("שווי_eur", ""),
                "value_ils": p.get("שווי_ils", 0),
                "similarity": sim,
            })
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return jsonify({"results": results[:5]})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "players": len(PLAYERS), "minutes": len(MINUTES)})

@app.route("/reload", methods=["GET"])
def reload():
    load_players()
    return jsonify({"status": "ok", "players": len(PLAYERS), "minutes": len(MINUTES)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
