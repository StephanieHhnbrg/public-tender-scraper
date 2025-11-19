export interface InputSchema { // see .actor/input_schema.json
    keyword?: string,
    maxResults?: string,
    countries? : string,
    groqApiKey?: string,
}
export interface TenderDTO {
    title: string,
    link: string | null,
    referenceNumber: string,
    organization: string,
    location: string,
    type: string,
    releaseDateText? : string,
    deadlineText?: string,
}


export interface DatasetSchema { // see .actor/dataset_schema.json
    title: string,
    link: string | null,
    referenceNumber: string,
    organization: string,
    location: string,
    type: string,
    releaseDate: Date | null,
    deadline: Date | null,
}
