import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

  // 🕒 Fecha en horario México
  const fechaMX = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Mexico_City"
    })
  );

  try {
    await pool.query(
      `
      INSERT INTO actualizaciones
      (fecha, arroz_rojo, arroz_blanco, frijoles, spaghetti)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [fechaMX, arrozRojo, arrozBlanco, frijoles, spaghetti]
    );

    // 🧠 Detectar si hay alguna ENTREGA (valor positivo)
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

// 🟢 CASO 1: ENTREGA
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

// 🟠 CASO 2: SOBRANTE (solo negativos)
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

// ⚪ CASO 3: todo es 0
return res.status(200).json({ texto: "" });

  } catch (error) {
    console.error("Error en /api/actualizacion:", error);
    return res.status(500).json({ error: "Error al guardar la actualización" });
  }
}
