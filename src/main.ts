import { Actor, log } from 'apify';
import { PlaywrightCrawler } from 'crawlee';
import { InputSchema } from './interfaces.js';
import {createRouterWithInput, router} from './routes.js';
import { setGroqApiKey, translateKeyword } from './translator.js';



await Actor.init();

const input = (await Actor.getInput()) as InputSchema ?? {};
const { keyword = 'Ultraschall', maxResults = '25', groqApiKey = '' } = input;

log.info(`🔵 Input received: keyword=${keyword}; maxResults=${maxResults}; groqApiKey=${groqApiKey.length > 0 ? '***': 'unset'}`);
setGroqApiKey(groqApiKey);
const keywordTranslated = await translateKeyword(keyword, "German")

const proxyConfiguration = await Actor.createProxyConfiguration();
const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    maxRequestsPerCrawl: 3,
    requestHandler: createRouterWithInput({ keyword: keywordTranslated, maxResults }),
    launchContext: {
        launchOptions: {
            args: [
                '--disable-gpu',
            ],
        },
    },
});


await crawler.run(['https://www.evergabe-online.de/start.html']);
await crawler.exportData('./storage/datasets/result.csv');
await Actor.exit();
