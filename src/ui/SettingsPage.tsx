import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { Card, PrimaryButton, GhostButton, Badge, SectionTitle, EmptyState } from './components';
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
  const [newUnit, setNewUnit] = useState('');
  const [editUrl, setEditUrl] = useState(url);
  React.useEffect(() => { setEditUrl(url); }, [url]);
  const [showDebug, setShowDebug] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
      {/* 同步设置 */}
      <Card>
        <SectionTitle title="同步设置" right={<Badge text="HTTP POST" color={C.primary} />} />
        <Text style={S.label}>推送地址</Text>
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
        <Text style={S.hint}>电脑端需运行 server_receiver.py，保持同一 WiFi。地址可自由修改。</Text>
        <View style={[S.row, { gap: 10, marginTop: 12 }]}>
          <GhostButton title="保存地址" onPress={() => { onUrlChange(editUrl.trim()); }} style={{ flex: 1 }} />
          <PrimaryButton title="测试连接" onPress={() => { onUrlChange(editUrl.trim()); onTestSync(); }} style={{ flex: 1 }} />
        </View>
        <GhostButton title="从电脑拉取数据" onPress={onPullRemote} style={{ marginTop: 10 }} />
        {remoteMsg ? (
          <View style={styles.msgBox}>
            <Text style={[styles.msgText, { color: C.accent }]}>{remoteMsg}</Text>
          </View>
        ) : null}
        {testMsg ? (
          <View style={styles.msgBox}>
            <Text style={[styles.msgText, testMsg.includes('失败') || testMsg.includes('异常') ? { color: C.danger } : { color: C.accent }]}>
              {testMsg}
            </Text>
          </View>
        ) : null}
      </Card>

      {/* 分配单位 */}
      <Card>
        <SectionTitle title="分配单位" right={<Badge text={`${units.length}`} color={C.accent} />} />
        <Text style={S.hint}>多人共用一台秤时，测量保存可选择归属</Text>
        <View style={{ marginTop: 10 }}>
          {units.map((u) => (
            <View key={u} style={styles.row}>
              <View style={[S.row, { flex: 1 }]}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{u.slice(0, 1)}</Text></View>
                <Text style={styles.rowText}>{u}</Text>
              </View>
              {units.length > 1 && (
                <TouchableOpacity onPress={() => onRemoveUnit(u)}>
                  <Text style={styles.dangerText}>删除</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <View style={[S.row, { gap: 10, marginTop: 12 }]}>
          <TextInput
            value={newUnit}
            onChangeText={setNewUnit}
            placeholder="新单位名称"
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
        <SectionTitle title="已绑定设备" right={<Badge text={`${devices.length}`} color={C.primary} />} />
        {devices.length === 0 ? (
          <EmptyState icon="⚖️" title="暂无设备" desc="去连接页添加" />
        ) : (
          devices.map((d) => (
            <View key={d.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowText}>{d.name}</Text>
                <Text style={styles.rowSub}>{d.model} · {d.id.slice(0, 17)}</Text>
              </View>
              <TouchableOpacity onPress={() => onUnbind(d.id)}>
                <Text style={styles.dangerText}>解绑</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </Card>

      {/* 调试 */}
      <Card>
        <TouchableOpacity onPress={() => setShowDebug((v) => !v)} style={S.rowBetween}>
          <Text style={T.h2}>调试日志</Text>
          <Text style={styles.chev}>{showDebug ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showDebug && (
          <View style={{ marginTop: 12 }}>
            <View style={[S.row, { gap: 10, marginBottom: 10 }]}>
              <GhostButton title="刷新" onPress={onRefreshLogs} style={{ flex: 1 }} />
              <GhostButton title="清空" onPress={onClearLogs} danger style={{ flex: 1 }} />
            </View>
            <ScrollView style={styles.logBox} nestedScrollEnabled>
              <Text style={styles.logText}>{debugLogs || '（点刷新查看）'}</Text>
            </ScrollView>
          </View>
        )}
      </Card>

      {/* 关于 */}
      <Card>
        <TouchableOpacity onPress={() => setShowAbout((v) => !v)} style={S.rowBetween}>
          <Text style={T.h2}>关于</Text>
          <Text style={styles.chev}>{showAbout ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showAbout && (
          <View style={{ marginTop: 12 }}>
            <LinearGradient colors={G.primary as never} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aboutHero}>
              <Text style={styles.aboutLogo}>AFU</Text>
              <Text style={styles.aboutApp}>体脂秤</Text>
              <Text style={styles.aboutVer}>v0.1.1 · com.aiyue.afuscale</Text>
            </LinearGradient>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.aboutLine}>适配型号：AFU-WL-TZ-A1（ICOMON / 蚂蚁阿福沃莱）</Text>
              <Text style={styles.aboutLine}>数据仅存本机，不上传任何第三方</Text>
              <Text style={styles.aboutLine}>体脂/肌肉等为本地 BIA 公式估算，仅供参考</Text>
              <Text style={styles.aboutLine}>非小米/厂商官方应用</Text>
            </View>

            <View style={styles.dividerH} />

            <Text style={styles.secTitle}>开源</Text>
            <Text style={styles.aboutLine}>本项目开源，源码与构建（GitHub Actions）公开可查。</Text>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.repoCard}
              onPress={() => Linking.openURL('https://github.com/Linmord/afu-scale-app').catch(() => {})}>
              <View style={{ flex: 1 }}>
                <Text style={styles.repoLabel}>GitHub 仓库</Text>
                <Text style={styles.repoUrl}>github.com/Linmord/afu-scale-app</Text>
              </View>
              <Text style={styles.repoGo}>打开 ›</Text>
            </TouchableOpacity>

            <Text style={[styles.secTitle, { marginTop: 14 }]}>致谢</Text>
            <Text style={styles.creditNote}>本项目的蓝牙协议解析与身体成分算法，参考并移植自以下开源项目：</Text>
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
