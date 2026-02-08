
import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface StringResource {
    name: string;
    value: string;
}

export interface StringArrayResource {
    name: string;
    items: string[];
}

export interface AndroidResources {
    strings: StringResource[];
    arrays: StringArrayResource[];
}

export class XmlUtils {
    private parser: XMLParser;
    private builder: XMLBuilder;

    constructor() {
        this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_"
        });
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            format: true
        });
    }

    async parse(filePath: string): Promise<AndroidResources> {
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const jsonObj = this.parser.parse(fileContent);

        const resources: AndroidResources = {
            strings: [],
            arrays: []
        };

        if (jsonObj.resources) {
            if (jsonObj.resources.string) {
                const strings = Array.isArray(jsonObj.resources.string) ? jsonObj.resources.string : [jsonObj.resources.string];
                for (const s of strings) {
                    resources.strings.push({ name: s['@_name'], value: s['#text'] });
                }
            }
            if (jsonObj.resources['string-array']) {
                const arrays = Array.isArray(jsonObj.resources['string-array']) ? jsonObj.resources['string-array'] : [jsonObj.resources['string-array']];
                for (const a of arrays) {
                    const items = Array.isArray(a.item) ? a.item : [a.item];
                    resources.arrays.push({ name: a['@_name'], items: items });
                }
            }
        }
        return resources;
    }

    generate(resources: AndroidResources): string {
        const obj: any = { resources: { string: [], 'string-array': [] } };

        for (const s of resources.strings) {
            obj.resources.string.push({
                '@_name': s.name,
                '#text': s.value
            });
        }

        for (const a of resources.arrays) {
            obj.resources['string-array'].push({
                '@_name': a.name,
                item: a.items
            });
        }

        // Clean up empty arrays if necessary, but fast-xml-parser handles it reasonably well.
        if (obj.resources.string.length === 0) delete obj.resources.string;
        if (obj.resources['string-array'].length === 0) delete obj.resources['string-array'];

        return this.builder.build(obj);
    }
}
