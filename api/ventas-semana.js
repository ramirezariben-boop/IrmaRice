import { Pool } from "pg";
import "dotenv/config";


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Precios (puedes reutilizar los mismos)
const PRECIOS = {
  arroz_rojo: 22,
  arroz_blanco: 22,
  frijoles: 22,
  spaghetti: 28,
};

export default async function handler(req, res) {
  try {
    // 🇲🇽 Fecha actual MX
    const ahoraMX = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "America/Mexico_City",
      })
    );

    // 📅 Inicio de semana (lunes)
    const inicioSemana = new Date(ahoraMX);
    const dia = inicioSemana.getDay(); // 0=domingo
    const diff = dia === 0 ? -6 : 1 - dia;
    inicioSemana.setDate(inicioSemana.getDate() + diff);
    inicioSemana.setHours(0, 0, 0, 0);

    // 📅 Fin de semana
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(finSemana.getDate() + 7);

    // 📊 Query
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
      [inicioSemana, finSemana]
    );

    const t = rows[0];

    // 💰 Totales
    const totales = {
      arroz_rojo: {
        cantidad: t.arroz_rojo,
        total: t.arroz_rojo * PRECIOS.arroz_rojo,
      },
      arroz_blanco: {
        cantidad: t.arroz_blanco,
        total: t.arroz_blanco * PRECIOS.arroz_blanco,
      },
      frijoles: {
        cantidad: t.frijoles,
        total: t.frijoles * PRECIOS.frijoles,
      },
      spaghetti: {
        cantidad: t.spaghetti,
        total: t.spaghetti * PRECIOS.spaghetti,
      },
    };

    const totalGeneral =
      totales.arroz_rojo.total +
      totales.arroz_blanco.total +
      totales.frijoles.total +
      totales.spaghetti.total;

    res.status(200).json({
      desde: inicioSemana,
      hasta: finSemana,
      productos: totales,
      totalGeneral,
    });
  } catch (error) {
    console.error("Error ventas semana:", error);
    res.status(500).json({ error: "Error al calcular ventas semanales" });
  }
}
