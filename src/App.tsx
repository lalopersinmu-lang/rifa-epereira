import { useEffect, useState } from "react";
import { Wheel } from "react-custom-roulette";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

type Group = {
  name: string;
  teams: string[];
};

type Participant = {
  slug: string;
  name: string;
  order: number;
};

type Result = {
  user: string;
  group: Group;
};

const validParticipants: Participant[] = [
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
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTurn, setCurrentTurn] = useState(1);

  useEffect(() => {
    const slug = window.location.pathname.replace("/", "").trim().toLowerCase();

    if (!slug) {
      setSpectatorMode(true);
      loadRaffleState();
      return;
    }

    const found = validParticipants.find((p) => p.slug === slug);

    if (!found) {
      setInvalidLink(true);
      setLoading(false);
      return;
    }

    setParticipant(found);
    loadRaffleState(found);
  }, []);

  const loadRaffleState = async (foundParticipant?: Participant) => {
    const stateRef = doc(db, "raffle", "state");
    const stateSnap = await getDoc(stateRef);

    if (stateSnap.exists()) {
      const data = stateSnap.data();
      const savedResults = data.results || [];

      setGroups(data.remainingGroups || initialGroups);
      setResults(savedResults);
      setCurrentTurn(savedResults.length + 1);
    }

    if (foundParticipant) {
      const participantRef = doc(db, "participants", foundParticipant.slug);
      const participantSnap = await getDoc(participantRef);

      if (participantSnap.exists() && participantSnap.data().used) {
        setAlreadyUsed(true);
        setWinner(participantSnap.data().group);
      }
    }

    setLoading(false);
  };

  const data = groups.map((group) => ({
    option: group.name,
  }));

  const isUsersTurn = participant && participant.order === currentTurn;

  const spinWheel = () => {
    if (!participant || mustSpin || alreadyUsed || !isUsersTurn || groups.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * groups.length);

    setPrizeNumber(randomIndex);
    setWinner(null);
    setMustSpin(true);
  };

  const saveResult = async () => {
    if (!participant) return;

    try {
      await runTransaction(db, async (transaction) => {
        const stateRef = doc(db, "raffle", "state");
        const participantRef = doc(db, "participants", participant.slug);

        const stateSnap = await transaction.get(stateRef);
        const participantSnap = await transaction.get(participantRef);

        if (participantSnap.exists() && participantSnap.data().used) {
          throw new Error("Este link ya fue utilizado");
        }

        const currentGroups: Group[] = stateSnap.exists()
          ? stateSnap.data().remainingGroups || initialGroups
          : initialGroups;

        const currentResults: Result[] = stateSnap.exists()
          ? stateSnap.data().results || []
          : [];

        const liveTurn = currentResults.length + 1;

        if (participant.order !== liveTurn) {
          throw new Error("Todavía no es tu turno");
        }

        const selectedGroup = currentGroups[prizeNumber];

        const updatedGroups = currentGroups.filter(
          (_, index) => index !== prizeNumber
        );

        const newResult = {
          user: participant.name,
          group: selectedGroup,
        };

        transaction.set(participantRef, {
          used: true,
          name: participant.name,
          order: participant.order,
          group: selectedGroup,
        });

        transaction.set(stateRef, {
          remainingGroups: updatedGroups,
          results: [newResult, ...currentResults],
        });

        setWinner(selectedGroup);
        setGroups(updatedGroups);
        setResults([newResult, ...currentResults]);
        setAlreadyUsed(true);
        setCurrentTurn(liveTurn + 1);
      });
    } catch (error) {
      alert("No se pudo guardar: " + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#111", color: "white", padding: 40 }}>
        Cargando...
      </div>
    );
  }

  if (invalidLink) {
    return (
      <div style={{ minHeight: "100vh", background: "#111", color: "white", padding: 40 }}>
        ❌ Link inválido.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #1e3a8a 0%, #020617 45%, #000 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
        padding: "32px 18px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "8px 18px",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            marginBottom: "14px",
            letterSpacing: "2px",
            fontSize: "13px",
          }}
        >
          SORTEO MUNDIAL 2026
        </div>

        <h1 style={{ fontSize: "56px", margin: 0 }}>🎡 Ruleta Mundialista</h1>

        {spectatorMode ? (
          <p style={{ color: "#cbd5e1", fontSize: "18px" }}>
            Modo espectador: aquí puedes ver el historial y los grupos restantes.
          </p>
        ) : (
          <p style={{ color: "#cbd5e1", fontSize: "18px" }}>
            Bienvenido <strong>{participant?.name}</strong>. Tu turno es el{" "}
            <strong>{participant?.order}</strong>.
          </p>
        )}

        <p style={{ color: "#facc15", fontSize: "18px" }}>
          Turno actual: <strong>{currentTurn}</strong>
        </p>

        {!spectatorMode && alreadyUsed && winner ? (
          <div
            style={{
              marginTop: 30,
              background: "rgba(255,255,255,0.08)",
              padding: 30,
              borderRadius: 24,
            }}
          >
            <h2>Este link ya fue utilizado</h2>
            <h1 style={{ color: "#facc15" }}>{winner.name}</h1>
            {winner.teams.map((team) => (
              <div key={team}>⚽ {team}</div>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: "28px",
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px",
              padding: "30px",
              boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                filter: "drop-shadow(0 0 35px rgba(37,99,235,0.8))",
              }}
            >
              <Wheel
                key={groups.length}
                mustStartSpinning={mustSpin}
                prizeNumber={prizeNumber}
                data={data}
                backgroundColors={["#2563eb", "#7c3aed", "#0891b2"]}
                textColors={["#ffffff"]}
                outerBorderColor="#ffffff"
                outerBorderWidth={6}
                radiusLineColor="#ffffff"
                radiusLineWidth={2}
                fontSize={15}
                onStopSpinning={async () => {
                  setMustSpin(false);
                  await saveResult();
                }}
              />
            </div>

            {!spectatorMode && (
              <button
                onClick={spinWheel}
                disabled={mustSpin || alreadyUsed || !isUsersTurn}
                style={{
                  marginTop: 34,
                  padding: "18px 54px",
                  fontSize: 22,
                  borderRadius: 999,
                  border: "none",
                  cursor:
                    mustSpin || alreadyUsed || !isUsersTurn
                      ? "not-allowed"
                      : "pointer",
                  fontWeight: "bold",
                  background:
                    mustSpin || alreadyUsed || !isUsersTurn
                      ? "#64748b"
                      : "linear-gradient(135deg, #facc15, #fb923c, #f97316)",
                }}
              >
                {mustSpin ? "Girando..." : "GIRAR"}
              </button>
            )}

            {spectatorMode && (
              <div
                style={{
                  marginTop: 24,
                  background: "rgba(255,255,255,0.08)",
                  padding: 18,
                  borderRadius: 18,
                }}
              >
                👀 Esta pantalla es solo para ver. Para girar necesitas un link personalizado.
              </div>
            )}

            {participant && !isUsersTurn && !alreadyUsed && (
              <div
                style={{
                  marginTop: "20px",
                  background: "rgba(251,191,36,0.15)",
                  border: "1px solid rgba(251,191,36,0.4)",
                  padding: "16px",
                  borderRadius: "16px",
                  maxWidth: "420px",
                  marginInline: "auto",
                }}
              >
                ⏳ Todavía no es tu turno.
                <br />
                Turno actual: <strong>{currentTurn}</strong>
                <br />
                Tu turno: <strong>{participant.order}</strong>
              </div>
            )}
          </div>
        )}

        {winner && !alreadyUsed && (
          <div
            style={{
              marginTop: 30,
              background: "rgba(250,204,21,0.18)",
              padding: 24,
              borderRadius: 24,
            }}
          >
            <h2>🏆 ¡Ganaste!</h2>
            <h1 style={{ color: "#facc15" }}>{winner.name}</h1>
            {winner.teams.map((team) => (
              <div key={team}>⚽ {team}</div>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 40,
            background: "rgba(15,23,42,0.78)",
            padding: 24,
            borderRadius: 28,
            textAlign: "left",
          }}
        >
          <h2>🧾 Historial</h2>
          {results.length === 0 && <p>Aún no hay resultados.</p>}
          {results.map((result, index) => (
            <div
              key={index}
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              👤 <strong>{result.user}</strong> sacó{" "}
              <strong style={{ color: "#facc15" }}>{result.group.name}</strong>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 28,
            background: "rgba(15,23,42,0.78)",
            padding: 24,
            borderRadius: 28,
            textAlign: "left",
          }}
        >
          <h2>📋 Grupos restantes</h2>
          {groups.length === 0 && <p>Ya no quedan grupos disponibles.</p>}

          {groups.map((group) => (
            <div
              key={group.name}
              style={{
                marginTop: 14,
                padding: 14,
                borderRadius: 18,
                background: "rgba(255,255,255,0.08)",
              }}
            >
              <strong style={{ color: "#facc15", fontSize: 18 }}>
                {group.name}
              </strong>
              <div style={{ marginTop: 8, color: "#dbeafe" }}>
                {group.teams.map((team) => (
                  <div key={team}>⚽ {team}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}