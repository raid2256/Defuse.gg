import http.server
import json
import urllib.request
import urllib.error
import sys
import time

SERVER_API_URL = "https://defusegg.vercel.app/api/upload-stats"
LOCAL_PORT = 3000

last_sent_stats = {}
last_send_time = 0

class CS2GSIHandler(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        global last_sent_stats, last_send_time

        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        try:
            payload = json.loads(body.decode('utf-8'))
        except Exception:
            self.send_response(400)
            self.end_headers()
            return

        self.send_response(200)
        self.end_headers()

        player_data = payload.get("player", {})
        provider_data = payload.get("provider", {})

        steam_id = player_data.get("steamid") or provider_data.get("steamid", "76561198000000000")
        player_name = player_data.get("name", "Casual Gamer")
        match_stats = player_data.get("match_stats", {})

        kills = int(match_stats.get("kills", 0))
        deaths = int(match_stats.get("deaths", 0))
        assists = int(match_stats.get("assists", 0))
        mvps = int(match_stats.get("mvps", 0))
        score = int(match_stats.get("score", 0))

        current_stats = {
            "steamId": str(steam_id),
            "playerName": str(player_name),
            "kills": kills,
            "deaths": deaths,
            "assists": assists,
            "mvps": mvps,
            "score": score
        }

        now = time.time()
        if current_stats != last_sent_stats and (now - last_send_time) >= 5:
            last_sent_stats = current_stats
            last_send_time = now
            self.forward_to_vercel(current_stats)

    def forward_to_vercel(self, data):
        print(f"[+] Syncing CS2 Stats for {data['playerName']} -> K: {data['kills']} | D: {data['deaths']}")

        if "your-vercel-app.vercel.app" in SERVER_API_URL:
            print("[!] WARNING: Update SERVER_API_URL in tracker_bridge.py with your real Vercel URL!")
            return

        try:
            json_data = json.dumps(data).encode('utf-8')
            req = urllib.request.Request(
                SERVER_API_URL,
                data=json_data,
                headers={'Content-Type': 'application/json'},
                method='POST'
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    print("    -> Stats successfully updated on Global Leaderboard!")
        except urllib.error.URLError as e:
            print(f"    [X] Connection Error: {e.reason}")
        except Exception as e:
            print(f"    [X] Unexpected Error: {e}")

    def log_message(self, format, *args):
        return

def run_bridge():
    server_address = ('127.0.0.1', LOCAL_PORT)
    httpd = http.server.HTTPServer(server_address, CS2GSIHandler)
    print("=" * 60)
    print("   CS2 CASUAL & NON-PRIME GLOBAL STAT TRACKER BRIDGE")
    print("=" * 60)
    print(f"[*] Listening locally on http://127.0.0.1:{LOCAL_PORT}")
    print(f"[*] Target Vercel Endpoint: {SERVER_API_URL}")
    print("[*] Status: Active! Launch CS2 and enter any match.")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down bridge script.")
        sys.exit(0)

if __name__ == '__main__':
    run_bridge()
