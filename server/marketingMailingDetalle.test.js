import assert from 'node:assert/strict'
import test from 'node:test'
import { crearDetalleMailing } from './marketingMailingDetalle.js'

const filas = [{
  canal: 'mailing',
  campanaId: '101',
  campanaNombre: 'Campaña sintética',
  correo: 'persona@example.test',
  fechaEnvio: '2026-03-10T09:00:00',
  fechaEntrega: '2026-03-10T09:00:00',
  fechaReboteDuro: null,
  fechaReboteSuave: null,
  fechaApertura: null,
  fechaBaja: null,
  fechaQueja: null,
  motivoReboteDuro: '',
  motivoReboteSuave: '',
  aperturaReal: false,
  aperturasTotales: 0,
  aperturasApple: 0,
  clicsTotales: 0,
  baja: false,
  queja: false,
  enlaces: [],
}]

test('la lista por persona se entrega sin pedir clave adicional', async () => {
  const obtenerDetalle = crearDetalleMailing({
    fuenteDrive: async () => ({ filas, cache: null }),
  })

  const respuesta = await obtenerDetalle(
    { method: 'GET', campana: '101', vista: 'metricas' },
    { env: { GOOGLE_SERVICE_ACCOUNT_JSON: 'test', MARKETING_DRIVE_FOLDER_ID: 'test' } },
  )

  assert.equal(respuesta.status, 200)
  assert.equal(JSON.parse(respuesta.body).personas[0].correo, 'persona@example.test')
})
