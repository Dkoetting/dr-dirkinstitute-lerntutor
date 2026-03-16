const fallbackConfig = {
  instructions: {
    workflow: {
      generic_tutoring_loop: {
        steps: [
          "Aufgabe oder Thema in eigenen Worten erfassen.",
          "Gegebenes und Gesuchtes klaeren.",
          "Vorwissen aktivieren.",
          "Nur den naechsten kleinen Schritt vorschlagen.",
          "Zwischenergebnis pruefen und Rueckmeldung geben.",
          "Lerntransfer anstossen.",
        ],
      },
    },
    school_context_management: {
      allowed_types: [
        "gymnasium",
        "realschule",
        "haupt_mittel_schule",
        "gesamtschule_gemeinschaftsschule",
        "berufliches_gymnasium_berufskolleg",
      ],
    },
  },
  didaktik: {
    adaptation_matrix: [],
    grade_level_rules: {},
    school_type_rules: {},
  },
  subjects: [
    {
      id: "mathematik",
      label: "Mathematik",
      enabled: true,
      grades: "5-13",
      module: "mathe_tutor.json",
      example_topics: ["Bruchrechnung", "Funktionen"],
    },
  ],
};

const modeCatalog = {
  homework_help: {
    label: "Hausaufgabenhilfe",
    intro: "Wir arbeiten an deiner Aufgabe in kleinen Schritten.",
  },
  quiz: {
    label: "Quiz",
    intro: "Ich teste dein Wissen mit einzelnen Fragen und gebe direkt Feedback.",
  },
  flashcards: {
    label: "Karteikarten",
    intro: "Wir ueben mit kurzen Frage-Antwort-Karten.",
  },
  self_test: {
    label: "Selbsttest",
    intro: "Wir machen einen kurzen Lernstands-Check mit sanftem Feedback.",
  },
  practice: {
    label: "Ueben und Vertiefen",
    intro: "Wir wiederholen das Thema und machen daraus eine gezielte Uebung.",
  },
  abitur_prep: {
    label: "Abitur-Vorbereitung",
    intro: "Wir arbeiten auf Oberstufenniveau mit Vernetzung und Pruefungsorientierung.",
  },
};

const gradeSelect = document.querySelector("#grade-select");
const schoolTypeSelect = document.querySelector("#school-type-select");
const subjectSelect = document.querySelector("#subject-select");
const modeSelect = document.querySelector("#mode-select");
const taskInput = document.querySelector("#task-input");
const setupForm = document.querySelector("#setup-form");
const responseForm = document.querySelector("#response-form");
const sessionSummary = document.querySelector("#session-summary");
const coachCard = document.querySelector("#coach-card");
const feedbackCard = document.querySelector("#feedback-card");
const nextStepText = document.querySelector("#next-step-text");
const questionText = document.querySelector("#question-text");
const hintText = document.querySelector("#hint-text");
const studentResponse = document.querySelector("#student-response");
const printActions = document.querySelector("#print-actions");
const printPdfButton = document.querySelector("#print-pdf-button");

let activeSession = null;
let appConfig = {
  instructions: fallbackConfig.instructions,
  didaktik: fallbackConfig.didaktik,
  subjects: [],
};

function parseGrades(gradesValue) {
  if (Array.isArray(gradesValue)) {
    return gradesValue;
  }

  if (typeof gradesValue === "string" && gradesValue.includes("-")) {
    const [fromText, toText] = gradesValue.split("-");
    const from = Number(fromText);
    const to = Number(toText);

    if (Number.isInteger(from) && Number.isInteger(to) && from <= to) {
      return Array.from({ length: to - from + 1 }, (_, index) => from + index);
    }
  }

  return [];
}

function normalizeModuleName(moduleName) {
  if (!moduleName) {
    return null;
  }

  return moduleName.replace(/_v\d+\.json$/i, ".json");
}

function getDefaultModes(subject) {
  const label = (subject.label || "").toLowerCase();
  const modes = ["homework_help", "quiz", "self_test", "practice"];

  if (
    label.includes("englisch") ||
    label.includes("franz") ||
    label.includes("spanisch") ||
    label.includes("latein")
  ) {
    modes.splice(2, 0, "flashcards");
  }

  if (parseGrades(subject.grades).some((grade) => grade >= 11)) {
    modes.push("abitur_prep");
  }

  return [...new Set(modes)];
}

function normalizeSubjects(subjects) {
  return subjects
    .filter((subject) => subject.enabled)
    .map((subject) => ({
      ...subject,
      gradesList: parseGrades(subject.grades),
      resolvedModule: normalizeModuleName(subject.module),
      modes: getDefaultModes(subject),
    }));
}

function fillSelect(select, items, placeholder) {
  select.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    select.appendChild(option);
  });
}

