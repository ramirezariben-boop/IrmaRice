import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});


// 💲 Precios unitarios
const PRECIOS = {
  arroz_rojo: 22,
  arroz_blanco: 22,
  frijoles: 22,
  spaghetti: 28,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // 🕒 Fecha actual en horario México
  const ahoraMX = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Mexico_City",
    })
  );

  const inicioDia = new Date(ahoraMX);
  inicioDia.setHours(0, 0, 0, 0);

  const finDia = new Date(inicioDia);
  finDia.setDate(finDia.getDate() + 1);

  try {
    const { rows } = await pool.query(
      `
      SELECT
        COALESCE(SUM(arroz_rojo), 0)   AS arroz_rojo,
        COALESCE(SUM(arroz_blanco), 0) AS arroz_blanco,
        COALESCE(SUM(frijoles), 0)     AS frijoles,
        COALESCE(SUM(spaghetti), 0)    AS spaghetti
      FROM actualizaciones
      WHERE fecha >= $1 AND fecha < $2
      `,
      [inicioDia, finDia]
    );

    const t = rows[0];

    // 🧮 Cálculos
    const subtotales = {
      arroz_rojo: t.arroz_rojo * PRECIOS.arroz_rojo,
      arroz_blanco: t.arroz_blanco * PRECIOS.arroz_blanco,
      frijoles: t.frijoles * PRECIOS.frijoles,
      spaghetti: t.spaghetti * PRECIOS.spaghetti,
    };

    const total =
      subtotales.arroz_rojo +
      subtotales.arroz_blanco +
      subtotales.frijoles +
      subtotales.spaghetti;

    // 📄 Fecha legible (como antes)
    const fechaStr = ahoraMX.toLocaleString("es-MX");

    // 🧾 Construcción del ticket
    const lineas = [];

    lineas.push("CUENTA");
    lineas.push("--------------------------");
    lineas.push(fechaStr);
    lineas.push("");

    if (t.arroz_rojo !== 0)
      lineas.push(
        `Arroz rojo     x${String(t.arroz_rojo).padStart(2)}   $${subtotales.arroz_rojo.toFixed(2)}`
      );

    if (t.arroz_blanco !== 0)
      lineas.push(
        `Arroz blanco   x${String(t.arroz_blanco).padStart(2)}   $${subtotales.arroz_blanco.toFixed(2)}`
      );

    if (t.frijoles !== 0)
      lineas.push(
        `Frijoles       x${String(t.frijoles).padStart(2)}   $${subtotales.frijoles.toFixed(2)}`
      );

    if (t.spaghetti !== 0)
      lineas.push(
        `Spaghetti      x${String(t.spaghetti).padStart(2)}   $${subtotales.spaghetti.toFixed(2)}`
      );

    lineas.push("--------------------------");
    lineas.push(
      `TOTAL                $${total.toFixed(2)}`
    );

    const texto = lineas.join("\n");

    return res.status(200).json({ texto });

  } catch (error) {
    console.error("Error en /api/ticket:", error);
    return res.status(500).json({ error: "Error al generar el ticket" });
  }
}
