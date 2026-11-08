import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import * as fs from "fs";

async function testSync() {
  console.log("🚀 Iniciando prueba de conexión con Google Sheets...");

  // Ruta absoluta detectada
  const credsPath =
    "c:/Users/Arismendy/OneDrive/Escritorio/TAD PLASTFORM/taxi-advertisig-c30861d203c5.json";
  const sheetId = "1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY";

  try {
    if (!fs.existsSync(credsPath)) {
      throw new Error(
        `No se encontró el archivo de credenciales en: ${credsPath}`,
      );
    }

    const creds = JSON.parse(fs.readFileSync(credsPath, "utf8"));

    const serviceAccountAuth = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    console.log(`✅ Conexión exitosa!`);
    console.log(`📊 Título del documento: ${doc.title}`);
    console.log(
      `📋 Hojas encontradas: ${Object.keys(doc.sheetsByTitle).join(", ")}`,
    );

    // Prueba rápida con la hoja de Pantallas
    const sheet = doc.sheetsByTitle["Pantallas"];
    if (sheet) {
      const rows = await sheet.getRows();
      console.log(`🔍 Hoja "Pantallas" tiene ${rows.length} filas.`);
    }
  } catch (e) {
    console.error("❌ Error en la prueba:", e.message);
  }
}

testSync();
