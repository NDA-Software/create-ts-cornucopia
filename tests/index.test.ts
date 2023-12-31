import { spawn } from 'child_process';
import { existsSync, mkdirSync, readdirSync } from 'fs';

const testFolder = './.temp/test/';
if (!existsSync(testFolder))
    mkdirSync(testFolder, { recursive: true });

const filesExpected = [
    '.eslintrc.json',
    '.github',
    '.gitignore',
    'jest.config.mjs',
    'node_modules',
    'package-lock.json',
    'package.json',
    'rollup.config.mjs',
    'src',
    'tests',
    'tsconfig.json'
];

test('Testing file generations...', (done) => {
    const app = spawn(`cd ${testFolder} && node ../../dist/index.cjs`, {
        shell: true
    });

    app.stdout.on('data', function (data) {
        console.log(data.toString());

        app.stdin.write('\n');
    });

    app.stdout.on('end', () => {
        const filesFound = readdirSync(testFolder);

        try {
            for (let i = 0; i < filesExpected.length; i++)
                expect(filesFound[i]).toBe(filesExpected[i]);
        } catch (err) {
            return done(err);
        }

        return done();
    });
}, 60000);
