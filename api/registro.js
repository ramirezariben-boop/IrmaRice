export default async function handler(req, res) {
  return res.status(410).json({
    error: "Este endpoint está obsoleto. Usa /api/actualizacion y /api/ticket."
  });
}
