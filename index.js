const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(`${process.env.MONGO_URL}`, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// Modelos
const User = require("./models/user");
const Exercise = require("./models/exercise");

// Ruta raíz
app.get("/", (req, res) => {
  res.send("Exercise Tracker API");
});

// Crear usuario
app.post("/api/users", async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Obtener todos los usuarios
app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "username _id");
  res.json(users);
});

// Agregar ejercicio
app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: "Usuario no encontrado" });

    let date = req.body.date ? new Date(req.body.date) : new Date();
    if (isNaN(date.getTime())) return res.json({ error: "Fecha inválida" });

    const exercise = new Exercise({
      userId: user._id,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date.toDateString(),
    });

    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date,
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al agregar ejercicio" });
  }
});

// Obtener historial de ejercicios con filtros
app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const user = await User.findById(req.params._id);
    if (!user) return res.json({ error: "Usuario no encontrado" });

    let query = { userId: user._id };
    let { from, to, limit } = req.query;

    if (from) query.date = { $gte: new Date(from).toDateString() };
    if (to) query.date = { ...query.date, $lte: new Date(to).toDateString() };

    let exercises = Exercise.find(query).select("description duration date -_id");
    if (limit) exercises = exercises.limit(parseInt(limit));

    res.json({
      username: user.username,
      count: await Exercise.countDocuments(query),
      _id: user._id,
      log: await exercises,
    });
  } catch (err) {
    res.status(500).json({ error: "Error al obtener historial" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
