import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 目标体重：按分配单位分别设置，持久化在本机。
 * 未设置时为 null —— UI 不显示目标线与「距目标」，避免来历不明的数字。
 */
const KEY = 'afu_goal_weights';

export type GoalMap = Record<string, number>;

export async function getGoals(): Promise<GoalMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GoalMap) : {};
  } catch { return {}; }
}

export async function setGoal(unit: string, kg: number | null): Promise<GoalMap> {
  const map = await getGoals();
  if (kg === null || !Number.isFinite(kg) || kg <= 0) {
    delete map[unit];
  } else {
    map[unit] = Math.round(kg * 10) / 10;
  }
  try { await AsyncStorage.setItem(KEY, JSON.stringify(map)); } catch {}
  return map;
}
