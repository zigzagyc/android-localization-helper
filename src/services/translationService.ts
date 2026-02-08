
import * as vscode from 'vscode';
import { TranslationProvider } from '../providers/translationProvider';
import { GoogleTranslationProvider } from '../providers/google';
import { MicrosoftTranslationProvider } from '../providers/microsoft';
import { OpenAITranslationProvider } from '../providers/openai';
import { GeminiTranslationProvider } from '../providers/gemini';
import { GrokTranslationProvider } from '../providers/grok';

export class TranslationService {
    private providers: Map<string, TranslationProvider>;

    constructor(private secretStorage: vscode.SecretStorage) {
        this.providers = new Map();
        this.registerProvider(new GoogleTranslationProvider());
        this.registerProvider(new MicrosoftTranslationProvider());
        this.registerProvider(new OpenAITranslationProvider());
        this.registerProvider(new GeminiTranslationProvider());
        this.registerProvider(new GrokTranslationProvider());
    }

    private registerProvider(provider: TranslationProvider) {
        this.providers.set(provider.name, provider);
    }

    getProviderNames(): string[] {
        return Array.from(this.providers.keys());
    }

    async getApiKey(providerName: string): Promise<string | undefined> {
        return await this.secretStorage.get(providerName);
    }

    async storeApiKey(providerName: string, apiKey: string): Promise<void> {
        await this.secretStorage.store(providerName, apiKey);
    }

    async translate(providerName: string, text: string, targetLanguage: string): Promise<string> {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }

        const apiKey = await this.getApiKey(providerName);
        if (!apiKey) {
            throw new Error(`API Key for ${providerName} not found. Please configure it.`);
        }

        return await provider.translate(text, targetLanguage, apiKey);
    }

    async validateProviderApiKey(providerName: string, apiKey: string): Promise<boolean> {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`Provider ${providerName} not found`);
        }
        return await provider.validateApiKey(apiKey);
    }
}
