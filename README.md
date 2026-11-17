# AFU 体脂秤

**AFU** 是一款本地优先（local-first）的蓝牙体脂秤应用，适配 **蚂蚁阿福沃莱 AFU-WL-TZ-A1**（ICOMON 制造）。它不依赖手机厂商 App，直接在 Android 上连接体脂秤、记录体重与身体成分、并与电脑双向同步。

- 应用名：**AFU**
- 版本：**0.1.1**
- 包名：**com.aiyue.afuscale**
- 平台：**Android**（Expo / React Native，iOS 与桌面可复用同一套代码）

---

## 功能

### 连接
- **免扫描直连**：绑定后保存设备 MAC，打开 App 直接 `connectToDevice`，秤一唤醒即可测量
- **间歇扫描**：未绑定或直连失败时自动扫描（5 秒扫 / 15 秒一轮），规避 Android 12+ 的常驻扫描 denylist
- **手动输入 MAC**：扫描不到时可直接填 MAC 连接
- **多设备**：支持绑定多台秤，每台可自定义命名
- **运行时权限**：首次启动请求 `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` / `ACCESS_FINE_LOCATION`，被拒时引导至系统设置

### 测量
- **持久会话**：连接后保持订阅不断开，连续上秤即测，无需重复操作
- **断线自动重连**（3 秒退避）
- **完整字段解析**：体重、多频阻抗 ADC、电极导通状态、算法类型
- **电极未导通提示**：阻抗为 0 时明确标注体脂不可用，不给虚假数值

### 记录
- 本地 JSONL 存储，每条记录带唯一 `id`
- **多人共用**：测量保存时选择分配单位（默认「小林」，可增删）
- 按单位 / 按日期筛选，勾选批量推送
- **全屏详情页**：15 项身体成分完整展示
- **体重趋势图**：纯 View 绘制的折线图（无图表库依赖），含目标线、区间变化、距目标差值

### 同步
- 手机 → 电脑：HTTP POST 推送已选记录
- 电脑 → 手机：HTTP GET 拉取远端记录并合并（按 `id` 去重）
- 推送地址可编辑并持久化
- **双向去重**：前端标记 `syncedAt` 禁止重复推送，服务端持久化去重键，重启也不重复
- 所有请求带 8 秒超时，UI 永不卡死

---

## 界面

深色主题，三页底部导航：

| 页 | 内容 |
|---|---|
| **设备** | 已绑定设备列表（名称/型号/MAC）、扫描添加、手动 MAC 输入、附近设备（无名显示 MAC，点击复制） |
| **数据** | 概览卡、体重趋势图、单位/日期筛选、记录列表（勾选推送、删除、点击看详情） |
| **设置** | 推送地址（可改可持久化）、测试连接、从电脑拉取、分配单位管理、设备解绑、调试日志（滚动+清空）、关于与开源致谢 |

图标为 AFU 几何艺术字 + 薄荷绿趋势曲线，蓝紫对角渐变。

---

## 技术栈

- **前端**：Expo SDK 54 · React Native 0.81 · TypeScript（strict）
- **蓝牙**：`react-native-ble-plx` 3.5.1
- **存储**：`expo-file-system`（JSONL）+ `@react-native-async-storage/async-storage`
- **UI**：`expo-linear-gradient`，趋势图为纯 `View` 绘制（旋转线段 + 绝对定位）
- **服务端**：Python 标准库 `http.server`，**零第三方依赖**

### 项目结构

```text
afu-scale-app/
├── App.tsx                      # 根组件：三页导航 + 状态编排
├── app.json                     # Expo 配置（名称/版本/包名/权限）
├── src/
│   ├── ble/
│   │   ├── scaleBle.ts          # BLE：直连 + 间歇扫描 + 持久测量会话
│   │   └── permissions.ts       # Android 运行时权限请求
│   ├── protocol/
│   │   ├── scale27.ts           # Scale27 包解析（位运算，无平台依赖）
│   │   └── bodycomp.ts          # BIA 身体成分公式（Segal / Deurenberg）
│   ├── storage/
│   │   ├── records.ts           # 记录读写、单位管理、远端合并
│   │   └── devices.ts           # 多设备绑定与命名
│   ├── sync/
│   │   └── sync.ts              # 推送 / 拉取 / 连通测试（全部带超时）
│   └── ui/
│       ├── theme.ts             # 设计系统（色板/圆角/阴影/字阶）
│       ├── components.tsx       # 按钮/卡片/徽章/抽屉等通用件
│       ├── TrendChart.tsx       # 体重趋势图
│       ├── ConnectPage.tsx      # 设备页
│       ├── DevicePage.tsx       # 设备详情与测量
│       ├── DataPage.tsx         # 数据页
│       └── SettingsPage.tsx     # 设置页
└── server/
    └── server_receiver.py       # 电脑端接收服务（GET 拉取 / POST 推送 / 去重）
```