function getLevelForGrade(grade) {
  if (grade <= 6) return "basis";
  if (grade <= 8) return "mittel_1";
  if (grade <= 10) return "mittel_2";
  return "oberstufe";
}

function formatSchoolTypeLabel(value) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSchoolTypeOptions() {
  return (
    appConfig.instructions.school_context_management?.allowed_types ||
    fallbackConfig.instructions.school_context_management.allowed_types
  );
}

function getGradeLevelRule(level) {
  return appConfig.didaktik.grade_level_rules?.[level] || null;
}

function getSchoolTypeRule(schoolType) {
  return appConfig.didaktik.school_type_rules?.[schoolType] || null;
}

function getDidaktikProfileForSchool(level, schoolType) {
  return (
    appConfig.didaktik.adaptation_matrix?.filter(
      (entry) => entry.grade_level === level && entry.school_type === schoolType,
    ) || []
  );
}

function getLanguageStyle(grade, level, schoolType) {
  const matrixEntry = getDidaktikProfileForSchool(level, schoolType)[0];
  const gradeLevelRule = getGradeLevelRule(level);

  if (matrixEntry?.language_style_override) {
    return matrixEntry.language_style_override;
  }

  if (gradeLevelRule?.language_style) {
    return gradeLevelRule.language_style;
  }

  if (grade <= 6) return "sehr einfache Saetze und direkte Erklaerungen";
  if (grade <= 8) return "kurze Saetze mit erklaerten Fachbegriffen";
  if (grade <= 10) return "mittlere Satzlaenge mit klarer Struktur";
  return "fachsprachlich moeglich, aber gut strukturiert";
}

function getTutoringSteps() {
  return (
    appConfig.instructions.workflow?.generic_tutoring_loop?.steps ||
    fallbackConfig.instructions.workflow.generic_tutoring_loop.steps
  );
}

function populateGrades() {
  fillSelect(
    gradeSelect,
    Array.from({ length: 9 }, (_, index) => ({
      value: String(index + 5),
      label: `Klasse ${index + 5}`,
    })),
    "Bitte waehlen",
  );
}

function populateSchoolTypes() {
  fillSelect(
    schoolTypeSelect,
    getSchoolTypeOptions().map((schoolType) => ({
      value: schoolType,
      label: formatSchoolTypeLabel(schoolType),
    })),
    "Bitte waehlen",
  );
}

function getAvailableSubjects(grade) {
  return appConfig.subjects.filter((subject) => subject.gradesList.includes(grade));
}

function updateSubjectOptions() {
  const grade = Number(gradeSelect.value);

  if (!grade) {
    fillSelect(subjectSelect, [], "Bitte zuerst Klasse waehlen");
    fillSelect(modeSelect, [], "Bitte Fach waehlen");
    return;
  }

  fillSelect(
    subjectSelect,
    getAvailableSubjects(grade).map((subject) => ({
      value: subject.id,
      label: subject.label,
    })),
    "Fach waehlen",
  );

  fillSelect(modeSelect, [], "Bitte Fach waehlen");
}

function updateModeOptions() {
  const subject = appConfig.subjects.find((entry) => entry.id === subjectSelect.value);
  const grade = Number(gradeSelect.value);

  if (!subject) {
    fillSelect(modeSelect, [], "Bitte Fach waehlen");
    return;
  }

  fillSelect(
    modeSelect,
    subject.modes
      .filter((modeId) => modeId !== "abitur_prep" || grade >= 11)
      .map((modeId) => ({
        value: modeId,
        label: modeCatalog[modeId]?.label || modeId,
      })),
    "Lernmodus waehlen",
  );
}

function createNextStep(session, responseText = "") {
  const tutoringSteps = getTutoringSteps();
  const currentIndex = Math.min(session.turn, tutoringSteps.length - 1);
  const gradeLevelRule = getGradeLevelRule(session.level);
  const schoolTypeRule = getSchoolTypeRule(session.schoolType);
  const matrixEntry = getDidaktikProfileForSchool(session.level, session.schoolType)[0];
  const exampleTopic = session.subject.example_topics?.[0] || session.topic;
  const expectedOperations = gradeLevelRule?.expected_operations || "schrittweise verstehen und anwenden";
  const schoolFocus = schoolTypeRule?.focus || "schuelergerecht und schrittweise";
  const languageStyle = getLanguageStyle(session.grade, session.level, session.schoolType);
  const hintPrefix = responseText.trim()
    ? "Deine letzte Antwort zeigt schon einen Ansatz. Baue genau darauf auf."
    : "Starte mit einem kleinen Teil der Aufgabe, nicht mit der ganzen Loesung.";
  const examplePreference = matrixEntry?.example_preference || "passende Beispiele zum Thema";

  return {
    nextStep: tutoringSteps[currentIndex],
    question: `Was ist dein naechster kleiner Schritt zu "${session.topic}"?`,
    hint: `${modeCatalog[session.modeId]?.intro || ""} ${hintPrefix} Schulart-Fokus: ${schoolFocus}. Sprachstil: ${languageStyle}. Erwartete Leistung: ${expectedOperations}. Beispieltyp: ${examplePreference}. Fachbezug: ${exampleTopic}. Modul: ${session.subject.resolvedModule || "generischer Tutor"}.`,
  };
}

