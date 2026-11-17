import { PermissionsAndroid, Platform, Alert, Linking } from 'react-native';

/**
 * Android 上 BLE 扫描所需的运行时权限。
 * - Android 12+ (API 31+)：BLUETOOTH_SCAN / BLUETOOTH_CONNECT（附近设备权限）
 * - Android 11 及以下：ACCESS_FINE_LOCATION 是扫描硬要求
 */
export async function ensureBlePermissions(): Promise<{ ok: boolean; denied: string[] }> {
  if (Platform.OS !== 'android') return { ok: true, denied: [] };

  const api = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  const list: string[] = api >= 31
    ? [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const result = await PermissionsAndroid.requestMultiple(list as never[]);
  const denied: string[] = [];
  for (const p of list) {
    const status = (result as Record<string, string>)[p];
    if (status !== PermissionsAndroid.RESULTS.GRANTED) denied.push(p);
  }
  return { ok: denied.length === 0, denied };
}

/** 权限被永久拒绝时，引导用户去系统设置 */
export function promptOpenSettings(denied: string[]): void {
  Alert.alert(
    '需要蓝牙权限',
    '扫描体脂秤需要「附近设备」和「位置信息」权限。请在系统设置中手动授予后返回。\n\n缺失：' +
      denied.map((d) => d.replace('android.permission.', '')).join('、'),
    [
      { text: '稍后', style: 'cancel' },
      { text: '去设置', onPress: () => { Linking.openSettings().catch(() => {}); } },
    ],
  );
}
