import { Pool } from "pg";

let pool;

if (!global._pgPool) {
  global._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

pool = global._pgPool;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const PRICES = {
      arrozRojo: 22,
      arrozBlanco: 22,
      frijoles: 22,
      spaghetti: 28,
    };

    const data = {
      arrozRojo: Number(req.body.arrozRojo || 0),
      arrozBlanco: Number(req.body.arrozBlanco || 0),
      frijoles: Number(req.body.frijoles || 0),
      spaghetti: Number(req.body.spaghetti || 0),
    };

    const subtotales = {
      arrozRojo: data.arrozRojo * PRICES.arrozRojo,
      arrozBlanco: data.arrozBlanco * PRICES.arrozBlanco,
      frijoles: data.frijoles * PRICES.frijoles,
      spaghetti: data.spaghetti * PRICES.spaghetti,
    };

    const total = Object.values(subtotales).reduce((a, b) => a + b, 0);

    const fecha = new Date();
    const fechaLocal = fecha.toLocaleString("es-MX");

    const money = n => `$${n.toFixed(2)}`;

    const texto =
`CUENTA
--------------------------
${fechaLocal}

Arroz rojo     x${data.arrozRojo.toString().padStart(2)}   ${money(subtotales.arrozRojo)}
Arroz blanco   x${data.arrozBlanco.toString().padStart(2)}   ${money(subtotales.arrozBlanco)}
Frijoles       x${data.frijoles.toString().padStart(2)}   ${money(subtotales.frijoles)}
Spaghetti      x${data.spaghetti.toString().padStart(2)}   ${money(subtotales.spaghetti)}
--------------------------
TOTAL                ${money(total)}`;

    await pool.query(
      `
      INSERT INTO registros
      (fecha, arroz_rojo, arroz_blanco, frijoles, spaghetti, total, texto)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        fecha,
        data.arrozRojo,
        data.arrozBlanco,
        data.frijoles,
        data.spaghetti,
        total,
        texto,
      ]
    );

    res.status(200).json({
      fecha: fecha.toISOString(),
      total,
      texto,
    });

  } catch (err) {
    console.error("Error en /api/registro:", err);
    res.status(500).json({ error: "Error al guardar el registro" });
  }
}
