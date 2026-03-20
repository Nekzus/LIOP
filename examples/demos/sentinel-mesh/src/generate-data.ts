import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, "..", "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const targetPath = path.join(dataDir, "telemetry_industrial.json");
const stream = fs.createWriteStream(targetPath);

console.log("🛠️ Generating 1,000,000 industrial medical records...");

stream.write("[\n");

const batchSize = 10000;
const totalRecords = 1000000;

for (let i = 0; i < totalRecords; i++) {
    const record = {
        id: `PATIENT-${Math.random().toString(36).substring(2, 15)}`,
        name: `User ${i}`,
        age: Math.floor(Math.random() * 80) + 18,
        condition: ["Healthy", "Hypertension", "Diabetes", "Asthma", "Heart Disease"][Math.floor(Math.random() * 5)],
        heartRate: Math.floor(Math.random() * 40) + 60,
        bloodPressure: `${Math.floor(Math.random() * 40) + 110}/${Math.floor(Math.random() * 30) + 70}`,
        riskScore: Math.random(),
        timestamp: new Date().toISOString()
    };

    const isLast = i === totalRecords - 1;
    stream.write(JSON.stringify(record) + (isLast ? "" : ",\n"));

    if (i % 100000 === 0) {
        console.log(`... ${i} records written`);
    }
}

stream.write("\n]");
stream.end();

stream.on("finish", () => {
    console.log(`✅ Finished! Dataset saved to ${targetPath}`);
});
