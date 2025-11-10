import { log } from "apify";


let GROQ_API_KEY: string;
let userLanguage: string;


export async function translateKeyword(keyword: string, platformLanguage: string): Promise<string> {
    if (!hasApiKey()) {
        log.info(`❌ 🟠 Groq API Key not set. No translation possible.`);
        return keyword;
    }

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                    {
                        role: "system",
                        content: `You are a translator. Determine the user's language and translate the user's input 1:1 into ${platformLanguage}, no explaination necessary. If the input is already in ${platformLanguage}, just return the same as translation. Always output in a JSON format with the fields 'translation' and 'userLanguage'. Do not add any markup like \`\`\`json!`
                    },
                    {role: "user", content: keyword}
                ],
                temperature: 0.6,
            }),
        });

        const jsonData = await response.json();

        if ("error" in jsonData) {
            log.info(`❌ 🟠 Groq API unavailable: ${jsonData.error.message}`);
            return keyword;
        } else {
            log.info(`🟠 Groq API output: ${jsonData.choices[0].message.content}`);
            try {
                const parsed = JSON.parse(jsonData.choices[0].message.content);
                userLanguage = parsed.userLanguage;
                log.info(`🟠 Set user language to ${userLanguage}`);
                return parsed.translation;
            } catch (error) {
                log.info(`❌ 🟠 Failed to parse Groq response`);
                return keyword;
            }
        }
    } catch (error) {
        log.info(`❌ 🟠 Invalid Groq API key. No translation possible.`);
        setGroqApiKey("");
        return keyword;
    }
}

export function isTranslationNeeded(platformLanguage: string) {
    if (!hasApiKey()) {
        log.info(`❌ 🟠 Groq API Key not set. No translation possible.`);
        return false;
    }

    if (userLanguage.length > 0) {
        if (userLanguage.toLowerCase() != platformLanguage.toLowerCase()) {
            return true;
        } else {
            log.info(`🟠 User language and platform language are the same. No translation needed.`);
        }
    }

    return false;
}

export async function translatePlatformOutputIntoUserLanguage(toBeTranslated: string): Promise<string> {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: `You are a translator. Just translate the user's input 1:1 into ${userLanguage}, no explaination necessary.`},
                { role: "user", content: toBeTranslated }
            ],
            temperature: 0.6,
        }),
    });

    const jsonData = await response.json();

    if ("error" in jsonData) {
        return toBeTranslated;
    } else {
        const content = jsonData.choices[0].message.content;
        return content;
    }
}

export function setGroqApiKey(key: string) {
    GROQ_API_KEY = key;
}

function hasApiKey(): boolean {
    return GROQ_API_KEY != null && GROQ_API_KEY.length > 0;
}
