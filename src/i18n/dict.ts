import type { Lang } from './types';

/** 文案键 — 单一来源，缺翻译时回退到日语 */
export interface Strings {
  // 品牌 / 底部导航
  brand: string; brandSub: string;
  tabDevice: string; tabData: string; tabSettings: string;

  // 通用
  cancel: string; save: string; delete: string; close: string; back: string;
  clear: string; refresh: string; confirm: string; add: string; rename: string;
  unbind: string; open: string; none: string;

  // 设备页
  myDevices: string; addDevice: string;
  noDeviceTitle: string; noDeviceDesc: string;
  scanAndAdd: string; manualMac: string;
  scanningNew: string; scanningHint: string;
  stopScan: string; manualInput: string; collapse: string;
  macLabel: string; macHint: string; connectDirect: string;
  copiedMac: string; boundTag: string;
  needPermTitle: string; needPermDesc: string; grantPerm: string;

  // 设备详情
  deviceInfo: string; devName: string; devModel: string;
  devMac: string; devBoundAt: string;
  connectState: string; stateConnecting: string; stateConnected: string;
  stateError: string; stateIdle: string;
  measuringWait: string; standOnScale: string;
  electrodeOff: string; bodyComp: string; localEstimate: string;
  saveMeasurement: string; whoIsThis: string;
  weightUnit: string;

  // 数据页
  latestRecord: string; totalRecords: string; unsynced: string; unitsLabel: string;
  trend: string; days: string; setGoal: string; goalLabel: string;
  start: string; latest: string; change: string;
  toGoal: string; goalUnset: string; goalReached: string;
  filterByUnit: string; all: string; byDate: string; clearDateFilter: string;
  records: string; selectAllUnsynced: string; unselectAll: string;
  noData: string; noDataDesc: string;
  pushSelected: string; pushing: string;
  selectDate: string; recordCountSuffix: string;
  detailTitle: string; electrodeOn: string; electrodeOffShort: string;
  impedanceRaw: string; pushStatus: string; synced: string; notSynced: string;
  algorithm: string; bodyCompLocal: string; compUnavailable: string;
  bcFat: string; bcMuscle: string; bcWater: string; bcProtein: string; bcBone: string; bcSkeletal: string;
  goalSheetTitle: string; goalHint: string; goalPlaceholder: string;
  saveGoal: string; clearGoal: string;

  // 设置页
  syncSettings: string; pushUrl: string;
  pushUrlHint: string;
  saveUrl: string; testConn: string; pullFromPc: string;
  unitsSection: string; unitsHint: string; newUnitPlaceholder: string;
  boundDevices: string; debugLog: string;
  about: string; adaptation: string; privacyLine: string;
  estimateLine: string; unofficial: string;
  openSource: string; openSourceDesc: string; ghRepo: string;
  credits: string; creditsDesc: string; creditsLicense: string;
  language: string; languageHint: string; followSystem: string;
  macFormat: string; saved: string; saveFail: string; selectFirst: string;

  // 状态/提示
  connecting: string; testing: string; pulling: string;
  connOk: string; connFail: string; pushOk: string; pushFail: string;
  pullResult: string; recordWriteFail: string;
}

