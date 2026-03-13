/**
 * Seed question data — Scholar, Master, and Grandmaster tiers (Q20-Q35).
 *
 * Split from question-data.ts to stay under the 250 LOC limit.
 * All text is preserved exactly from the original jsx.md.
 */

import type { CreateQuestionRequest } from "@history-gauntlet/shared";

/** Scholar, Master, and Grandmaster questions (Q20-Q35). */
export const SEED_QUESTIONS_ADVANCED: readonly CreateQuestionRequest[] = [
  // === SCHOLAR (20-26) ===
  {
    difficulty: "Scholar",
    iconKey: "scroll",
    question:
      "The Congress of Vienna (1814\u20131815) was orchestrated primarily by which Austrian statesman?",
    options: ["Franz Joseph", "Klemens von Metternich", "Otto von Bismarck", "Ferdinand I"],
    correctIndex: 1,
    fact: "Metternich's 'Concert of Europe' maintained a fragile balance of power for decades. He was so influential that the period 1815\u20131848 is often called the 'Age of Metternich.'",
    category: "Early Modern",
  },
  {
    difficulty: "Scholar",
    iconKey: "book",
    question:
      "The Peloponnesian War (431\u2013404 BC) ended with the defeat of Athens by Sparta. Which historian wrote the primary contemporary account?",
    options: ["Herodotus", "Thucydides", "Xenophon", "Polybius"],
    correctIndex: 1,
    fact: "Thucydides was an Athenian general who was exiled after a military failure, then spent 20 years writing his masterwork. It's considered the first work of 'scientific history.'",
    category: "Ancient",
  },
  {
    difficulty: "Scholar",
    iconKey: "flame",
    question:
      "The An Lushan Rebellion (755\u2013763 AD) devastated which Chinese dynasty and may have killed up to 36 million people?",
    options: ["Han Dynasty", "Sui Dynasty", "Tang Dynasty", "Song Dynasty"],
    correctIndex: 2,
    fact: "General An Lushan nearly toppled the Tang dynasty. The census dropped from 53 million to 17 million \u2014 though much of this was displacement rather than death. It's among the deadliest conflicts in human history.",
    category: "Medieval",
  },
  {
    difficulty: "Scholar",
    iconKey: "globe",
    question:
      "The 'Scramble for Africa' was formalised at the Berlin Conference of 1884. Which country controlled the most African territory by 1914?",
    options: ["Britain", "France", "Germany", "Belgium"],
    correctIndex: 1,
    fact: "France held the most territory by area (much of West and North Africa), though Britain's holdings \u2014 including Egypt, Sudan, South Africa and Nigeria \u2014 were arguably more strategically and economically valuable.",
    category: "Modern",
  },
  {
    difficulty: "Scholar",
    iconKey: "book",
    question:
      "The 'Ems Dispatch' of 1870, edited by Bismarck to provoke war, led directly to which conflict?",
    options: [
      "Austro-Prussian War",
      "Franco-Prussian War",
      "Schleswig-Holstein War",
      "Crimean War",
    ],
    correctIndex: 1,
    fact: "Bismarck edited a telegram about a meeting between the Prussian king and a French ambassador to make it sound insulting. France declared war \u2014 exactly as Bismarck had planned \u2014 leading to German unification.",
    category: "Early Modern",
  },
  {
    difficulty: "Scholar",
    iconKey: "castle",
    question: "The Khmer Empire, which built Angkor Wat, was centred in which modern-day country?",
    options: ["Thailand", "Vietnam", "Cambodia", "Myanmar"],
    correctIndex: 2,
    fact: "At its peak in the 12th century, the Khmer Empire's capital at Angkor was the largest pre-industrial city in the world, with a population of nearly one million and a sophisticated hydraulic network.",
    category: "Medieval",
  },
  {
    difficulty: "Scholar",
    iconKey: "anchor",
    question:
      "The Haitian Revolution (1791\u20131804), the only successful large-scale slave revolt in history, defeated armies from which major European power?",
    options: ["Spain", "Britain", "France", "Portugal"],
    correctIndex: 2,
    fact: "Napoleon sent 40,000 troops to reconquer Haiti. Disease and fierce resistance destroyed the expedition. Haiti became the first free Black republic and the second independent nation in the Americas.",
    category: "Early Modern",
  },

  // === MASTER (27-32) ===
  {
    difficulty: "Master",
    iconKey: "book",
    question:
      "The 'Investiture Controversy' (1076\u20131122) was a power struggle between the Holy Roman Emperor and the Pope over the right to do what?",
    options: [
      "Collect tithes",
      "Appoint church officials",
      "Declare holy wars",
      "Annul royal marriages",
    ],
    correctIndex: 1,
    fact: "Emperor Henry IV was forced to stand barefoot in the snow at Canossa for three days begging Pope Gregory VII's forgiveness. The episode became a lasting symbol of papal power over secular rulers.",
    category: "Medieval",
  },
  {
    difficulty: "Master",
    iconKey: "shield",
    question:
      "The Delian League, originally an anti-Persian alliance, was gradually transformed into an Athenian empire. Which event marked its founding?",
    options: [
      "Battle of Marathon",
      "Battle of Thermopylae",
      "Persian retreat after Plataea and Mycale",
      "Death of Pericles",
    ],
    correctIndex: 2,
    fact: "Founded around 478 BC after the Persian Wars, Athens moved the League's treasury from Delos to Athens in 454 BC \u2014 effectively converting allied contributions into Athenian imperial revenue.",
    category: "Ancient",
  },
  {
    difficulty: "Master",
    iconKey: "scroll",
    question:
      "The Treaty of Nerchinsk (1689), the first formal treaty between Russia and China, established borders in which region?",
    options: ["Central Asia", "Manchuria/Amur River", "Mongolia", "Xinjiang"],
    correctIndex: 1,
    fact: "Negotiated in Latin by Jesuit intermediaries, Nerchinsk kept Russia out of the Amur basin for 170 years. It was the first treaty China signed with a European power as equals.",
    category: "Early Modern",
  },
  {
    difficulty: "Master",
    iconKey: "shield",
    question:
      "The Mfecane (or Difaqane) \u2014 a period of widespread chaos and migration in southern Africa \u2014 was largely triggered by the rise of which kingdom in the early 19th century?",
    options: ["Zulu Kingdom", "Ndebele Kingdom", "Swazi Kingdom", "Sotho Kingdom"],
    correctIndex: 0,
    fact: "Under Shaka Zulu's military innovations, the Zulu Kingdom's expansion from 1815 onward displaced dozens of peoples across southern Africa, reshaping the entire region's ethnic geography.",
    category: "Early Modern",
  },
  {
    difficulty: "Master",
    iconKey: "sword",
    question:
      "The Fourth Crusade (1202\u20131204) infamously never reached the Holy Land. Instead, the Crusaders sacked which Christian city?",
    options: ["Antioch", "Constantinople", "Alexandria", "Thessalonica"],
    correctIndex: 1,
    fact: "Venetian financial manipulation diverted the Crusade to Constantinople. The three-day sack devastated the Byzantine capital and created the short-lived 'Latin Empire' \u2014 permanently weakening Byzantium.",
    category: "Medieval",
  },
  {
    difficulty: "Master",
    iconKey: "flame",
    question:
      "The 'General Crisis of the 17th Century' saw major revolts across Europe and Asia. Which of these was NOT a major rebellion during this period?",
    options: [
      "English Civil War",
      "Fronde in France",
      "Pugachev's Rebellion in Russia",
      "Catalan Revolt against Spain",
    ],
    correctIndex: 2,
    fact: "Pugachev's Rebellion was in the 1770s. The 17th-century crisis saw simultaneous upheavals \u2014 the English Civil War, French Fronde, Catalan and Portuguese revolts, Ming dynasty collapse, and Ottoman instability \u2014 possibly linked to the Little Ice Age.",
    category: "Early Modern",
  },

  // === GRANDMASTER (33-35) ===
  {
    difficulty: "Grandmaster",
    iconKey: "anchor",
    question:
      "The 'Asiento de Negros', a contract granted to Britain at the Treaty of Utrecht (1713), gave Britain the monopoly right to supply what to Spanish America?",
    options: ["Silver bullion", "Enslaved Africans", "Manufactured textiles", "Gunpowder and arms"],
    correctIndex: 1,
    fact: "The Asiento allowed Britain to sell 4,800 enslaved people per year to Spanish colonies. The South Sea Company held the contract \u2014 its speculative bubble and collapse in 1720 became one of history's great financial crises.",
    category: "Early Modern",
  },
  {
    difficulty: "Grandmaster",
    iconKey: "scroll",
    question:
      "The 'Donation of Constantine', used for centuries to justify papal temporal authority, was proven to be a forgery in 1440 by which Renaissance humanist?",
    options: ["Petrarch", "Lorenzo Valla", "Erasmus", "Niccol\u00f2 Machiavelli"],
    correctIndex: 1,
    fact: "Valla used philological analysis to prove the document's Latin couldn't possibly date from the 4th century. His work was explosive \u2014 it undermined a key foundation of papal political power and became a landmark in historical criticism.",
    category: "Early Modern",
  },
  {
    difficulty: "Grandmaster",
    iconKey: "flame",
    question:
      "The 'Tanzimat' reforms (1839\u20131876) in the Ottoman Empire were inaugurated by which edict that guaranteed life, honour and property to all Ottoman subjects regardless of religion?",
    options: [
      "Hatt-\u0131 H\u00fcmayun",
      "G\u00fclhane Hatt-\u0131 \u015eerif",
      "Kanun-i Esasi",
      "Sened-i \u0130ttifak",
    ],
    correctIndex: 1,
    fact: "The G\u00fclhane edict, read aloud in the Rose Garden of Topkap\u0131 Palace, was a revolutionary attempt to modernise the Ottoman state along European lines. It promised equality for Muslims and non-Muslims \u2014 though implementation was uneven and provoked conservative backlash.",
    category: "Early Modern",
  },
] as const;
