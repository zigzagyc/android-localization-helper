
export interface TranslationProvider {
    name: string;
    translate(text: string, targetLanguage: string, apiKey?: string): Promise<string>;
    validateApiKey(apiKey: string): Promise<boolean>;
}

export interface TranslationResult {
    original: string;
    translated: string;
    warning?: string;
}
