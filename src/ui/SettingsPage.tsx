import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n, LANGS } from '../i18n';
import { Card, PrimaryButton, GhostButton, Badge, Sheet, SectionTitle, EmptyState } from './components';
import type { BoundDevice } from '../storage/devices';

const CREDITS: { name: string; url: string; desc: string }[] = [
  {
    name: 'Mzdyl/ant-afu-welland-scale',
    url: 'https://github.com/Mzdyl/ant-afu-welland-scale',
    desc: 'Scale27 协议解析与 BIA 身体成分公式（macOS 命令行工具）',
  },
  {
    name: '阿文 (awen.me) 逆向笔记',
    url: 'https://www.awen.me/post/bca6fedc.html',
    desc: 'AFU-WL-TZ-A1 / ICOMON FG2508WB 蓝牙包结构与体重偏移验证',
  },
  {
    name: 'lvxiangyu11/faa0-body-scale-protocol',
    url: 'https://github.com/lvxiangyu11/faa0-body-scale-protocol',
    desc: 'Windows 侧 BLE 体脂秤接入教程与协议族参考',
  },
  {
    name: 'kubulashvili/mi-fitness-mcp',
    url: 'https://github.com/kubulashvili/mi-fitness-mcp',
    desc: '小米运动健康云端适配器上游（配套数据链路参考）',
  },
];

interface Props {
  url: string;
  onUrlChange: (u: string) => void;
  units: string[];
  onAddUnit: (n: string) => void;
  onRemoveUnit: (n: string) => void;
  onTestSync: () => void;
  testMsg: string;
  onPullRemote: () => void;
  remoteMsg: string;
  devices: BoundDevice[];
  onUnbind: (id: string) => void;
  debugLogs: string;
  onRefreshLogs: () => void;
  onClearLogs: () => void;
}

