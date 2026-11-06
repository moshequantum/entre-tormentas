// Worker `entre-tormentas-archivo`: solo sirve el HTML estático del histórico.
// Lo invoca el Worker principal por service binding cuando una URL no existe en el build vivo.
export default {
  fetch(request, env) {
    return env.ASSETS.fetch(request);
  },
};
