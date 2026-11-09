export type SyllabusTopic = {
  id: string;
  title: string;
  subtopics: string[];
  citations: string[];
};

export type StoredTopicMap = {
  id: "syllabus-topic-map";
  generatedAt: string;
  syllabusSources: string[];
  sourceChunkCount: number;
  topics: SyllabusTopic[];
};

export type MappedPaperQuestion = {
  question: string;
  topicId: string;
  topic: string;
  citation: string;
  mappingReason: string;
};

export type StoredPaperAnalysis = {
  id: "past-paper-analysis";
  generatedAt: string;
  paperSources: string[];
  questionCount: number;
  questions: MappedPaperQuestion[];
};
