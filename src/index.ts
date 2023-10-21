import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { execSync } from 'node:child_process';

import path from 'path';

const validateLicense = require('validate-npm-package-license');

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const readInterface = createInterface({ input, output });

const mainFolder = process.cwd();
const folderName = path.basename(mainFolder);

// #region Helper Functions:
const readTemplate = (file: string, isJson = false): string | any => {
    const data = readFileSync(`${dirname}/templates/${file}`).toString();

    if (!isJson)
        return data;

    return JSON.parse(data);
};

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
// #endregion

// #region Default Informations:
// #region Files Added During Build:
const eslintJson = readTemplate('.eslintrc.json', true);
const jestJson = readTemplate('jest.config.json', true);
const packageJson = readTemplate('package.json', true);
const tsCofigJson = readTemplate('tsconfig.json', true);

const gitIgnoreFile: string = readTemplate('.gitignore');

const testWorkflowFile: string = readTemplate('.github/workflows/test.yml');
const deployWorkflowFile: string = readTemplate('.github/workflows/deploy.yml');

let rollupFile: string = readTemplate('rollup.config.mjs');
// #endregion

const licenseFile = readTemplate('MIT_LICENSE.md');

const eslintDevDependencies = [
    '@typescript-eslint/eslint-plugin',
    'eslint',
    'eslint-config-prettier',
    'eslint-config-standard-with-typescript',
    'eslint-plugin-import',
    'eslint-plugin-n',
    'eslint-plugin-prettier',
    'eslint-plugin-promise'
];

const jestDevDependencies = [
    '@types/jest',
    'jest',
    'ts-jest'
];

const rollupCustomizationRegion = `// #region Customizations:
const configCjs = {
    output: [{}],
    plugins: []
};

const configEsm = {
    output: [{}],
    plugins: []
};
// #endregion`;
// #endregion

