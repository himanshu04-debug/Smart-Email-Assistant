import { useState } from 'react'
import { useEmailStore } from '@/store/emailStore'
import type { ReplyTone } from '@/types'

const TONES: ReplyTone[] = ['PROFESSIONAL','FRIENDLY','CONCISE','FORMAL','EMPATHETIC']
const URGENCY: Record<string,{bg:string;color:string}> = { CRITICAL:{bg:'#fef2f2',color:'#991b1b'}, HIGH:{bg:'#fff7ed',color:'#9a3412'}, MEDIUM:{bg:'#fefce8',color:'#854d0e'}, LOW:{bg:'#f0fdf4',color:'#166534'} }
const SENTIMENT: Record<string,{bg:string;color:string}> = { POSITIVE:{bg:'#f0fdf4',color:'#166534'}, NEUTRAL:{bg:'#f9fafb',color:'#374151'}, NEGATIVE:{bg:'#fef2f2',color:'#991b1b'} }

export default function AiPanel() {
  const { aiTab,setAiTab,aiSummary,aiReply,aiLoading,selectedEmail,selectedTone,setSelectedTone } = useEmailStore()
  const latency = ((aiReply?.latencyMs ?? 0)||(aiSummary?.latencyMs ?? 0))
  const tokens  = aiReply?.tokensUsed ?? aiSummary?.tokensUsed ?? null

  return (
    <div style={{width:272,borderLeft:'1px solid #e5e7eb',display:'flex',flexDirection:'column',background:'#f9fafb',flexShrink:0}}>
      <div style={{padding:'12px 14px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 4px #22c55e'}}/>
          <span style={{fontSize:13,fontWeight:600,color:'#111827'}}>Spring AI</span>
        </div>
        <span style={{fontSize:10,background:'#eef2ff',color:'#6366f1',padding:'2px 8px',borderRadius:99,fontWeight:600,border:'1px solid #c7d2fe'}}>GPT-4o · RAG</span>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,padding:'10px 12px 0'}}>
        {[{l:'Model',v:'GPT-4o',c:'#6366f1'},{l:'Vector',v:'pgvector',c:'#14b8a6'},{l:'Tokens',v:tokens?String(tokens):'—',c:'#f59e0b'},{l:'Latency',v:latency?(latency/1000).toFixed(1)+'s':'—',c:'#22c55e'}].map(s=>(
          <div key={s.l} style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:8,padding:'7px 10px'}}>
            <div style={{fontSize:16,fontWeight:600,color:s.c,fontFamily:'monospace'}}>{s.v}</div>
            <div style={{fontSize:10,color:'#9ca3af',marginTop:1}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',marginTop:10}}>
        {(['summary','reply','context'] as const).map(tab=>(
          <button key={tab} onClick={()=>setAiTab(tab)} style={{flex:1,padding:'8px 4px',border:'none',background:'none',fontSize:11,fontWeight:500,cursor:'pointer',textTransform:'capitalize',color:aiTab===tab?'#6366f1':'#6b7280',borderBottom:aiTab===tab?'2px solid #6366f1':'2px solid transparent'}}>{tab}</button>
        ))}
      </div>

      <div style={{flex:1,overflowY:'auto',padding:12}}>
        {aiLoading && (
          <div style={{textAlign:'center',padding:'32px 0'}}>
            <div style={{width:24,height:24,border:'2px solid #e5e7eb',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 10px'}}/>
            <div style={{fontSize:12,color:'#6b7280'}}>Spring AI thinking…</div>
          </div>
        )}

        {!aiLoading && aiTab==='summary' && (
          <div className="fade-in">
            {!aiSummary && <Placeholder text={selectedEmail?'Click AI Summarise above':'Select an email to start'}/>}
            {aiSummary && <>
              <Card label="Summary">
                <p style={{fontSize:12,color:'#374151',lineHeight:1.7,margin:0}}>{aiSummary.summary}</p>
                <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                  <Chip s={URGENCY[aiSummary.urgency]??URGENCY.MEDIUM}>{aiSummary.urgency} urgency</Chip>
                  <Chip s={SENTIMENT[aiSummary.sentiment]??SENTIMENT.NEUTRAL}>{aiSummary.sentiment.toLowerCase()}</Chip>
                  {aiSummary.deadline&&<Chip s={{bg:'#eff6ff',color:'#1d4ed8'}}>⏰ {aiSummary.deadline}</Chip>}
                </div>
              </Card>
              {aiSummary.keyPoints.length>0&&<Card label="Key points">{aiSummary.keyPoints.map((kp,i)=>(
                <div key={i} style={{display:'flex',gap:7,marginBottom:5,alignItems:'flex-start'}}>
                  <div style={{width:5,height:5,borderRadius:'50%',background:'#6366f1',marginTop:5,flexShrink:0}}/>
                  <span style={{fontSize:12,color:'#374151',lineHeight:1.55}}>{kp}</span>
                </div>
              ))}</Card>}
              {aiSummary.actionItems.length>0&&<Card label="Action items">{aiSummary.actionItems.map((a,i)=><ActionItem key={i} text={a}/>)}</Card>}
            </>}
          </div>
        )}

        {!aiLoading && aiTab==='reply' && (
          <div className="fade-in">
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:6}}>Reply tone</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {TONES.map(t=>(
                  <button key={t} onClick={()=>setSelectedTone(t)} style={{padding:'3px 9px',borderRadius:6,border:`1px solid ${selectedTone===t?'#14b8a6':'#e5e7eb'}`,background:selectedTone===t?'#f0fdfa':'none',color:selectedTone===t?'#0f766e':'#6b7280',fontSize:11,fontWeight:500,cursor:'pointer'}}>
                    {t[0]+t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            {!aiReply&&<Placeholder text={selectedEmail?'Click AI Generate Reply above':'Select an email to start'}/>}
            {aiReply&&<Card label="Generated reply">
              <div style={{fontSize:10,padding:'2px 8px',borderRadius:99,background:'#eef2ff',color:'#6366f1',fontWeight:600,border:'1px solid #c7d2fe',display:'inline-flex',gap:4,marginBottom:8}}>
                ✦ {aiReply.tone} · {aiReply.tokensUsed} tokens · {(aiReply.latencyMs/1000).toFixed(1)}s
              </div>
              <div style={{fontSize:12,color:'#374151',lineHeight:1.7,whiteSpace:'pre-wrap',background:'#f9fafb',border:'1px solid #f3f4f6',borderRadius:7,padding:'8px 10px'}}>{aiReply.reply}</div>
              <p style={{fontSize:11,color:'#9ca3af',marginTop:6}}>Click Reply in the email pane to edit and send via Gmail ↑</p>
            </Card>}
          </div>
        )}

        {!aiLoading && aiTab==='context' && (
          <div className="fade-in">
            <Card label="Spring AI stack">
              <Row k="Framework" v="Spring Boot 3.4"/><Row k="AI Client" v="ChatClient"/><Row k="LLM" v="OpenAI GPT-4o"/><Row k="Embedding" v="ada-3-small"/><Row k="Vector DB" v="pgvector HNSW"/><Row k="RAG top-k" v="3 docs"/>
            </Card>
            <Card label="Gmail integration">
              <Row k="Auth" v="OAuth2 (Google)"/><Row k="Sync" v="Every 60 seconds"/><Row k="Send" v="Gmail API RFC-2822"/><Row k="Scopes" v="read + send + modify"/>
            </Card>
            {(aiReply||aiSummary)&&<Card label="Last AI request">
              <Row k="Tokens" v={String(tokens??'—')}/><Row k="Latency" v={latency?(latency/1000).toFixed(2)+'s':'—'}/><Row k="At" v={(aiReply?.generatedAt||aiSummary?.generatedAt)?new Date(aiReply?.generatedAt??aiSummary?.generatedAt??'').toLocaleTimeString():'—'}/>
            </Card>}
          </div>
        )}
      </div>
    </div>
  )
}

function Card({label,children}:{label:string;children:React.ReactNode}) {
  return <div style={{background:'#fff',border:'1px solid #f3f4f6',borderRadius:8,padding:'10px 12px',marginBottom:10}}><div style={{fontSize:10,fontWeight:600,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:8}}>{label}</div>{children}</div>
}
function Chip({children,s}:{children:React.ReactNode;s:{bg:string;color:string}}) {
  return <span style={{fontSize:10,padding:'2px 8px',borderRadius:4,fontWeight:500,background:s.bg,color:s.color}}>{children}</span>
}
function ActionItem({text}:{text:string}) {
  const [done,setDone]=useState(false)
  return <div onClick={()=>setDone(v=>!v)} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'5px 8px',borderRadius:6,background:done?'#f0fdf4':'#f8f8ff',border:`1px solid ${done?'#bbf7d0':'#e0e7ff'}`,marginBottom:5,cursor:'pointer'}}><div style={{width:13,height:13,borderRadius:3,border:`1px solid ${done?'#22c55e':'#6366f1'}`,background:done?'#22c55e':'none',flexShrink:0,marginTop:1}}/><span style={{fontSize:12,color:done?'#15803d':'#374151',textDecoration:done?'line-through':'none',lineHeight:1.5}}>{text}</span></div>
}
function Row({k,v}:{k:string;v:string}) {
  return <div style={{display:'flex',justifyContent:'space-between',fontSize:11,padding:'3px 0',borderBottom:'1px solid #f9fafb'}}><span style={{color:'#9ca3af'}}>{k}</span><span style={{color:'#111827',fontWeight:500,fontFamily:'monospace',fontSize:10}}>{v}</span></div>
}
function Placeholder({text}:{text:string}) {
  return <div style={{padding:'24px 8px',textAlign:'center',color:'#9ca3af',fontSize:12,lineHeight:1.6}}><div style={{fontSize:28,marginBottom:8}}>✦</div>{text}</div>
}
