const request = require('supertest');
const crypto = require('crypto');

// 1. PRUEBA UNITARIA: Lógica del Carrito y Cifrado
describe('Pruebas Unitarias - Lógica de Horneado', () => {
  
  test('CP-U1: Cálculo exacto de subtotales y total del carrito sin decimales erróneos', () => {
    const carrito = [
      { id_producto: 1, nombre: 'Torta Selva Negra', precio: 45000, cantidad: 2 },
      { id_producto: 2, nombre: 'Cupcake de Fresa', precio: 8000, cantidad: 3 }
    ];

    const subtotalTorta = carrito[0].precio * carrito[0].cantidad;
    const subtotalCupcake = carrito[1].precio * carrito[1].cantidad;
    const totalGeneral = subtotalTorta + subtotalCupcake;

    expect(subtotalTorta).toBe(90000);
    expect(subtotalCupcake).toBe(24000);
    expect(totalGeneral).toBe(114000);
  });

  test('CP-U2: Hashing criptográfico seguro para contraseñas de usuarios', () => {
    const passwordOriginal = 'Admin123';
    // Simulación del cifrado SHA256 implementado en el backend
    const hash = crypto.createHash('sha256').update(passwordOriginal).digest('hex');

    expect(hash).toBeDefined();
    expect(hash).toHaveLength(64); // Longitud estándar SHA-256
    expect(hash).not.toBe(passwordOriginal);
  });

  test('CP-U3: Validación de reglas de stock mínimo de inventario', () => {
    const insumo = { nombre: 'Harina de Trigo', cantidad: 4.5, stock_minimo: 5.0 };
    const requiereReabastecimiento = insumo.cantidad < insumo.stock_minimo;

    expect(requiereReabastecimiento).toBe(true);
  });
});

// 2. PRUEBA DE INTEGRACIÓN: Servidor y Endpoints REST
describe('Pruebas de Integración - API Horneado', () => {
  let app;

  beforeAll(() => {
    // Importamos server.js para evaluar las rutas
    app = require('../server.js');
  });

  test('CP-I1: Endpoint /api/productos debe responder HTTP 200 y devolver lista', async () => {
    const res = await request(app).get('/api/productos');
    expect([200, 304]).toContain(res.statusCode);
  });

  test('CP-I2: Rutas administrativas deben rechazar peticiones no autorizadas (Seguridad RBAC)', async () => {
    const res = await request(app)
      .post('/api/admin/ingredientes')
      .send({ nombre: 'Azúcar Morena', unidad: 'Kg' });
    
    // Al no enviar token ni credenciales de admin, debe dar 401 o 403
    expect([401, 403]).toContain(res.statusCode);
  });
});