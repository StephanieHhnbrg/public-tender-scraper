import {Log} from "apify";
import { Page } from 'playwright';

const CountrySelectorMap: Record<string, { keywordInputSelector: string; paginatorSelector: string; paginatorLabelSelector: string; paginatorLabelPattern: RegExp; paginatorNextSelector: string; paginatorActiveSelector?: string; searchButtonSelector: string; tenderSelector: string, responseUrl: string}> = {
    GER: {
        keywordInputSelector: '#keywordString',
        paginatorSelector: '#rowsPerPageChoice',
        paginatorLabelSelector: '.navigatorLabel div',
        paginatorLabelPattern: /von+(\d+)/,
        paginatorNextSelector: 'a.next',
        searchButtonSelector: '[data-evid="search_button"]',
        tenderSelector: 'tbody tr',
        responseUrl: 'searchPanel-searchForm-submitButton',
    },
    IRL: {
        keywordInputSelector: '#Title.form-control',
        paginatorSelector: '.rppSelector',
        paginatorLabelSelector: '.rppSelector + strong + strong',
        paginatorLabelPattern: /(\d+)/,
        paginatorNextSelector: '#nextNav',
        searchButtonSelector: '[title="Search"]',
        tenderSelector: 'tbody tr',
        responseUrl: 'etenders.gov.ie/epps',
    },
    FR: {
        keywordInputSelector: '#ft_input_search',
        paginatorSelector: '.fr-nav',
        paginatorLabelSelector: '.result-info strong',
        paginatorLabelPattern: /(\d+)/,
        paginatorNextSelector: 'li:has(> a.odswidget-pagination__page-link.odswidget-pagination__page-link--active) + li > a.odswidget-pagination__page-link',
        paginatorActiveSelector: '.odswidget-pagination__page-link--active',
        searchButtonSelector: 'a.fr-btn[role="button"][href="#resultarea"]',
        tenderSelector: '.fr-callout',
        responseUrl: 'search',
    },
    PT: {
        keywordInputSelector: '.b-i-search.flex-fill',
        paginatorSelector: 'na',
        paginatorLabelSelector: '.alert-info',
        paginatorLabelPattern: /(\d+)/,
        paginatorNextSelector: '.page-link',
        paginatorActiveSelector: '.page-item.active',
        searchButtonSelector: '#search_contratos',
        tenderSelector: 'tbody tr',
        responseUrl: 'resultados',
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

const TIME_OUT = 3000;

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
    let initTenderTotal = await retrieveTenderTotal(page, log, countryCode);

    const selector = CountrySelectorMap[countryCode].searchButtonSelector;
    await page.waitForSelector(selector);
    await page.click(selector);
    log.info(`🟣 Clicked search button`);

    await waitForPageReload(page, countryCode);

    let newTenderTotal = await retrieveTenderTotal(page, log, countryCode);
    while (newTenderTotal == initTenderTotal) {
        await page.waitForTimeout(TIME_OUT);
        newTenderTotal = await retrieveTenderTotal(page, log, countryCode);
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
    const selector = CountrySelectorMap[countryCode].tenderSelector;
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

export async function extractTendersFromCards(page: Page, countryCode: string): Promise<any[]> {
    // INFO: french-specific
    const selector = CountrySelectorMap[countryCode].tenderSelector;
    await page.waitForSelector(selector);
    return page.$$eval(selector, (cards) => {
        return cards.map(card => {
            const mainAttr = card.querySelectorAll('.fr-my-0');
            const detailAttr = card.querySelectorAll('.fr-grid-row span:nth-of-type(2)');

            const refNumText = (mainAttr[0] as HTMLElement)?.innerText || "";
            const refNum = refNumText.replace(/^\D+/, "").trim()

            let title = (mainAttr[2] as HTMLElement)?.innerText || "";
            let deadline = undefined;
            if (title.includes("Date limite de réponse le")) {
                deadline = title.split("le").reverse()[0];
                title = (mainAttr[3] as HTMLElement)?.innerText || "";
            }

            const releaseDate = (mainAttr[1] as HTMLElement)?.innerText.split("le").reverse()[0];
            return {
                    title: title,
                    link: `https://www.boamp.fr/pages/avis/?q=idweb:%22${refNum}%22`,
                    referenceNumber: refNum,
                    organization: (detailAttr[1] as HTMLElement)?.innerText || "",
                    location: (detailAttr[0] as HTMLElement)?.innerText.trim() || "",
                    type: (detailAttr[2] as HTMLElement)?.innerText || "",
                    releaseDateText: releaseDate,
                    deadlineText: deadline,
            };
        });
    });
}

export async function retrieveTenderTotal(page: Page, log: Log, countryCode: string): Promise<number> {
    try {
        const selector = CountrySelectorMap[countryCode].paginatorLabelSelector;
        const element = await page.$(selector);
        const labelText = element ? await element.textContent() : null;
        if (labelText && labelText.length > 0) {
            const pattern = CountrySelectorMap[countryCode].paginatorLabelPattern;
            let totalResultsArr = labelText.replace(' ', '').match(pattern);
            if (totalResultsArr && totalResultsArr.length > 1) {
                return parseInt(totalResultsArr[1], 10);
            }
        }
    } catch {
        log.info(`❌ 🟣 Failed extracting total from paginator label`);
    }
    return await page.$$eval(CountrySelectorMap[countryCode].tenderSelector, entries => entries.length);
}

export async function extractTendersAndPaginateThroughTable(page: Page, log: Log, countryCode: string, maxResults: string) {
    let tenders = await extractTendersFromTable(page, countryCode);

    let tenderTotal = await retrieveTenderTotal(page, log, countryCode);
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

export async function extractTendersAndPaginateThroughCards(page: Page, log: Log, countryCode: string, maxResults: string) {
    let tenders = await extractTendersFromCards(page, countryCode);

    let tenderTotal = await retrieveTenderTotal(page, log, countryCode);
    let paginateThrough = tenderTotal > tenders.length && maxResults == '*';

    log.info(`🟣 Extracted ${tenders.length}/${tenderTotal} tenders`);

    if (paginateThrough) {
        const selector = CountrySelectorMap[countryCode].paginatorNextSelector;

        let currentPage = 1;
        while (true) {
            const nextButton = await page.$(selector);
            if (!nextButton) {
                log.info('🟣 Extracted all results');
                break;
            }

           nextButton.click();
           currentPage++;
           waitForPageReload(page, countryCode);

            const activePageSelector = CountrySelectorMap[countryCode].paginatorActiveSelector!;
            let activeBttn = await page.$(activePageSelector);
            if (activeBttn) {
                let activeBttnLabel = await activeBttn.innerText();
                while (currentPage != parseInt(activeBttnLabel.trim(), 10)) {
                    await page.waitForTimeout(TIME_OUT);
                    activeBttn = await page.$(activePageSelector);
                    activeBttnLabel = await activeBttn?.innerText() || "";
                }
            }

            log.info(`🟣 Page ${currentPage} loaded`);

            const pagedTenders = await extractTendersFromCards(page, countryCode);
            tenders = tenders.concat(pagedTenders);
            log.info(`🟣 Extracted ${tenders.length}/${tenderTotal} tenders`);
        }
    }
    return tenders;
}
