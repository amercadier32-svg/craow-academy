// Mini-chargeur de modules (format « System.register ») pour E2-Academy.html.
// Chaque morceau de l'app est rangé dans la page en texte (<script type="text/plain" data-c="…">) :
// le navigateur ne le lit pas. Il n'est exécuté qu'au moment où l'app l'ouvre (module.import).
(function () {
  var reg = {}, dernier = null;
  var S = (window.System = {
    register: function (deps, declare) { dernier = [deps, declare]; },
  });
  function nom(id) { return String(id).replace(/^.*\//, ""); }
  function executerTexte(n, texte) {
    dernier = null;
    var s = document.createElement("script");
    s.text = texte + "\n//# sourceURL=assets/" + n;
    document.head.appendChild(s);
    s.remove();
    if (!dernier) { (0, Function)(texte)(); }   // si la page interdit les scripts ajoutés, on essaie autrement
    if (!dernier) throw new Error("Module " + n + " introuvable");
    var d = dernier; dernier = null; return d;
  }
  function obtenir(n) {
    var r = reg[n];
    if (r) return r;
    var el = document.querySelector('script[data-c="' + n + '"]');
    if (!el) throw new Error("Module " + n + " absent de la page");
    var texte = el.textContent; el.remove();   // le texte n'est plus utile une fois lu
    var d = executerTexte(n, texte);
    var ns = Object.create(null);
    r = reg[n] = { ns: ns, importeurs: [], fait: false, deps: [], execute: null };
    var exporter = function (k, v) {
      if (typeof k === "object" && k) { for (var x in k) ns[x] = k[x]; } else ns[k] = v;
      for (var i = 0; i < r.importeurs.length; i++) r.importeurs[i](ns);
      return typeof k === "object" ? k : v;
    };
    var ctx = { import: function (id) { return S.import(nom(id)); }, meta: { url: new URL("assets/" + n, document.baseURI).href } };
    var decl = d[1](exporter, ctx) || {};
    r.execute = decl.execute;
    var setters = decl.setters || [];
    r.deps = d[0].map(nom);
    for (var i = 0; i < r.deps.length; i++) {
      var dr = obtenir(r.deps[i]);
      if (setters[i]) { dr.importeurs.push(setters[i]); setters[i](dr.ns); }
    }
    return r;
  }
  function executer(r) {
    if (r.fait) return;
    r.fait = true;
    for (var i = 0; i < r.deps.length; i++) executer(reg[r.deps[i]]);
    if (r.execute) r.execute.call(undefined);
  }
  S.import = function (n) {
    return new Promise(function (ok) { var r = obtenir(nom(n)); executer(r); ok(r.ns); });
  };
})();
