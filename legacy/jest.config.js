module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'app/js/**/*.js',
    'server.js',
    '!app/js/angular-slider/**',
    '!app/js/patches/AudioContextMonkeyPatch.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary'],
};
