from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import urllib.request

app = Flask(__name__)
CORS(app)

# טוען שחקנים מ-URL או מקובץ מקומי
PLAYERS = []

def load_players():
    global PLAYERS
    try:
        # נסה לטעון מהשרת
        url = "http://103.214.23.203/players.json"
        with urllib.request.urlopen(url, timeout=10) as r:
            PLAYERS = json.loads(r.read().decode("utf-8"))
        print(f"טעינה מהשרת: {len(PLAYERS)} שחקנים")
    except Exception as e:
        print(f"שגיאה בטעינה: {e}")
        PLAYERS = []

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
            results.append({
                "name": p.get("שם"),
                "team": p.get("קבוצה", ""),
                "league": p.get("ליגה", "ליגה לאומית"),
                "goals": p.get("שערים", "0"),
                "yellow": p.get("צהובים", "0"),
                "red": p.get("אדומים", "0"),
                "birth": p.get("תאריך לידה", ""),
                "photo": p.get("תמונה", ""),
                "similarity": sim,
            })
    
    results.sort(key=lambda x: x["similarity"], reverse=True)
    return jsonify({"results": results[:5]})

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "players": len(PLAYERS)})

@app.route("/reload", methods=["GET"])
def reload():
    load_players()
    return jsonify({"status": "ok", "players": len(PLAYERS)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
