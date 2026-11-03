'use strict';
const crypto=require('crypto');
// Prefer a dedicated application secret. Asaas API key is a last-resort stable fallback;
// checkout is disabled without that key, so this never trusts an anonymous/random key.
const secret=process.env.RICO_PURCHASE_SECRET || process.env.SESSION_SECRET || process.env.ASAAS_API_KEY || '';
const kind='rico-browser-receipt-v1';
function signPurchaseProof(checkoutId){
  if(!secret || !checkoutId) return '';
  const payload=Buffer.from(JSON.stringify({kind,checkoutId,exp:Date.now()+5*365*24*60*60*1000})).toString('base64url');
  const mac=crypto.createHmac('sha256',secret).update('rico-browser-receipt|'+payload).digest('base64url');
  return payload+'.'+mac;
}
function verifyPurchaseProof(proof){
  try{
    if(!secret || typeof proof!=='string' || proof.length>2048) return null;
    const parts=proof.split('.');
    if(parts.length!==2) return null;
    const sig=crypto.createHmac('sha256',secret).update('rico-browser-receipt|'+parts[0]).digest('base64url');
    const a=Buffer.from(sig),b=Buffer.from(parts[1]);
    if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return null;
    const p=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8'));
    if(p.kind!==kind || !(p.exp>Date.now()) || typeof p.checkoutId!=='string' || !/^[a-zA-Z0-9_-]{9,200}$/.test(p.checkoutId)) return null;
    return p.checkoutId;
  }catch(_){return null}
}
module.exports={signPurchaseProof,verifyPurchaseProof};
