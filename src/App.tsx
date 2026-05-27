import { useEffect, useState } from "react";
import { Wheel } from "react-custom-roulette";
import {
  doc,
  getDoc,
  runTransaction,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";

type Group = { name: string; teams: string[] };
type Participant = { slug: string; name: string; order: number };
type Result = { user: string; group: Group };

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
  { name: "Grupo A", teams: ["México", "Corea del Sur", "Sudáfrica", "Republica Checa"] },
  { name: "Grupo B", teams: ["Canadá", "Qatar", "Suiza", "Bosnia"] },
  { name: "Grupo C", teams: ["Brasil", "Marruecos", "Haití", "Escocia"] },
  { name: "Grupo D", teams: ["Estados Unidos", "Paraguay", "Australia", "Turquia"] },
  { name: "Grupo E", teams: ["Alemania", "Costa de Marfil", "Ecuador", "Curaçao"] },
  { name: "Grupo F", teams: ["Países Bajos", "Japón", "Túnez", "Suecia"] },
  { name: "Grupo G", teams: ["Bélgica", "Egipto", "Irán", "Nueva Zelanda"] },
  { name: "Grupo H", teams: ["España", "Arabia Saudita", "Uruguay", "Cabo Verde"] },
  { name: "Grupo I", teams: ["Francia", "Senegal", "Noruega", "Irak"] },
  { name: "Grupo J", teams: ["Argentina", "Argelia", "Austria", "Jordania"] },
  { name: "Grupo K", teams: ["Portugal", "Uzbekistán", "Colombia", "Congo"] },
  { name: "Grupo L", teams: ["Inglaterra", "Croacia", "Ghana", "Panamá"] },
];

