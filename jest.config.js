module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,ts,jsx,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,ts,jsx,tsx}',
    '!src/**/*.test.{js,ts,jsx,tsx}',
    '!src/**/index.{js,ts}',
  ],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,ts,jsx,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,ts,jsx,tsx}',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  extensionsToTreatAsEsm: [],
  clearMocks: true,
  resetMocks: true,
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },
};
