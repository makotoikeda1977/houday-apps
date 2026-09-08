(function() {
    'use strict';

    // --- 定数 ---
    var BUY_URL = 'https://note.com/houday';
    var STORAGE_KEY_PREFIX = 'hd_yukyu-master_';
    var FREE_EMPLOYEE_LIMIT = 3;

    // 付与日数データ
    const GRANT_DAYS_TABLE = {
        standard: { 0.5: 10, 1.5: 11, 2.5: 12, 3.5: 14, 4.5: 16, 5.5: 18, 6.5: 20 },
        part_4: { 0.5: 7, 1.5: 8, 2.5: 9, 3.5: 10, 4.5: 12, 5.5: 13, 6.5: 15 },
        part_3: { 0.5: 5, 1.5: 6, 2.5: 6, 3.5: 8, 4.5: 9, 5.5: 10, 6.5: 11 },
        part_2: { 0.5: 3, 1.5: 4, 2.5: 4, 3.5: 5, 4.5: 6, 5.5: 6, 6.5: 7 },
        part_1: { 0.5: 1, 1.5: 2, 2.5: 2, 3.5: 2, 4.5: 3, 5.5: 3, 6.5: 3 }
    };

    // --- DOM要素 ---
    const G = {};
    const ids = [
        'planBadge', 'proBtn', 'employeeList', 'addEmployeeBtn', 'employeeLimitNote', 'proCtaEmployee', 
        'employeeDetails', 'employeeNameHeader', 'kpi-remaining-days', 'kpi-taken-this-year', 
        'kpi-5day-obligation', 'kpi-next-expiry', 'grant-schedule-body', 'add-leave-form', 
        'leave-date', 'leave-days', 'leave-history-body', 'consumption-order-select', 
        'unify-grant-date-checkbox', 'unify-grant-date-select', 'print-ledger-btn', 'csv-export-btn', 
        'json-backup-btn', 'json-restore-btn', 'no-employee-selected', 'alerts-body', 'no-alerts', 
        'alerts-table', 'employeeModal', 'modal-title', 'employeeForm', 'employeeId', 'employeeName', 
        'hireDate', 'workCategory', 'annualPrescribedDays', 'cancelModal', 'deleteEmployeeBtn', 
        'json-restore-input'
    ];
    ids.forEach(id => { G[id] = document.getElementById(id); });
    G.noAlerts = G['no-alerts']; G.noEmployeeSelected = G['no-employee-selected'];

    // --- 状態管理 ---
    let state = {
        employees: [],
        selectedEmployeeId: null,
    };

    // --- データ永続化 ---
    function saveData() {
        try {
            const dataToSave = {
                employees: state.employees,
                selectedEmployeeId: state.selectedEmployeeId
            };
            localStorage.setItem(STORAGE_KEY_PREFIX + 'data', JSON.stringify(dataToSave));
        } catch (e) {
            console.error('Data save failed.', e);
        }
    }

    function loadData() {
        try {
            const data = localStorage.getItem(STORAGE_KEY_PREFIX + 'data');
            if (data) {
                const parsed = JSON.parse(data);
                state.employees = parsed.employees || [];
                state.selectedEmployeeId = parsed.selectedEmployeeId || null;
                 // 互換性のため古いデータ構造もサポート
                if (parsed.settings) {
                    state.employees.forEach(emp => {
                        if (!emp.consumptionOrder) emp.consumptionOrder = parsed.settings.consumptionOrder || 'fifo';
                    });
                }
            }
        } catch (e) {
            console.error('Data load failed.', e);
            state = { employees: [], selectedEmployeeId: null };
        }
    }

    // --- 日付ヘルパー ---
    const formatDate = (date) => date ? new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '';
    const addMonths = (date, months) => { const d = new Date(date); d.setMonth(d.getMonth() + months); return d; };
    const addYears = (date, years) => { const d = new Date(date); d.setFullYear(d.getFullYear() + years); return d; };
    const toDateString = (date) => new Date(date).toISOString().split('T')[0];

    // --- コア計算ロジック ---
    function getEmployeeById(id) {
        return state.employees.find(e => e.id === id);
    }
    
    function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
    function startOfToday() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }

    function generateGrantSchedule(employee) {
        if (!employee || !employee.hireDate) return [];
        const schedule = [];
        const hireDate = new Date(employee.hireDate);
        
        for (let i = 0; i < 40; i++) {
            const yearsOfService = 0.5 + i;
            const grantDate = addMonths(hireDate, Math.round(yearsOfService * 12));
            
            const table = GRANT_DAYS_TABLE[employee.workCategory] || GRANT_DAYS_TABLE.standard;
            const yearsKey = yearsOfService >= 6.5 ? 6.5 : yearsOfService;
            const grantDays = table[yearsKey] || 0;
            if (grantDays === 0 && yearsOfService > 6.5) continue;
            
            const isNoAttenance = (employee.noAttendanceYears || []).includes(grantDate.getFullYear());
            
            schedule.push({
                sequence: i + 1,
                grantDate: grantDate,
                grantDays: isNoAttenance ? 0 : grantDays,
                expiryDate: addDays(addYears(grantDate, 2), -1), // 2年後の応当日の前日
                obligationDeadline: addDays(addYears(grantDate, 1), -1), // 1年後の応当日の前日
                isNoAttenance: isNoAttenance,
            });
        }
        return schedule;
    }
    
    function getObligationGrant(employee) {
        const schedule = generateGrantSchedule(employee);
        const today = new Date();
        return schedule.slice().reverse().find(s => s.grantDays >= 10 && s.grantDate <= today && startOfToday() <= s.obligationDeadline);
    }

    function calculateLeaveStatus(employee) {
        const schedule = generateGrantSchedule(employee);
        const today = new Date();

        let grants = schedule.map(item => ({
            grantDate: item.grantDate,
            expiryDate: item.expiryDate,
            remaining: item.isNoAttenance ? 0 : item.grantDays,
        })).filter(g => g.grantDate <= today);

        const takenLeaves = [...(employee.takenLeaves || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        let sortedGrants = (employee.consumptionOrder === 'lifo') ? [...grants].reverse() : grants;
        for (const leave of takenLeaves) {
            let leaveDays = leave.days;
            const ld = new Date(leave.date);
            // 取得日時点で有効（付与済み・未消滅）の付与分にだけ充当する
            for (const grant of sortedGrants) {
                if (leaveDays <= 0) break;
                if (grant.grantDate > ld || grant.expiryDate < ld) continue;
                const taken = Math.min(leaveDays, grant.remaining);
                grant.remaining -= taken;
                leaveDays -= taken;
            }
        }

        // 残日数は「今日時点で未消滅」の付与分のみ（時効で消えた分は含めない）
        const today0 = startOfToday();
        const remainingDays = grants.filter(g => g.expiryDate >= today0).reduce((sum, g) => sum + g.remaining, 0);

        const currentFiscalYearStart = today.getMonth() >= 3 ? new Date(today.getFullYear(), 3, 1) : new Date(today.getFullYear() - 1, 3, 1);
        const takenThisYear = takenLeaves
            .filter(l => new Date(l.date) >= currentFiscalYearStart)
            .reduce((sum, l) => sum + l.days, 0);

        const obligationGrant = getObligationGrant(employee);
        let obligationStatus = { text: '対象外', class: 'muted' };
        if (obligationGrant) {
            const takenSinceGrant = takenLeaves
                .filter(l => new Date(l.date) >= obligationGrant.grantDate && new Date(l.date) <= obligationGrant.obligationDeadline)
                .reduce((sum, l) => sum + l.days, 0);
            const remainingForObligation = Math.max(0, 5 - takenSinceGrant);
            if (remainingForObligation === 0) {
                obligationStatus = { text: '達成', class: 'ok' };
            } else {
                const daysLeft = Math.ceil((obligationGrant.obligationDeadline - today) / (1000 * 3600 * 24));
                obligationStatus = { text: `あと${remainingForObligation}日`, class: daysLeft <= 90 ? 'ng' : 'warn', remaining: remainingForObligation, deadline: obligationGrant.obligationDeadline };
            }
        }
        
        const nextExpiryGrant = grants.filter(g => g.remaining > 0 && g.expiryDate >= today0).sort((a,b) => a.expiryDate - b.expiryDate)[0];
        const nextExpiryText = nextExpiryGrant ? `${nextExpiryGrant.remaining}日 (${formatDate(nextExpiryGrant.expiryDate)}に失効)` : 'なし';

        return { remainingDays, takenThisYear, obligationStatus, nextExpiryText, grants };
    }

    // --- 描画ロジック ---
    function render() {
        const isPro = window.HDLicense.isPro();
        updateProStatus(isPro);
        renderEmployeeList(isPro);
        renderEmployeeDetails();
        renderAlerts();
    }

    function renderEmployeeList(isPro) {
        G.employeeList.innerHTML = '';
        const employeesToShow = isPro ? state.employees : state.employees.slice(0, FREE_EMPLOYEE_LIMIT);

        employeesToShow.forEach(emp => {
            const div = document.createElement('div');
            div.className = 'employee-item';
            div.textContent = emp.name;
            div.dataset.id = emp.id;
            if (emp.id === state.selectedEmployeeId) {
                div.classList.add('active');
            }
            G.employeeList.appendChild(div);
        });
        
        const canAddMore = isPro || state.employees.length < FREE_EMPLOYEE_LIMIT;
        G.addEmployeeBtn.disabled = !canAddMore;
        G.employeeLimitNote.classList.toggle('hidden', canAddMore);
    }
    
    function renderEmployeeDetails() {
        const employee = getEmployeeById(state.selectedEmployeeId);
        if (!employee) {
            G.employeeDetails.classList.add('hidden');
            G.noEmployeeSelected.classList.remove('hidden');
            return;
        }
        
        G.employeeDetails.classList.remove('hidden');
        G.noEmployeeSelected.classList.add('hidden');
        G.employeeNameHeader.textContent = employee.name;
        
        const { remainingDays, takenThisYear, obligationStatus, nextExpiryText, grants } = calculateLeaveStatus(employee);

        G['kpi-remaining-days'].textContent = remainingDays;
        G['kpi-taken-this-year'].textContent = takenThisYear;
        G['kpi-5day-obligation'].innerHTML = `<span class="pill ${obligationStatus.class}">${obligationStatus.text}</span>`;
        G['kpi-next-expiry'].textContent = nextExpiryText;

        const schedule = generateGrantSchedule(employee).filter(s => s.grantDate < addYears(new Date(), 2));
        G['grant-schedule-body'].innerHTML = schedule.map(item => {
            const grantInfo = grants.find(g => g.grantDate.getTime() === item.grantDate.getTime());
            const remaining = grantInfo ? grantInfo.remaining : item.grantDays;
            return `
                <tr class="${item.grantDate > new Date() ? 'muted' : ''}">
                    <td>第${item.sequence}回</td>
                    <td>${formatDate(item.grantDate)}</td>
                    <td>${item.grantDays}日 (残: ${item.isNoAttenance ? 0 : remaining})</td>
                    <td><input type="checkbox" class="no-attendance-check" data-grant-date="${item.grantDate.toISOString()}" ${item.isNoAttenance ? 'checked' : ''}></td>
                    <td>${formatDate(item.expiryDate)}</td>
                    <td>${item.grantDays >= 10 ? formatDate(item.obligationDeadline) : '-'}</td>
                    <td>${obligationStatus.text === '達成' && item.grantDate.getTime() === (getObligationGrant(employee) || {}).grantDate.getTime() ? '✓' : ''}</td>
                </tr>
            `
        }).join('');

        G['leave-history-body'].innerHTML = (employee.takenLeaves || []).sort((a,b) => new Date(b.date) - new Date(a.date)).map(leave => `
            <tr>
                <td>${formatDate(leave.date)}</td>
                <td>${leave.days}日</td>
                <td><button class="btn sm danger ghost delete-leave" data-date="${leave.date}">削除</button></td>
            </tr>`).join('');
        
        G['consumption-order-select'].value = employee.consumptionOrder || 'fifo';
    }

    function renderAlerts() {
        const allAlerts = [];
        const today = new Date();

        state.employees.forEach(employee => {
            const { obligationStatus, grants } = calculateLeaveStatus(employee);
            if (obligationStatus.class === 'ng' || obligationStatus.class === 'warn') {
                allAlerts.push({
                    employee: employee.name,
                    content: `5日義務未達成 (あと${obligationStatus.remaining}日)`,
                    deadline: `期限: ${formatDate(obligationStatus.deadline)}`
                });
            }
            grants.forEach(grant => {
                const daysUntilExpiry = (grant.expiryDate - today) / (1000 * 3600 * 24);
                if (grant.remaining > 0 && daysUntilExpiry > 0 && daysUntilExpiry <= 60) {
                     allAlerts.push({
                        employee: employee.name,
                        content: `時効消滅まであと${Math.ceil(daysUntilExpiry)}日`,
                        deadline: `${grant.remaining}日分が ${formatDate(grant.expiryDate)} に消滅`
                    });
                }
            });
        });

        if (allAlerts.length > 0) {
            G['alerts-body'].innerHTML = allAlerts.map(alert => `
                <tr><td>${alert.employee}</td><td>${alert.content}</td><td>${alert.deadline}</td></tr>
            `).join('');
            G['alerts-table'].classList.remove('hidden');
            G.noAlerts.classList.add('hidden');
        } else {
            G['alerts-table'].classList.add('hidden');
            G.noAlerts.classList.remove('hidden');
        }
    }
    
    function updateProStatus(isPro) {
        G.planBadge.textContent = isPro ? 'Pro' : 'Free';
        G.planBadge.className = isPro ? 'badge pro' : 'badge';
        G.proBtn.textContent = isPro ? 'Pro有効' : 'Pro版';
        
        G['unify-grant-date-checkbox'].disabled = !isPro;
        G['csv-export-btn'].disabled = !isPro;
    }

    // --- イベントハンドラ ---
    function openModal(id = null) {
        G.employeeForm.reset();
        G.employeeId.value = '';
        G.deleteEmployeeBtn.classList.add('hidden');
        G['modal-title'].textContent = '社員の追加';
        
        if (id) {
            const employee = getEmployeeById(id);
            if (employee) {
                G['modal-title'].textContent = '社員情報の編集';
                G.employeeId.value = employee.id;
                G.employeeName.value = employee.name;
                G.hireDate.value = toDateString(employee.hireDate);
                G.workCategory.value = employee.workCategory;
                G.annualPrescribedDays.value = employee.annualPrescribedDays || '';
                G.deleteEmployeeBtn.classList.remove('hidden');
            }
        }
        G.employeeModal.classList.remove('hidden');
    }
    
    function closeModal() {
        G.employeeModal.classList.add('hidden');
    }

    function handleSaveEmployee(e) {
        e.preventDefault();
        const id = G.employeeId.value;
        const formData = {
            name: G.employeeName.value.trim(),
            hireDate: G.hireDate.value,
            workCategory: G.workCategory.value,
            annualPrescribedDays: G.annualPrescribedDays.value ? parseInt(G.annualPrescribedDays.value, 10) : null,
        };
        if (!formData.name || !formData.hireDate) {
            alert('氏名と入社日は必須です。');
            return;
        }

        if (id) { // 更新
            const index = state.employees.findIndex(emp => emp.id === id);
            if (index !== -1) {
                state.employees[index] = { ...state.employees[index], ...formData };
            }
        } else { // 新規
            const newEmployee = { ...formData, id: `emp_${Date.now()}`, takenLeaves: [], noAttendanceYears: [], consumptionOrder: 'fifo' };
            state.employees.push(newEmployee);
            state.selectedEmployeeId = newEmployee.id;
        }
        saveData();
        render();
        closeModal();
    }

    function handleDeleteEmployee() {
        const id = G.employeeId.value;
        if (!id || !confirm('この社員を削除しますか？データは復元できません。')) return;

        state.employees = state.employees.filter(e => e.id !== id);
        if (state.selectedEmployeeId === id) {
            state.selectedEmployeeId = state.employees.length > 0 ? state.employees[0].id : null;
        }
        saveData();
        render();
        closeModal();
    }

    function handleAddLeave(e) {
        e.preventDefault();
        const employee = getEmployeeById(state.selectedEmployeeId);
        if (!employee) return;
        
        const date = G['leave-date'].value;
        const days = parseFloat(G['leave-days'].value);

        if (!date) { alert('日付を入力してください'); return; }

        if (!employee.takenLeaves) employee.takenLeaves = [];
        
        if (employee.takenLeaves.some(l => l.date === date)) {
            alert('同じ日に既に休暇が登録されています。');
            return;
        }
        
        employee.takenLeaves.push({ date, days });
        saveData();
        render();
        G['add-leave-form'].reset();
    }

    function handleDeleteLeave(e) {
        if (!e.target.closest('.delete-leave')) return;
        const employee = getEmployeeById(state.selectedEmployeeId);
        if (!employee) return;
        
        const dateToDelete = e.target.dataset.date;
        if (confirm(`${formatDate(dateToDelete)}の休暇記録を削除しますか？`)) {
            employee.takenLeaves = employee.takenLeaves.filter(l => l.date !== dateToDelete);
            saveData();
            render();
        }
    }

    function handleNoAttendanceCheck(e) {
        if (!e.target.classList.contains('no-attendance-check')) return;
        const employee = getEmployeeById(state.selectedEmployeeId);
        if (!employee) return;
        
        const grantDate = new Date(e.target.dataset.grantDate);
        const year = grantDate.getFullYear();
        
        if (!employee.noAttendanceYears) employee.noAttendanceYears = [];

        if (e.target.checked) {
            if (!employee.noAttendanceYears.includes(year)) employee.noAttendanceYears.push(year);
        } else {
            employee.noAttendanceYears = employee.noAttendanceYears.filter(y => y !== year);
        }
        saveData();
        render();
    }
    
    function handleConsumptionOrderChange(e) {
        const employee = getEmployeeById(state.selectedEmployeeId);
        if (employee) {
            employee.consumptionOrder = e.target.value;
            saveData();
            render();
        }
    }
    
    function promptPro() {
        window.HDLicense.prompt({ buyUrl: BUY_URL });
    }
    
    function handleCsvExport() {
        if (!window.HDLicense.isPro()) {
            alert('CSV出力はPro版の機能です。');
            promptPro();
            return;
        }
        const header = '社員名,取得日,日数\\n';
        const rows = state.employees.flatMap(emp => 
            (emp.takenLeaves || []).map(leave => `${emp.name},${leave.date},${leave.days}`)
        );
        const content = header + rows.join('\\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `yukyu-master-export-${toDateString(new Date())}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleJsonBackup() {
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `yukyu-master-backup-${toDateString(new Date())}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function handleJsonRestore() {
        if (confirm('現在のデータを上書きして復元します。よろしいですか？')) {
            G['json-restore-input'].click();
        }
    }

    function processRestoreFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const restored = JSON.parse(event.target.result);
                if (restored && restored.employees) {
                    state = restored;
                    saveData();
                    render();
                    alert('データを復元しました。');
                } else {
                    alert('無効なバックアップファイルです。');
                }
            } catch (err) {
                alert('ファイルの読み込みに失敗しました。');
                console.error(err);
            } finally {
                G['json-restore-input'].value = '';
            }
        };
        reader.readAsText(file);
    }

    // --- 初期化 ---
    function init() {
        G.employeeList.addEventListener('click', (e) => {
            const item = e.target.closest('.employee-item');
            if (item) {
                state.selectedEmployeeId = item.dataset.id;
                saveData();
                render();
            }
        });
        G.employeeList.addEventListener('dblclick', (e) => {
            const item = e.target.closest('.employee-item');
            if (item) openModal(item.dataset.id);
        });

        G.addEmployeeBtn.addEventListener('click', () => openModal());
        G.proCtaEmployee.addEventListener('click', promptPro);
        G.proBtn.addEventListener('click', () => {
            if (window.HDLicense.isPro()) {
                if (confirm('Proプランを無効にしますか？')) window.HDLicense.deactivate();
            } else {
                promptPro();
            }
        });

        G.employeeModal.addEventListener('click', (e) => { if (e.target === G.employeeModal) closeModal(); });
        G.cancelModal.addEventListener('click', closeModal);
        G.employeeForm.addEventListener('submit', handleSaveEmployee);
        G.deleteEmployeeBtn.addEventListener('click', handleDeleteEmployee);

        G['add-leave-form'].addEventListener('submit', handleAddLeave);
        G['leave-history-body'].addEventListener('click', handleDeleteLeave);
        G['grant-schedule-body'].addEventListener('click', handleNoAttendanceCheck);
        G['consumption-order-select'].addEventListener('change', handleConsumptionOrderChange);
        
        G['json-backup-btn'].addEventListener('click', handleJsonBackup);
        G['json-restore-btn'].addEventListener('click', handleJsonRestore);
        G['json-restore-input'].addEventListener('change', processRestoreFile);
        
        G['print-ledger-btn'].addEventListener('click', () => window.print());
        G['csv-export-btn'].addEventListener('click', handleCsvExport);

        window.HDLicense.onChange(render);

        loadData();
        render();
    }

    init();

})();
