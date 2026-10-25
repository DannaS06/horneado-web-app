// ======================================
// HORNEADO - APLICACIÓN WEB (SPA)
// ======================================

const $ = selector => document.querySelector(selector);

const app = document.getElementById("app");


// ======================================
// ESTADO GLOBAL
// ======================================

const estado = {
    token: localStorage.getItem("horneado_token") || null,
    usuario: JSON.parse(localStorage.getItem("horneado_usuario") || "null"),
    carrito: JSON.parse(localStorage.getItem("horneado_carrito") || "[]"),
    productos: [],
    categorias: [],
    editando: null
};


function guardarSesion() {

    if (estado.token) {

        localStorage.setItem("horneado_token", estado.token);

        localStorage.setItem("horneado_usuario", JSON.stringify(estado.usuario));

    } else {

        localStorage.removeItem("horneado_token");

        localStorage.removeItem("horneado_usuario");

    }

}


function guardarCarrito() {

    localStorage.setItem("horneado_carrito", JSON.stringify(estado.carrito));

    actualizarBadgeCarrito();

}


// ======================================
// UTILIDADES
// ======================================

function esc(texto) {

    return String(texto ?? "").replace(/[&<>"']/g, car => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[car]));

}


function precioCOP(valor) {

    return Number(valor || 0).toLocaleString("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    });

}


function fechaLegible(fecha) {

    if (!fecha) return "";

    try {

        return new Date(fecha).toLocaleString("es-CO", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });

    } catch (_) {

        return fecha;

    }

}


function notificar(mensaje, tipo = "ok") {

    const toast = document.createElement("div");

    toast.className = `toast toast-${tipo}`;

    const icono = tipo === "ok" ? "✅" : tipo === "error" ? "❌" : "⚠️";

    toast.innerHTML = `${icono} <span>${esc(mensaje)}</span>`;

    document.getElementById("toastContainer").appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-hide");
        setTimeout(() => toast.remove(), 300);
    }, 3000);

}


// ======================================
// CLIENTE HTTP (con autorización)
// ======================================

async function api(ruta, opciones = {}) {

    const config = {
        method: opciones.metodo || "GET",
        headers: { "Content-Type": "application/json" }
    };

    if (estado.token) {

        config.headers.Authorization = `Bearer ${estado.token}`;

    }

    if (opciones.cuerpo) {

        config.body = JSON.stringify(opciones.cuerpo);

    }

    const respuesta = await fetch(ruta, config);

    let datos = null;

    try {

        datos = await respuesta.json();

    } catch (_) {
        // sin cuerpo JSON
    }

    if (!respuesta.ok) {

        const error = new Error((datos && datos.mensaje) || "Error en la solicitud");

        error.estado = respuesta.status;

        error.datos = datos;

        throw error;

    }

    return datos;

}


// ======================================
// CARRITO
// ======================================

function totalCarrito() {

    return estado.carrito.reduce((suma, item) => suma + (item.precio * item.cantidad), 0);

}


function cantidadTotalCarrito() {

    return estado.carrito.reduce((suma, item) => suma + item.cantidad, 0);

}


function agregarAlCarrito(producto, cantidad = 1) {

    const existente = estado.carrito.find(item => item.id_producto === producto.id_producto);

    if (existente) {

        existente.cantidad += cantidad;

    } else {

        estado.carrito.push({
            id_producto: producto.id_producto,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen || "🧁",
            cantidad
        });

    }

    guardarCarrito();

    notificar(`${producto.nombre} agregado al carrito`);

    renderizarCarrito();

}


function actualizarBadgeCarrito() {

    const badge = document.getElementById("cartBadge");

    const cantidad = cantidadTotalCarrito();

    badge.textContent = cantidad;

    badge.hidden = cantidad === 0;

}


function renderizarCarrito() {

    const cuerpo = document.getElementById("cartDrawerBody");

    const pie = document.getElementById("cartDrawerFooter");


    if (estado.carrito.length === 0) {

        cuerpo.innerHTML = `
            <div class="cart-empty">
                <p>😋</p>
                <p>Tu carrito está vacío</p>
                <small>Agrega productos del catálogo</small>
            </div>
        `;

        pie.innerHTML = "";

        actualizarBadgeCarrito();

        return;

    }

    cuerpo.innerHTML = estado.carrito.map(item => `

        <div class="cart-item">

            <span class="cart-item-emoji">${esc(item.imagen)}</span>

            <div class="cart-item-info">

                <strong>${esc(item.nombre)}</strong>

                <small>${precioCOP(item.precio)}</small>

            </div>

            <div class="cart-item-controls">

                <button onclick="cambiarCantidad(${item.id_producto}, -1)">−</button>

                <span>${item.cantidad}</span>

                <button onclick="cambiarCantidad(${item.id_producto}, 1)">+</button>

            </div>

            <button class="cart-item-remove" onclick="eliminarDelCarrito(${item.id_producto})" title="Eliminar">✕</button>

        </div>

    `).join("");


    pie.innerHTML = `

        <div class="cart-total">
            <span>Total</span>
            <strong>${precioCOP(totalCarrito())}</strong>
        </div>

        <button class="btn btn-primary btn-block" onclick="irPagar()">
            Realizar pedido →
        </button>

    `;

    actualizarBadgeCarrito();

}


function cambiarCantidad(id_producto, delta) {

    const item = estado.carrito.find(i => i.id_producto === id_producto);

    if (!item) return;

    item.cantidad += delta;

    if (item.cantidad <= 0) {

        eliminarDelCarrito(id_producto);

        return;

    }

    guardarCarrito();

    renderizarCarrito();

}


function eliminarDelCarrito(id_producto) {

    estado.carrito = estado.carrito.filter(i => i.id_producto !== id_producto);

    guardarCarrito();

    renderizarCarrito();

}


// ======================================
// PANEL DE CARRITO (drawer)
// ======================================

function abrirCarrito() {

    document.getElementById("cartDrawer").hidden = false;

    document.getElementById("drawerOverlay").hidden = false;

    document.body.style.overflow = "hidden";

    renderizarCarrito();

}


function cerrarCarrito() {

    document.getElementById("cartDrawer").hidden = true;

    document.getElementById("drawerOverlay").hidden = true;

    document.body.style.overflow = "";

}


// ======================================
// RENDERIZADO DE SECCIONES
// ======================================

