"use client";

import { useState } from "react";
import type { SubjectRecord } from "@/lib/lerntutor-config";

type LernTutorConfig = {
  instructions: any;
  didaktik: any;
  subjects: SubjectRecord[];
};

type SessionState = {
  grade: number;
  schoolType: string;
  subject: NormalizedSubject;
  modeId: string;
  topic: string;
  turn: number;
  level: string;
};

type NormalizedSubject = SubjectRecord & {
  gradesList: number[];
  resolvedModule: string | null;
  modes: string[];
};

const modeCatalog: Record<string, { label: string; intro: string }> = {
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

const schoolTypeProfiles: Record<
  string,
  {
    gradeRange: [number, number];
    allowedSubjects?: string[];
    blockedSubjects?: string[];
  }
> = {
  gymnasium: {
    gradeRange: [5, 13],
  },
  realschule: {
    gradeRange: [5, 10],
    allowedSubjects: [
      "deutsch",
      "englisch",
      "mathematik",
      "religion",
      "ethik_philosophie",
      "geschichte",
      "geographie",
      "politik_sozialkunde",
      "biologie",
      "physik",
      "chemie",
      "musik",
      "informatik",
      "franzoesisch",
      "bwr",
    ],
  },
  haupt_mittel_schule: {
    gradeRange: [5, 10],
    allowedSubjects: [
      "deutsch",
      "englisch",
      "mathematik",
      "religion",
      "ethik_philosophie",
      "geschichte",
      "geographie",
      "politik_sozialkunde",
      "nwt",
      "musik",
      "informatik",
      "bwr",
    ],
  },
  gesamtschule_gemeinschaftsschule: {
    gradeRange: [5, 13],
  },
  berufliches_gymnasium_berufskolleg: {
    gradeRange: [11, 13],
    blockedSubjects: ["latein"],
  },
};

function parseGrades(gradesValue: string) {
  if (!gradesValue.includes("-")) {
    return [];
  }

  const [fromText, toText] = gradesValue.split("-");
  const from = Number(fromText);
  const to = Number(toText);

  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    return [];
  }

  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

function normalizeModuleName(moduleName: string | null) {
  if (!moduleName) {
    return null;
  }

  return moduleName.replace(/_v\d+\.json$/i, ".json");
}

function getDefaultModes(subject: SubjectRecord) {
  const label = subject.label.toLowerCase();
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

function normalizeSubjects(subjects: SubjectRecord[]): NormalizedSubject[] {
  return subjects
    .filter((subject) => subject.enabled)
    .map((subject) => ({
      ...subject,
      gradesList: parseGrades(subject.grades),
      resolvedModule: normalizeModuleName(subject.module),
      modes: getDefaultModes(subject),
    }));
}

function formatSchoolTypeLabel(value: string) {
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLevelForGrade(grade: number) {
  if (grade <= 6) return "basis";
  if (grade <= 8) return "mittel_1";
  if (grade <= 10) return "mittel_2";
  return "oberstufe";
}

function isGradeAllowedForSchoolType(grade: number, schoolType: string) {
  const range = schoolTypeProfiles[schoolType]?.gradeRange;

  if (!range) {
    return true;
  }

  return grade >= range[0] && grade <= range[1];
}

function isSubjectAllowedForSchoolType(subjectId: string, schoolType: string) {
  const profile = schoolTypeProfiles[schoolType];

  if (!profile) {
    return true;
  }

  if (profile.allowedSubjects && !profile.allowedSubjects.includes(subjectId)) {
    return false;
  }

  if (profile.blockedSubjects && profile.blockedSubjects.includes(subjectId)) {
    return false;
  }

  return true;
}

export function LernTutorApp({ config }: { config: LernTutorConfig }) {
  const subjects = normalizeSubjects(config.subjects);
  const schoolTypes =
    config.instructions.school_context_management?.allowed_types ?? [
      "gymnasium",
      "realschule",
      "haupt_mittel_schule",
      "gesamtschule_gemeinschaftsschule",
      "berufliches_gymnasium_berufskolleg",
    ];

  const [grade, setGrade] = useState("");
  const [schoolType, setSchoolType] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [modeId, setModeId] = useState("");
  const [topic, setTopic] = useState("");
  const [responseText, setResponseText] = useState("");
  const [session, setSession] = useState<SessionState | null>(null);
  const [feedback, setFeedback] = useState("");

  const availableGrades = Array.from({ length: 9 }, (_, index) => index + 5).filter((entry) =>
    schoolType ? isGradeAllowedForSchoolType(entry, schoolType) : true,
  );

  const availableSubjects = subjects.filter((subject) =>
    grade && schoolType
      ? subject.gradesList.includes(Number(grade)) &&
        isSubjectAllowedForSchoolType(subject.id, schoolType)
      : false,
  );

  const selectedSubject = subjects.find((subject) => subject.id === subjectId) ?? null;

  const availableModes =
    selectedSubject?.modes.filter((entry) => entry !== "abitur_prep" || Number(grade) >= 11) ?? [];

  const tutoringSteps =
    config.instructions.workflow?.generic_tutoring_loop?.steps ?? [
      "Aufgabe oder Thema in eigenen Worten erfassen.",
      "Gegebenes und Gesuchtes klaeren.",
      "Vorwissen aktivieren.",
      "Nur den naechsten kleinen Schritt vorschlagen.",
      "Zwischenergebnis pruefen und Rueckmeldung geben.",
      "Lerntransfer anstossen.",
    ];

  const getGradeLevelRule = (level: string) => config.didaktik.grade_level_rules?.[level] ?? null;
  const getSchoolTypeRule = (value: string) => config.didaktik.school_type_rules?.[value] ?? null;
  const getMatrixEntry = (level: string, value: string) =>
    config.didaktik.adaptation_matrix?.find(
      (entry: any) => entry.grade_level === level && entry.school_type === value,
    ) ?? null;

  const buildStepContent = (currentSession: SessionState, previousResponse = "") => {
    const stepIndex = Math.min(currentSession.turn, tutoringSteps.length - 1);
    const gradeLevelRule = getGradeLevelRule(currentSession.level);
    const schoolTypeRule = getSchoolTypeRule(currentSession.schoolType);
    const matrixEntry = getMatrixEntry(currentSession.level, currentSession.schoolType);
    const languageStyle =
      matrixEntry?.language_style_override ||
      gradeLevelRule?.language_style ||
      "schuelergerecht und klar";

    return {
      nextStep: tutoringSteps[stepIndex],
      question: `Was ist dein naechster kleiner Schritt zu "${currentSession.topic}"?`,
      hint: `${modeCatalog[currentSession.modeId]?.intro ?? ""} ${
        previousResponse
          ? "Deine letzte Antwort zeigt schon einen Ansatz. Baue genau darauf auf."
          : "Starte mit einem kleinen Teil der Aufgabe, nicht mit der ganzen Loesung."
      } Schulart-Fokus: ${schoolTypeRule?.focus ?? "schrittweise und verstaendlich"}. Sprachstil: ${languageStyle}. Erwartete Leistung: ${
        gradeLevelRule?.expected_operations ?? "schrittweise verstehen und anwenden"
      }. Fachbezug: ${currentSession.subject.example_topics?.[0] ?? currentSession.topic}. Modul: ${
        currentSession.subject.resolvedModule ?? "generischer Tutor"
      }.`,
    };
  };

  const stepContent = session ? buildStepContent(session, responseText) : null;

  const handleStartSession = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!grade || !schoolType || !selectedSubject || !modeId || !topic.trim()) {
      return;
    }

    setFeedback("");
    setResponseText("");
    setSession({
      grade: Number(grade),
      schoolType,
      subject: selectedSubject,
      modeId,
      topic: topic.trim(),
      turn: 0,
      level: getLevelForGrade(Number(grade)),
    });
  };

  const handleEvaluateResponse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session) {
      return;
    }

    const trimmed = responseText.trim();
    if (!trimmed) {
      setFeedback("Ich brauche einen kleinen Zwischenstand von dir, damit ich dich sinnvoll weiterfuehren kann.");
      return;
    }

    setFeedback(
      `${trimmed.split(/\s+/).length >= 8 ? "Das ist ein guter Ansatz. Du bringst schon eigenes Denken mit." : "Das ist ein brauchbarer Start. Wir machen den naechsten Schritt bewusst klein."}\n\nIch gebe dir keine fertige Komplettloesung, sondern fuehre dich Schritt fuer Schritt weiter.\n\nVersuche jetzt, deinen Gedanken noch etwas genauer auf "${session.topic}" im Fach ${session.subject.label} zu beziehen.`,
    );

    setSession({
      ...session,
      turn: session.turn + 1,
    });
  };

  return (
    <div className="page-shell">
      <aside className="hero-panel">
        <p className="eyebrow">Aus Prompt wird Produkt</p>
        <h1>
          <span className="title-line">Dr. DirKInstitute</span>
          <span className="title-line">LernTutor</span>
        </h1>
        <p className="hero-copy">
          Ein digitaler LernTutor fuer Klassen 5 bis 13 mit Schulart, Fachauswahl, Lernmodi und sanfter Schritt-fuer-Schritt-Begleitung.
        </p>

        <div className="hero-grid">
          <div className="info-card">
            <span className="info-label">Didaktik</span>
            <strong>Sokratisch statt vorsagen</strong>
            <p>Die App fuehrt durch kleine naechste Schritte und vermeidet komplette Loesungen.</p>
          </div>
          <div className="info-card">
            <span className="info-label">Zielgruppe</span>
            <strong>Klasse 5 bis 13</strong>
            <p>Sprache, Themen und Hinweise passen sich an Klassenstufe und Schulart an.</p>
          </div>
        </div>

        <div className="brand-credit">
          <img className="brand-credit-logo" src="/branding/Logo.jpg" alt="Dr. DirKInstitute Logo" />
          <p>[c] 2026 by Dr. Dirk Koetting - Dr. DirKInstitute</p>
          <div className="brand-disclaimer">
            <strong>Disclaimer</strong>
            <p>
              Dr. DirKInstitute LernTutor ist ein digitaler Lernbegleiter und Tutor. Die App unterstuetzt beim Verstehen, Ueben und Strukturieren von Lerninhalten, ersetzt aber keine Lehrkraft, keine individuelle Fachberatung und keine schulische Bewertung.
            </p>
            <p>
              Die Bearbeitung von Aufgaben, die Nutzung der Hinweise und die fachliche Endkontrolle bleiben in der Eigenverantwortung des Schuelers oder der Schuelerin.
            </p>
          </div>
        </div>
      </aside>

      <main className="app-panel">
        <section className="setup-panel">
          <div className="section-heading">
            <p className="eyebrow">Lernsitzung</p>
            <h2>Start konfigurieren</h2>
          </div>

          <form className="setup-form" onSubmit={handleStartSession}>
            <label className="field">
              <span>Schulart</span>
              <select
                value={schoolType}
                onChange={(event) => {
                  const nextSchoolType = event.target.value;
                  setSchoolType(nextSchoolType);
                  setSubjectId("");
                  setModeId("");

                  if (grade && !isGradeAllowedForSchoolType(Number(grade), nextSchoolType)) {
                    setGrade("");
                  }
                }}
                required
              >
                <option value="">Bitte waehlen</option>
                {schoolTypes.map((entry: string) => (
                  <option key={entry} value={entry}>
                    {formatSchoolTypeLabel(entry)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Klassenstufe</span>
              <select
                value={grade}
                onChange={(event) => {
                  setGrade(event.target.value);
                  setSubjectId("");
                  setModeId("");
                }}
                required
              >
                <option value="">{schoolType ? "Bitte waehlen" : "Bitte zuerst Schulart waehlen"}</option>
                {availableGrades.map((entry) => (
                  <option key={entry} value={entry}>
                    Klasse {entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Fach</span>
              <select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setModeId("");
                }}
                required
              >
                <option value="">
                  {!schoolType
                    ? "Bitte zuerst Schulart waehlen"
                    : !grade
                      ? "Bitte zuerst Klasse waehlen"
                      : "Fach waehlen"}
                </option>
                {availableSubjects.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Lernmodus</span>
              <select value={modeId} onChange={(event) => setModeId(event.target.value)} required>
                <option value="">{selectedSubject ? "Lernmodus waehlen" : "Bitte Fach waehlen"}</option>
                {availableModes.map((entry) => (
                  <option key={entry} value={entry}>
                    {modeCatalog[entry]?.label ?? entry}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-wide">
              <span>Thema oder Aufgabe</span>
              <textarea
                rows={4}
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Zum Beispiel: Prozentrechnung, Gedichtanalyse oder Simple Past"
                required
              />
            </label>

            <button type="submit" className="primary-btn">
              Lernsitzung starten
            </button>
          </form>
        </section>

        <section className="session-panel">
          <div className="section-heading">
            <p className="eyebrow">Tutor</p>
            <h2>Begleitete Lernhilfe</h2>
          </div>

          <div className={`session-summary${session ? "" : " empty"}`}>
            {session ? (
              <>
                <strong>Aktive Sitzung:</strong> Klasse {session.grade}, {session.subject.label}, {modeCatalog[session.modeId]?.label ?? session.modeId}
                <br />
                <strong>Schulart:</strong> {formatSchoolTypeLabel(session.schoolType)}
                <br />
                <strong>Thema:</strong> {session.topic}
                <br />
                <strong>Niveau:</strong> {session.level}
                <br />
                <strong>Modul:</strong> {session.subject.resolvedModule ?? "generischer Tutor"}
              </>
            ) : (
              `Konfiguration geladen: ${subjects.length} Faecher aktiv.`
            )}
          </div>

          {session && stepContent ? (
            <>
              <div className="coach-card">
                <div className="coach-block">
                  <span className="coach-label">Naechster Schritt</span>
                  <p>{stepContent.nextStep}</p>
                </div>
                <div className="coach-block">
                  <span className="coach-label">Tutorfrage</span>
                  <p>{stepContent.question}</p>
                </div>
                <div className="coach-block">
                  <span className="coach-label">Lernhinweis</span>
                  <p>{stepContent.hint}</p>
                </div>
              </div>

              <form className="response-form" onSubmit={handleEvaluateResponse}>
                <label className="field field-wide">
                  <span>Deine Antwort oder dein Zwischenstand</span>
                  <textarea
                    rows={5}
                    value={responseText}
                    onChange={(event) => setResponseText(event.target.value)}
                    placeholder="Schreibe hier, was du schon weisst oder was du versucht hast."
                  />
                </label>
                <button type="submit" className="secondary-btn">
                  Antwort auswerten
                </button>
              </form>

              {feedback ? <div className="feedback-card">{feedback}</div> : null}

              <div id="print-actions">
                <button type="button" className="secondary-btn" onClick={() => window.print()}>
                  Ergebnis als PDF drucken
                </button>
              </div>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
