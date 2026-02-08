
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TranslationProvider } from './translationProvider';

export class GeminiTranslationProvider implements TranslationProvider {
    name = 'Gemini';

    async translate(text: string, targetLanguage: string, apiKey: string): Promise<string> {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else.\n\nText: ${text}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const textResult = response.text();

            if (textResult) {
                return textResult.trim();
            }
            throw new Error('No translation returned from Gemini');
        } catch (error) {
            console.error('Gemini Error:', error);
            throw new Error('Failed to translate with Gemini');
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Test");
            await result.response;
            return true;
        } catch (error) {
            return false;
        }
    }
}
