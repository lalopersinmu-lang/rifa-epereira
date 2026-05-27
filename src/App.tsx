import { useEffect, useState } from "react";
import { Wheel } from "react-custom-roulette";

type Group = {
  name: string;
  teams: string[];
};

type Result = {
  user: string;
  group: Group;
};

export default function App() {
  const initialGroups: Group[] = [
    { name: "Grupo A", teams: ["México", "Japón", "Nigeria", "Países Bajos"] },
    { name: "Grupo B", teams: ["Brasil", "Corea", "Estados Unidos", "Croacia"] },
    { name: "Grupo C", teams: ["Argentina", "Canadá", "Marruecos", "Dinamarca"] },
    { name: "Grupo D", teams: ["España", "Uruguay", "Egipto", "Australia"] },
    { name: "Grupo E", teams: ["Francia", "Suiza", "Chile", "Senegal"] },
    { name: "Grupo F", teams: ["Portugal", "Colombia", "Suecia", "Irán"] },
    { name: "Grupo G", teams: ["Alemania", "Perú", "Camerún", "Serbia"] },
    { name: "Grupo H", teams: ["Inglaterra", "Polonia", "Costa Rica", "Túnez"] },
    { name: "Grupo I", teams: ["Italia", "Ecuador", "Ghana", "Ucrania"] },
    { name: "Grupo J", teams: ["Bélgica", "Paraguay", "Arabia Saudita", "Noruega"] },
    { name: "Grupo K", teams: ["Croacia", "Panamá", "Japón", "Austria"] },
    { name: "Grupo L", teams: ["Estados Unidos", "México", "Marruecos", "Dinamarca"] },
  ];

  const [groups, setGroups] = useState<Group[]>(initialGroups);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState<Group | null>(null);
  const [userCode, setUserCode] = useState("invitado");
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const path = window.location.pathname.replace("/", "").trim();
    setUserCode(path || "invitado");
  }, []);

  const data = groups.map((group) => ({
    option: group.name,
  }));

  const spinWheel = () => {
    if (mustSpin) return;

    if (groups.length === 0) {
      alert("Ya no quedan grupos");
      return;
    }

    const randomIndex = Math.floor(Math.random() * groups.length);

    setPrizeNumber(randomIndex);
    setWinner(null);
    setMustSpin(true);
  };

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
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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

          <h1
            style={{
              fontSize: "56px",
              margin: 0,
              textShadow: "0 0 30px rgba(59,130,246,0.8)",
            }}
          >
            🎡 Ruleta Mundialista
          </h1>

          <p style={{ color: "#cbd5e1", fontSize: "18px" }}>
            Bienvenido <strong>{userCode}</strong>, gira la ruleta y descubre qué grupo te toca.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(300px, 1fr) minmax(300px, 420px)",
            gap: "28px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px",
              padding: "30px",
              boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
              textAlign: "center",
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
                onStopSpinning={() => {
                  setMustSpin(false);

                  const selectedGroup = groups[prizeNumber];

                  setWinner(selectedGroup);

                  setResults((prev) => [
                    {
                      user: userCode,
                      group: selectedGroup,
                    },
                    ...prev,
                  ]);

                  const updatedGroups = groups.filter(
                    (_, index) => index !== prizeNumber
                  );

                  setGroups(updatedGroups);
                }}
              />
            </div>

            <button
              onClick={spinWheel}
              disabled={mustSpin || groups.length === 0}
              style={{
                marginTop: "34px",
                padding: "18px 54px",
                fontSize: "22px",
                borderRadius: "999px",
                border: "none",
                cursor: mustSpin ? "not-allowed" : "pointer",
                fontWeight: "bold",
                color: "#020617",
                background:
                  "linear-gradient(135deg, #facc15, #fb923c, #f97316)",
                boxShadow: "0 0 30px rgba(251,146,60,0.65)",
              }}
            >
              {mustSpin ? "Girando..." : "GIRAR"}
            </button>

            {winner && (
              <div
                style={{
                  marginTop: "30px",
                  background:
                    "linear-gradient(135deg, rgba(250,204,21,0.18), rgba(59,130,246,0.18))",
                  padding: "24px",
                  borderRadius: "24px",
                  border: "1px solid rgba(250,204,21,0.45)",
                  boxShadow: "0 0 35px rgba(250,204,21,0.22)",
                }}
              >
                <h2 style={{ margin: 0 }}>🏆 ¡Ganaste!</h2>
                <h1 style={{ margin: "10px 0", color: "#facc15" }}>
                  {winner.name}
                </h1>

                {winner.teams.map((team) => (
                  <div key={team} style={{ fontSize: "18px", marginTop: "6px" }}>
                    ⚽ {team}
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                marginTop: "28px",
                background: "rgba(0,0,0,0.35)",
                padding: "18px",
                borderRadius: "20px",
                textAlign: "left",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <h2 style={{ marginTop: 0 }}>🧾 Historial</h2>

              {results.length === 0 && (
                <p style={{ color: "#cbd5e1" }}>Aún no hay resultados.</p>
              )}

              {results.map((result, index) => (
                <div
                  key={index}
                  style={{
                    marginTop: "10px",
                    padding: "12px",
                    borderRadius: "14px",
                    background: "rgba(255,255,255,0.08)",
                  }}
                >
                  👤 <strong>{result.user}</strong> sacó{" "}
                  <strong style={{ color: "#facc15" }}>{result.group.name}</strong>
                  <div style={{ marginTop: "6px", color: "#dbeafe" }}>
                    {result.group.teams.join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: "rgba(15,23,42,0.78)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: "28px",
              padding: "24px",
              boxShadow: "0 25px 80px rgba(0,0,0,0.55)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>📋 Grupos restantes</h2>

            {groups.length === 0 && <p>Ya no quedan grupos disponibles.</p>}

            {groups.map((group) => (
              <div
                key={group.name}
                style={{
                  marginTop: "14px",
                  padding: "14px",
                  borderRadius: "18px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <strong style={{ color: "#facc15", fontSize: "18px" }}>
                  {group.name}
                </strong>

                <div style={{ marginTop: "8px", color: "#dbeafe" }}>
                  {group.teams.map((team) => (
                    <div key={team}>⚽ {team}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}