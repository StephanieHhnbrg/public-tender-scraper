import { isTranslationNeeded, translatePlatformOutputIntoUserLanguage } from './translator.js';
import {DatasetSchema, TenderDTO } from './interfaces.js';

export const CountryInfoMap: Record<string, { language: string; flag: string }> = {
    GER: { language: "German", flag: "🇩🇪" },
    IRL: { language: "English", flag: "🇮🇪" },
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
                releaseDate: t.releaseDateText ? convertStringToDate(t.releaseDateText, countryCode) : null,
                deadline: t.deadlineText ? convertStringToDate(t.deadlineText, countryCode) : null,
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
            releaseDate: t.releaseDateText ? convertStringToDate(t.releaseDateText, countryCode) : null,
            deadline: t.deadlineText ? convertStringToDate(t.deadlineText, countryCode) : null,
        }));
    }
}

export const CountryDateFormatMap: Record<string, { seperator: string; dateSeperator: string }> = {
    GER: { seperator: ", ", dateSeperator: "." },
    IRL: { seperator: " ", dateSeperator: "/" },
};

function convertStringToDate(dateString: string, countryCode: string): Date {
    const dateFormat = CountryDateFormatMap[countryCode];
    const [datePart, timePart] = dateString.split(dateFormat.seperator);
    const [day, month, year] = datePart.split(dateFormat.dateSeperator).map(Number);
    const fullYear = year < 100 ? 2000 + year : year;

    if (timePart) {
        const [hours, minutes, seconds] = timePart.split(":").map(Number);
        return new Date(fullYear, month - 1, day, hours, minutes);
    } else {
        return new Date(fullYear, month - 1, day);
    }
}
