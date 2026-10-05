import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { commandValid } from '../../services/commerce/src/platform/validation.js';
const contract=JSON.parse(readFileSync(new URL('../../docs/contracts/pilot.openapi.json',import.meta.url),'utf8'));
const examples=contract.paths['/v1/pos/commands'].post.requestBody.content['application/json'].examples;
describe('strict pilot contract fixtures',()=>{
  for(const [name,example] of Object.entries(examples)) it('accepts '+name,()=>{
    expect(commandValid((example as {value:unknown}).value)).toBe(true);
  });
  for(const [index,example] of contract['x-invalid-command-examples'].entries()) it('rejects invalid fixture '+index,()=>{
    expect(commandValid(example.value ?? example.command ?? example)).toBe(false);
  });
});
