const express = require("express");

const {
    iniciarBaseDatos,
    obtenerCategorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    obtenerProductos,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    crearUsuario,
    obtenerUsuarioPorEmail,
    obtenerUsuarioPorId,
    existeUsuarioConEmail,
    verificarContrasena,
    crearCliente,
    obtenerClientePorUsuario,
    crearSesion,
    eliminarSesion,
    obtenerSesion,
    obtenerClientes,
    actualizarCliente,
    crearPedido,
    obtenerPedidos,
    obtenerPedidoPorId,
    actualizarEstadoPedido,
    obtenerProveedores,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    obtenerIngredientes,
    crearIngrediente,
    actualizarIngrediente,
    eliminarIngrediente,
    actualizarInventario,
    obtenerEstadisticas
} = require("./database");

const app = express();

const PORT = 3000;


// ==========================================
// CONFIGURACIÓN
// ==========================================

app.use(express.json());

app.use(express.static("public"));


// ==========================================
// PÁGINA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {

    res.sendFile(__dirname + "/public/index.html");

});


// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================================

function obtenerToken(req) {

    const autorizacion = req.headers.authorization || "";

    const [tipo, token] = autorizacion.split(" ");

    if (tipo === "Bearer" && token) {

        return token;

    }

    return null;

}


function autenticado(req, res, next) {

    const token = obtenerToken(req);

    const sesion = token ? obtenerSesion(token) : null;

    if (!sesion) {

        return res.status(401).json({
            mensaje: "No has iniciado sesión o la sesión expiró"
        });

    }

    req.usuario = sesion;

    next();

}


function soyAdministrador(req, res, next) {

    if (req.usuario.rol !== "administrador") {

        return res.status(403).json({
            mensaje: "No tienes permisos para realizar esta acción"
        });

    }

    next();

}


// ==========================================
// AUTENTICACIÓN
// ==========================================

app.post("/api/auth/registro", (req, res) => {

    try {

        const {
            nombre,
            email,
            contrasena,
            telefono,
            direccion
        } = req.body;

        if (!nombre || !email || !contrasena) {

            return res.status(400).json({
                mensaje: "Nombre, correo y contraseña son obligatorios"
            });

        }

        if (contrasena.length < 6) {

            return res.status(400).json({
                mensaje: "La contraseña debe tener al menos 6 caracteres"
            });

        }

        if (existeUsuarioConEmail(email)) {

            return res.status(409).json({
                mensaje: "Ya existe una cuenta con este correo"
            });

        }

        const id_usuario = crearUsuario(nombre, email, contrasena, "cliente");

        const id_cliente = crearCliente(id_usuario, telefono, direccion);

        const token = crearSesion(id_usuario);

        const cliente = obtenerClientePorUsuario(id_usuario);

        res.status(201).json({
            mensaje: "Cuenta creada correctamente",
            token,
            usuario: {
                id_usuario,
                id_cliente,
                nombre,
                email,
                rol: "cliente",
                telefono: cliente.telefono,
                direccion: cliente.direccion
            }
        });

    } catch (error) {

        console.error("Error al registrar:", error);

        res.status(500).json({
            mensaje: "Error al registrar la cuenta",
            error: error.message
        });

    }

});


app.post("/api/auth/login", (req, res) => {

    try {

        const { email, contrasena } = req.body;

        if (!email || !contrasena) {

            return res.status(400).json({
                mensaje: "Correo y contraseña son obligatorios"
            });

        }

        const usuario = obtenerUsuarioPorEmail(email);

        if (!usuario || !verificarContrasena(contrasena, usuario.contrasena_hash)) {

            return res.status(401).json({
                mensaje: "Correo o contraseña incorrectos"
            });

        }

        const token = crearSesion(usuario.id_usuario);

        const cliente = obtenerClientePorUsuario(usuario.id_usuario);

        res.json({
            mensaje: "Sesión iniciada correctamente",
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                id_cliente: cliente ? cliente.id_cliente : null,
                nombre: usuario.nombre,
                email: usuario.email,
                rol: usuario.rol,
                telefono: cliente ? cliente.telefono : "",
                direccion: cliente ? cliente.direccion : ""
            }
        });

    } catch (error) {

        console.error("Error al iniciar sesión:", error);

        res.status(500).json({
            mensaje: "Error al iniciar sesión",
            error: error.message
        });

    }

});


app.post("/api/auth/logout", autenticado, (req, res) => {

    const token = obtenerToken(req);

    eliminarSesion(token);

    res.json({
        mensaje: "Sesión cerrada correctamente"
    });

});


