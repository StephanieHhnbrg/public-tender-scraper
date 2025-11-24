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
    },
    IRL: {
        keywordInputSelector: '#Title.form-control',
        paginatorSelector: '.rppSelector',
        paginatorLabelSelector: '.rppSelector + strong + strong',
        paginatorLabelPattern: /(\d+)\s/,
        paginatorNextSelector: '#nextNav',
        searchButtonSelector: '[title="Search"]',
        responseUrl: 'etenders.gov.ie/epps',
    }
}


const CountryPageSizeMap: Record<string, Record<string, string>> = {
    GER: {'10': '0', '25': '1', '50': '2', '100': '3', 'max': '3'},
    IRL: {'10': '10', '25': '50', '50': '50', '100': '100', 'max': '100'},
};

const CountryTableColMap: Record<string, number[]> = { // title, link, refNum, org, loc, typ, releaseDate, deadline
    GER: [0, 0, 1, 2, 3, 4, 6, 5],
    IRL: [1, 1, 2, 3, -1, -1, 5, 6],
};

export async function inputKeyword(page: Page, log: Log, countryCode: string, keyword: string) {
    const selector = CountrySelectorMap[countryCode].keywordInputSelector;
    await page.waitForSelector(selector);
    await page.click(selector);
    await page.fill(selector, keyword);
    log.info(`🟣 Input keyword: ${keyword}`);
}

export async function updatePaginator(page: Page, log: Log, countryCode: string, maxResults: string) {
    const pageSizeMap: Record<string, string> = CountryPageSizeMap[countryCode];
    let optionValue = pageSizeMap['max'];
    if (maxResults !== '*') {
        // TODO: if user inputs in between value
        const maxResultsNum = parseInt(maxResults, 10);
        optionValue = pageSizeMap[maxResultsNum];
    }

    const selector = CountrySelectorMap[countryCode].paginatorSelector;
    await page.waitForSelector(selector, {state: 'visible'});
    await page.selectOption(selector, optionValue);
    log.info(`🟣 Update paginator to option ${optionValue}`);
}

export async function clickOnSearchButton(page: Page, log: Log, countryCode: string) {
    let initTenderTotal = await retrieveTenderTotal(page, countryCode);

    const selector = CountrySelectorMap[countryCode].searchButtonSelector;
    await page.waitForSelector(selector);
    await page.click(selector);
    log.info(`🟣 Clicked search button`);

    await waitForPageReload(page, countryCode);

    let newTenderTotal = await retrieveTenderTotal(page, countryCode);
    while (newTenderTotal == initTenderTotal) {
        await page.waitForTimeout(3000);
        newTenderTotal = await retrieveTenderTotal(page, countryCode);
    }

    log.info(`🟣 New content loaded - ${newTenderTotal} tenders`);
}

export async function waitForPageReload(page: Page, countryCode: string) {
    const expectedResponseUrl = CountrySelectorMap[countryCode].responseUrl;
    await page.waitForResponse((response) => {
        return response.url().includes(expectedResponseUrl) && response.status() === 200;
    });
}


export async function extractTendersFromTable(page: Page, countryCode: string): Promise<any[]> {
    const colIndices = CountryTableColMap[countryCode];
    const selector = 'tbody tr';
    await page.waitForSelector(selector);
    return page.$$eval(selector, (rows, colIndices: number[]) => {
        return rows.map(row => {
            const cols = row.querySelectorAll('td');
            return {
                    title: cols[colIndices[0]]?.innerText.trim(),
                    link: cols[colIndices[1]]?.querySelector('a')?.href || null,
                    referenceNumber: cols[colIndices[2]]?.innerText.trim(),
                    organization: cols[colIndices[3]]?.innerText.trim(),
                    location: cols[colIndices[4]]?.innerText.trim() || "",
                    type: cols[colIndices[5]]?.innerText.trim() || "",
                    releaseDateText: cols[colIndices[6]]?.innerText.trim() || "",
                    deadlineText: cols[colIndices[7]]?.innerText.trim() || "",
            };
        });
    }, colIndices);
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
    let tenders = await extractTendersFromTable(page, countryCode);

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

            const pagedTenders = await extractTendersFromTable(page, countryCode);
            tenders = tenders.concat(pagedTenders);
            log.info(`🟣 Extracted ${tenders.length}/${tenderTotal} tenders`);
        }
    }
    return tenders;
}
