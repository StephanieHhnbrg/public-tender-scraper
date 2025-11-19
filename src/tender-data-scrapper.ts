import {Log, log} from "apify";
import { Page } from 'playwright';

const CountrySelectorMap: Record<string, { keywordInputSelector: string; paginatorSelector: string; paginatorLabelSelector: string; paginatorLabelPattern: RegExp; paginatorNextSelector: string; searchButtonSelector: string; responseUrl: string}> = {
    GER: {
        keywordInputSelector: '#keywordString',
        paginatorSelector: '#rowsPerPageChoice',
        paginatorLabelSelector: '.navigatorLabel div',
        paginatorLabelPattern: /von\s+(\d+)/,
        paginatorNextSelector: 'a.next',
        searchButtonSelector: '[data-evid="search_button"]',
        responseUrl: 'searchPanel-searchForm-submitButton',
    }
}

export async function inputKeyword(page: Page, log: Log, countryCode: string, keyword: string) {
    const selector = CountrySelectorMap[countryCode].keywordInputSelector;
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.fill(selector, keyword);
    log.info(`🟣 Input keyword: ${keyword}`);
}

export async function updatePaginator(page: Page, log: Log, countryCode: string, maxResults: string) {
    let optionValue = '3';
    if (maxResults !== '*') {
        const pageSizeMap: Record<string, string> = {'10': '0', '25': '1', '50': '2', '100': '3'};
        const maxResultsNum = parseInt(maxResults, 10);
        optionValue = pageSizeMap[maxResultsNum];
    }

    const selector = CountrySelectorMap[countryCode].paginatorSelector;
    await page.waitForSelector(selector, {state: 'visible'});
    await page.selectOption(selector, optionValue);
    log.info(`🟣 Update paginator`);
}

export async function clickOnSearchButton(page: Page, log: Log, countryCode: string) {
    let initTenderTotal = await retrieveTenderTotal(page, countryCode);
    log.info(`🟣 ${initTenderTotal} tenders available`);

    const selector = CountrySelectorMap[countryCode].searchButtonSelector;
    await page.waitForSelector(selector);
    await page.click(selector);
    log.info(`🟣 Clicked search button`);

    const expectedResponseUrl = CountrySelectorMap[countryCode].responseUrl;
    await page.waitForResponse((response) => {
        return response.url().includes(expectedResponseUrl) && response.status() === 200
    });

    let newTenderTotal = await retrieveTenderTotal(page, countryCode);
    while (newTenderTotal == initTenderTotal) {
        await page.waitForTimeout(3000);
        newTenderTotal = await retrieveTenderTotal(page, countryCode);
    }

    log.info(`🟣 New content loaded - ${newTenderTotal} tenders`);
}

export function extractTendersFromTable(page: Page) {
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

export async function retrieveTenderTotal(page: Page, countryCode: string): Promise<number> {
    try {
        const selector = CountrySelectorMap[countryCode].paginatorLabelSelector;
        const element = await page.$(selector);
        const labelText = element ? await element.textContent() : null;
        if (labelText && labelText.length > 0) {
            const pattern = CountrySelectorMap[countryCode].paginatorLabelPattern;
            let totalResultsArr = labelText.match(pattern);
            if (totalResultsArr && totalResultsArr.length > 1) {
                return parseInt(totalResultsArr[1], 10);
            }
        }
    } catch {
        log.info(`❌ 🟣 Failed extracting total from paginator label`);
        return await page.$$eval('tbody tr', rows => rows.length);
    }
    return await page.$$eval('tbody tr', rows => rows.length);
}

export async function extractTendersAndPaginateThroughTable(page: Page, log: Log, countryCode: string, maxResults: string) {
    let tenders = await extractTendersFromTable(page);

    let tenderTotal = await retrieveTenderTotal(page, countryCode);
    let paginateThrough = tenderTotal > tenders.length && maxResults == '*';

    log.info(`🟣 Extracted ${tenders.length}/${tenderTotal} tenders`);

    if (paginateThrough) {
        const selector = CountrySelectorMap[countryCode].paginatorNextSelector;
        const expectedResponseUrl = CountrySelectorMap[countryCode].responseUrl;

        while (true) {
            const nextButton = await page.$(selector);
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
                    response.url().includes(expectedResponseUrl) && response.url().includes('navigator-next') && response.status() === 200
                ),
                nextButton.click(),
                log.info(`🟣 Next page loaded`)
            ]);

            const pagedTenders = await extractTendersFromTable(page);
            tenders = tenders.concat(pagedTenders);
            log.info(`🟣 Extracted ${tenders.length}/${tenderTotal} tenders`);
        }
    }
    return tenders;
}
