import { readFileSync, writeFileSync } from 'node:fs';

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'path';

import { fileURLToPath } from 'url';

const validateLicense = require('validate-npm-package-license');

const readInterface = createInterface({ input, output });

const folderName = path.basename(process.cwd());
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function ask (text: string, defaultValue = ''): Promise<string> {
    if (defaultValue !== '')
        text += ` (${defaultValue})`;

    text += ' ';

    let response = await readInterface.question(text);

    if (response === '')
        response = defaultValue;

    return response;
};

function readLocalJsonFile (localPath: string): JSON {
    const resolvedPath = path.resolve(dirname, localPath);

    const text = readFileSync(resolvedPath).toString();

    return JSON.parse(text);
}

async function init (): Promise<void> {
    const packageJson: any = readLocalJsonFile('./templates/package.json');

    const name = await ask('Package Name:', folderName);
    const version = await ask('Version:', '1.0.0');
    const description = await ask('Description:', '');

    let numberOfEntrypoints = parseInt(await ask('Number of Entry Points?', '1'), 10);

    numberOfEntrypoints--;

    const mainEntryPoint = await ask('Main Entrypoint:', './.build/index.js');

    const exports: any = {};
    const typesVersions: any = {
        '*': {}
    };

    for (let i = 0; i < numberOfEntrypoints; i++) {
        const index = (i + 1);

        const entryPointPath = await ask(`Entrypoint-${index}'s Path:`, '');
        const entryPoint = await ask(`Entrypoint-${index}:`, `./.build/${entryPointPath}/index.js`);

        exports[`./${entryPointPath}`] = entryPoint;
        typesVersions['*'][entryPointPath] = [entryPoint.replace('.js', '.d.ts')];
    }

    exports['.'] = mainEntryPoint;
    typesVersions['*']['*'] = [mainEntryPoint.replace('.js', '.d.ts')];

    const repository = await ask('Git Repository:');
    const keywords = await ask('Keywords:');
    const author = await ask('Author:');

    let license: string;
    let valid: any = {};

    do {
        for (const warning of valid?.warnings ?? [])
            console.warn(`Sorry, ${warning}.`);

        license = await ask('License:', 'MIT');

        valid = validateLicense(license);
    } while (valid.warnings !== undefined);

    const funding = await ask('Funding Link:');

    packageJson.name = name;
    packageJson.version = version;
    packageJson.description = description;

    packageJson.exports = exports;
    packageJson.typesVersions = typesVersions;

    packageJson.repository = repository;
    packageJson.keywords = keywords.split(' ');
    packageJson.author = author;
    packageJson.license = license;
    packageJson.funding = funding;

    console.log(packageJson);

    const newPackageJsonFile = `${process.cwd()}/package.json`;

    console.log(`About to write the above content to ${newPackageJsonFile}.`);
    const confirmation = await ask('Is this Ok?', 'yes');

    if (confirmation === 'yes')
        writeFileSync(newPackageJsonFile, JSON.stringify(packageJson));
}

init().catch(console.error);
