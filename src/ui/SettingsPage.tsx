import React, { useState } from 'react';
import {
  LayoutAnimation, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, T, S } from './theme';
import { useI18n, LANGS } from '../i18n';
import { type DisplayUnit } from '../storage/unitPref';
import {
  PrimaryButton, GhostButton, Badge, Sheet, SettingGroup, SettingRow, SegmentedControl,
} from './components';
import {
  IconCheck, IconChevron, IconClock, IconInfo, IconScale, IconSync, IconUser,
} from './Icons';
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
  onTestSync: () => void;
  testMsg: string;
  onPullRemote: () => void;
  remoteMsg: string;
  devices: BoundDevice[];
  onUnbind: (id: string) => void;
  debugLogs: string;
  onRefreshLogs: () => void;
  onClearLogs: () => void;
  displayUnit: DisplayUnit;
  onDisplayUnitChange: (u: DisplayUnit) => void;
  pendingCount?: number;
  onOpenPending?: () => void;
  activeProfileName?: string;
  profilesCount?: number;
  onOpenProfiles?: () => void;
}

export function SettingsPage({
  url, onUrlChange, onTestSync, testMsg, onPullRemote, remoteMsg,
  devices, onUnbind, debugLogs, onRefreshLogs, onClearLogs,
  displayUnit, onDisplayUnitChange, pendingCount = 0, onOpenPending,
  activeProfileName, profilesCount, onOpenProfiles,
}: Props) {
  const { t, lang, pref, setLang } = useI18n();
  const [langSheet, setLangSheet] = useState(false);
  const [editUrl, setEditUrl] = useState(url);
  React.useEffect(() => { setEditUrl(url); }, [url]);
  const [showSync, setShowSync] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter((v) => !v);
  };

  const currentLangLabel = pref === 'system'
    ? t.followSystem
    : (LANGS.find((l) => l.code === lang)?.native || lang);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* 分组 1：成员与历史队列 */}
      {(onOpenProfiles || onOpenPending) && (
        <SettingGroup>
          {onOpenProfiles && (
            <SettingRow
              first
              icon={<IconUser size={16} color={C.primary} />}
              iconBg={C.primarySoft}
              title={t.profilesTitle}
              subtitle={activeProfileName ? t.activeProfileLabel + ': ' + activeProfileName : t.profilesHint}
              right={
                <View style={[S.row, { gap: 8 }]}>
                  <Badge text={String(profilesCount ?? 0)} color={C.primary} />
                  <IconChevron size={13} color={C.textHint} dir="right" />
                </View>
              }
              onPress={onOpenProfiles}
            />
          )}
          {onOpenPending && (
            <SettingRow
              first={!onOpenProfiles}
              icon={<IconClock size={16} color={pendingCount > 0 ? C.warn : C.textSub} />}
              iconBg={pendingCount > 0 ? C.warnSoft : C.surfaceAlt}
              title={t.pendingEntry}
              subtitle={t.pendingHint}
              right={
                <View style={[S.row, { gap: 8 }]}>
                  <Badge text={String(pendingCount)} color={pendingCount > 0 ? C.warn : C.textHint} />
                  <IconChevron size={13} color={C.textHint} dir="right" />
                </View>
              }
              onPress={onOpenPending}
            />
          )}
        </SettingGroup>
      )}

      {/* 分组 2：通用偏好（语言 + 单位分段） */}
      <SettingGroup title={t.language + ' & ' + t.unitSection2}>
        <SettingRow
          first
          title={t.language}
          subtitle={t.languageHint}
          value={currentLangLabel}
          onPress={() => setLangSheet(true)}
        />
        <View style={styles.unitBox}>
          <View style={[S.rowBetween, { marginBottom: 10 }]}>
            <Text style={styles.unitTitle}>{t.unitSection2}</Text>
            <Text style={styles.unitHint}>{t.unitDisplayHint}</Text>
          </View>
          <SegmentedControl<DisplayUnit>
            value={displayUnit}
            onChange={onDisplayUnitChange}
            options={[
              { key: 'kg', label: t.unitKg },
              { key: 'lb', label: t.unitLb },
              { key: 'jin', label: t.unitJin },
            ]}
          />
        </View>
      </SettingGroup>

      {/* 分组 3：局域网电脑同步 */}
      <SettingGroup title={t.syncSettings}>
        <SettingRow
          first
          icon={<IconSync size={16} color={C.accent} />}
          iconBg={C.accentSoft}
          title={t.pushUrl}
          subtitle={url}
          right={<IconChevron size={13} color={C.textHint} dir={showSync ? 'up' : 'down'} />}
          onPress={() => toggle(setShowSync)}
        />
        {showSync && (
          <View style={styles.expandPad}>
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
            <View style={[S.row, { gap: 8, marginTop: 12 }]}>
              <GhostButton title={t.saveUrl} compact onPress={() => onUrlChange(editUrl.trim())} style={{ flex: 1 }} />
              <PrimaryButton title={t.testConn} compact onPress={() => { onUrlChange(editUrl.trim()); onTestSync(); }} style={{ flex: 1 }} />
            </View>
            <GhostButton title={t.pullFromPc} compact onPress={onPullRemote} style={{ marginTop: 8 }} />
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
          </View>
        )}
      </SettingGroup>

      {/* 分组 4：已绑定设备与诊断、关于 */}
      <SettingGroup title={t.boundDevices}>
        {devices.length === 0 ? (
          <View style={styles.emptyDev}>
            <Text style={styles.emptyDevText}>{t.noDeviceTitle}</Text>
          </View>
        ) : (
          devices.map((d, idx) => (
            <SettingRow
              key={d.id}
              first={idx === 0}
              icon={<IconScale size={16} color={C.primary} />}
              iconBg={C.primarySoft}
              title={d.name}
              subtitle={d.model + ' · ' + d.id}
              right={
                <TouchableOpacity onPress={() => onUnbind(d.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.dangerText}>{t.unbind}</Text>
                </TouchableOpacity>
              }
            />
          ))
        )}
      </SettingGroup>

      <SettingGroup>
        <SettingRow
          first
          title={t.debugLog}
          right={<IconChevron size={13} color={C.textHint} dir={showDebug ? 'up' : 'down'} />}
          onPress={() => toggle(setShowDebug)}
        />
        {showDebug && (
          <View style={styles.expandPad}>
            <View style={[S.row, { gap: 8, marginBottom: 10 }]}>
              <GhostButton title={t.refresh} compact onPress={onRefreshLogs} style={{ flex: 1 }} />
              <GhostButton title={t.clear} compact onPress={onClearLogs} danger style={{ flex: 1 }} />
            </View>
            <ScrollView style={styles.logBox} nestedScrollEnabled>
              <Text style={styles.logText}>{debugLogs || t.none}</Text>
            </ScrollView>
          </View>
        )}

        <SettingRow
          icon={<IconInfo size={16} color={C.textSub} />}
          title={t.about}
          value="v0.1.1"
          right={<IconChevron size={13} color={C.textHint} dir={showAbout ? 'up' : 'down'} />}
          onPress={() => toggle(setShowAbout)}
        />
        {showAbout && (
          <View style={styles.expandPad}>
            <LinearGradient colors={G.primary as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aboutHero}>
              <Text style={styles.aboutLogo}>AFU</Text>
              <Text style={styles.aboutApp}>{t.brandSub}</Text>
              <Text style={styles.aboutVer}>v0.1.1 · com.aiyue.afuscale</Text>
            </LinearGradient>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.aboutLine}>{t.adaptation}</Text>
              <Text style={styles.aboutLine}>{t.privacyLine}</Text>
              <Text style={styles.aboutLine}>{t.estimateLine}</Text>
              <Text style={styles.aboutLine}>{t.unofficial}</Text>
            </View>

            <View style={S.divider} />

            <Text style={styles.secTitle}>{t.openSource}</Text>
            <Text style={styles.aboutLine}>{t.openSourceDesc}</Text>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.repoCard}
              onPress={() => Linking.openURL('https://github.com/Linmord/afu-scale-app').catch(() => {})}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repoLabel}>{t.ghRepo}</Text>
                <Text style={styles.repoUrl}>github.com/Linmord/afu-scale-app</Text>
              </View>
              <IconChevron size={14} color={C.primary} dir="right" />
            </TouchableOpacity>

            <Text style={[styles.secTitle, { marginTop: 14 }]}>{t.credits}</Text>
            <Text style={styles.creditNote}>{t.creditsDesc}</Text>
            {CREDITS.map((c) => (
              <TouchableOpacity
                key={c.url}
                activeOpacity={0.75}
                style={styles.creditRow}
                onPress={() => Linking.openURL(c.url).catch(() => {})}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.creditName}>{c.name}</Text>
                  <Text style={styles.creditDesc}>{c.desc}</Text>
                </View>
                <IconChevron size={13} color={C.textHint} dir="right" />
              </TouchableOpacity>
            ))}
            <Text style={[styles.creditNote, { marginTop: 10, fontSize: 11, color: C.textHint }]}>
              以上项目均为 MIT 许可。本应用遵循同样的开源精神，感谢原作者的逆向与分享。
            </Text>
          </View>
        )}
      </SettingGroup>

      {/* 语言选择 Sheet */}
      <Sheet visible={langSheet} onClose={() => setLangSheet(false)} title={t.language}>
        {LANGS.map((l) => {
          const active = pref !== 'system' && lang === l.code;
          return (
            <TouchableOpacity
              key={l.code}
              activeOpacity={0.75}
              style={styles.langRow}
              onPress={() => { setLang(l.code); setLangSheet(false); }}>
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langRowText, active && { color: C.primary, fontWeight: '700' }]}>{l.native}</Text>
              {active && <IconCheck size={15} color={C.accent} />}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.langRow} activeOpacity={0.75} onPress={() => { setLang('system'); setLangSheet(false); }}>
          <View style={styles.sysBadge}><Text style={styles.sysBadgeText}>AUTO</Text></View>
          <Text style={[styles.langRowText, pref === 'system' && { color: C.primary, fontWeight: '700' }]}>{t.followSystem}</Text>
          {pref === 'system' && <IconCheck size={15} color={C.accent} />}
        </TouchableOpacity>
        <GhostButton title={t.close} compact onPress={() => setLangSheet(false)} style={{ marginTop: 10 }} />
      </Sheet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  unitBox: { padding: 14, borderTopWidth: 1, borderTopColor: C.border },
  unitTitle: { fontSize: 14, fontWeight: '600', color: C.text },
  unitHint: { fontSize: 11, color: C.textHint, maxWidth: '64%', textAlign: 'right' },
  expandPad: { padding: 14, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: 'rgba(11,13,18,0.35)' },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 13, color: C.text, fontFamily: 'monospace',
  },
  msgBox: { marginTop: 10, backgroundColor: C.bg, borderRadius: R.sm, padding: 10, borderWidth: 1, borderColor: C.border },
  msgText: { fontSize: 12, lineHeight: 17 },
  emptyDev: { padding: 16, alignItems: 'center' },
  emptyDevText: { fontSize: 13, color: C.textHint },
  dangerText: { fontSize: 13, color: C.danger, fontWeight: '600' },
  logBox: {
    height: 200, backgroundColor: C.bg, borderRadius: R.sm, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  logText: { fontSize: 11, color: C.textSub, fontFamily: 'monospace', lineHeight: 16 },
  langRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  langFlag: { fontSize: 20, marginRight: 12 },
  sysBadge: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: C.primarySoft, marginRight: 10,
  },
  sysBadgeText: { fontSize: 10, fontWeight: '800', color: C.primary },
  langRowText: { flex: 1, fontSize: 15, color: C.text },
  secTitle: { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6, letterSpacing: 0.3 },
  repoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt,
    borderRadius: R.md, padding: 12, marginTop: 8, borderWidth: 1, borderColor: C.border,
  },
  repoLabel: { fontSize: 11, color: C.textHint },
  repoUrl: { fontSize: 13, color: C.primary, fontWeight: '700', marginTop: 2 },
  creditNote: { fontSize: 12, color: C.textSub, lineHeight: 18 },
  creditRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: C.border, marginTop: 2,
  },
  creditName: { fontSize: 13, color: C.text, fontWeight: '700' },
  creditDesc: { fontSize: 11, color: C.textHint, marginTop: 2, lineHeight: 16 },
  aboutLogo: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 8, marginLeft: 8 },
  aboutHero: { borderRadius: R.md, padding: 18, alignItems: 'center' },
  aboutApp: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.92)', letterSpacing: 5, marginTop: 2 },
  aboutVer: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 6, fontFamily: 'monospace' },
  aboutLine: { fontSize: 12, color: C.textSub, marginBottom: 5, lineHeight: 17 },
});
