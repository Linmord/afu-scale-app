import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { C, G, R, S, T } from './theme';
import { Card, PrimaryButton, GhostButton, SectionTitle, Badge } from './components';
import { startHistoryProbe, type ProbeEvent } from '../ble/historyProbe';
import type { BoundDevice } from '../storage/devices';

interface Props {
  device: BoundDevice;
  profile: { age: number; sex: 'male' | 'female'; height: number };
  syncUrl: string;
  onBack: () => void;
}

export function ProbePage({ device, profile, syncUrl, onBack }: Props) {
  const [state, setState] = useState<'idle' | 'running' | 'done'>('idle');
  const [stateDetail, setStateDetail] = useState('');
  const [events, setEvents] = useState<ProbeEvent[]>([]);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [autoUpload, setAutoUpload] = useState(true);
  const sessionRef = useRef<{ stop: () => void } | null>(null);
  const eventsRef = useRef<ProbeEvent[]>([]);
  const historyCount = events.filter((e) => e.type === 'history').length;

  const upload = async (list: ProbeEvent[]) => {
    if (list.length === 0) { setUploadMsg('无事件可上传'); return; }
    setUploading(true);
    setUploadMsg('上传中…');
    try {
      const base = syncUrl.replace(/\/records$/, '');
      const resp = await fetch(base + '/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'history-probe', events: list }),
      });
      const j = await resp.json().catch(() => ({}));
      setUploadMsg(resp.ok ? `已上传 ${j.received ?? list.length} 条事件到电脑` : 'HTTP ' + resp.status);
    } catch (e) {
      setUploadMsg('上传失败: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setUploading(false);
    }
  };

  const start = async () => {
    setEvents([]);
    eventsRef.current = [];
    setUploadMsg('');
    setState('running');
    setStateDetail('连接中…');
    await startHistoryProbe(
      device.id,
      { unit: 0, height: profile.height, age: profile.age, sex: profile.sex },
      (e) => {
        eventsRef.current = [...eventsRef.current, e];
        setEvents(eventsRef.current.slice(-200));
        if (e.type === 'state') setStateDetail(e.msg || e.type);
        // 自动上传：每收到 10 条推一次
        if (autoUpload && eventsRef.current.length % 10 === 0) {
          void upload(eventsRef.current);
        }
      },
      (s, d) => {
        if (s === 'listening') setStateDetail('监听中——请勿踩秤，观察历史包');
        else if (s === 'error') { setStateDetail('结束: ' + (d || '')); setState('done'); void upload(eventsRef.current); }
        else setStateDetail(d || s);
      },
      90000,
    );
  };

  const stop = () => {
    if (sessionRef.current) { sessionRef.current.stop(); sessionRef.current = null; }
    setState('done');
    void upload(eventsRef.current);
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator>
      <TouchableOpacity onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹ {device.name}</Text>
      </TouchableOpacity>

      <Card>
        <SectionTitle title="历史同步探测" right={<Badge text={state} color={state === 'running' ? C.primary : C.accent} />} />
        <Text style={S.hint}>
          连接秤并写入「时间+用户」命令，监听秤是否主动推送历史测量（216 包）。
          全部原始字节与解码事件会上传到电脑（server /debug）。
        </Text>
        <Text style={[S.hint, { color: C.warn, marginTop: 8 }]}>
          实验期间请勿踩秤。
        </Text>
        <Text style={[styles.stateText, { marginTop: 10 }]}>{stateDetail || '待机'}</Text>
        <View style={[S.row, { gap: 10, marginTop: 14 }]}>
          <PrimaryButton
            title={state === 'running' ? '探测中…' : '开始探测'}
            onPress={start}
            disabled={state === 'running'}
            style={{ flex: 1 }}
          />
          <GhostButton title="停止并上传" onPress={stop} style={{ flex: 1 }} />
        </View>
      </Card>

      <Card>
        <SectionTitle
          title={`事件流（${events.length}）· 历史包 ${historyCount}`}
          right={<TouchableOpacity onPress={() => void upload(eventsRef.current)}><Text style={{ color: C.primary, fontSize: 13, fontWeight: '600' }}>上传</Text></TouchableOpacity>}
        />
        {uploadMsg ? <Text style={styles.uploadMsg}>{uploadMsg}</Text> : null}
        <View style={styles.logBox}>
          {events.length === 0 ? (
            <Text style={S.hint}>（暂无事件）</Text>
          ) : (
            events.slice(-60).map((e, i) => {
              const time = new Date(e.ts).toLocaleTimeString('zh-CN');
              if (e.type === 'history' && e.history) {
                const h = e.history;
                const wt = new Date(h.time * 1000).toLocaleString('zh-CN');
                return (
                  <Text key={i} style={[styles.logLine, { color: C.accent }]}>
                    📦 历史#{h.history_type} {wt} {h.weight_kg ?? '?'}kg 阻抗{JSON.stringify(h.adcs)} 剩{h.remainHistoryCount ?? '-'}
                  </Text>
                );
              }
              if (e.type === 'state') return <Text key={i} style={[styles.logLine, { color: C.primary }]}>{time} {e.msg}</Text>;
              return <Text key={i} style={styles.logLine}>{time} RAW {e.hex?.slice(0, 40)}</Text>;
            })
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  back: { paddingVertical: 6, marginBottom: 6 },
  backText: { color: C.primary, fontSize: 15, fontWeight: '600' },
  stateText: { fontSize: 14, color: C.text },
  uploadMsg: { fontSize: 12, color: C.accent, marginBottom: 8 },
  logBox: {
    height: 300, backgroundColor: C.bg, borderRadius: R.sm, padding: 10,
    borderWidth: 1, borderColor: C.border,
  },
  logLine: { fontSize: 11, color: C.textSub, fontFamily: 'monospace', lineHeight: 16 },
});
