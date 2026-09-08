(function() {
    'use strict';
    // Pro版購入導線
    var BUY_URL = 'https://note.com/houday';

    // 制度データ（令和8年6月1日〜）
    var DEFAULT_KASAN_RATES = {
        houdei: { name: '放課後等デイサービス', rates: { i_i: 15.5, i_ro: 16.1, ii_i: 15.2, ii_ro: 15.8, iii: 14.2, iv: 11.9 } },
        jihatsu: { name: '児童発達支援', rates: { i_i: 15.2, i_ro: 15.8, ii_i: 14.9, ii_ro: 15.5, iii: 13.9, iv: 11.7 } }
    };

    // DOM要素のキャッシュ
    var $ = function(id) { return document.getElementById(id); };
    var dom = {
        serviceType: $('serviceType'),
        kasanKbn: $('kasanKbn'),
        hoshuGaku: $('hoshuGaku'),
        totalTani: $('totalTani'),
        chiikiTanka: $('chiikiTanka'),
        jigyoshoName: $('jigyoshoName'),
        editRatesToggle: $('editRatesToggle'),
        ratesEditor: $('ratesEditor'),
        ratesInputs: $('ratesInputs'),
        resetRatesBtn: $('resetRatesBtn'),
        kasanMokomiMonthly: $('kasanMokomiMonthly'),
        kasanMokomiAnnual: $('kasanMokomiAnnual'),
        hitsuyouGakuMonthly: $('hitsuyouGakuMonthly'),
        roYoukenGaku: $('roYoukenGaku'),
        haibunTable: $('haibunTable').getElementsByTagName('tbody')[0],
        totalMonthlyHaibun: $('totalMonthlyHaibun'),
        totalBonusHaibun: $('totalBonusHaibun'),
        totalAnnualHaibun: $('totalAnnualHaibun'),
        addStaffBtn: $('addStaffBtn'),
        proLimitAlert: $('proLimitAlert'),
        proLeadBtn: $('proLeadBtn'),
        hanteiKasanTotal: $('hanteiKasanTotal'),
        hanteiMonthlyYoken: $('hanteiMonthlyYoken'),
        hanteiRoYoken: $('hanteiRoYoken'),
        hanteiDetail: $('hanteiDetail'),
        avgKaisenGaku: $('avgKaisenGaku'),
        printBtn: $('printBtn'),
        csvExportBtn: $('csvExportBtn'),
        saveBtn: $('saveBtn'),
        loadBtn: $('loadBtn'),
        proLock: $('proLock'),
        proLeadBtn2: $('proLeadBtn2'),
        planBadge: $('planBadge'),
        proBtn: $('proBtn'),
        saveLoadModal: $('saveLoadModal'),
        closeModalBtn: $('closeModalBtn'),
        saveSlots: $('saveSlots'),
        saveName: $('saveName'),
        saveSlotBtn: $('saveSlotBtn'),
    };

    // アプリケーションの状態
    var state = {
        staff: [],
        customRates: {},
    };

    // --- ユーティリティ関数 ---
    var formatNumber = function(num) { return Math.round(num).toLocaleString('ja-JP'); };
    var parseNumber = function(str) { return parseInt(String(str).replace(/,/g, ''), 10) || 0; };
    var getRate = function(service, kbn) { return (state.customRates[service] && state.customRates[service][kbn]) || DEFAULT_KASAN_RATES[service].rates[kbn]; };

    // --- データ永続化 (localStorage) ---
    var STORAGE_KEY = 'hd_shoguu-sim_autosave';
    var CUSTOM_RATES_KEY = 'hd_shoguu-sim_customRates';
    var PRO_SAVES_KEY = 'hd_shoguu-sim_proSaves';

    function loadState() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                var parsed = JSON.parse(saved);
                dom.serviceType.value = parsed.serviceType || 'houdei';
                dom.kasanKbn.value = parsed.kasanKbn || 'i_i';
                dom.hoshuGaku.value = parsed.hoshuGaku || '';
                dom.jigyoshoName.value = parsed.jigyoshoName || '';
                state.staff = parsed.staff || [];
            }
            var savedRates = localStorage.getItem(CUSTOM_RATES_KEY);
            if (savedRates) {
                state.customRates = JSON.parse(savedRates);
            }
        } catch (e) {
            console.error('Failed to load state:', e);
            state.staff = [];
            state.customRates = {};
        }
    }

    function saveState() {
        try {
            var dataToSave = {
                serviceType: dom.serviceType.value,
                kasanKbn: dom.kasanKbn.value,
                hoshuGaku: dom.hoshuGaku.value,
                jigyoshoName: dom.jigyoshoName.value,
                staff: state.staff,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
    }

    function saveCustomRates() {
        try {
            localStorage.setItem(CUSTOM_RATES_KEY, JSON.stringify(state.customRates));
        } catch (e) {
            console.error('Failed to save custom rates:', e);
        }
    }

    // --- レンダリング関数 ---
    function renderStaffTable() {
        dom.haibunTable.innerHTML = '';
        state.staff.forEach((staff, index) => {
            var row = dom.haibunTable.insertRow();
            row.innerHTML = '<td><input type="text" class="staff-name" value="' + staff.name + '" data-index="' + index + '"></td>' +
                '<td>' +
                    '<select class="staff-role" data-index="' + index + '">' +
                        '<option value="指導員" ' + (staff.role === '指導員' ? 'selected' : '') + '>児童指導員</option>' +
                        '<option value="保育士" ' + (staff.role === '保育士' ? 'selected' : '') + '>保育士</option>' +
                        '<option value="児発管" ' + (staff.role === '児発管' ? 'selected' : '') + '>児発管</option>' +
                        '<option value="管理者" ' + (staff.role === '管理者' ? 'selected' : '') + '>管理者</option>' +
                        '<option value="その他" ' + (staff.role === 'その他' ? 'selected' : '') + '>その他</option>' +
                    '</select>' +
                '</td>' +
                '<td><input type="number" class="staff-monthly" value="' + staff.monthly + '" data-index="' + index + '" step="1000"></td>' +
                '<td><input type="number" class="staff-bonus" value="' + staff.bonus + '" data-index="' + index + '" step="1000"></td>' +
                '<td class="staff-annual">' + formatNumber(staff.monthly * 12 + staff.bonus) + '</td>' +
                '<td><button class="btn sm danger" data-index="' + index + '">削除</button></td>';
        });
        updateTotals();
        checkStaffLimit();
    }
    
    function renderRatesEditor() {
        var service = dom.serviceType.value;
        var serviceData = DEFAULT_KASAN_RATES[service];
        var name = serviceData.name;
        var rates = serviceData.rates;
        dom.ratesInputs.innerHTML = '<h3>' + name + '</h3>';
        var container = document.createElement('div');
        container.className = 'row';
        for(var kbn in rates){
             var label = document.createElement('label');
             var currentRate = getRate(service, kbn);
             label.innerHTML = kbn.replace('_', ' ') + ': <input type="number" class="rate-input" step="0.1" data-service="' + service + '" data-kbn="' + kbn + '" value="' + currentRate + '">%';
             container.appendChild(label);
        }
        dom.ratesInputs.appendChild(container);
    }
    
    function renderAll() {
        renderStaffTable();
        calculateAndRender();
        renderUIByPlan();
        renderRatesEditor();
    }
    
    // --- Pro版関連 ---
    function renderUIByPlan() {
        var isPro = window.HDLicense && window.HDLicense.isPro();
        dom.planBadge.textContent = isPro ? 'Pro' : 'Free';
        dom.planBadge.className = isPro ? 'badge pro' : 'badge';
        dom.proBtn.textContent = isPro ? 'Pro有効' : 'Pro版';
        dom.csvExportBtn.disabled = !isPro;
        dom.saveBtn.disabled = !isPro;
        dom.loadBtn.disabled = !isPro;
        dom.proLock.classList.toggle('hidden', isPro);

        checkStaffLimit();
    }
    
    function checkStaffLimit() {
        var isPro = window.HDLicense && window.HDLicense.isPro();
        if (!isPro && state.staff.length >= 5) {
            dom.addStaffBtn.disabled = true;
            dom.proLimitAlert.classList.remove('hidden');
        } else {
            dom.addStaffBtn.disabled = false;
            dom.proLimitAlert.classList.add('hidden');
        }
    }


    // --- 計算ロジック ---
    function calculateAndRender() {
        var hoshuGaku = parseNumber(dom.hoshuGaku.value);
        if (hoshuGaku === 0) {
            // リセット
            dom.kasanMokomiMonthly.innerHTML = '0<small>円</small>';
            dom.kasanMokomiAnnual.innerHTML = '0<small>円</small>';
            dom.hitsuyouGakuMonthly.innerHTML = '0<small>円</small>';
            dom.roYoukenGaku.innerHTML = '0<small>円</small>';
            updateTotals();
            return;
        }

        var service = dom.serviceType.value;
        var kasanKbn = dom.kasanKbn.value;

        var rate = getRate(service, kasanKbn) / 100;
        var rateIV = getRate(service, 'iv') / 100;
        var rateIIro = getRate(service, 'ii_ro') / 100;

        var kasanMokomiMonthly = hoshuGaku * rate;
        var kasanMokomiAnnual = kasanMokomiMonthly * 12;
        var hitsuyouGakuMonthly = hoshuGaku * rateIV / 2;
        var roYoukenGaku = hoshuGaku * rateIIro / 2;

        // KPI表示
        dom.kasanMokomiMonthly.innerHTML = formatNumber(kasanMokomiMonthly) + '<small>円</small>';
        dom.kasanMokomiAnnual.innerHTML = formatNumber(kasanMokomiAnnual) + '<small>円</small>';
        dom.hitsuyouGakuMonthly.innerHTML = formatNumber(hitsuyouGakuMonthly) + '<small>円</small>';
        dom.roYoukenGaku.innerHTML = formatNumber(roYoukenGaku) + '<small>円</small>';

        updateTotals();
    }
    
    function updateTotals() {
        var totalMonthly = 0, totalBonus = 0;
        state.staff.forEach(function(staff){
            totalMonthly += staff.monthly;
            totalBonus += staff.bonus;
        });
        var totalAnnual = totalMonthly * 12 + totalBonus;
        
        dom.totalMonthlyHaibun.textContent = formatNumber(totalMonthly);
        dom.totalBonusHaibun.textContent = formatNumber(totalBonus);
        dom.totalAnnualHaibun.textContent = formatNumber(totalAnnual);
        
        // 判定ロジック
        runHantei(totalMonthly, totalAnnual);
    }
    
    function runHantei(totalMonthlyHaibun, totalAnnualHaibun) {
        var hoshuGaku = parseNumber(dom.hoshuGaku.value);
        if(hoshuGaku === 0) {
            dom.hanteiKasanTotal.className = "pill muted";
            dom.hanteiKasanTotal.textContent = "判定中...";
            dom.hanteiMonthlyYoken.className = "pill muted";
            dom.hanteiMonthlyYoken.textContent = "判定中...";
            dom.hanteiRoYoken.className = "pill muted";
            dom.hanteiRoYoken.textContent = "判定中...";
            dom.hanteiDetail.textContent = "";
            dom.avgKaisenGaku.textContent = "0";
            return;
        };

        var service = dom.serviceType.value;
        var kasanKbn = dom.kasanKbn.value;
        var rate = getRate(service, kasanKbn) / 100;
        var rateIV = getRate(service, 'iv') / 100;
        var rateIIro = getRate(service, 'ii_ro') / 100;

        var kasanMokomiAnnual = hoshuGaku * rate * 12;
        var hitsuyouGakuMonthly = hoshuGaku * rateIV / 2;
        var roYoukenGaku = hoshuGaku * rateIIro / 2;

        var detailMessages = [];

        // ① 配分合計 vs 加算見込み
        if (totalAnnualHaibun >= kasanMokomiAnnual) {
            dom.hanteiKasanTotal.className = 'pill ok';
            dom.hanteiKasanTotal.textContent = 'OK: 配分合計 ≥ 加算見込み';
            var over = totalAnnualHaibun - kasanMokomiAnnual;
            if(over > 0){
                 detailMessages.push('配分合計が加算見込みを ' + formatNumber(over) + ' 円上回っています（事業所持出し）。');
            }
        } else {
            dom.hanteiKasanTotal.className = 'pill ng';
            var shortage = kasanMokomiAnnual - totalAnnualHaibun;
            dom.hanteiKasanTotal.textContent = 'NG: 加算見込みに ' + formatNumber(shortage) + ' 円不足';
            detailMessages.push('加算額は全額を賃金改善に充てる必要があります。');
        }
        
        // ② 月額配分合計 vs 月額賃金改善要件
        if(totalMonthlyHaibun >= hitsuyouGakuMonthly) {
            dom.hanteiMonthlyYoken.className = 'pill ok';
            dom.hanteiMonthlyYoken.textContent = 'OK: 月額賃金改善要件';
        } else {
            dom.hanteiMonthlyYoken.className = 'pill ng';
            var shortage2 = hitsuyouGakuMonthly - totalMonthlyHaibun;
            dom.hanteiMonthlyYoken.textContent = 'NG: 月額改善要件に ' + formatNumber(shortage2) + ' 円不足';
            detailMessages.push('月額賃金改善要件(加算IVの半分)を満たすには、月額改善の合計をあと ' + formatNumber(shortage2) + ' 円増やす必要があります。');
        }
        
        // ③ (ロ)区分要件
        if(kasanKbn.indexOf('_ro') > -1){
            if (totalMonthlyHaibun >= roYoukenGaku) {
                dom.hanteiRoYoken.className = 'pill ok';
                dom.hanteiRoYoken.textContent = 'OK: (ロ)区分要件';
                dom.hanteiRoYoken.classList.remove('hidden');
            } else {
                dom.hanteiRoYoken.className = 'pill warn';
                var shortage3 = roYoukenGaku - totalMonthlyHaibun;
                dom.hanteiRoYoken.textContent = 'WARN: (ロ)要件に ' + formatNumber(shortage3) + ' 円不足';
                dom.hanteiRoYoken.classList.remove('hidden');
                 detailMessages.push('(ロ)区分を算定するには、月額改善の合計をあと ' + formatNumber(shortage3) + ' 円増やすか、生産性向上等の要件を満たす必要があります。');
            }
        } else {
            dom.hanteiRoYoken.classList.add('hidden');
        }
        
        dom.hanteiDetail.innerHTML = detailMessages.join('<br>');
        
        // ④ 一人あたり平均改善額
        var avg = state.staff.length > 0 ? totalAnnualHaibun / state.staff.length : 0;
        dom.avgKaisenGaku.textContent = formatNumber(avg);

        saveState();
    }

    // --- イベントハンドラ ---
    function handleInputsChange() {
        calculateAndRender();
    }
    
    function handleTaniToHoshu() {
        var tani = parseNumber(dom.totalTani.value);
        var tanka = parseFloat(dom.chiikiTanka.value) || 10.0;
        if(tani > 0){
             dom.hoshuGaku.value = Math.round(tani * tanka);
             calculateAndRender();
        }
    }
    
    function handleStaffTableChange(e) {
        var target = e.target;
        var index = parseInt(target.dataset.index, 10);

        if (target.classList.contains('staff-name')) {
            state.staff[index].name = target.value;
        } else if (target.classList.contains('staff-role')) {
            state.staff[index].role = target.value;
        } else if (target.classList.contains('staff-monthly')) {
            state.staff[index].monthly = parseNumber(target.value);
        } else if (target.classList.contains('staff-bonus')) {
            state.staff[index].bonus = parseNumber(target.value);
        }
        
        if (target.tagName === 'INPUT' || target.tagName === 'SELECT') {
            var row = target.closest('tr');
            var staff = state.staff[index];
            row.querySelector('.staff-annual').textContent = formatNumber(staff.monthly * 12 + staff.bonus);
            updateTotals();
        }
        
        if (target.classList.contains('btn')) { // 削除ボタン
            state.staff.splice(index, 1);
            renderStaffTable();
            updateTotals();
        }
    }

    function addStaffMember() {
        var isPro = window.HDLicense && window.HDLicense.isPro();
        if (!isPro && state.staff.length >= 5) {
            checkStaffLimit();
            return;
        }
        state.staff.push({ name: '職員' + (state.staff.length + 1), role: '指導員', monthly: 0, bonus: 0 });
        renderStaffTable();
    }
    
    function handleRateEditors(e){
        var target = e.target;
        if(target.classList.contains('rate-input')){
            var service = target.dataset.service;
            var kbn = target.dataset.kbn;
            var value = parseFloat(target.value);
            if(!state.customRates[service]){
                state.customRates[service] = {};
            }
            state.customRates[service][kbn] = value;
            saveCustomRates();
            calculateAndRender();
        }
    }
    
    function resetRates(){
        state.customRates = {};
        saveCustomRates();
        renderRatesEditor();
        calculateAndRender();
    }
    
    function promptPro() {
        if(window.HDLicense) {
            window.HDLicense.prompt({buyUrl: BUY_URL});
        }
    }
    
    function handleProBtnClick(){
        var isPro = window.HDLicense && window.HDLicense.isPro();
        if(isPro){
            if(confirm('Pro版ライセンスをこのブラウザから解除しますか？')){
                window.HDLicense.deactivate();
            }
        } else {
            promptPro();
        }
    }
    
    function printView() {
        // 印刷用に事業所名などをヘッダーに反映する
        var printHeader = document.createElement('div');
        printHeader.innerHTML = '<h2>' + (dom.jigyoshoName.value || '事業所名未入力') + '様 配分計画書</h2>' +
            '<p>作成日: ' + new Date().toLocaleDateString('ja-JP', {year:'numeric', month:'2-digit', day:'2-digit'}) + '</p>';
        document.body.insertBefore(printHeader, document.querySelector('.container'));
        window.print();
        document.body.removeChild(printHeader);
    }
    
    // Pro機能のイベントハンドラ
    function exportCsv() {
        if (!window.HDLicense || !window.HDLicense.isPro()) {
            promptPro();
            return;
        }
        var csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "氏名,職種,月額改善額,一時金・賞与,年間改善額\n";
        state.staff.forEach(function(s) {
            var annual = s.monthly * 12 + s.bonus;
            csvContent += s.name + "," + s.role + "," + s.monthly + "," + s.bonus + "," + annual + "\n";
        });
        
        var encodedUri = encodeURI(csvContent);
        var link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "処遇改善配分_" + (dom.jigyoshoName.value || '') + "_" + new Date().toISOString().slice(0,10) + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function openSaveLoadModal(mode) {
         if (!window.HDLicense || !window.HDLicense.isPro()) {
            promptPro();
            return;
        }
        dom.saveLoadModal.classList.remove('hidden');
        renderSaveSlots();
    }

    function renderSaveSlots() {
        dom.saveSlots.innerHTML = '';
        var saves = getProSaves();
        if (Object.keys(saves).length === 0) {
            dom.saveSlots.innerHTML = '<p class="muted">保存されたデータはありません。</p>';
            return;
        }
        for (var name in saves) {
            var div = document.createElement('div');
            div.className = 'tile';
            div.innerHTML = '<span>' + name + ' <small class="muted">(' + saves[name].date + ')</small></span>' +
                '<div class="btn-row">' +
                    '<button class="btn sm" data-savename="' + name + '">読込</button>' +
                    '<button class="btn sm danger" data-savename="' + name + '">削除</button>' +
                '</div>';
            dom.saveSlots.appendChild(div);
        }
    }
    
    function getProSaves() {
        try {
            return JSON.parse(localStorage.getItem(PRO_SAVES_KEY) || '{}');
        } catch(e) {
            return {};
        }
    }

    function saveProSlot(name) {
        if (!name) {
            alert('保存名を入力してください。');
            return;
        }
        var saves = getProSaves();
        saves[name] = {
            date: new Date().toLocaleDateString('ja-JP'),
            data: {
                serviceType: dom.serviceType.value,
                kasanKbn: dom.kasanKbn.value,
                hoshuGaku: dom.hoshuGaku.value,
                jigyoshoName: dom.jigyoshoName.value,
                staff: state.staff,
                customRates: state.customRates,
            }
        };
        localStorage.setItem(PRO_SAVES_KEY, JSON.stringify(saves));
        renderSaveSlots();
    }
    
    function loadProSlot(name) {
        var saves = getProSaves();
        if(saves[name]) {
            var data = saves[name].data;
            dom.serviceType.value = data.serviceType;
            dom.kasanKbn.value = data.kasanKbn;
            dom.hoshuGaku.value = data.hoshuGaku;
            dom.jigyoshoName.value = data.jigyoshoName;
            state.staff = data.staff;
            state.customRates = data.customRates || {};
            dom.saveLoadModal.classList.add('hidden');
            renderAll();
        }
    }

    function deleteProSlot(name) {
        if (confirm('「' + name + '」のデータを削除しますか？')) {
            var saves = getProSaves();
            delete saves[name];
            localStorage.setItem(PRO_SAVES_KEY, JSON.stringify(saves));
            renderSaveSlots();
        }
    }
    
    function handleSaveSlotsClick(e) {
        var name = e.target.dataset.savename;
        if (!name) return;
        if (e.target.textContent === '読込') {
            loadProSlot(name);
        } else if (e.target.textContent === '削除') {
            deleteProSlot(name);
        }
    }

    // --- 初期化 ---
    function init() {
        // イベントリスナーの設定
        [dom.serviceType, dom.kasanKbn, dom.hoshuGaku, dom.jigyoshoName].forEach(el => el.addEventListener('change', handleInputsChange));
        [dom.totalTani, dom.chiikiTanka].forEach(el => el.addEventListener('change', handleTaniToHoshu));
        
        dom.editRatesToggle.addEventListener('change', () => dom.ratesEditor.classList.toggle('hidden'));
        dom.ratesInputs.addEventListener('change', handleRateEditors);
        dom.resetRatesBtn.addEventListener('click', resetRates);

        dom.haibunTable.addEventListener('change', handleStaffTableChange);
        dom.haibunTable.addEventListener('input', handleStaffTableChange); // for number fields
        dom.haibunTable.addEventListener('click', handleStaffTableChange); // for delete button

        dom.addStaffBtn.addEventListener('click', addStaffMember);
        
        dom.proBtn.addEventListener('click', handleProBtnClick);
        dom.proLeadBtn.addEventListener('click', promptPro);
        dom.proLeadBtn2.addEventListener('click', promptPro);
        
        dom.printBtn.addEventListener('click', printView);
        dom.csvExportBtn.addEventListener('click', exportCsv);
        dom.saveBtn.addEventListener('click', () => openSaveLoadModal('save'));
        dom.loadBtn.addEventListener('click', () => openSaveLoadModal('load'));
        
        dom.closeModalBtn.addEventListener('click', () => dom.saveLoadModal.classList.add('hidden'));
        dom.saveSlotBtn.addEventListener('click', () => saveProSlot(dom.saveName.value));
        dom.saveSlots.addEventListener('click', handleSaveSlotsClick);


        // HDLicenseのコールバック設定
        if (window.HDLicense) {
            window.HDLicense.onChange(renderUIByPlan);
        }
        
        // 初期データの読み込みと描画
        loadState();
        renderAll();
    }

    // DOMの準備ができたら初期化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
