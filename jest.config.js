/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ["**/tests/**/*.[jt]s?(x)", "tests/**/*.[jt]s?(x)", "tests/*.[jt]s?(x)"]
};