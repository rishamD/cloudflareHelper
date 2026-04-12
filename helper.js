import re
import json
import time
from curl_cffi import requests
from flask import Flask, request, jsonify

app = Flask(__name__)


def get_film_slugs(lb_user: str) -> dict:
    if not lb_user or "/" in lb_user:
        return None, {"error": "invalid user"}, 400

    time.sleep(0.4)  # polite delay

    target = f"https://letterboxd.com/{lb_user}/films/"

    response = requests.get(
        target,
        impersonate="chrome122",  # simulates a real Chrome browser via curl_cffi
    )

    if not response.ok:
        return None, {"error": "upstream failed"}, response.status_code

    html = response.text
    slugs = list(
        dict.fromkeys(
            m.group(1)
            for m in re.finditer(r'href="/film/([^"/]+)/', html)
        )
    )[:50]

    return slugs, None, None


@app.route("/", methods=["GET"])
def handle():
    try:
        lb_user = request.args.get("user", "")
        slugs, err, status = get_film_slugs(lb_user)

        if err:
            return jsonify(err), status

        response = jsonify({"slugs": slugs})
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Cache-Control"] = "public, max-age=60"
        return response

    except Exception as e:
        return (
            jsonify({"error": "uncaught", "details": str(e)}),
            500,
            {"Access-Control-Allow-Origin": "*"},
        )


if __name__ == "__main__":
    app.run()
