const mongoose = require("mongoose");

const SolicitudSchema = new mongoose.Schema(
  {
    mascotaId: { type: String, required: true },
    mascotaNombre: { type: String, required: true },
    mascotaImagen: { type: String, default: "" },
    mascotaTipo: { type: String, default: "" },

    usuarioUid: { type: String, required: true },
    usuarioEmail: { type: String, required: true },
    usuarioNombre: { type: String, default: "" },

    estado: {
      type: String,
      enum: ["pendiente", "aprobada", "rechazada"],
      default: "pendiente"
    },

    leido: {
      type: Boolean,
      default: false
    },

    devolucionSolicitada: {
      type: Boolean,
      default: false
    },

    devolucionAprobada: {
      type: Boolean,
      default: false
    },

    fechaSolicitudDevolucion: {
      type: Date,
      default: null
    },

    fechaDevolucion: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Solicitud", SolicitudSchema);