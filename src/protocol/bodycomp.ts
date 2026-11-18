/**
 * BIA 体脂/身体成分估算 —— 从 Python afu_welland_scale/bodycomp.py 移植。
 * 纯数学，无平台依赖。结果为本地估算，非秤蓝牙直发。
 */

export interface BodyComposition {
  model: string;
  body_fat_percent: number;
  fat_mass_kg: number;
  fat_free_mass_kg: number;
  muscle_percent: number;
  muscle_mass_kg: number;
  water_percent: number;
  water_mass_kg: number;
  protein_percent: number;
  protein_mass_kg: number;
  bone_percent: number;
  bone_mass_kg: number;
  skeletal_muscle_percent: number;
  skeletal_muscle_mass_kg: number;
  subcutaneous_fat_percent: number;
  subcutaneous_fat_mass_kg: number;
  resistance_ohm: number | null;
}

function isMale(sex: string): boolean {
  return ['male', 'm', 'man', '男', '1'].includes(sex.trim().toLowerCase());
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function pctMass(weightKg: number, percent: number): number {
  return weightKg * percent / 100.0;
}

function asFloat(v: unknown, def?: number): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function asInt(v: unknown, def?: number): number | undefined {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) ? n : def;
}

/** 从阻抗数组得到用于 BIA 的单一电阻抗值。
   *  实测逆向（蚂蚁体脂秤）：锁定包给的两个 ADC 值需合成 (a+b)×0.675 才是蚂蚁 BIA 用的欧姆值。
   *  例 [403,364]→517Ω→女性体脂37.8%，与蚂蚁屏幕完全一致。 */
function firstResistance(impendences: number[] | null | undefined): number | null {
  if (!impendences || impendences.length === 0) return null;
  const valid = impendences.filter((v) => typeof v === 'number' && v > 0 && Number.isFinite(v));
  if (valid.length === 0) return null;
  if (valid.length >= 2) return Math.round((valid[0] + valid[1]) * 0.675 * 100) / 100;
  return valid[0] >= 100 && valid[0] <= 1500 ? valid[0] : null;
}

function segalFfm(weight: number, height: number, age: number, sex: string, res: number): { ffm: number; model: string } {
  const h2 = height * height;
  if (isMale(sex)) {
    let ffm = 9.33285 + 0.00066360 * h2 - 0.02117 * res + 0.62854 * weight - 0.12380 * age;
    let bfp = 100.0 * (weight - ffm) / weight;
    if (bfp < 20.0) return { ffm, model: 'segal_3a_male_lt20' };
    ffm = 14.52435 + 0.00088580 * h2 - 0.02999 * res + 0.42688 * weight - 0.07002 * age;
    return { ffm, model: 'segal_3b_male_ge20' };
  }
  let ffm = 10.43485 + 0.00064602 * h2 - 0.01397 * res + 0.42087 * weight;
  let bfp = 100.0 * (weight - ffm) / weight;
  if (bfp < 30.0) return { ffm, model: 'segal_3c_female_lt30' };
  ffm = 9.37938 + 0.00091186 * h2 - 0.01466 * res + 0.29990 * weight - 0.07012 * age;
  return { ffm, model: 'segal_3d_female_ge30' };
}

export function estimateBodyComposition(
  weightKg: unknown,
  heightCm: unknown,
  age: unknown,
  sex: unknown,
  impendences: number[] | null | undefined = null,
): BodyComposition | null {
  const weight = asFloat(weightKg);
  const height = asFloat(heightCm);
  const ageInt = asInt(age);
  if (weight === undefined || height === undefined || ageInt === undefined || weight <= 0 || height <= 0) {
    return null;
  }
  const sexStr = String(sex);
  const res = firstResistance(impendences);

  let baseBfp: number;
  let model: string;
  let ffm: number;
  const bmi = weight / ((height / 100.0) ** 2);
  const male = isMale(sexStr);

  if (male) {
    // 男性：Deurenberg 日本版系数 1.10（蚂蚁实测 79.8kg/168/24 -> 25.4%）
    baseBfp = 1.10 * bmi + 0.23 * ageInt - 11.22;
    ffm = weight * (1.0 - baseBfp / 100.0);
    model = 'deurenberg_jp_male';
  } else if (res !== null && res >= 100 && res <= 1500) {
    // 女性：Segal + 合成阻抗 (i1+i2)*0.675（蚂蚁实测命中 37.7%）
    const r = segalFfm(weight, height, ageInt, sexStr, res);
    ffm = clamp(r.ffm, weight * 0.35, weight * 0.97);
    model = r.model;
    baseBfp = 100.0 * (weight - ffm) / weight;
  } else {
    baseBfp = 1.10 * bmi + 0.23 * ageInt - 5.4;
    ffm = weight * (1.0 - baseBfp / 100.0);
    model = 'deurenberg_jp_female';
  }
  const bodyFatPercent = clamp(baseBfp, isMale(sexStr) ? 3.0 : 8.0, 60.0);
  const fatMass = pctMass(weight, bodyFatPercent);
  const fatFreeMass = weight - fatMass;
  const bonePercent = isMale(sexStr) ? 4.5 : 4.0;
  const musclePercent = clamp(100.0 - bodyFatPercent - bonePercent, 20.0, 95.0);
  const leanPercent = 100.0 - bodyFatPercent;
  // 派生指标按蚂蚁实测分性别校准
  const waterCoef = male ? 0.7185 : 0.8475;
  const waterPercent = clamp(leanPercent * waterCoef, 25.0, 80.0);
  const skeletalCoef = male ? 0.548 : 0.651;
  const skeletalPercent = clamp(musclePercent * skeletalCoef, 10.0, 70.0);
  const subcutaneousCoef = male ? 0.7165 : 0.72;
  const subcutaneousPercent = clamp(bodyFatPercent * subcutaneousCoef, 1.0, bodyFatPercent);
  // 蛋白质量：女性≈体重×5%，男性≈体重×16.3%（蚂蚁实测）
  const proteinMassKg = weight * (male ? 0.163 : 0.05);
  const proteinPercent = Math.round((proteinMassKg / weight) * 1000) / 10;
  return {
    model,
    resistance_ohm: res !== null ? Math.round(res * 100) / 100 : null,
    body_fat_percent: Math.round(bodyFatPercent * 10) / 10,
    fat_mass_kg: Math.round(fatMass * 10) / 10,
    fat_free_mass_kg: Math.round(fatFreeMass * 10) / 10,
    muscle_percent: Math.round(musclePercent * 10) / 10,
    muscle_mass_kg: Math.round(pctMass(weight, musclePercent) * 10) / 10,
    water_percent: Math.round(waterPercent * 10) / 10,
    water_mass_kg: Math.round(pctMass(weight, waterPercent) * 10) / 10,
    protein_percent: Math.round(proteinPercent * 10) / 10,
    protein_mass_kg: Math.round(proteinMassKg * 10) / 10,
    bone_percent: Math.round(bonePercent * 10) / 10,
    bone_mass_kg: Math.round(pctMass(weight, bonePercent) * 10) / 10,
    skeletal_muscle_percent: Math.round(skeletalPercent * 10) / 10,
    skeletal_muscle_mass_kg: Math.round(pctMass(weight, skeletalPercent) * 10) / 10,
    subcutaneous_fat_percent: Math.round(subcutaneousPercent * 10) / 10,
    subcutaneous_fat_mass_kg: Math.round(pctMass(weight, subcutaneousPercent) * 10) / 10,
  };
}