const ja: Strings = {
  brand: 'AFU', brandSub: '体組成計',
  tabDevice: 'デバイス', tabData: 'データ', tabSettings: '設定',

  cancel: 'キャンセル', save: '保存', delete: '削除', close: '閉じる', back: '戻る',
  clear: 'クリア', refresh: '更新', confirm: '確定', add: '追加', rename: '名前変更',
  unbind: 'バインド解除', open: '開く', none: 'なし',

  myDevices: 'マイデバイス', addDevice: 'デバイスを追加',
  noDeviceTitle: '体組成計が未登録です',
  noDeviceDesc: 'スキャンして追加するか、MAC アドレスを直接入力してください',
  scanAndAdd: 'スキャンして追加', manualMac: 'MAC アドレスを入力',
  scanningNew: '新しいデバイスを検索中…',
  scanningHint: '未登録の計りのみ検索します。計りは通常スリープしているため、軽く踏んで起こしてください。15 秒ごとにスキャンします。',
  stopScan: 'スキャン停止', manualInput: 'MAC を入力', collapse: '閉じる',
  macLabel: 'デバイスの MAC アドレス', macHint: 'システムの Bluetooth 設定で確認できます。MAC が分かれば直接接続できます。',
  connectDirect: 'このアドレスに接続', copiedMac: 'MAC をコピーしました', boundTag: '登録済み',
  needPermTitle: 'Bluetooth 権限が必要です',
  needPermDesc: '「付近のデバイス / 位置情報」が未許可のためスキャンできません',
  grantPerm: '権限を許可',

  deviceInfo: 'デバイス情報', devName: '名前', devModel: 'モデル',
  devMac: 'MAC', devBoundAt: '登録日',
  connectState: '接続状態', stateConnecting: '接続中…', stateConnected: '接続済み',
  stateError: '接続エラー', stateIdle: '未接続',
  measuringWait: '計りに乗ってください', standOnScale: '計りに乗ると測定が始まります',
  electrodeOff: '⚠ 電極が未接触 · 素足で 4 つの電極すべてを踏んでください',
  bodyComp: '体組成', localEstimate: 'ローカル推定',
  saveMeasurement: 'この測定を保存', whoIsThis: 'この測定は誰のもの？',
  weightUnit: 'kg',

  latestRecord: '最新', totalRecords: '記録数', unsynced: '未送信', unitsLabel: 'ユーザー',
  trend: '体重の推移', days: '日', setGoal: '目標設定', goalLabel: '目標',
  start: '開始', latest: '最新', change: '増減',
  toGoal: '目標まで', goalUnset: '目標未設定', goalReached: '達成',
  filterByUnit: 'ユーザーで絞り込み', all: 'すべて', byDate: '日付', clearDateFilter: '日付フィルタを解除',
  records: '記録', selectAllUnsynced: '未送信を全選択', unselectAll: '選択解除',
  noData: 'データがありません', noDataDesc: 'デバイス画面で測定して保存してください',
  pushSelected: '選択した項目を送信', pushing: '送信中…',
  selectDate: '日付を選択', recordCountSuffix: '件',
  detailTitle: '測定の詳細', electrodeOn: '接触あり', electrodeOffShort: '未接触（インピーダンスなし）',
  impedanceRaw: 'インピーダンス生値', pushStatus: '送信状態', synced: '送信済み', notSynced: '未送信',
  algorithm: 'アルゴリズム', bodyCompLocal: '体組成（ローカル BIA 推定）', compUnavailable: '体組成は利用できません（電極未接触）',
  bcFat: '体脂肪率', bcMuscle: '筋肉率', bcWater: '水分率', bcProtein: 'タンパク質', bcBone: '骨量', bcSkeletal: '骨格筋',
  goalSheetTitle: '目標体重を設定', goalHint: '目標はご自身で設定でき、端末内にのみ保存されます。空欄にすると目標線は表示されません。',
  goalPlaceholder: '例 60', saveGoal: '目標を保存', clearGoal: 'クリア',

  syncSettings: '同期設定', pushUrl: '送信先 URL',
  pushUrlHint: 'PC 側で server_receiver.py を起動し、同じ Wi-Fi に接続してください。URL は自由に変更できます。',
  saveUrl: 'URL を保存', testConn: '接続テスト', pullFromPc: 'PC から取得',
  unitsSection: 'ユーザー', unitsHint: '1 台の計りを複数人で使う場合、保存時に割り当てを選べます', newUnitPlaceholder: '新しいユーザー名',
  boundDevices: '登録済みデバイス', debugLog: 'デバッグログ',
  about: 'このアプリについて', adaptation: '対応モデル：AFU-WL-TZ-A1（ICOMON / 蟻阿福沃莱）',
  privacyLine: 'データは端末内のみに保存され、第三者に送信されません',
  estimateLine: '体脂肪率などはローカル BIA 式による推定値です（参考値）',
  unofficial: 'メーカー公式アプリではありません',
  openSource: 'オープンソース', openSourceDesc: '本プロジェクトはオープンソースです。ソースとビルド（GitHub Actions）は公開されています。',
  ghRepo: 'GitHub リポジトリ',
  credits: '謝辞', creditsDesc: 'Bluetooth プロトコル解析と体組成アルゴリズムは、以下のオープンソースプロジェクトを参考・移植しています：',
  creditsLicense: '各プロジェクトは MIT ライセンスです。本アプリも同じオープンソースの精神に従います。',
  language: '言語', languageHint: 'システム言語に追従するか、手動で選択できます', followSystem: 'システムに追従',
 macFormat: 'MAC の形式が不正です (XX:XX:XX:XX:XX:XX)', saved: '保存済み:', saveFail: '保存失敗', selectFirst: '送信する項目を選択してください',

  connecting: '接続中…', testing: 'テスト中…', pulling: '取得中…',
  connOk: '接続 OK', connFail: '接続失敗', pushOk: '送信成功', pushFail: '送信失敗',
  pullResult: '取得結果', recordWriteFail: '記録の保存に失敗',
};

