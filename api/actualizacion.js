import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,              // 🔑 CLAVE
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});


function formatearCantidad(cantidad, singular, plural) {
  const abs = Math.abs(cantidad);
  return abs === 1
    ? `1 ${singular}`
    : `${abs} ${plural}`;
}


export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const {
    arrozRojo = 0,
    arrozBlanco = 0,
    frijoles = 0,
    spaghetti = 0
  } = req.body;

  const todoCero =
    arrozRojo === 0 &&
    arrozBlanco === 0 &&
    frijoles === 0 &&
    spaghetti === 0;

  // 🛑 DEFENSA FINAL
  if (todoCero) {
    return res.status(200).json({ texto: "" });
  }

  // 🕒 Fecha MX
  const fechaMX = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Mexico_City"
    })
  );

  try {

// 🔁 IDEMPOTENCIA: evitar duplicados recientes
const duplicado = await pool.query(
  `
  SELECT 1
  FROM actualizaciones
  WHERE fecha > NOW() - INTERVAL '5 seconds'
    AND arroz_rojo = $1
    AND arroz_blanco = $2
    AND frijoles = $3
    AND spaghetti = $4
  LIMIT 1
  `,
  [arrozRojo, arrozBlanco, frijoles, spaghetti]
);

if (duplicado.rowCount > 0) {
  return res.status(200).json({ texto: "" });
}

    await pool.query(
      `
      INSERT INTO actualizaciones
      (fecha, arroz_rojo, arroz_blanco, frijoles, spaghetti)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [fechaMX, arrozRojo, arrozBlanco, frijoles, spaghetti]
    );

    const hayEntrega =
      arrozRojo > 0 ||
      arrozBlanco > 0 ||
      frijoles > 0 ||
      spaghetti > 0;

    const haySobrante =
      arrozRojo < 0 ||
      arrozBlanco < 0 ||
      frijoles < 0 ||
      spaghetti < 0;

    // 🟢 ENTREGA
    if (hayEntrega) {
      const partes = [];

      if (arrozBlanco > 0)
        partes.push(formatearCantidad(arrozBlanco, "blanco", "blancos"));
      if (arrozRojo > 0)
        partes.push(formatearCantidad(arrozRojo, "rojo", "rojos"));
      if (frijoles > 0)
        partes.push(formatearCantidad(frijoles, "frijol", "frijoles"));
      if (spaghetti > 0)
        partes.push(formatearCantidad(spaghetti, "spaghetti", "spaghettis"));

      return res.status(200).json({
        texto: `Entregué ${partes.join(", ")}`
      });
    }

    // 🟠 SOBRANTE
    if (haySobrante) {
      const partes = [];

      if (arrozBlanco < 0)
        partes.push(formatearCantidad(arrozBlanco, "blanco", "blancos"));
      if (arrozRojo < 0)
        partes.push(formatearCantidad(arrozRojo, "rojo", "rojos"));
      if (frijoles < 0)
        partes.push(formatearCantidad(frijoles, "frijol", "frijoles"));
      if (spaghetti < 0)
        partes.push(formatearCantidad(spaghetti, "spaghetti", "spaghettis"));

      return res.status(200).json({
        texto: `Sobró ${partes.join(", ")}`
      });
    }

    return res.status(200).json({ texto: "" });

  } catch (error) {
  console.error("🔥 ERROR REAL:", error);
  return res.status(500).json({
    error: "Error al guardar la actualización",
    detalle: error.message
  });
 }
}
