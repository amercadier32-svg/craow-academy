// Page « Raccourcis clavier » (#raccourcis, menu ☰ Plus) : tous les raccourcis de l'app, au même endroit.
import { PixelArt } from "../components/PixelArt";
import { RACCOURCIS } from "../content/raccourcis";
import "../components/donnees.css";

export default function Raccourcis() {
  return (
    <div className="raccourcis-page">
      <h2 className="page-title"><PixelArt name="glossaire" size={34} /> Raccourcis clavier</h2>
      <p className="muted">Les touches de l'app sur ordinateur. Elles ne marchent pas pendant que tu tapes dans un champ de texte (sauf Entrée pour valider).</p>
      {RACCOURCIS.map((g) => (
        <section key={g.groupe} className="donnees-carte">
          <h3>{g.groupe}</h3>
          <table className="raccourcis">
            <thead><tr><th scope="col">Touche</th><th scope="col">Ce que ça fait</th><th scope="col">Où</th></tr></thead>
            <tbody>
              {g.liste.map((r, i) => (
                <tr key={i}>
                  <td>{r.touches.map((t, j) => <span key={j}>{j > 0 && " + "}<kbd>{t}</kbd></span>)}</td>
                  <td>{r.action}</td>
                  <td>{r.lien ? <a href={r.lien}>{r.ou}</a> : r.ou}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
