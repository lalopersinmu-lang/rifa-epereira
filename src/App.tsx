import { useEffect, useState } from "react";
import { Wheel } from "react-custom-roulette";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type Group = {
  name: string;
  teams: string[];
};

type Participant = {
  slug: string;
  name: string;
  order: number;
};

const participants: Participant[] = [
  { slug: "eduardo-p", name: "Eduardo P", order: 1 },
  { slug: "claudia-s", name: "Claudia S", order: 2 },
  { slug: "jorge-e", name: "Jorge E", order: 3 },
  { slug: "coque-e", name: "Coque E", order: 4 },
  { slug: "daniel-e", name: "Daniel E", order: 5 },
  { slug: "edith-p", name: "Edith P", order: 6 },
  { slug: "pilar-p", name: "Pilar P", order: 7 },
  { slug: "sergio-s", name: "Sergio S", order: 8 },
  { slug: "carlos", name: "Carlos", order: 9 },
  { slug: "alejandra-i", name: "Alejandra I", order: 10 },
  { slug: "jorge-beck", name: "Jorge Beck", order: 11 },
  { slug: "isaac-e", name: "Isaac E", order: 12 },
];

const initialGroups: Group[] = [
  { name: "Grupo A", teams: ["México", "Corea del Sur", "República Checa", "Sudáfrica"] },
  { name: "Grupo B", teams: ["Canadá", "Qatar", "Suiza", "Bosnia-Herzegovina"] },
  { name: "Grupo C", teams: ["Brasil", "Haití", "Marruecos", "Escocia"] },
  { name: "Grupo D", teams: ["Estados Unidos", "Australia", "Paraguay", "Turquía"] },
  { name: "Grupo E", teams: ["Alemania", "Ecuador", "Costa de Marfil", "Curaçao"] },
  { name: "Grupo F", teams: ["Países Bajos", "Japón", "Túnez", "Suecia"] },
  { name: "Grupo G", teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"] },
  { name: "Grupo H", teams: ["España", "Uruguay", "Arabia Saudita", "Cabo Verde"] },
  { name: "Grupo I", teams: ["Francia", "Senegal", "Noruega", "Irak"] },
  { name: "Grupo J", teams: ["Argentina", "Argelia", "Austria", "Jordania"] },
  { name: "Grupo K", teams: ["Portugal", "Colombia", "Uzbekistán", "RD Congo"] },
  { name: "Grupo L", teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"] },
];

export default function App() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<Participant | null>(null);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(1);

  useEffect(() => {
    const slug = window.location.pathname.replace("/", "").toLowerCase();

    if (!slug) {
      setSpectatorMode(true);
      return;
    }

    const found = participants.find((p) => p.slug === slug);

    if (!found) {
      alert("Link inválido");
      return;
    }

    setCurrentUser(found);

    const checkUser = async () => {
      const userRef = doc(db, "results", found.slug);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setAlreadyUsed(true);
        setWinner(userSnap.data().group);
      }
    };

    checkUser();
  }, []);

  const data = groups.map((group) => ({
    option: group.name,
  }));

  const isUsersTurn =
    currentUser && currentUser.order === currentTurn;

  const spinWheel = () => {
    if (
      !currentUser ||
      !isUsersTurn ||
      alreadyUsed ||
      mustSpin
    )
      return;

    const randomIndex = Math.floor(
      Math.random() * groups.length
    );

    setPrizeNumber(randomIndex);

    setMustSpin(true);
  };

  const saveResult = async (group: Group) => {
    if (!currentUser) return;

    await setDoc(doc(db, "results", currentUser.slug), {
      user: currentUser.name,
      group,
    });

    setAlreadyUsed(true);
    setCurrentTurn((prev) => prev + 1);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e3a8a 0%, #020617 45%, #000 100%)",
        color: "white",
        fontFamily: "Arial",
        padding: "30px",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "56px" }}>
          🎡 Ruleta Mundialista
        </h1>

        {spectatorMode ? (
          <p>👀 Modo espectador</p>
        ) : (
          <p>
            Bienvenido <strong>{currentUser?.name}</strong>
          </p>
        )}

        {!spectatorMode && (
          <p>
            Turno actual: <strong>{currentTurn}</strong>
          </p>
        )}

        <div
          style={{
            marginTop: "30px",
            background: "rgba(15,23,42,0.78)",
            borderRadius: "30px",
            padding: "30px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Wheel
              key={groups.length}
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={data}
              backgroundColors={[
                "#2563eb",
                "#7c3aed",
                "#0891b2",
              ]}
              textColors={["#ffffff"]}
              outerBorderColor="#ffffff"
              outerBorderWidth={6}
              radiusLineColor="#ffffff"
              radiusLineWidth={2}
              fontSize={15}
              onStopSpinning={async () => {
                setMustSpin(false);

                const selectedGroup =
                  groups[prizeNumber];

                setWinner(selectedGroup);

                setGroups((prev) =>
                  prev.filter(
                    (_, index) => index !== prizeNumber
                  )
                );

                await saveResult(selectedGroup);
              }}
            />
          </div>

          {!spectatorMode && (
            <button
              onClick={spinWheel}
              disabled={
                mustSpin ||
                alreadyUsed ||
                !isUsersTurn
              }
              style={{
                marginTop: "30px",
                padding: "18px 54px",
                fontSize: "22px",
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
                fontWeight: "bold",
                background:
                  "linear-gradient(135deg, #facc15, #fb923c, #f97316)",
              }}
            >
              {mustSpin
                ? "Girando..."
                : alreadyUsed
                ? "YA UTILIZADO"
                : "GIRAR"}
            </button>
          )}

          {!spectatorMode &&
            !isUsersTurn &&
            !alreadyUsed && (
              <div
                style={{
                  marginTop: "20px",
                  background:
                    "rgba(251,191,36,0.15)",
                  border:
                    "1px solid rgba(251,191,36,0.4)",
                  padding: "16px",
                  borderRadius: "16px",
                }}
              >
                ⏳ Todavía no es tu turno.
                <br />
                Tu turno:{" "}
                <strong>{currentUser?.order}</strong>
              </div>
            )}

          {winner && (
            <div
              style={{
                marginTop: "30px",
                background:
                  "linear-gradient(135deg, rgba(250,204,21,0.18), rgba(59,130,246,0.18))",
                padding: "24px",
                borderRadius: "24px",
              }}
            >
              <h2>🏆 ¡Ganaste!</h2>

              <h1 style={{ color: "#facc15" }}>
                {winner.name}
              </h1>

              {winner.teams.map((team) => (
                <div key={team}>
                  ⚽ {team}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}