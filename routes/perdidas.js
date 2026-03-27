const express = require("express");
const router = express.Router();
const MascotaPerdida = require("../models/MascotaPerdida");

// CRUD para mascotas perdidas
router.post("/", async (req, res) => {
  try {
    const nueva = new MascotaPerdida(req.body);
    await nueva.save();
    res.json(nueva);
  } catch (error) {
    res.status(500).json({ error: "Error al crear publicación" });
  }
});

router.get("/", async (req, res) => {
  const lista = await MascotaPerdida.find().sort({ createdAt: -1 });
  res.json(lista);
});

router.put("/:id", async (req, res) => {
  const actualizada = await MascotaPerdida.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(actualizada);
});

router.delete("/:id", async (req, res) => {
  await MascotaPerdida.findByIdAndDelete(req.params.id);
  res.json({ mensaje: "Eliminado" });
});

router.patch("/:id/encontrado", async (req, res) => {
  const mascota = await MascotaPerdida.findByIdAndUpdate(
    req.params.id,
    { estado: "encontrado" },
    { new: true }
  );
  res.json(mascota);
});

module.exports = router;