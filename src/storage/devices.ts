import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 设备管理 v2：支持绑定多台秤，每台含名称、MAC、型号信息。
 */
export interface BoundDevice {
  id: string;          // MAC
  name: string;        // 用户自定义名（如「浴室的秤」）
  model: string;       // 型号（从 GATT device info 读到则填）
  boundAt: string;     // 绑定时间
}

const DEVICES_KEY = 'afu_bound_devices';

export async function getDevices(): Promise<BoundDevice[]> {
  try {
    const raw = await AsyncStorage.getItem(DEVICES_KEY);
    return raw ? (JSON.parse(raw) as BoundDevice[]) : [];
  } catch { return []; }
}

export async function saveDevices(list: BoundDevice[]): Promise<void> {
  try { await AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(list)); } catch {}
}

export async function addDevice(dev: { id: string; name?: string; model?: string }): Promise<BoundDevice[]> {
  const list = await getDevices();
  if (!list.find((d) => d.id === dev.id)) {
    list.push({
      id: dev.id,
      name: dev.name || `秤 ${list.length + 1}`,
      model: dev.model || 'AFU-WL-TZ-A1',
      boundAt: new Date().toISOString().slice(0, 10),
    });
  }
  await saveDevices(list);
  return list;
}

export async function removeDevice(id: string): Promise<BoundDevice[]> {
  let list = await getDevices();
  list = list.filter((d) => d.id !== id);
  await saveDevices(list);
  return list;
}

export async function renameDevice(id: string, name: string): Promise<BoundDevice[]> {
  const list = await getDevices();
  const d = list.find((x) => x.id === id);
  if (d) d.name = name;
  await saveDevices(list);
  return list;
}
