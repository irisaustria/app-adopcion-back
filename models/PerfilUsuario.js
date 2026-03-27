const mongoose = require("mongoose");

const PerfilUsuarioSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    nombreCompleto: { type: String, default: "" },
    telefono: { type: String, default: "" },
    direccion: { type: String, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PerfilUsuario", PerfilUsuarioSchema);