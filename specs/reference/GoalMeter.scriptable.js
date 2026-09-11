// ゴールメーター v1.2
// ロック画面に、3つの数字だけを常駐させるウィジェット。
//
//   ① 次の締切までの残り日数（中間目標がなければ最終目標まで）
//   ② 続いている日数
//   ③ 手応え（自己評価）の折れ線
//
// おまけに、その行動をやっている時間をワンタッチで計れます。
// 止めた瞬間に「今日やった」も同時に記録されるので、
// 「計る」と「記録する」が1つの動作になります。
//
// 指標はこれ以上増えません。増やすと、記録をつけること自体が
// 目標の代わりになるからです。
//
// 中間目標は「4つ目の指標」ではありません。①の射程を短くするだけです。
// 350日先の締切は行動を動かしませんが、17日先の締切は動かします。
//
// ─────────────────────────────────────
// 使い方（初回）
//   1. Scriptable でこのスクリプトを開いて実行する
//   2. 「なんのためのカウントダウンか」と日付を聞かれるので入れる
//   3. 必要なら中間目標を足す
//   4. ロック画面／ホーム画面にウィジェットを置く
// あとは毎日ウィジェットをタップして記録するだけ。
//
// ロック画面の丸いウィジェットは、タップした瞬間に
// 計測の開始／終了が切り替わります（メニューを開かない）。
// ─────────────────────────────────────

const DATA_FILE = "goal-meter.json";
const SPARK_POINTS = 21;   // 折れ線に出す直近の記録数
const TARGET_LINE = 0.8;   // 折れ線の基準線（この下が続いたら手を打つ合図）
const MAX_SESSION_MIN = 360; // 止め忘れ対策：これを超えた計測は捨てる

const C = {
  accent: new Color("#C13B2C"),
  line:   new Color("#27557F"),
  good:   new Color("#3F6B57"),
  ink:    new Color("#E6E9EF"),
  ink2:   new Color("#9AA3B2"),
  rule:   new Color("#333B49"),
  bg1:    new Color("#161C27"),
  bg2:    new Color("#0F131B"),
};

// ───────── 保存先 ─────────
function store() {
  let fm, dir;
  try { fm = FileManager.iCloud(); dir = fm.documentsDirectory(); }
  catch (e) { fm = FileManager.local(); dir = fm.documentsDirectory(); }
  return { fm, path: fm.joinPath(dir, DATA_FILE) };
}

async function loadData() {
  const { fm, path } = store();
  const empty = { goal: null, why: null, targetDate: null, milestones: [], session: null, log: {} };
  if (!fm.fileExists(path)) return empty;
  try {
    if (fm.isFileStoredIniCloud && fm.isFileStoredIniCloud(path) && !fm.isFileDownloaded(path)) {
      await fm.downloadFileFromiCloud(path);
    }
    const d = JSON.parse(fm.readString(path));
    if (!d.log) d.log = {};
    if (!Array.isArray(d.milestones)) d.milestones = [];
    if (d.why === undefined) d.why = null;
    if (d.session === undefined) d.session = null;
    return d;
  } catch (e) { return empty; }
}

function saveData(d) {
  d.milestones = (d.milestones || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  const { fm, path } = store();
  fm.writeString(path, JSON.stringify(d, null, 2));
}

// ───────── 日付 ─────────
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const shiftDays = (d, n) => { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; };
const short = (s) => s ? s.slice(5).replace("-", "/") : "";

function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00");
  return !isNaN(d.getTime()) && ymd(d) === s;
}

function daysLeft(date) {
  if (!date) return null;
  const today = new Date(ymd(new Date()) + "T00:00:00");
  return Math.round((new Date(date + "T00:00:00") - today) / 86400000);
}

// 今日以降で最も近い中間目標。過ぎたものは自動的に対象から外れる。
function nextMilestone(d) {
  const today = ymd(new Date());
  const up = (d.milestones || []).filter(m => m.date >= today).sort((a, b) => a.date < b.date ? -1 : 1);
  return up.length ? up[0] : null;
}

function milestoneProgress(d) {
  const all = (d.milestones || []).length;
  if (!all) return null;
  const today = ymd(new Date());
  const done = d.milestones.filter(m => m.date < today).length;
  return { done, all };
}

