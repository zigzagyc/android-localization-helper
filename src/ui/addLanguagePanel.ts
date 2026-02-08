
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TranslationService } from '../services/translationService';

export class AddLanguagePanel {
    public static currentPanel: AddLanguagePanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _translationService: TranslationService;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, translationService: TranslationService) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._translationService = translationService;

        this._update();
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'translate':
                        await this._handleTranslate(message);
                        return;
                    case 'checkApiKey':
                        await this._checkApiKey(message.provider);
                        return;
                    case 'saveApiKey':
                        await this._saveApiKey(message.provider, message.apiKey);
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public static createOrShow(extensionUri: vscode.Uri, translationService: TranslationService) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (AddLanguagePanel.currentPanel) {
            AddLanguagePanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'addLanguage',
            'Add Localization Language',
            column || vscode.ViewColumn.One,
            { enableScripts: true }
        );

        AddLanguagePanel.currentPanel = new AddLanguagePanel(panel, extensionUri, translationService);
    }

    public dispose() {
        AddLanguagePanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) { x.dispose(); }
        }
    }

    private async _update() {
        this._panel.webview.html = this._getHtmlForWebview();
        const providers = this._translationService.getProviderNames();
        this._panel.webview.postMessage({ command: 'setProviders', providers });
    }

    private async _checkApiKey(provider: string) {
        const apiKey = await this._translationService.getApiKey(provider);
        this._panel.webview.postMessage({ command: 'apiKeyStatus', provider, hasKey: !!apiKey });
    }

    private async _saveApiKey(provider: string, apiKey: string) {
        if (await this._translationService.validateProviderApiKey(provider, apiKey)) {
            await this._translationService.storeApiKey(provider, apiKey);
            vscode.window.showInformationMessage(`API Key for ${provider} saved successfully.`);
            this._panel.webview.postMessage({ command: 'apiKeyStatus', provider, hasKey: true });
        } else {
            vscode.window.showErrorMessage(`Invalid API Key for ${provider}.`);
            this._panel.webview.postMessage({ command: 'apiKeyStatus', provider, hasKey: false });
        }

    }


    private async _handleTranslate(message: any) {
        const editor = vscode.window.activeTextEditor;
        // Ideally we find the strings.xml automatically, but for now we might rely on open file or configuration
        // Let's search for strings.xml in the workspace
        const files = await vscode.workspace.findFiles('**/res/values/strings.xml', '**/build/**', 1);
        if (files.length === 0) {
            vscode.window.showErrorMessage('No strings.xml found in res/values/');
            return;
        }
        const sourceFile = files[0].fsPath;

        try {
            const { XmlUtils } = await import('../utils/xml'); // Dynamic import to avoid circular dep if any, though likely safe to import at top
            const xmlUtils = new XmlUtils();
            const resources = await xmlUtils.parse(sourceFile);

            vscode.window.showInformationMessage(`Translating ${resources.strings.length} strings and ${resources.arrays.length} arrays...`);

            this.translations = []; // Reset

            // Translate Strings
            for (const s of resources.strings) {
                try {
                    const translatedText = await this._translationService.translate(message.provider, s.value, message.targetLang);
                    let warning = '';
                    if (translatedText.length > s.value.length * 1.5) {
                        warning = 'Text is significantly longer than original';
                    }
                    this.translations.push({
                        key: s.name,
                        original: s.value,
                        translated: translatedText,
                        type: 'string',
                        warning
                    });
                } catch (e) {
                    this.translations.push({
                        key: s.name,
                        original: s.value,
                        translated: '',
                        type: 'string',
                        warning: `Error: ${e}`
                    });
                }
            }

            // Translate Arrays
            for (const a of resources.arrays) {
                const translatedItems: string[] = [];
                for (const item of a.items) {
                    try {
                        const t = await this._translationService.translate(message.provider, item, message.targetLang);
                        translatedItems.push(t);
                    } catch (e) {
                        translatedItems.push(item); // Fallback to original
                    }
                }
                this.translations.push({
                    key: a.name,
                    original: JSON.stringify(a.items),
                    translated: JSON.stringify(translatedItems),
                    type: 'array',
                    warning: ''
                });
            }

            // Show verification table
            this._panel.webview.postMessage({ command: 'showVerification', translations: this.translations });

        } catch (error) {
            vscode.window.showErrorMessage(`Translation failed: ${error}`);
        }
    }

    private translations: any[] = [];

    private async _applyTranslations(message: any) {
        // Generate new XML
        // We need to reconstruct the resource object
        const { XmlUtils } = await import('../utils/xml');
        const xmlUtils = new XmlUtils();

        const newResources: any = { strings: [], arrays: [] };

        for (const t of message.translations) {
            if (t.type === 'string') {
                newResources.strings.push({ name: t.key, value: t.translated });
            } else if (t.type === 'array') {
                newResources.arrays.push({ name: t.key, items: JSON.parse(t.translated) });
            }
        }

        const xmlContent = xmlUtils.generate(newResources);

        // Determine output path: values-<lang>/strings.xml
        // Assuming source was files[0], let's try to deduce path relative to workspace
        const files = await vscode.workspace.findFiles('**/res/values/strings.xml', '**/build/**', 1);
        if (files.length > 0) {
            const sourceDir = path.dirname(files[0].fsPath);
            const resDir = path.dirname(sourceDir);
            const targetDir = path.join(resDir, `values-${message.targetLang}`);
            const targetFile = path.join(targetDir, 'strings.xml');

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir);
            }

            fs.writeFileSync(targetFile, xmlContent);
            vscode.window.showInformationMessage(`Localized file created at ${targetFile}`);
        }
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Add Language</title>
             <style>
                body { padding: 20px; font-family: sans-serif; }
                select, input, button { display: block; margin-bottom: 10px; width: 100%; padding: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #333; color: white; }
                .warning { color: orange; font-weight: bold; }
            </style>
        </head>
        <body>
            <div id="configSection">
                <h2>Add Localization Language</h2>
                
                <label for="provider">Select Translation Provider:</label>
                <select id="provider"></select>

                <div id="apiKeySection" style="display:none;">
                    <label>API Key Required</label>
                    <input type="password" id="apiKeyInput" placeholder="Enter API Key">
                    <button id="saveApiKey">Save API Key</button>
                    <span id="keyStatus"></span>
                </div>

                <label for="targetLang">Target Language Code (e.g., es, fr, ja):</label>
                <input type="text" id="targetLang" placeholder="es">

                <button id="startTranslate">Start Translation</button>
            </div>

            <div id="verificationSection" style="display:none;">
                <h2>Verify Translations</h2>
                <div id="tableContainer"></div>
                <button id="applyTranslations">Apply and Save</button>
                <button id="backToConfig">Back</button>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                const providerSelect = document.getElementById('provider');
                const apiKeySection = document.getElementById('apiKeySection');
                
                let currentTranslations = [];

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'setProviders':
                            providerSelect.innerHTML = message.providers.map(p => \`<option value="\${p}">\${p}</option>\`).join('');
                            checkKey();
                            break;
                         case 'apiKeyStatus':
                            const statusSpan = document.getElementById('keyStatus');
                            if (!message.hasKey) {
                                apiKeySection.style.display = 'block';
                                statusSpan.textContent = " No key saved.";
                                statusSpan.style.color = "red";
                            } else {
                                apiKeySection.style.display = 'block'; // Keep visible to allow update
                                document.getElementById('apiKeyInput').placeholder = "Key saved (enter new to update)";
                                statusSpan.textContent = " Key saved.";
                                statusSpan.style.color = "green";
                            }
                            break;
                        case 'showVerification':
                            document.getElementById('configSection').style.display = 'none';
                            document.getElementById('verificationSection').style.display = 'block';
                            currentTranslations = message.translations;
                            renderTable(currentTranslations);
                            break;
                    }
                });

                function renderTable(translations) {
                    let html = '<table><tr><th>Key</th><th>Original</th><th>Translated</th><th>Warning</th></tr>';
                    translations.forEach((t, index) => {
                        html += \`<tr>
                            <td>\${t.key}</td>
                            <td>\${t.original}</td>
                            <td><input type="text" value="\${t.translated}" onchange="updateTranslation(\${index}, this.value)"></td>
                            <td class="warning">\${t.warning}</td>
                        </tr>\`;
                    });
                    html += '</table>';
                    document.getElementById('tableContainer').innerHTML = html;
                }

                window.updateTranslation = (index, value) => {
                    currentTranslations[index].translated = value;
                };

                function checkKey() {
                     vscode.postMessage({ command: 'checkApiKey', provider: providerSelect.value });
                }

                providerSelect.addEventListener('change', checkKey);

                document.getElementById('saveApiKey').addEventListener('click', () => {
                     vscode.postMessage({ 
                        command: 'saveApiKey', 
                        provider: providerSelect.value, 
                        apiKey: document.getElementById('apiKeyInput').value 
                    });
                });

                document.getElementById('startTranslate').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'translate',
                        provider: providerSelect.value,
                        targetLang: document.getElementById('targetLang').value
                    });
                });

                document.getElementById('applyTranslations').addEventListener('click', () => {
                    vscode.postMessage({
                        command: 'apply',
                        translations: currentTranslations,
                        targetLang: document.getElementById('targetLang').value
                    });
                });
                
                document.getElementById('backToConfig').addEventListener('click', () => {
                     document.getElementById('configSection').style.display = 'block';
                     document.getElementById('verificationSection').style.display = 'none';
                });
            </script>
        </body>
        </html>`;
    }
}
