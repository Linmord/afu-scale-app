import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, Clipboard, LayoutAnimation,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, G, R, SH, T, S } from './theme';
import { useI18n } from '../i18n';
import { Card, SectionTitle, PrimaryButton, GhostButton, EmptyState, Badge, ScalePress } from './components';
import { IconBluetooth, IconChevron, IconLock, IconScale } from './Icons';
import type { BoundDevice } from '../storage/devices';
import type { ScannedDeviceInfo } from '../ble/scaleBle';

interface Props {
  devices: BoundDevice[];
  scanning: boolean;
  scanned: ScannedDeviceInfo[];
  boundNames: Record<string, string>;
  permDenied: boolean;
  onOpenDevice: (d: BoundDevice) => void;
  onAddDevice: () => void;
  onManualConnect: (mac: string) => void;
  onRequestPerm: () => void;
  onStopScan: () => void;
}

/** 扫描脉冲雷达动效 */
function ScanRadar() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.1] });
  const opacity = pulse.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.65, 0.25, 0] });

  return (
    <View style={styles.radarBox}>
      <Animated.View style={[styles.radarRing, { transform: [{ scale }], opacity }]} />
      <View style={styles.radarCore}>
        <IconBluetooth size={18} color={C.primary} />
      </View>
    </View>
  );
}

