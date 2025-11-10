## Public Tender Scraper
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](#)
[![Playwright](https://custom-icon-badges.demolab.com/badge/Playwright-2EAD33?logo=playwright&logoColor=fff)](#)

<i>Public Tender Scraper</i> is an [Apify Actor](https://apify.com/actors) designed to collect public tender information from multiple government procurement portals.
While public tenders ensure transparency and fair competition, counteracting favoritism and corruption, they are not publicly advertised in one place.
Each government provides their own platform, if any, to let organizations publish tenders, on which businesses and suppliers can apply and bid.

Supported platforms:

| Country      | National procurement portal                                                                              |
|:-------------|:---------------------------------------------------------------------------------------------------------|
| 🇩🇪 Germany | [e-Vergabe](https://www.evergabe-online.de/start.html)                                                   |
| 🇪🇺 tba     | [Link](https://commission.europa.eu/funding-tenders/tools-public-buyers/public-procurement-eu-countries_en) |


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
1. Generate an Apify API Key
2. Generate an Groq API Key (optional, to enable translation feature)
3. Invoke the Actor programmatically
```typescript
  // TODO: insert code
```



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
2. Configure input parameters (keyword, maxResults, groqApiKey) by editing [INPUT.json](./storage/key_value_stores/default/INPUT.json)
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


