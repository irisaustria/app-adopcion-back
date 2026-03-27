const mongoose = require("mongoose");

const PerritoSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    edad: {
      type: String,
      required: true
    },
    raza: {
      type: String,
      required: true,
      trim: true
    },
    descripcion: {
      type: String,
      required: true
    },
    imagen: {
      type: String,
      required: true
    },
    tipo: {
      type: String,
      required: true,
      enum: ["perro", "gato"]
    },
    adoptado: {
      type: Boolean,
      default: false
    },
    tiempoEspera: {
      type: String,
      required: true
    },

    // ── Campos nuevos de adoptante ──
    adoptadoPor: {
      type: String,
      default: null   // uid de Firebase del usuario
    },
    emailAdoptante: {
      type: String,
      default: null
    },
    nombreAdoptante: {
      type: String,
      default: null
    },
    fechaAdopcion: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Perrito", PerritoSchema);