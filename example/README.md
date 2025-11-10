### Integration

## Local development with Python
1. Set up the environment \
   `cd example` \
   `python3 -m venv venv` \
   `source venv/bin/activate` \
   `pip install -r requirements.txt`

2. Get the API keys \
- Create an account and generate an Apify API key at https://console.apify.com/settings/integrations
- Create an account and generate a Groq API key at https://console.groq.com/keys

3. Run the application \
   Start the server with your API keys as environment variables: \
   `export FLASK_APP=main:app` \
   `export APIFY_API_KEY=apify_api_...` \
   `export GROQ_API_KEY=gsk_...` \
   `flask run --port 8000 --reload`


4. Test the endpoint
- Use curl to test from the command line:
```
  curl -X GET http://127.0.0.1:8080/crawl \
    -H "Content-Type: application/json" \
    -d '{"keyword": "Ultrasonic devices", "maxResults": "10"}'
```
