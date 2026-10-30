// build โปรแกรมแบบเซ็นไฟล์ แล้วเตรียมไฟล์อัปเดตไว้ในโฟลเดอร์ release/<version>/ พร้อมอัปโหลดขึ้น server
// ใช้: npm run release -- "รายละเอียดการเปลี่ยนแปลง"
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const UPDATE_BASE_URL = "https://jvsk.go.th/api/v1/download/";
// ต้องตรงกับ plugins.updater.endpoints ใน src-tauri/tauri.conf.json
const LATEST_JSON = "SRPH-Link-latest.json";

const root = join(import.meta.dirname, "..");
const { version, productName } = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
const notes = process.argv.slice(2).join(" ") || `${productName} ${version}`;

const env = { ...process.env };
env.TAURI_SIGNING_PRIVATE_KEY ??= join(homedir(), ".tauri", "nexlink.key");
env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ??= "";
if (!process.env.TAURI_SIGNING_PRIVATE_KEY && !existsSync(env.TAURI_SIGNING_PRIVATE_KEY)) {
  console.error(`ไม่พบกุญแจเซ็นไฟล์ที่ ${env.TAURI_SIGNING_PRIVATE_KEY}`);
  process.exit(1);
}

const build = spawnSync("npm run tauri build", { cwd: root, env, stdio: "inherit", shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

const bundled = `${productName}_${version}_x64-setup.exe`;
// ชื่อไฟล์ที่อัปโหลด: แทนช่องว่างด้วย - เพื่อให้ใช้ใน URL ได้ปลอดภัย
const installer = bundled.replace(/\s+/g, "-");
const bundleDir = join(root, "src-tauri/target/release/bundle/nsis");
const sigPath = join(bundleDir, `${bundled}.sig`);
if (!existsSync(sigPath)) {
  console.error(`ไม่พบไฟล์ลายเซ็น ${sigPath}`);
  process.exit(1);
}

const outDir = join(root, "release", version);
mkdirSync(outDir, { recursive: true });
copyFileSync(join(bundleDir, bundled), join(outDir, installer));
copyFileSync(sigPath, join(outDir, `${installer}.sig`));

const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      signature: readFileSync(sigPath, "utf8").trim(),
      url: UPDATE_BASE_URL + installer,
    },
  },
};
writeFileSync(join(outDir, LATEST_JSON), JSON.stringify(latest, null, 2) + "\n");

console.log(`\nพร้อมอัปโหลด: ${outDir}`);
console.log(`  - ${installer}\n  - ${installer}.sig\n  - ${LATEST_JSON}`);
console.log(`อัปโหลดทั้ง 3 ไฟล์ไปที่ ${UPDATE_BASE_URL}`);
