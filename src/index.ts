import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import path from 'path';

import packageFile from '../package.json';

const packageJson: any = packageFile;

const validateLicense = require('validate-npm-package-license');

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

console.log(dirname);

const readInterface = createInterface({ input, output });

const readTemplate = (file: string): string => readFileSync(`${dirname}/templates/${file}`).toString();

async function ask (text: string, defaultValue = ''): Promise<string> {
    if (defaultValue !== '')
        text += ` (${defaultValue})`;

    text += ' ';

    let response = await readInterface.question(text);

    if (response === '')
        response = defaultValue;

    return response;
};

async function confirm (text = 'Is this ok?'): Promise<boolean> {
    const confirmation = await ask(text, 'y');

    return confirmation.toLowerCase() === 'y';
}

async function confirmAndWriteBellowContent (fileName: string, content: string): Promise<void> {
    console.log(`\nAbout to write the content bellow to ${fileName}.\n`);

    console.log(content);

    if (await confirm())
        writeFileSync(fileName, content);
}

const folderName = path.basename(process.cwd());

async function init (): Promise<void> {
    console.log('Preparing package.json...');

    // #region Questions:
    const name = await ask('Package Name:', folderName);
    const version = await ask('Version:', '1.0.0');
    const description = await ask('Description:', '');

    let type: string | null = null;

    do {
        if (type !== null)
            console.log('Type can only be "commonjs" or "module".');

        type = await ask('Type:', 'module');
    } while (!['commonjs', 'module'].includes(type));

    let main = '';
    const exports: any = {};
    const typesVersions: any = {
        '*': {}
    };

    if (type === 'module') {
        const withCommonJS = (await ask('With Common JS Entrypoin?', 'y')).toLocaleLowerCase() === 'y';

        if (withCommonJS)
            main = await ask('Common JS Entry Point:', './dist/cjs/index.js');

        const modulePath = `./dist/${withCommonJS ? 'esm/' : ''}`;

        let numberOfEntrypoints = parseInt(await ask('Number of Module Entry Points?', '1'), 10);

        numberOfEntrypoints--;

        const mainEntryPoint = await ask('Main Entrypoint:', `${modulePath}index.js`);

        for (let i = 0; i < numberOfEntrypoints; i++) {
            const index = (i + 1);

            const entryPointPath = await ask(`Entrypoint-${index}'s Path:`, '');
            const entryPoint = await ask(`Entrypoint-${index}:`, `${modulePath}${entryPointPath}/index.js`);

            exports[`./${entryPointPath}`] = entryPoint;
            typesVersions['*'][entryPointPath] = [entryPoint.replace('.js', '.d.ts')];
        }

        exports['.'] = mainEntryPoint;
        typesVersions['*']['*'] = [mainEntryPoint.replace('.js', '.d.ts')];
    } else {
        main = await ask('Entry Point:', './dist/index.js');
    }

    const repository = await ask('Git Repository:');

    const keywords = (await ask('Keywords:')).split(' ');

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
    // #endregion

    // #region Filling Package.json:
    packageJson.name = name;
    packageJson.version = version;
    packageJson.description = description;

    packageJson.type = type;

    packageJson.main = main;
    if (main === '')
        delete packageJson.main;

    packageJson.exports = exports;
    packageJson.typesVersions = typesVersions;
    if (exports['.'] === undefined) {
        delete packageJson.exports;
        delete packageJson.typesVersions;
    }

    packageJson.repository = repository;
    packageJson.keywords = keywords;
    packageJson.author = author;
    packageJson.license = license;

    packageJson.funding = funding;
    if (funding === '')
        delete packageJson.funding;
    // #endregion

    // #region Saving Package.json:
    const newPackageJsonFile = `${process.cwd()}/package.json`;

    await confirmAndWriteBellowContent(newPackageJsonFile, JSON.stringify(packageJson, null, 4));
    // #endregion

    // #region Saving GitIgnore:
    const newGitIgnoreFile = `${process.cwd()}/.gitignore`;

    await confirmAndWriteBellowContent(newGitIgnoreFile, readTemplate('.gitignore'));
    // #endregion

    // #region Saving Github Workers:
    if (await confirm('Is the Repository on Github?')) {
        const githubFolder = `${process.cwd()}/.github`;

        if (!existsSync(githubFolder))
            mkdirSync(githubFolder);

        if (funding !== '') {
            const fundingFile = `${githubFolder}/funding.yml`;

            await confirmAndWriteBellowContent(fundingFile, `custom: ${funding}`);
        }

        const workflowFolder = `${githubFolder}/workflows`;

        await confirmAndWriteBellowContent(`${workflowFolder}/test.yml`, readTemplate('.github/workflows/test.yml'));

        await confirmAndWriteBellowContent(`${workflowFolder}/deploy.yml`, readTemplate('.github/workflows/deploy.yml'));
    }
    // #endregion
}

init()
    .then(() => {
        process.exit(0);
    })
    .catch(console.error);
