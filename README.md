# File-32 — MySQL Desktop Manager

Windows Desktop App สำหรับเชื่อมต่อและจัดการฐานข้อมูล MySQL  
สร้างด้วย Tauri 2 + React + TypeScript + Tailwind CSS v4

## Tech Stack

| ส่วน | ไลบรารี |
|---|---|
| Desktop shell | Tauri 2 |
| Backend | Rust + sqlx 0.8 (MySQL, chrono) |
| Password storage | keyring 3 (Windows Credential Manager) |
| Frontend | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v4 (@tailwindcss/vite) |
| UI Components | shadcn/ui (Radix UI primitives) |
| Routing | react-router-dom v6 (HashRouter) |

## ฟีเจอร์

- **Connection Manager** — กรอก host/port/user/password/database, ทดสอบก่อนเชื่อมต่อ, บันทึก profiles หลายชุด (รหัสผ่านเก็บใน Windows Credential Manager)
- **Sidebar** — แสดงรายชื่อตารางทั้งหมด พร้อม refresh
- **Table Viewer** — ดูข้อมูลแบบแบ่งหน้า (50 แถว/หน้า), ค้นหา, เรียงลำดับตามคอลัมน์
- **CRUD** — เพิ่ม/แก้ไข/ลบแถว ผ่าน Dialog พร้อม confirm ก่อนลบทุกครั้ง
- **SQL Editor** — รัน query อิสระ แสดงผลเป็นตาราง พร้อมเวลา execution
- **Dark/Light Mode** — ตาม system preference, สลับได้ด้วยปุ่มใน sidebar

## Prerequisites

### 1. ติดตั้ง Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. ติดตั้ง System dependencies

**Windows:**
```powershell
# ติดตั้ง Visual Studio C++ Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools
# หรือดาวน์โหลดจาก https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

**macOS (สำหรับ dev/test บน Mac):**
```bash
xcode-select --install
```

### 3. ติดตั้ง Node.js
ใช้ Node.js >= 18 (แนะนำ 20 LTS หรือ 22 LTS)

## การติดตั้งและรัน

```bash
# 1. เข้าไปที่ project directory
cd file-32

# 2. ติดตั้ง Node dependencies
npm install

# 3. สร้าง app icons (จำเป็นสำหรับ build)
npx tauri icon public/vite.svg

# 4. รัน development mode
npm run tauri dev
```

## Build สำหรับ Production (Windows)

ต้องรันบน Windows เท่านั้น (หรือใช้ GitHub Actions)

```bash
npm run tauri build
```

ไฟล์ installer จะอยู่ที่ `src-tauri/target/release/bundle/`

## โครงสร้างโปรเจกต์

```
file-32/
├── src-tauri/src/
│   ├── db/
│   │   ├── pool.rs        # Global connection pool (OnceLock)
│   │   ├── types.rs       # MySQL → JSON type conversion
│   │   └── validator.rs   # ตรวจ table/column ผ่าน information_schema
│   └── commands/
│       ├── connection.rs  # connect, test, profiles (keyring)
│       ├── schema.rs      # list_tables, get_columns
│       ├── table.rs       # fetch_rows (pagination, sort, search)
│       ├── crud.rs        # insert/update/delete (parameter binding)
│       └── sql_editor.rs  # execute arbitrary SQL
└── src/
    ├── components/
    │   ├── ui/            # shadcn/ui components
    │   ├── layout/        # AppShell, Sidebar
    │   ├── connection/    # ConnectionForm, ProfileList
    │   ├── table/         # DataTable, CrudDialog, ColumnHeader
    │   └── sql/           # SqlEditor
    ├── pages/             # ConnectionPage, TablePage, SqlEditorPage
    ├── lib/               # invoke.ts (typed wrappers), types.ts, utils.ts
    └── hooks/             # useDebounce, useConnection
```

## Security

- รหัสผ่านเก็บใน **Windows Credential Manager** ผ่าน `keyring` crate ไม่มี plain text ในไฟล์
- ชื่อตารางและคอลัมน์ **ตรวจสอบผ่าน `information_schema`** ก่อนใช้ใน query ป้องกัน SQL injection
- ค่าจากผู้ใช้ทุกตัวใช้ **parameter binding** (`.bind()`) เสมอ

## Build Optimizations (Cargo.toml)

```toml
[profile.release]
opt-level = "s"    # optimize for size
lto = true         # link-time optimization
codegen-units = 1  # better optimization
strip = true       # strip debug symbols
panic = "abort"    # smaller binary
```
