import { createPlaywrightRouter, Dataset } from 'crawlee';
import {Log, log} from "apify";
import { convertStringToDate } from './helper-functions.js';
import { isTranslationNeeded, translatePlatformOutputIntoUserLanguage } from './translator.js';
import { Page } from 'playwright';
import {DatasetSchema, TenderDTO } from './interfaces.js';

export const router = createPlaywrightRouter();

export function createRouterWithInput({ keyword, maxResults }: { keyword: string; maxResults: string }) {
    addDefaultHandlerToRouter();
    addGermanHandler(keyword, maxResults);
    log.info(`🔵 Input passed: keyword=${keyword}; maxResults=${maxResults}`);
    log.info('✅  Playwright router initialized');
    return router;
}

function addDefaultHandlerToRouter() {
    router.addDefaultHandler(async ({enqueueLinks, log}) => {
        log.info('🔵 Default handler running');
        await enqueueLinks({
            globs: ['https://www.evergabe-online.de/search.html'],
            label: 'GER',
        });
        log.info('✅  Enqueued search with label GER');
    });
}

async function inputKeyword(page: Page, keyword: string, log: Log) {
    await page.waitForSelector('#keywordString');
    await page.click('#keywordString');
    await page.fill('#keywordString', keyword);
    log.info(`🟣 Input keyword: ${keyword}`);
}

async function updatePaginator(maxResults: string, page: Page) {
    let optionValue = '3';
    if (maxResults !== '*') {
        const pageSizeMap: Record<string, string> = {'10': '0', '25': '1', '50': '2', '100': '3'};
        const maxResultsNum = parseInt(maxResults, 10);
        optionValue = pageSizeMap[maxResultsNum];
    }
    await page.waitForSelector('#rowsPerPageChoice', {state: 'visible'});
    await page.selectOption('#rowsPerPageChoice', optionValue);
}

async function clickOnSearchButton(page: Page, log: Log) {
    await page.waitForSelector('[data-evid="search_button"]');

    await Promise.all([
        page.waitForResponse((response) =>
            response.url().includes('searchPanel-searchForm-submitButton') && response.status() === 200
        ),
        page.click('[data-evid="search_button"]'),
        log.info(`🟣 Clicked search button`),
    ]);
    log.info(`🟣 New content loaded`);
}

function extractTendersFromTable(page: Page) {
    return page.$$eval('tbody tr', (rows) => {
        return rows.map(row => {
            const cols = row.querySelectorAll('td');
            return {
                title: cols[0]?.innerText.trim(),
                link: cols[0]?.querySelector('a')?.href || null,
                referenceNumber: cols[1]?.innerText.trim(),
                organization: cols[2]?.innerText.trim(),
                location: cols[3]?.innerText.trim(),
                type: cols[4]?.innerText.trim(),
                releaseDateText: cols[6]?.innerText.trim(),
                deadlineText: cols[5]?.innerText.trim(),
            };
        });
    });
}

async function retrievePaginatorLabel(page: Page): Promise<number> {
    try {
        const labelText = await page.textContent('.navigatorLabel div');
        if (labelText) {
            let totalResultsArr = labelText.match(/von\s+(\d+)/);
            if (totalResultsArr && totalResultsArr.length > 1) {
                return parseInt(totalResultsArr[1], 10);
            }
        }
    } catch {
        return 0;
    }
    return 0;
}

async function extractTendersAndPaginateThroughTable(page: Page, maxResults: string, log: Log) {
    let tenders = await extractTendersFromTable(page);

    let paginatorLabel = await retrievePaginatorLabel(page);
    let totalResults = paginatorLabel > 0 ? paginatorLabel : tenders.length
    let paginateThrough = paginatorLabel > 0 && maxResults == '*';

    log.info(`🟣 Extracted ${tenders.length}/${totalResults} tenders`);

    if (paginateThrough) {
        while (true) {
            const nextButton = await page.$('a.next');
            if (!nextButton) {
                break;
            }

            const isDisabled = await nextButton.evaluate(
                (el) => el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true'
            );

            if (isDisabled) {
                log.info('🟣 Extracted all results');
                break;
            }

            await Promise.all([
                page.waitForResponse(response =>
                    response.url().includes('searchPanel-results-searchResults') && response.url().includes('navigator-next') && response.status() === 200
                ),
                nextButton.click(),
                log.info(`🟣 Next page loaded`)
            ]);

            const pagedTenders = await extractTendersFromTable(page);
            tenders = tenders.concat(pagedTenders);
            log.info(`🟣 Extracted ${tenders.length}/${totalResults} tenders`);
        }
    }
    return tenders;
}


async function parseAndTranslateFields(tenders: TenderDTO[]): Promise<DatasetSchema[]> {
    const platformLanguage = "German";
    if (isTranslationNeeded("German")) {
        return await Promise.all(tenders.map(async (t: TenderDTO) => {
            let translatedTitle = await translatePlatformOutputIntoUserLanguage(t.title);
            let translatedOrganization = await translatePlatformOutputIntoUserLanguage(t.organization);
            let translatedType = await translatePlatformOutputIntoUserLanguage(t.type);

            return {
                title: `${translatedTitle} | original: ${t.title}`,
                link: t.link,
                referenceNumber: t.referenceNumber,
                organization: `${translatedOrganization} | original: ${t.organization}`,
                location: t.location,
                type: `${translatedType} | original: ${t.type}`,
                releaseDate: t.releaseDateText ? convertStringToDate(t.releaseDateText) : null,
                deadline: t.deadlineText ? convertStringToDate(t.deadlineText) : null,
            };
        }));
    } else {
        return tenders.map((t: TenderDTO) => ({
            title: t.title,
            link: t.link,
            referenceNumber: t.referenceNumber,
            organization: t.organization,
            location: t.location,
            type: t.type,
            releaseDate: t.releaseDateText ? convertStringToDate(t.releaseDateText) : null,
            deadline: t.deadlineText ? convertStringToDate(t.deadlineText) : null,
        }));
    }
}

export function addGermanHandler(keyword: string, maxResults: string) {
    router.addHandler('GER', async ({request, page, log}) => {
        log.info(`🟣 Labeled handler running for: ${request.url}`);

        await inputKeyword(page, keyword, log);
        await updatePaginator(maxResults, page);
        await clickOnSearchButton(page, log);

        const tenders = await extractTendersAndPaginateThroughTable(page, maxResults, log);
        const parsedTenders = await parseAndTranslateFields(tenders);

        await Dataset.pushData(parsedTenders);
        log.info(`✅  Saved ${tenders.length} tenders`);
        log.info(`✅  Local dataset path: ./storage/datasets/default`);
    });
}