const zhHans: Strings = {
  brand: 'AFU', brandSub: '体脂秤',
  tabDevice: '设备', tabData: '数据', tabSettings: '设置',

  cancel: '取消', save: '保存', delete: '删除', close: '关闭', back: '返回',
  clear: '清空', refresh: '刷新', confirm: '确定', add: '添加', rename: '重命名',
  unbind: '解除绑定', open: '打开', none: '无',

  myDevices: '我的设备', addDevice: '添加设备',
  noDeviceTitle: '还没有绑定体脂秤',
  noDeviceDesc: '扫描添加，或手动输入 MAC 地址直接连接',
  scanAndAdd: '扫描并添加设备', manualMac: '手动输入 MAC 地址',
  scanningNew: '正在搜索新设备…',
  scanningHint: '只搜索尚未绑定的秤。秤平时休眠不广播，请轻踩唤醒。每 15 秒扫描一轮。',
  stopScan: '停止扫描', manualInput: '手动输入', collapse: '收起',
  macLabel: '设备 MAC 地址', macHint: '可在系统蓝牙设置中查看。已知 MAC 可直接连接，无需扫描。',
  connectDirect: '直接连接', copiedMac: '已复制 MAC', boundTag: '已绑定',
  needPermTitle: '需要蓝牙权限',
  needPermDesc: '未授予「附近设备 / 位置」权限，无法扫描体脂秤',
  grantPerm: '授予权限',

  deviceInfo: '设备信息', devName: '名称', devModel: '型号',
  devMac: 'MAC', devBoundAt: '绑定时间',
  connectState: '连接状态', stateConnecting: '连接中…', stateConnected: '已连接',
  stateError: '连接失败', stateIdle: '未连接',
  measuringWait: '站上秤即可开始测量', standOnScale: '站上秤即可开始测量',
  electrodeOff: '⚠ 电极未导通 · 请赤脚同时踩满四个电极',
  bodyComp: '身体成分', localEstimate: '本地估算',
  saveMeasurement: '保存这次测量', whoIsThis: '这次测量属于谁？',
  weightUnit: 'kg',

  latestRecord: '最近一次', totalRecords: '总记录', unsynced: '未推送', unitsLabel: '单位',
  trend: '体重趋势', days: '天', setGoal: '设目标', goalLabel: '目标',
  start: '起始', latest: '最新', change: '变化',
  toGoal: '距目标', goalUnset: '目标未设', goalReached: '已达标',
  filterByUnit: '按单位筛选', all: '全部', byDate: '按日期', clearDateFilter: '清除日期筛选',
  records: '记录', selectAllUnsynced: '全选未推送', unselectAll: '取消全选',
  noData: '暂无数据', noDataDesc: '去设备页测量并保存',
  pushSelected: '推送已选', pushing: '推送中…',
  selectDate: '选择日期', recordCountSuffix: '条',
  detailTitle: '测量详情', electrodeOn: '已导通', electrodeOffShort: '未导通（无阻抗）',
  impedanceRaw: '阻抗原始值', pushStatus: '推送状态', synced: '已推送', notSynced: '未推送',
  algorithm: '算法模型', bodyCompLocal: '身体成分（本地 BIA 估算）', compUnavailable: '体脂等数据不可用（电极未导通）',
  bcFat: '体脂率', bcMuscle: '肌肉率', bcWater: '水分率', bcProtein: '蛋白质', bcBone: '骨量', bcSkeletal: '骨骼肌',
  goalSheetTitle: '设置目标体重', goalHint: '目标由你自己定，仅保存在本机。留空则不显示目标线。',
  goalPlaceholder: '例如 60', saveGoal: '保存目标', clearGoal: '清除',

  syncSettings: '同步设置', pushUrl: '推送地址',
  pushUrlHint: '电脑端需运行 server_receiver.py，保持同一 WiFi。地址可自由修改。',
  saveUrl: '保存地址', testConn: '测试连接', pullFromPc: '从电脑拉取数据',
  unitsSection: '分配单位', unitsHint: '多人共用一台秤时，测量保存可选择归属', newUnitPlaceholder: '新单位名称',
  boundDevices: '已绑定设备', debugLog: '调试日志',
  about: '关于', adaptation: '适配型号：AFU-WL-TZ-A1（ICOMON / 蚂蚁阿福沃莱）',
  privacyLine: '数据仅存本机，不上传任何第三方',
  estimateLine: '体脂/肌肉等为本地 BIA 公式估算，仅供参考',
  unofficial: '非小米/厂商官方应用',
  openSource: '开源', openSourceDesc: '本项目开源，源码与构建（GitHub Actions）公开可查。',
  ghRepo: 'GitHub 仓库',
  credits: '致谢', creditsDesc: '本项目的蓝牙协议解析与身体成分算法，参考并移植自以下开源项目：',
  creditsLicense: '以上项目均为 MIT 许可。本应用遵循同样的开源精神。',
  language: '语言', languageHint: '可跟随系统语言，也可手动切换', followSystem: '跟随系统',
 macFormat: 'MAC 格式不正确，应为 XX:XX:XX:XX:XX:XX', saved: '已保存到', saveFail: '保存失败', selectFirst: '请先勾选要推送的记录',

  connecting: '连接中…', testing: '测试中…', pulling: '拉取中…',
  connOk: '连接正常', connFail: '连接失败', pushOk: '推送成功', pushFail: '推送失败',
  pullResult: '拉取完成', recordWriteFail: '记录写入失败',
};

