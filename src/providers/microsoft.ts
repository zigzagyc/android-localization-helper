import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { TranslationProvider } from './translationProvider';

export class MicrosoftTranslationProvider implements TranslationProvider {
    name = 'Microsoft Translator';
    private endpoint = 'https://api.cognitive.microsofttranslator.com';
    private region = 'global'; // Users might need to configure this, but global is default for many

    async translate(text: string, targetLanguage: string, apiKey: string): Promise<string> {
        try {
            const response = await axios.post(
                `${this.endpoint}/translate`,
                [{ 'Text': text }],
                {
                    params: {
                        'api-version': '3.0',
                        'to': targetLanguage
                    },
                    headers: {
                        'Ocp-Apim-Subscription-Key': apiKey,
                        'Ocp-Apim-Subscription-Region': this.region, // This might need to be user-configurable if using a regional resource
                        'Content-Type': 'application/json',
                        'X-ClientTraceId': uuidv4().toString()
                    }
                }
            );

            if (response.data && response.data.length > 0 && response.data[0].translations && response.data[0].translations.length > 0) {
                return response.data[0].translations[0].text;
            }
            throw new Error('No translation returned from Microsoft Translator');
        } catch (error) {
            console.error('Microsoft Translator Error:', error);
            throw new Error('Failed to translate with Microsoft Translator');
        }
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            await this.translate('test', 'es', apiKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}
