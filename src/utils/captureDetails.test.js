import { describe, expect, it } from 'vitest';
import { validCaptureDetails } from './captureDetails.js';
const base={selectedCategory:'Rice',selectedScale:'acre',scaleQuantity:2};
describe('repeat scan details',()=>{
 it.each([['acre',2,true],['acre',0.5,true],['acre',0,false],['acre',-1,false],['acre','',false],['acre',Infinity,false],['tree',3,true],['tree',1.5,false],['personal',1,true]])('validates %s quantity %s', (selectedScale,scaleQuantity,expected)=>expect(validCaptureDetails({...base,selectedScale,scaleQuantity})).toBe(expected));
 it('requires a known scale and an explicit crop selection',()=>{
  expect(validCaptureDetails({...base,selectedCategory:''})).toBe(false);
  expect(validCaptureDetails({...base,selectedScale:'unknown'})).toBe(false);
 });
});
