# AFU 体脂秤 App（跨平台）

在 Android / iOS / 桌面 上连接蚂蚁阿福沃莱 AFU-WL-TZ-A1 体脂秤，记录体重与体脂等身体成分数据，并同步到电脑。不依赖手机官方 App，三件事：连接秤、记录数据、同步到电脑。

## 技术栈
- Expo + React Native + TypeScript（一套代码跨平台）
- BLE：react-native-ble-plx 3.5.1
- 本地记录：expo-file-system（JSONL）
- 同步：HTTP POST 到电脑端 Python 接收服务

## 目录结构
```text
afu-scale-app/
├── App.tsx                  # 主界面：扫描/测量/同步/记录
├── app.json                 # Expo 配置
├── package.json
├── tsconfig.json
├── src/
│   ├── protocol/
│   │   ├── scale27.ts       # Scale27 包解析（从 Python 移植）
│   │   └── bodycomp.ts      # BIA 体脂估算公式（从 Python 移植）
│   ├── ble/
│   │   └── scaleBle.ts      # BLE 连接层（扫描/连接/写参数/收包）
│   ├── storage/
│   │   └── records.ts       # 本地 JSONL 记录
│   └── sync/
│       └── sync.ts          # HTTP 同步到电脑
└── server/
    └── server_receiver.py   # 电脑端接收服务（Python，无第三方依赖）
```

## 使用流程

### 1. 电脑端启动接收服务
```bash
cd server
python server_receiver.py --port 8765
```
默认监听 8765，数据落 server/received.jsonl。确认电脑与手机在同一局域网。

### 2. 启动 App
```bash
npm install
npx expo start
```
用 Expo Go 或 Android Studio 在真机上运行。

### 3. App 内操作
- 扫描：点「扫描」，确认发现 AFU-WL-TZ-A1（秤平时不广播，先轻踩唤醒）
- 测量：点「开始测量」，赤脚站上秤保持稳定，读到锁定后自动记录
- 同步：填入电脑局域网 IP（如 http://192.168.1.10:8765/records），点「同步到电脑」

## 关键实现
- 体重解析：BLE notify 包 bytes[10:13] 为 24 位大端整数，weight_kg = (val - 0x680000) / 1000（已验证）
- 体脂：本地 BIA 公式估算（segal 系列），非秤直发字段
- 同步去重：电脑端按记录的 time 字段去重，重复同步不产生脏数据

## 验证状态（2026-11-17）
- TS 类型检查通过
- 体重解析公式验证通过（awen 真实包 67.25kg）
- 电脑端接收服务联调通过（ping + POST + JSONL 落盘）
- 真机蓝牙联调待做：需在 Android 真机上运行 App，连接真实秤验证收包