---

## 快速开始

### 1. 电脑端接收服务

```powershell
cd server
python server_receiver.py --port 8765
# 可选：--out D:\path\received.jsonl
```

服务监听 `0.0.0.0:8765`，数据落 `received.jsonl`，按 `id` 持久化去重。

### 2. Android 构建

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# 产物：android/app/build/outputs/apk/release/app-release.apk
```

或直接使用仓库自带的 GitHub Actions（见下）。

### 3. 首次使用

1. 安装 APK，打开并**允许蓝牙权限**
2. 设备页 → 轻踩秤唤醒 → 扫描添加（或手动输入 MAC）
3. 站上秤（**赤脚踩满四个电极**）→ 读数锁定 → 保存并选择分配单位
4. 设置页填写电脑地址（如 `http://192.168.1.5:8765/records`）→ 测试连接
5. 数据页勾选记录 → 推送到电脑

---

## 蓝牙协议要点

设备广播名 `AFU-WL-TZ-A1`，GATT 结构：

| Service | Characteristic | 属性 |
|---|---|---|
| `0000ffb0-...` | `0000ffb1-...` | write without response |
| `0000ffb0-...` | `0000ffb2-...` | **notify（数据出口）** |

- **唤醒**：秤平时休眠不广播，需踩一下唤醒
- **触发测量**：写入用户参数 `[0x10, 0x00, sex, age, height]`
- **包结构**：20 字节，`data[2]` 为类型（`0x00` 实时 / `0x02` 锁定）
- **体重**：`data[10:13]` 24 位大端整数，`weight_kg = (val - 0x680000) / 1000`（`0x680000 = 6815744`）
- **阻抗**：`data[4:6]`、`data[6:8]` 等 16 位值；全 0 表示电极未导通
- **身体成分不在蓝牙包里**：体脂、肌肉、水分等由本地 BIA 公式（Segal 系列，按性别/身高/年龄/阻抗）估算；无阻抗时退化为 Deurenberg BMI 公式

---

## GitHub Actions

`.github/workflows/build-apk.yml` 在 push 与手动触发时构建 APK：
checkout → Node 20 → JDK 17 → `npm ci` → `expo prebuild` → `gradlew assembleRelease` → 上传 artifact（保留 30 天）。

---

## 数据与隐私

- 所有健康数据**只存本机**（手机 JSONL + 电脑局域网），不上传任何第三方
- 无遥测、无统计、无崩溃上报
- 服务端仅监听局域网，按 `id` 去重，重复推送安全
- 体重/体脂属敏感健康信息，请勿将 `received.jsonl` 公开

---

## 致谢

本项目蓝牙协议解析与身体成分算法参考并移植自以下开源工作（均为 MIT 或等效许可）：

- **[Mzdyl/ant-afu-welland-scale](https://github.com/Mzdyl/ant-afu-welland-scale)** — Scale27 协议解析与 BIA 公式（macOS 命令行工具）
- **[阿文 awen.me 逆向笔记](https://www.awen.me/post/bca6fedc.html)** — AFU-WL-TZ-A1 / ICOMON FG2508WB 蓝牙包结构与体重偏移验证
- **[lvxiangyu11/faa0-body-scale-protocol](https://github.com/lvxiangyu11/faa0-body-scale-protocol)** — Windows 侧 BLE 体脂秤接入教程
- **[kubulashvili/mi-fitness-mcp](https://github.com/kubulashvili/mi-fitness-mcp)** — 小米运动健康云端适配器上游

## 免责声明

本项目与小米、蚂蚁阿福、ICOMON 无关，接口为社区逆向成果，可能因固件改版而失效。仅用于读取和分析**您自己的**健康数据。体脂等数值为本地估算，不构成医疗建议。

## License

MIT
