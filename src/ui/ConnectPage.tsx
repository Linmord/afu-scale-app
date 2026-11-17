import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Clipboard, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { Card, SectionTitle, PrimaryButton, GhostButton, EmptyState, Badge } from './components';
import type { BoundDevice } from '../storage/devices';
import type { ScannedDeviceInfo } from '../ble/scaleBle';

interface Props {
  devices: BoundDevice[];
  scanning: boolean;
  scanned: ScannedDeviceInfo[];
  boundNames: Record<string, string>;   // MAC -> 备注名
  permDenied: boolean;
  onOpenDevice: (d: BoundDevice) => void;
  onAddDevice: () => void;
  onManualConnect: (mac: string) => void;
  onRequestPerm: () => void;
  onStopScan: () => void;
}

export function ConnectPage({
  devices, scanning, scanned, boundNames, permDenied,
  onOpenDevice, onAddDevice, onManualConnect, onRequestPerm, onStopScan,
}: Props) {
  const [mac, setMac] = useState('');
  const [showManual, setShowManual] = useState(false);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>
      {permDenied && (
        <Card style={{ borderColor: 'rgba(255,176,32,0.4)' }}>
          <View style={S.row}>
            <Text style={styles.warnIcon}>🔒</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.warnTitle}>需要蓝牙权限</Text>
              <Text style={S.hint}>未授予「附近设备 / 位置」权限，无法扫描体脂秤</Text>
            </View>
          </View>
          <PrimaryButton title="授予权限" onPress={onRequestPerm} colors={G.warm} style={{ marginTop: 14 }} />
        </Card>
      )}

      <SectionTitle
        title={`我的设备`}
        right={<Badge text={String(devices.length)} color={C.primary} />}
      />

      {devices.length === 0 ? (
        <Card>
          <EmptyState icon="⚖️" title="还没有绑定体脂秤" desc="扫描添加，或手动输入 MAC 地址直接连接" />
        </Card>
      ) : (
        devices.map((d) => (
          <TouchableOpacity key={d.id} activeOpacity={0.8} onPress={() => onOpenDevice(d)}>
            <LinearGradient
              colors={['#1E222B', '#191D25']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.devCard}>
              <View style={styles.devIconWrap}>
                <Text style={styles.devIcon}>⚖️</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.devName}>{d.name}</Text>
                <Text style={styles.devMeta}>{d.model}</Text>
                <Text style={styles.devMac}>{d.id}</Text>
              </View>
              <Text style={styles.chev}>›</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))
      )}

      <View style={{ height: 8 }} />
      <SectionTitle title="添加设备" />

      <Card>
        {scanning ? (
          <>
            <View style={[S.row, { marginBottom: 10 }]}>
              <ActivityIndicator color={C.primary} />
              <Text style={styles.scanText}>正在搜索新设备…</Text>
            </View>
            <Text style={S.hint}>
              只搜索尚未绑定的秤。请轻踩秤唤醒它（秤平时休眠不广播）。每 15 秒扫描一轮。
            </Text>
            {scanned.length > 0 && (
              <View style={styles.scanList}>
                {scanned.slice(0, 8).map((s) => {
                  const boundName = boundNames[s.id];
                  const isNamed = s.name && s.name !== '(无名)';
                  const label = boundName || (isNamed ? s.name : s.id);
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.6}
                      style={styles.scanRow}
                      onPress={() => {
                        Clipboard.setString(s.id);
                        Alert.alert('已复制 MAC', s.id);
                      }}>
                      <View style={[styles.dot, boundName && { backgroundColor: C.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanName} numberOfLines={1}>{label}</Text>
                        {!boundName && isNamed && (
                          <Text style={styles.scanMac}>{s.id}</Text>
                        )}
                        {boundName && <Text style={styles.scanBadge}>已绑定</Text>}
                      </View>
                      <Text style={styles.scanRssi}>{s.rssi} dBm</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={[S.row, { gap: 10, marginTop: 14 }]}>
              <GhostButton title="停止扫描" onPress={onStopScan} style={{ flex: 1 }} />
              <GhostButton title={showManual ? '收起' : '手动输入'} onPress={() => setShowManual((v) => !v)} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <PrimaryButton title="扫描并添加设备" onPress={onAddDevice} />
            <GhostButton title={showManual ? '收起手动输入' : '手动输入 MAC 地址'} onPress={() => setShowManual((v) => !v)} style={{ marginTop: 10 }} />
          </>
        )}

        {showManual && (
          <View style={{ marginTop: 16 }}>
            <View style={S.divider} />
            <Text style={S.label}>设备 MAC 地址</Text>
            <TextInput
              value={mac}
              onChangeText={setMac}
              placeholder="B0:82:AB:07:76:24"
              placeholderTextColor={C.textHint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={[S.hint, { marginBottom: 10 }]}>
              可在系统蓝牙设置中查看。已知 MAC 可直接连接，无需扫描。
            </Text>
            <PrimaryButton
              title="直接连接"
              onPress={() => onManualConnect(mac.trim())}
              disabled={!mac.trim()}
              colors={G.accent}
            />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  warnIcon: { fontSize: 26 },
  warnTitle: { fontSize: 15, fontWeight: '700', color: C.warn },
  devCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: R.lg,
    marginBottom: 12, borderWidth: 1, borderColor: C.border, ...SH.card,
  },
  devIconWrap: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(77,141,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  devIcon: { fontSize: 26 },
  devName: { fontSize: 17, fontWeight: '700', color: C.text },
  devMeta: { fontSize: 12, color: C.textSub, marginTop: 2 },
  devMac: { fontSize: 11, color: C.textHint, marginTop: 3, fontFamily: 'monospace' },
  chev: { fontSize: 30, color: C.textHint, marginLeft: 6 },
  scanText: { color: C.primary, fontSize: 14, fontWeight: '600', marginLeft: 10 },
  scanList: { marginTop: 12, backgroundColor: C.bg, borderRadius: R.sm, padding: 10 },
  scanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginRight: 8 },
  scanName: { fontSize: 13, color: C.textSub, fontWeight: '600' },
  scanMac: { fontSize: 10, color: C.textHint, fontFamily: 'monospace', marginTop: 1 },
  scanBadge: { fontSize: 10, color: C.primary, fontWeight: '700', marginTop: 1 },
  scanRssi: { fontSize: 11, color: C.textHint, fontFamily: 'monospace' },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    padding: 14, fontSize: 15, color: C.text, marginTop: 8, marginBottom: 8, letterSpacing: 0.6,
  },
});
