/* 変更届 作成ツール（放デイ・児発） */
(function(){
  var BUY_URL='https://note.com/houday';
  var KEY='hd_henkou-todoke_';
  var FREE_OFFICES=1, FREE_TODOKES=3;
  var settings={days:10,era:'wareki'};
  var offices=[], todokes=[];
  var editing=null; // 編集中の変更届オブジェクト
  var $=function(id){return document.getElementById(id)};
  var pad=function(n){return ('0'+n).slice(-2)};
  function parse(s){ if(!s) return null; var p=s.split('-'); if(p.length<3) return null; var d=new Date(+p[0],+p[1]-1,+p[2]); return isNaN(d)?null:d }
  function iso(d){ return d?d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()):'' }
  function fmt(d){ return d?d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate()):'—' }
  function today(){ var t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()) }
  function addDays(d,n){ var r=new Date(d); r.setDate(r.getDate()+n); return r }
  function daysUntil(d){ return Math.round((d-today())/86400000) }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]}) }
  function uid(p){ return p+Date.now().toString(36)+Math.random().toString(36).slice(2,6) }
  // 和暦表記（令和のみ対応。平成以前は西暦で表示）
  function jdate(d){ if(!d) return '　　年　　月　　日'; if(settings.era==='seireki'||d.getFullYear()<2019) return d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日'; var y=d.getFullYear()-2018; return '令和'+(y===1?'元':y)+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日' }
  function fiscalYear(d){ return d.getMonth()>=3?d.getFullYear():d.getFullYear()-1 }
  function load(){ try{offices=JSON.parse(localStorage.getItem(KEY+'offices')||'[]')||[]}catch(e){offices=[]} try{todokes=JSON.parse(localStorage.getItem(KEY+'todokes')||'[]')||[]}catch(e){todokes=[]} try{var s=JSON.parse(localStorage.getItem(KEY+'settings')||'{}'); if(s&&s.days) settings=s}catch(e){} }
  function save(){ try{localStorage.setItem(KEY+'offices',JSON.stringify(offices)); localStorage.setItem(KEY+'todokes',JSON.stringify(todokes)); localStorage.setItem(KEY+'settings',JSON.stringify(settings))}catch(e){alert('保存に失敗しました（容量不足の可能性）')} }
  function isPro(){ return window.HDLicense&&window.HDLicense.isPro() }
  function proOnly(){ window.HDLicense.prompt({buyUrl:BUY_URL,text:'この機能はPro版で利用できます。購入時のライセンスキーを入力してください。'}) }
  function officeById(id){ return offices.filter(function(o){return o.id===id})[0] }

  // ===== 変更事項（様式第3号の13項目） =====
  var ITEMS=[
    {no:1,label:'事業所（施設）の名称',tpl:'（変更前）\n名称：\n（変更後）\n名称：'},
    {no:2,label:'事業所（施設）の所在地（設置の場所）',tpl:'所在地：\n電話：\nFAX：',note:'電話・FAX番号のみの変更でも本項目で届出（平面図等の添付は不要）。所在地の移転は事前相談が必要な自治体が多く、さいたま市は前月10日までの提出が必要。'},
    {no:3,label:'申請者（設置者）の名称',tpl:'法人名：'},
    {no:4,label:'主たる事務所の所在地',tpl:'所在地：\n電話：\nFAX：'},
    {no:5,label:'代表者（役員）の氏名、生年月日、住所及び職名',tpl:'氏名：\n生年月日：\n住所：\n職名：'},
    {no:6,label:'定款・寄付行為等及びその登記簿の謄本又は条例等（当該指定に係る事業に関するものに限る。）',tpl:'変更箇所：'},
    {no:7,label:'医療法第７条の許可を受けた病院又は診療所であること',tpl:'',note:'医療型児童発達支援のみ該当。'},
    {no:8,label:'事業所（施設）の平面図及び設備の概要',tpl:'変更箇所：\n（例）指導訓練室の面積 ○○㎡ → ○○㎡'},
    {no:9,label:'管理者の氏名、生年月日、住所及び職歴',tpl:'氏名：\n生年月日：\n住所：\n職歴：別紙経歴書のとおり'},
    {no:10,label:'児童発達支援管理責任者の氏名、生年月日、住所及び職歴',tpl:'氏名：\n生年月日：\n住所：\n職歴：別紙経歴書のとおり'},
    {no:11,label:'運営規程',tpl:'変更条項：第○条（　　）\n変更内容：'},
    {no:12,label:'障害児（入所・通所）給付費の請求に関する事項',tpl:'変更内容：\n（例）○○加算の算定開始／終了',note:'加算等の請求内容が変わる場合は「体制等に関する届出書」も必要（原則、算定開始月の前月15日まで）。'},
    {no:13,label:'その他',tpl:'',subs:[
      {key:'staff',label:'従業員の変更（追加・削除）',tpl:'従業員の追加：\n従業員の削除：'},
      {key:'target',label:'主たる対象者',tpl:'主たる対象者：'},
      {key:'medical',label:'協力医療機関の名称・診療科名・契約内容',tpl:'名称：\n診療科：\n契約内容：'},
      {key:'capacity',label:'定員',tpl:'定員：○名 → ○名',note:'定員変更は事前相談・運営規程変更を伴うことが多い。'},
      {key:'other',label:'上記以外',tpl:''}
    ]}
  ];
  // ===== 添付書類の定義 =====
  // req: must(○)/cond(△)、svc: 対象サービス（未指定=全サービス）、note: 条件
  var A={
    fuhyo:'申請時に添付した付表（変更箇所を更新したもの）', kitei:'新しい運営規程', annai:'事業所までの案内図', heimen:'平面図', shashin:'事業所の外観及び内部の写真', bihin:'設備・備品一覧', tahou:'他法遵守の確認一覧表',
    touki:'履歴事項全部証明書（原本）又は理事会議事録等の写し（原本証明）', seiyaku:'指定事業者欠格条項に該当しない旨の誓約書 及び 別紙「役員等名簿」', yakuin:'誓約書の別紙「役員等名簿」', teikan:'定款', kyoka:'医療法の許可証の写し',
    keireki:'経歴書（写真を添付）', koyou:'従業者の雇用契約書の写し（又はそれに代わるもの）', shikaku:'資格免状・研修修了証等の写し', jitsumu:'実務経験証明書', kinmu:'従業者の勤務の体制及び勤務形態一覧表', kujo:'利用者からの苦情を解決するために講ずる措置の概要',
    taisei:'介護給付費等算定に係る体制等に関する届出書 及び 該当する別紙', shidoin:'児童指導員の要件を満たしていることが確認できる書類（資格証・実務経験証明書等）', riyu:'主たる対象者を特定する理由書', iryo_keiyaku:'協力医療機関との契約の内容がわかるもの', sonota:'その他変更箇所に対応する様式等'
  };
  var ATT={
    1:[{k:'fuhyo',r:'must'},{k:'kitei',r:'must'}],
    2:[{k:'fuhyo',r:'must'},{k:'kitei',r:'must',n:'所在地変更の場合（電話・FAXのみの変更は不要）'},{k:'annai',r:'must',n:'所在地変更の場合'},{k:'heimen',r:'must',n:'所在地変更の場合'},{k:'shashin',r:'must',n:'所在地変更の場合'},{k:'bihin',r:'must',n:'所在地変更の場合'},{k:'tahou',r:'must',n:'所在地変更の場合'}],
    3:[{k:'kitei',r:'must'},{k:'touki',r:'must',n:'議事録の写しは変更登記が未了の場合'}],
    4:[{k:'touki',r:'must'}],
    5:[{k:'touki',r:'must'},{k:'seiyaku',r:'cond',n:'代表者の変更の場合'}],
    6:[{k:'teikan',r:'must'},{k:'touki',r:'must'}],
    7:[{k:'kyoka',r:'must',s:['md']},{k:'sonota',r:'cond',s:['md']}],
    8:[{k:'heimen',r:'must'},{k:'shashin',r:'must'},{k:'bihin',r:'must'}],
    9:[{k:'fuhyo',r:'must'},{k:'keireki',r:'must'},{k:'koyou',r:'must'},{k:'yakuin',r:'must'},{k:'kinmu',r:'must'},{k:'kujo',r:'cond',n:'苦情対応の責任者が変わる場合'}],
    10:[{k:'fuhyo',r:'must'},{k:'keireki',r:'must'},{k:'koyou',r:'must'},{k:'shikaku',r:'must',n:'児発管研修（基礎・実践）修了証など'},{k:'jitsumu',r:'must'},{k:'kinmu',r:'must'},{k:'kitei',r:'cond',n:'人数を変更する場合'},{k:'kujo',r:'cond'}],
    11:[{k:'kitei',r:'must'},{k:'fuhyo',r:'cond'},{k:'sonota',r:'cond',n:'新旧対照表を求める自治体が多い'}],
    12:[{k:'kitei',r:'must'},{k:'fuhyo',r:'must'},{k:'taisei',r:'cond',n:'加算等の請求内容が変わる場合'}],
    '13staff':[{k:'fuhyo',r:'must'},{k:'koyou',r:'cond'},{k:'kinmu',r:'must'},{k:'kitei',r:'cond',n:'人数を変更する場合'},{k:'kujo',r:'cond'},{k:'shidoin',r:'must',s:['jh','md'],n:'児童指導員として配置する場合'},{k:'shidoin',r:'cond',s:['hd','hh'],n:'さいたま市様式では児発のみ○。放デイでも求める自治体あり'}],
    '13target':[{k:'kitei',r:'must'},{k:'riyu',r:'cond'}],
    '13medical':[{k:'fuhyo',r:'must',s:['jh','hd','md']},{k:'iryo_keiyaku',r:'must',s:['jh','hd','md']}],
    '13capacity':[{k:'kitei',r:'must'},{k:'fuhyo',r:'must'},{k:'heimen',r:'cond',n:'面積要件の確認用'},{k:'kinmu',r:'cond',n:'人員配置が変わる場合'}],
    '13other':[{k:'sonota',r:'cond'}]
  };
  function officeSvcs(o){ var s=[]; if(!o) return ['hd']; if(o.svcJh)s.push('jh'); if(o.svcHd)s.push('hd'); if(o.svcHh)s.push('hh'); if(o.svcMd)s.push('md'); return s.length?s:['hd'] }
  function svcLabel(o){ var l=[]; if(!o) return ''; if(o.svcJh)l.push('児童発達支援'); if(o.svcMd)l.push('医療型児童発達支援'); if(o.svcHd)l.push('放課後等デイサービス'); if(o.svcHh)l.push('保育所等訪問支援'); return l.join('・') }
  // 選択中の項目キー一覧（'1'..'12' と '13staff' 等）
  function activeKeys(t){ var ks=[]; ITEMS.forEach(function(it){ if(!t.items[it.no]||!t.items[it.no].on) return; if(it.subs){ it.subs.forEach(function(s){ if(t.subs&&t.subs[s.key]) ks.push('13'+s.key) }) } else ks.push(String(it.no)) }); return ks }
  // 添付書類を統合（同じ書類は1行に。○が1つでもあれば○）
  function buildAttachments(t){ var o=officeById(t.officeId); var svcs=officeSvcs(o); var map={},order=[];
    activeKeys(t).forEach(function(k){ (ATT[k]||[]).forEach(function(a){ if(a.s&&!a.s.some(function(x){return svcs.indexOf(x)>=0})) return; var m=map[a.k]; if(!m){ m=map[a.k]={k:a.k,label:A[a.k],r:a.r,notes:[],from:[]}; order.push(a.k) } if(a.r==='must') m.r='must'; if(a.n&&m.notes.indexOf(a.n)<0) m.notes.push(a.n); var from=k.replace(/^13/,'13-'); if(m.from.indexOf(from)<0) m.from.push(from) }) });
    return order.map(function(k){return map[k]}).sort(function(a,b){ return (a.r==='must'?0:1)-(b.r==='must'?0:1) }) }
  // 添付書類の由来表示（'13-staff' → '13 従業員の変更'）
  function fromLabel(f){ if(f.indexOf('13-')===0){ var s=ITEMS[12].subs.filter(function(x){return x.key===f.slice(3)})[0]; return '13 '+(s?s.label.split('（')[0]:'その他') } return f }
  function itemLabelOf(key){ if(key.indexOf('13')===0&&key.length>2){ var s=ITEMS[12].subs.filter(function(x){return x.key===key.slice(2)})[0]; return '13 その他（'+(s?s.label:'')+'）' } var it=ITEMS[+key-1]; return it?it.no+' '+it.label:key }
  // 提出期限
  function deadlineOf(t){ var d=parse(t.changeDate); return d?addDays(d,settings.days):null }
  function statusOf(t){ if(t.status==='submitted') return {s:'ok',label:'提出済み',days:99999}; if(t.status==='accepted') return {s:'ok',label:'受理済み',days:99999}; var dl=deadlineOf(t); if(!dl) return {s:'muted',label:'変更日未入力',days:99998}; var n=daysUntil(dl); if(n<0) return {s:'ng',label:'期限超過 '+(-n)+'日',days:n}; if(n<=7) return {s:'warn',label:'あと'+n+'日',days:n}; return {s:'info',label:'あと'+n+'日',days:n} }
  function summaryOf(t){ var l=[]; ITEMS.forEach(function(it){ if(!t.items[it.no]||!t.items[it.no].on) return; if(it.subs){ var ss=it.subs.filter(function(s){return t.subs&&t.subs[s.key]}).map(function(s){return s.label.split('（')[0]}); l.push('13 その他'+(ss.length?'（'+ss.join('・')+'）':'')) } else l.push(it.no+' '+it.label.split('（')[0].split('、')[0]) }); return l }

  // ===== 一覧ビュー =====
  function renderList(){
    var pro=isPro(); $('planBadge').textContent=pro?'Pro':'Free'; $('planBadge').className='badge'+(pro?' pro':''); $('proBtn').textContent=pro?'Pro有効':'Pro版';
    $('limitAlert').classList.toggle('hidden',pro||(todokes.length<FREE_TODOKES&&offices.length<FREE_OFFICES));
    var fo=$('filterOffice'); var cur=fo.value; fo.innerHTML='<option value="">すべて</option>'+offices.map(function(o){return '<option value="'+o.id+'">'+esc(o.name)+'</option>'}).join(''); fo.value=cur;
    var k={ng:0,warn:0,draft:0,year:0}; var fy=fiscalYear(today());
    var rows=todokes.map(function(t){ var st=statusOf(t); if(st.s==='ng')k.ng++; if(st.s==='warn')k.warn++; if(t.status==='draft')k.draft++; else { var sd=parse(t.submitDate); if(sd&&fiscalYear(sd)===fy)k.year++ } return {t:t,st:st} });
    $('kpiOverdue').textContent=k.ng; $('kpiSoon').textContent=k.warn; $('kpiDraft').textContent=k.draft; $('kpiYear').textContent=k.year;
    var fOff=fo.value,fSt=$('filterStatus').value;
    var list=rows.filter(function(x){ return (!fOff||x.t.officeId===fOff)&&(!fSt||x.t.status===fSt) });
    list.sort(function(a,b){ if(a.st.days!==b.st.days) return a.st.days-b.st.days; return (b.t.changeDate||'').localeCompare(a.t.changeDate||'') });
    $('listCount').textContent=list.length+' / '+todokes.length+'件'; $('emptyMsg').classList.toggle('hidden',todokes.length>0);
    $('listBody').innerHTML=list.map(function(x){ var t=x.t,o=officeById(t.officeId),dl=deadlineOf(t),att=buildAttachments(t),done=att.filter(function(a){return t.attach&&t.attach[a.k]}).length;
      return '<tr class="row-'+x.st.s+'" data-id="'+t.id+'"><td><b>'+esc(o?o.name:'（事業所未設定）')+'</b>'+(t.memo?'<span class="sub">'+esc(t.memo)+'</span>':'')+'</td>'+
      '<td>'+(summaryOf(t).map(esc).join('<br>')||'<span class="muted">未選択</span>')+(att.length?'<span class="sub">添付書類 '+done+'/'+att.length+'</span>':'')+'</td>'+
      '<td>'+fmt(parse(t.changeDate))+'</td><td>'+fmt(dl)+(t.status!=='draft'?'<span class="sub">届出日 '+fmt(parse(t.submitDate))+'</span>':'')+'</td>'+
      '<td><span class="pill '+x.st.s+'">'+x.st.label+'</span></td>'+
      '<td class="no-print"><div class="ops"><button class="btn sm secondary" data-act="edit">編集</button><button class="btn sm secondary" data-act="print">印刷</button><button class="btn sm ghost" data-act="dup">複製</button><button class="btn sm danger" data-act="del">削除</button></div></td></tr>' }).join('');
  }
  function renderRef(){ $('refTable').innerHTML='<div class="ref">'+ITEMS.map(function(it){ var keys=it.subs?it.subs.map(function(s){return {k:'13'+s.key,l:s.label}}):[{k:String(it.no),l:''}];
    return '<details><summary><span class="no">'+it.no+'</span>'+esc(it.label)+'</summary>'+keys.map(function(kk){ var list=ATT[kk.k]||[]; return (kk.l?'<div style="padding:0 12px;font-size:12px;font-weight:700;color:var(--muted)">'+esc(kk.l)+'</div>':'')+'<ul>'+(list.length?list.map(function(a){ return '<li>'+(a.r==='must'?'○':'△')+' '+esc(A[a.k])+(a.n?' <small>（'+esc(a.n)+'）</small>':'')+(a.s?' <small>['+a.s.map(function(x){return {jh:'児発',hd:'放デイ',hh:'保育所等訪問',md:'医療型'}[x]}).join('・')+']</small>':'')+'</li>' }).join(''):'<li class="muted">変更内容がわかる書類を適宜添付</li>')+'</ul>' }).join('')+(it.note?'<p class="muted" style="font-size:12px;padding:0 12px 8px;margin:0">'+esc(it.note)+'</p>':'')+'</details>' }).join('')+'</div>' }

  // ===== 編集ビュー =====
  function newTodoke(){ return {id:uid('t'),officeId:offices[0]?offices[0].id:'',changeDate:'',submitDate:iso(today()),status:'draft',items:{},subs:{},contents:{},attach:{},memo:''} }
  function openEdit(t){ editing=JSON.parse(JSON.stringify(t)); if(!editing.items)editing.items={}; if(!editing.subs)editing.subs={}; if(!editing.contents)editing.contents={}; if(!editing.attach)editing.attach={};
    $('viewList').classList.add('hidden'); $('viewEdit').classList.remove('hidden'); $('editTitle').textContent=todokes.some(function(x){return x.id===t.id})?'変更届を編集':'変更届を作成'; $('saveMsg').textContent='';
    var fo=$('fOffice'); fo.innerHTML=offices.map(function(o){return '<option value="'+o.id+'">'+esc(o.name)+'（'+esc(o.corp)+'）</option>'}).join('')||'<option value="">（先に事業所を登録してください）</option>'; fo.value=editing.officeId||(offices[0]?offices[0].id:'');
    $('fChangeDate').value=editing.changeDate||''; $('fSubmitDate').value=editing.submitDate||''; $('fStatus').value=editing.status||'draft'; $('fMemo').value=editing.memo||'';
    renderItems(); renderEditDerived(); window.scrollTo(0,0) }
  function closeEdit(){ editing=null; $('viewEdit').classList.add('hidden'); $('viewList').classList.remove('hidden'); renderList() }
  function readBasic(){ if(!editing) return; editing.officeId=$('fOffice').value; editing.changeDate=$('fChangeDate').value; editing.submitDate=$('fSubmitDate').value; editing.status=$('fStatus').value; editing.memo=$('fMemo').value.trim() }
  function renderItems(){ $('itemsBox').innerHTML=ITEMS.map(function(it){ var on=editing.items[it.no]&&editing.items[it.no].on; var h='<label><input type="checkbox" data-no="'+it.no+'"'+(on?' checked':'')+'><span class="no">'+it.no+'</span><span>'+esc(it.label)+'</span></label>';
      if(it.subs&&on) h+='<div class="subs">'+it.subs.map(function(s){ return '<label><input type="checkbox" data-sub="'+s.key+'"'+(editing.subs[s.key]?' checked':'')+'> '+esc(s.label)+'</label>' }).join('')+'</div>'; return h }).join('') }
  function renderEditDerived(){ renderDeadline(); renderContents(); renderAttach() }
  function renderDeadline(){ var box=$('deadlineBox'); var d=parse(editing.changeDate); if(!d){ box.className='deadline'; box.innerHTML='変更年月日を入力すると提出期限を計算します（変更の日から'+settings.days+'日以内）。'; return }
    var dl=addDays(d,settings.days); var st=statusOf(editing); var n=daysUntil(dl); var notes=[]; var wd=dl.getDay(); if(wd===0||wd===6) notes.push('期限日が'+(wd===0?'日曜':'土曜')+'です。閉庁日にあたる場合は翌開庁日扱いが一般的ですが、前倒し提出が安全です。');
    if(editing.items[2]&&editing.items[2].on) notes.push('所在地の変更は事前相談が必要な自治体が多く、さいたま市は「前月10日まで」の提出が求められます。');
    if(editing.items[12]&&editing.items[12].on) notes.push('加算の算定内容が変わる場合は「体制等に関する届出書」も必要です（原則、算定開始月の前月15日まで）。');
    if(editing.items[10]&&editing.items[10].on) notes.push('児発管の交代は、要件（研修修了・実務経験）を満たす後任を欠かさず配置。空白期間は個別支援計画未作成減算・児発管欠如減算のリスクがあります。');
    if(editing.items[13]&&editing.items[13].on&&editing.subs.capacity) notes.push('定員変更は運営規程の変更と平面図（面積要件）の確認を伴います。');
    box.className='deadline '+(editing.status!=='draft'?'ok':st.s==='info'?'':st.s);
    box.innerHTML='提出期限：<b class="big">'+fmt(dl)+'</b>（'+jdate(dl)+'）　'+(editing.status!=='draft'?'<span class="pill ok">'+st.label+'</span>':'<span class="pill '+(st.s==='info'?'muted':st.s)+'">'+(n<0?'期限超過 '+(-n)+'日':'あと'+n+'日')+'</span>')+(notes.length?'<ul>'+notes.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul>':'') }
  function contentKeys(){ var ks=[]; ITEMS.forEach(function(it){ if(!editing.items[it.no]||!editing.items[it.no].on) return; if(it.subs){ it.subs.forEach(function(s){ if(editing.subs[s.key]) ks.push({k:'13'+s.key,label:'13 その他：'+s.label,tpl:s.tpl,note:s.note}) }) } else ks.push({k:String(it.no),label:it.no+' '+it.label,tpl:it.tpl,note:it.note}) }); return ks }
  function renderContents(){ var ks=contentKeys(); $('contentHint').classList.toggle('hidden',ks.length>0);
    $('contentBox').innerHTML=ks.map(function(c){ var v=editing.contents[c.k]||{before:'',after:''}; return '<div class="content-item" data-k="'+c.k+'"><h4>'+esc(c.label)+'</h4>'+(c.note?'<p class="muted" style="font-size:12px;margin:0 0 8px">'+esc(c.note)+'</p>':'')+
      '<div class="row"><div><label>変更前 <button type="button" class="btn ghost tpl" data-tpl="before">ひな形を挿入</button></label><textarea data-f="before">'+esc(v.before)+'</textarea></div><div><label>変更後 <button type="button" class="btn ghost tpl" data-tpl="after">ひな形を挿入</button></label><textarea data-f="after">'+esc(v.after)+'</textarea></div></div></div>' }).join('') }
  function renderAttach(){ var list=buildAttachments(editing); $('attachHint').classList.toggle('hidden',list.length>0); if(!list.length){ $('attachBox').innerHTML=''; return }
    var done=list.filter(function(a){return editing.attach[a.k]}).length;
    $('attachBox').innerHTML='<div class="attach">'+list.map(function(a){ return '<label class="a'+(editing.attach[a.k]?' done':'')+'"><input type="checkbox" data-att="'+a.k+'"'+(editing.attach[a.k]?' checked':'')+'><span class="req '+a.r+'">'+(a.r==='must'?'○':'△')+'</span><span class="t">'+esc(a.label)+'<small>'+(a.notes.length?esc(a.notes.join('／'))+'　':'')+'← '+a.from.map(function(f){return esc(fromLabel(f))}).join('・')+'</small></span></label>' }).join('')+'</div>'+
      '<p class="attach-sum">準備済み <b>'+done+'</b> / '+list.length+'　（○＝必ず添付　△＝該当する場合に添付）　変更内容がわかる書類はこのほか適宜添付します。</p>' }
  $('itemsBox').addEventListener('change',function(e){ var el=e.target; if(el.dataset.no){ editing.items[el.dataset.no]={on:el.checked}; if(el.dataset.no==='13'&&!el.checked) editing.subs={}; renderItems() } else if(el.dataset.sub){ editing.subs[el.dataset.sub]=el.checked } renderEditDerived() });
  $('contentBox').addEventListener('input',function(e){ var ta=e.target; if(ta.tagName!=='TEXTAREA') return; var k=ta.closest('.content-item').dataset.k; editing.contents[k]=editing.contents[k]||{before:'',after:''}; editing.contents[k][ta.dataset.f]=ta.value });
  $('contentBox').addEventListener('click',function(e){ var b=e.target.closest('button.tpl'); if(!b) return; var box=b.closest('.content-item'); var k=box.dataset.k; var c=contentKeys().filter(function(x){return x.k===k})[0]; if(!c||!c.tpl) return; var ta=box.querySelector('textarea[data-f="'+b.dataset.tpl+'"]'); ta.value=(ta.value?ta.value.replace(/\s+$/,'')+'\n':'')+c.tpl; ta.dispatchEvent(new Event('input',{bubbles:true})); ta.focus() });
  $('attachBox').addEventListener('change',function(e){ var el=e.target; if(!el.dataset.att) return; editing.attach[el.dataset.att]=el.checked; renderAttach() });
  ['fOffice','fChangeDate','fSubmitDate','fStatus'].forEach(function(id){ $(id).addEventListener('change',function(){ readBasic(); renderEditDerived() }) });
  function commit(){ readBasic(); if(!editing.officeId){ alert('事業所を選択してください（未登録なら一覧の「事業所の登録・編集」から登録）'); return false } if(!editing.changeDate){ alert('変更年月日を入力してください'); return false }
    var idx=todokes.map(function(x){return x.id}).indexOf(editing.id); if(idx<0){ if(!isPro()&&todokes.length>=FREE_TODOKES){ proOnly(); return false } todokes.push(JSON.parse(JSON.stringify(editing))) } else todokes[idx]=JSON.parse(JSON.stringify(editing)); save(); return true }
  $('saveBtn').onclick=function(){ if(commit()){ $('saveMsg').textContent='保存しました（'+fmt(today())+'）'; setTimeout(function(){$('saveMsg').textContent=''},3000) } };
  $('backBtn').onclick=$('backBtn2').onclick=function(){ readBasic(); var orig=todokes.filter(function(x){return x.id===editing.id})[0]; var dirty=JSON.stringify(orig||null)!==JSON.stringify(editing); if(dirty&&!confirm('保存していない変更があります。破棄して一覧へ戻りますか？')) return; closeEdit() };
  $('printFormBtn').onclick=function(){ readBasic(); if(!editing.officeId){alert('事業所を選択してください');return} printTodoke(editing,false) };
  $('printCheckBtn').onclick=function(){ readBasic(); printTodoke(editing,true) };

  // ===== 印刷（様式第3号レイアウト） =====
  function boxes(no){ var s=String(no||'').replace(/\D/g,''); var h=''; for(var i=0;i<10;i++) h+='<span>'+(s[i]||'')+'</span>'; return '<div class="boxes">'+h+'</div>' }
  function formHtml(t){ var o=officeById(t.officeId)||{}; var ks=contentKeysOf(t); var chk={}; ITEMS.forEach(function(it){ chk[it.no]=!!(t.items[it.no]&&t.items[it.no].on) });
    function block(f){ return ks.map(function(c){ var v=((t.contents[c.k]||{})[f]||'').trim(); if(!v) return ''; return '<div class="hd">'+esc(c.short)+'</div><pre>'+esc(v)+'</pre>' }).join('') }
    return '<div class="form"><div class="formno">（'+esc(o.formNo||'様式第３号')+'）</div><div class="title">変更届出書</div><div class="right">'+jdate(parse(t.submitDate))+'</div><div class="dest">（宛先）'+esc(o.dest||'　　　　　　')+'</div>'+
      '<div class="applicant"><div>事業者（設置者）</div><div><span class="lbl">所在地</span>'+esc(o.corpAddr||'')+'</div><div><span class="lbl">名　称</span>'+esc(o.corp||'')+'</div><div><span class="lbl">代表者</span>'+esc((o.repTitle?o.repTitle+'　':'')+(o.rep||''))+'　　　印</div></div>'+
      '<div class="lead">次のとおり指定を受けた内容を変更しましたので届け出ます。</div>'+
      '<table class="f"><colgroup><col style="width:20%"><col style="width:16%"><col style="width:64%"></colgroup>'+
      '<tr><th rowspan="4">指定内容を変更した施設</th><th>事業所番号</th><td>'+boxes(o.no)+'</td></tr><tr><th>名　称</th><td>'+esc(o.name||'')+'</td></tr><tr><th>所在地</th><td>'+esc(o.addr||'')+'</td></tr><tr><th>支援の種類</th><td>'+esc(svcLabel(o))+'</td></tr>'+
      '<tr><th colspan="2">変更があった事項</th><th>変更の内容</th></tr>'+
      '<tr><td colspan="2">'+ITEMS.map(function(it){ return '<div class="itm"><span class="c'+(chk[it.no]?' on':'')+'">'+(chk[it.no]?'○':'')+'</span><span class="n">'+it.no+'</span><span>'+esc(it.label)+(it.no===13&&chk[13]?'（'+esc(ITEMS[12].subs.filter(function(s){return t.subs&&t.subs[s.key]}).map(function(s){return s.label.split('（')[0]}).join('・'))+'）':'')+'</span></div>' }).join('')+'</td>'+
      '<td class="content"><div class="hd">（変更前）</div>'+block('before')+'<div class="hd" style="margin-top:8px">（変更後）</div>'+block('after')+'</td></tr>'+
      '<tr><th colspan="2">変更年月日</th><td>'+jdate(parse(t.changeDate))+'</td></tr></table>'+
      '<div class="remarks">備考１　該当項目番号に○を付してください。<br>　　２　変更内容がわかる書類を添付してください。<br>　　３　変更の日から'+settings.days+'日以内に届け出てください。</div>'+
      '<div class="staff">申請事務担当者　氏名 '+esc(o.staff||'')+'<span>ＴＥＬ '+esc(o.tel||'')+'</span><span>ＦＡＸ '+esc(o.fax||'')+'</span></div></div>' }
  function contentKeysOf(t){ var ks=[]; ITEMS.forEach(function(it){ if(!t.items[it.no]||!t.items[it.no].on) return; if(it.subs){ it.subs.forEach(function(s){ if(t.subs&&t.subs[s.key]) ks.push({k:'13'+s.key,short:'13．'+s.label.split('（')[0]}) }) } else ks.push({k:String(it.no),short:it.no+'．'+it.label.split('（')[0].split('、')[0]}) }); return ks }
  function checklistHtml(t){ var o=officeById(t.officeId)||{}; var list=buildAttachments(t); var dl=deadlineOf(t);
    return '<div class="form"><div class="attach-page"><h3>変更届 添付書類チェックリスト（控え）</h3><table class="a f"><tr><th style="width:22%">事業所</th><td>'+esc(o.name||'')+'（'+esc(o.corp||'')+'）</td></tr><tr><th>変更事項</th><td>'+summaryOf(t).map(esc).join('／')+'</td></tr><tr><th>変更年月日</th><td>'+jdate(parse(t.changeDate))+'</td></tr><tr><th>提出期限</th><td>'+(dl?jdate(dl)+'（'+fmt(dl)+'）':'')+'</td></tr><tr><th>提出先</th><td>'+esc(o.dest||'')+'</td></tr></table><br>'+
      '<table class="a f"><tr><th style="width:8%">済</th><th style="width:8%">区分</th><th>書類名</th><th style="width:30%">備考・条件</th></tr><tr><td><span class="cb">　</span></td><td style="text-align:center">○</td><td>変更届出書（本紙）</td><td></td></tr>'+list.map(function(a){ return '<tr><td><span class="cb">'+(t.attach&&t.attach[a.k]?'✓':'　')+'</span></td><td style="text-align:center">'+(a.r==='must'?'○':'△')+'</td><td>'+esc(a.label)+'</td><td>'+esc(a.notes.join('／'))+'</td></tr>' }).join('')+'</table>'+
      '<div class="remarks">○＝必ず添付　△＝該当する場合に添付。自治体の手引きにより追加書類が必要な場合があります。'+(t.memo?'<br>メモ：'+esc(t.memo):'')+'</div></div></div>' }
  function printTodoke(t,checklistOnly){ var h=checklistOnly?checklistHtml(t).replace('attach-page','attach-page-first'):formHtml(t)+(buildAttachments(t).length?checklistHtml(t):''); $('printArea').innerHTML=h; setTimeout(function(){ window.print() },50) }

  // ===== 一覧の操作 =====
  $('listBody').addEventListener('click',function(e){ var b=e.target.closest('button[data-act]'); if(!b) return; var id=b.closest('tr').dataset.id; var t=todokes.filter(function(x){return x.id===id})[0]; if(!t) return; var act=b.dataset.act;
    if(act==='edit') openEdit(t); else if(act==='print') printTodoke(t,false);
    else if(act==='dup'){ if(!isPro()&&todokes.length>=FREE_TODOKES){ $('limitAlert').classList.remove('hidden'); proOnly(); return } var c=JSON.parse(JSON.stringify(t)); c.id=uid('t'); c.status='draft'; c.submitDate=iso(today()); c.attach={}; todokes.push(c); save(); openEdit(c) }
    else if(act==='del'){ if(confirm('この変更届を削除しますか？')){ todokes=todokes.filter(function(x){return x.id!==id}); save(); renderList() } } });
  ['filterOffice','filterStatus'].forEach(function(id){ $(id).addEventListener('change',renderList) });
  $('newBtn').onclick=function(){ if(!offices.length){ alert('先に事業所を登録してください'); openOffice(''); return } if(!isPro()&&todokes.length>=FREE_TODOKES){ $('limitAlert').classList.remove('hidden'); proOnly(); return } openEdit(newTodoke()) };

  // ===== 事業所モーダル =====
  function openOffice(id){ var sel=$('oSelect'); sel.innerHTML='<option value="">＋ 新規登録</option>'+offices.map(function(o){return '<option value="'+o.id+'">'+esc(o.name)+'</option>'}).join(''); sel.value=id||''; fillOffice(officeById(id)); $('officeModal').classList.remove('hidden') }
  function fillOffice(o){ o=o||{svcHd:true,dest:'',formNo:'様式第３号'}; $('oCorp').value=o.corp||''; $('oCorpAddr').value=o.corpAddr||''; $('oRepTitle').value=o.repTitle||''; $('oRep').value=o.rep||''; $('oName').value=o.name||''; $('oNo').value=o.no||''; $('oAddr').value=o.addr||''; $('oSvcJh').checked=!!o.svcJh; $('oSvcHd').checked=!!o.svcHd; $('oSvcHh').checked=!!o.svcHh; $('oSvcMd').checked=!!o.svcMd; $('oDest').value=o.dest||''; $('oFormNo').value=o.formNo||''; $('oStaff').value=o.staff||''; $('oTel').value=o.tel||''; $('oFax').value=o.fax||''; $('oDelBtn').classList.toggle('hidden',!o.id) }
  $('oSelect').addEventListener('change',function(){ fillOffice(officeById(this.value)) });
  $('oSaveBtn').onclick=function(){ var id=$('oSelect').value; var o=officeById(id); if(!$('oCorp').value.trim()||!$('oName').value.trim()){ alert('法人名と事業所名は必須です'); return }
    if(!o){ if(!isPro()&&offices.length>=FREE_OFFICES){ $('limitAlert').classList.remove('hidden'); proOnly(); return } o={id:uid('o')}; offices.push(o) }
    // 同じ法人の事業所を追加するとき、法人情報を引き継ぐ手間を減らすため入力値をそのまま保存
    o.corp=$('oCorp').value.trim(); o.corpAddr=$('oCorpAddr').value.trim(); o.repTitle=$('oRepTitle').value.trim(); o.rep=$('oRep').value.trim(); o.name=$('oName').value.trim(); o.no=$('oNo').value.replace(/\D/g,''); o.addr=$('oAddr').value.trim(); o.svcJh=$('oSvcJh').checked; o.svcHd=$('oSvcHd').checked; o.svcHh=$('oSvcHh').checked; o.svcMd=$('oSvcMd').checked; o.dest=$('oDest').value.trim(); o.formNo=$('oFormNo').value.trim(); o.staff=$('oStaff').value.trim(); o.tel=$('oTel').value.trim(); o.fax=$('oFax').value.trim();
    save(); $('officeModal').classList.add('hidden'); if(editing){ openEdit(editing) } else renderList() };
  $('oCancelBtn').onclick=function(){ $('officeModal').classList.add('hidden') };
  $('oDelBtn').onclick=function(){ var id=$('oSelect').value; if(!id) return; var used=todokes.filter(function(t){return t.officeId===id}).length; if(!confirm('この事業所を削除しますか？'+(used?'（この事業所の変更届 '+used+' 件は残りますが事業所名が表示されなくなります）':''))) return; offices=offices.filter(function(o){return o.id!==id}); save(); $('officeModal').classList.add('hidden'); renderList() };
  $('officeBtn').onclick=function(){ openOffice(offices[0]?offices[0].id:'') };

  // ===== バックアップ・CSV・設定 =====
  function download(name,content,type){ var blob=new Blob([content],{type:type||'text/plain;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500) }
  function csvEsc(v){ v=String(v==null?'':v); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v }
  $('csvExportBtn').onclick=function(){ if(!isPro()) return proOnly(); var lines=[['事業所','法人','変更事項','変更年月日','提出期限','届出日','状態','添付書類 準備','メモ'].join(',')]; todokes.forEach(function(t){ var o=officeById(t.officeId)||{}; var att=buildAttachments(t); var done=att.filter(function(a){return t.attach&&t.attach[a.k]}).length; lines.push([o.name,o.corp,summaryOf(t).join('／'),fmt(parse(t.changeDate)),fmt(deadlineOf(t)),fmt(parse(t.submitDate)),{draft:'未提出',submitted:'提出済み',accepted:'受理済み'}[t.status]||'',done+'/'+att.length,t.memo].map(csvEsc).join(',')) }); download('変更届_提出台帳_'+iso(today())+'.csv','﻿'+lines.join('\n'),'text/csv') };
  $('jsonExportBtn').onclick=function(){ download('変更届_バックアップ_'+iso(today())+'.json',JSON.stringify({version:1,settings:settings,offices:offices,todokes:todokes},null,2),'application/json') };
  $('jsonImportBtn').onclick=function(){ $('jsonFile').value=''; $('jsonFile').click() };
  $('jsonFile').addEventListener('change',function(){ var f=this.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ try{ var j=JSON.parse(rd.result); if(!Array.isArray(j.todokes)||!Array.isArray(j.offices)) throw 0; if(!confirm('現在のデータを置き換えて 事業所'+j.offices.length+'件・変更届'+j.todokes.length+'件 を復元します。よろしいですか？')) return; offices=j.offices; todokes=j.todokes; if(j.settings&&j.settings.days) settings=j.settings; save(); renderList() }catch(e){ alert('JSONの形式が正しくありません') } }; rd.readAsText(f) });
  $('settingsBtn').onclick=function(){ $('sDays').value=settings.days; $('sEra').value=settings.era||'wareki'; $('settingsModal').classList.remove('hidden') };
  $('settingsCancelBtn').onclick=function(){ $('settingsModal').classList.add('hidden') };
  $('settingsSaveBtn').onclick=function(){ settings.days=Math.max(1,+$('sDays').value||10); settings.era=$('sEra').value; save(); renderList(); $('settingsModal').classList.add('hidden') };
  $('clearAllBtn').onclick=function(){ if(confirm('事業所・変更届の全データを削除します。元に戻せません。よろしいですか？')&&confirm('本当に削除しますか？')){ offices=[]; todokes=[]; save(); renderList(); $('settingsModal').classList.add('hidden') } };
  // Pro
  $('proBtn').onclick=function(){ if(isPro()){ if(confirm('この端末のPro版を解除しますか？')) window.HDLicense.deactivate() } else window.HDLicense.prompt({buyUrl:BUY_URL}) };
  $('limitProBtn').onclick=proOnly;
  window.HDLicense.onChange(renderList);
  document.querySelectorAll('.modal-bg').forEach(function(m){ m.addEventListener('click',function(e){ if(e.target===m) m.classList.add('hidden') }) });
  load(); renderRef(); renderList();
  if('serviceWorker' in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('./sw.js').catch(function(){});
})();