export default function App() {
  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [results, setResults] = useState<Result[]>([]);
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [winner, setWinner] = useState<Group | null>(null);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [loading, setLoading] = useState(true);
  const [invalidLink, setInvalidLink] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState(false);
  const [justPlayed, setJustPlayed] = useState(false);

  const isAdmin = window.location.pathname === "/admin-reset";

  useEffect(() => {
    if (isAdmin) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const slug = window.location.pathname.replace("/", "").trim().toLowerCase();

        if (!slug) {
          setSpectatorMode(true);
        } else {
          const found = participants.find((p) => p.slug === slug);

          if (!found) {
            setInvalidLink(true);
            return;
          }

          setParticipant(found);

          const userSnap = await getDoc(doc(db, "participants", found.slug));

          if (userSnap.exists() && userSnap.data().used) {
            setAlreadyUsed(true);
            setWinner(userSnap.data().group);
          }
        }

        const stateSnap = await getDoc(doc(db, "raffle", "state"));

        if (stateSnap.exists()) {
          const data = stateSnap.data();
          setGroups(data.remainingGroups || initialGroups);
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Error cargando Firebase:", error);
        alert("Error conectando con Firebase. Revisa Firestore Rules.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [isAdmin]);

  const currentTurn = results.length + 1;
  const isUsersTurn = participant && participant.order === currentTurn;
  const data = groups.map((group) => ({ option: group.name }));

  function spinWheel() {
    if (!participant || spectatorMode || alreadyUsed || !isUsersTurn || mustSpin || groups.length === 0) return;

    const randomIndex = Math.floor(Math.random() * groups.length);
    setPrizeNumber(randomIndex);
    setWinner(null);
    setJustPlayed(false);
    setMustSpin(true);
  }

  async function saveResult() {
    if (!participant) return;

    try {
      await runTransaction(db, async (transaction) => {
        const stateRef = doc(db, "raffle", "state");
        const userRef = doc(db, "participants", participant.slug);

        const stateSnap = await transaction.get(stateRef);
        const userSnap = await transaction.get(userRef);

        if (userSnap.exists() && userSnap.data().used) {
          throw new Error("Este link ya fue utilizado.");
        }

        const liveGroups: Group[] = stateSnap.exists()
          ? stateSnap.data().remainingGroups || initialGroups
          : initialGroups;

        const liveResults: Result[] = stateSnap.exists()
          ? stateSnap.data().results || []
          : [];

        const liveTurn = liveResults.length + 1;

        if (participant.order !== liveTurn) {
          throw new Error(
            `Todavía no es tu turno. Turno actual: ${liveTurn}. Tu turno: ${participant.order}.`
          );
        }

        const selectedGroup = liveGroups[prizeNumber];
        const updatedGroups = liveGroups.filter((_, index) => index !== prizeNumber);
        const newResult: Result = { user: participant.name, group: selectedGroup };
        const updatedResults = [newResult, ...liveResults];

        transaction.set(userRef, {
          used: true,
          name: participant.name,
          order: participant.order,
          group: selectedGroup,
        });

        transaction.set(stateRef, {
          remainingGroups: updatedGroups,
          results: updatedResults,
        });

        setWinner(selectedGroup);
        setGroups(updatedGroups);
        setResults(updatedResults);
        setAlreadyUsed(true);
        setJustPlayed(true);
        await fetch("https://hook.us2.make.com/yp5pxz32ohtxkbkwm5e1fksebba8e1gx", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        body: JSON.stringify({
          user: participant.name,
          group: selectedGroup.name,
          teams: selectedGroup.teams,
        }),
      });
      });
    } catch (error) {
      alert((error as Error).message);
    }
  }

  async function resetRaffle() {
    const ok = confirm("¿Seguro que quieres resetear toda la rifa?");
    if (!ok) return;

    const participantsSnapshot = await getDocs(collection(db, "participants"));

    for (const participantDoc of participantsSnapshot.docs) {
      await deleteDoc(doc(db, "participants", participantDoc.id));
    }

    await setDoc(doc(db, "raffle", "state"), {
      remainingGroups: initialGroups,
      results: [],
    });

    alert("🔥 Rifa reiniciada");
    window.location.reload();
  }

  if (isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          fontFamily: "Arial",
          padding: 30,
          textAlign: "center",
        }}
      >
        <h1>🛠 Admin Reset</h1>
        <p>Este botón reinicia grupos, historial y links utilizados.</p>

        <button
          onClick={resetRaffle}
          style={{
            marginTop: 30,
            padding: "20px 40px",
            borderRadius: 20,
            border: "none",
            fontSize: 24,
            cursor: "pointer",
            fontWeight: "bold",
            background: "red",
            color: "white",
          }}
        >
          🔥 RESETEAR RIFA
        </button>
      </div>
    );
  }

  if (loading) {
    return <div style={{ minHeight: "100vh", background: "#111", color: "white", padding: 40 }}>Cargando...</div>;
  }

  if (invalidLink) {
    return <div style={{ minHeight: "100vh", background: "#111", color: "white", padding: 40 }}>❌ Link inválido.</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #1e3a8a 0%, #020617 45%, #000 100%)",
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

        <h1 style={{ fontSize: "38px", margin: 0 }}>🎡 Ruleta Mundialista</h1>

        {spectatorMode ? (
          <p style={{ color: "#cbd5e1", fontSize: 15 }}>
            👀 Modo espectador. Aquí se ve el historial y los grupos restantes.
          </p>
        ) : (
          <p style={{ color: "#cbd5e1", fontSize: 18 }}>
            Bienvenido <strong>{participant?.name}</strong>. Tu turno es el{" "}
            <strong>{participant?.order}</strong>.
          </p>
        )}

        <p style={{ color: "#facc15", fontSize: 18 }}>
          Turno actual: <strong>{currentTurn}</strong>
        </p>

        <div
          style={{
            marginTop: 28,
            background: "rgba(15,23,42,0.78)",
            border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 28,
            padding: 30,
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
          {groups.length > 0 ? (
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
          ) : (
              <div
                style={{
                  padding: "40px",
                  borderRadius: "24px",
                  background: "rgba(250,204,21,0.15)",
                  border: "1px solid rgba(250,204,21,0.45)",
                  textAlign: "center",
                }}
              >
                <h1>🏁 Sorteo terminado</h1>
                <p>Todos los participantes ya realizaron su giro.</p>
              </div>
            )}
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
                cursor: mustSpin || alreadyUsed || !isUsersTurn ? "not-allowed" : "pointer",
                fontWeight: "bold",
                color: "#020617",
                background:
                  mustSpin || alreadyUsed || !isUsersTurn
                    ? "#64748b"
                    : "linear-gradient(135deg, #facc15, #fb923c, #f97316)",
                boxShadow: "0 0 30px rgba(251,146,60,0.65)",
              }}
            >
              {groups.length === 0
                ? "SORTEO TERMINADO"
                : mustSpin
                ? "Girando..."
                : alreadyUsed
                ? "YA UTILIZADO"
                : "GIRAR"}
            </button>
          )}

          {spectatorMode && (
            <div style={{ marginTop: 24, background: "rgba(255,255,255,0.08)", padding: 18, borderRadius: 18 }}>
              Esta pantalla es solo para ver. Para girar se necesita un link personalizado.
            </div>
          )}

          {participant && !isUsersTurn && !alreadyUsed && (
            <div
              style={{
                marginTop: 20,
                background: "rgba(251,191,36,0.15)",
                border: "1px solid rgba(251,191,36,0.4)",
                padding: 16,
                borderRadius: 16,
              }}
            >
              ⏳ Todavía no es tu turno.
              <br />
              Turno actual: <strong>{currentTurn}</strong>
              <br />
              Tu turno: <strong>{participant.order}</strong>
            </div>
          )}

          {winner && (
            <div
              style={{
                marginTop: 30,
                background: "linear-gradient(135deg, rgba(250,204,21,0.18), rgba(59,130,246,0.18))",
                padding: 24,
                borderRadius: 24,
                border: "1px solid rgba(250,204,21,0.45)",
              }}
            >
              <h2>{justPlayed ? "🏆 ¡Ganaste!" : "Este link ya fue utilizado"}</h2>
              <h1 style={{ color: "#facc15" }}>{winner.name}</h1>
              {winner.teams.map((team) => (
                <div key={team}>⚽ {team}</div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 40, background: "rgba(15,23,42,0.78)", padding: 24, borderRadius: 28, textAlign: "left" }}>
          <h2>🧾 Historial</h2>
          {results.length === 0 && <p>Aún no hay resultados.</p>}
          {results.map((result, index) => (
            <div key={index} style={{ marginTop: 10, padding: 12, borderRadius: 14, background: "rgba(255,255,255,0.08)" }}>
              👤 <strong>{result.user}</strong> sacó{" "}
              <strong style={{ color: "#facc15" }}>{result.group.name}</strong>
              <div style={{ marginTop: 6, color: "#dbeafe" }}>
                {result.group.teams.join(" · ")}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, background: "rgba(15,23,42,0.78)", padding: 24, borderRadius: 28, textAlign: "left" }}>
          <h2>📋 Grupos restantes</h2>
          {groups.length === 0 && <p>Ya no quedan grupos disponibles.</p>}
          {groups.map((group) => (
            <div key={group.name} style={{ marginTop: 14, padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#facc15", fontSize: 18 }}>{group.name}</strong>
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