// ───────── 時間の計測 ─────────
// 計測中かどうかは session に開始時刻を1つ持つだけ。
// ウィジェットは自分で時計を刻めないので、描画のたびに経過を計算し直す。
function elapsedMin(session) {
  if (!session || !session.startedAt) return null;
  const ms = Date.now() - new Date(session.startedAt).getTime();
  return Math.max(0, Math.floor(ms / 60000));
}

function todayMinutes(log) {
  const e = log[ymd(new Date())];
  return e && e.minutes ? e.minutes : 0;
}

// 開始と終了を1つの動作にまとめる。
// 終了時は、その日の合計に足したうえで「今日やった」も自動で立てる。
function toggleTimer(d) {
  const key = ymd(new Date());
  if (!d.session) {
    d.session = { startedAt: new Date().toISOString() };
    saveData(d);
    return { d, started: true, minutes: 0, discarded: false };
  }
  const min = elapsedMin(d.session) || 0;
  d.session = null;
  const discarded = min > MAX_SESSION_MIN;
  if (!discarded) {
    const cur = d.log[key] || {};
    d.log[key] = {
      done: true,
      note: cur.note || null,
      score: cur.score != null ? cur.score : null,
      minutes: (cur.minutes || 0) + min,
    };
  }
  saveData(d);
  return { d, started: false, minutes: min, discarded };
}

// ───────── 指標 ─────────
// 今日がまだ未記録でも、昨日まで続いていれば途切れていない扱いにする。
// 「今日の分が終わっていない」ことと「途切れた」ことは別物なので。
function streak(log) {
  const today = new Date();
  const doneToday = !!log[ymd(today)]?.done;
  let cur = doneToday ? today : shiftDays(today, -1);
  let n = 0;
  while (log[ymd(cur)]?.done) { n++; cur = shiftDays(cur, -1); }
  return { days: n, doneToday };
}

// 守るのはこの1本だけ。1日休むのは計画の内、2日連続で初めて崩れる。
function doubleMisses(log, windowDays = 90) {
  const keys = Object.keys(log).sort();
  if (!keys.length) return 0;
  const first = new Date(keys[0] + "T00:00:00");
  const win = shiftDays(new Date(), -windowDays);
  const start = first > win ? first : win;
  let count = 0, prevMissed = false;
  for (let d = new Date(start); d < new Date(); d = shiftDays(d, 1)) {
    const missed = !log[ymd(d)]?.done;
    if (missed && prevMissed) { count++; prevMissed = false; }
    else prevMissed = missed;
  }
  return count;
}

function scoreSeries(log, n = SPARK_POINTS) {
  return Object.keys(log).sort()
    .map(k => log[k].score)
    .filter(v => typeof v === "number" && !isNaN(v))
    .slice(-n);
}

// ───────── 折れ線 ─────────
function sparkline(series, w, h) {
  const dc = new DrawContext();
  dc.size = new Size(w, h);
  dc.opaque = false;
  dc.respectScreenScale = true;

  // 0〜1固定だと線がほぼ真っ直ぐになって傾きが読めない。
  // データの幅に合わせて伸ばす。ただし基準線は必ず範囲に含める。
  const vals = series.length ? series : [TARGET_LINE];
  const p0 = 0.03;
  const lo = Math.min(...vals, TARGET_LINE) - p0;
  const hi = Math.max(...vals, TARGET_LINE) + p0;
  const span = Math.max(hi - lo, 0.08);
  const y = (v) => h - ((v - lo) / span) * h;

  dc.setStrokeColor(C.rule);
  dc.setLineWidth(1);
  const g = new Path();
  g.move(new Point(0, y(TARGET_LINE)));
  g.addLine(new Point(w, y(TARGET_LINE)));
  dc.addPath(g);
  dc.strokePath();

  if (series.length < 2) return dc.getImage();

  const step = w / (series.length - 1);
  const pt = (i) => new Point(i * step, y(series[i]));

  const area = new Path();
  area.move(new Point(0, h));
  series.forEach((v, i) => area.addLine(pt(i)));
  area.addLine(new Point(w, h));
  area.closeSubpath();
  dc.setFillColor(new Color("#27557F", 0.18));
  dc.addPath(area);
  dc.fillPath();

  const p = new Path();
  p.move(pt(0));
  series.forEach((v, i) => { if (i > 0) p.addLine(pt(i)); });
  dc.setStrokeColor(C.line);
  dc.setLineWidth(2);
  dc.addPath(p);
  dc.strokePath();

  const last = series[series.length - 1];
  dc.setFillColor(C.line);
  dc.fillEllipse(new Rect(w - 3.5, y(last) - 3.5, 7, 7));
  return dc.getImage();
}

