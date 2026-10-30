// Version en ligne : copie hors ligne et message « Nouvelle version disponible, recharger ? ».
(function () {
  if (!("serviceWorker" in navigator)) return;
  var montre = false;
  function bandeau(sw) {
    if (montre) return; montre = true;
    var d = document.createElement("div");
    d.className = "maj-dispo"; d.setAttribute("role", "status");
    d.innerHTML = '<span>Nouvelle version disponible, recharger ?</span>'
      + '<button type="button" class="px-btn green">Recharger</button>'
      + '<button type="button" class="e2-ui-btn">Plus tard</button>';
    d.children[1].onclick = function () { d.children[1].textContent = "Mise à jour…"; sw.postMessage("installer"); };
    d.children[2].onclick = function () { d.remove(); montre = false; };
    document.body.appendChild(d);
  }
  var recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (montre && !recharge) { recharge = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js").then(function (reg) {
    function suivre(sw) {
      if (!sw) return;
      var pret = function () { if (sw.state === "installed" && navigator.serviceWorker.controller) bandeau(sw); };
      pret(); sw.addEventListener("statechange", pret);
    }
    suivre(reg.waiting);
    reg.addEventListener("updatefound", function () { suivre(reg.installing); });
    // regarde s'il y a du nouveau : à l'ouverture, au retour sur l'app et toutes les 30 minutes
    var verifier = function () { reg.update().catch(function () {}); };
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") verifier(); });
    setInterval(verifier, 30 * 60 * 1000);
  }).catch(function () {});
})();
