import test from 'node:test';
import assert from 'node:assert/strict';
import { construirUniverso, calcularSla, diasHabilesEntre, clasificarSla } from '../public/assets/js/despachos-reglas.js';
import { getDispatchData } from '../server/bodega-despachos.mjs';
const periodo={fechaInicio:'2026-10-01'};
const factura=(extra={})=>({NumeroFactura:'100',FechaEmision:'2026-11-13',tipoFactura:'Pendiente de entrega',Estatus:'Cerrada',Articulos:[{CodigoArticulo:'R1',Cantidad:2,TotalLinea:50}],...extra});
test('los pendientes se seleccionan por tipo, no por estado de factura',()=>{
 const {documentos}=construirUniverso({facturas:[factura(),factura({NumeroFactura:'101',tipoFactura:'Entrega completada',Estatus:'Abierta'})],solicitudes:[],periodo,hoy:'2026-11-20'});
 assert.equal(documentos.length,1);assert.equal(documentos[0].documento,'100');assert.equal(documentos[0].unidades,2);assert.equal(documentos[0].total,50);
});
test('STR se agrupa por documento y conserva cantidades y bodegas',()=>{
 const line={documento:55,fecha:'2026-10-15',bodegaorigen:'B16',bodegadestino:'B80',cantidad:2,modelo:'R1'};
 const {documentos}=construirUniverso({facturas:[],solicitudes:[line,{...line,cantidad:3,modelo:'R2'}],periodo,hoy:'2026-11-20'});
 assert.equal(documentos.length,1);assert.equal(documentos[0].unidades,5);assert.equal(documentos[0].articulos.length,2);assert.equal(documentos[0].bodegas,'B16 -> B80');
});
test('el período acumula octubre y noviembre y excluye fechas futuras',()=>{
 const {documentos}=construirUniverso({facturas:[factura({FechaEmision:'2026-10-01'}),factura({NumeroFactura:2,FechaEmision:'2026-11-20'}),factura({NumeroFactura:3,FechaEmision:'2026-11-21'}),factura({NumeroFactura:4,FechaEmision:'2026-09-30'})],solicitudes:[],periodo,hoy:'2026-11-20'});
 assert.equal(documentos.length,2);
});
test('días hábiles y límites exactos del código recibido',()=>{
 assert.equal(diasHabilesEntre('2026-11-13','2026-11-16'),1);
 assert.equal(diasHabilesEntre('2026-11-13','2026-11-15'),0);
 assert.deepEqual([0,1,2,3,4].map(clasificarSla),['En tiempo','En tiempo','Por vencer','Por vencer','Vencido']);
 const sla=calcularSla([{estado:'En tiempo',tipo:'STR',unidades:1,total:0},{estado:'Por vencer',tipo:'Reserva',unidades:1,total:5},{estado:'Vencido',tipo:'STR',unidades:1,total:0}]);assert.equal(sla.dentroDeSla,2);assert.equal(sla.total,3);assert.equal(calcularSla([]).porcentaje,100);
});
const env={SAP_API_KEY:'test-only',SAP_API_URL:'https://sap.test/api'};
test('servicio consulta ambos países y no devuelve credenciales',async()=>{
 const requests=[];const fetchImpl=async(url,options)=>{requests.push({url:new URL(url),options});return new Response(JSON.stringify(String(url).includes('facturasyear')?[factura()]:[]));};
 const data=await getDispatchData({env,fetchImpl,today:'2026-11-20'});
 assert.equal(data.ok,true);assert.equal(data.paises.length,2);assert.equal(requests.length,4);assert.ok(requests.every(r=>r.options.headers['X-API-KEY']==='test-only'));assert.ok(!JSON.stringify(data).includes('test-only'));assert.deepEqual(data.paises.map(p=>p.documentos[0].pais),['GT','SV']);
});
test('404 vacío en STR es distinto de error de origen',async()=>{
 const fetchImpl=async url=>String(url).includes('solicitudtraslado')?new Response('',{status:404}):new Response('[]');
 const data=await getDispatchData({country:'GT',env,fetchImpl,today:'2026-11-20'});assert.equal(data.paises[0].strSinDatos,true);assert.equal(data.paises[0].ok,true);
 const failed=await getDispatchData({country:'GT',env,fetchImpl:async()=>new Response('error',{status:500}),today:'2026-11-20'});assert.equal(failed.paises[0].ok,false);assert.ok(!('documentos' in failed.paises[0]));
});
test('error parcial no se convierte en país con cero pendientes',async()=>{
 const data=await getDispatchData({env,today:'2026-11-20',fetchImpl:async url=>String(url).includes('var_pais=SV')?new Response('',{status:500}):new Response('[]')});assert.equal(data.parcial,true);assert.equal(data.paises[0].ok,true);assert.equal(data.paises[1].ok,false);
});
test('cambio de año consulta todos los años acumulados',async()=>{
 const urls=[];await getDispatchData({country:'GT',env,today:'2027-01-04',fetchImpl:async url=>{urls.push(new URL(url));return new Response('[]');}});assert.deepEqual(urls.filter(u=>u.pathname.endsWith('facturasyear')).map(u=>u.searchParams.get('year')),['2026','2027']);
});
