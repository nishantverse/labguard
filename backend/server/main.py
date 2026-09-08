from flask import Flask, request, jsonify
from database.database import get_db, init_db

app = Flask(__name__)

init_db()


@app.route("/")
def home():
    return jsonify({
        "name": "LabGuard",
        "status": "running"
    })


@app.route("/api/heartbeat", methods=["POST"])
def heartbeat():
    data = request.json

    hostname = data.get("hostname")
    ip_address = data.get("ip_address")

    if not hostname:
        return jsonify({"error": "hostname required"}), 400

    db = get_db()

    computer = db.execute(
        "SELECT id FROM computers WHERE hostname = ?",
        (hostname,)
    ).fetchone()

    if computer:
        db.execute("""
            UPDATE computers
            SET ip_address = ?,
                status = 'online',
                last_seen = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (ip_address, computer["id"]))

    else:
        db.execute("""
            INSERT INTO computers
            (hostname, ip_address, status, last_seen)
            VALUES (?, ?, 'online', CURRENT_TIMESTAMP)
        """, (hostname, ip_address))

    db.commit()
    db.close()

    return jsonify({
        "status": "ok"
    })


if __name__ == "__main__":
    app.run(debug=True)