// ───────── ウィジェット ─────────
function buildWidget(family, d) {
  const w = new ListWidget();
  w.url = URLScheme.forRunningScript();

  if (!d.targetDate) {
    if (family.startsWith("accessory")) { w.addText("タップして設定"); return w; }
    const g = new LinearGradient();
    g.colors = [C.bg1, C.bg2]; g.locations = [0, 1];
    w.backgroundGradient = g;
    const t = w.addText("タップして\n目標を設定");
    t.font = Font.boldSystemFont(15);
    t.textColor = C.ink;
    return w;
  }

  const st = streak(d.log);
  const series = scoreSeries(d.log);
  const score = series.length ? series[series.length - 1] : null;
  const dm = doubleMisses(d.log);
  const run = elapsedMin(d.session);      // 計測中なら経過分、そうでなければ null
  const todayMin = todayMinutes(d.log);

  const ms = nextMilestone(d);
  const finalLeft = daysLeft(d.targetDate);
  // 大きい数字＝次の締切まで。中間目標があるならそれ、なければ最終目標。
  const primary = ms ? daysLeft(ms.date) : finalLeft;
  const fmt = (n) => n < 0 ? `+${Math.abs(n)}` : String(n);

  // ロック画面：円形
  if (family === "accessoryCircular") {
    // 丸だけは、開くのではなく「押した瞬間に計測が切り替わる」
    w.url = URLScheme.forRunningScript() + "?action=timer";
    w.addAccessoryWidgetBackground = true;
    if (run !== null) w.refreshAfterDate = new Date(Date.now() + 60000);
    const s = w.addStack();
    s.layoutVertically();
    s.addSpacer();
    const n = s.addText(run !== null ? `${run}` : fmt(primary));
    n.font = Font.boldSystemFont(20);
    n.centerAlignText();
    const l = s.addText(run !== null ? "●計測中" : (st.doneToday ? `${st.days}日` : "未"));
    l.font = Font.mediumSystemFont(9);
    l.centerAlignText();
    s.addSpacer();
    return w;
  }

  // ロック画面：1行
  if (family === "accessoryInline") {
    if (run !== null) w.refreshAfterDate = new Date(Date.now() + 60000);
    w.addText(run !== null
      ? `● 計測中 ${run}分`
      : (ms ? `${ms.name} ${fmt(primary)}日 ・ 連続${st.days}`
            : `残${fmt(primary)}日 ・ 連続${st.days}${st.doneToday ? "" : "（今日まだ）"}`));
    return w;
  }

  // ロック画面：横長
  if (family === "accessoryRectangular") {
    const t1 = w.addText(ms ? `▸ ${ms.name} ${fmt(primary)}日` : `${d.goal || "目標"} 残り ${fmt(primary)} 日`);
    t1.font = Font.boldSystemFont(15);
    t1.lineLimit = 1;
    const t2 = w.addText(ms
      ? `最終 ${fmt(finalLeft)}日 ・ 連続 ${st.days}日`
      : `連続 ${st.days}日${st.doneToday ? "" : "・今日まだ"}`);
    t2.font = Font.mediumSystemFont(12);
    const t3 = w.addText(run !== null
      ? `● 計測中 ${run}分`
      : (todayMin ? `今日 ${todayMin}分` : (score === null ? "手応え —" : `手応え ${Math.round(score * 100)}%`)));
    t3.font = Font.mediumSystemFont(12);
    if (run !== null) w.refreshAfterDate = new Date(Date.now() + 60000);
    return w;
  }

  // ホーム画面
  const grad = new LinearGradient();
  grad.colors = [C.bg1, C.bg2]; grad.locations = [0, 1];
  w.backgroundGradient = grad;
  w.setPadding(13, 15, 13, 15);

  const prog = milestoneProgress(d);
  const head = w.addText(ms
    ? `${d.goal || "目標"}　最終まで ${fmt(finalLeft)}日${prog ? `　${prog.done}/${prog.all}` : ""}`
    : `${d.goal || "目標"}　${d.targetDate.replace(/-/g, ".")}`);
  head.font = Font.mediumSystemFont(10);
  head.textColor = C.ink2;
  head.lineLimit = 1;

  w.addSpacer(5);

  const row = w.addStack();
  row.centerAlignContent();
  const big = row.addText(fmt(primary));
  big.font = Font.boldSystemFont(family === "medium" ? 40 : 34);
  big.textColor = C.ink;
  row.addSpacer(5);
  const unit = row.addText(primary < 0 ? "日超過" : "日");
  unit.font = Font.mediumSystemFont(13);
  unit.textColor = C.ink2;
  row.addSpacer();

  const badge = row.addStack();
  badge.layoutVertically();
  const b1 = badge.addText(run !== null ? `● ${run}分` : (st.doneToday ? `連続 ${st.days}` : "今日まだ"));
  b1.font = Font.boldSystemFont(12);
  b1.textColor = run !== null ? C.line : (st.doneToday ? C.good : C.accent);
  b1.rightAlignText();
  const b2 = badge.addText(`2日欠 ${dm}`);
  b2.font = Font.mediumSystemFont(10);
  b2.textColor = dm > 0 ? C.accent : C.ink2;
  b2.rightAlignText();

  // 大きい数字が「何の締切なのか」を必ず添える
  if (ms) {
    w.addSpacer(3);
    const m = w.addText(`▸ ${ms.name}　${short(ms.date)}`);
    m.font = Font.boldSystemFont(family === "medium" ? 11 : 10);
    m.textColor = C.line;
    m.lineLimit = 1;
  }

  w.addSpacer(ms ? 6 : 8);

  const lab = w.addStack();
  const l1 = lab.addText(todayMin ? `手応え　今日 ${todayMin}分` : "手応え");
  l1.font = Font.mediumSystemFont(10);
  l1.textColor = C.ink2;
  lab.addSpacer();
  const l2 = lab.addText(score === null ? "—" : `${Math.round(score * 100)}%`);
  l2.font = Font.boldSystemFont(11);
  l2.textColor = score === null ? C.ink2 : (score >= TARGET_LINE ? C.good : C.accent);

  w.addSpacer(4);
  const img = w.addImage(sparkline(series, family === "medium" ? 300 : 130, family === "medium" ? 32 : 26));
  img.resizable = true;
  if (run !== null) w.refreshAfterDate = new Date(Date.now() + 60000);

  if (family === "medium") {
    w.addSpacer(4);
    // 済んでいれば「なぜやるのか」を、まだなら着手のハードルを下げる一言を出す
    const foot = w.addText(run !== null
      ? "計測中。止めた時点で今日の記録になります。"
      : (st.doneToday
        ? (d.why || "今日は済み。次にやる一歩を開いたまま閉じた？")
        : "最低ラインでいい。それも達成として記録する。"));
    foot.font = Font.mediumSystemFont(10);
    foot.textColor = C.ink2;
    foot.lineLimit = 2;
  }

  return w;
}

