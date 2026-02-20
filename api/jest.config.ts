/* eslint-disable */
import { readFileSync } from 'fs';

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8')
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

export default {
  displayName: '@monorepo-app/api',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.js'],
  forceExit: true,
  detectOpenHandles: true,
};