function evaluateResponse(session, responseText) {
  const trimmed = responseText.trim();

  if (!trimmed) {
    return "Ich brauche einen kleinen Zwischenstand von dir, damit ich dich sinnvoll weiterfuehren kann.";
  }

  const strongStart = trimmed.split(/\s+/).length >= 8;
  const encouragement = strongStart
    ? "Das ist ein guter Ansatz. Du bringst schon eigenes Denken mit."
    : "Das ist ein brauchbarer Start. Wir machen den naechsten Schritt bewusst klein.";

  return `${encouragement}\n\nIch gebe dir keine fertige Komplettloesung, sondern fuehre dich Schritt fuer Schritt weiter.\n\nVersuche jetzt, deinen Gedanken noch etwas genauer auf "${session.topic}" im Fach ${session.subject.label} zu beziehen.`;
}

function renderSession(session) {
  sessionSummary.classList.remove("empty");
  sessionSummary.innerHTML = `
    <strong>Aktive Sitzung:</strong> Klasse ${session.grade}, ${session.subject.label}, ${modeCatalog[session.modeId]?.label || session.modeId}<br />
    <strong>Schulart:</strong> ${formatSchoolTypeLabel(session.schoolType)}<br />
    <strong>Thema:</strong> ${session.topic}<br />
    <strong>Niveau:</strong> ${session.level}<br />
    <strong>Modul:</strong> ${session.subject.resolvedModule || "generischer Tutor"}
  `;

  const stepContent = createNextStep(session);
  nextStepText.textContent = stepContent.nextStep;
  questionText.textContent = stepContent.question;
  hintText.textContent = stepContent.hint;

  coachCard.classList.remove("hidden");
  responseForm.classList.remove("hidden");
  feedbackCard.classList.add("hidden");
  printActions.classList.remove("hidden");
  studentResponse.value = "";
}

async function loadJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Konnte ${path} nicht laden.`);
  }

  return response.json();
}

async function loadConfig() {
  try {
    let instructions;
    let didaktik;
    let subjectRegistry;

    if (window.HEBO_CONFIG) {
      instructions = window.HEBO_CONFIG.instructions;
      didaktik = window.HEBO_CONFIG.didaktik;
      subjectRegistry = window.HEBO_CONFIG.subjectRegistry;
    } else {
      [instructions, didaktik, subjectRegistry] = await Promise.all([
        loadJson("./config/instructions.json"),
        loadJson("./config/didaktik.json"),
        loadJson("./config/faecher_auswahl.json"),
      ]);
    }

    appConfig = {
      instructions: instructions || fallbackConfig.instructions,
      didaktik: didaktik || fallbackConfig.didaktik,
      subjects: normalizeSubjects(subjectRegistry?.subjects || fallbackConfig.subjects),
    };

    sessionSummary.textContent = `Konfiguration geladen: ${appConfig.subjects.length} Faecher aktiv.`;
  } catch (error) {
    appConfig = {
      instructions: fallbackConfig.instructions,
      didaktik: fallbackConfig.didaktik,
      subjects: normalizeSubjects(fallbackConfig.subjects),
    };
    sessionSummary.textContent = "Konfiguration konnte nicht geladen werden. Die App nutzt den eingebauten Fallback.";
  }

  populateGrades();
  populateSchoolTypes();
  updateSubjectOptions();
}

gradeSelect.addEventListener("change", updateSubjectOptions);
subjectSelect.addEventListener("change", updateModeOptions);
printPdfButton.addEventListener("click", () => window.print());

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const grade = Number(gradeSelect.value);
  const schoolType = schoolTypeSelect.value;
  const subject = appConfig.subjects.find((entry) => entry.id === subjectSelect.value);
  const modeId = modeSelect.value;
  const topic = taskInput.value.trim();

  if (!grade || !schoolType || !subject || !modeId || !topic) {
    return;
  }

  activeSession = {
    grade,
    schoolType,
    level: getLevelForGrade(grade),
    subject,
    modeId,
    topic,
    turn: 0,
  };

  renderSession(activeSession);
});

responseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!activeSession) {
    return;
  }

  const responseText = studentResponse.value;
  const feedback = evaluateResponse(activeSession, responseText);
  activeSession.turn += 1;

  const stepContent = createNextStep(activeSession, responseText);
  nextStepText.textContent = stepContent.nextStep;
  questionText.textContent = stepContent.question;
  hintText.textContent = stepContent.hint;
  feedbackCard.textContent = feedback;
  feedbackCard.classList.remove("hidden");
});

loadConfig();