app.get("/api/auth/perfil", autenticado, (req, res) => {

    res.json({
        usuario: {
            id_usuario: req.usuario.id_usuario,
            id_cliente: req.usuario.id_cliente || null,
            nombre: req.usuario.nombre,
            email: req.usuario.email,
            rol: req.usuario.rol
        }
    });

});


app.put("/api/auth/perfil", autenticado, (req, res) => {

    try {

        const { nombre, telefono, direccion } = req.body;

        if (req.usuario.id_cliente) {

            const cliente = obtenerClientePorUsuario(req.usuario.id_usuario);

            if (cliente) {

                actualizarCliente(cliente.id_cliente, { telefono, direccion });

            }

        }

        res.json({
            mensaje: "Perfil actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar perfil:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el perfil",
            error: error.message
        });

    }

});


// ==========================================
// CATEGORÍAS (público)
// ==========================================

app.get("/api/categorias", (req, res) => {

    try {

        res.json(obtenerCategorias());

    } catch (error) {

        console.error("Error al obtener categorías:", error);

        res.status(500).json({
            mensaje: "Error al obtener las categorías",
            error: error.message
        });

    }

});


// ==========================================
// PRODUCTOS (público)
// ==========================================

app.get("/api/productos", (req, res) => {

    try {

        res.json(obtenerProductos());

    } catch (error) {

        console.error("Error al obtener productos:", error);

        res.status(500).json({
            mensaje: "Error al obtener los productos",
            error: error.message
        });

    }

});


app.get("/api/productos/:id", (req, res) => {

    try {

        const producto = obtenerProductoPorId(Number(req.params.id));

        if (!producto) {

            return res.status(404).json({
                mensaje: "Producto no encontrado"
            });

        }

        res.json(producto);

    } catch (error) {

        console.error("Error al obtener el producto:", error);

        res.status(500).json({
            mensaje: "Error al obtener el producto",
            error: error.message
        });

    }

});


// ==========================================
// PEDIDOS (cliente)
// ==========================================

app.post("/api/pedidos", autenticado, (req, res) => {

    try {

        if (!req.usuario.id_cliente) {

            return res.status(403).json({
                mensaje: "Solo los clientes pueden realizar pedidos"
            });

        }

        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {

            return res.status(400).json({
                mensaje: "El pedido debe incluir al menos un producto"
            });

        }

        const itemsValidos = items.map(item => ({
            id_producto: Number(item.id_producto),
            cantidad: Number(item.cantidad) || 1
        })).filter(item =>
            Number.isInteger(item.id_producto) &&
            Number.isInteger(item.cantidad) &&
            item.cantidad > 0
        );

        if (itemsValidos.length === 0) {

            return res.status(400).json({
                mensaje: "El pedido no tiene productos válidos"
            });

        }

        const id_pedido = crearPedido(req.usuario.id_cliente, itemsValidos);

        res.status(201).json({
            mensaje: "Pedido realizado correctamente",
            id_pedido
        });

    } catch (error) {

        console.error("Error al crear pedido:", error);

        res.status(500).json({
            mensaje: "Error al realizar el pedido",
            error: error.message
        });

    }

});


app.get("/api/pedidos", autenticado, (req, res) => {

    try {

        if (req.usuario.rol === "administrador") {

            return res.json(obtenerPedidos());

        }

        if (!req.usuario.id_cliente) {

            return res.status(403).json({
                mensaje: "No tienes pedidos registrados"
            });

        }

        res.json(obtenerPedidos(req.usuario.id_cliente));

    } catch (error) {

        console.error("Error al obtener pedidos:", error);

        res.status(500).json({
            mensaje: "Error al obtener los pedidos",
            error: error.message
        });

    }

});


app.get("/api/pedidos/:id", autenticado, (req, res) => {

    try {

        const pedido = obtenerPedidoPorId(Number(req.params.id));

        if (!pedido) {

            return res.status(404).json({
                mensaje: "Pedido no encontrado"
            });

        }

        if (req.usuario.rol !== "administrador" && pedido.id_cliente !== req.usuario.id_cliente) {

            return res.status(403).json({
                mensaje: "No puedes consultar este pedido"
            });

        }

        res.json(pedido);

    } catch (error) {

        console.error("Error al obtener el pedido:", error);

        res.status(500).json({
            mensaje: "Error al obtener el pedido",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - CATEGORÍAS
// ==========================================

app.post("/api/admin/categorias", autenticado, soyAdministrador, (req, res) => {

    try {

        const { nombre, descripcion } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre de la categoría es obligatorio"
            });

        }

        crearCategoria(nombre, descripcion);

        res.status(201).json({
            mensaje: "Categoría creada correctamente"
        });

    } catch (error) {

        console.error("Error al crear categoría:", error);

        res.status(500).json({
            mensaje: "Error al crear la categoría",
            error: error.message
        });

    }

});


app.put("/api/admin/categorias/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        const { nombre, descripcion } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre de la categoría es obligatorio"
            });

        }

        actualizarCategoria(Number(req.params.id), nombre, descripcion);

        res.json({
            mensaje: "Categoría actualizada correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar categoría:", error);

        res.status(500).json({
            mensaje: "Error al actualizar la categoría",
            error: error.message
        });

    }

});


