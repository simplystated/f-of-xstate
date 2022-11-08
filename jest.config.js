/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ["/node_mdoules/", "/dist/"],
  testMatch: ["**/tests/**/*.[jt]s?(x)", "tests/**/*.[jt]s?(x)", "tests/*.[jt]s?(x)"]
};