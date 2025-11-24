import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { InputSchema } from './interfaces.js';
import {createRouterWithInput, router, CountryPlatformMap} from './routes.js';
import { setGroqApiKey } from './translator.js';



await Actor.init();

const input = (await Actor.getInput()) as InputSchema ?? {};
const { keyword = 'Ultraschall', maxResults = '25', countries = 'GER', groqApiKey = '' } = input;
const countryList = countries.split(",").map(item => item.trim());

log.info(`🔵 Input received: keyword=${keyword}; maxResults=${maxResults}; countries=${countryList}; groqApiKey=${groqApiKey.length > 0 ? '***': 'unset'}`);
setGroqApiKey(groqApiKey);

const proxyConfiguration = await Actor.createProxyConfiguration();
const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 3,
    requestHandler: createRouterWithInput(keyword, maxResults, countryList),
    launchContext: {
        launchOptions: {
            args: [
                '--disable-gpu',
            ],
        },
    },
});

for (const c of countryList) {
    let platform = CountryPlatformMap[c]?.startUrl;
    if (platform) {
        log.info(`🔵 Crawling ${platform}`);
        await crawler.run([platform]);
    }
}

await crawler.exportData('./storage/datasets/result.csv');
await Actor.exit();