export function SettingsPage({
  url, onUrlChange, units, onAddUnit, onRemoveUnit, onTestSync, testMsg, onPullRemote, remoteMsg,
  devices, onUnbind, debugLogs, onRefreshLogs, onClearLogs,
}: Props) {
  const { t, lang, pref, setLang } = useI18n();
  const [langSheet, setLangSheet] = useState(false);
  const [newUnit, setNewUnit] = useState('');
  const [editUrl, setEditUrl] = useState(url);
  React.useEffect(() => { setEditUrl(url); }, [url]);
  const [showDebug, setShowDebug] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
      {/* 语言设置 */}
      <Card>
        <SectionTitle title={t.language} right={<Badge text={lang.toUpperCase()} color={C.accent} />} />
        <Text style={S.hint}>{t.languageHint}</Text>
        <View style={[S.row, { gap: 10, marginTop: 12 }]}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setLang('system')}
            style={[styles.langChip, pref === 'system' && styles.langChipActive]}>
            <Text style={[styles.langChipText, pref === 'system' && styles.langChipTextActive]}>{t.followSystem}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setLangSheet(true)}
            style={[styles.langChip, pref !== 'system' && styles.langChipActive]}>
            <Text style={[styles.langChipText, pref !== 'system' && styles.langChipTextActive]}>
              {LANGS.find((l) => l.code === lang)?.native}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
      {/* 同步设置 */}
      <Card>
        <SectionTitle title={t.syncSettings} right={<Badge text="HTTP POST" color={C.primary} />} />
        <Text style={S.label}>{t.pushUrl}</Text>
        <TextInput
          value={editUrl}
          onChangeText={setEditUrl}
          onBlur={() => onUrlChange(editUrl)}
          style={styles.input}
          placeholder="http://192.168.1.5:8765/records"
          placeholderTextColor={C.textHint}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={S.hint}>{t.pushUrlHint}</Text>
        <View style={[S.row, { gap: 10, marginTop: 12 }]}>
          <GhostButton title={t.saveUrl} onPress={() => { onUrlChange(editUrl.trim()); }} style={{ flex: 1 }} />
          <PrimaryButton title={t.testConn} onPress={() => { onUrlChange(editUrl.trim()); onTestSync(); }} style={{ flex: 1 }} />
        </View>
        <GhostButton title={t.pullFromPc} onPress={onPullRemote} style={{ marginTop: 10 }} />
        {remoteMsg ? (
          <View style={styles.msgBox}>
            <Text style={[styles.msgText, { color: C.accent }]}>{remoteMsg}</Text>
          </View>
        ) : null}
        {testMsg ? (
          <View style={styles.msgBox}>
            <Text style={[styles.msgText, testMsg.includes('fail') ? { color: C.danger } : { color: C.accent }]}>
              {testMsg}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* 分配单位 */}
      <Card>
        <SectionTitle title={t.unitsSection} right={<Badge text={`${units.length}`} color={C.accent} />} />
        <Text style={S.hint}>{t.unitsHint}</Text>
        <View style={{ marginTop: 10 }}>
          {units.map((u) => (
            <View key={u} style={styles.row}>
              <View style={[S.row, { flex: 1 }]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.slice(0, 1)}</Text></View>
                <Text style={styles.rowText}>{u}</Text>
              </View>
              {units.length > 1 && (
                <TouchableOpacity onPress={() => onRemoveUnit(u)}>
                  <Text style={styles.dangerText}>{t.delete}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <View style={[S.row, { gap: 10, marginTop: 12 }]}>
          <TextInput
            value={newUnit}
            onChangeText={setNewUnit}
            placeholder={t.newUnitPlaceholder}
            placeholderTextColor={C.textHint}
            style={[styles.input, { flex: 1, marginTop: 0, marginBottom: 0 }]}
          />
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => { const n = newUnit.trim(); if (n) { onAddUnit(n); setNewUnit(''); } }}>
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* 设备管理 */}
      <Card>
        <SectionTitle title={t.boundDevices} right={<Badge text={`${devices.length}`} color={C.primary} />} />
        {devices.length === 0 ? (
          <EmptyState icon="⚖️" title={t.noDeviceTitle} desc={t.addDevice} />
        ) : (
          devices.map((d) => (
            <View key={d.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{d.name}</Text>
                <Text style={styles.rowSub}>{d.model} · {d.id.slice(0, 17)}</Text>
              </View>
              <TouchableOpacity onPress={() => onUnbind(d.id)}>
                <Text style={styles.dangerText}>{t.unbind}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </Card>

      {/* 调试 */}
      <Card>
        <TouchableOpacity onPress={() => setShowDebug((v) => !v)} style={S.rowBetween}>
          <Text style={T.h2}>{t.debugLog}</Text>
          <Text style={styles.chev}>{showDebug ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDebug && (
          <View style={{ marginTop: 12 }}>
            <View style={[S.row, { gap: 10, marginBottom: 10 }]}>
              <GhostButton title={t.refresh} onPress={onRefreshLogs} style={{ flex: 1 }} />
              <GhostButton title={t.clear} onPress={onClearLogs} danger style={{ flex: 1 }} />
            </View>
            <ScrollView style={styles.logBox} nestedScrollEnabled>
              <Text style={styles.logText}>{debugLogs || t.none}</Text>
            </ScrollView>
          </View>
        )}
      </Card>

      {/* 关于 */}
      <Card>
        <TouchableOpacity onPress={() => setShowAbout((v) => !v)} style={S.rowBetween}>
          <Text style={T.h2}>{t.about}</Text>
          <Text style={styles.chev}>{showAbout ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showAbout && (
          <View style={{ marginTop: 12 }}>
            <LinearGradient colors={G.primary as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aboutHero}>
              <Text style={styles.aboutLogo}>AFU</Text>
              <Text style={styles.aboutApp}>{t.brandSub}</Text>
              <Text style={styles.aboutVer}>v0.1.1 · com.aiyue.afuscale</Text>
            </LinearGradient>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.aboutLine}>{t.adaptation}</Text>
              <Text style={styles.aboutLine}>{t.privacyLine}</Text>
              <Text style={styles.aboutLine}>{t.estimateLine}</Text>
              <Text style={styles.aboutLine}>{t.unofficial}</Text>
            </View>

            <View style={styles.dividerH} />

            <Text style={styles.secTitle}>{t.openSource}</Text>
            <Text style={styles.aboutLine}>{t.openSourceDesc}</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.repoCard}
              onPress={() => Linking.openURL('https://github.com/Linmord/afu-scale-app').catch(() => {})}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repoLabel}>{t.ghRepo}</Text>
                <Text style={styles.repoUrl}>github.com/Linmord/afu-scale-app</Text>
              </View>
              <Text style={styles.repoGo}>{t.open} ›</Text>
            </TouchableOpacity>

            <Text style={[styles.secTitle, { marginTop: 14 }]}>{t.credits}</Text>
            <Text style={styles.creditNote}>{t.creditsDesc}</Text>
            {CREDITS.map((c) => (
              <TouchableOpacity
                key={c.url}
                activeOpacity={0.7}
                style={styles.creditRow}
                onPress={() => Linking.openURL(c.url).catch(() => {})}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{c.name}</Text>
                  <Text style={styles.creditDesc}>{c.desc}</Text>
                </View>
                <Text style={styles.creditChev}>›</Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.creditNote, { marginTop: 10, fontSize: 11, color: C.textHint }]}>
              以上项目均为 MIT 许可。本应用遵循同样的开源精神，感谢原作者的逆向与分享。
            </Text>
          </View>
        )}
      </Card>


      {/* 语言选择弹层 */}
      <Sheet visible={langSheet} onClose={() => setLangSheet(false)} title={t.language}>
        {LANGS.map((l) => (
          <TouchableOpacity
            key={l.code}
            activeOpacity={0.8}
            style={styles.langRow}
            onPress={() => { setLang(l.code); setLangSheet(false); }}>
            <Text style={styles.langFlag}>{l.flag}</Text>
            <Text style={[styles.langRowText, lang === l.code && { color: C.primary, fontWeight: '700' }]}>{l.native}</Text>
            {lang === l.code && <Text style={styles.langCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.langRow} activeOpacity={0.8} onPress={() => { setLang('system'); setLangSheet(false); }}>
          <Text style={styles.langFlag}>📱</Text>
          <Text style={styles.langRowText}>{t.followSystem}</Text>
        </TouchableOpacity>
        <GhostButton title={t.close} onPress={() => setLangSheet(false)} style={{ marginTop: 10 }} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    padding: 13, fontSize: 14, color: C.text, marginTop: 8,
  },
  msgBox: { marginTop: 12, backgroundColor: C.bg, borderRadius: R.sm, padding: 12, borderWidth: 1, borderColor: C.border },
  msgText: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: C.border },
  rowText: { fontSize: 15, color: C.text, fontWeight: '600' },
  rowSub: { fontSize: 11, color: C.textHint, marginTop: 2 },
  dangerText: { fontSize: 13, color: C.danger, fontWeight: '600' },
  avatar: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(77,141,255,0.16)',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: C.primary },
  addBtn: {
    width: 46, height: 46, borderRadius: R.md, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: -1 },
  chev: { fontSize: 12, color: C.textHint },
  logBox: {
    height: 220, backgroundColor: C.bg, borderRadius: R.sm, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  logText: { fontSize: 11, color: C.textSub, fontFamily: 'monospace', lineHeight: 16 },
  langChip: {
    flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: R.md,
    borderWidth: 1, borderColor: C.borderStrong, backgroundColor: C.surfaceAlt,
  },
  langChipActive: { borderColor: C.primary, backgroundColor: 'rgba(77,141,255,0.14)' },
  langChipText: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  langChipTextActive: { color: C.primary },
  langRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  langFlag: { fontSize: 22, marginRight: 12 },
  langRowText: { flex: 1, fontSize: 16, color: C.text },
  langCheck: { color: C.accent, fontSize: 16, fontWeight: '700' },
  dividerH: { height: 1, backgroundColor: C.border, marginVertical: 16 },
  secTitle: { fontSize: 13, fontWeight: '700', color: C.textSub, marginBottom: 8, letterSpacing: 0.3 },
  repoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt,
    borderRadius: R.md, padding: 14, marginTop: 10, borderWidth: 1, borderColor: C.border,
  },
  repoLabel: { fontSize: 11, color: C.textHint },
  repoUrl: { fontSize: 13, color: C.primary, fontWeight: '700', marginTop: 2 },
  repoGo: { fontSize: 13, color: C.primary, fontWeight: '700' },
  creditNote: { fontSize: 12, color: C.textSub, lineHeight: 18 },
  creditRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 11,
    borderTopWidth: 1, borderTopColor: C.border, marginTop: 2,
  },
  creditName: { fontSize: 13, color: C.text, fontWeight: '700' },
  creditDesc: { fontSize: 11, color: C.textHint, marginTop: 2, lineHeight: 16 },
  creditChev: { fontSize: 16, color: C.textHint },
  aboutLogo: { fontSize: 40, fontWeight: '900', color: '#fff', letterSpacing: 8, marginLeft: 8 },
  aboutHero: { borderRadius: R.md, padding: 20, alignItems: 'center' },
  aboutApp: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.95)', letterSpacing: 6, marginTop: 2 },
  aboutVer: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 8, fontFamily: 'monospace' },
  aboutLine: { fontSize: 12, color: C.textSub, marginBottom: 6, lineHeight: 18 },
});
