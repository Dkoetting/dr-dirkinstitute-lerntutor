import instructions from "@/config/instructions.json";
import didaktik from "@/config/didaktik.json";
import subjectRegistry from "@/config/faecher_auswahl.json";

export type SubjectRecord = {
  id: string;
  label: string;
  enabled: boolean;
  grades: string;
  module: string | null;
  example_topics?: string[];
};

export const lernTutorConfig = {
  instructions,
  didaktik,
  subjects: (subjectRegistry.subjects ?? []) as SubjectRecord[],
};
