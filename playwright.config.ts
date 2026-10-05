import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',testMatch:'*.spec.ts',fullyParallel:false,workers:1,
  timeout:60000,expect:{timeout:12000},reporter:[['list'],['html',{open:'never'}]],
  use:{baseURL:'http://127.0.0.1:3100',viewport:{width:1440,height:1000},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'pnpm exec tsx tests/e2e/server.ts',url:'http://127.0.0.1:3100',timeout:120000,reuseExistingServer:false},
});
