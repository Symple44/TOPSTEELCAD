@echo off
set DSTV_TEST_FILE=test-files/dstv/M1002.nc
npx vitest run src/TopSteelCAD/plugins/dstv/__tests__/DSTVImportWithLogs.test.ts