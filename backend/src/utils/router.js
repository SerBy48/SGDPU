import { Router as ExpressRouter } from 'express';

// Express 4 no captura las promesas rechazadas de los handlers async: un error
// de base de datos (p. ej. un id no numérico en la URL, una FK inexistente o un
// Error lanzado dentro de withTransaction sin try/catch) terminaba como
// "unhandledRejection", que en Node 15+ detiene el proceso completo.
// Este Router envuelve cada handler para enviar el error al middleware de
// errores de server.js mediante next(err).
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all', 'use'];

function wrap(handler) {
  if (typeof handler !== 'function' || handler.length === 4) return handler;
  return function wrapped(req, res, next) {
    try {
      const out = handler(req, res, next);
      if (out && typeof out.catch === 'function') out.catch(next);
    } catch (e) {
      next(e);
    }
  };
}

export function Router(options) {
  const router = ExpressRouter(options);
  for (const m of METHODS) {
    const original = router[m].bind(router);
    router[m] = (...args) => original(...args.map(a => (Array.isArray(a) ? a.map(wrap) : wrap(a))));
  }
  return router;
}
