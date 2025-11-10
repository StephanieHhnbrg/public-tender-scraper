from apify_client import ApifyClient
from flask import Flask, request, jsonify, make_response
import os

app = Flask(__name__)
client = ApifyClient(os.getenv("APIFY_API_KEY"))

@app.route("/crawl", methods=["GET", "OPTIONS"])
def crawl_public_tender():
    if request.method == 'OPTIONS':
        return handle_cors(request)

    print(f"🟡 User Input Keyword: {request.json.get('keyword')}")
    print(f"🟡 User Input MaxResults: {request.json.get('maxResults')}")

    run_input = {
        "keyword": request.json.get('keyword'),
        "maxResults": request.json.get('maxResults'),
        "groqApiKey": os.getenv("GROQ_API_KEY")
    }

    run = client.actor("stephaniehhnbrg/public-tender-scraper-germany").call(run_input=run_input)

    result = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        result.append(item)

    print(f"🟡 {len(result)} tenders retrieved")
    return create_response(request, {"data": result})


ALLOWED_ORIGINS = ["http://localhost:4200"]


def get_allowed_origin(request):
    origin = request.headers.get('Origin', '')
    if origin in ALLOWED_ORIGINS:
        return origin
    return ALLOWED_ORIGINS[0]


def handle_cors(request):
    response = make_response()
    response.status_code = 204
    response.headers['Access-Control-Allow-Origin'] = get_allowed_origin(request)
    response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


def create_response(request, data):
    response = make_response(jsonify(data))
    response.status_code = 200
    response.headers['Access-Control-Allow-Origin'] = get_allowed_origin(request)
    return response
