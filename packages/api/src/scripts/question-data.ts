/**
 * All 35 original questions from jsx.md, mapped to CreateQuestionRequest.
 *
 * Each question has its original text, options, correctIndex, and fact
 * preserved exactly. The `emoji` field has been replaced with `iconKey`
 * and a `category` field has been assigned based on historical era.
 */

import type { CreateQuestionRequest } from "@history-gauntlet/shared";

/** All 35 seed questions in tier order. */
export const SEED_QUESTIONS: readonly CreateQuestionRequest[] = [
  // === NOVICE (1-6) ===
  {
    difficulty: "Novice",
    iconKey: "globe",
    question: "Which country gifted the Statue of Liberty to the United States?",
    options: ["Britain", "France", "Spain", "Netherlands"],
    correctIndex: 1,
    fact: "France gifted the statue in 1886 to celebrate the centennial of American independence and their shared ideals of liberty.",
    category: "Modern",
  },
  {
    difficulty: "Novice",
    iconKey: "castle",
    question: "In which decade did the Berlin Wall fall?",
    options: ["1970s", "1980s", "1990s", "2000s"],
    correctIndex: 1,
    fact: "The Wall fell on November 9, 1989. East German guards, overwhelmed by crowds after a confused press conference, simply opened the gates.",
    category: "Modern",
  },
  {
    difficulty: "Novice",
    iconKey: "anchor",
    question: "The Titanic sank on its maiden voyage in which year?",
    options: ["1905", "1912", "1918", "1923"],
    correctIndex: 1,
    fact: "Over 1,500 people died in the sinking. The ship had been deemed 'practically unsinkable' by the trade press \u2014 a phrase that haunted its legacy.",
    category: "Modern",
  },
  {
    difficulty: "Novice",
    iconKey: "sword",
    question: "Julius Caesar was assassinated in which city?",
    options: ["Athens", "Rome", "Alexandria", "Constantinople"],
    correctIndex: 1,
    fact: "Caesar was stabbed 23 times by a group of senators on the Ides of March (March 15), 44 BC, at the Theatre of Pompey.",
    category: "Ancient",
  },
  {
    difficulty: "Novice",
    iconKey: "globe",
    question: "Which explorer is traditionally credited with 'discovering' the Americas in 1492?",
    options: ["Vasco da Gama", "Ferdinand Magellan", "Christopher Columbus", "Amerigo Vespucci"],
    correctIndex: 2,
    fact: "Columbus made four voyages to the Americas but went to his grave believing he had reached Asia. The continents were named after Vespucci instead.",
    category: "Early Modern",
  },
  {
    difficulty: "Novice",
    iconKey: "bell",
    question: "The French Revolution began with the storming of which fortress-prison?",
    options: ["The Louvre", "Versailles", "The Bastille", "Ch\u00e2teau d'If"],
    correctIndex: 2,
    fact: "On July 14, 1789, a Parisian mob stormed the Bastille \u2014 though it held only seven prisoners at the time. The act was symbolic, not strategic.",
    category: "Early Modern",
  },

  // === APPRENTICE (7-12) ===
  {
    difficulty: "Apprentice",
    iconKey: "sword",
    question: "Which Mongol leader created the largest contiguous land empire in history?",
    options: ["Kublai Khan", "Tamerlane", "Genghis Khan", "Attila the Hun"],
    correctIndex: 2,
    fact: "At its peak under Genghis Khan and his successors, the Mongol Empire covered 24 million km\u00b2 \u2014 about 16% of Earth's total land area.",
    category: "Medieval",
  },
  {
    difficulty: "Apprentice",
    iconKey: "shield",
    question: "The 'Black Death' pandemic of the 14th century was caused by which disease?",
    options: ["Smallpox", "Cholera", "Bubonic plague", "Typhus"],
    correctIndex: 2,
    fact: "The plague killed an estimated 75\u2013200 million people across Eurasia. It wiped out roughly one-third of Europe's population between 1347 and 1353.",
    category: "Medieval",
  },
  {
    difficulty: "Apprentice",
    iconKey: "scroll",
    question: "The Magna Carta, signed in 1215, limited the power of which English king?",
    options: ["Henry II", "Richard I", "King John", "Edward I"],
    correctIndex: 2,
    fact: "Rebellious barons forced King John to sign at Runnymede. He immediately asked the Pope to annul it, sparking civil war.",
    category: "Medieval",
  },
  {
    difficulty: "Apprentice",
    iconKey: "sword",
    question:
      "The samurai class was formally abolished during which period of Japanese modernisation?",
    options: ["Edo Period", "Meiji Restoration", "Taish\u014d Democracy", "Sh\u014dwa Era"],
    correctIndex: 1,
    fact: "The Meiji government dismantled feudalism in the 1870s. The samurai lost their stipends and exclusive right to carry swords \u2014 some rebelled in the Satsuma Rebellion of 1877.",
    category: "Medieval",
  },
  {
    difficulty: "Apprentice",
    iconKey: "book",
    question:
      "The Rosetta Stone, key to deciphering Egyptian hieroglyphics, was written in how many scripts?",
    options: ["Two", "Three", "Four", "Five"],
    correctIndex: 1,
    fact: "The stone featured hieroglyphics, Demotic Egyptian, and Ancient Greek. Jean-Fran\u00e7ois Champollion cracked the code in 1822 using the Greek as a key.",
    category: "Medieval",
  },
  {
    difficulty: "Apprentice",
    iconKey: "castle",
    question:
      "The Reconquista \u2014 the Christian reconquest of the Iberian Peninsula from Muslim rule \u2014 ended in which year?",
    options: ["1453", "1492", "1519", "1588"],
    correctIndex: 1,
    fact: "Granada, the last Muslim stronghold, fell in January 1492 \u2014 the same year Columbus sailed west. Ferdinand and Isabella achieved both in one momentous year.",
    category: "Medieval",
  },

  // === JOURNEYMAN (13-19) ===
  {
    difficulty: "Journeyman",
    iconKey: "sword",
    question:
      "The Battle of Cannae (216 BC), considered one of the greatest tactical victories in military history, was won by which commander?",
    options: ["Scipio Africanus", "Hannibal Barca", "Pyrrhus of Epirus", "Alexander the Great"],
    correctIndex: 1,
    fact: "Hannibal's double envelopment at Cannae destroyed 8 Roman legions in a single day \u2014 roughly 50,000\u201370,000 killed. Military academies still study the battle today.",
    category: "Ancient",
  },
  {
    difficulty: "Journeyman",
    iconKey: "globe",
    question:
      "The Umayyad Caliphate, the largest empire the world had yet seen by area, had its capital in which city?",
    options: ["Baghdad", "Mecca", "Damascus", "Cairo"],
    correctIndex: 2,
    fact: "From Damascus, the Umayyads ruled from Spain to Central Asia (661\u2013750 AD). When the Abbasids overthrew them, one Umayyad prince escaped to found a rival caliphate in C\u00f3rdoba.",
    category: "Ancient",
  },
  {
    difficulty: "Journeyman",
    iconKey: "globe",
    question:
      "The Treaty of Tordesillas (1494) divided the newly discovered world between which two powers?",
    options: ["England & France", "Spain & Portugal", "Spain & Netherlands", "Portugal & England"],
    correctIndex: 1,
    fact: "Pope Alexander VI drew a line down the Atlantic. Everything west went to Spain, everything east to Portugal \u2014 which is why Brazil speaks Portuguese today.",
    category: "Medieval",
  },
  {
    difficulty: "Journeyman",
    iconKey: "flame",
    question:
      "The Taiping Rebellion (1850\u20131864) in China was led by a man who claimed to be what?",
    options: [
      "The reincarnation of Confucius",
      "The brother of Jesus Christ",
      "The rightful Mongol Khan",
      "A descendant of the Ming dynasty",
    ],
    correctIndex: 1,
    fact: "Hong Xiuquan claimed to be Jesus's younger brother and established the 'Heavenly Kingdom.' The rebellion killed an estimated 20\u201330 million people \u2014 one of history's deadliest conflicts.",
    category: "Early Modern",
  },
  {
    difficulty: "Journeyman",
    iconKey: "mountain",
    question: "Which ancient trade network connected Chang'an (modern Xi'an) to the Mediterranean?",
    options: ["The Amber Road", "The Incense Route", "The Silk Road", "The Spice Route"],
    correctIndex: 2,
    fact: "The Silk Road wasn't a single road but a vast network of overland and maritime routes. The name itself was coined in 1877 by German geographer Ferdinand von Richthofen.",
    category: "Medieval",
  },
  {
    difficulty: "Journeyman",
    iconKey: "crown",
    question:
      "The War of the Roses (1455\u20131487) was a dynastic conflict between which two English houses?",
    options: ["Tudor & Stuart", "York & Lancaster", "Plantagenet & Windsor", "Normandy & Anjou"],
    correctIndex: 1,
    fact: "The wars ended when Henry Tudor (Lancaster) defeated Richard III (York) at Bosworth Field and married Elizabeth of York, uniting the rival houses and founding the Tudor dynasty.",
    category: "Medieval",
  },
  {
    difficulty: "Journeyman",
    iconKey: "flame",
    question:
      "The Great Fire of London (1666) destroyed much of the city. How many people are officially recorded as having died?",
    options: ["6", "Around 100", "Around 1,000", "Over 10,000"],
    correctIndex: 0,
    fact: "Officially only 6 deaths were recorded, though the true toll was almost certainly higher \u2014 many poor and undocumented residents likely perished uncounted.",
    category: "Early Modern",
  },
] as const;
