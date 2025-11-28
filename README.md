## Public Tender Scraper
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#)
[![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)](#)
[![Groq](https://img.shields.io/badge/Groq-AI-FF6600?logo=groq&logoColor=fff)](#)

<i>Public Tender Scraper</i> is an [Apify Actor](https://apify.com/actors) designed to collect public tender information from multiple government procurement portals.
While public tenders ensure transparency and fair competition, counteracting favoritism and corruption, they are not publicly advertised in one place.
Each government provides their own platform, if any, to let organizations publish tenders, on which businesses and suppliers can apply and bid.

Supported platforms:

| Country      | Country Code | National procurement portal                                                                                 |
|:-------------|:-------------|:------------------------------------------------------------------------------------------------------------|
| 🇩🇪 Germany | GER          | [e-Vergabe](https://www.evergabe-online.de/start.html)                                                      |
| 🇮🇪 Ireland | IRL          | [gov.ie eTenders](https://www.etenders.gov.ie/epps/viewCFTSAction.do)                                       |
| 🇫🇷 France  | FR           | [boamp](https://www.boamp.fr/pages/recherche/?sort=dateparution)                                            |
| 🇪🇺 tba     |              | [Link](https://commission.europa.eu/funding-tenders/tools-public-buyers/public-procurement-eu-countries_en) |


<i>Public Tender Scraper</i> can help businesses ...
- to automate steps in their procurement process
- to find suitable tenders faster and more efficiently across various platforms
- to go international and win contracts abroad

... by providing the following functionalities: <br />
🔎 Unified tender search across multiple national platforms <br />
🏗️ Automation-ready data for integration into procurement workflows <br />
💬 Automatic translation of queries and results to/from user's language <br />
💾 Flexible output formats: JSON and CSV <br />
🧩 Simple API integration for seamless embedding in systems <br />

### How to integrate?
1. Generate the API keys
- [Apify API Key](https://console.apify.com/settings/integrations)
- [Groq API Key](https://console.groq.com/keys) (optional, to enable translation feature)
2. Export env variables \
   `export APIFY_API_KEY=apify_api_...` \
   `export GROQ_API_KEY=gsk_...`
3. Invoke the Actor via curl
```bash
curl -X POST "https://api.apify.com/v2/acts/stephaniehhnbrg~public-tender-scraper/runs?token=$APIFY_API_KEY" \
    -d '{"keyword": "Print", "maxResults": "10", "countries": "GER, FR" "groqApiKey":"'"$GROQ_API_KEY"'"}' \
    -H 'Content-Type: application/json'
```
4. Retrieve the RUN-ID from the JSON response (data > id)
5. Check the status of the run (data > status)
```bash
curl "https://api.apify.com/v2/acts/stephaniehhnbrg~public-tender-scraper/runs/<RUN-ID>?token=$APIFY_API_TOKEN"
```
6. Retrieve the DATASET-ID from the JSON response (data > defaultDatasetId)
7. Fetch the dataset items, as soon as the run holds the status succeeded.
```bash
curl "https://api.apify.com/v2/datasets/<DATASET-ID>/items?view=overview"
```
Alternatively, open the Apify Console link from the status response (data > consoleUrl)
- https://console.apify.com/view/runs/<RUN-ID>



### Dev Notes

#### Folder Structure
The project was initialized using the Apify template <i>ts-crawlee-playwright-chrome</i>, which provides a standard structure:
```
.actor/                    # Actor metadata and I/O schemas
src/                       # Source code
storage/
├── datasets/              # Actor outputs (JSON + CSV)
├── key_value_stores/      # Input variables and run statistics
└── request_queues/        # Crawling data
```


#### Run Actor locally
1. Install Apify - [Guide](https://docs.apify.com/cli/docs/installation)
2. Configure input parameters (keyword, maxResults, groqApiKey, countries) by editing [INPUT.json](./storage/key_value_stores/default/INPUT.json)
    ```json
    {
      "keyword": "Print",
      "maxResults": "*",
      "countries": "GER, FR",
      "groqApiKey": "gsk_... optional"
    }
    ```

3. Run the actor locally
    ```bash
    apify run
    ```
4. Review the output
- as JSON objects: [./storage/datasets/default](./storage/datasets/default)
- as CSV file: [./storage/datasets/result.csv](./storage/datasets/result.csv)


#### Publish Actor
After running the following commands:
 ```bash
apify login
apify push
```

check out the [Apify console](https://console.apify.com/actors) and publish the actor via the  UI.


