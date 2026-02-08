import OpenAI from 'openai';
import { TranslationProvider } from './translationProvider';

export class OpenAITranslationProvider implements TranslationProvider {
    name = 'OpenAI (ChatGPT)';

    async translate(text: string, targetLanguage: string, apiKey: string): Promise<string> {
        try {
            const openai = new OpenAI({
                apiKey: apiKey,
            });

            const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.\n\nText: ${text}`;

            const response = await openai.chat.completions.create({
                model: "gpt-3.5-turbo", // Or user configurable
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
            });

            if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                return response.choices[0].message.content?.trim() || "";
            }
            throw new Error('No translation returned from OpenAI');
        } catch (error) {
            console.error('OpenAI Error:', error);
            throw new Error('Failed to translate with OpenAI');
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const openai = new OpenAI({ apiKey: apiKey });
            await openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [{ role: "user", content: "test" }],
                max_tokens: 5
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}
