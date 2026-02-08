
const { XmlUtils } = require('./out/utils/xml');
const path = require('path');
const fs = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

async function testXmlUtils() {
    console.log('Testing XmlUtils...');
    const xmlUtils = new XmlUtils();
    const inputPath = path.resolve(__dirname, 'sample-android-project/app/src/main/res/values/strings.xml');

    try {
        const resources = await xmlUtils.parse(inputPath);
        console.log('Parsed resources:', JSON.stringify(resources, null, 2));

        if (resources.strings.length !== 2) throw new Error('Expected 2 strings');
        if (resources.arrays.length !== 1) throw new Error('Expected 1 array');
        if (resources.strings[0].name !== 'app_name') throw new Error('Expected app_name');

        // Test Generation
        const newXml = xmlUtils.generate(resources);
        console.log('Generated XML:', newXml);

        if (!newXml.includes('<string name="app_name">My Application</string>')) {
            throw new Error('Generated XML missing app_name');
        }

        console.log('XmlUtils Test Passed!');
    } catch (error) {
        console.error('XmlUtils Test Failed:', error);
        process.exit(1);
    }
}

testXmlUtils();
