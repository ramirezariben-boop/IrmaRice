import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  prepareThreshold: 0,
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

function lineaProducto(nombre, cantidad, subtotal) {
  const colNombre = nombre.padEnd(12).slice(0, 12);
  const colCantidad = ("x " + cantidad).padStart(5);
  const colPrecio = ("$" + subtotal.toFixed(2)).padStart(8);

  return colNombre + colCantidad + colPrecio;
}


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
        lineaProducto("Arroz rojo", t.arroz_rojo, subtotales.arroz_rojo)
      );

    if (t.arroz_blanco !== 0)
      lineas.push(
        lineaProducto("Arroz blanco", t.arroz_blanco, subtotales.arroz_blanco)
      );

    if (t.frijoles !== 0)
      lineas.push(
        lineaProducto("Frijoles", t.frijoles, subtotales.frijoles)
      );

    if (t.spaghetti !== 0)
      lineas.push(
        lineaProducto("Spaghetti", t.spaghetti, subtotales.spaghetti)
      );

const ANCHO = 25; // 12 + 5 + 8

function lineaTotal(total) {
  const colNombre = "TOTAL".padEnd(12);
  const colCantidad = "".padEnd(4);
  const colPrecio = ("$" + total.toFixed(2)).padStart(8);

  return colNombre + colCantidad + colPrecio;
}

lineas.push("-".repeat(24));
lineas.push(lineaTotal(total));

    const texto = lineas.join("\n");

    return res.status(200).json({ texto });

} catch (error) {
  console.error("Error en /api/ticket:", error);
  return res.status(500).json({
    error: "Error al generar el ticket",
    detalle: error.message,
  });
}

}
