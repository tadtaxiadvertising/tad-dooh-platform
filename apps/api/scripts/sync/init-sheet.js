const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('../../taxi-advertisig-c30861d203c5.json');

const sheetId = '1x2PQInj1F5CJnotWVNkCuGEKqULeO9Vv7qkUvmtd-LY';

async function initHeaders() {
  const serviceAccountAuth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo(); 
  console.log(`Configuring Document: ${doc.title}`);

  // Tab 0: Ingresos
  const sIngresos = doc.sheetsByTitle['Ingresos'];
  if (sIngresos) {
      await sIngresos.setHeaderRow(['ID_PAGO', 'CHOFER', 'PLACA', 'MES', 'ANUNCIOS_PLAYBACK', 'ESTATUS_SISTEMA', 'TARIFA_UNITARIA', 'INGRESO_BRUTO', 'FEE_PLATAFORMA', 'TOTAL_PAGAR']);
      console.log('✅ Headers applied to Ingresos');
  }

  // Tab 1: Pagos
  const sPagos = doc.sheetsByTitle['Pagos'];
  if (sPagos) {
      await sPagos.setHeaderRow(['ID', 'FECHA', 'RECEPTOR', 'TIPO_RECEPTOR', 'MONTO', 'REFERENCIA', 'ESTATUS']);
      console.log('✅ Headers applied to Pagos');
  }

  // Tab 2: Marcas
  const sMarcas = doc.sheetsByTitle['Marcas'];
  if (sMarcas) {
      await sMarcas.setHeaderRow(['ID_MARCA', 'NOMBRE_COMERCIAL', 'CONTACTO', 'EMAIL', 'PRESUPUESTO_MENSUAL', 'LIMITE_PANTALLAS']);
      console.log('✅ Headers applied to Marcas');
  }

  // Tab 3: Pantallas
  const sPantallas = doc.sheetsByTitle['Pantallas'];
  if (sPantallas) {
      await sPantallas.setHeaderRow(['DEVICE_ID', 'PLACA_ASIGNADA', 'ESTATUS', 'ULTIMA_SEÑAL', 'BATERIA', 'STORAGE_FREE', 'APP_VERSION']);
      console.log('✅ Headers applied to Pantallas');
  }

  // Tab 4: Conductores
  const sConductores = doc.sheetsByTitle['Conductores ']; // Notice the space based on log
  if (sConductores) {
      await sConductores.setHeaderRow(['ID_CHOFER', 'NOMBRE_COMPLETO', 'TELEFONO', 'PLACA', 'LICENCIA', 'ESTATUS', 'SUSCRIPCION_PAGA']);
      console.log('✅ Headers applied to Conductores');
  }

  // Tab 5: Anunciantes
  const sAnunciantes = doc.sheetsByTitle['Anunciantes'];
  if (sAnunciantes) {
      await sAnunciantes.setHeaderRow(['ID_ANUNCIANTE', 'NOMBRE', 'RNC', 'TELEFONO', 'NIVEL_ACCESO', 'ESTATUS']);
      console.log('✅ Headers applied to Anunciantes');
  }
}

initHeaders().catch(console.error);