app.delete("/api/admin/categorias/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        eliminarCategoria(Number(req.params.id));

        res.json({
            mensaje: "Categoría eliminada correctamente"
        });

    } catch (error) {

        console.error("Error al eliminar categoría:", error);

        res.status(500).json({
            mensaje: "Error al eliminar la categoría",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - PRODUCTOS
// ==========================================

app.post("/api/admin/productos", autenticado, soyAdministrador, (req, res) => {

    try {

        const {
            id_categoria,
            nombre,
            descripcion,
            precio,
            disponibilidad,
            imagen
        } = req.body;

        if (!id_categoria || !nombre || precio === undefined) {

            return res.status(400).json({
                mensaje: "Categoría, nombre y precio son obligatorios"
            });

        }

        crearProducto({

            id_categoria: Number(id_categoria),

            nombre,

            descripcion,

            precio: Number(precio),

            disponibilidad: disponibilidad ? 1 : 0,

            imagen

        });

        res.status(201).json({
            mensaje: "Producto creado correctamente"
        });

    } catch (error) {

        console.error("Error al crear producto:", error);

        res.status(500).json({
            mensaje: "Error al crear el producto",
            error: error.message
        });

    }

});


app.put("/api/admin/productos/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        const id = Number(req.params.id);

        const {
            id_categoria,
            nombre,
            descripcion,
            precio,
            disponibilidad,
            imagen
        } = req.body;

        if (!id_categoria || !nombre || precio === undefined) {

            return res.status(400).json({
                mensaje: "Categoría, nombre y precio son obligatorios"
            });

        }

        actualizarProducto(id, {

            id_categoria: Number(id_categoria),

            nombre,

            descripcion,

            precio: Number(precio),

            disponibilidad: disponibilidad ? 1 : 0,

            imagen

        });

        res.json({
            mensaje: "Producto actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el producto",
            error: error.message
        });

    }

});


app.delete("/api/admin/productos/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        eliminarProducto(Number(req.params.id));

        res.json({
            mensaje: "Producto eliminado correctamente"
        });

    } catch (error) {

        console.error("Error al eliminar:", error);

        res.status(500).json({
            mensaje: "Error al eliminar el producto",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - PEDIDOS
// ==========================================

app.put("/api/admin/pedidos/:id/estado", autenticado, soyAdministrador, (req, res) => {

    try {

        const { estado } = req.body;

        if (!estado) {

            return res.status(400).json({
                mensaje: "El estado es obligatorio"
            });

        }

        actualizarEstadoPedido(Number(req.params.id), estado);

        res.json({
            mensaje: "Estado del pedido actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar estado:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el estado del pedido",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - CLIENTES
// ==========================================

app.get("/api/admin/clientes", autenticado, soyAdministrador, (req, res) => {

    try {

        res.json(obtenerClientes());

    } catch (error) {

        console.error("Error al obtener clientes:", error);

        res.status(500).json({
            mensaje: "Error al obtener los clientes",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - PROVEEDORES
// ==========================================

app.get("/api/admin/proveedores", autenticado, soyAdministrador, (req, res) => {

    try {

        res.json(obtenerProveedores());

    } catch (error) {

        console.error("Error al obtener proveedores:", error);

        res.status(500).json({
            mensaje: "Error al obtener los proveedores",
            error: error.message
        });

    }

});


app.post("/api/admin/proveedores", autenticado, soyAdministrador, (req, res) => {

    try {

        const { nombre, contacto, telefono, email } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre del proveedor es obligatorio"
            });

        }

        crearProveedor({ nombre, contacto, telefono, email });

        res.status(201).json({
            mensaje: "Proveedor creado correctamente"
        });

    } catch (error) {

        console.error("Error al crear proveedor:", error);

        res.status(500).json({
            mensaje: "Error al crear el proveedor",
            error: error.message
        });

    }

});


app.put("/api/admin/proveedores/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        const { nombre, contacto, telefono, email } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre del proveedor es obligatorio"
            });

        }

        actualizarProveedor(Number(req.params.id), { nombre, contacto, telefono, email });

        res.json({
            mensaje: "Proveedor actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar proveedor:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el proveedor",
            error: error.message
        });

    }

});


app.delete("/api/admin/proveedores/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        eliminarProveedor(Number(req.params.id));

        res.json({
            mensaje: "Proveedor eliminado correctamente"
        });

    } catch (error) {

        console.error("Error al eliminar proveedor:", error);

        res.status(500).json({
            mensaje: "Error al eliminar el proveedor",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - INGREDIENTES
// ==========================================

app.get("/api/admin/ingredientes", autenticado, soyAdministrador, (req, res) => {

    try {

        res.json(obtenerIngredientes());

    } catch (error) {

        console.error("Error al obtener ingredientes:", error);

        res.status(500).json({
            mensaje: "Error al obtener los ingredientes",
            error: error.message
        });

    }

});


app.post("/api/admin/ingredientes", autenticado, soyAdministrador, (req, res) => {

    try {

        const { id_proveedor, nombre, unidad, cantidad_inicial } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre del ingrediente es obligatorio"
            });

        }

        crearIngrediente({ id_proveedor, nombre, unidad, cantidad_inicial });

        res.status(201).json({
            mensaje: "Ingrediente creado correctamente"
        });

    } catch (error) {

        console.error("Error al crear ingrediente:", error);

        res.status(500).json({
            mensaje: "Error al crear el ingrediente",
            error: error.message
        });

    }

});


app.put("/api/admin/ingredientes/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        const { id_proveedor, nombre, unidad } = req.body;

        if (!nombre) {

            return res.status(400).json({
                mensaje: "El nombre del ingrediente es obligatorio"
            });

        }

        actualizarIngrediente(Number(req.params.id), { id_proveedor, nombre, unidad });

        res.json({
            mensaje: "Ingrediente actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar ingrediente:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el ingrediente",
            error: error.message
        });

    }

});


app.delete("/api/admin/ingredientes/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        eliminarIngrediente(Number(req.params.id));

        res.json({
            mensaje: "Ingrediente eliminado correctamente"
        });

    } catch (error) {

        console.error("Error al eliminar ingrediente:", error);

        res.status(500).json({
            mensaje: "Error al eliminar el ingrediente",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - INVENTARIO
// ==========================================

app.put("/api/admin/inventario/:id", autenticado, soyAdministrador, (req, res) => {

    try {

        const { cantidad } = req.body;

        if (cantidad === undefined || Number(cantidad) < 0) {

            return res.status(400).json({
                mensaje: "La cantidad debe ser un número mayor o igual a 0"
            });

        }

        actualizarInventario(Number(req.params.id), Number(cantidad));

        res.json({
            mensaje: "Inventario actualizado correctamente"
        });

    } catch (error) {

        console.error("Error al actualizar inventario:", error);

        res.status(500).json({
            mensaje: "Error al actualizar el inventario",
            error: error.message
        });

    }

});


// ==========================================
// ADMINISTRADOR - ESTADÍSTICAS
// ==========================================

app.get("/api/admin/estadisticas", autenticado, soyAdministrador, (req, res) => {

    try {

        res.json(obtenerEstadisticas());

    } catch (error) {

        console.error("Error al obtener estadísticas:", error);

        res.status(500).json({
            mensaje: "Error al obtener las estadísticas",
            error: error.message
        });

    }

});


// ==========================================
// INICIAR SERVIDOR
// ==========================================

async function iniciarServidor() {

    try {

        await iniciarBaseDatos();

        app.listen(PORT, () => {

            console.log("");
            console.log("======================================");
            console.log("       HORNEADO - SISTEMA WEB");
            console.log("======================================");
            console.log("");
            console.log(`Servidor funcionando en:`);
            console.log(`http://localhost:${PORT}`);
            console.log("");
            console.log("Cuentas de prueba:");
            console.log("  - Administrador: admin@horneado.com / admin123");
            console.log("  - Cliente:       cliente@horneado.com / cliente123");
            console.log("");
            console.log(`Ruta de categorías: http://localhost:${PORT}/api/categorias`);
            console.log(`Ruta de productos:  http://localhost:${PORT}/api/productos`);
            console.log("");

        });

    } catch (error) {

        console.error("ERROR AL INICIAR EL SERVIDOR:");
        console.error(error);

    }

}


iniciarServidor();
module.exports = app;