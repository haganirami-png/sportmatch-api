from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import urllib.request
import os
import base64

app = Flask(__name__)
CORS(app)

PLAYERS = []
MINUTES = {}
IMAGES = {}

def load_players():
    global PLAYERS, MINUTES, IMAGES
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
    try:
        with open("/root/all_players_images.json", "r", encoding="utf-8") as f:
            img_data = json.load(f)
            for p in img_data:
                pid = p.get("player_id", "")
                img_file = p.get("image_file", "")
                if pid and img_file and os.path.exists(img_file):
                    IMAGES[pid] = img_file
        print(f"תמונות: {len(IMAGES)} שחקנים")
    except Exception as e:
        print(f"שגיאה בתמונות: {e}")
        IMAGES = {}

load_players()

def similarity(name1, name2):
    words1 = set(name1.strip().split())
    words2 = set(name2.strip().split())
    if not words1 or not words2: return 0
    common = words1 & words2
    return int((len(common) / max(len(words1), len(words2))) * 100)

def get_photo(pid, fallback=""):
    if pid in IMAGES:
        try:
            with open(IMAGES[pid], "rb") as f:
                return "data:image/jpeg;base64," + base64.b64encode(f.read()).decode()
        except:
            pass
    return fallback

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
            if not mins:
                name_he = p.get("שם", "")
                for m in MINUTES.values():
                    if m.get("name", "") == name_he:
                        mins = m
                        break
            results.append({
                "name": p.get("שם"),
                "team": p.get("קבוצה", ""),
                "league": p.get("ליגה", "ליגה לאומית"),
                "goals": p.get("שערים", "0"),
                "yellow": p.get("צהובים", "0"),
                "red": p.get("אדומים", "0"),
                "birth": p.get("תאריך לידה", ""),
                "photo": get_photo(pid, p.get("תמונה", "")),
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
    return jsonify({"status": "ok", "players": len(PLAYERS), "minutes": len(MINUTES), "images": len(IMAGES)})

@app.route("/reload", methods=["GET"])
def reload():
    load_players()
    return jsonify({"status": "ok", "players": len(PLAYERS), "minutes": len(MINUTES), "images": len(IMAGES)})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)

@app.route("/photo/<player_id>", methods=["GET"])
def photo(player_id):
    if player_id in IMAGES:
        try:
            with open(IMAGES[player_id], "rb") as f:
                from flask import Response
                return Response(f.read(), mimetype="image/jpeg")
        except:
            pass
    return "", 404