const zhHant: Strings = {
  brand: 'AFU', brandSub: '體脂計',
  tabDevice: '裝置', tabData: '資料', tabSettings: '設定',

  cancel: '取消', save: '儲存', delete: '刪除', close: '關閉', back: '返回',
  clear: '清除', refresh: '重新整理', confirm: '確定', add: '新增', rename: '重新命名',
  unbind: '解除綁定', open: '開啟', none: '無',

  myDevices: '我的裝置', addDevice: '新增裝置',
  noDeviceTitle: '尚未綁定體脂計',
  noDeviceDesc: '掃描新增，或手動輸入 MAC 位址直接連線',
  scanAndAdd: '掃描並新增裝置', manualMac: '手動輸入 MAC 位址',
  scanningNew: '正在搜尋新裝置…',
  scanningHint: '只搜尋尚未綁定的體脂計。體脂計平時休眠不廣播，請輕踩喚醒。每 15 秒掃描一輪。',
  stopScan: '停止掃描', manualInput: '手動輸入', collapse: '收合',
  macLabel: '裝置 MAC 位址', macHint: '可在系統藍牙設定中查看。已知 MAC 可直接連線，無需掃描。',
  connectDirect: '直接連線', copiedMac: '已複製 MAC', boundTag: '已綁定',
  needPermTitle: '需要藍牙權限',
  needPermDesc: '未授予「鄰近裝置 / 位置」權限，無法掃描體脂計',
  grantPerm: '授予權限',

  deviceInfo: '裝置資訊', devName: '名稱', devModel: '型號',
  devMac: 'MAC', devBoundAt: '綁定時間',
  connectState: '連線狀態', stateConnecting: '連線中…', stateConnected: '已連線',
  stateError: '連線失敗', stateIdle: '未連線',
  measuringWait: '站上體脂計即可開始測量', standOnScale: '站上體脂計即可開始測量',
  electrodeOff: '⚠ 電極未導通 · 請赤腳同時踩滿四個電極',
  bodyComp: '身體組成', localEstimate: '本機估算',
  saveMeasurement: '儲存這次測量', whoIsThis: '這次測量屬於誰？',
  weightUnit: 'kg',

  latestRecord: '最近一次', totalRecords: '總記錄', unsynced: '未推送', unitsLabel: '單位',
  trend: '體重趨勢', days: '天', setGoal: '設目標', goalLabel: '目標',
  start: '起始', latest: '最新', change: '變化',
  toGoal: '距目標', goalUnset: '目標未設', goalReached: '已達標',
  filterByUnit: '依單位篩選', all: '全部', byDate: '依日期', clearDateFilter: '清除日期篩選',
  records: '記錄', selectAllUnsynced: '全選未推送', unselectAll: '取消全選',
  noData: '尚無資料', noDataDesc: '至裝置頁測量並儲存',
  pushSelected: '推送已選', pushing: '推送中…',
  selectDate: '選擇日期', recordCountSuffix: '筆',
  detailTitle: '測量詳情', electrodeOn: '已導通', electrodeOffShort: '未導通（無阻抗）',
  impedanceRaw: '阻抗原始值', pushStatus: '推送狀態', synced: '已推送', notSynced: '未推送',
  algorithm: '演算法模型', bodyCompLocal: '身體組成（本機 BIA 估算）', compUnavailable: '體脂等資料不可用（電極未導通）',
  bcFat: '體脂率', bcMuscle: '肌肉率', bcWater: '水分率', bcProtein: '蛋白質', bcBone: '骨量', bcSkeletal: '骨骼肌',
  goalSheetTitle: '設定目標體重', goalHint: '目標由你自己設定，僅儲存在本機。留空則不顯示目標線。',
  goalPlaceholder: '例如 60', saveGoal: '儲存目標', clearGoal: '清除',

  syncSettings: '同步設定', pushUrl: '推送位址',
  pushUrlHint: '電腦端需執行 server_receiver.py，保持同一 WiFi。位址可自由修改。',
  saveUrl: '儲存位址', testConn: '測試連線', pullFromPc: '從電腦拉取資料',
  unitsSection: '分配單位', unitsHint: '多人共用一台體脂計時，測量儲存可選擇歸屬', newUnitPlaceholder: '新單位名稱',
  boundDevices: '已綁定裝置', debugLog: '除錯記錄',
  about: '關於', adaptation: '適用型號：AFU-WL-TZ-A1（ICOMON / 螞蟻阿福沃萊）',
  privacyLine: '資料僅儲存於本機，不上傳任何第三方',
  estimateLine: '體脂／肌肉等為本機 BIA 公式估算，僅供參考',
  unofficial: '非小米／廠商官方應用程式',
  openSource: '開源', openSourceDesc: '本專案開源，原始碼與建置（GitHub Actions）公開可查。',
  ghRepo: 'GitHub 儲存庫',
  credits: '致謝', creditsDesc: '本專案的藍牙協定解析與身體組成演算法，參考並移植自以下開源專案：',
  creditsLicense: '以上專案均為 MIT 授權。本應用遵循同樣的開源精神。',
  language: '語言', languageHint: '可跟隨系統語言，也可手動切換', followSystem: '跟隨系統',
 macFormat: 'MAC 格式錯誤，應為 XX:XX:XX:XX:XX:XX', saved: '已儲存到', saveFail: '儲存失敗', selectFirst: '請先勾選要推送的記錄',

  connecting: '連線中…', testing: '測試中…', pulling: '拉取中…',
  connOk: '連線正常', connFail: '連線失敗', pushOk: '推送成功', pushFail: '推送失敗',
  pullResult: '拉取完成', recordWriteFail: '記錄寫入失敗',
};