async function init (): Promise<void> {
    console.log('Preparing package.json...');

    // #region Questions:
    const name = await ask('Package Name:', folderName);
    const version = await ask('Version:', '1.0.0');
    const description = await ask('Description:', '');
    const repository = await ask('Git Repository:');
    const keywords = (await ask('Keywords:')).split(' ');
    const author = await ask('Author:');
    const funding = await ask('Funding Link:');

    // #region Exports:
    let type: string | null = null;

    do {
        if (type !== null)
            console.log('Type can only be "commonjs" or "module".');

        type = await ask('Type:', 'module');
    } while (!['commonjs', 'module'].includes(type));

    let main = '';
    let module = '';
    const exports: any = { '.': {} };
    const typesVersions: any = { '*': {} };

    const isModule = type === 'module';

    let cjsBasePath = './dist';
    let esmBasePath = './dist';
    const typeBasePath = 'dist/types';

    let withCommonJS = false;
    if (isModule) {
        withCommonJS = await confirm('With Common JS Entrypoints?');

        if (withCommonJS) {
            cjsBasePath += '/cjs';

            esmBasePath += '/esm';
        }
    }

    let numberOfEntrypoints: number | null = null;
    do {
        if (numberOfEntrypoints != null)
            console.log('Number of entrypoints must be a number and be higher than 0.');

        numberOfEntrypoints = parseInt(await ask('Number of Module Entry Points?', '1'), 10);
    } while (numberOfEntrypoints < 0 || isNaN(numberOfEntrypoints));

    numberOfEntrypoints--;

    const mainEntryPoint = await ask('Main Entry Point:', 'index.js');

    exports['.'] = {};
    typesVersions['*']['*'] = [mainEntryPoint.replace('.js', '.d.ts')];

    if (withCommonJS || !isModule) {
        main = `${cjsBasePath}/${mainEntryPoint}`;

        exports['.'].require = main;
    }

    if (isModule) {
        module = `${esmBasePath}/${mainEntryPoint}`;

        exports['.'].import = module;
    }

    typesVersions['*']['*'] = [
        `${typeBasePath}/${mainEntryPoint.replace('.js', '.d.ts')}`
    ];

    for (let i = 0; i < numberOfEntrypoints; i++) {
        const index = (i + 1);

        let entryPoint = await ask(`Entrypoint-${index}'s Original File:`, 'src/index.ts');
        entryPoint = entryPoint.substring(4);

        const entryPointArray = entryPoint.split('/');

        let entryPointFile = entryPointArray[entryPointArray.length - 1] as string;
        entryPointFile = entryPointFile.replace('.ts', '.js');

        entryPointArray.pop();

        let entryPointPath = entryPointArray.join('/');
        if (entryPointFile !== 'index.js') {
            if (entryPointPath !== '')
                entryPointPath += '/';

            entryPointPath += `${entryPointFile.replace('.js', '')}`;

            entryPointFile = `${entryPointPath}.js`;
        } else {
            entryPointFile = `${entryPointPath}/${entryPointFile}`;
        }

        exports[`./${entryPointPath}`] = {};

        if (withCommonJS || !isModule)
            exports[`./${entryPointPath}`].require = `${cjsBasePath}/${entryPointFile}`;

        if (isModule)
            exports[`./${entryPointPath}`].import = `${esmBasePath}/${entryPointFile}`;

        typesVersions['*'][entryPointPath] = [`${typeBasePath}/${entryPointFile.replace('.js', '.d.ts')}`];
    }
    // #endregion

    let license: string;
    let valid: any = {};

    do {
        for (const warning of valid?.warnings ?? [])
            console.warn(`Sorry, ${warning}.`);

        license = await ask('License:', 'MIT');

        valid = validateLicense(license);
    } while (valid.warnings !== undefined);

    const withEslint = await confirm('Do you want Eslint added and configured?');
    const withJest = await confirm('Do you want Jest added and configured?');
    // #endregion

    // #region Filling Package.json:
    packageJson.name = name;
    packageJson.version = version;
    packageJson.description = description;

    packageJson.type = type;

    packageJson.main = main;
    if (main === '')
        delete packageJson.main;

    packageJson.module = module;
    if (module === '')
        delete packageJson.module;

    packageJson.exports = exports;
    packageJson.typesVersions = typesVersions;

    packageJson.repository = repository;
    packageJson.keywords = keywords;
    packageJson.author = author;
    packageJson.license = license;

    packageJson.funding = funding;
    if (funding === '')
        delete packageJson.funding;

    delete packageJson.dependencies;

    if (!withEslint) {
        for (const dependency of eslintDevDependencies)
            delete packageJson.devDependencies[dependency];

        delete packageJson.scripts.lint;
        delete packageJson.scripts['lint-fix'];
    }

    if (!withJest) {
        for (const dependency of jestDevDependencies)
            delete packageJson.devDependencies[dependency];

        delete packageJson.scripts.test;
    }
    // #endregion

    // #region Saving Package.json:
    const newPackageJsonFile = `${mainFolder}/package.json`;

    await confirmAndWriteBellowContent(newPackageJsonFile, JSON.stringify(packageJson, null, 4));

    if (await confirm('Add ts-cornucopia to dependencies?'))
        execSync('npm i --save ts-cornucopia');
    // #endregion

    // #region Saving GitIgnore:
    const newGitIgnoreFile = `${mainFolder}/.gitignore`;

    await confirmAndWriteBellowContent(newGitIgnoreFile, gitIgnoreFile);
    // #endregion

    // #region Saving Github Workers:
    if (await confirm('Is the Repository on Github?')) {
        const githubFolder = `${mainFolder}/.github`;

        if (!existsSync(githubFolder))
            mkdirSync(githubFolder);

        if (funding !== '')
            await confirmAndWriteBellowContent(`${githubFolder}/funding.yml`, `custom: ${funding}\n`);

        const workflowFolder = `${githubFolder}/workflows`;

        await confirmAndWriteBellowContent(`${workflowFolder}/test.yml`, testWorkflowFile);

        await confirmAndWriteBellowContent(`${workflowFolder}/deploy.yml`, deployWorkflowFile);
    }
    // #endregion

    // #region Saving TSConfig:
    tsCofigJson.compilerOptions.declaration = true;

    await confirmAndWriteBellowContent(`${mainFolder}/tsconfig.json`, JSON.stringify(tsCofigJson, null, 4));
    // #endregion

    // #region Saving License File:
    if (license === 'MIT' && author !== '') {
        let licenseText = licenseFile;

        const currentYear = (new Date()).getFullYear().toString();
        licenseText = licenseText.replace('{{YEAR}}', currentYear);

        let authorName = author;

        const emailIndex = authorName.indexOf('<');
        if (emailIndex !== -1)
            authorName = authorName.substring(0, emailIndex);

        const webPageIndex = authorName.indexOf('(');
        if (webPageIndex !== -1)
            authorName = authorName.substring(0, webPageIndex);

        licenseText = licenseText.replace('{{AUTHOR}}', authorName);

        await confirmAndWriteBellowContent('LICENSE.md', licenseText);
    }
    // #endregion

    // #region Saving Eslint Config File:
    if (withEslint)
        await confirmAndWriteBellowContent(`${mainFolder}/.eslintrc.json`, JSON.stringify(eslintJson, null, 4));
    // #endregion

    // #region Saving Jest Config File:
    if (withJest)
        await confirmAndWriteBellowContent(`${mainFolder}/jest.config.json`, JSON.stringify(jestJson, null, 4));
    // #endregion

    // #region Saving Rollup Configuration:
    const replaceStartIndex = rollupFile.indexOf('// #region Customizations:');
    const replaceEndIndex = rollupFile.indexOf('// #endregion', replaceStartIndex) + 13;

    rollupFile = rollupFile.substring(0, replaceStartIndex) + rollupCustomizationRegion + rollupFile.substring(replaceEndIndex);

    await confirmAndWriteBellowContent(`${mainFolder}/rollup.config.mjs`, rollupFile);
    // #endregion
}

init()
    .then(() => {
        process.exit(0);
    })
    .catch(console.error);
