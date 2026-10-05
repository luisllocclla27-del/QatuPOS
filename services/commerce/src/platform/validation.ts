import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import document from '../../../../docs/contracts/pilot.openapi.json';
const definitions=JSON.parse(JSON.stringify(document.components.schemas).replaceAll('#/components/schemas/','#/$defs/'));
const ajv=new Ajv2020({allErrors:true,strict:false,removeAdditional:false});
addFormats(ajv);
export const commandValid=ajv.compile({$defs:definitions,$ref:'#/$defs/PosCommand'});
export const loginValid=ajv.compile({$defs:definitions,$ref:'#/$defs/LoginRequest'});
export const snapshotValid=ajv.compile({$defs:definitions,$ref:'#/$defs/PosSnapshot'});
export const guestCodeValid=ajv.compile({$defs:definitions,$ref:'#/$defs/GuestCodeRequest'});
export const guestOrderValid=ajv.compile({$defs:definitions,$ref:'#/$defs/GuestOrderInput'});
export const guestSnapshotValid=ajv.compile({$defs:definitions,$ref:'#/$defs/GuestSnapshot'});
export const quoteValid=ajv.compile({$defs:definitions,$ref:'#/$defs/QuoteRequest'});

export const staffPasswordValid=ajv.compile({$defs:definitions,$ref:'#/$defs/StaffPasswordRequest'});