const de: Strings = {
  brand: 'AFU', brandSub: 'Körperanalysewaage',
  tabDevice: 'Gerät', tabData: 'Daten', tabSettings: 'Einstellungen',

  cancel: 'Abbrechen', save: 'Speichern', delete: 'Löschen', close: 'Schließen', back: 'Zurück',
  clear: 'Leeren', refresh: 'Aktualisieren', confirm: 'OK', add: 'Hinzufügen', rename: 'Umbenennen',
  unbind: 'Verknüpfung lösen', open: 'Öffnen', none: 'Keine',

  myDevices: 'Meine Geräte', addDevice: 'Gerät hinzufügen',
  noDeviceTitle: 'Noch keine Waage verknüpft',
  noDeviceDesc: 'Scannen und hinzufügen oder MAC-Adresse manuell eingeben',
  scanAndAdd: 'Scannen & hinzufügen', manualMac: 'MAC-Adresse eingeben',
  scanningNew: 'Suche nach neuen Geräten…',
  scanningHint: 'Es wird nur nach nicht verknüpften Waagen gesucht. Die Waage schläft meist – kurz antippen zum Aufwecken. Scan alle 15 Sekunden.',
  stopScan: 'Scan stoppen', manualInput: 'Manuell', collapse: 'Schließen',
  macLabel: 'MAC-Adresse des Geräts', macHint: 'In den Bluetooth-Einstellungen sichtbar. Mit bekannter MAC ist kein Scan nötig.',
  connectDirect: 'Direkt verbinden', copiedMac: 'MAC kopiert', boundTag: 'Verknüpft',
  needPermTitle: 'Bluetooth-Berechtigung nötig',
  needPermDesc: 'Ohne „Geräte in der Nähe / Standort“ ist kein Scan möglich',
  grantPerm: 'Berechtigung erteilen',

  deviceInfo: 'Geräteinfo', devName: 'Name', devModel: 'Modell',
  devMac: 'MAC', devBoundAt: 'Verknüpft am',
  connectState: 'Verbindung', stateConnecting: 'Verbinde…', stateConnected: 'Verbunden',
  stateError: 'Verbindungsfehler', stateIdle: 'Nicht verbunden',
  measuringWait: 'Auf die Waage stellen zum Messen', standOnScale: 'Auf die Waage stellen zum Messen',
  electrodeOff: '⚠ Elektroden ohne Kontakt · barfuß alle vier Elektroden treten',
  bodyComp: 'Körperzusammensetzung', localEstimate: 'Lokale Schätzung',
  saveMeasurement: 'Messung speichern', whoIsThis: 'Zu wem gehört diese Messung?',
  weightUnit: 'kg',

  latestRecord: 'Letzte', totalRecords: 'Einträge', unsynced: 'Ungesendet', unitsLabel: 'Personen',
  trend: 'Gewichtsverlauf', days: 'Tage', setGoal: 'Ziel setzen', goalLabel: 'Ziel',
  start: 'Start', latest: 'Aktuell', change: 'Änderung',
  toGoal: 'Bis Ziel', goalUnset: 'Kein Ziel', goalReached: 'Erreicht',
  filterByUnit: 'Nach Person filtern', all: 'Alle', byDate: 'Nach Datum', clearDateFilter: 'Datumsfilter löschen',
  records: 'Einträge', selectAllUnsynced: 'Alle ungesendeten', unselectAll: 'Auswahl aufheben',
  noData: 'Keine Daten', noDataDesc: 'Auf der Geräteseite messen und speichern',
  pushSelected: 'Auswahl senden', pushing: 'Sende…',
  selectDate: 'Datum wählen', recordCountSuffix: 'Einträge',
  detailTitle: 'Messdetails', electrodeOn: 'Kontakt', electrodeOffShort: 'Kein Kontakt (keine Impedanz)',
  impedanceRaw: 'Impedanz-Rohwert', pushStatus: 'Sendestatus', synced: 'Gesendet', notSynced: 'Nicht gesendet',
  algorithm: 'Algorithmus', bodyCompLocal: 'Körperzusammensetzung (lokale BIA-Schätzung)', compUnavailable: 'Körperdaten nicht verfügbar (keine Elektrodenkontakt)',
  bcFat: 'Körperfett', bcMuscle: 'Muskeln', bcWater: 'Wasser', bcProtein: 'Protein', bcBone: 'Knochen', bcSkeletal: 'Skelettmuskeln',
  goalSheetTitle: 'Zielgewicht festlegen', goalHint: 'Das Ziel bestimmst du selbst; es wird nur lokal gespeichert. Leer lassen blendet die Ziellinie aus.',
  goalPlaceholder: 'z. B. 60', saveGoal: 'Ziel speichern', clearGoal: 'Löschen',

  syncSettings: 'Synchronisierung', pushUrl: 'Ziel-URL',
  pushUrlHint: 'Am PC server_receiver.py starten und im selben WLAN sein. Die URL ist frei änderbar.',
  saveUrl: 'URL speichern', testConn: 'Verbindung testen', pullFromPc: 'Vom PC laden',
  unitsSection: 'Personen', unitsHint: 'Bei mehreren Nutzern kann beim Speichern zugeordnet werden', newUnitPlaceholder: 'Neuer Name',
  boundDevices: 'Verknüpfte Geräte', debugLog: 'Debug-Log',
  about: 'Über', adaptation: 'Modell: AFU-WL-TZ-A1 (ICOMON / Ant Afu Welland)',
  privacyLine: 'Daten bleiben lokal und gehen an keine Dritten',
  estimateLine: 'Körperfett etc. sind lokale BIA-Schätzwerte (nur zur Orientierung)',
  unofficial: 'Keine offizielle Hersteller-App',
  openSource: 'Open Source', openSourceDesc: 'Dieses Projekt ist Open Source; Quellcode und Build (GitHub Actions) sind öffentlich.',
  ghRepo: 'GitHub-Repository',
  credits: 'Danksagung', creditsDesc: 'Bluetooth-Protokollanalyse und Körperzusammensetzungs-Algorithmen basieren auf folgenden Open-Source-Projekten:',
  creditsLicense: 'Alle Projekte stehen unter MIT-Lizenz. Diese App folgt demselben Open-Source-Gedanken.',
  language: 'Sprache', languageHint: 'Systemsprache folgen oder manuell wählen', followSystem: 'System folgen',
 macFormat: 'MAC-Format ungültig (XX:XX:XX:XX:XX:XX)', saved: 'Gespeichert:', saveFail: 'Speichern fehlgeschlagen', selectFirst: 'Bitte Einträge zum Senden auswählen',

  connecting: 'Verbinde…', testing: 'Teste…', pulling: 'Lade…',
  connOk: 'Verbindung OK', connFail: 'Verbindung fehlgeschlagen', pushOk: 'Senden erfolgreich', pushFail: 'Senden fehlgeschlagen',
  pullResult: 'Laden abgeschlossen', recordWriteFail: 'Speichern fehlgeschlagen',
};