export function ConnectPage({
  devices, scanning, scanned, boundNames, permDenied,
  onOpenDevice, onAddDevice, onManualConnect, onRequestPerm, onStopScan,
}: Props) {
  const { t } = useI18n();
  const [mac, setMac] = useState('');
  const [showManual, setShowManual] = useState(false);

  const toggleManual = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowManual((v) => !v);
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {permDenied && (
        <Card style={{ borderColor: 'rgba(255,176,32,0.35)', backgroundColor: 'rgba(255,176,32,0.05)' }}>
          <View style={S.row}>
            <View style={styles.warnIconBox}>
              <IconLock size={20} color={C.warn} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.warnTitle}>{t.needPermTitle}</Text>
              <Text style={S.hint}>{t.needPermDesc}</Text>
            </View>
          </View>
          <PrimaryButton title={t.grantPerm} onPress={onRequestPerm} colors={G.warm} compact style={{ marginTop: 12 }} />
        </Card>
      )}

      <SectionTitle
        title={t.myDevices}
        right={<Badge text={String(devices.length)} color={C.primary} />}
      />

      {devices.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconScale size={26} color={C.textHint} />}
            title={t.noDeviceTitle}
            desc={t.noDeviceDesc}
          />
        </Card>
      ) : (
        devices.map((d) => (
          <ScalePress key={d.id} onPress={() => onOpenDevice(d)} style={{ marginBottom: 10 }}>
            <LinearGradient
              colors={['#192030', '#141822']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.devCard}>
              <View style={styles.devIconWrap}>
                <IconScale size={24} color={C.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={S.row}>
                  <Text style={styles.devName}>{d.name}</Text>
                  <View style={styles.devDot} />
                </View>
                <Text style={styles.devMeta}>{d.model}</Text>
                <Text style={[styles.devMac, T.num]}>{d.id}</Text>
              </View>
              <IconChevron size={16} color={C.textHint} dir="right" />
            </LinearGradient>
          </ScalePress>
        ))
      )}

      <View style={{ height: 6 }} />
      <SectionTitle title={t.addDevice} />

      <Card>
        {scanning ? (
          <>
            <View style={styles.scanHeader}>
              <ScanRadar />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={S.row}>
                  <Text style={styles.scanText}>{t.scanningNew}</Text>
                  <ActivityIndicator size="small" color={C.primary} style={{ marginLeft: 8 }} />
                </View>
                <Text style={S.hint}>{t.scanningHint}</Text>
              </View>
            </View>

            {scanned.length > 0 && (
              <View style={styles.scanList}>
                {scanned.slice(0, 8).map((s, idx) => {
                  const boundName = boundNames[s.id];
                  const isNamed = !!s.name;
                  const label = boundName || (isNamed ? s.name : s.id);
                  const rssiStrong = s.rssi > -68;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.65}
                      style={[styles.scanRow, idx > 0 && styles.scanRowBorder]}
                      onPress={() => {
                        Clipboard.setString(s.id);
                        setMac(s.id);
                        if (!showManual) toggleManual();
                        Alert.alert(t.copiedMac, s.id);
                      }}>
                      <View style={[styles.dot, boundName && { backgroundColor: C.primary }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.scanName} numberOfLines={1}>{label}</Text>
                        {!boundName && isNamed && <Text style={styles.scanMac}>{s.id}</Text>}
                        {boundName && <Text style={styles.scanBadge}>{t.boundTag}</Text>}
                      </View>
                      <Text style={[styles.scanRssi, T.num, rssiStrong && { color: C.accent }]}>{s.rssi} dBm</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={[S.row, { gap: 10, marginTop: 14 }]}>
              <GhostButton title={t.stopScan} onPress={onStopScan} compact style={{ flex: 1 }} />
              <GhostButton title={showManual ? t.collapse : t.manualInput} onPress={toggleManual} compact style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <View style={{ gap: 10 }}>
            <PrimaryButton title={t.scanAndAdd} onPress={onAddDevice} />
            <GhostButton title={showManual ? t.collapse : t.manualMac} onPress={toggleManual} compact />
          </View>
        )}

        {showManual && (
          <View style={{ marginTop: 14 }}>
            <View style={S.divider} />
            <Text style={S.label}>{t.macLabel}</Text>
            <TextInput
              value={mac}
              onChangeText={setMac}
              placeholder="B0:82:AB:07:76:24"
              placeholderTextColor={C.textHint}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <Text style={[S.hint, { marginBottom: 12 }]}>{t.macHint}</Text>
            <PrimaryButton
              title={t.connectDirect}
              onPress={() => onManualConnect(mac.trim())}
              disabled={!mac.trim()}
              colors={G.accent}
              compact
            />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  warnIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: C.warnSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  warnTitle: { fontSize: 14, fontWeight: '700', color: C.warn },
  devCard: {
    flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: R.lg,
    borderWidth: 1, borderColor: C.borderStrong, ...SH.card,
  },
  devIconWrap: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: C.primarySoft,
    borderWidth: 1, borderColor: 'rgba(77,141,255,0.26)',
    alignItems: 'center', justifyContent: 'center',
  },
  devName: { fontSize: 16, fontWeight: '700', color: C.text },
  devDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginLeft: 8 },
  devMeta: { fontSize: 12, color: C.textSub, marginTop: 2 },
  devMac: { fontSize: 11, color: C.textHint, marginTop: 2, fontFamily: 'monospace' },
  scanHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  radarBox: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  radarRing: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: C.primary, backgroundColor: 'rgba(77,141,255,0.12)',
  },
  radarCore: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: C.primarySoft,
    borderWidth: 1, borderColor: 'rgba(77,141,255,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  scanText: { color: C.primary, fontSize: 14, fontWeight: '700' },
  scanList: {
    marginTop: 10, backgroundColor: C.bg, borderRadius: R.md,
    paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: C.border,
  },
  scanRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  scanRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginRight: 10 },
  scanName: { fontSize: 13, color: C.text, fontWeight: '600' },
  scanMac: { fontSize: 11, color: C.textHint, fontFamily: 'monospace', marginTop: 1 },
  scanBadge: { fontSize: 10, color: C.primary, fontWeight: '700', marginTop: 1 },
  scanRssi: { fontSize: 11, color: C.textHint, fontFamily: 'monospace', marginLeft: 8 },
  input: {
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.borderStrong, borderRadius: R.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text,
    marginTop: 6, marginBottom: 4, letterSpacing: 0.6, fontFamily: 'monospace',
  },
});
