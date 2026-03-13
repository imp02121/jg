
import { useState, useEffect } from “react”;

const questions = [
// === NOVICE (1-6) ===
{
id: 1, difficulty: “Novice”, emoji: “🗽”,
question: “Which country gifted the Statue of Liberty to the United States?”,
options: [“Britain”, “France”, “Spain”, “Netherlands”],
correct: 1,
fact: “France gifted the statue in 1886 to celebrate the centennial of American independence and their shared ideals of liberty.”,
},
{
id: 2, difficulty: “Novice”, emoji: “🧱”,
question: “In which decade did the Berlin Wall fall?”,
options: [“1970s”, “1980s”, “1990s”, “2000s”],
correct: 1,
fact: “The Wall fell on November 9, 1989. East German guards, overwhelmed by crowds after a confused press conference, simply opened the gates.”,
},
{
id: 3, difficulty: “Novice”, emoji: “⚓”,
question: “The Titanic sank on its maiden voyage in which year?”,
options: [“1905”, “1912”, “1918”, “1923”],
correct: 1,
fact: “Over 1,500 people died in the sinking. The ship had been deemed ‘practically unsinkable’ by the trade press — a phrase that haunted its legacy.”,
},
{
id: 4, difficulty: “Novice”, emoji: “🏛️”,
question: “Julius Caesar was assassinated in which city?”,
options: [“Athens”, “Rome”, “Alexandria”, “Constantinople”],
correct: 1,
fact: “Caesar was stabbed 23 times by a group of senators on the Ides of March (March 15), 44 BC, at the Theatre of Pompey.”,
},
{
id: 5, difficulty: “Novice”, emoji: “🌍”,
question: “Which explorer is traditionally credited with ‘discovering’ the Americas in 1492?”,
options: [“Vasco da Gama”, “Ferdinand Magellan”, “Christopher Columbus”, “Amerigo Vespucci”],
correct: 2,
fact: “Columbus made four voyages to the Americas but went to his grave believing he had reached Asia. The continents were named after Vespucci instead.”,
},
{
id: 6, difficulty: “Novice”, emoji: “🔔”,
question: “The French Revolution began with the storming of which fortress-prison?”,
options: [“The Louvre”, “Versailles”, “The Bastille”, “Château d’If”],
correct: 2,
fact: “On July 14, 1789, a Parisian mob stormed the Bastille — though it held only seven prisoners at the time. The act was symbolic, not strategic.”,
},

// === APPRENTICE (7-12) ===
{
id: 7, difficulty: “Apprentice”, emoji: “🐴”,
question: “Which Mongol leader created the largest contiguous land empire in history?”,
options: [“Kublai Khan”, “Tamerlane”, “Genghis Khan”, “Attila the Hun”],
correct: 2,
fact: “At its peak under Genghis Khan and his successors, the Mongol Empire covered 24 million km² — about 16% of Earth’s total land area.”,
},
{
id: 8, difficulty: “Apprentice”, emoji: “🏴”,
question: “The ‘Black Death’ pandemic of the 14th century was caused by which disease?”,
options: [“Smallpox”, “Cholera”, “Bubonic plague”, “Typhus”],
correct: 2,
fact: “The plague killed an estimated 75–200 million people across Eurasia. It wiped out roughly one-third of Europe’s population between 1347 and 1353.”,
},
{
id: 9, difficulty: “Apprentice”, emoji: “📜”,
question: “The Magna Carta, signed in 1215, limited the power of which English king?”,
options: [“Henry II”, “Richard I”, “King John”, “Edward I”],
correct: 2,
fact: “Rebellious barons forced King John to sign at Runnymede. He immediately asked the Pope to annul it, sparking civil war.”,
},
{
id: 10, difficulty: “Apprentice”, emoji: “⛩️”,
question: “The samurai class was formally abolished during which period of Japanese modernisation?”,
options: [“Edo Period”, “Meiji Restoration”, “Taishō Democracy”, “Shōwa Era”],
correct: 1,
fact: “The Meiji government dismantled feudalism in the 1870s. The samurai lost their stipends and exclusive right to carry swords — some rebelled in the Satsuma Rebellion of 1877.”,
},
{
id: 11, difficulty: “Apprentice”, emoji: “🗿”,
question: “The Rosetta Stone, key to deciphering Egyptian hieroglyphics, was written in how many scripts?”,
options: [“Two”, “Three”, “Four”, “Five”],
correct: 1,
fact: “The stone featured hieroglyphics, Demotic Egyptian, and Ancient Greek. Jean-François Champollion cracked the code in 1822 using the Greek as a key.”,
},
{
id: 12, difficulty: “Apprentice”, emoji: “🏰”,
question: “The Reconquista — the Christian reconquest of the Iberian Peninsula from Muslim rule — ended in which year?”,
options: [“1453”, “1492”, “1519”, “1588”],
correct: 1,
fact: “Granada, the last Muslim stronghold, fell in January 1492 — the same year Columbus sailed west. Ferdinand and Isabella achieved both in one momentous year.”,
},

// === JOURNEYMAN (13-19) ===
{
id: 13, difficulty: “Journeyman”, emoji: “⚔️”,
question: “The Battle of Cannae (216 BC), considered one of the greatest tactical victories in military history, was won by which commander?”,
options: [“Scipio Africanus”, “Hannibal Barca”, “Pyrrhus of Epirus”, “Alexander the Great”],
correct: 1,
fact: “Hannibal’s double envelopment at Cannae destroyed 8 Roman legions in a single day — roughly 50,000–70,000 killed. Military academies still study the battle today.”,
},
{
id: 14, difficulty: “Journeyman”, emoji: “🕌”,
question: “The Umayyad Caliphate, the largest empire the world had yet seen by area, had its capital in which city?”,
options: [“Baghdad”, “Mecca”, “Damascus”, “Cairo”],
correct: 2,
fact: “From Damascus, the Umayyads ruled from Spain to Central Asia (661–750 AD). When the Abbasids overthrew them, one Umayyad prince escaped to found a rival caliphate in Córdoba.”,
},
{
id: 15, difficulty: “Journeyman”, emoji: “🌊”,
question: “The Treaty of Tordesillas (1494) divided the newly discovered world between which two powers?”,
options: [“England & France”, “Spain & Portugal”, “Spain & Netherlands”, “Portugal & England”],
correct: 1,
fact: “Pope Alexander VI drew a line down the Atlantic. Everything west went to Spain, everything east to Portugal — which is why Brazil speaks Portuguese today.”,
},
{
id: 16, difficulty: “Journeyman”, emoji: “🎭”,
question: “The Taiping Rebellion (1850–1864) in China was led by a man who claimed to be what?”,
options: [“The reincarnation of Confucius”, “The brother of Jesus Christ”, “The rightful Mongol Khan”, “A descendant of the Ming dynasty”],
correct: 1,
fact: “Hong Xiuquan claimed to be Jesus’s younger brother and established the ‘Heavenly Kingdom.’ The rebellion killed an estimated 20–30 million people — one of history’s deadliest conflicts.”,
},
{
id: 17, difficulty: “Journeyman”, emoji: “🏔️”,
question: “Which ancient trade network connected Chang’an (modern Xi’an) to the Mediterranean?”,
options: [“The Amber Road”, “The Incense Route”, “The Silk Road”, “The Spice Route”],
correct: 2,
fact: “The Silk Road wasn’t a single road but a vast network of overland and maritime routes. The name itself was coined in 1877 by German geographer Ferdinand von Richthofen.”,
},
{
id: 18, difficulty: “Journeyman”, emoji: “👑”,
question: “The War of the Roses (1455–1487) was a dynastic conflict between which two English houses?”,
options: [“Tudor & Stuart”, “York & Lancaster”, “Plantagenet & Windsor”, “Normandy & Anjou”],
correct: 1,
fact: “The wars ended when Henry Tudor (Lancaster) defeated Richard III (York) at Bosworth Field and married Elizabeth of York, uniting the rival houses and founding the Tudor dynasty.”,
},
{
id: 19, difficulty: “Journeyman”, emoji: “🔥”,
question: “The Great Fire of London (1666) destroyed much of the city. How many people are officially recorded as having died?”,
options: [“6”, “Around 100”, “Around 1,000”, “Over 10,000”],
correct: 0,
fact: “Officially only 6 deaths were recorded, though the true toll was almost certainly higher — many poor and undocumented residents likely perished uncounted.”,
},

// === SCHOLAR (20-26) ===
{
id: 20, difficulty: “Scholar”, emoji: “⚖️”,
question: “The Congress of Vienna (1814–1815) was orchestrated primarily by which Austrian statesman?”,
options: [“Franz Joseph”, “Klemens von Metternich”, “Otto von Bismarck”, “Ferdinand I”],
correct: 1,
fact: “Metternich’s ‘Concert of Europe’ maintained a fragile balance of power for decades. He was so influential that the period 1815–1848 is often called the ‘Age of Metternich.’”,
},
{
id: 21, difficulty: “Scholar”, emoji: “🏺”,
question: “The Peloponnesian War (431–404 BC) ended with the defeat of Athens by Sparta. Which historian wrote the primary contemporary account?”,
options: [“Herodotus”, “Thucydides”, “Xenophon”, “Polybius”],
correct: 1,
fact: “Thucydides was an Athenian general who was exiled after a military failure, then spent 20 years writing his masterwork. It’s considered the first work of ‘scientific history.’”,
},
{
id: 22, difficulty: “Scholar”, emoji: “🐉”,
question: “The An Lushan Rebellion (755–763 AD) devastated which Chinese dynasty and may have killed up to 36 million people?”,
options: [“Han Dynasty”, “Sui Dynasty”, “Tang Dynasty”, “Song Dynasty”],
correct: 2,
fact: “General An Lushan nearly toppled the Tang dynasty. The census dropped from 53 million to 17 million — though much of this was displacement rather than death. It’s among the deadliest conflicts in human history.”,
},
{
id: 23, difficulty: “Scholar”, emoji: “🗡️”,
question: “The ‘Scramble for Africa’ was formalised at the Berlin Conference of 1884. Which country controlled the most African territory by 1914?”,
options: [“Britain”, “France”, “Germany”, “Belgium”],
correct: 1,
fact: “France held the most territory by area (much of West and North Africa), though Britain’s holdings — including Egypt, Sudan, South Africa and Nigeria — were arguably more strategically and economically valuable.”,
},
{
id: 24, difficulty: “Scholar”, emoji: “📕”,
question: “The ‘Ems Dispatch’ of 1870, edited by Bismarck to provoke war, led directly to which conflict?”,
options: [“Austro-Prussian War”, “Franco-Prussian War”, “Schleswig-Holstein War”, “Crimean War”],
correct: 1,
fact: “Bismarck edited a telegram about a meeting between the Prussian king and a French ambassador to make it sound insulting. France declared war — exactly as Bismarck had planned — leading to German unification.”,
},
{
id: 25, difficulty: “Scholar”, emoji: “🌏”,
question: “The Khmer Empire, which built Angkor Wat, was centred in which modern-day country?”,
options: [“Thailand”, “Vietnam”, “Cambodia”, “Myanmar”],
correct: 2,
fact: “At its peak in the 12th century, the Khmer Empire’s capital at Angkor was the largest pre-industrial city in the world, with a population of nearly one million and a sophisticated hydraulic network.”,
},
{
id: 26, difficulty: “Scholar”, emoji: “⛵”,
question: “The Haitian Revolution (1791–1804), the only successful large-scale slave revolt in history, defeated armies from which major European power?”,
options: [“Spain”, “Britain”, “France”, “Portugal”],
correct: 2,
fact: “Napoleon sent 40,000 troops to reconquer Haiti. Disease and fierce resistance destroyed the expedition. Haiti became the first free Black republic and the second independent nation in the Americas.”,
},

// === MASTER (27-32) ===
{
id: 27, difficulty: “Master”, emoji: “📖”,
question: “The ‘Investiture Controversy’ (1076–1122) was a power struggle between the Holy Roman Emperor and the Pope over the right to do what?”,
options: [“Collect tithes”, “Appoint church officials”, “Declare holy wars”, “Annul royal marriages”],
correct: 1,
fact: “Emperor Henry IV was forced to stand barefoot in the snow at Canossa for three days begging Pope Gregory VII’s forgiveness. The episode became a lasting symbol of papal power over secular rulers.”,
},
{
id: 28, difficulty: “Master”, emoji: “🏴‍☠️”,
question: “The Delian League, originally an anti-Persian alliance, was gradually transformed into an Athenian empire. Which event marked its founding?”,
options: [“Battle of Marathon”, “Battle of Thermopylae”, “Persian retreat after Plataea and Mycale”, “Death of Pericles”],
correct: 2,
fact: “Founded around 478 BC after the Persian Wars, Athens moved the League’s treasury from Delos to Athens in 454 BC — effectively converting allied contributions into Athenian imperial revenue.”,
},
{
id: 29, difficulty: “Master”, emoji: “🗺️”,
question: “The Treaty of Nerchinsk (1689), the first formal treaty between Russia and China, established borders in which region?”,
options: [“Central Asia”, “Manchuria/Amur River”, “Mongolia”, “Xinjiang”],
correct: 1,
fact: “Negotiated in Latin by Jesuit intermediaries, Nerchinsk kept Russia out of the Amur basin for 170 years. It was the first treaty China signed with a European power as equals.”,
},
{
id: 30, difficulty: “Master”, emoji: “🔱”,
question: “The Mfecane (or Difaqane) — a period of widespread chaos and migration in southern Africa — was largely triggered by the rise of which kingdom in the early 19th century?”,
options: [“Zulu Kingdom”, “Ndebele Kingdom”, “Swazi Kingdom”, “Sotho Kingdom”],
correct: 0,
fact: “Under Shaka Zulu’s military innovations, the Zulu Kingdom’s expansion from 1815 onward displaced dozens of peoples across southern Africa, reshaping the entire region’s ethnic geography.”,
},
{
id: 31, difficulty: “Master”, emoji: “🏛️”,
question: “The Fourth Crusade (1202–1204) infamously never reached the Holy Land. Instead, the Crusaders sacked which Christian city?”,
options: [“Antioch”, “Constantinople”, “Alexandria”, “Thessalonica”],
correct: 1,
fact: “Venetian financial manipulation diverted the Crusade to Constantinople. The three-day sack devastated the Byzantine capital and created the short-lived ‘Latin Empire’ — permanently weakening Byzantium.”,
},
{
id: 32, difficulty: “Master”, emoji: “⚗️”,
question: “The ‘General Crisis of the 17th Century’ saw major revolts across Europe and Asia. Which of these was NOT a major rebellion during this period?”,
options: [“English Civil War”, “Fronde in France”, “Pugachev’s Rebellion in Russia”, “Catalan Revolt against Spain”],
correct: 2,
fact: “Pugachev’s Rebellion was in the 1770s. The 17th-century crisis saw simultaneous upheavals — the English Civil War, French Fronde, Catalan and Portuguese revolts, Ming dynasty collapse, and Ottoman instability — possibly linked to the Little Ice Age.”,
},

// === GRANDMASTER (33-35) ===
{
id: 33, difficulty: “Grandmaster”, emoji: “🌍”,
question: “The ‘Asiento de Negros’, a contract granted to Britain at the Treaty of Utrecht (1713), gave Britain the monopoly right to supply what to Spanish America?”,
options: [“Silver bullion”, “Enslaved Africans”, “Manufactured textiles”, “Gunpowder and arms”],
correct: 1,
fact: “The Asiento allowed Britain to sell 4,800 enslaved people per year to Spanish colonies. The South Sea Company held the contract — its speculative bubble and collapse in 1720 became one of history’s great financial crises.”,
},
{
id: 34, difficulty: “Grandmaster”, emoji: “📜”,
question: “The ‘Donation of Constantine’, used for centuries to justify papal temporal authority, was proven to be a forgery in 1440 by which Renaissance humanist?”,
options: [“Petrarch”, “Lorenzo Valla”, “Erasmus”, “Niccolò Machiavelli”],
correct: 1,
fact: “Valla used philological analysis to prove the document’s Latin couldn’t possibly date from the 4th century. His work was explosive — it undermined a key foundation of papal political power and became a landmark in historical criticism.”,
},
{
id: 35, difficulty: “Grandmaster”, emoji: “🔥”,
question: “The ‘Tanzimat’ reforms (1839–1876) in the Ottoman Empire were inaugurated by which edict that guaranteed life, honour and property to all Ottoman subjects regardless of religion?”,
options: [“Hatt-ı Hümayun”, “Gülhane Hatt-ı Şerif”, “Kanun-i Esasi”, “Sened-i İttifak”],
correct: 1,
fact: “The Gülhane edict, read aloud in the Rose Garden of Topkapı Palace, was a revolutionary attempt to modernise the Ottoman state along European lines. It promised equality for Muslims and non-Muslims — though implementation was uneven and provoked conservative backlash.”,
},
];