const en: Strings = {
  brand: 'AFU', brandSub: 'Body Scale',
  tabDevice: 'Device', tabData: 'Data', tabSettings: 'Settings',

  cancel: 'Cancel', save: 'Save', delete: 'Delete', close: 'Close', back: 'Back',
  clear: 'Clear', refresh: 'Refresh', confirm: 'OK', add: 'Add', rename: 'Rename',
  unbind: 'Unbind', open: 'Open', none: 'None',

  myDevices: 'My Devices', addDevice: 'Add Device',
  noDeviceTitle: 'No scale bound yet',
  noDeviceDesc: 'Scan to add, or enter the MAC address manually',
  scanAndAdd: 'Scan & Add Device', manualMac: 'Enter MAC Address',
  scanningNew: 'Searching for new devices…',
  scanningHint: 'Only unbound scales are searched. The scale usually sleeps — tap it lightly to wake. Scans every 15 seconds.',
  stopScan: 'Stop Scan', manualInput: 'Manual', collapse: 'Collapse',
  macLabel: 'Device MAC Address', macHint: 'Visible in system Bluetooth settings. A known MAC needs no scan.',
  connectDirect: 'Connect Directly', copiedMac: 'MAC copied', boundTag: 'Bound',
  needPermTitle: 'Bluetooth permission required',
  needPermDesc: 'Scanning needs "Nearby devices / Location" permission',
  grantPerm: 'Grant Permission',

  deviceInfo: 'Device Info', devName: 'Name', devModel: 'Model',
  devMac: 'MAC', devBoundAt: 'Bound on',
  connectState: 'Connection', stateConnecting: 'Connecting…', stateConnected: 'Connected',
  stateError: 'Connection failed', stateIdle: 'Not connected',
  measuringWait: 'Step on the scale to measure', standOnScale: 'Step on the scale to measure',
  electrodeOff: '⚠ Electrodes not in contact · stand barefoot on all four',
  bodyComp: 'Body Composition', localEstimate: 'Local estimate',
  saveMeasurement: 'Save Measurement', whoIsThis: 'Who is this measurement for?',
  weightUnit: 'kg',

  latestRecord: 'Latest', totalRecords: 'Records', unsynced: 'Unsent', unitsLabel: 'People',
  trend: 'Weight Trend', days: 'days', setGoal: 'Set Goal', goalLabel: 'Goal',
  start: 'Start', latest: 'Latest', change: 'Change',
  toGoal: 'To Goal', goalUnset: 'No goal', goalReached: 'Reached',
  filterByUnit: 'Filter by person', all: 'All', byDate: 'By date', clearDateFilter: 'Clear date filter',
  records: 'Records', selectAllUnsynced: 'Select all unsent', unselectAll: 'Deselect all',
  noData: 'No data', noDataDesc: 'Measure and save on the Device page',
  pushSelected: 'Push selected', pushing: 'Pushing…',
  selectDate: 'Select date', recordCountSuffix: 'items',
  detailTitle: 'Measurement Detail', electrodeOn: 'In contact', electrodeOffShort: 'No contact (no impedance)',
  impedanceRaw: 'Raw impedance', pushStatus: 'Push status', synced: 'Synced', notSynced: 'Not synced',
  algorithm: 'Algorithm', bodyCompLocal: 'Body Composition (local BIA estimate)', compUnavailable: 'Body data unavailable (electrodes not in contact)',
  bcFat: 'Body fat', bcMuscle: 'Muscle', bcWater: 'Water', bcProtein: 'Protein', bcBone: 'Bone', bcSkeletal: 'Skeletal muscle',
  goalSheetTitle: 'Set Goal Weight', goalHint: 'You decide the goal; it is stored locally only. Leave empty to hide the goal line.',
  goalPlaceholder: 'e.g. 60', saveGoal: 'Save Goal', clearGoal: 'Clear',

  syncSettings: 'Sync Settings', pushUrl: 'Push URL',
  pushUrlHint: 'Run server_receiver.py on your PC and stay on the same Wi-Fi. The URL is editable.',
  saveUrl: 'Save URL', testConn: 'Test Connection', pullFromPc: 'Pull from PC',
  unitsSection: 'People', unitsHint: 'When several people share a scale, pick the owner when saving', newUnitPlaceholder: 'New person name',
  boundDevices: 'Bound Devices', debugLog: 'Debug Log',
  about: 'About', adaptation: 'Model: AFU-WL-TZ-A1 (ICOMON / Ant Afu Welland)',
  privacyLine: 'Data stays on this device; nothing is sent to third parties',
  estimateLine: 'Body fat etc. are local BIA estimates, for reference only',
  unofficial: 'Not an official vendor app',
  openSource: 'Open Source', openSourceDesc: 'This project is open source; code and CI build (GitHub Actions) are public.',
  ghRepo: 'GitHub Repository',
  credits: 'Credits', creditsDesc: 'Bluetooth protocol parsing and body-composition algorithms are ported from these open-source projects:',
  creditsLicense: 'All projects are MIT licensed. This app follows the same open-source spirit.',
  language: 'Language', languageHint: 'Follow the system language or pick one manually', followSystem: 'Follow system',
 macFormat: 'Invalid MAC format (XX:XX:XX:XX:XX:XX)', saved: 'Saved:', saveFail: 'Save failed', selectFirst: 'Select records to push first',

  connecting: 'Connecting…', testing: 'Testing…', pulling: 'Pulling…',
  connOk: 'Connection OK', connFail: 'Connection failed', pushOk: 'Pushed successfully', pushFail: 'Push failed',
  pullResult: 'Pull finished', recordWriteFail: 'Failed to write record',
};

export const DICTS: Record<Lang, Strings> = {
  'ja': ja,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  'de': de,
  'en': en,
};
