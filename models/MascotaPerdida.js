const mongoose = require("mongoose");

const mascotaPerdidaSchema = new mongoose.Schema({
  nombre: String,
  tipo: String,
  raza: String,
  descripcion: String,
  zona: String,
  telefono: String,
  imagen: String,
  estado: {
    type: String,
    default: "perdido"
  },
  creadoPor: String, // user.uid
  emailAutor: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("MascotaPerdida", mascotaPerdidaSchema);