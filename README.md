# Create TS Cornucopia

## Description

This package was made as a way to easily port the project structure created for [ts-cornucopia](https://github.com/NDA-Software/ts-cornucopia) to make other packages and systems in the future using similar configurations.

## Table of Contents

- [Usage](#usage)
- [Configs](#configs)
- [License](/LICENSE.md)

## Usage

Enter the new project's directory and simply run this command:

```
npm init ts-cornucopia
```

Then you will be asked many questions that will help the script customize itself for your needs.
For the sake of simplicity, the questions which answers are directly copied to the project will not be covered.

### Keywords

With no default value, it will take the string received and separate (by spaces) into an array to be put inside package.json.

### Type

While the result (module|commonjs) is directly copied to package.json, this will change how part of the next questions behave:

If the answer is given as commonjs, the system will only assume all the entrypoints are cjs and so it will only produce cjs files by the end of the configuration and build.

If the answer is given as module, the system will give you an option to also support commonjs and if that is accepted the resulting package.json will instruct rollup to generate both cjs and mjs files organized in the dist folder after build.

### Entrypoints

The script will ask you how many entrypoints there are, this counts the main one, which means there always needs to be at least one.

Since the location of the entrypoints is defined by some of the previous questions, the script actually asks for the original .ts files instead and defines by itself how the files will be called in the exports.

### Eslint and Jest

The script will ask you if you want to have eslint and jest added, if not it will remove all relevant packages and script commands from the package.json file.

### Confirmations

After all basic questions are answered, the script will start saving all files, confirming in each step if you are ok with saving such files. It will overwrite if a file of the same name already exists in the folder.

## Configs

After everything is answered provided you confirmed all confirmations, there should be these files in the root of your project:

- .eslintrc.json
- .gitignore
- jest.config.mjs
- package.json
- rollup.config.mjs
- tsconfig.json

Aditionally if you plan on sending to github there can also be these files:

- .github/workflows/deploy.yml
- .github/workflows/test.yml
- .github/funding.yml

If you selected MIT as your license the system will also offer to create a LICENSE.md file.

### .eslintrc.json

File that configures eslint, can be used to change how the commands "npm run lint" and "npm run lint-fix" work and if eslint is properly configured in your machine can also help with checks and auto-formats during development.

### .gitignore

Lists files and folders that will be ignored by git.

### jest.config.mjs

File that configures jest, the testing package expected to be used in this project.

### package.json

Main package configurations.

### rollup.config.mjs

This file configures rollup, the module bundler of choice. This was coded to avoid much need to change between projects since it considers some variables of both package.json and tsconfig.json to decide its behaviors.

If tsconfig.json has the declaration compiler option set to false, rollup will not generate type files.

If package.json has more than one entry in exports, this will enable "preserveModules" making so that not all files will be bundled into a single one.

If package.json has its exports configured as commonjs and/or modules this will influence how rollup organizes the resulting files during build.

If some changes are needed to overwrite or add configurations to the commonjs or module files produced, there is regions called "Customizations" in the file that will help with that.

### tsconfig.json

This is the base typescript configuration file.

### .github/workflows/deploy.yml

This file configures how github will deploy the package to npmjs.org. It has no automatic triggers, so it is expected that you will make this run by yourself when needed.

For successful deploy, this file expects github to have two secrets:

- ACCESS: This can be either public or restricted. To avoid acidental public publishing.
- NPM_TOKEN: This is an access token for your npm account.

### .github/workflows/test.yml

This file configures how github will execute commands "npm run lint" and "npm run test" for testing. If you removed either eslint or jest, those also need to be removed from this file (or remove the file in itself) to avoid false negative results.

### .github/funding.yml

If you set a funding link, this only tell github what it is to show in your repository's page.
