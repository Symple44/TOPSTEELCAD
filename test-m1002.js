// Test rapide pour M1002
process.env.DSTV_TEST_FILE = 'test-files/dstv/M1002.nc';
require('child_process').execSync('npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVImportWithLogs.test.ts', {stdio: 'inherit'});