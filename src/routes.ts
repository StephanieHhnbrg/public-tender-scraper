import { createPlaywrightRouter, Dataset } from 'crawlee';
import {Log, log} from "apify";
import { Page } from 'playwright';
import {DatasetSchema, TenderDTO } from './interfaces.js';
import {inputKeyword, updatePaginator, clickOnSearchButton, extractTendersFromTable, retrieveTenderTotal, extractTendersAndPaginateThroughTable, extractTendersAndPaginateThroughCards, waitForPageReload } from './tender-data-scrapper.js';
import {parseAndTranslateFields, CountryInfoMap } from './parser.js';
import { translateKeyword } from './translator.js';

export const router = createPlaywrightRouter();

export const CountryPlatformMap: Record<string, { searchUrl: string, startUrl: string }> = {
    GER: { searchUrl: 'https://www.evergabe-online.de/search.html', startUrl: 'https://www.evergabe-online.de/start.html' },
    IRL: { searchUrl: 'https://www.etenders.gov.ie/epps/prepareAdvancedSearch.do?type=cftFTS', startUrl: 'https://www.etenders.gov.ie/epps/prepareAdvancedSearch.do' },
    FR: { searchUrl: 'https://www.boamp.fr/pages/recherche/', startUrl: 'https://www.boamp.fr/pages/entreprise-accueil/' },
};

export function createRouterWithInput(keyword: string, maxResults: string, countries: string[]) {
    addDefaultHandlerToRouter(countries);
    addGermanHandler(keyword, maxResults);
    addIrishHandler(keyword, maxResults);
    addFrenchHandler(keyword, maxResults);
    log.info(`🔵 Input passed: keyword=${keyword}; maxResults=${maxResults}; countries=${countries}`);
    log.info('✅  Playwright router initialized');
    return router;
}

function addDefaultHandlerToRouter(countries: string[]) {
    router.addDefaultHandler(async ({enqueueLinks, log}) => {
        log.info('🔵 Default handler running');
        for (const c of countries) {
            let platform = CountryPlatformMap[c]?.searchUrl;
            if (platform) {
                try {
                    await enqueueLinks({
                        globs: [platform],
                        label: c,
                    });
                    log.info(`✅  Enqueued search with label ${c}`);
                } catch (e) {
                    log.info(`❌ ${e}`);
                }
            } else {
                log.info(`❌ 🔵 No handler available for ${c} - Available countries: ${Object.keys(CountryPlatformMap)}`);
            }
        }
    });
}




export function addGermanHandler(keyword: string, maxResults: string) {
    const countryCode = "GER";
    router.addHandler(countryCode, async ({request, page, log}) => {
        log.info(`🟣 Labeled handler running for: ${request.url}`);

        const keywordTranslated = await translateKeyword(keyword, CountryInfoMap[countryCode].language)
        await inputKeyword(page, log, countryCode, keywordTranslated);
        await updatePaginator(page, log, countryCode, maxResults);
        await clickOnSearchButton(page, log, countryCode);

        const tenders = await extractTendersAndPaginateThroughTable(page, log, countryCode, maxResults);
        const parsedTenders = await parseAndTranslateFields(tenders, countryCode);

        await Dataset.pushData(parsedTenders);
        log.info(`✅  Saved ${tenders.length} tenders`);
        log.info(`✅  Local dataset path: ./storage/datasets/default`);
    });
}

export function addIrishHandler(keyword: string, maxResults: string) {
    const countryCode = "IRL";
    router.addHandler(countryCode, async ({request, page, log}) => {
        log.info(`🟣 Labeled handler running for: ${request.url}`);

        const keywordTranslated = await translateKeyword(keyword, CountryInfoMap[countryCode].language)
        await inputKeyword(page, log, countryCode, keywordTranslated);
        await clickOnSearchButton(page, log, countryCode);
        await updatePaginator(page, log, countryCode, maxResults);
        await waitForPageReload(page, countryCode);

        const tenders = await extractTendersAndPaginateThroughTable(page, log, countryCode, maxResults);
        const parsedTenders = await parseAndTranslateFields(tenders, countryCode);

        await Dataset.pushData(parsedTenders);
        log.info(`✅  Saved ${tenders.length} tenders`);
        log.info(`✅  Local dataset path: ./storage/datasets/default`);
    });
}

export function addFrenchHandler(keyword: string, maxResults: string) {
    const countryCode = "FR";
    router.addHandler(countryCode, async ({request, page, log}) => {
        log.info(`🟣 Labeled handler running for: ${request.url}`);

        const keywordTranslated = await translateKeyword(keyword, CountryInfoMap[countryCode].language)
        await inputKeyword(page, log, countryCode, keywordTranslated);
        await clickOnSearchButton(page, log, countryCode);
        // await updatePaginator(page, log, countryCode, maxResults); // TODO:
        // await waitForPageReload(page, countryCode);

        const tenders = await extractTendersAndPaginateThroughCards(page, log, countryCode, maxResults);
        const parsedTenders = await parseAndTranslateFields(tenders, countryCode);

        await Dataset.pushData(parsedTenders);
        log.info(`✅  Saved ${tenders.length} tenders`);
        log.info(`✅  Local dataset path: ./storage/datasets/default`);
    });
}