// ───────── 設定 ─────────
async function setupGoal(d) {
  const a = new Alert();
  a.title = d.targetDate ? "目標を変更する" : "何のカウントダウン？";
  a.message = "日付のある目標にしてください。日付がないと、残り日数という一番効く数字が出せません。";
  a.addTextField("何のため（例：簿記2級に合格）", d.goal || "");
  a.addTextField("その日 YYYY-MM-DD", d.targetDate || "");
  a.addTextField("なぜやるのか（任意）", d.why || "");
  a.addAction("保存");
  a.addCancelAction("やめる");
  if (await a.present() === -1) return d;

  const goal = a.textFieldValue(0).trim();
  const date = a.textFieldValue(1).trim();
  const why = a.textFieldValue(2).trim();

  if (!isValidDate(date)) {
    const e = new Alert();
    e.title = "日付の形式が違います";
    e.message = "2027-08-22 のように、年-月-日 で入れてください。";
    e.addAction("OK");
    await e.present();
    return await setupGoal(d);
  }
  d.goal = goal || "目標";
  d.targetDate = date;
  d.why = why || null;
  saveData(d);
  return d;
}

// ───────── 中間目標 ─────────
async function addOrEditMilestone(d, index) {
  const cur = index == null ? { name: "", date: "" } : d.milestones[index];
  const a = new Alert();
  a.title = index == null ? "中間目標を追加" : "中間目標を編集";
  a.message = "350日先の締切は行動を動かしません。\n2〜6週間先くらいに置くのが効きます。";
  a.addTextField("何を終わらせる（例：テキスト1周）", cur.name);
  a.addTextField("その日 YYYY-MM-DD", cur.date);
  a.addAction("保存");
  if (index != null) a.addDestructiveAction("削除する");
  a.addCancelAction("やめる");

  const idx = await a.present();
  if (idx === -1) return d;

  if (index != null && idx === 1) {
    d.milestones.splice(index, 1);
    saveData(d);
    return d;
  }

  const name = a.textFieldValue(0).trim();
  const date = a.textFieldValue(1).trim();
  if (!isValidDate(date)) {
    const e = new Alert();
    e.title = "日付の形式が違います";
    e.message = "2027-08-22 のように入れてください。";
    e.addAction("OK");
    await e.present();
    return await addOrEditMilestone(d, index);
  }
  const item = { name: name || "中間目標", date };
  if (index == null) d.milestones.push(item);
  else d.milestones[index] = item;
  saveData(d);
  return d;
}

