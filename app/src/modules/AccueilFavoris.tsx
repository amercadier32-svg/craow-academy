// Section « Mes favoris » de l'accueil : chargée seulement quand la section est ouverte
// (les favoris ont besoin des recettes, effets et gammes, trop lourds pour le premier affichage).
import { CarteFavori, useFavorisInfos } from "./Favoris";

/** Les derniers favoris (6 au plus) et « Tout voir ». */
export default function BandeauFavoris() {
  const favs = useFavorisInfos();
  return (
    <div className={`home-favoris ${favs.length ? "plein" : ""}`}>
      {favs.length === 0 ? (
        <p className="home-favoris-vide">
          <span className="home-etoile" aria-hidden>☆</span>
          Pas encore de favoris. Touche l'étoile ☆ d'une recette, d'un effet, d'une gamme ou d'un preset : il apparaîtra ici.
        </p>
      ) : (
        <ul className="fav-liste fav-bandeau">{favs.slice(0, 6).map((x) => <CarteFavori key={x.f.id} x={x} compact />)}</ul>
      )}
      <a className="px-btn home-favoris-tout" href="#favoris">Tout voir{favs.length ? ` (${favs.length})` : ""}</a>
    </div>
  );
}