function renderearEnlaces() {

    const estaLogueado = Boolean(estado.usuario);

    const esAdmin = estaLogueado && estado.usuario.rol === "administrador";

    document.getElementById("navPedidos").hidden = !estaLogueado;

    document.getElementById("navAdmin").hidden = !esAdmin;

    const area = document.getElementById("userArea");


    if (!estaLogueado) {

        area.innerHTML = `
            <a href="#/login" class="btn btn-ghost btn-sm">Iniciar sesión</a>
            <a href="#/registro" class="btn btn-primary btn-sm">Registrarse</a>
        `;

    } else {

        const inicial = esc((estado.usuario.nombre || "?").charAt(0).toUpperCase());

        area.innerHTML = `
            <button class="user-chip" id="btnUserMenu">
                <span class="avatar">${inicial}</span>
                <span class="user-name">${esc(estado.usuario.nombre)}</span>
                <small class="user-rol">${estado.usuario.rol === "administrador" ? "Admin" : "Cliente"}</small>
            </button>
            <div class="user-menu" id="userMenu" hidden>
                <a href="#/perfil" onclick="cerrarMenu()">👤 Mi perfil</a>
                <a href="#/pedidos" onclick="cerrarMenu()">📦 Mis pedidos</a>
                ${esAdmin ? '<a href="#/admin" onclick="cerrarMenu()">🛠️ Administración</a>' : ""}
                <button class="user-menu-item" onclick="cerrarSesion()">🚪 Cerrar sesión</button>
            </div>
        `;

        document.getElementById("btnUserMenu").addEventListener("click", event => {

            event.stopPropagation();

            const menu = document.getElementById("userMenu");

            menu.hidden = !menu.hidden;

        });

    }

}


function cerrarMenu() {

    const menu = document.getElementById("userMenu");

    if (menu) menu.hidden = true;

}


// ======================================
// VISTA: TIENDA (catálogo)
// ======================================

async function renderTienda() {

    renderearEnlaces();

    closesafe();

    app.innerHTML = `
        <section class="hero">

            <div class="hero-text">

                <span class="hero-badge">🎂 Repostería artesanal</span>

                <h1>Los postres más dulces, <em>recién horneados</em> para ti</h1>

                <p>
                    Explora tortas, cupcakes y postres hechos con amor.
                    Elige, pide y recibe en tu puerta.
                </p>

                <div class="hero-actions">

                    <a href="#tienda" class="btn btn-primary btn-lg" onclick="return false" id="btnVerCatalogo">Ver catálogo</a>

                    <a href="#/pedidos" class="btn btn-ghost btn-lg">📦 Mis pedidos</a>

                </div>

            </div>

            <div class="hero-art">🧁🍰🎂</div>

        </section>


        <section class="catalog-section">

            <div class="section-heading">

                <div>

                    <h2>Nuestro catálogo</h2>

                    <p>Productos disponibles en Horneado</p>

                </div>

                <div class="search-box">

                    <input
                        type="text"
                        id="buscadorProductos"
                        placeholder="Buscar postre… 🔍"
                    >

                </div>

            </div>


            <div class="chips" id="filtroCategorias">

                <button class="chip chip-active" data-cat="0">Todos</button>

            </div>


            <div class="products-grid" id="gridProductos">

                <div class="skeleton-grid">
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                    <div class="skeleton"></div>
                </div>

            </div>

        </section>
    `;


    const btnVer = document.getElementById("btnVerCatalogo");

    if (btnVer) {

        btnVer.addEventListener("click", () => {

            document.querySelector(".catalog-section").scrollIntoView({ behavior: "smooth" });

        });

    }


    const buscador = document.getElementById("buscadorProductos");

    buscador.addEventListener("input", () => aplicarFiltros());


    renderizarChips();

    await cargarYMostrarProductos();

}


function renderizarChips() {

    const contenedor = document.getElementById("filtroCategorias");

    const chips = [
        { id: 0, nombre: "Todos" },
        ...estado.categorias.map(c => ({ id: c.id_categoria, nombre: c.nombre }))
    ];

    contenedor.innerHTML = chips.map(c => `
        <button
            class="chip ${c.id === 0 ? "chip-active" : ""}"
            data-cat="${c.id}"
            onclick="filtrarCategoria(${c.id})"
        >
            ${esc(c.nombre)}
        </button>
    `).join("");

}


async function cargarProductos() {

    estado.productos = await api("/api/productos");

}


function productosDisponibles() {

    return estado.productos.filter(p => p.disponibilidad === 1);

}


function aplicarFiltros() {

    const texto = (document.getElementById("buscadorProductos").value || "").toLowerCase();

    const categoriaActiva = Number(document.querySelector(".chip-active")?.dataset.cat || 0);


    const visibles = productosDisponibles().filter(p => {

        const cumpleCategoria = categoriaActiva === 0 || p.id_categoria === categoriaActiva;

        const cumpleTexto = !texto || (p.nombre + " " + (p.descripcion || "")).toLowerCase().includes(texto);

        return cumpleCategoria && cumpleTexto;

    });

    mostrarProductos(visibles);

}


function filtrarCategoria(id) {

    document.querySelectorAll(".chip").forEach(chip => {

        chip.classList.toggle("chip-active", Number(chip.dataset.cat) === id);

    });

    aplicarFiltros();

}


function mostrarProductos(productos) {

    const grid = document.getElementById("gridProductos");


    if (productos.length === 0) {

        grid.innerHTML = `
            <div class="empty-state">
                <p>🍩</p>
                <p>No encontramos postres con ese filtro</p>
            </div>
        `;

        return;

    }


    grid.innerHTML = productos.map(p => `

        <article class="product-card">

            <div class="product-emoji">${esc(p.imagen || "🧁")}</div>

            <span class="product-category">${esc(p.categoria)}</span>

            <h3>${esc(p.nombre)}</h3>

            <p class="product-desc">${esc(p.descripcion || "Sin descripción")}</p>

            <div class="product-footer">

                <strong class="product-price">${precioCOP(p.precio)}</strong>

                <button class="btn btn-add" onclick="agregarPorId(${p.id_producto})">
                    Agregar 🛒
                </button>

            </div>

        </article>

    `).join("");

}


function agregarPorId(id_producto) {

    const producto = estado.productos.find(p => p.id_producto === id_producto);

    if (producto) agregarAlCarrito(producto, 1);

}


async function cargarYMostrarProductos() {

    try {

        await cargarProductos();

        aplicarFiltros();

    } catch (error) {

        console.error("Error:", error);

        document.getElementById("gridProductos").innerHTML = `
            <div class="empty-state">
                <p>⚠️</p>
                <p>No se pudieron cargar los productos</p>
            </div>
        `;

    }

}


// ======================================
// VISTA: CARRITO / PAGAR
// ======================================

