
import { GoogleGenAI, GenerateContentResponse, GenerateContentParameters, Content } from "@google/genai";

let ai: GoogleGenAI | null = null;

/**
 * Attempts to initialize the GoogleGenAI client with the provided API key.
 * @param apiKey The API key string.
 * @returns True if initialization was successful, false otherwise.
 */
export function initializeAiClient(apiKey: string): boolean {
    if (!apiKey || apiKey.trim() === '') {
        console.warn("Attempted to initialize AI client with an empty API key.");
        ai = null;
        return false;
    }
    try {
        ai = new GoogleGenAI({ apiKey });
        console.log("Gemini AI Client Instantiated.");
        return true;
    } catch (error) {
        console.error("Failed to instantiate GoogleGenAI with provided key:", error);
        ai = null;
        return false;
    }
}

/**
 * Returns the initialized AI client instance, or null if not initialized.
 */
export function getAiClient(): GoogleGenAI | null {
    return ai;
}

/**
 * Makes a call to the Gemini API using the initialized client.
 * @param promptContent The content of the prompt (string or Content object).
 * @param systemInstruction Optional system instruction for the model.
 * @returns The text response from the AI, or an error message string.
 */
export async function callGemini(promptContent: string | Content, systemInstruction?: string): Promise<string> {
    if (!ai) {
        // This message is a generic "not initialized", App.tsx handles specific key prompt.
        return "AI client is not initialized. Please ensure a valid API key has been provided.";
    }

    try {
        const request: GenerateContentParameters = {
            model: 'gemini-2.5-flash-preview-04-17',
            contents: promptContent,
            config: {
                // thinkingConfig: { thinkingBudget: 0 }, // Optional for faster responses
            },
        };

        if (systemInstruction && request.config) {
            request.config.systemInstruction = systemInstruction;
        }

        const response: GenerateContentResponse = await ai.models.generateContent(request);
        const textResponse = response.text;

        if (textResponse === null || textResponse === undefined) {
            console.warn("Gemini API returned a null or undefined text response.", response);
            return "AI response was empty or invalid.";
        }
        return textResponse;

    } catch (error: any) {
        console.error("Error calling Gemini API:", error);
        if (error.message) {
            // More robust check for API key validity errors
            const errorMsgLower = error.message.toLowerCase();
            if (errorMsgLower.includes("api key not valid") || 
                errorMsgLower.includes("permission_denied") || 
                errorMsgLower.includes("api_key_invalid") ||
                errorMsgLower.includes("invalid api key") || // Common variation
                errorMsgLower.includes("api key is invalid")) {
                // If the API call itself confirms the key is bad, de-initialize.
                ai = null; 
                return "Error: The provided Gemini API key is not valid or has insufficient permissions. AI features disabled.";
            }
            if (errorMsgLower.includes("fetch failed") || errorMsgLower.includes("failed to fetch")) {
                 return "Error: Network issue while trying to reach Gemini API. Please check your connection.";
            }
        }
        return "Sorry, I'm having trouble communicating with the ethereal planes right now. (AI Error)";
    }
}
