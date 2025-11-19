import { isTranslationNeeded, translatePlatformOutputIntoUserLanguage } from './translator.js';
import {DatasetSchema, TenderDTO } from './interfaces.js';

export const CountryInfoMap: Record<string, { language: string; flag: string }> = {
    GER: { language: "German", flag: "🇩🇪" },
    FRA: { language: "French", flag: "🇫🇷" },
    ITA: { language: "Italian", flag: "🇮🇹" },
    ESP: { language: "Spanish", flag: "🇪🇸" }
};

export async function parseAndTranslateFields(tenders: TenderDTO[], countryCode: string): Promise<DatasetSchema[]> {
    const country = CountryInfoMap[countryCode];
    if (isTranslationNeeded(country.language)) {
        return await Promise.all(tenders.map(async (t: TenderDTO) => {
            let translatedTitle = await translatePlatformOutputIntoUserLanguage(t.title);
            let translatedOrganization = await translatePlatformOutputIntoUserLanguage(t.organization);
            let translatedType = await translatePlatformOutputIntoUserLanguage(t.type);

            return {
                country: country.flag,
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
            country: country.flag,
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

function convertStringToDate(dateString: string): Date {
    const [datePart, timePart] = dateString.split(", ");
    const [day, month, year] = datePart.split(".").map(Number);
    const fullYear = year < 100 ? 2000 + year : year;

    if (timePart) {
        const [hours, minutes] = timePart.split(":").map(Number);
        return new Date(fullYear, month - 1, day, hours, minutes);
    } else {
        return new Date(fullYear, month - 1, day);
    }
}