async function milestoneScreen(d) {
  while (true) {
    let action = null;
    const t = new UITable();
    t.showSeparators = true;

    const h = new UITableRow();
    h.isHeader = true;
    const prog = milestoneProgress(d);
    h.addText("中間目標", prog ? `${prog.done} / ${prog.all} 通過` : "まだありません");
    t.addRow(h);

    const today = ymd(new Date());
    const sorted = d.milestones.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    sorted.forEach((m) => {
      const r = new UITableRow();
      const left = daysLeft(m.date);
      const passed = m.date < today;
      r.addText(
        (passed ? "✓ " : "▸ ") + m.name,
        passed ? `${m.date}　通過` : `${m.date}　あと ${left} 日`
      );
      r.dismissOnSelect = true;
      r.onSelect = () => { action = { type: "edit", i: d.milestones.indexOf(m) }; };
      t.addRow(r);
    });

    const add = new UITableRow();
    add.addText("＋ 中間目標を追加", "2〜6週間先に置くと効きます");
    add.dismissOnSelect = true;
    add.onSelect = () => { action = { type: "add" }; };
    t.addRow(add);

    await t.present();
    if (!action) return d;
    d = await addOrEditMilestone(d, action.type === "edit" ? action.i : null);
  }
}

// ───────── 記録 ─────────
async function recordToday(d) {
  const key = ymd(new Date());
  const cur = d.log[key] || {};
  const st = streak(d.log);
  const ms = nextMilestone(d);

  const lines = [
    d.goal,
    ms ? `▸ ${ms.name} まで ${daysLeft(ms.date)} 日` : null,
    `最終まで ${daysLeft(d.targetDate)} 日　連続 ${st.days} 日`,
    todayMinutes(d.log) ? `今日 ${todayMinutes(d.log)}分` : null,
    d.why ? `\n${d.why}` : null,
    "\n最低ラインでも「やった」に入れてよい。\n罪悪感を残すと、明日の着手が重くなる。",
  ].filter(Boolean);

  const a = new Alert();
  a.title = "今日の記録";
  a.message = lines.join("\n");
  a.addTextField("ひとこと（任意）", cur.note || "");
  a.addTextField("手応え 0〜100（任意）", cur.score != null ? String(Math.round(cur.score * 100)) : "");
  a.addAction("やった");
  a.addDestructiveAction("記録を取り消す");
  a.addCancelAction("閉じる");

  const idx = await a.present();
  if (idx === -1) return d;
  if (idx === 1) { delete d.log[key]; saveData(d); return d; }

  const pct = parseFloat(a.textFieldValue(1));
  d.log[key] = {
    done: true,
    note: a.textFieldValue(0).trim() || null,
    score: isNaN(pct) ? null : Math.max(0, Math.min(1, pct / 100)),
    minutes: cur.minutes || 0,
  };
  saveData(d);
  return d;
}

