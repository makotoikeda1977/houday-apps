(function() {
  'use strict';

  var BUY_URL = 'https://note.com/houday';

  const CHECKLIST_ITEMS = [
    // 人員基準
    { id: 'C01', cat: '人員基準', text: '管理者を配置している（常勤・原則専従、同一敷地内の他職務との兼務可）', basis: '基準省令', risk: '高' },
    { id: 'C02', cat: '人員基準', text: '児童発達支援管理責任者を常勤・専任で配置し、欠如時は児発管欠如減算の対象と理解している', basis: '基準省令・減算', risk: '高' },
    { id: 'C03', cat: '人員基準', text: '児童指導員又は保育士を営業時間を通じて単位ごとに10:2以上（定員10超は5:1で加配）配置している', basis: '人員基準', risk: '高' },
    { id: 'C04', cat: '人員基準', text: '児発管の基礎研修・実践研修・更新研修（5年ごと）の修了証を保管し期限を管理している', basis: '児発管要件', risk: '高' },
    { id: 'C05', cat: '人員基準', text: '従業者の資格証・実務経験証明書・履歴書を保管している', basis: '指定申請書類', risk: '中' },
    { id: 'C06', cat: '人員基準', text: '勤務形態一覧表を毎月作成し、常勤換算と実際のシフト・タイムカードが一致している', basis: '勤務体制の確保', risk: '高' },
    { id: 'C07', cat: '人員基準', text: '従業者に対する研修計画（年間）と実施記録がある', basis: '基準省令', risk: '中' },
    // 契約・受給者証・請求
    { id: 'C08', cat: '契約・受給者証・請求', text: '重要事項説明書と契約書を保護者へ説明し、同意の署名・交付をしている', basis: '内容及び手続の説明・同意', risk: '高' },
    { id: 'C09', cat: '契約・受給者証・請求', text: '運営規程の内容（定員・営業日時・サービス内容・利用料・苦情窓口）が実態と一致している', basis: '運営規程', risk: '中' },
    { id: 'C10', cat: '契約・受給者証・請求', text: '受給者証を確認し写しを保管、有効期限・支給量・上限月額を把握している', basis: '受給資格の確認', risk: '高' },
    { id: 'C11', cat: '契約・受給者証・請求', text: '利用者負担上限額管理が必要な児童の上限管理事務を適切に行っている', basis: '上限額管理', risk: '中' },
    { id: 'C12', cat: '契約・受給者証・請求', text: 'サービス提供実績記録票を毎回記録し、保護者の確認（署名・押印）を得て請求と一致している', basis: '給付費の請求', risk: '高' },
    { id: 'C13', cat: '契約・受給者証・請求', text: 'おやつ代・教材費等の実費徴収は同意書と領収書を整備している', basis: '利用者負担・実費', risk: '中' },
    // 個別支援計画
    { id: 'C14', cat: '個別支援計画', text: 'アセスメント（面接・保護者からの聞取り）を実施し記録している', basis: '個別支援計画の作成', risk: '高' },
    { id: 'C15', cat: '個別支援計画', text: '原案作成→担当者会議（会議録あり）→保護者への説明・同意・交付の手順を毎回踏んでいる', basis: '個別支援計画の作成', risk: '高' },
    { id: 'C16', cat: '個別支援計画', text: '利用開始時に計画を作成しており、未作成期間がない（未作成は個別支援計画未作成減算 30%／3か月超は70%）', basis: '減算', risk: '高' },
    { id: 'C17', cat: '個別支援計画', text: 'モニタリングを少なくとも6か月に1回実施し、記録と計画見直しがある', basis: '個別支援計画の見直し', risk: '高' },
    { id: 'C18', cat: '個別支援計画', text: '計画に5領域（健康・生活／運動・感覚／認知・行動／言語・コミュニケーション／人間関係・社会性）を含む総合的支援が記載されている', basis: '令和6年度改定', risk: '高' },
    { id: 'C19', cat: '個別支援計画', text: '事業所の支援プログラムを作成しインターネット等で公表している（未公表は減算）', basis: '支援プログラム公表・令和7年4月〜', risk: '高' },
    // 記録・苦情・事故
    { id: 'C20', cat: '記録・苦情・事故', text: 'サービス提供記録（支援内容・提供時間・児童の様子）を毎回作成している', basis: '記録の整備', risk: '高' },
    { id: 'C21', cat: '記録・苦情・事故', text: '記録類を完結日から5年間保存している（自治体により2年の場合もあり）', basis: '記録の整備', risk: '中' },
    { id: 'C22', cat: '記録・苦情・事故', text: '苦情受付窓口・担当者・第三者委員を定め、受付記録と対応記録がある', basis: '苦情解決', risk: '中' },
    { id: 'C23', cat: '記録・苦情・事故', text: '事故発生時の対応マニュアルがあり、発生時は市町村・保護者へ報告し記録している', basis: '事故発生時の対応', risk: '高' },
    { id: 'C24', cat: '記録・苦情・事故', text: 'ヒヤリハットを収集・分析し再発防止策を検討している', basis: '安全管理', risk: '低' },
    // 虐待防止・身体拘束
    { id: 'C25', cat: '虐待防止・身体拘束', text: '虐待防止委員会を定期開催し議事録を従業者へ周知している（未実施は虐待防止措置未実施減算1%）', basis: '令和4年4月義務化', risk: '高' },
    { id: 'C26', cat: '虐待防止・身体拘束', text: '虐待防止研修を年1回以上実施し記録している', basis: '虐待防止', risk: '高' },
    { id: 'C27', cat: '虐待防止・身体拘束', text: '虐待防止担当者を選任している', basis: '虐待防止', risk: '高' },
    { id: 'C28', cat: '虐待防止・身体拘束', text: '身体拘束適正化委員会・指針・年1回以上の研修を実施している（未実施は身体拘束廃止未実施減算1%）', basis: '身体拘束等の適正化', risk: '高' },
    { id: 'C29', cat: '虐待防止・身体拘束', text: 'やむを得ず身体拘束を行った場合、態様・時間・心身の状況・理由を記録し個別支援計画に記載している', basis: '身体拘束の記録', risk: '高' },
    // 安全・BCP・感染症・送迎
    { id: 'C30', cat: '安全・BCP・感染症・送迎', text: '業務継続計画（感染症・災害）を策定し、研修・訓練を実施している（未策定は業務継続計画未策定減算1%）', basis: '令和6年4月義務化', risk: '高' },
    { id: 'C31', cat: '安全・BCP・感染症・送迎', text: '感染症対策委員会（おおむね6か月に1回）・指針・研修・訓練（年1回以上）を実施している', basis: '感染症対策', risk: '高' },
    { id: 'C32', cat: '安全・BCP・感染症・送迎', text: '安全計画を策定し、研修・訓練を行い保護者へ周知している', basis: '令和5年4月義務化', risk: '高' },
    { id: 'C33', cat: '安全・BCP・感染症・送迎', text: '非常災害対策計画があり、避難訓練を定期的に実施し記録している', basis: '非常災害対策', risk: '中' },
    { id: 'C34', cat: '安全・BCP・感染症・送迎', text: '送迎時は乗降時の点呼等で児童の所在を確認し、送迎車両に置き去り防止の安全装置を設置している', basis: '令和5年4月義務化', risk: '高' },
    { id: 'C35', cat: '安全・BCP・感染症・送迎', text: '送迎加算の算定要件（居宅等と事業所間の送迎、実施記録、同一敷地内は不可等）を満たしている', basis: '送迎加算', risk: '中' },
    { id: 'C36', cat: '安全・BCP・感染症・送迎', text: '衛生管理（消毒・手洗い・検温・体調確認）の手順と記録がある', basis: '衛生管理', risk: '低' },
    // 掲示・公表・届出
    { id: 'C37', cat: '掲示・公表・届出', text: '運営規程の概要・勤務体制・協力医療機関・苦情窓口等の重要事項を事業所内に掲示（またはファイル備付）している', basis: '掲示', risk: '中' },
    { id: 'C38', cat: '掲示・公表・届出', text: '自己評価・保護者評価を年1回以上実施し結果を公表している（未実施は自己評価結果等未公表減算15%）', basis: '自己評価結果等の公表', risk: '高' },
    { id: 'C39', cat: '掲示・公表・届出', text: '障害福祉サービス等情報公表制度（WAM NET）へ毎年報告している', basis: '情報公表', risk: '中' },
    { id: 'C40', cat: '掲示・公表・届出', text: '定員・従業者・運営規程等の変更があった場合、10日以内に変更届を提出している', basis: '変更の届出', risk: '中' },
    // 定員・利用時間
    { id: 'C41', cat: '定員・利用時間', text: '月平均の利用児童数が定員を超えていない（定員超過利用減算）', basis: '減算', risk: '高' },
    { id: 'C42', cat: '定員・利用時間', text: '利用時間区分（30分以下は原則算定不可、時間区分1〜3）を計画と記録で裏付けている', basis: '令和6年度改定', risk: '高' },
    { id: 'C43', cat: '定員・利用時間', text: '延長支援加算は計画に位置づけ、実際の延長時間と職員配置を記録している', basis: '延長支援加算', risk: '中' },
    // 加算要件
    { id: 'C44', cat: '加算要件', text: '専門的支援体制加算／専門的支援実施加算の有資格者配置・実施計画・記録が揃っている', basis: '加算要件', risk: '高' },
    { id: 'C45', cat: '加算要件', text: '児童指導員等加配加算の常勤換算要件・資格要件を毎月満たしている', basis: '加算要件', risk: '高' },
    { id: 'C46', cat: '加算要件', text: '家族支援加算（相談援助・面談）の記録と計画への位置づけがある', basis: '加算要件', risk: '中' },
    { id: 'C47', cat: '加算要件', text: '関係機関連携加算・事業所間連携加算の会議録・連絡記録がある', basis: '加算要件', risk: '中' },
    { id: 'C48', cat: '加算要件', text: '医療連携体制加算の主治医指示書・看護記録がある', basis: '加算要件', risk: '中' },
    { id: 'C49', cat: '加算要件', text: '強度行動障害児支援加算の研修修了者配置と支援計画がある', basis: '加算要件', risk: '中' },
    { id: 'C50', cat: '加算要件', text: '処遇改善加算の計画書・実績報告・賃金改善の実施・職場環境等要件の実施記録が揃っている', basis: '処遇改善加算', risk: '高' },
    { id: 'C51', cat: '加算要件', text: '欠席時対応加算は連絡日時・相談援助内容を記録し、月4回（重度等は8回）の上限を守っている', basis: '加算要件', risk: '中' },
    { id: 'C52', cat: '加算要件', text: '個別サポート加算Ⅰ・Ⅱの根拠（ケアニーズ判定、要保護・要支援児童の連携記録）がある', basis: '加算要件', risk: '中' },
    // その他運営
    { id: 'C53', cat: 'その他運営', text: '個人情報の利用同意を保護者から文書で得て、秘密保持を従業者に誓約させている', basis: '秘密保持等', risk: '中' },
    { id: 'C54', cat: 'その他運営', text: '従業者の健康診断を年1回実施している', basis: '労働安全衛生・衛生管理', risk: '低' },
    { id: 'C55', cat: 'その他運営', text: '事業ごとに会計を区分している', basis: '会計の区分', risk: '中' },
    { id: 'C56', cat: 'その他運営', text: '損害賠償責任保険に加入している', basis: '賠償責任', risk: '低' },
    { id: 'C57', cat: 'その他運営', text: '相談支援事業所・学校・保育所等との連携記録があり、障害児支援利用計画と個別支援計画が整合している', basis: '連携', risk: '低' },
    { id: 'C58', cat: 'その他運営', text: 'ハラスメント防止方針を定め従業者に周知している', basis: '職場環境', risk: '低' },
    { id: 'C59', cat: 'その他運営', text: '労働条件通知書・就業規則を整備し従業者に周知している', basis: '労務', risk: '低' },
    { id: 'C60', cat: 'その他運営', text: '事業所の指定有効期間（6年）の更新時期を把握している', basis: '指定の更新', risk: '中' }
  ];

  const STORAGE_KEY = 'hd_jitchi-check_';
  let state = {};

  // DOM要素のキャッシュ
  const dom = {};

  /**
   * アプリケーションの状態をlocalStorageに保存
   */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }

  /**
   * localStorageからアプリケーションの状態を読み込み
   */
  function loadState() {
    try {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        return JSON.parse(savedState);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    // デフォルトのstateオブジェクト
    return {
      info: {
        officeName: '',
        officeType: '放デイ',
        checkDate: new Date().toISOString().substring(0, 10),
        checkerName: '',
      },
      answers: {}, // { C01: { answer: 'yes', memo: '' }, ... }
    };
  }

  /**
   * リスクレベルに応じたpillクラスを返す
   * @param {string} risk リスクレベル ('高'|'中'|'低')
   * @returns {string} pillクラス名
   */
  function getRiskPillClass(risk) {
    switch (risk) {
      case '高': return 'ng';
      case '中': return 'warn';
      case '低': return 'muted';
      default: return 'muted';
    }
  }

  /**
   * チェックリストのレンダリング
   */
  function renderChecklist() {
    const categories = [...new Set(CHECKLIST_ITEMS.map(item => item.cat))];
    const checklistContainer = dom.checklistContainer;
    checklistContainer.innerHTML = '';

    categories.forEach(category => {
      const categoryEl = document.createElement('details');
      categoryEl.open = true;
      const summaryEl = document.createElement('summary');
      summaryEl.textContent = category;
      categoryEl.appendChild(summaryEl);
      
      const items = CHECKLIST_ITEMS.filter(item => item.cat === category);
      items.forEach(item => {
        const answerData = state.answers[item.id] || { answer: null, memo: '' };
        const itemEl = document.createElement('div');
        itemEl.className = 'check-item card';
        itemEl.innerHTML = `
          <div class="check-item-main">
            <p>${item.text}</p>
            <div class="check-item-meta">
              <span class="basis">${item.basis}</span>
              <span class="pill ${getRiskPillClass(item.risk)}">${item.risk}</span>
            </div>
            <div class="check-item-answer">
              <label><input type="radio" name="${item.id}" value="yes" ${answerData.answer === 'yes' ? 'checked' : ''}> できている</label>
              <label><input type="radio" name="${item.id}" value="no" ${answerData.answer === 'no' ? 'checked' : ''}> できていない</label>
              <label><input type="radio" name="${item.id}" value="na" ${answerData.answer === 'na' ? 'checked' : ''}> 該当なし</label>
            </div>
          </div>
          <details class="memo-details">
            <summary>メモ</summary>
            <textarea class="memo" data-id="${item.id}" placeholder="証拠書類名など...">${answerData.memo || ''}</textarea>
          </details>
        `;
        categoryEl.appendChild(itemEl);
      });
      checklistContainer.appendChild(categoryEl);
    });
  }

  /**
   * 結果の計算と表示
   */
  function renderResults() {
    const answeredCount = Object.values(state.answers).filter(a => a.answer).length;
    
    // 進捗バー
    dom.progress.value = answeredCount;
    dom.progress.max = CHECKLIST_ITEMS.length;
    dom.progressLabel.textContent = `${answeredCount} / ${CHECKLIST_ITEMS.length}`;

    // 総合スコア
    const applicableItems = CHECKLIST_ITEMS.filter(item => {
      const answer = state.answers[item.id]?.answer;
      return answer === 'yes' || answer === 'no';
    });
    const compliantItems = applicableItems.filter(item => state.answers[item.id]?.answer === 'yes');
    const score = applicableItems.length > 0 ? (compliantItems.length / applicableItems.length) * 100 : 0;
    dom.overallScore.textContent = score.toFixed(1);

    // リスク高の未達件数
    const highRiskNotCompliant = CHECKLIST_ITEMS.filter(item => 
      item.risk === '高' && state.answers[item.id]?.answer === 'no'
    ).length;
    dom.highRiskCount.textContent = highRiskNotCompliant;

    // カテゴリ別スコア
    const categories = [...new Set(CHECKLIST_ITEMS.map(item => item.cat))];
    const categoryScoresBody = dom.categoryScores.querySelector('tbody');
    categoryScoresBody.innerHTML = '';
    categories.forEach(cat => {
      const catItems = CHECKLIST_ITEMS.filter(item => item.cat === cat);
      const catApplicable = catItems.filter(item => state.answers[item.id]?.answer === 'yes' || state.answers[item.id]?.answer === 'no');
      const catCompliant = catApplicable.filter(item => state.answers[item.id]?.answer === 'yes');
      const catScore = catApplicable.length > 0 ? (catCompliant.length / catApplicable.length) * 100 : null;
      const row = `<tr><td>${cat}</td><td>${catScore === null ? '—（未回答）' : catScore.toFixed(0) + '%'} <span class="muted">${catCompliant.length}/${catApplicable.length}</span></td></tr>`;
      categoryScoresBody.innerHTML += row;
    });

    // 未達項目リスト
    const notCompliantItems = CHECKLIST_ITEMS
      .filter(item => state.answers[item.id]?.answer === 'no')
      .sort((a, b) => {
        const riskOrder = { '高': 0, '中': 1, '低': 2 };
        return riskOrder[a.risk] - riskOrder[b.risk];
      });
    
    dom.notCompliantList.innerHTML = '';
    if (notCompliantItems.length > 0) {
      notCompliantItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="pill ${getRiskPillClass(item.risk)}">${item.risk}</span> ${item.text} <span class="muted">(${item.cat})</span>`;
        dom.notCompliantList.appendChild(li);
      });
    } else {
      dom.notCompliantList.innerHTML = '<li>未達項目はありません。</li>';
    }

    renderImprovementPlan(notCompliantItems);
  }

  /**
   * 改善計画の表示
   * @param {Array} notCompliantItems 未達項目の配列
   */
  function renderImprovementPlan(notCompliantItems) {
    const planBody = dom.improvementPlan.querySelector('tbody');
    planBody.innerHTML = '';
    if (notCompliantItems.length > 0) {
      notCompliantItems.forEach(item => {
        const planData = state.answers[item.id]?.plan || { action: '', person: '', deadline: '' };
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item.text}</td>
          <td><textarea data-id="${item.id}" data-type="action" ${!window.HDLicense.isPro() ? 'disabled' : ''}>${planData.action}</textarea></td>
          <td><input type="text" data-id="${item.id}" data-type="person" value="${planData.person}" ${!window.HDLicense.isPro() ? 'disabled' : ''}></td>
          <td><input type="date" data-id="${item.id}" data-type="deadline" value="${planData.deadline}" ${!window.HDLicense.isPro() ? 'disabled' : ''}></td>
        `;
        planBody.appendChild(row);
      });
    } else {
      planBody.innerHTML = '<tr><td colspan="4">改善項目はありません。</td></tr>';
    }
    // Pro版でない場合の注記
    dom.planProNote.classList.toggle('hidden', window.HDLicense.isPro() || notCompliantItems.length === 0);
  }

  /**
   * 全体の再描画
   */
  function rerender() {
    // ヘッダー情報
    const isPro = window.HDLicense.isPro();
    dom.planBadge.textContent = isPro ? 'Pro' : 'Free';
    dom.planBadge.className = isPro ? 'badge pro' : 'badge';
    dom.proBtn.textContent = isPro ? 'Pro有効' : 'Pro版';
    dom.csvBtn.disabled = !isPro;
    if(!isPro) {
      dom.csvBtn.title = 'Pro版で利用できます';
    } else {
      dom.csvBtn.title = '';
    }


    // 入力欄
    dom.officeName.value = state.info.officeName;
    dom.officeType.value = state.info.officeType;
    dom.checkDate.value = state.info.checkDate;
    dom.checkerName.value = state.info.checkerName;

    renderChecklist();
    renderResults();
  }


  /**
   * イベントハンドラの登録
   */
  function setupEventListeners() {
    // ヘッダー情報
    dom.infoInputs.addEventListener('input', e => {
      if (e.target.id in state.info) {
        state.info[e.target.id] = e.target.value;
        saveState();
      }
    });

    // 回答
    dom.checklistContainer.addEventListener('change', e => {
      if (e.target.type === 'radio') {
        const id = e.target.name;
        const answer = e.target.value;
        if (!state.answers[id]) state.answers[id] = {};
        state.answers[id].answer = answer;
        saveState();
        renderResults();
      }
      if (e.target.classList.contains('memo')) {
        const id = e.target.dataset.id;
        if (!state.answers[id]) state.answers[id] = {};
        state.answers[id].memo = e.target.value;
        saveState();
      }
    });
    
    // 改善計画
    dom.improvementPlan.addEventListener('input', e => {
      if(!window.HDLicense.isPro()) return;
      const id = e.target.dataset.id;
      const type = e.target.dataset.type;
      if (!state.answers[id]) state.answers[id] = {};
      if (!state.answers[id].plan) state.answers[id].plan = {};
      state.answers[id].plan[type] = e.target.value;
      saveState();
    });
    
    dom.planProNote.querySelector('button')?.addEventListener('click', () => {
        window.HDLicense.prompt({buyUrl: BUY_URL});
    });

    // Proボタン
    dom.proBtn.addEventListener('click', () => {
      if (window.HDLicense.isPro()) {
        if(confirm('Pro版のライセンスを解除しますか？')) {
            window.HDLicense.deactivate();
        }
      } else {
        window.HDLicense.prompt({buyUrl: BUY_URL});
      }
    });
    
    dom.csvBtn.addEventListener('click', () => {
        if(!window.HDLicense.isPro()) {
            window.HDLicense.prompt({buyUrl: BUY_URL});
            return;
        }
        exportCsv();
    });

    // リセット
    dom.resetBtn.addEventListener('click', () => {
      if (confirm('すべての回答と入力内容をリセットします。よろしいですか？')) {
        localStorage.removeItem(STORAGE_KEY);
        state = loadState();
        rerender();
      }
    });

    // 印刷
    dom.printBtn.addEventListener('click', () => {
      window.print();
    });

    // ライセンス変更
    window.HDLicense.onChange(rerender);
  }

  /**
   * 初期化
   */
  function init() {
    // DOM要素をキャッシュ
    dom.planBadge = document.getElementById('planBadge');
    dom.proBtn = document.getElementById('proBtn');
    dom.infoInputs = document.getElementById('infoInputs');
    dom.officeName = document.getElementById('officeName');
    dom.officeType = document.getElementById('officeType');
    dom.checkDate = document.getElementById('checkDate');
    dom.checkerName = document.getElementById('checkerName');
    dom.progress = document.getElementById('progress');
    dom.progressLabel = document.getElementById('progressLabel');
    dom.checklistContainer = document.getElementById('checklistContainer');
    dom.overallScore = document.getElementById('overallScore');
    dom.highRiskCount = document.getElementById('highRiskCount');
    dom.categoryScores = document.getElementById('categoryScores');
    dom.notCompliantList = document.getElementById('notCompliantList');
    dom.improvementPlan = document.getElementById('improvementPlan');
    dom.planProNote = document.getElementById('planProNote');
    dom.printBtn = document.getElementById('printBtn');
    dom.csvBtn = document.getElementById('csvBtn');
    dom.resetBtn = document.getElementById('resetBtn');
    dom.printInfo = document.getElementById('print-info');

    state = loadState();
    setupEventListeners();
    rerender();
  }

  // DOMが読み込まれたら初期化
  document.addEventListener('DOMContentLoaded', init);


  // ===== 追加: CSV出力・複数事業所スロット（Pro） =====
  function csvEsc(v){ v = String(v == null ? '' : v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function downloadFile(name, content, type){ const blob = new Blob([content], {type: type || 'text/plain;charset=utf-8'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function exportCsv(){
    const label = {yes: 'できている', no: 'できていない', na: '該当なし'};
    const lines = [['No', 'カテゴリ', '項目', '根拠', 'リスク', '回答', 'メモ', '改善内容', '担当', '期限'].join(',')];
    CHECKLIST_ITEMS.forEach((item, i) => { const a = state.answers[item.id] || {}; const pl = a.plan || {};
      lines.push([i + 1, item.cat, item.text, item.basis, item.risk, label[a.answer] || '未回答', a.memo || '', pl.action || '', pl.person || '', pl.deadline || ''].map(csvEsc).join(',')); });
    const info = state.info || {};
    downloadFile('実地指導セルフチェック_' + (info.officeName || '事業所') + '_' + (info.checkDate || '') + '.csv', '﻿' + lines.join('\n'), 'text/csv');
  }
  const SLOT_KEY = STORAGE_KEY + 'slots';
  function loadSlots(){ try { return JSON.parse(localStorage.getItem(SLOT_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveSlots(s){ try { localStorage.setItem(SLOT_KEY, JSON.stringify(s)); } catch (e) { alert('保存に失敗しました'); } }
  function renderSlots(){ const sel = document.getElementById('slotSelect'); if (!sel) return; const slots = loadSlots(); const cur = sel.value; sel.innerHTML = '<option value="">（未保存）</option>' + Object.keys(slots).sort().map(n => '<option>' + n.replace(/[<>&]/g, '') + '</option>').join(''); sel.value = cur; }
  function requirePro(){ if (window.HDLicense.isPro()) return true; window.HDLicense.prompt({buyUrl: BUY_URL, text: '複数事業所の保存・切替はPro版の機能です。ライセンスキーを入力してください。'}); return false; }
  (function setupSlots(){
    const sel = document.getElementById('slotSelect'); if (!sel) return;
    document.getElementById('slotSaveBtn').addEventListener('click', () => { if (!requirePro()) return; const name = (state.info && state.info.officeName || '').trim() || prompt('保存名（事業所名）を入力してください'); if (!name) return; const slots = loadSlots(); slots[name] = JSON.parse(JSON.stringify(state)); saveSlots(slots); renderSlots(); sel.value = name; alert('「' + name + '」として保存しました'); });
    document.getElementById('slotLoadBtn').addEventListener('click', () => { if (!requirePro()) return; const name = sel.value; if (!name) return alert('切替先の事業所を選んでください'); const slots = loadSlots(); if (!slots[name]) return; if (!confirm('現在の画面の内容を「' + name + '」の保存内容に切り替えます。未保存の変更は失われます。')) return; state = slots[name]; saveState(); rerender(); });
    document.getElementById('slotNewBtn').addEventListener('click', () => { if (!requirePro()) return; if (!confirm('現在の内容を保存してから空の点検表に切り替えますか？（未保存分は「保存」してから実行）')) return; state = loadState.call(null) && {info: {officeName: '', officeType: '放デイ', checkDate: new Date().toISOString().substring(0, 10), checkerName: ''}, answers: {}}; saveState(); sel.value = ''; rerender(); });
    document.getElementById('slotDeleteBtn').addEventListener('click', () => { if (!requirePro()) return; const name = sel.value; if (!name) return; if (!confirm('保存済み「' + name + '」を削除しますか？（現在の画面は変わりません）')) return; const slots = loadSlots(); delete slots[name]; saveSlots(slots); renderSlots(); });
    renderSlots();
  })();

})();
