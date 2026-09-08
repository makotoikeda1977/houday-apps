/* houday apps 共通ライセンス（Pro解放）モジュール
 * 使い方: <script src="../../common/license.js" data-app="shoguu-sim"></script>
 * window.HDLicense.isPro() / .prompt() / .activate(key) / .onChange(fn)
 * 鍵は端末のlocalStorageに保存（オフライン検証・サーバ不要）。 */
(function(){
  var script=document.currentScript; var APP=(script&&script.getAttribute('data-app'))||'app';
  var BASE=(script&&script.src)?script.src.replace(/license\.js.*$/,''):'';
  var KEY='hd_license_'+APP; var hashes=null; var listeners=[];
  function sha256(str){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(str)).then(function(b){return Array.from(new Uint8Array(b)).map(function(x){return ('0'+x.toString(16)).slice(-2)}).join('').slice(0,24)})}
  function load(){ if(hashes) return Promise.resolve(hashes); return fetch(BASE+'license-hashes.json',{cache:'no-cache'}).then(function(r){return r.json()}).then(function(j){hashes=j;return j}).catch(function(){return {}}) }
  function isPro(){ try{return !!localStorage.getItem(KEY)}catch(e){return false} }
  function fire(){ listeners.forEach(function(f){try{f(isPro())}catch(e){}}) }
  function activate(key){ key=(key||'').trim().toUpperCase().replace(/\s+/g,''); if(!key) return Promise.resolve({ok:false,msg:'キーを入力してください'});
    return Promise.all([load(),sha256(key)]).then(function(r){ var list=(r[0]||{})[APP]||[]; if(list.indexOf(r[1])>=0){ try{localStorage.setItem(KEY,r[1])}catch(e){} fire(); return {ok:true,msg:'Pro版が有効になりました'} } return {ok:false,msg:'キーが正しくありません。大文字・ハイフンを含めて入力してください'} }) }
  function deactivate(){ try{localStorage.removeItem(KEY)}catch(e){} fire() }
  function prompt(opts){ opts=opts||{}; var bg=document.createElement('div'); bg.className='modal-bg';
    bg.innerHTML='<div class="modal"><h2>Pro版を有効化</h2><p class="muted">'+(opts.text||'購入時に届いたライセンスキーを入力してください。この端末に保存され、以後は入力不要です。')+'</p><input type="text" id="hd-lic-input" placeholder="例: XX-ABCD-EFGH-JKLM" autocomplete="off" style="margin:8px 0">'+
      '<div id="hd-lic-msg" class="muted" style="min-height:1.4em"></div><div class="btn-row"><button class="btn" id="hd-lic-ok">有効化</button><button class="btn ghost" id="hd-lic-cancel">閉じる</button>'+(opts.buyUrl?'<a class="btn secondary" href="'+opts.buyUrl+'" target="_blank" rel="noopener">キーを購入</a>':'')+'</div></div>';
    document.body.appendChild(bg); var inp=bg.querySelector('#hd-lic-input'); setTimeout(function(){inp.focus()},50);
    function close(){bg.remove()} bg.querySelector('#hd-lic-cancel').onclick=close; bg.addEventListener('click',function(e){if(e.target===bg)close()});
    function go(){ activate(inp.value).then(function(r){ bg.querySelector('#hd-lic-msg').textContent=r.msg; bg.querySelector('#hd-lic-msg').style.color=r.ok?'#16a34a':'#dc2626'; if(r.ok) setTimeout(close,900) }) }
    bg.querySelector('#hd-lic-ok').onclick=go; inp.addEventListener('keydown',function(e){if(e.key==='Enter')go()}); }
  window.HDLicense={isPro:isPro,activate:activate,deactivate:deactivate,prompt:prompt,onChange:function(f){listeners.push(f)},app:APP};
})();
