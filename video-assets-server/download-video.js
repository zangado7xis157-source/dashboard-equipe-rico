(async()=>{
  try{
    const r=await fetch('https://share.descript.com/view/mnMJk07dfX5',{redirect:'follow'});
    const text=await r.text();
    console.log('SHARE_PAGE_BEGIN');
    console.log(text.slice(0,12000));
    console.log('SHARE_PAGE_END');
  }catch(err){
    console.error('Falha ao consultar publicação:',err.message);
  }
})();
