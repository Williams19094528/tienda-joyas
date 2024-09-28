const express = require("express");
const { Pool } = require("pg");
const app = express();
const port = 3000;

// Configuración de la conexión a la base de datos
const pool = new Pool({
  user: "williamscamacaro",
  host: "localhost",
  database: "joyas",
  port: 5432,
});

// Middleware para registrar informes de cada consulta realizada
app.use((req, res, next) => {
  const { method, url, query } = req;
  const timestamp = new Date().toISOString();
  console.log(
    `[${timestamp}] Consulta recibida: Método - ${method}, URL - ${url}, Parámetros - ${JSON.stringify(
      query
    )}`
  );
  next();
});

// Ruta para obtener todas las joyas con estructura HATEOAS
app.get("/joyas", async (req, res) => {
  try {
    const { limits = 10, page = 1, order_by = "id_ASC" } = req.query;
    const [column, order] = order_by.split("_");
    const offset = (page - 1) * limits;

    const result = await pool.query(
      `SELECT * FROM inventario ORDER BY ${column} ${order} LIMIT $1 OFFSET $2`,
      [limits, offset]
    );

    const totalJoyas = await pool.query("SELECT COUNT(*) FROM inventario");
    res.json({
      totalJoyas: totalJoyas.rows[0].count,
      results: result.rows.map((joya) => ({
        name: joya.nombre,
        href: `/joyas/joya/${joya.id}`,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener las joyas" });
  }
});

// Ruta para filtrar joyas por precio, categoría y metal
app.get("/joyas/filtros", async (req, res) => {
  try {
    const { precio_min, precio_max, categoria, metal } = req.query;
    const filters = [];
    const values = [];

    if (precio_min) {
      filters.push("precio >= $" + (values.length + 1));
      values.push(precio_min);
    }
    if (precio_max) {
      filters.push("precio <= $" + (values.length + 1));
      values.push(precio_max);
    }
    if (categoria) {
      filters.push("categoria = $" + (values.length + 1));
      values.push(categoria);
    }
    if (metal) {
      filters.push("metal = $" + (values.length + 1));
      values.push(metal);
    }

    const query = `SELECT * FROM inventario ${
      filters.length > 0 ? "WHERE " + filters.join(" AND ") : ""
    }`;
    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al filtrar las joyas" });
  }
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
