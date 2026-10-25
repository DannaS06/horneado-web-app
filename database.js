const initSqlJs = require("sql.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const dbPath = path.join(__dirname, "horneado.sqlite");

let db;


// ==========================================
// INICIAR BASE DE DATOS
// ==========================================

async function iniciarBaseDatos() {

    const SQL = await initSqlJs();

    if (fs.existsSync(dbPath)) {

        const archivo = fs.readFileSync(dbPath);

        db = new SQL.Database(archivo);

        console.log("Base de datos existente cargada.");

    } else {

        db = new SQL.Database();

        console.log("Nueva base de datos creada.");

    }

    crearTablas();

    migrarColumnas();

    if (!existenUsuarios()) {

        insertarDatosIniciales();

    }

    guardarBaseDatos();

    console.log("Base de datos ubicada en:");
    console.log(dbPath);
}


// ==========================================
// CONSULTA GENÉRICA (SELECT)
// ==========================================

function consulta(sql, params = []) {

    const stmt = db.prepare(sql);

    stmt.bind(params);

    const filas = [];

    while (stmt.step()) {

        filas.push(stmt.getAsObject());

    }

    stmt.free();

    return filas;
}


// ==========================================
// AGREGAR COLUMNA SI NO EXISTE
// ==========================================

function agregarColumna(tabla, columna, definicion) {

    const columnas = consulta(`PRAGMA table_info(${tabla})`);

    const existe = columnas.some(col => col.name === columna);

    if (!existe) {

        db.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion};`);

    }

}


// ==========================================
// MIGRAR COLUMNAS FALTANTES
// ==========================================

function migrarColumnas() {

    agregarColumna("productos", "imagen", "TEXT");

    agregarColumna("usuarios", "fecha_creacion", "TEXT");

    agregarColumna("clientes", "telefono", "TEXT");

    agregarColumna("clientes", "direccion", "TEXT");

    agregarColumna("clientes", "fecha_registro", "TEXT");

}


// ==========================================
// CREAR TABLAS
// ==========================================

function crearTablas() {

    db.run(`
        CREATE TABLE IF NOT EXISTS categorias (

            id_categoria INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            descripcion TEXT

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS productos (

            id_producto INTEGER PRIMARY KEY AUTOINCREMENT,

            id_categoria INTEGER NOT NULL,

            nombre TEXT NOT NULL,

            descripcion TEXT,

            precio REAL NOT NULL,

            disponibilidad INTEGER DEFAULT 1,

            imagen TEXT,

            FOREIGN KEY (id_categoria)
            REFERENCES categorias(id_categoria)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (

            id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            email TEXT NOT NULL UNIQUE,

            contrasena_hash TEXT NOT NULL,

            rol TEXT NOT NULL DEFAULT 'cliente',

            fecha_creacion TEXT

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS clientes (

            id_cliente INTEGER PRIMARY KEY AUTOINCREMENT,

            id_usuario INTEGER NOT NULL,

            telefono TEXT,

            direccion TEXT,

            fecha_registro TEXT,

            FOREIGN KEY (id_usuario)
            REFERENCES usuarios(id_usuario)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS pedidos (

            id_pedido INTEGER PRIMARY KEY AUTOINCREMENT,

            id_cliente INTEGER NOT NULL,

            fecha TEXT NOT NULL,

            estado TEXT NOT NULL DEFAULT 'Pendiente',

            total REAL NOT NULL,

            FOREIGN KEY (id_cliente)
            REFERENCES clientes(id_cliente)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS detalle_pedido (

            id_detalle INTEGER PRIMARY KEY AUTOINCREMENT,

            id_pedido INTEGER NOT NULL,

            id_producto INTEGER NOT NULL,

            cantidad INTEGER NOT NULL,

            precio_unitario REAL NOT NULL,

            subtotal REAL NOT NULL,

            FOREIGN KEY (id_pedido)
            REFERENCES pedidos(id_pedido),

            FOREIGN KEY (id_producto)
            REFERENCES productos(id_producto)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS proveedores (

            id_proveedor INTEGER PRIMARY KEY AUTOINCREMENT,

            nombre TEXT NOT NULL,

            contacto TEXT,

            telefono TEXT,

            email TEXT

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS ingredientes (

            id_ingrediente INTEGER PRIMARY KEY AUTOINCREMENT,

            id_proveedor INTEGER,

            nombre TEXT NOT NULL,

            unidad TEXT,

            FOREIGN KEY (id_proveedor)
            REFERENCES proveedores(id_proveedor)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS inventario (

            id_inventario INTEGER PRIMARY KEY AUTOINCREMENT,

            id_ingrediente INTEGER NOT NULL,

            cantidad REAL NOT NULL DEFAULT 0,

            fecha_actualizacion TEXT,

            FOREIGN KEY (id_ingrediente)
            REFERENCES ingredientes(id_ingrediente)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS producto_ingredientes (

            id_producto INTEGER NOT NULL,

            id_ingrediente INTEGER NOT NULL,

            cantidad REAL NOT NULL DEFAULT 0,

            PRIMARY KEY (id_producto, id_ingrediente),

            FOREIGN KEY (id_producto)
            REFERENCES productos(id_producto),

            FOREIGN KEY (id_ingrediente)
            REFERENCES ingredientes(id_ingrediente)

        );
    `);


    db.run(`
        CREATE TABLE IF NOT EXISTS sesiones (

            token TEXT PRIMARY KEY,

            id_usuario INTEGER NOT NULL,

            fecha_creacion TEXT,

            FOREIGN KEY (id_usuario)
            REFERENCES usuarios(id_usuario)

        );
    `);

}


// ==========================================
// INSERTAR DATOS INICIALES
// ==========================================

function insertarDatosIniciales() {

    const categoriasExistentes = consulta("SELECT COUNT(*) AS total FROM categorias");

    if (categoriasExistentes[0].total === 0) {

        db.run(`
            INSERT INTO categorias
            (nombre, descripcion)
            VALUES
            ('Tortas', 'Tortas y pasteles'),
            ('Postres', 'Postres dulces'),
            ('Cupcakes', 'Cupcakes decorados'),
            ('Galletas', 'Galletas y bocaditos');
        `);

    }


    const productosExistentes = consulta("SELECT COUNT(*) AS total FROM productos");

    if (productosExistentes[0].total === 0) {

        db.run(`
            INSERT INTO productos
            (
                id_categoria,
                nombre,
                descripcion,
                precio,
                disponibilidad,
                imagen
            )
            VALUES

            (
                1,
                'Torta de chocolate',
                'Torta de chocolate con cobertura',
                35000,
                1,
                '🎂'
            ),

            (
                2,
                'Cheesecake',
                'Cheesecake con base de galleta',
                28000,
                1,
                '🍰'
            ),

            (
                3,
                'Cupcakes',
                'Cupcakes decorados',
                18000,
                1,
                '🧁'
            ),

            (
                1,
                'Torta red velvet',
                'Suave bizcocho rojo con crema de queso',
                42000,
                1,
                '🍰'
            ),

            (
                2,
                'Brownie de nuez',
                'Brownie húmedo con nueces',
                12000,
                1,
                '🍫'
            ),

            (
                4,
                'Galletas decoradas',
                'Galletas con glaseado personalizado',
                8000,
                1,
                '🍪'
            );
        `);
    }


    const proveedoresExistentes = consulta("SELECT COUNT(*) AS total FROM proveedores");

    if (proveedoresExistentes[0].total === 0) {

        db.run(`
            INSERT INTO proveedores
            (nombre, contacto, telefono, email)
            VALUES
            ('Distribuidora La Harinera', 'Carlos Mejía', '300 555 0101', 'ventas@laharinera.com'),
            ('Lácteos Andinos', 'Laura Restrepo', '300 555 0102', 'contacto@lacteosandinos.com'),
            ('Chocolates Del Valle', 'Andrés Gil', '300 555 0103', 'pedidos@chocolatesdelvalle.com');
        `);

        db.run(`
            INSERT INTO ingredientes
            (id_proveedor, nombre, unidad)
            VALUES
            (1, 'Harina de trigo', 'kg'),
            (1, 'Azúcar', 'kg'),
            (2, 'Leche', 'litros'),
            (2, 'Mantequilla', 'kg'),
            (2, 'Crema de leche', 'litros'),
            (3, 'Chocolate', 'kg'),
            (1, 'Huevos', 'unidades');
        `);

        db.run(`
            INSERT INTO inventario
            (id_ingrediente, cantidad, fecha_actualizacion)
            VALUES
            (1, 25, datetime('now')),
            (2, 30, datetime('now')),
            (3, 40, datetime('now')),
            (4, 15, datetime('now')),
            (5, 20, datetime('now')),
            (6, 18, datetime('now')),
            (7, 200, datetime('now'));
        `);

        db.run(`
            INSERT INTO producto_ingredientes
            (id_producto, id_ingrediente, cantidad)
            VALUES
            (1, 1, 0.5),
            (1, 6, 0.3),
            (2, 2, 0.25),
            (2, 5, 0.4);
        `);

    }


    db.run(`
        INSERT INTO usuarios
        (nombre, email, contrasena_hash, rol, fecha_creacion)
        VALUES
        (
            'Administrador',
            'admin@horneado.com',
            '${hashContrasena("admin123")}',
            'administrador',
            datetime('now')
        ),
        (
            'Cliente Demo',
            'cliente@horneado.com',
            '${hashContrasena("cliente123")}',
            'cliente',
            datetime('now')
        );
    `);


    db.run(`
        INSERT INTO clientes
        (id_usuario, telefono, direccion, fecha_registro)
        VALUES
        (2, '300 555 9900', 'Calle 123 # 45 - 67', datetime('now'));
    `);

}


// ==========================================
// GUARDAR BASE DE DATOS
// ==========================================

function guardarBaseDatos() {

    const datos = db.export();

    const buffer = Buffer.from(datos);

    fs.writeFileSync(dbPath, buffer);

}


// ==========================================
// CONTRASEÑAS (hash con scrypt)
// ==========================================

function hashContrasena(contrasena) {

    const sal = crypto.randomBytes(16).toString("hex");

    const hash = crypto.scryptSync(contrasena, sal, 64).toString("hex");

    return `${sal}:${hash}`;

}


function verificarContrasena(contrasena, hashAlmacenado) {

    const [sal, hash] = hashAlmacenado.split(":");

    const hashCalculado = crypto.scryptSync(contrasena, sal, 64).toString("hex");

    return hashCalculado === hash;

}


function existeUsuarioConEmail(email) {

    const resultado = consulta(
        "SELECT COUNT(*) AS total FROM usuarios WHERE email = ?",
        [email]
    );

    return resultado[0].total > 0;

}


function existenUsuarios() {

    const resultado = consulta("SELECT COUNT(*) AS total FROM usuarios");

    return resultado[0].total > 0;

}


// ==========================================
// USUARIOS / AUTENTICACIÓN
// ==========================================

function crearUsuario(nombre, email, contrasena, rol = "cliente") {

    db.run(`
        INSERT INTO usuarios
        (nombre, email, contrasena_hash, rol, fecha_creacion)
        VALUES (?, ?, ?, ?, datetime('now'))
    `, [nombre, email, hashContrasena(contrasena), rol]);

    const id = consulta("SELECT last_insert_rowid() AS id")[0].id;

    guardarBaseDatos();

    return id;

}


function obtenerUsuarioPorEmail(email) {

    const resultado = consulta(
        "SELECT * FROM usuarios WHERE email = ?",
        [email]
    );

    return resultado.length ? resultado[0] : null;

}


function obtenerUsuarioPorId(id) {

    const resultado = consulta(
        "SELECT * FROM usuarios WHERE id_usuario = ?",
        [id]
    );

    return resultado.length ? resultado[0] : null;

}


function crearCliente(id_usuario, telefono = "", direccion = "") {

    db.run(`
        INSERT INTO clientes
        (id_usuario, telefono, direccion, fecha_registro)
        VALUES (?, ?, ?, datetime('now'))
    `, [id_usuario, telefono, direccion]);

    const id = consulta("SELECT last_insert_rowid() AS id")[0].id;

    guardarBaseDatos();

    return id;

}


function obtenerClientePorUsuario(id_usuario) {

    const resultado = consulta(
        "SELECT * FROM clientes WHERE id_usuario = ?",
        [id_usuario]
    );

    return resultado.length ? resultado[0] : null;

}


function crearSesion(id_usuario) {

    const token = crypto.randomBytes(32).toString("hex");

    db.run(`
        INSERT INTO sesiones
        (token, id_usuario, fecha_creacion)
        VALUES (?, ?, datetime('now'))
    `, [token, id_usuario]);

    guardarBaseDatos();

    return token;

}


function eliminarSesion(token) {

    db.run("DELETE FROM sesiones WHERE token = ?", [token]);

    guardarBaseDatos();

}


function obtenerSesion(token) {

    const resultado = consulta(`
        SELECT
            s.token,
            s.id_usuario,
            u.nombre,
            u.email,
            u.rol,
            c.id_cliente
        FROM sesiones s
        INNER JOIN usuarios u
        ON s.id_usuario = u.id_usuario
        LEFT JOIN clientes c
        ON c.id_usuario = u.id_usuario
        WHERE s.token = ?
    `, [token]);

    return resultado.length ? resultado[0] : null;

}


// ==========================================
// CLIENTES (administración)
// ==========================================

function obtenerClientes() {

    return consulta(`
        SELECT
            c.id_cliente,
            u.id_usuario,
            u.nombre,
            u.email,
            u.fecha_creacion,
            c.telefono,
            c.direccion,
            c.fecha_registro,
            (SELECT COUNT(*)
             FROM pedidos p
             WHERE p.id_cliente = c.id_cliente) AS total_pedidos
        FROM clientes c
        INNER JOIN usuarios u
        ON c.id_usuario = u.id_usuario
        ORDER BY c.id_cliente DESC;
    `);

}


function actualizarCliente(id_cliente, datos) {

    db.run(`
        UPDATE clientes
        SET telefono = ?, direccion = ?
        WHERE id_cliente = ?
    `, [datos.telefono || "", datos.direccion || "", id_cliente]);

    guardarBaseDatos();

}


// ==========================================
// CATEGORÍAS
// ==========================================

function obtenerCategorias() {

    return consulta(`
        SELECT
            c.id_categoria,
            c.nombre,
            c.descripcion,
            (SELECT COUNT(*)
             FROM productos p
             WHERE p.id_categoria = c.id_categoria) AS total_productos
        FROM categorias c
        ORDER BY c.nombre;
    `);

}


function crearCategoria(nombre, descripcion) {

    db.run(`
        INSERT INTO categorias
        (nombre, descripcion)
        VALUES (?, ?)
    `, [nombre, descripcion || ""]);

    guardarBaseDatos();

}


function actualizarCategoria(id, nombre, descripcion) {

    db.run(`
        UPDATE categorias
        SET nombre = ?, descripcion = ?
        WHERE id_categoria = ?
    `, [nombre, descripcion || "", id]);

    guardarBaseDatos();

}


function eliminarCategoria(id) {

    db.run(`
        UPDATE productos
        SET id_categoria = NULL
        WHERE id_categoria = ?
    `, [id]);

    db.run("DELETE FROM categorias WHERE id_categoria = ?", [id]);

    guardarBaseDatos();

}


// ==========================================
// PRODUCTOS
// ==========================================

function obtenerProductos() {

    return consulta(`
        SELECT
            p.id_producto,
            p.id_categoria,
            p.nombre,
            p.descripcion,
            p.precio,
            p.disponibilidad,
            p.imagen,
            c.nombre AS categoria
        FROM productos p
        LEFT JOIN categorias c
        ON p.id_categoria = c.id_categoria
        ORDER BY p.id_producto DESC;
    `);

}


function obtenerProductoPorId(id) {

    const resultado = consulta(`
        SELECT
            p.id_producto,
            p.id_categoria,
            p.nombre,
            p.descripcion,
            p.precio,
            p.disponibilidad,
            p.imagen,
            c.nombre AS categoria
        FROM productos p
        LEFT JOIN categorias c
        ON p.id_categoria = c.id_categoria
        WHERE p.id_producto = ?
    `, [id]);

    return resultado.length ? resultado[0] : null;

}


function crearProducto(producto) {

    db.run(`
        INSERT INTO productos
        (
            id_categoria,
            nombre,
            descripcion,
            precio,
            disponibilidad,
            imagen
        )

        VALUES (?, ?, ?, ?, ?, ?)
    `, [

        producto.id_categoria,

        producto.nombre,

        producto.descripcion,

        producto.precio,

        producto.disponibilidad,

        producto.imagen || ""

    ]);

    guardarBaseDatos();

}


function actualizarProducto(id, producto) {

    db.run(`
        UPDATE productos

        SET

            id_categoria = ?,

            nombre = ?,

            descripcion = ?,

            precio = ?,

            disponibilidad = ?,

            imagen = ?

        WHERE id_producto = ?
    `, [

        producto.id_categoria,

        producto.nombre,

        producto.descripcion,

        producto.precio,

        producto.disponibilidad,

        producto.imagen || "",

        id

    ]);

    guardarBaseDatos();

}


function eliminarProducto(id) {

    db.run("DELETE FROM detalle_pedido WHERE id_producto = ?", [id]);

    db.run("DELETE FROM producto_ingredientes WHERE id_producto = ?", [id]);

    db.run("DELETE FROM productos WHERE id_producto = ?", [id]);

    guardarBaseDatos();

}


// ==========================================
// PEDIDOS
// ==========================================

function crearPedido(id_cliente, items) {

    let total = 0;

    const detalle = items.map(item => {

        const producto = obtenerProductoPorId(item.id_producto);

        if (!producto || producto.disponibilidad !== 1) {

            throw new Error("Uno de los productos no está disponible");

        }

        const subtotal = producto.precio * item.cantidad;

        total += subtotal;

        return {
            id_producto: producto.id_producto,
            cantidad: item.cantidad,
            precio_unitario: producto.precio,
            subtotal
        };

    });


    db.run(`
        INSERT INTO pedidos
        (id_cliente, fecha, estado, total)
        VALUES (?, datetime('now'), 'Pendiente', ?)
    `, [id_cliente, total]);

    const id_pedido = consulta("SELECT last_insert_rowid() AS id")[0].id;


    detalle.forEach(item => {

        db.run(`
            INSERT INTO detalle_pedido
            (id_pedido, id_producto, cantidad, precio_unitario, subtotal)
            VALUES (?, ?, ?, ?, ?)
        `, [
            id_pedido,
            item.id_producto,
            item.cantidad,
            item.precio_unitario,
            item.subtotal
        ]);

    });


    guardarBaseDatos();

    return id_pedido;

}


function obtenerPedidos(clienteId = null) {

    let sql = `
        SELECT
            p.id_pedido,
            p.fecha,
            p.estado,
            p.total,
            c.id_cliente,
            u.nombre AS cliente
        FROM pedidos p
        INNER JOIN clientes c
        ON p.id_cliente = c.id_cliente
        INNER JOIN usuarios u
        ON c.id_usuario = u.id_usuario
    `;

    const params = [];

    if (clienteId !== null) {

        sql += " WHERE p.id_cliente = ?";

        params.push(clienteId);

    }

    sql += " ORDER BY p.id_pedido DESC";

    return consulta(sql, params);

}


function obtenerPedidoPorId(id) {

    const pedido = consulta(`
        SELECT
            p.id_pedido,
            p.fecha,
            p.estado,
            p.total,
            c.id_cliente,
            u.nombre AS cliente,
            u.email AS email_cliente,
            c.telefono,
            c.direccion
        FROM pedidos p
        INNER JOIN clientes c
        ON p.id_cliente = c.id_cliente
        INNER JOIN usuarios u
        ON c.id_usuario = u.id_usuario
        WHERE p.id_pedido = ?
    `, [id]);

    if (pedido.length === 0) {

        return null;

    }

    const items = consulta(`
        SELECT
            d.id_detalle,
            d.cantidad,
            d.precio_unitario,
            d.subtotal,
            d.id_producto,
            pro.nombre AS producto
        FROM detalle_pedido d
        INNER JOIN productos pro
        ON d.id_producto = pro.id_producto
        WHERE d.id_pedido = ?
    `, [id]);

    pedido[0].items = items;

    return pedido[0];

}


function actualizarEstadoPedido(id, estado) {

    const estadosValidos = [
        "Pendiente",
        "Confirmado",
        "En preparación",
        "Enviado",
        "Entregado",
        "Cancelado"
    ];

    if (!estadosValidos.includes(estado)) {

        throw new Error("Estado de pedido no válido");

    }

    db.run("UPDATE pedidos SET estado = ? WHERE id_pedido = ?", [estado, id]);

    guardarBaseDatos();

}


// ==========================================
// PROVEEDORES
// ==========================================

function obtenerProveedores() {

    return consulta(`
        SELECT
            pr.id_proveedor,
            pr.nombre,
            pr.contacto,
            pr.telefono,
            pr.email,
            (SELECT COUNT(*)
             FROM ingredientes i
             WHERE i.id_proveedor = pr.id_proveedor) AS total_ingredientes
        FROM proveedores pr
        ORDER BY pr.nombre;
    `);

}


function crearProveedor(proveedor) {

    db.run(`
        INSERT INTO proveedores
        (nombre, contacto, telefono, email)
        VALUES (?, ?, ?, ?)
    `, [
        proveedor.nombre,
        proveedor.contacto || "",
        proveedor.telefono || "",
        proveedor.email || ""
    ]);

    guardarBaseDatos();

}


function actualizarProveedor(id, proveedor) {

    db.run(`
        UPDATE proveedores
        SET nombre = ?, contacto = ?, telefono = ?, email = ?
        WHERE id_proveedor = ?
    `, [
        proveedor.nombre,
        proveedor.contacto || "",
        proveedor.telefono || "",
        proveedor.email || "",
        id
    ]);

    guardarBaseDatos();

}


function eliminarProveedor(id) {

    db.run("UPDATE ingredientes SET id_proveedor = NULL WHERE id_proveedor = ?", [id]);

    db.run("DELETE FROM proveedores WHERE id_proveedor = ?", [id]);

    guardarBaseDatos();

}


// ==========================================
// INGREDIENTES
// ==========================================

function obtenerIngredientes() {

    return consulta(`
        SELECT
            i.id_ingrediente,
            i.nombre,
            i.unidad,
            i.id_proveedor,
            pr.nombre AS proveedor,
            COALESCE(inv.cantidad, 0) AS stock
        FROM ingredientes i
        LEFT JOIN proveedores pr
        ON i.id_proveedor = pr.id_proveedor
        LEFT JOIN inventario inv
        ON inv.id_ingrediente = i.id_ingrediente
        ORDER BY i.nombre;
    `);

}


function crearIngrediente(ingrediente) {

    db.run(`
        INSERT INTO ingredientes
        (id_proveedor, nombre, unidad)
        VALUES (?, ?, ?)
    `, [
        ingrediente.id_proveedor || null,
        ingrediente.nombre,
        ingrediente.unidad || "unidades"
    ]);

    const id = consulta("SELECT last_insert_rowid() AS id")[0].id;

    db.run(`
        INSERT INTO inventario
        (id_ingrediente, cantidad, fecha_actualizacion)
        VALUES (?, ?, datetime('now'))
    `, [id, ingrediente.cantidad_inicial || 0]);

    guardarBaseDatos();

}


function actualizarIngrediente(id, ingrediente) {

    db.run(`
        UPDATE ingredientes
        SET id_proveedor = ?, nombre = ?, unidad = ?
        WHERE id_ingrediente = ?
    `, [
        ingrediente.id_proveedor || null,
        ingrediente.nombre,
        ingrediente.unidad || "unidades",
        id
    ]);

    guardarBaseDatos();

}


function eliminarIngrediente(id) {

    db.run("DELETE FROM inventario WHERE id_ingrediente = ?", [id]);

    db.run("DELETE FROM producto_ingredientes WHERE id_ingrediente = ?", [id]);

    db.run("DELETE FROM ingredientes WHERE id_ingrediente = ?", [id]);

    guardarBaseDatos();

}


// ==========================================
// INVENTARIO
// ==========================================

function actualizarInventario(id_ingrediente, cantidad) {

    db.run(`
        UPDATE inventario
        SET cantidad = ?, fecha_actualizacion = datetime('now')
        WHERE id_ingrediente = ?
    `, [cantidad, id_ingrediente]);

    guardarBaseDatos();

}


// ==========================================
// ESTADÍSTICAS (panel administrador)
// ==========================================

function obtenerEstadisticas() {

    const conteo = etiqueta => consulta(`SELECT COUNT(*) AS total FROM ${etiqueta}`)[0].total;

    const totalVentas = consulta(`
        SELECT COALESCE(SUM(total), 0) AS total
        FROM pedidos
        WHERE estado != 'Cancelado'
    `)[0].total;

    const pedidosPorEstado = consulta(`
        SELECT estado, COUNT(*) AS total
        FROM pedidos
        GROUP BY estado
        ORDER BY total DESC
    `);

    const top = consulta(`
        SELECT pro.nombre, SUM(d.cantidad) AS unidades
        FROM detalle_pedido d
        INNER JOIN productos pro
        ON d.id_producto = pro.id_producto
        GROUP BY d.id_producto
        ORDER BY unidades DESC
        LIMIT 5
    `);

    return {
        total_clientes: conteo("clientes"),
        total_productos: conteo("productos"),
        total_pedidos: conteo("pedidos"),
        total_categorias: conteo("categorias"),
        total_ingredientes: conteo("ingredientes"),
        total_proveedores: conteo("proveedores"),
        total_ventas: totalVentas,
        pedidos_por_estado: pedidosPorEstado,
        productos_mas_vendidos: top
    };

}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {

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

};