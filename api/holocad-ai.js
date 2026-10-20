export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'})}
  const key=process.env.OPENROUTER_API_KEY;
  if(!key)return res.status(503).json({error:'AI backend is not configured yet. Set the server-side OpenRouter credential in the deployment environment.'});
  try{
    const body=req.body||{};
    const model=String(body.model||'openai/gpt-oss-120b').trim();
    const question=String(body.question||'').trim();
    const context=String(body.context||'').slice(0,5000);
    const test=!!body.test;
    if(!question&&!test)return res.status(400).json({error:'Question is required.'});
    const system=`You are HoloCAD AI, an engineering education assistant inside a browser-based 3D engineering studio. Be accurate, concise and practical. The geometry is illustrative, not manufacturing-certified CAD. Explain mechanisms and engineering principles clearly. Distinguish conceptual guidance from certified engineering analysis. Never invent measurements that are not supplied. HoloCAD context:\n${context}`;
    const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json','HTTP-Referer':'https://anuveytq-sys.github.io/HoloCAD-3D/','X-Title':'HoloCAD Engineering Studio'},body:JSON.stringify({model,messages:[{role:'system',content:system},{role:'user',content:test?'Reply with exactly: HoloCAD AI connection OK.':question}],temperature:.25,max_tokens:700})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)return res.status(response.status).json({error:data?.error?.message||`OpenRouter request failed (${response.status})`});
    const answer=data?.choices?.[0]?.message?.content;
    if(!answer)return res.status(502).json({error:'The selected model returned no response.'});
    return res.status(200).json({answer,model});
  }catch(error){return res.status(500).json({error:error?.message||'AI service failed.'})}
}