const difficultyColors = {
Novice: { bg: “#4a7c59”, text: “#e8f5e9” },
Apprentice: { bg: “#5c6d3f”, text: “#f1f8e9” },
Journeyman: { bg: “#8d6e3f”, text: “#fff8e1” },
Scholar: { bg: “#8b4513”, text: “#fbe9e7” },
Master: { bg: “#6a1b3a”, text: “#fce4ec” },
Grandmaster: { bg: “#1a1a2e”, text: “#e8eaf6” },
};

const difficultyOrder = [“Novice”, “Apprentice”, “Journeyman”, “Scholar”, “Master”, “Grandmaster”];

export default function HistoryGauntlet() {
const [currentQ, setCurrentQ] = useState(0);
const [selected, setSelected] = useState(null);
const [revealed, setRevealed] = useState(false);
const [score, setScore] = useState(0);
const [answers, setAnswers] = useState([]);
const [phase, setPhase] = useState(“intro”);
const [fadeIn, setFadeIn] = useState(true);
const [streak, setStreak] = useState(0);
const [bestStreak, setBestStreak] = useState(0);

const q = questions[currentQ];
const total = questions.length;

useEffect(() => {
setFadeIn(false);
const t = setTimeout(() => setFadeIn(true), 50);
return () => clearTimeout(t);
}, [currentQ, phase]);

const handleSelect = (idx) => {
if (revealed) return;
setSelected(idx);
setRevealed(true);
const correct = idx === q.correct;
if (correct) {
setScore((s) => s + 1);
setStreak((s) => {
const ns = s + 1;
setBestStreak((b) => Math.max(b, ns));
return ns;
});
} else {
setStreak(0);
}
setAnswers((a) => […a, { qId: q.id, selected: idx, correct }]);
};

const handleNext = () => {
if (currentQ < total - 1) {
setSelected(null);
setRevealed(false);
setCurrentQ((c) => c + 1);
} else {
setPhase(“results”);
}
};

const restart = () => {
setCurrentQ(0);
setSelected(null);
setRevealed(false);
setScore(0);
setAnswers([]);
setStreak(0);
setBestStreak(0);
setPhase(“intro”);
};

const getRank = () => {
const pct = score / total;
if (pct <= 0.2) return { title: “Curious Peasant”, icon: “🌾”, desc: “The village elder has much yet to teach you. But curiosity is where all great historians begin.” };
if (pct <= 0.35) return { title: “Apprentice Scribe”, icon: “📝”, desc: “You know the broad strokes. The details are waiting — and they’re where history gets truly interesting.” };
if (pct <= 0.5) return { title: “Travelling Scholar”, icon: “🎒”, desc: “You’ve journeyed through the centuries with respectable knowledge. Time to venture off the main roads.” };
if (pct <= 0.65) return { title: “Court Historian”, icon: “👑”, desc: “A solid command of the ages. Kings would trust you with their chronicles and their secrets.” };
if (pct <= 0.8) return { title: “Master Chronicler”, icon: “📜”, desc: “Impressive breadth and depth. You could hold your own at any university high table — and probably win.” };
if (pct <= 0.9) return { title: “Grand Archivist”, icon: “🏛️”, desc: “The dustiest corners of history hold few secrets from you. Your knowledge spans civilisations and centuries.” };
if (pct < 1) return { title: “Keeper of All Ages”, icon: “⚡”, desc: “Near-perfect. You are a walking encyclopaedia of human civilisation. The past speaks through you.” };
return { title: “Immortal Oracle”, icon: “🔮”, desc: “Flawless. Absolute perfection. Herodotus, Thucydides, and Ibn Khaldun would acknowledge you as a peer.” };
};

const progressPct = ((currentQ + (revealed ? 1 : 0)) / total) * 100;

const scoreByDifficulty = () => {
const result = {};
difficultyOrder.forEach((d) => { result[d] = { total: 0, correct: 0 }; });
questions.forEach((qq, i) => {
result[qq.difficulty].total++;
if (answers[i]?.correct) result[qq.difficulty].correct++;
});
return result;
};

return (
<div style={{
minHeight: “100vh”,
background: “linear-gradient(160deg, #1a1410 0%, #2c2218 30%, #1e1a14 70%, #0f0d0a 100%)”,
fontFamily: “‘Palatino Linotype’, ‘Book Antiqua’, Palatino, Georgia, serif”,
color: “#d4c5a9”,
display: “flex”, flexDirection: “column”, alignItems: “center”,
padding: “24px 16px”, position: “relative”, overflow: “hidden”,
}}>
<div style={{
position: “fixed”, inset: 0, opacity: 0.04, pointerEvents: “none”,
backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4c5a9' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
}} />

```
  <div style={{
    maxWidth: 640, width: "100%",
    opacity: fadeIn ? 1 : 0,
    transform: fadeIn ? "translateY(0)" : "translateY(12px)",
    transition: "opacity 0.4s ease, transform 0.4s ease",
  }}>

    {/* === INTRO === */}
    {phase === "intro" && (
      <div style={{ textAlign: "center", marginTop: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🏛️</div>
        <h1 style={{
          fontSize: 30, fontWeight: 700, color: "#e8d9b8", margin: "0 0 2px",
          letterSpacing: 2, textTransform: "uppercase",
        }}>The History Gauntlet</h1>
        <p style={{ fontSize: 14, color: "#8b7355", fontStyle: "italic", margin: "2px 0 0", letterSpacing: 1 }}>Volume II — The Extended Trial</p>
        <div style={{
          width: 80, height: 2, background: "linear-gradient(90deg, transparent, #8b7355, transparent)",
          margin: "16px auto 20px",
        }} />
        <p style={{ fontSize: 16, lineHeight: 1.7, color: "#b0a48a", maxWidth: 460, margin: "0 auto 8px" }}>
          35 questions spanning five millennia of human civilisation. From schoolbook basics to the kind of detail that makes professors raise an eyebrow.
        </p>
        <p style={{ fontSize: 14, color: "#887a62", marginBottom: 28 }}>
          Six difficulty tiers. One score. No mercy.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 12 }}>
          {difficultyOrder.map((d) => {
            const count = questions.filter((qq) => qq.difficulty === d).length;
            return (
              <span key={d} style={{
                padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 1,
                background: difficultyColors[d].bg + "cc", color: difficultyColors[d].text,
                border: `1px solid ${difficultyColors[d].bg}`,
              }}>{d} ({count})</span>
            );
          })}
        </div>

        <p style={{ fontSize: 12, color: "#665d4d", marginBottom: 32 }}>
          Total: {total} questions
        </p>

        <button onClick={() => setPhase("quiz")} style={{
          padding: "14px 48px", fontSize: 16, fontWeight: 700, letterSpacing: 2,
          textTransform: "uppercase", cursor: "pointer", border: "2px solid #8b7355",
          background: "linear-gradient(135deg, #3a2e1e, #2a2016)", color: "#e8d9b8",
          borderRadius: 6, transition: "all 0.2s", fontFamily: "inherit",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}
          onMouseEnter={(e) => { e.target.style.background = "#8b7355"; e.target.style.color = "#1a1410"; }}
          onMouseLeave={(e) => { e.target.style.background = "linear-gradient(135deg, #3a2e1e, #2a2016)"; e.target.style.color = "#e8d9b8"; }}
        >Begin the Trial</button>
      </div>
    )}

    {/* === QUIZ === */}
    {phase === "quiz" && (
      <div>
        {/* Header stats */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#887a62", letterSpacing: 1 }}>
            QUESTION {currentQ + 1} / {total}
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            {streak >= 3 && (
              <span style={{ fontSize: 12, color: "#e8a849", fontWeight: 700, animation: "pulse 1s infinite" }}>
                🔥 {streak} streak
              </span>
            )}
            <span style={{ fontSize: 12, color: "#887a62" }}>
              Score: <span style={{ color: "#e8d9b8", fontWeight: 700 }}>{score}</span>
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "#2a2016", borderRadius: 2, overflow: "hidden", marginBottom: 20 }}>
          <div style={{
            height: "100%", borderRadius: 2, transition: "width 0.5s ease",
            width: `${progressPct}%`,
            background: "linear-gradient(90deg, #4a7c59, #8d6e3f, #8b4513, #6a1b3a, #1a1a2e)",
          }} />
        </div>

        {/* Difficulty badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{
            padding: "4px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
            textTransform: "uppercase",
            background: difficultyColors[q.difficulty].bg, color: difficultyColors[q.difficulty].text,
          }}>{q.difficulty}</span>
          <span style={{ fontSize: 22 }}>{q.emoji}</span>
        </div>

        {/* Question */}
        <div style={{
          background: "linear-gradient(135deg, rgba(58,46,30,0.6), rgba(30,26,20,0.8))",
          border: "1px solid #3d3225", borderRadius: 12, padding: "28px 24px", marginBottom: 20,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}>
          <h2 style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.55, color: "#e8d9b8", margin: 0 }}>
            {q.question}
          </h2>
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === q.correct;
            let bg = "rgba(42,32,22,0.6)";
            let border = "#3d3225";
            let textColor = "#d4c5a9";

            if (revealed) {
              if (isCorrect) { bg = "rgba(74,124,89,0.3)"; border = "#4a7c59"; textColor = "#a8e6b0"; }
              else if (isSelected && !isCorrect) { bg = "rgba(139,45,45,0.3)"; border = "#8b2d2d"; textColor = "#e6a8a8"; }
            }

            return (
              <button key={idx} onClick={() => handleSelect(idx)} style={{
                padding: "14px 20px", fontSize: 15, textAlign: "left",
                cursor: revealed ? "default" : "pointer",
                background: bg, border: `1px solid ${border}`, borderRadius: 8, color: textColor,
                transition: "all 0.25s", display: "flex", alignItems: "center", gap: 14,
                fontFamily: "inherit",
              }}
                onMouseEnter={(e) => { if (!revealed) { e.currentTarget.style.borderColor = "#8b7355"; e.currentTarget.style.background = "rgba(139,115,85,0.15)"; } }}
                onMouseLeave={(e) => { if (!revealed) { e.currentTarget.style.borderColor = "#3d3225"; e.currentTarget.style.background = "rgba(42,32,22,0.6)"; } }}
              >
                <span style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: revealed && isCorrect ? "#4a7c59" : revealed && isSelected ? "#8b2d2d" : "rgba(139,115,85,0.2)",
                  color: revealed && (isCorrect || isSelected) ? "#fff" : "#8b7355",
                }}>
                  {revealed && isCorrect ? "✓" : revealed && isSelected && !isCorrect ? "✗" : String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Fact */}
        {revealed && (
          <div style={{
            background: "rgba(139,115,85,0.1)", border: "1px solid #5a4a35", borderRadius: 8,
            padding: "16px 20px", marginBottom: 20, animation: "fadeSlideIn 0.4s ease",
          }}>
            <p style={{ fontSize: 12, color: "#8b7355", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 6px" }}>
              📚 Did you know?
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "#b0a48a", margin: 0 }}>{q.fact}</p>
          </div>
        )}

        {/* Next */}
        {revealed && (
          <div style={{ textAlign: "center" }}>
            <button onClick={handleNext} style={{
              padding: "12px 40px", fontSize: 14, fontWeight: 700, letterSpacing: 2,
              textTransform: "uppercase", cursor: "pointer", border: "1px solid #8b7355",
              background: "transparent", color: "#e8d9b8", borderRadius: 6,
              transition: "all 0.2s", fontFamily: "inherit",
            }}
              onMouseEnter={(e) => { e.target.style.background = "#8b7355"; e.target.style.color = "#1a1410"; }}
              onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#e8d9b8"; }}
            >
              {currentQ < total - 1 ? "Next Question →" : "See Results"}
            </button>
          </div>
        )}
      </div>
    )}

    {/* === RESULTS === */}
    {phase === "results" && (() => {
      const rank = getRank();
      const byDiff = scoreByDifficulty();
      return (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{rank.icon}</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: "#e8d9b8", margin: "0 0 4px", letterSpacing: 1 }}>
            {rank.title}
          </h1>
          <div style={{
            width: 60, height: 2, background: "linear-gradient(90deg, transparent, #8b7355, transparent)",
            margin: "12px auto 16px",
          }} />
          <p style={{ fontSize: 15, color: "#b0a48a", lineHeight: 1.6, maxWidth: 440, margin: "0 auto 24px" }}>
            {rank.desc}
          </p>

          {/* Score + streak */}
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <div style={{
              padding: "12px 28px", borderRadius: 8,
              background: "rgba(139,115,85,0.1)", border: "1px solid #3d3225", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#e8d9b8" }}>{score}<span style={{ fontSize: 16, color: "#887a62" }}>/{total}</span></div>
              <div style={{ fontSize: 11, color: "#887a62", letterSpacing: 1, marginTop: 2 }}>FINAL SCORE</div>
            </div>
            <div style={{
              padding: "12px 28px", borderRadius: 8,
              background: "rgba(139,115,85,0.1)", border: "1px solid #3d3225", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#e8a849" }}>{bestStreak}</div>
              <div style={{ fontSize: 11, color: "#887a62", letterSpacing: 1, marginTop: 2 }}>BEST STREAK</div>
            </div>
            <div style={{
              padding: "12px 28px", borderRadius: 8,
              background: "rgba(139,115,85,0.1)", border: "1px solid #3d3225", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, fontWeight: 700, color: "#d4c5a9" }}>{Math.round((score / total) * 100)}%</div>
              <div style={{ fontSize: 11, color: "#887a62", letterSpacing: 1, marginTop: 2 }}>ACCURACY</div>
            </div>
          </div>

          {/* Score by difficulty */}
          <div style={{
            background: "rgba(42,32,22,0.5)", border: "1px solid #3d3225", borderRadius: 12,
            padding: "20px", marginBottom: 20, textAlign: "left",
          }}>
            <p style={{ fontSize: 12, color: "#8b7355", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 14px" }}>
              Performance by Tier
            </p>
            {difficultyOrder.map((d) => {
              const data = byDiff[d];
              if (!data || data.total === 0) return null;
              const pct = (data.correct / data.total) * 100;
              return (
                <div key={d} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                      color: difficultyColors[d].text, padding: "2px 10px", borderRadius: 10,
                      background: difficultyColors[d].bg,
                    }}>{d}</span>
                    <span style={{ fontSize: 13, color: "#b0a48a" }}>
                      {data.correct}/{data.total}
                    </span>
                  </div>
                  <div style={{ height: 6, background: "#2a2016", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 3, width: `${pct}%`,
                      background: difficultyColors[d].bg, transition: "width 0.8s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Full breakdown */}
          <div style={{
            background: "rgba(42,32,22,0.5)", border: "1px solid #3d3225", borderRadius: 12,
            padding: "20px", marginBottom: 28, textAlign: "left", maxHeight: 360, overflowY: "auto",
          }}>
            <p style={{ fontSize: 12, color: "#8b7355", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", margin: "0 0 14px" }}>
              Full Breakdown
            </p>
            {questions.map((qq, i) => {
              const a = answers[i];
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                  borderBottom: i < total - 1 ? "1px solid #2a2016" : "none",
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                    background: a?.correct ? "#4a7c59" : "#8b2d2d", color: "#fff",
                  }}>{a?.correct ? "✓" : "✗"}</span>
                  <span style={{ fontSize: 12, color: "#b0a48a", flex: 1, lineHeight: 1.3 }}>
                    <span style={{ color: "#665d4d", marginRight: 5 }}>Q{i + 1}</span>
                    {qq.question.length > 50 ? qq.question.slice(0, 50) + "…" : qq.question}
                  </span>
                  <span style={{
                    fontSize: 9, padding: "2px 7px", borderRadius: 10, fontWeight: 600, letterSpacing: 0.5, flexShrink: 0,
                    background: difficultyColors[qq.difficulty].bg + "88", color: difficultyColors[qq.difficulty].text,
                  }}>{qq.difficulty}</span>
                </div>
              );
            })}
          </div>

          <button onClick={restart} style={{
            padding: "12px 40px", fontSize: 14, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", cursor: "pointer", border: "2px solid #8b7355",
            background: "linear-gradient(135deg, #3a2e1e, #2a2016)", color: "#e8d9b8",
            borderRadius: 6, transition: "all 0.2s", fontFamily: "inherit",
          }}
            onMouseEnter={(e) => { e.target.style.background = "#8b7355"; e.target.style.color = "#1a1410"; }}
            onMouseLeave={(e) => { e.target.style.background = "linear-gradient(135deg, #3a2e1e, #2a2016)"; e.target.style.color = "#e8d9b8"; }}
          >Try Again</button>
        </div>
      );
    })()}
  </div>

  <style>{`
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    button { font-family: 'Palatino Linotype', 'Book Antiqua', Palatino, Georgia, serif; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #1a1410; }
    ::-webkit-scrollbar-thumb { background: #3d3225; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #8b7355; }
  `}</style>
</div>
```

);
}