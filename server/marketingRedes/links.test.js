// Pruebas de los links: redirección l.facebook.com, red del link y clave para comparar (DECISIONES D10).
import assert from 'node:assert/strict'
import test from 'node:test'
import { claveLink, linkReal, redDelLink } from './links.js'

test('extrae y decodifica el link real de l.facebook.com/l.php?u=…', () => {
  const real = 'https://www.instagram.com/p/DdKWue_G074/?fbclid=IwcGRvZg'
  const redireccion = `https://l.facebook.com/l.php?u=${encodeURIComponent(real)}&h=AUAoMnahnYhTo`
  assert.equal(linkReal(redireccion), real)
  // El caso real del Excel (GT 11/09, Instagram), ya codificado con %3A %2F
  assert.equal(
    linkReal('https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.instagram.com%2Fp%2FDdKWue_G074%2F%3Ffbclid%3DIwcGRvZg&h=AUAo'),
    'https://www.instagram.com/p/DdKWue_G074/?fbclid=IwcGRvZg',
  )
})

test('un link normal no cambia; vacío → null', () => {
  assert.equal(linkReal(' https://www.facebook.com/photo?fbid=1 '), 'https://www.facebook.com/photo?fbid=1')
  assert.equal(linkReal(''), null)
  assert.equal(linkReal(null), null)
  assert.equal(linkReal('no es un link'), 'no es un link')
})

test('red del link', () => {
  assert.equal(redDelLink('https://www.instagram.com/p/ABC/'), 'Instagram')
  assert.equal(redDelLink('https://www.facebook.com/permalink.php?story_fbid=1&id=2'), 'Facebook')
  assert.equal(redDelLink('https://m.facebook.com/photo?fbid=1'), 'Facebook')
  assert.equal(redDelLink('https://ejemplo.com'), null)
})

test('clave del link: ignora fbclid/locale pero respeta lo que identifica el post', () => {
  assert.equal(claveLink('https://www.instagram.com/p/ABC/?fbclid=1'), claveLink('https://instagram.com/p/ABC?utm_source=x'))
  assert.equal(claveLink('https://www.facebook.com/photo/?fbid=10&set=a.1&locale=es_LA'), claveLink('https://www.facebook.com/photo?fbid=10'))
  assert.notEqual(claveLink('https://www.facebook.com/permalink.php?story_fbid=1&id=2'), claveLink('https://www.facebook.com/permalink.php?story_fbid=3&id=2'))
})
