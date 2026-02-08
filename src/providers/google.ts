import axios from 'axios';
import { TranslationProvider } from './translationProvider';

export class GoogleTranslationProvider implements TranslationProvider {
    name = 'Google Translate';

    async translate(text: string, targetLanguage: string, apiKey: string): Promise<string> {
        try {
            const response = await axios.post(
                `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
                {
                    q: text,
                    target: targetLanguage,
                    format: 'text'
                }
            );

            if (response.data && response.data.data && response.data.data.translations && response.data.data.translations.length > 0) {
                return response.data.data.translations[0].translatedText;
            }
            throw new Error('No translation returned from Google Translate');
        } catch (error) {
            console.error('Google Translate Error:', error);
            throw new Error('Failed to translate with Google Translate');
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            // Simple test translation to validate key
            await this.translate('test', 'es', apiKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}
