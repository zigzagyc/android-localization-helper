
import * as vscode from 'vscode';
import { TranslationService } from './services/translationService';
import { AddLanguagePanel } from './ui/addLanguagePanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Automated Localization Extension is active');

    const translationService = new TranslationService(context.secrets);

    let disposable = vscode.commands.registerCommand('vscode-automated-localization.addLanguage', () => {
        AddLanguagePanel.createOrShow(context.extensionUri, translationService);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() { }
