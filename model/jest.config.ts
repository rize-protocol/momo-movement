module.exports = {
  roots: ['<rootDir>/src', '<rootDir>/test'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: { '^.+\\.(ts|tsx)$': 'ts-jest', '^.+\\.(js)$': 'babel-jest' },
  moduleDirectories: ['node_modules', 'src', 'test'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageReporters: ['json', 'text', 'cobertura'],
  maxWorkers: 1,
  testTimeout: 30000,
  testEnvironment: 'node',
};