function renderPagar() {

    renderearEnlaces();

    cerrarCarrito();

    if (estado.carrito.length === 0) {

        app.innerHTML = `
            <section class="card simple-page">
                <h2>Tu carrito está vacío</h2>
                <p>Explora la tienda y agrega tus postres favoritos.</p>
                <a href="#/tienda" class="btn btn-primary">Ir a la tienda →</a>
            </section>
        `;

        return;
    }


    if (!estado.usuario) {

        app.innerHTML = `
            <section class="card simple-page">
                <h2>Necesitas iniciar sesión</h2>
                <p>Para realizar un pedido debes tener una cuenta de cliente.</p>
                <div class="form-buttons">
                    <a href="#/login" class="btn btn-primary">Iniciar sesión</a>
                    <a href="#/registro" class="btn btn-secondary">Crear cuenta</a>
                </div>
            </section>
        `;

        return;
    }


    if (estado.usuario.rol !== "cliente") {

        app.innerHTML = `
            <section class="card simple-page">
                <h2>Sesión de administrador</h2>
                <p>Las compras solo se realizan con una cuenta de cliente.</p>
                <a href="#/tienda" class="btn btn-secondary">Volver a la tienda</a>
            </section>
        `;

        return;
    }


    app.innerHTML = `
        <section class="card checkout-page">

            <h2>Finalizar pedido</h2>

            <p>Revisa tu carrito y confirma tu pedido.</p>

            <div class="checkout-grid">

                <div class="checkout-items">

                    ${estado.carrito.map(item => `

                        <div class="checkout-item">

                            <span class="cart-item-emoji">${esc(item.imagen)}</span>

                            <div class="cart-item-info">

                                <strong>${esc(item.nombre)}</strong>

                                <small>${item.cantidad} × ${precioCOP(item.precio)}</small>

                            </div>

                            <strong>${precioCOP(item.precio * item.cantidad)}</strong>

                        </div>

                    `).join("")}

                </div>


                <div class="checkout-summary">

                    <h3>Resumen</h3>

                    <div class="summary-row">
                        <span>Productos</span>
                        <span>${cantidadTotalCarrito()}</span>
                    </div>

                    <div class="summary-row">
                        <span>Envío</span>
                        <span>Gratis</span>
                    </div>

                    <div class="summary-row total">
                        <span>Total</span>
                        <strong>${precioCOP(totalCarrito())}</strong>
                    </div>

                    <button class="btn btn-primary btn-block btn-lg" id="btnConfirmarPedido">
                        Confirmar pedido ✅
                    </button>

                </div>

            </div>

        </section>
    `;


    document.getElementById("btnConfirmarPedido").addEventListener("click", async () => {

        try {

            const items = estado.carrito.map(item => ({
                id_producto: item.id_producto,
                cantidad: item.cantidad
            }));

            const resultado = await api("/api/pedidos", {
                metodo: "POST",
                cuerpo: { items }
            });

            estado.carrito = [];

            guardarCarrito();

            notificar(`¡${resultado.mensaje}! Tu pedido #${resultado.id_pedido} fue creado.`);

            location.hash = "#/pedidos";

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


// ======================================
// VISTA: LOGIN Y REGISTRO
// ======================================

function renderLogin() {

    renderearEnlaces();

    app.innerHTML = `

        <section class="card auth-page">

            <div class="auth-art">🍰</div>

            <h2>¡Bienvenido de nuevo!</h2>

            <p>Inicia sesión para ver tus pedidos y comprar más dulce.</p>

            <form id="formLogin">

                <div class="form-group">

                    <label for="loginEmail">Correo electrónico</label>

                    <input type="email" id="loginEmail" placeholder="tucorreo@ejemplo.com" required>

                </div>

                <div class="form-group">

                    <label for="loginPassword">Contraseña</label>

                    <input type="password" id="loginPassword" placeholder="••••••••" required>

                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg">Iniciar sesión</button>

            </form>

            <p class="auth-alt">
                ¿Aún no tienes cuenta?
                <a href="#/registro">Regístrate aquí</a>
            </p>

            <div class="demo-accounts">

                <p><strong>Cuentas de prueba:</strong></p>

                <button class="btn btn-ghost btn-sm" onclick="rellenarLogin('admin@horneado.com', 'admin123')">
                    👑 admin@horneado.com
                </button>

                <button class="btn btn-ghost btn-sm" onclick="rellenarLogin('cliente@horneado.com', 'cliente123')">
                    🧑 cliente@horneado.com
                </button>

            </div>

        </section>

    `;


    document.getElementById("formLogin").addEventListener("submit", async event => {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();

        const contrasena = document.getElementById("loginPassword").value;

        try {

            const respuesta = await api("/api/auth/login", {
                metodo: "POST",
                cuerpo: { email, contrasena }
            });

            estado.token = respuesta.token;

            estado.usuario = respuesta.usuario;

            guardarSesion();

            renderearEnlaces();

            notificar(`¡Hola, ${respuesta.usuario.nombre}!`);

            location.hash = respuesta.usuario.rol === "administrador" ? "#/admin" : "#/tienda";

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


function rellenarLogin(email, contrasena) {

    document.getElementById("loginEmail").value = email;

    document.getElementById("loginPassword").value = contrasena;

}


function renderRegistro() {

    renderearEnlaces();

    app.innerHTML = `

        <section class="card auth-page">

            <div class="auth-art">🧁</div>

            <h2>Crea tu cuenta</h2>

            <p>Únete a Horneado y comienza a pedir postres.</p>

            <form id="formRegistro">

                <div class="form-group">

                    <label for="regNombre">Nombre completo</label>

                    <input type="text" id="regNombre" placeholder="Ana María Pérez" required>

                </div>

                <div class="form-group">

                    <label for="regEmail">Correo electrónico</label>

                    <input type="email" id="regEmail" placeholder="tucorreo@ejemplo.com" required>

                </div>

                <div class="form-group">

                    <label for="regPassword">Contraseña (mín. 6 caracteres)</label>

                    <input type="password" id="regPassword" placeholder="••••••••" required minlength="6">

                </div>

                <div class="form-group">

                    <label for="regTelefono">Teléfono</label>

                    <input type="text" id="regTelefono" placeholder="300 000 0000">

                </div>

                <div class="form-group">

                    <label for="regDireccion">Dirección de entrega</label>

                    <input type="text" id="regDireccion" placeholder="Calle 123 # 45 - 67">

                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg">Crear cuenta</button>

            </form>

            <p class="auth-alt">
                ¿Ya tienes cuenta?
                <a href="#/login">Inicia sesión</a>
            </p>

        </section>

    `;


    document.getElementById("formRegistro").addEventListener("submit", async event => {

        event.preventDefault();

        const datos = {
            nombre: document.getElementById("regNombre").value.trim(),
            email: document.getElementById("regEmail").value.trim(),
            contrasena: document.getElementById("regPassword").value,
            telefono: document.getElementById("regTelefono").value.trim(),
            direccion: document.getElementById("regDireccion").value.trim()
        };

        try {

            const respuesta = await api("/api/auth/registro", {
                metodo: "POST",
                cuerpo: datos
            });

            estado.token = respuesta.token;

            estado.usuario = respuesta.usuario;

            guardarSesion();

            renderearEnlaces();

            notificar("¡Cuenta creada y sesión iniciada! 🎉");

            location.hash = "#/tienda";

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


// ======================================
// VISTA: MIS PEDIDOS
// ======================================

async function renderPedidos() {

    renderearEnlaces();

    if (!estado.usuario) {

        app.innerHTML = `

            <section class="card simple-page">

                <h2>Consulta tus pedidos</h2>

                <p>Inicia sesión para ver el estado de tus pedidos.</p>

                <div class="form-buttons">

                    <a href="#/login" class="btn btn-primary">Iniciar sesión</a>

                    <a href="#/registro" class="btn btn-secondary">Crear cuenta</a>

                </div>

            </section>

        `;

        return;

    }


    app.innerHTML = `

        <section class="card simple-page">

            <h2>📦 Mis pedidos</h2>

            <p>Estado y detalle de cada pedido realizado.</p>

            <div id="pedidosLista"><div class="spinner"></div></div>

        </section>

    `;


    try {

        const pedidos = await api("/api/pedidos");

        const lista = document.getElementById("pedidosLista");


        if (pedidos.length === 0) {

            lista.innerHTML = `

                <div class="empty-state">

                    <p>🧁</p>

                    <p>Aún no tienes pedidos</p>

                    <a href="#/tienda" class="btn btn-primary btn-sm">Ir a la tienda</a>

                </div>

            `;

            return;

        }


        lista.innerHTML = pedidos.map(pedido => `

            <div class="pedido-cards">

                <div class="pedido-row">

                    <div class="pedido-head">

                        <strong>Pedido #${pedido.id_pedido}</strong>

                        <span class="pedido-fecha">${fechaLegible(pedido.fecha)}</span>

                    </div>

                    <div class="pedido-body">

                        <span class="status ${estadoClase(pedido.estado)}">${esc(pedido.estado)}</span>

                        <strong>${precioCOP(pedido.total)}</strong>

                        <button class="btn btn-secondary btn-sm" onclick="verDetallePedido(${pedido.id_pedido})">
                            Ver detalle
                        </button>

                    </div>

                </div>

            </div>

        `).join("");

    } catch (error) {

        notificar(error.message, "error");

    }

}


// ======================================
// VISTA: PERFIL
// ======================================

function renderPerfil() {

    renderearEnlaces();

    if (!estado.usuario || estado.usuario.rol !== "cliente") {

        app.innerHTML = `

            <section class="card simple-page">

                <h2>Mi perfil</h2>

                <p>Inicia sesión con una cuenta de cliente para editar tu perfil.</p>

                <a href="#/login" class="btn btn-primary">Iniciar sesión</a>

            </section>

        `;

        return;
    }


    app.innerHTML = `

        <section class="card auth-page">

            <div class="auth-art">👤</div>

            <h2>Mi perfil</h2>

            <p>Actualiza tus datos de contacto.</p>

            <form id="formPerfil">

                <div class="form-group">

                    <label>Nombre</label>

                    <input type="text" value="${esc(estado.usuario.nombre)}" disabled>

                </div>

                <div class="form-group">

                    <label>Correo electrónico</label>

                    <input type="email" value="${esc(estado.usuario.email)}" disabled>

                </div>

                <div class="form-group">

                    <label for="perfilTelefono">Teléfono</label>

                    <input type="text" id="perfilTelefono" value="${esc(estado.usuario.telefono || "")}" placeholder="300 000 0000">

                </div>

                <div class="form-group">

                    <label for="perfilDireccion">Dirección de entrega</label>

                    <input type="text" id="perfilDireccion" value="${esc(estado.usuario.direccion || "")}" placeholder="Calle 123 # 45 - 67">

                </div>

                <button type="submit" class="btn btn-primary btn-block btn-lg">Guardar cambios</button>

            </form>

        </section>

    `;


    document.getElementById("formPerfil").addEventListener("submit", async event => {

        event.preventDefault();

        try {

            await api("/api/auth/perfil", {
                metodo: "PUT",
                cuerpo: {
                    nombre: estado.usuario.nombre,
                    telefono: document.getElementById("perfilTelefono").value.trim(),
                    direccion: document.getElementById("perfilDireccion").value.trim()
                }
            });

            estado.usuario = {
                ...estado.usuario,
                telefono: document.getElementById("perfilTelefono").value.trim(),
                direccion: document.getElementById("perfilDireccion").value.trim()
            };

            guardarSesion();

            renderearEnlaces();

            notificar("Perfil actualizado correctamente");

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


// ======================================
// UTILIDADES COMPARTIDAS ADMIN
// ======================================

function estadoClase(estado) {

    const mapa = {
        "Pendiente": "status-pending",
        "Confirmado": "status-confirmed",
        "En preparación": "status-preparing",
        "Enviado": "status-shipped",
        "Entregado": "status-delivered",
        "Cancelado": "status-cancelled"
    };

    return mapa[estado] || "status-pending";

}


function cerrarModal() {

    document.getElementById("modalOverlay").hidden = true;

    document.getElementById("modalBox").innerHTML = "";

}


function abrirModal(contenido) {

    document.getElementById("modalBox").innerHTML = contenido;

    document.getElementById("modalOverlay").hidden = false;

}


async function verDetallePedido(id) {

    abrirModal(`<div class="modal-loading"><div class="spinner"></div></div>`);

    try {

        const pedido = await api(`/api/pedidos/${id}`);

        abrirModal(`

            <div class="modal-head">

                <h3>Pedido #${pedido.id_pedido}</h3>

                <button class="drawer-close" onclick="cerrarModal()">✕</button>

            </div>

            <p class="modal-sub">${esc(pedido.cliente)} · ${fechaLegible(pedido.fecha)}</p>


            <div class="modal-grid">

                <div>

                    <p class="modal-label">Cliente</p>

                    <p>${esc(pedido.email_cliente)}</p>

                    <p class="modal-label">Teléfono</p>

                    <p>${esc(pedido.telefono || "—")}</p>

                    <p class="modal-label">Dirección</p>

                    <p>${esc(pedido.direccion || "—")}</p>

                </div>

                <div>

                    <p class="modal-label">Estado</p>

                    <span class="status ${estadoClase(pedido.estado)}">${esc(pedido.estado)}</span>

                </div>

            </div>


            <table class="modal-table">

                <thead>

                    <tr>

                        <th>Producto</th>

                        <th>Cant.</th>

                        <th>Precio</th>

                        <th>Subtotal</th>

                    </tr>

                </thead>

                <tbody>

                    ${(pedido.items || []).map(item => `

                        <tr>

                            <td>${esc(item.producto)}</td>

                            <td>${item.cantidad}</td>

                            <td>${precioCOP(item.precio_unitario)}</td>

                            <td>${precioCOP(item.subtotal)}</td>

                        </tr>

                    `).join("")}

                </tbody>

                <tfoot>

                    <tr>

                        <td colspan="3" class="right">Total</td>

                        <td><strong>${precioCOP(pedido.total)}</strong></td>

                    </tr>

                </tfoot>

            </table>

        `);

    } catch (error) {

        notificar(error.message, "error");

        cerrarModal();

    }

}


// ======================================
// VISTA: ADMINISTRACIÓN (dashboard)
// ======================================

async function renderAdmin() {

    renderearEnlaces();

    if (!estado.usuario || estado.usuario.rol !== "administrador") {

        app.innerHTML = `

            <section class="card simple-page">

                <h2>Acceso restringido</h2>

                <p>Necesitas una cuenta de administrador.</p>

                <a href="#/login" class="btn btn-primary">Iniciar sesión</a>

            </section>

        `;

        return;

    }


    app.innerHTML = `

        <div class="admin-layout">

            <aside class="admin-sidebar" id="adminSidebar">

                <h3>Panel de administración</h3>

                <nav>

                    <a href="#/admin" class="${rutaActual() === "#/admin" ? "active" : ""}">📊 Resumen</a>

                    <a href="#/admin/productos" class="${rutaActual() === "#/admin/productos" ? "active" : ""}">🧁 Productos</a>

                    <a href="#/admin/categorias" class="${rutaActual() === "#/admin/categorias" ? "active" : ""}">🏷️ Categorías</a>

                    <a href="#/admin/pedidos" class="${rutaActual() === "#/admin/pedidos" ? "active" : ""}">📦 Pedidos</a>

                    <a href="#/admin/ingredientes" class="${rutaActual() === "#/admin/ingredientes" ? "active" : ""}">🥚 Ingredientes</a>

                    <a href="#/admin/proveedores" class="${rutaActual() === "#/admin/proveedores" ? "active" : ""}">🚚 Proveedores</a>

                    <a href="#/admin/clientes" class="${rutaActual() === "#/admin/clientes" ? "active" : ""}">👥 Clientes</a>

                </nav>

            </aside>

            <div class="admin-content" id="adminContent">

                <div class="loading-screen"><div class="spinner"></div></div>

            </div>

        </div>

    `;


    const ruta = rutaActual();

    if (ruta === "#/admin") await renderAdminResumen();

    else if (ruta === "#/admin/productos") await renderAdminProductos();

    else if (ruta === "#/admin/categorias") await renderAdminCategorias();

    else if (ruta === "#/admin/pedidos") await renderAdminPedidos();

    else if (ruta === "#/admin/ingredientes") await renderAdminIngredientes();

    else if (ruta === "#/admin/proveedores") await renderAdminProveedores();

    else if (ruta === "#/admin/clientes") await renderAdminClientes();

}


async function renderAdminResumen() {

    const contenido = document.getElementById("adminContent");

    try {

        const stats = await api("/api/admin/estadisticas");

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>📊 Resumen</h2>

                <p>Estado general de la tienda</p>

            </div>

            <div class="stats-grid">

                <div class="stat-card">
                    <span class="stat-icon">💰</span>
                    <strong>${precioCOP(stats.total_ventas)}</strong>
                    <small>Ventas totales</small>
                </div>

                <div class="stat-card">
                    <span class="stat-icon">📦</span>
                    <strong>${stats.total_pedidos}</strong>
                    <small>Pedidos</small>
                </div>

                <div class="stat-card">
                    <span class="stat-icon">🧁</span>
                    <strong>${stats.total_productos}</strong>
                    <small>Productos</small>
                </div>

                <div class="stat-card">
                    <span class="stat-icon">👥</span>
                    <strong>${stats.total_clientes}</strong>
                    <small>Clientes</small>
                </div>

                <div class="stat-card">
                    <span class="stat-icon">🥚</span>
                    <strong>${stats.total_ingredientes}</strong>
                    <small>Ingredientes</small>
                </div>

                <div class="stat-card">
                    <span class="stat-icon">🚚</span>
                    <strong>${stats.total_proveedores}</strong>
                    <small>Proveedores</small>
                </div>

            </div>


            <div class="admin-two-cols">

                <div class="card sub-card">

                    <h3>Pedidos por estado</h3>

                    ${(stats.pedidos_por_estado.length ? stats.pedidos_por_estado.map(p => `

                        <div class="bar-row">

                            <span>${esc(p.estado)}</span>

                            <div class="bar-track">

                                <div class="bar-fill" style="width: ${porcentajeBarra(p.total, stats.total_pedidos)}%"></div>

                            </div>

                            <strong>${p.total}</strong>

                        </div>

                    `).join("") : "<p>Sin pedidos aún.</p>")}

                </div>

                <div class="card sub-card">

                    <h3>Productos más vendidos</h3>

                    ${(stats.productos_mas_vendidos.length ? stats.productos_mas_vendidos.map((p, i) => `

                        <div class="top-item">

                            <span class="top-rank">${i + 1}</span>

                            <span>${esc(p.producto)}</span>

                            <strong>${p.unidades} uds</strong>

                        </div>

                    `).join("") : "<p>Sin ventas aún.</p>")}

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


function porcentajeBarra(valor, total) {

    if (!total) return 0;

    return Math.round((valor / total) * 100);

}


// ======================================
// ADMIN: PRODUCTOS (CRUD)
// ======================================

async function renderAdminProductos() {

    const contenido = document.getElementById("adminContent");

    try {

        const [productos, categorias] = await Promise.all([
            api("/api/productos"),
            api("/api/categorias")
        ]);

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>🧁 Gestión de productos</h2>

                <button class="btn btn-primary btn-sm" onclick="abrirFormProducto(null, ${JSON.stringify(categorias)})">
                    + Nuevo producto
                </button>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Producto</th>

                                <th>Categoría</th>

                                <th>Precio</th>

                                <th>Estado</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${productos.map(p => `

                                <tr>

                                    <td>${p.id_producto}</td>

                                    <td><strong>${esc(p.imagen || "🧁")} ${esc(p.nombre)}</strong></td>

                                    <td>${esc(p.categoria || "—")}</td>

                                    <td>${precioCOP(p.precio)}</td>

                                    <td>
                                        ${p.disponibilidad === 1
                                            ? '<span class="status status-available">Disponible</span>'
                                            : '<span class="status status-unavailable">No disponible</span>'}
                                    </td>

                                    <td>

                                        <div class="actions">

                                            <button class="btn-edit" onclick="abrirFormProducto(${p.id_producto}, ${JSON.stringify(categorias)})">Editar</button>

                                            <button class="btn-delete" onclick="eliminarProductoAdmin(${p.id_producto})">Eliminar</button>

                                        </div>

                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


function abrirFormProducto(id, categorias) {

    const producto = id

        ? estado.productos.find(p => p.id_producto === id) || null

        : null;


    abrirModal(`

        <div class="modal-head">

            <h3>${id ? "Editar producto" : "Nuevo producto"}</h3>

            <button class="drawer-close" onclick="cerrarModal()">✕</button>

        </div>

        <form id="formProducto">

            <div class="form-group">

                <label>Nombre</label>

                <input type="text" id="ppNombre" value="${esc(producto?.nombre || "")}" required>

            </div>

            <div class="form-group">

                <label>Categoría</label>

                <select id="ppCategoria" required>

                    <option value="">Selecciona…</option>

                    ${categorias.map(c => `

                        <option value="${c.id_categoria}" ${producto?.id_categoria === c.id_categoria ? "selected" : ""}>
                            ${esc(c.nombre)}
                        </option>

                    `).join("")}

                </select>

            </div>

            <div class="form-group">

                <label>Precio</label>

                <input type="number" id="ppPrecio" value="${producto?.precio ?? ""}" min="0" required>

            </div>

            <div class="form-group">

                <label>Emoji / imagen</label>

                <input type="text" id="ppImagen" value="${esc(producto?.imagen || "")}" placeholder="Ej. 🎂">

            </div>

            <div class="form-group">

                <label>Descripción</label>

                <textarea id="ppDescripcion" rows="3">${esc(producto?.descripcion || "")}</textarea>

            </div>

            <label class="checkbox-line">

                <input type="checkbox" id="ppDisponible" ${producto?.disponibilidad === 1 || !producto ? "checked" : ""}>

                Producto disponible

            </label>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
                ${id ? "Guardar cambios" : "Crear producto"}
            </button>

        </form>

    `);


    document.getElementById("formProducto").addEventListener("submit", async event => {

        event.preventDefault();

        const datos = {

            id_categoria: Number(document.getElementById("ppCategoria").value),

            nombre: document.getElementById("ppNombre").value.trim(),

            descripcion: document.getElementById("ppDescripcion").value.trim(),

            precio: Number(document.getElementById("ppPrecio").value),

            imagen: document.getElementById("ppImagen").value.trim(),

            disponibilidad: document.getElementById("ppDisponible").checked

        };

        try {

            if (id) {

                await api(`/api/admin/productos/${id}`, { metodo: "PUT", cuerpo: datos });

                notificar("Producto actualizado");

            } else {

                await api("/api/admin/productos", { metodo: "POST", cuerpo: datos });

                notificar("Producto creado");

            }

            cerrarModal();

            estado.productos = await api("/api/productos");

            renderAdminProductos();

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


async function eliminarProductoAdmin(id) {

    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    try {

        await api(`/api/admin/productos/${id}`, { metodo: "DELETE" });

        notificar("Producto eliminado");

        estado.productos = await api("/api/productos");

        renderAdminProductos();

    } catch (error) {

        notificar(error.message, "error");

    }

}


// ======================================
// ADMIN: CATEGORÍAS (CRUD)
// ======================================

async function renderAdminCategorias() {

    const contenido = document.getElementById("adminContent");

    try {

        const categorias = await api("/api/categorias");

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>🏷️ Gestión de categorías</h2>

                <button class="btn btn-primary btn-sm" onclick="abrirFormCategoria(null)">+ Nueva categoría</button>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Nombre</th>

                                <th>Descripción</th>

                                <th>Productos</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${categorias.map(c => `

                                <tr>

                                    <td>${c.id_categoria}</td>

                                    <td><strong>${esc(c.nombre)}</strong></td>

                                    <td>${esc(c.descripcion || "—")}</td>

                                    <td>${c.total_productos}</td>

                                    <td>

                                        <div class="actions">

                                            <button class="btn-edit" onclick="abrirFormCategoria(${JSON.stringify(c)})">Editar</button>

                                            <button class="btn-delete" onclick="eliminarCategoriaAdmin(${c.id_categoria})">Eliminar</button>

                                        </div>

                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


function abrirFormCategoria(categoria) {

    abrirModal(`

        <div class="modal-head">

            <h3>${categoria ? "Editar categoría" : "Nueva categoría"}</h3>

            <button class="drawer-close" onclick="cerrarModal()">✕</button>

        </div>

        <form id="formCategoria">

            <div class="form-group">

                <label>Nombre</label>

                <input type="text" id="catNombre" value="${esc(categoria?.nombre || "")}" required>

            </div>

            <div class="form-group">

                <label>Descripción</label>

                <textarea id="catDescripcion" rows="3">${esc(categoria?.descripcion || "")}</textarea>

            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
                ${categoria ? "Guardar cambios" : "Crear categoría"}
            </button>

        </form>

    `);


    document.getElementById("formCategoria").addEventListener("submit", async event => {

        event.preventDefault();

        const datos = {

            nombre: document.getElementById("catNombre").value.trim(),

            descripcion: document.getElementById("catDescripcion").value.trim()

        };

        try {

            if (categoria) {

                await api(`/api/admin/categorias/${categoria.id_categoria}`, { metodo: "PUT", cuerpo: datos });

                notificar("Categoría actualizada");

            } else {

                await api("/api/admin/categorias", { metodo: "POST", cuerpo: datos });

                notificar("Categoría creada");

            }

            cerrarModal();

            estado.categorias = await api("/api/categorias");

            renderAdminCategorias();

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


async function eliminarCategoriaAdmin(id) {

    if (!confirm("¿Seguro que quieres eliminar esta categoría? Sus productos quedarán sin categoría.")) return;

    try {

        await api(`/api/admin/categorias/${id}`, { metodo: "DELETE" });

        notificar("Categoría eliminada");

        estado.categorias = await api("/api/categorias");

        renderAdminCategorias();

    } catch (error) {

        notificar(error.message, "error");

    }

}


// ======================================
// ADMIN: PEDIDOS
// ======================================

async function renderAdminPedidos() {

    const contenido = document.getElementById("adminContent");

    try {

        const pedidos = await api("/api/pedidos");

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>📦 Gestión de pedidos</h2>

                <p>Consulta y actualiza el estado de los pedidos</p>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Cliente</th>

                                <th>Fecha</th>

                                <th>Total</th>

                                <th>Estado</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${pedidos.map(p => `

                                <tr>

                                    <td>${p.id_pedido}</td>

                                    <td><strong>${esc(p.cliente)}</strong></td>

                                    <td>${fechaLegible(p.fecha)}</td>

                                    <td>${precioCOP(p.total)}</td>

                                    <td>

                                        <select class="estado-select ${estadoClase(p.estado)}" onchange="cambiarEstadoPedido(${p.id_pedido}, this.value)">

                                            ${["Pendiente", "Confirmado", "En preparación", "Enviado", "Entregado", "Cancelado"]

                                                .map(est => `<option ${p.estado === est ? "selected" : ""}>${est}</option>`)

                                                .join("")}

                                        </select>

                                    </td>

                                    <td>

                                        <button class="btn-edit" onclick="verDetallePedido(${p.id_pedido})">Ver</button>

                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


async function cambiarEstadoPedido(id, estado) {

    try {

        await api(`/api/admin/pedidos/${id}/estado`, {

            metodo: "PUT",

            cuerpo: { estado }

        });

        notificar(`Pedido #${id} marcado como "${estado}"`);

    } catch (error) {

        notificar(error.message, "error");

        renderAdminPedidos();

    }

}


// ======================================
// ADMIN: INGREDIENTES + INVENTARIO
// ======================================

async function renderAdminIngredientes() {

    const contenido = document.getElementById("adminContent");

    try {

        const [ingredientes, proveedores] = await Promise.all([

            api("/api/admin/ingredientes"),

            api("/api/admin/proveedores")

        ]);

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>🥚 Ingredientes y stock</h2>

                <button class="btn btn-primary btn-sm" onclick="abrirFormIngrediente(null, ${JSON.stringify(proveedores)})">
                    + Nuevo ingrediente
                </button>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Ingrediente</th>

                                <th>Unidad</th>

                                <th>Proveedor</th>

                                <th>Stock</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${ingredientes.map(i => `

                                <tr>

                                    <td>${i.id_ingrediente}</td>

                                    <td><strong>${esc(i.nombre)}</strong></td>

                                    <td>${esc(i.unidad)}</td>

                                    <td>${esc(i.proveedor || "—")}</td>

                                    <td>

                                        <span class="stock-pill ${Number(i.stock) === 0 ? "stock-bajo" : ""}">${i.stock} ${esc(i.unidad)}</span>

                                    </td>

                                    <td>

                                        <div class="actions">

                                            <button class="btn-edit" onclick="abrirFormIngrediente(${JSON.stringify(i)}, ${JSON.stringify(proveedores)})">Editar</button>

                                            <button class="btn-edit" onclick="actualizarStock(${i.id_ingrediente}, ${i.stock}, '${esc(i.nombre)}')">Stock</button>

                                            <button class="btn-delete" onclick="eliminarIngredienteAdmin(${i.id_ingrediente})">Eliminar</button>

                                        </div>

                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


function abrirFormIngrediente(ingrediente, proveedores) {

    abrirModal(`

        <div class="modal-head">

            <h3>${ingrediente ? "Editar ingrediente" : "Nuevo ingrediente"}</h3>

            <button class="drawer-close" onclick="cerrarModal()">✕</button>

        </div>

        <form id="formIngrediente">

            <div class="form-group">

                <label>Nombre</label>

                <input type="text" id="ingNombre" value="${esc(ingrediente?.nombre || "")}" required>

            </div>

            <div class="form-group">

                <label>Unidad</label>

                <select id="ingUnidad">

                    ${["unidades", "kg", "gramos", "litros", "mililitros"].map(u => `
                        <option ${ingrediente?.unidad === u ? "selected" : ""}>${u}</option>
                    `).join("")}

                </select>

            </div>

            <div class="form-group">

                <label>Proveedor</label>

                <select id="ingProveedor">

                    <option value="">Sin proveedor</option>

                    ${proveedores.map(p => `
                        <option value="${p.id_proveedor}" ${ingrediente?.id_proveedor === p.id_proveedor ? "selected" : ""}>
                            ${esc(p.nombre)}
                        </option>
                    `).join("")}

                </select>

            </div>

            <div class="form-group" id="grupoStockInicial" ${ingrediente ? "hidden" : ""}>

                <label>Stock inicial</label>

                <input type="number" id="ingStock" min="0" value="0">

            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
                ${ingrediente ? "Guardar cambios" : "Crear ingrediente"}
            </button>

        </form>

    `);


    document.getElementById("formIngrediente").addEventListener("submit", async event => {

        event.preventDefault();

        const datos = {

            nombre: document.getElementById("ingNombre").value.trim(),

            unidad: document.getElementById("ingUnidad").value,

            id_proveedor: Number(document.getElementById("ingProveedor").value) || null,

            cantidad_inicial: Number(document.getElementById("ingStock").value) || 0

        };

        try {

            if (ingrediente) {

                await api(`/api/admin/ingredientes/${ingrediente.id_ingrediente}`, { metodo: "PUT", cuerpo: datos });

                notificar("Ingrediente actualizado");

            } else {

                await api("/api/admin/ingredientes", { metodo: "POST", cuerpo: datos });

                notificar("Ingrediente creado");

            }

            cerrarModal();

            renderAdminIngredientes();

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


function actualizarStock(id, stockActual, nombre) {

    abrirModal(`

        <div class="modal-head">

            <h3>Actualizar stock</h3>

            <button class="drawer-close" onclick="cerrarModal()">✕</button>

        </div>

        <p class="modal-sub">${esc(nombre)}</p>

        <form id="formStock">

            <div class="form-group">

                <label>Cantidad en inventario</label>

                <input type="number" id="stockCantidad" min="0" step="0.1" value="${stockActual}" required>

            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">Guardar stock</button>

        </form>

    `);


    document.getElementById("formStock").addEventListener("submit", async event => {

        event.preventDefault();

        try {

            await api(`/api/admin/inventario/${id}`, {

                metodo: "PUT",

                cuerpo: { cantidad: Number(document.getElementById("stockCantidad").value) }

            });

            notificar("Inventario actualizado");

            cerrarModal();

            renderAdminIngredientes();

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


async function eliminarIngredienteAdmin(id) {

    if (!confirm("¿Seguro que quieres eliminar este ingrediente?")) return;

    try {

        await api(`/api/admin/ingredientes/${id}`, { metodo: "DELETE" });

        notificar("Ingrediente eliminado");

        renderAdminIngredientes();

    } catch (error) {

        notificar(error.message, "error");

    }

}


// ======================================
// ADMIN: PROVEEDORES (CRUD)
// ======================================

async function renderAdminProveedores() {

    const contenido = document.getElementById("adminContent");

    try {

        const proveedores = await api("/api/admin/proveedores");

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>🚚 Gestión de proveedores</h2>

                <button class="btn btn-primary btn-sm" onclick="abrirFormProveedor(null)">+ Nuevo proveedor</button>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Nombre</th>

                                <th>Contacto</th>

                                <th>Teléfono</th>

                                <th>Email</th>

                                <th>Ingredientes</th>

                                <th>Acciones</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${proveedores.map(p => `

                                <tr>

                                    <td>${p.id_proveedor}</td>

                                    <td><strong>${esc(p.nombre)}</strong></td>

                                    <td>${esc(p.contacto || "—")}</td>

                                    <td>${esc(p.telefono || "—")}</td>

                                    <td>${esc(p.email || "—")}</td>

                                    <td>${p.total_ingredientes}</td>

                                    <td>

                                        <div class="actions">

                                            <button class="btn-edit" onclick="abrirFormProveedor(${JSON.stringify(p)})">Editar</button>

                                            <button class="btn-delete" onclick="eliminarProveedorAdmin(${p.id_proveedor})">Eliminar</button>

                                        </div>

                                    </td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


function abrirFormProveedor(proveedor) {

    abrirModal(`

        <div class="modal-head">

            <h3>${proveedor ? "Editar proveedor" : "Nuevo proveedor"}</h3>

            <button class="drawer-close" onclick="cerrarModal()">✕</button>

        </div>

        <form id="formProveedor">

            <div class="form-group">

                <label>Nombre</label>

                <input type="text" id="provNombre" value="${esc(proveedor?.nombre || "")}" required>

            </div>

            <div class="form-group">

                <label>Contacto</label>

                <input type="text" id="provContacto" value="${esc(proveedor?.contacto || "")}">

            </div>

            <div class="form-group">

                <label>Teléfono</label>

                <input type="text" id="provTelefono" value="${esc(proveedor?.telefono || "")}">

            </div>

            <div class="form-group">

                <label>Email</label>

                <input type="email" id="provEmail" value="${esc(proveedor?.email || "")}">

            </div>

            <button type="submit" class="btn btn-primary btn-block btn-lg">
                ${proveedor ? "Guardar cambios" : "Crear proveedor"}
            </button>

        </form>

    `);


    document.getElementById("formProveedor").addEventListener("submit", async event => {

        event.preventDefault();

        const datos = {

            nombre: document.getElementById("provNombre").value.trim(),

            contacto: document.getElementById("provContacto").value.trim(),

            telefono: document.getElementById("provTelefono").value.trim(),

            email: document.getElementById("provEmail").value.trim()

        };

        try {

            if (proveedor) {

                await api(`/api/admin/proveedores/${proveedor.id_proveedor}`, { metodo: "PUT", cuerpo: datos });

                notificar("Proveedor actualizado");

            } else {

                await api("/api/admin/proveedores", { metodo: "POST", cuerpo: datos });

                notificar("Proveedor creado");

            }

            cerrarModal();

            renderAdminProveedores();

        } catch (error) {

            notificar(error.message, "error");

        }

    });

}


async function eliminarProveedorAdmin(id) {

    if (!confirm("¿Seguro que quieres eliminar este proveedor?")) return;

    try {

        await api(`/api/admin/proveedores/${id}`, { metodo: "DELETE" });

        notificar("Proveedor eliminado");

        renderAdminProveedores();

    } catch (error) {

        notificar(error.message, "error");

    }

}


// ======================================
// ADMIN: CLIENTES
// ======================================

async function renderAdminClientes() {

    const contenido = document.getElementById("adminContent");

    try {

        const clientes = await api("/api/admin/clientes");

        contenido.innerHTML = `

            <div class="admin-heading">

                <h2>👥 Clientes registrados</h2>

                <p>${clientes.length} clientes en la plataforma</p>

            </div>

            <div class="card table-card">

                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>ID</th>

                                <th>Nombre</th>

                                <th>Email</th>

                                <th>Teléfono</th>

                                <th>Dirección</th>

                                <th>Pedidos</th>

                            </tr>

                        </thead>

                        <tbody>

                            ${clientes.map(c => `

                                <tr>

                                    <td>${c.id_cliente}</td>

                                    <td><strong>${esc(c.nombre)}</strong></td>

                                    <td>${esc(c.email)}</td>

                                    <td>${esc(c.telefono || "—")}</td>

                                    <td>${esc(c.direccion || "—")}</td>

                                    <td>${c.total_pedidos}</td>

                                </tr>

                            `).join("")}

                        </tbody>

                    </table>

                </div>

            </div>

        `;

    } catch (error) {

        contenido.innerHTML = `<p class="error-text">${esc(error.message)}</p>`;

    }

}


// ======================================
// CERRAR SESIÓN
// ======================================

async function cerrarSesion() {

    try {

        await api("/api/auth/logout", { metodo: "POST" });

    } catch (_) { /* sin importar */ }

    estado.token = null;

    estado.usuario = null;

    guardarSesion();

    renderearEnlaces();

    notificar("Sesión cerrada");

    location.hash = "#/tienda";

}


// ======================================
// ROUTER
// ======================================

function rutaActual() {

    return location.hash || "#/tienda";

}


const rutas = {

    "#/": renderTienda,

    "#/tienda": renderTienda,

    "#/login": renderLogin,

    "#/registro": renderRegistro,

    "#/carrito": renderPagar,

    "#/checkout": renderPagar,

    "#/pedidos": renderPedidos,

    "#/perfil": renderPerfil,

    "#/admin": renderAdmin,

    "#/admin/productos": renderAdmin,

    "#/admin/categorias": renderAdmin,

    "#/admin/pedidos": renderAdmin,

    "#/admin/ingredientes": renderAdmin,

    "#/admin/proveedores": renderAdmin,

    "#/admin/clientes": renderAdmin

};


let renderEnCurso = false;

let ultimaRuta = "";


async function navegar() {

    const ruta = rutaActual();

    cerrarMenu();

    cerrarCarrito();

    cerrarModal();

    const renderizador = rutas[ruta] || renderTienda;

    ultimaRuta = ruta;

    renderEnCurso = true;

    await renderizador();

    renderEnCurso = false;

    window.scrollTo({ top: 0 });

}


// Util para evitar errores de renderizado encadenado
function closesafe() { /* noop */ }


// ======================================
// EVENTOS GLOBALES
// ======================================

document.getElementById("btnCarrito").addEventListener("click", abrirCarrito);

document.getElementById("btnCerrarCarrito").addEventListener("click", cerrarCarrito);

document.getElementById("drawerOverlay").addEventListener("click", cerrarCarrito);

document.getElementById("modalOverlay").addEventListener("click", event => {

    if (event.target.id === "modalOverlay") cerrarModal();

});

document.addEventListener("click", () => cerrarMenu());

window.addEventListener("hashchange", navegar);


// ======================================
// INICIO
// ======================================

(async function iniciar() {

    // Carga inicial de categorías para el catálogo
    try {

        estado.categorias = await api("/api/categorias");

    } catch (_) {

        estado.categorias = [];

    }

    actualizarBadgeCarrito();

    await navegar();

})();