async function showHistory(d) {
  const keys = Object.keys(d.log).sort().reverse().slice(0, 40);
  const t = new UITable();
  t.showSeparators = true;

  const head = new UITableRow();
  head.isHeader = true;
  head.addText(d.goal || "目標", `最終まで ${daysLeft(d.targetDate)} 日 ・ 2日連続で欠けた回数 ${doubleMisses(d.log)}`);
  t.addRow(head);

  if (!keys.length) {
    const r = new UITableRow();
    r.addText("まだ記録がありません", "ウィジェットをタップして「やった」を押すところから");
    t.addRow(r);
  }
  for (const k of keys) {
    const e = d.log[k];
    const r = new UITableRow();
    const right = [
      e.minutes ? `${e.minutes}分` : null,
      e.score != null ? `手応え ${Math.round(e.score * 100)}%` : null,
      e.note || null,
    ].filter(Boolean).join(" ・ ") || "やった";
    r.addText(k, right);
    t.addRow(r);
  }
  await t.present();
}

// ───────── 計測の結果表示 ─────────
async function reportTimer(r) {
  const a = new Alert();
  if (r.started) {
    a.title = "計測をはじめました";
    a.message = "止めた時点で、今日の記録も一緒に入ります。\n止め忘れても大丈夫（6時間を超えた分は捨てます）。";
  } else if (r.discarded) {
    a.title = "止め忘れとみなしました";
    a.message = `${r.minutes}分は長すぎるので記録していません。\n今日の記録は「今日の記録をつける」から手で入れてください。`;
  } else {
    a.title = `${r.minutes}分`;
    a.message = `今日の合計 ${todayMinutes(r.d.log)}分。\n今日の分は「やった」として記録しました。`;
  }
  a.addAction("OK");
  await a.present();
}

// ───────── メニュー ─────────
async function mainMenu(d) {
  if (!d.targetDate) d = await setupGoal(d);
  if (!d.targetDate) return d;

  const ms = nextMilestone(d);
  const run = elapsedMin(d.session);
  const todayMin = todayMinutes(d.log);

  const a = new Alert();
  a.title = d.goal;
  a.message = [
    ms ? `▸ ${ms.name} まで ${daysLeft(ms.date)} 日` : null,
    `最終まで ${daysLeft(d.targetDate)} 日`,
    run !== null ? `● 計測中 ${run}分` : (todayMin ? `今日 ${todayMin}分` : null),
  ].filter(Boolean).join("\n");

  a.addAction(run !== null ? `■ 計測をおわる（${run}分）` : "▶ はじめる（時間を計る）");
  a.addAction("今日の記録をつける");
  a.addAction(`中間目標（${(d.milestones || []).length}）`);
  a.addAction("これまでの記録を見る");
  a.addAction("目標を変更する");
  a.addCancelAction("閉じる");

  const idx = await a.present();
  if (idx === 0) { const r = toggleTimer(d); await reportTimer(r); return r.d; }
  if (idx === 1) return await recordToday(d);
  if (idx === 2) return await milestoneScreen(d);
  if (idx === 3) { await showHistory(d); return d; }
  if (idx === 4) return await setupGoal(d);
  return d;
}

// ───────── 実行 ─────────
const data = await loadData();

if (config.runsInWidget) {
  Script.setWidget(buildWidget(config.widgetFamily || "small", data));
} else {
  // ロック画面の丸いウィジェットから来たときは、メニューを出さずに切り替える
  const action = (typeof args !== "undefined" && args.queryParameters)
    ? args.queryParameters.action : null;

  if (action === "timer") {
    const r = toggleTimer(data);
    await reportTimer(r);
  } else {
    const updated = await mainMenu(data);
    const w = buildWidget("medium", updated);
    await w.presentMedium();
  }
}
Script.complete();
