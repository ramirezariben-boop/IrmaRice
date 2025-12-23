import { Pool } from "pg";

console.log("🚀 Script de ventas semanales iniciado");

// 💲 Precios unitarios (los mismos que usas en el backend)
const PRECIOS = {
  arroz_rojo: 22,
  arroz_blanco: 22,
  frijoles: 22,
  spaghetti: 28,
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  prepareThreshold: 0,
  statement_timeout: 5000,
});


async function ventasSemana() {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(arroz_rojo), 0)    AS arroz_rojo,
      COALESCE(SUM(arroz_blanco), 0)  AS arroz_blanco,
      COALESCE(SUM(frijoles), 0)      AS frijoles,
      COALESCE(SUM(spaghetti), 0)     AS spaghetti
    FROM actualizaciones
    WHERE fecha >= NOW() - INTERVAL '7 days'
  `);

  const u = result.rows[0]; // unidades

  // 💰 Totales por producto
  const totales = {
    arroz_rojo: u.arroz_rojo * PRECIOS.arroz_rojo,
    arroz_blanco: u.arroz_blanco * PRECIOS.arroz_blanco,
    frijoles: u.frijoles * PRECIOS.frijoles,
    spaghetti: u.spaghetti * PRECIOS.spaghetti,
  };

  // 🧮 Total general en dinero
  const totalGeneral =
    totales.arroz_rojo +
    totales.arroz_blanco +
    totales.frijoles +
    totales.spaghetti;

  console.log("📦 Unidades vendidas (últimos 7 días):");
  console.table(u);

  console.log("💰 Total por producto ($):");
  console.table(totales);

  console.log("🧾 TOTAL GENERAL DE VENTAS ($):", totalGeneral.toFixed(2));

  await pool.end();
}

ventasSemana()
  .then(() => console.log("✅ Script terminado"))
  .catch(err => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
