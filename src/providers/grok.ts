import OpenAI from 'openai';
import { TranslationProvider } from './translationProvider';

export class GrokTranslationProvider implements TranslationProvider {
    name = 'Grok';

    async translate(text: string, targetLanguage: string, apiKey: string): Promise<string> {
        try {

            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.x.ai/v1',
            });

            const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.\n\nText: ${text}`;

            const response = await openai.chat.completions.create({
                model: "grok-beta",
                messages: [{ role: "system", content: "You are a helpful translator." }, { role: "user", content: prompt }],
                temperature: 0.3,
            });

            if (response.choices && response.choices.length > 0 && response.choices[0].message) {
                return response.choices[0].message.content?.trim() || "";
            }
            throw new Error('No translation returned from Grok');
        } catch (error) {
            console.error('Grok Error:', error);
            throw new Error('Failed to translate with Grok');
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const openai = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.x.ai/v1',
            });
            await openai.chat.completions.create({
                model: "grok-beta",
                messages: [{ role: "user", content: "test" }],
                max_tokens: 5
            });
            return true;
        } catch (error) {
            return false;
        }
    }
}
