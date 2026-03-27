const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");

const Ubicacion = require("./models/Ubicacion");
const Perrito = require("./models/Perrito");
const MascotaPerdida = require("./models/MascotaPerdida");
const Solicitud = require("./models/Solicitud");
const PerfilUsuario = require("./models/PerfilUsuario");

const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_EMAIL = "iriscriswa@gmail.com";

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB conectado ✅"))
  .catch((err) => console.log("Error Mongo:", err));

// ─────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────

app.get("/", (req, res) => {
  res.send("Servidor OK 🚀");
});

// ─────────────────────────────────────────
// UBICACIONES
// ─────────────────────────────────────────

app.post("/api/ubicaciones", async (req, res) => {
  try {
    const { usuario, email, lat, lng } = req.body;
    const nuevo = await Ubicacion.create({ usuario, email, lat, lng });
    res.json({ ok: true, data: nuevo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Error al guardar ubicación" });
  }
});

// ─────────────────────────────────────────
// MASCOTAS EN ADOPCIÓN
// ─────────────────────────────────────────

// Obtener todas las mascotas
app.get("/api/perritos", async (req, res) => {
  try {
    const animales = await Perrito.find().sort({ adoptado: 1, createdAt: -1 });
    res.json(animales);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener animales" });
  }
});

// Obtener mascotas adoptadas por un usuario específico
app.get("/api/adopciones/:uid", async (req, res) => {
  try {
    const mascotas = await Perrito.find({
      adoptadoPor: req.params.uid,
      adoptado: true
    }).sort({ fechaAdopcion: -1 });

    res.json(mascotas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener adopciones" });
  }
});

// Obtener TODAS las adopciones (solo admin)
app.get("/api/adopciones", async (req, res) => {
  try {
    const { email } = req.query;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const mascotas = await Perrito.find({ adoptado: true }).sort({ fechaAdopcion: -1 });
    res.json(mascotas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener adopciones" });
  }
});

// Crear mascota (solo admin)
app.post("/api/perritos", upload.single("imagen"), async (req, res) => {
  try {
    const { email, nombre, edad, raza, descripcion, tipo, tiempoEspera } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Imagen requerida" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "mascotas" },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({ error: "Error subiendo imagen" });
        }

        try {
          const nueva = await Perrito.create({
            nombre,
            edad,
            raza,
            descripcion,
            tipo,
            tiempoEspera,
            imagen: result.secure_url,
            adoptado: false
          });

          res.json(nueva);
        } catch (dbError) {
          console.error("Mongo error:", dbError);
          res.status(500).json({ error: "Error guardando en base de datos" });
        }
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear mascota" });
  }
});

// Marcar como adoptado (admin manual)
app.put("/api/perritos/:id/adoptar", async (req, res) => {
  try {
    const { email, adoptadoPor, emailAdoptante, nombreAdoptante } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const mascota = await Perrito.findById(req.params.id);

    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    const actualizado = await Perrito.findByIdAndUpdate(
      req.params.id,
      {
        adoptado: true,
        adoptadoPor: adoptadoPor || null,
        emailAdoptante: emailAdoptante || null,
        nombreAdoptante: nombreAdoptante || null,
        fechaAdopcion: new Date()
      },
      { new: true }
    );

    res.json(actualizado);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al marcar adoptado" });
  }
});

// Admin: devolver mascota al refugio
app.patch("/api/perritos/:id/devolver", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const mascota = await Perrito.findByIdAndUpdate(
      req.params.id,
      {
        adoptado: false,
        adoptadoPor: null,
        emailAdoptante: null,
        nombreAdoptante: null,
        fechaAdopcion: null
      },
      { new: true }
    );

    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    res.json({
      ok: true,
      message: "Mascota devuelta al refugio ✅",
      mascota
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al devolver mascota al refugio" });
  }
});

// Editar mascota (solo admin)
app.put("/api/perritos/:id", async (req, res) => {
  try {
    const { email, ...data } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const actualizada = await Perrito.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

// Eliminar mascota (solo admin)
app.delete("/api/perritos/:id", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await Perrito.findByIdAndDelete(req.params.id);
    res.json({ message: "Mascota eliminada ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

// Seed de prueba
app.get("/api/seed-perritos", async (req, res) => {
  try {
    await Perrito.deleteMany({});
    await Perrito.insertMany([
      {
        nombre: "Kira",
        edad: "6 años",
        raza: "Golden",
        descripcion: "Cariñosa y paciente.",
        tiempoEspera: "3 meses",
        imagen: "https://images.unsplash.com/photo-1626736637845-53045bb9695b",
        tipo: "perro",
        adoptado: false
      },
      {
        nombre: "Michi",
        edad: "2 años",
        raza: "Persa",
        descripcion: "Tranquilo y elegante.",
        tiempoEspera: "1 año",
        imagen: "https://images.unsplash.com/photo-1573865526739-10659fec78a5",
        tipo: "gato",
        adoptado: false
      }
    ]);
    res.send("Animales insertados 🐶🐱");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al insertar");
  }
});

// ─────────────────────────────────────────
// MASCOTAS PERDIDAS
// ─────────────────────────────────────────

app.get("/api/perdidas", async (req, res) => {
  try {
    const lista = await MascotaPerdida.find().sort({ createdAt: -1 });
    res.json(lista);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener publicaciones" });
  }
});

app.post("/api/perdidas", upload.single("imagen"), async (req, res) => {
  try {
    const { nombre, tipo, raza, descripcion, zona, telefono, creadoPor, emailAutor } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Imagen requerida" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "perdidas" },
      async (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ error: "Error subiendo imagen" });
        }

        const nueva = await MascotaPerdida.create({
          nombre,
          tipo,
          raza,
          descripcion,
          zona,
          telefono,
          imagen: result.secure_url,
          creadoPor,
          emailAutor
        });

        res.json(nueva);
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear publicación" });
  }
});

app.put("/api/perdidas/:id", async (req, res) => {
  try {
    const { emailAutor, creadoPor, ...data } = req.body;
    const mascota = await MascotaPerdida.findById(req.params.id);

    if (!mascota) return res.status(404).json({ error: "No encontrada" });

    const esAdmin = emailAutor === ADMIN_EMAIL;
    const esDueno = mascota.creadoPor === creadoPor;

    if (!esAdmin && !esDueno) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const actualizada = await MascotaPerdida.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true }
    );

    res.json(actualizada);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar" });
  }
});

app.delete("/api/perdidas/:id", async (req, res) => {
  try {
    const { emailAutor, creadoPor } = req.body;
    const mascota = await MascotaPerdida.findById(req.params.id);

    if (!mascota) return res.status(404).json({ error: "No encontrada" });

    const esAdmin = emailAutor === ADMIN_EMAIL;
    const esDueno = mascota.creadoPor === creadoPor;

    if (!esAdmin && !esDueno) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await MascotaPerdida.findByIdAndDelete(req.params.id);
    res.json({ message: "Publicación eliminada ✅" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar" });
  }
});

app.patch("/api/perdidas/:id/encontrado", async (req, res) => {
  try {
    const { emailAutor, creadoPor } = req.body;
    const mascota = await MascotaPerdida.findById(req.params.id);

    if (!mascota) return res.status(404).json({ error: "No encontrada" });

    const esAdmin = emailAutor === ADMIN_EMAIL;
    const esDueno = mascota.creadoPor === creadoPor;

    if (!esAdmin && !esDueno) {
      return res.status(403).json({ error: "No autorizado" });
    }

    mascota.estado = "encontrado";
    await mascota.save();
    res.json(mascota);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar estado" });
  }
});

// ─────────────────────────────────────────
// SOLICITUDES DE ADOPCIÓN
// ─────────────────────────────────────────

// Usuario manda solicitud
app.post("/api/solicitudes", async (req, res) => {
  try {
    const {
      mascotaId,
      mascotaNombre,
      mascotaImagen,
      mascotaTipo,
      usuarioUid,
      usuarioEmail,
      usuarioNombre
    } = req.body;

    const mascota = await Perrito.findById(mascotaId);

    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    if (mascota.adoptado) {
      return res.status(400).json({ error: "Esta mascota ya fue adoptada" });
    }

    const existente = await Solicitud.findOne({
      mascotaId,
      usuarioUid,
      devolucionAprobada: { $ne: true },
      estado: { $in: ["pendiente", "aprobada"] }
    });

    if (existente) {
      return res.status(400).json({
        error: "Ya tienes una solicitud activa para esta mascota"
      });
    }

    const nueva = await Solicitud.create({
      mascotaId,
      mascotaNombre,
      mascotaImagen,
      mascotaTipo,
      usuarioUid,
      usuarioEmail,
      usuarioNombre
    });

    res.json(nueva);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear solicitud" });
  }
});

// Admin: obtener solicitudes pendientes no leídas
app.get("/api/solicitudes/pendientes", async (req, res) => {
  try {
    const { email } = req.query;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const pendientes = await Solicitud.find({
      estado: "pendiente",
      leido: false
    }).sort({ createdAt: -1 });

    res.json(pendientes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener pendientes" });
  }
});

// Admin: obtener todas las solicitudes
app.get("/api/solicitudes", async (req, res) => {
  try {
    const { email } = req.query;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const todas = await Solicitud.find().sort({ createdAt: -1 });
    res.json(todas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
});

// Usuario: ver sus propias solicitudes
app.get("/api/solicitudes/usuario/:uid", async (req, res) => {
  try {
    const solicitudes = await Solicitud.find({
      usuarioUid: req.params.uid
    }).sort({ createdAt: -1 });

    res.json(solicitudes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener solicitudes del usuario" });
  }
});

// Usuario: cancelar solicitud de adopción pendiente
app.patch("/api/solicitudes/:id/cancelar", async (req, res) => {
  try {
    const { uid } = req.body;

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (solicitud.usuarioUid !== uid) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (solicitud.estado !== "pendiente") {
      return res.status(400).json({ error: "Solo puedes cancelar solicitudes pendientes" });
    }

    await Solicitud.findByIdAndDelete(req.params.id);

    res.json({
      ok: true,
      message: "Solicitud cancelada correctamente ✅"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cancelar solicitud" });
  }
});

// Usuario: solicitar devolución de mascota
app.patch("/api/solicitudes/:id/solicitar-devolucion", async (req, res) => {
  try {
    const { uid } = req.body;

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (solicitud.usuarioUid !== uid) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (solicitud.estado !== "aprobada") {
      return res.status(400).json({ error: "Solo puedes devolver mascotas aprobadas" });
    }

    if (solicitud.devolucionSolicitada || solicitud.devolucionAprobada) {
      return res.status(400).json({ error: "La devolución ya fue solicitada" });
    }

    solicitud.devolucionSolicitada = true;
    solicitud.fechaSolicitudDevolucion = new Date();
    await solicitud.save();

    res.json({
      ok: true,
      message: "Solicitud de devolución enviada",
      solicitud
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al solicitar devolución" });
  }
});

// Usuario: cancelar solicitud de devolución
app.patch("/api/solicitudes/:id/cancelar-devolucion", async (req, res) => {
  try {
    const { uid } = req.body;

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    if (solicitud.usuarioUid !== uid) {
      return res.status(403).json({ error: "No autorizado" });
    }

    if (!solicitud.devolucionSolicitada) {
      return res.status(400).json({ error: "No hay devolución solicitada" });
    }

    if (solicitud.devolucionAprobada) {
      return res.status(400).json({ error: "La devolución ya fue aprobada" });
    }

    solicitud.devolucionSolicitada = false;
    solicitud.fechaSolicitudDevolucion = null;
    await solicitud.save();

    res.json({
      ok: true,
      message: "Solicitud de devolución cancelada ✅",
      solicitud
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al cancelar devolución" });
  }
});

// Admin: ver devoluciones solicitadas
app.get("/api/devoluciones", async (req, res) => {
  try {
    const { email } = req.query;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const devoluciones = await Solicitud.find({
      estado: "aprobada",
      devolucionSolicitada: true,
      devolucionAprobada: false
    }).sort({ fechaSolicitudDevolucion: -1 });

    res.json(devoluciones);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener devoluciones" });
  }
});

// Admin: ver perfil de un usuario + solicitudes + adopciones + datos extra
app.get("/api/admin/usuarios/:uid", async (req, res) => {
  try {
    const { email } = req.query;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const uid = req.params.uid;

    const solicitudes = await Solicitud.find({
      usuarioUid: uid
    }).sort({ createdAt: -1 });

    const adopciones = await Perrito.find({
      adoptadoPor: uid,
      adoptado: true
    }).sort({ fechaAdopcion: -1 });

    const perfilExtra = await PerfilUsuario.findOne({ uid });

    let perfilBase = {
      uid,
      nombre: "Usuario",
      email: "Sin correo"
    };

    if (solicitudes.length > 0) {
      perfilBase = {
        uid: solicitudes[0].usuarioUid,
        nombre: solicitudes[0].usuarioNombre || "Usuario",
        email: solicitudes[0].usuarioEmail || "Sin correo"
      };
    } else if (adopciones.length > 0) {
      perfilBase = {
        uid,
        nombre: adopciones[0].nombreAdoptante || "Usuario",
        email: adopciones[0].emailAdoptante || "Sin correo"
      };
    }

    res.json({
      perfil: {
        ...perfilBase,
        nombreCompleto: perfilExtra?.nombreCompleto || "",
        telefono: perfilExtra?.telefono || "",
        direccion: perfilExtra?.direccion || ""
      },
      solicitudes,
      adopciones
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener perfil del usuario" });
  }
});

// Crear o guardar perfil extendido
app.post("/api/admin/usuarios/:uid/perfil", async (req, res) => {
  try {
    const { email, nombreCompleto, telefono, direccion } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const perfil = await PerfilUsuario.findOneAndUpdate(
      { uid: req.params.uid },
      {
        uid: req.params.uid,
        nombreCompleto: nombreCompleto || "",
        telefono: telefono || "",
        direccion: direccion || ""
      },
      { new: true, upsert: true }
    );

    res.json(perfil);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar perfil extendido" });
  }
});

// Editar perfil extendido
app.put("/api/admin/usuarios/:uid/perfil", async (req, res) => {
  try {
    const { email, nombreCompleto, telefono, direccion } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const perfil = await PerfilUsuario.findOneAndUpdate(
      { uid: req.params.uid },
      {
        nombreCompleto: nombreCompleto || "",
        telefono: telefono || "",
        direccion: direccion || ""
      },
      { new: true, upsert: true }
    );

    res.json(perfil);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar perfil extendido" });
  }
});

// Eliminar perfil extendido
app.delete("/api/admin/usuarios/:uid/perfil", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await PerfilUsuario.findOneAndDelete({ uid: req.params.uid });
    res.json({ ok: true, message: "Perfil extendido eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar perfil extendido" });
  }
});

// Admin: aprobar solicitud
app.patch("/api/solicitudes/:id/aprobar", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    const mascota = await Perrito.findById(solicitud.mascotaId);

    if (!mascota) {
      return res.status(404).json({ error: "Mascota no encontrada" });
    }

    if (mascota.adoptado) {
      return res.status(400).json({ error: "Esta mascota ya fue adoptada" });
    }

    solicitud.estado = "aprobada";
    solicitud.leido = true;
    await solicitud.save();

    await Perrito.findByIdAndUpdate(solicitud.mascotaId, {
      adoptado: true,
      adoptadoPor: solicitud.usuarioUid,
      emailAdoptante: solicitud.usuarioEmail,
      nombreAdoptante: solicitud.usuarioNombre,
      fechaAdopcion: new Date()
    });

    await Solicitud.updateMany(
      {
        mascotaId: solicitud.mascotaId,
        _id: { $ne: solicitud._id },
        estado: "pendiente"
      },
      {
        estado: "rechazada",
        leido: true
      }
    );

    res.json(solicitud);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al aprobar solicitud" });
  }
});

// Admin: rechazar solicitud
app.patch("/api/solicitudes/:id/rechazar", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    solicitud.estado = "rechazada";
    solicitud.leido = true;
    await solicitud.save();

    res.json(solicitud);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al rechazar solicitud" });
  }
});

// Admin: aprobar devolución
app.patch("/api/solicitudes/:id/aprobar-devolucion", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    solicitud.devolucionAprobada = true;
    solicitud.leido = true;
    solicitud.fechaDevolucion = new Date();
    await solicitud.save();

    await Perrito.findByIdAndUpdate(solicitud.mascotaId, {
      adoptado: false,
      adoptadoPor: null,
      emailAdoptante: null,
      nombreAdoptante: null,
      fechaAdopcion: null
    });

    res.json({
      ok: true,
      message: "Mascota devuelta al refugio ✅",
      solicitud
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al aprobar devolución" });
  }
});

// Marcar como leída
app.patch("/api/solicitudes/:id/leido", async (req, res) => {
  try {
    const { email } = req.body;

    if (email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: "No autorizado" });
    }

    await Solicitud.findByIdAndUpdate(req.params.id, { leido: true });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al marcar leído" });
  }
});

app.listen(process.env.PORT || 5000, "0.0.0.0", () => {
  console.log("Servidor en puerto", process.env.PORT || 5000);
});