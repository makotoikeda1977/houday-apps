/* 個別支援計画・受給者証 期限トラッカー */
(function(){
  var BUY_URL='https://note.com/houday';
  var KEY='hd_keikaku-tracker_';
  var FREE_LIMIT=10, CERT_ALERT=60;
  var settings={planMonths:6,monMonths:6};
  var children=[];
  var $=function(id){return document.getElementById(id)};
  var pad=function(n){return ('0'+n).slice(-2)};
  function parse(s){ if(!s) return null; var p=s.split('-'); if(p.length<3) return null; var d=new Date(+p[0],+p[1]-1,+p[2]); return isNaN(d)?null:d }
  function iso(d){ return d?d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()):'' }
  function fmt(d){ return d?d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate()):'—' }
  function today(){ var t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()) }
  function addMonths(d,m){ var r=new Date(d.getFullYear(),d.getMonth()+m,d.getDate()); if(r.getDate()!==d.getDate()) r=new Date(r.getFullYear(),r.getMonth(),0); return r }
  function deadlineFrom(s,months){ var d=parse(s); if(!d) return null; var r=addMonths(d,months); r.setDate(r.getDate()-1); return r }
  function daysUntil(d){ return Math.round((d-today())/86400000) }
  function statusOf(d,missing){ if(!d) return missing?{s:'ng',days:-9999,label:'未作成'}:{s:'none',days:99999,label:'—'}; var n=daysUntil(d); if(n<0) return {s:'ng',days:n,label:'超過 '+(-n)+'日'}; if(n<=30) return {s:'warn',days:n,label:'あと'+n+'日'}; if(n<=60) return {s:'attention',days:n,label:'あと'+n+'日'}; return {s:'ok',days:n,label:'あと'+n+'日'} }
  var RANK={ng:0,warn:1,attention:2,ok:3,none:4};
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) }
  function load(){ try{children=JSON.parse(localStorage.getItem(KEY+'children')||'[]')||[]}catch(e){children=[]} try{var s=JSON.parse(localStorage.getItem(KEY+'settings')||'{}'); if(s&&s.planMonths) settings=s}catch(e){} }
  function save(){ try{localStorage.setItem(KEY+'children',JSON.stringify(children)); localStorage.setItem(KEY+'settings',JSON.stringify(settings))}catch(e){alert('保存に失敗しました（容量不足の可能性）')} }
  function isPro(){ return window.HDLicense&&window.HDLicense.isPro() }
  function proOnly(){ window.HDLicense.prompt({buyUrl:BUY_URL,text:'この機能はPro版で利用できます。購入時のライセンスキーを入力してください。'}) }

  // 児童の期限情報をまとめて計算
  function calc(c){
    var plan=deadlineFrom(c.planDate,settings.planMonths);
    var mon=deadlineFrom(c.monitoringDate||c.planDate,settings.monMonths);
    var cert=parse(c.certExpire);
    var o={plan:plan,mon:mon,cert:cert,planSt:statusOf(plan,true),monSt:statusOf(mon,!!c.planDate),certSt:statusOf(cert,false)};
    var arr=[o.planSt,o.monSt,o.certSt].filter(function(x){return x.s!=='none'});
    o.worst=arr.length?arr.reduce(function(a,b){return RANK[a.s]<=RANK[b.s]?(a.days<=b.days?a:b):b}):{s:'none',days:99999,label:'—'};
    if(o.worst.s==='none') o.worst={s:'ok',days:99999,label:'—'};
    return o;
  }
  function pill(st){ var t={ng:'期限超過',warn:'30日以内',attention:'31〜60日',ok:'OK',none:'—'}[st.s]; return '<span class="pill '+(st.s==='none'?'muted':st.s)+'">'+t+'</span>' }

  function render(){
    var pro=isPro(); $('planBadge').textContent=pro?'Pro':'Free'; $('planBadge').className='badge'+(pro?' pro':''); $('proBtn').textContent=pro?'Pro有効':'Pro版';
    $('limitAlert').classList.toggle('hidden',pro||children.length<FREE_LIMIT);
    // 事業所フィルタ候補
    var offices=[]; children.forEach(function(c){ if(c.office&&offices.indexOf(c.office)<0) offices.push(c.office) }); offices.sort();
    var fo=$('filterOffice'); var cur=fo.value; fo.innerHTML='<option value="">すべて</option>'+offices.map(function(o){return '<option value="'+esc(o)+'">'+esc(o)+'</option>'}).join(''); fo.value=cur;
    $('officeList').innerHTML=offices.map(function(o){return '<option value="'+esc(o)+'">'}).join('');
    // KPI
    var k={ng:0,warn:0,cert:0}; var rows=children.map(function(c){ var r=calc(c); if(r.worst.s==='ng')k.ng++; else if(r.worst.s==='warn')k.warn++; if(r.cert&&daysUntil(r.cert)<=CERT_ALERT)k.cert++; return {c:c,r:r} });
    $('kpiOverdue').textContent=k.ng; $('kpiSoon').textContent=k.warn; $('kpiCert').textContent=k.cert; $('kpiTotal').textContent=children.length;
    // フィルタ・ソート
    var fOff=fo.value, fSt=$('filterStatus').value, sort=$('sortOrder').value;
    var list=rows.filter(function(x){ return (!fOff||x.c.office===fOff)&&(!fSt||x.r.worst.s===fSt) });
    list.sort(function(a,b){ if(sort==='name') return (a.c.name||'').localeCompare(b.c.name||'','ja'); if(sort==='office') return (a.c.office||'').localeCompare(b.c.office||'','ja')||(a.c.name||'').localeCompare(b.c.name||'','ja'); return a.r.worst.days-b.r.worst.days });
    $('listCount').textContent=list.length+' / '+children.length+'名';
    $('emptyMsg').classList.toggle('hidden',children.length>0);
    $('childBody').innerHTML=list.map(function(x){ var c=x.c,r=x.r; return '<tr class="row-'+r.worst.s+'" data-id="'+c.id+'">'+
      '<td><b>'+esc(c.name)+'</b>'+(c.manager?'<span class="sub">担当: '+esc(c.manager)+'</span>':'')+(c.memo?'<span class="sub">'+esc(c.memo)+'</span>':'')+'</td>'+
      '<td>'+esc(c.office||'—')+'</td><td class="d">'+fmt(parse(c.startDate))+'</td><td class="d">'+fmt(parse(c.planDate))+'</td>'+
      '<td class="d">'+fmt(r.plan)+'<span class="sub">'+r.planSt.label+'</span></td><td class="d">'+fmt(parse(c.monitoringDate))+'</td>'+
      '<td class="d">'+fmt(r.mon)+'<span class="sub">'+r.monSt.label+'</span></td><td class="d">'+fmt(r.cert)+(r.cert?'<span class="sub">'+r.certSt.label+'</span>':'')+'</td>'+
      '<td>'+pill(r.worst)+'</td><td class="no-print"><div class="ops"><button class="btn sm secondary" data-act="plan">計画更新を記録</button><button class="btn sm secondary" data-act="mon">モニタリング記録</button><button class="btn sm ghost" data-act="edit">編集</button><button class="btn sm danger" data-act="del">削除</button></div></td></tr>' }).join('');
    renderTimeline(rows);
  }
  function renderTimeline(rows){
    var ev=[]; rows.forEach(function(x){ var c=x.c,r=x.r;
      if(r.plan&&daysUntil(r.plan)<=60) ev.push({d:r.plan,t:'計画更新',n:c.name,s:r.planSt.s}); else if(!c.planDate) ev.push({d:today(),t:'計画未作成',n:c.name,s:'ng'});
      if(r.mon&&c.planDate&&daysUntil(r.mon)<=60) ev.push({d:r.mon,t:'モニタリング',n:c.name,s:r.monSt.s});
      if(r.cert&&daysUntil(r.cert)<=60) ev.push({d:r.cert,t:'受給者証更新',n:c.name,s:r.certSt.s}); });
    ev.sort(function(a,b){return a.d-b.d});
    if(!ev.length){ $('timeline').innerHTML='<p class="muted">60日以内の期限はありません。</p>'; return }
    var byDay={},order=[]; ev.forEach(function(e){ var k=iso(e.d); if(!byDay[k]){byDay[k]=[];order.push(k)} byDay[k].push(e) });
    $('timeline').innerHTML='<div class="timeline">'+order.map(function(k){ var d=parse(k); var past=daysUntil(d)<0; return '<div class="day"><div class="date'+(past?' past':'')+'">'+fmt(d)+'<br><span class="muted">'+(past?'超過':'あと'+daysUntil(d)+'日')+'</span></div><div class="ev">'+byDay[k].map(function(e){ return '<span><span class="pill '+(e.s==='none'?'muted':e.s)+'">'+e.t+'</span> '+esc(e.n)+'</span>' }).join('')+'</div></div>' }).join('')+'</div>';
  }

  // 編集モーダル
  function openEdit(c){ c=c||{}; $('modalTitle').textContent=c.id?'児童を編集':'児童を登録'; $('fId').value=c.id||''; $('fName').value=c.name||''; $('fOffice').value=c.office||''; $('fCertNo').value=c.certNo||''; $('fCertExpire').value=c.certExpire||''; $('fStart').value=c.startDate||''; $('fPlan').value=c.planDate||''; $('fMon').value=c.monitoringDate||''; $('fManager').value=c.manager||''; $('fMemo').value=c.memo||'';
    var h=[]; (c.planHistory||[]).forEach(function(d){h.push('計画 '+fmt(parse(d)))}); (c.monHistory||[]).forEach(function(d){h.push('モニタリング '+fmt(parse(d)))});
    $('historyBox').innerHTML=h.length?'<b>履歴:</b> '+h.join(' ／ '):''; $('editModal').classList.remove('hidden'); setTimeout(function(){$('fName').focus()},50) }
  function closeEdit(){ $('editModal').classList.add('hidden') }
  $('editForm').addEventListener('submit',function(e){ e.preventDefault(); var id=$('fId').value; var c=id?children.filter(function(x){return x.id===id})[0]:null;
    if(!c){ if(!isPro()&&children.length>=FREE_LIMIT){ $('limitAlert').classList.remove('hidden'); proOnly(); return } c={id:'c'+Date.now()+Math.random().toString(36).slice(2,6),planHistory:[],monHistory:[]}; children.push(c) }
    c.name=$('fName').value.trim(); c.office=$('fOffice').value.trim(); c.certNo=$('fCertNo').value.trim(); c.certExpire=$('fCertExpire').value; c.startDate=$('fStart').value; 
    if($('fPlan').value&&c.planDate!==$('fPlan').value){ c.planHistory=c.planHistory||[]; if(c.planHistory.indexOf($('fPlan').value)<0) c.planHistory.push($('fPlan').value) }
    c.planDate=$('fPlan').value; c.monitoringDate=$('fMon').value; c.manager=$('fManager').value.trim(); c.memo=$('fMemo').value.trim(); save(); render(); closeEdit() });
  $('cancelBtn').onclick=closeEdit; $('addBtn').onclick=function(){ if(!isPro()&&children.length>=FREE_LIMIT){ $('limitAlert').classList.remove('hidden'); proOnly(); return } openEdit() };

  // 更新記録モーダル
  var recTarget=null;
  function openRecord(c,type){ recTarget={c:c,type:type}; $('recordTitle').textContent=type==='plan'?'計画更新を記録: '+c.name:'モニタリング実施を記録: '+c.name; $('recordDesc').textContent=type==='plan'?'新しい個別支援計画の作成日（保護者同意日）を入力すると、次回期限を再計算し履歴に残します。':'モニタリング実施日を入力すると、次回期限を再計算し履歴に残します。'; $('recordDate').value=iso(today()); $('recordModal').classList.remove('hidden') }
  $('recordCancelBtn').onclick=function(){$('recordModal').classList.add('hidden')};
  $('recordSaveBtn').onclick=function(){ if(!recTarget) return; var d=$('recordDate').value; if(!d){alert('日付を入力してください');return} var c=recTarget.c;
    if(recTarget.type==='plan'){ c.planHistory=c.planHistory||[]; c.planHistory.push(d); c.planDate=d; c.monHistory=c.monHistory||[]; c.monitoringDate=d; } else { c.monHistory=c.monHistory||[]; c.monHistory.push(d); c.monitoringDate=d }
    save(); render(); $('recordModal').classList.add('hidden') };

  $('childBody').addEventListener('click',function(e){ var b=e.target.closest('button[data-act]'); if(!b) return; var id=b.closest('tr').dataset.id; var c=children.filter(function(x){return x.id===id})[0]; if(!c) return;
    var act=b.dataset.act; if(act==='edit') openEdit(c); else if(act==='plan') openRecord(c,'plan'); else if(act==='mon') openRecord(c,'mon'); else if(act==='del'){ if(confirm(c.name+' を削除しますか？')){ children=children.filter(function(x){return x.id!==id}); save(); render() } } });
  ['filterOffice','filterStatus','sortOrder'].forEach(function(id){ $(id).addEventListener('change',render) });

  // CSV
  var CSV_HEAD=['氏名','事業所','利用開始日','計画作成日','最終モニタリング日','受給者証期限','受給者証番号','担当','メモ'];
  function csvEsc(v){ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v }
  function download(name,content,type){ var blob=new Blob([content],{type:type||'text/plain;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500) }
  function normDate(s){ s=(s||'').trim(); if(!s) return ''; var m=s.match(/^(\d{4})[\/\-\.年](\d{1,2})[\/\-\.月](\d{1,2})/); if(m) return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]); var d=new Date(s); return isNaN(d)?'':iso(d) }
  function parseCsv(text){ text=text.replace(/^﻿/,''); var rows=[],row=[],cur='',q=false; for(var i=0;i<text.length;i++){ var ch=text[i]; if(q){ if(ch==='"'){ if(text[i+1]==='"'){cur+='"';i++} else q=false } else cur+=ch } else { if(ch==='"') q=true; else if(ch===','){row.push(cur);cur=''} else if(ch==='\n'||ch==='\r'){ if(ch==='\r'&&text[i+1]==='\n') i++; row.push(cur); rows.push(row); row=[]; cur='' } else cur+=ch } } if(cur!==''||row.length){row.push(cur);rows.push(row)} return rows.filter(function(r){return r.some(function(v){return v.trim()!==''})}) }
  $('sampleCsvBtn').onclick=function(){ download('期限トラッカー_取込サンプル.csv','﻿'+CSV_HEAD.join(',')+'\n'+['山田 T','○○教室','2026/04/01','2026/04/01','2026/04/01','2027/03/31','1234567890','児発管A','週3利用'].join(',')+'\n','text/csv') };
  $('csvImportBtn').onclick=function(){ $('csvFile').value=''; $('csvFile').click() };
  $('csvFile').addEventListener('change',function(){ var f=this.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ var rows=parseCsv(rd.result); if(rows.length<2){alert('データ行がありません');return} var head=rows[0].map(function(h){return h.trim()}); var idx={}; CSV_HEAD.forEach(function(h){ idx[h]=head.indexOf(h) }); if(idx['氏名']<0){alert('ヘッダに「氏名」列が必要です。サンプルCSVの形式に合わせてください');return}
      var added=0,skipped=0; for(var i=1;i<rows.length;i++){ var r=rows[i]; var g=function(h){return idx[h]>=0?(r[idx[h]]||'').trim():''}; var name=g('氏名'); if(!name){skipped++;continue} if(!isPro()&&children.length>=FREE_LIMIT){skipped++;continue}
        var pd=normDate(g('計画作成日')); children.push({id:'c'+Date.now()+i,name:name,office:g('事業所'),startDate:normDate(g('利用開始日')),planDate:pd,monitoringDate:normDate(g('最終モニタリング日')),certExpire:normDate(g('受給者証期限')),certNo:g('受給者証番号'),manager:g('担当'),memo:g('メモ'),planHistory:pd?[pd]:[],monHistory:[]}); added++ }
      save(); render(); alert(added+'名を取り込みました'+(skipped?'（'+skipped+'行はスキップ'+(!isPro()?'。Free版は10名まで':'')+'）':'')) }; rd.readAsText(f,'utf-8') });
  $('csvExportBtn').onclick=function(){ if(!isPro()) return proOnly(); var lines=[CSV_HEAD.concat(['次回計画期限','次回モニタリング期限','状態']).join(',')]; children.forEach(function(c){ var r=calc(c); lines.push([c.name,c.office,c.startDate,c.planDate,c.monitoringDate,c.certExpire,c.certNo,c.manager,c.memo,iso(r.plan),iso(r.mon),{ng:'期限超過',warn:'30日以内',attention:'31〜60日',ok:'OK'}[r.worst.s]||''].map(csvEsc).join(',')) }); download('期限トラッカー_'+iso(today())+'.csv','﻿'+lines.join('\n'),'text/csv') };
  $('icsExportBtn').onclick=function(){ if(!isPro()) return proOnly(); var L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//houday apps//keikaku-tracker//JA','CALSCALE:GREGORIAN']; var stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    function ev(d,title,uid){ var s=iso(d).replace(/-/g,''); var e=new Date(d); e.setDate(e.getDate()+1); L.push('BEGIN:VEVENT','UID:'+uid+'@houday-apps','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+s,'DTEND;VALUE=DATE:'+iso(e).replace(/-/g,''),'SUMMARY:'+title.replace(/[,;]/g,' '),'END:VEVENT') }
    children.forEach(function(c){ var r=calc(c); if(r.plan) ev(r.plan,'【計画更新】'+c.name+(c.office?'('+c.office+')':''),c.id+'-plan-'+iso(r.plan)); if(r.mon&&c.planDate) ev(r.mon,'【モニタリング】'+c.name,c.id+'-mon-'+iso(r.mon)); if(r.cert){ var pre=new Date(r.cert); pre.setDate(pre.getDate()-CERT_ALERT); ev(pre,'【受給者証 更新準備】'+c.name+' 期限'+fmt(r.cert),c.id+'-certpre'); ev(r.cert,'【受給者証 期限】'+c.name,c.id+'-cert') } });
    L.push('END:VCALENDAR'); download('期限トラッカー_'+iso(today())+'.ics',L.join('\r\n'),'text/calendar') };
  $('jsonExportBtn').onclick=function(){ download('期限トラッカー_バックアップ_'+iso(today())+'.json',JSON.stringify({version:1,settings:settings,children:children},null,2),'application/json') };
  $('jsonImportBtn').onclick=function(){ $('jsonFile').value=''; $('jsonFile').click() };
  $('jsonFile').addEventListener('change',function(){ var f=this.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ try{ var j=JSON.parse(rd.result); var arr=Array.isArray(j)?j:j.children; if(!Array.isArray(arr)) throw 0; if(!confirm('現在のデータを置き換えて '+arr.length+' 名を復元します。よろしいですか？')) return; children=arr; if(j.settings&&j.settings.planMonths) settings=j.settings; save(); render() }catch(e){ alert('JSONの形式が正しくありません') } }; rd.readAsText(f) });
  $('printBtn').onclick=function(){ window.print() };
  // 設定
  $('settingsBtn').onclick=function(){ $('sPlanMonths').value=settings.planMonths; $('sMonMonths').value=settings.monMonths; $('settingsModal').classList.remove('hidden') };
  $('settingsCancelBtn').onclick=function(){ $('settingsModal').classList.add('hidden') };
  $('settingsSaveBtn').onclick=function(){ settings.planMonths=+$('sPlanMonths').value; settings.monMonths=+$('sMonMonths').value; save(); render(); $('settingsModal').classList.add('hidden') };
  $('clearAllBtn').onclick=function(){ if(confirm('全児童データを削除します。元に戻せません。よろしいですか？')&&confirm('本当に削除しますか？')){ children=[]; save(); render(); $('settingsModal').classList.add('hidden') } };
  // Pro
  $('proBtn').onclick=function(){ if(isPro()){ if(confirm('この端末のPro版を解除しますか？')) window.HDLicense.deactivate() } else window.HDLicense.prompt({buyUrl:BUY_URL}) };
  $('limitProBtn').onclick=proOnly;
  window.HDLicense.onChange(render);
  document.querySelectorAll('.modal-bg').forEach(function(m){ m.addEventListener('click',function(e){ if(e.target===m) m.classList.add('hidden') }) });
  load(); render();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(function(){});
})();
