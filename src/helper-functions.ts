import { log } from "apify";

export function convertStringToDate(dateString: string): Date {
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
