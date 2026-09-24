import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

export interface GeneratedModule {
  title: string;
  description: string;
  lessons: {
    title: string;
    content: string;
    durationMinutes: number;
    isFree: boolean;
  }[];
}

export interface GeneratedCourseOutline {
  courseTitle: string;
  description: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  modules: GeneratedModule[];
  assignments?: GeneratedAssignment[];
}

export interface GeneratedAssignment {
  title: string;
  instructions: string;
  maxPoints: number;
}

export function extractCleanTopic(rawTopic: string): string {
  let cleaned = rawTopic
    .replace(/\*\*/g, '')
    .replace(/```/g, '')
    .replace(/^(Create|Generate) a (comprehensive|job-oriented|detailed|\w+)\s+/i, '')
    .replace(/^course (covering|on)\s+/i, '')
    .trim();

  const courseCoveringMatch = cleaned.match(/course covering (.*?)(\.|$)/i);
  if (courseCoveringMatch && courseCoveringMatch[1]) {
    cleaned = courseCoveringMatch[1].trim();
  }

  if (cleaned.length > 60) {
    cleaned = cleaned.slice(0, 55).replace(/\s+\S*$/, '').trim() + '...';
  }

  return cleaned || 'Software Engineering';
}

export async function generateCourseOutline(
  topic: string,
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER',
  numModules = 3
): Promise<GeneratedCourseOutline> {
  const cleanTopic = extractCleanTopic(topic);

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an expert curriculum designer. Generate a structured JSON course outline for the topic "${topic}" at level "${level}" with ${numModules} modules.
IMPORTANT: "courseTitle" MUST be a concise, catchy title under 80 characters (do not repeat the prompt instructions in the title).
Also include 2 practical assignments that instructors can immediately publish for this course.
Output MUST be raw JSON matching this structure:
{
  "courseTitle": "String (Max 80 chars)",
  "description": "String",
  "level": "${level}",
  "modules": [
    {
      "title": "Module Title",
      "description": "Module Overview",
      "lessons": [
        {
          "title": "Lesson Title",
          "content": "Lesson Summary & Key Concepts",
          "durationMinutes": 15,
          "isFree": true
        }
      ]
    }
  ],
  "assignments": [
    {
      "title": "Assignment Title",
      "instructions": "Clear rubric-style task instructions",
      "maxPoints": 100
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson) as GeneratedCourseOutline;

      if (parsed.courseTitle) {
        parsed.courseTitle = parsed.courseTitle.replace(/\*\*/g, '').trim();
        if (parsed.courseTitle.length > 140) {
          parsed.courseTitle = parsed.courseTitle.slice(0, 135).replace(/\s+\S*$/, '').trim() + '...';
        }
      }

      if (parsed.modules && Array.isArray(parsed.modules)) {
        parsed.modules = parsed.modules.map((mod) => ({
          ...mod,
          title: (mod.title || '').replace(/\*\*/g, '').trim(),
          lessons: (mod.lessons || []).map((les) => ({
            ...les,
            title: (les.title || '').replace(/\*\*/g, '').trim(),
          })),
        }));
      }

      if (parsed.assignments && Array.isArray(parsed.assignments)) {
        parsed.assignments = parsed.assignments.map((assignment) => ({
          title: (assignment.title || '').replace(/\*\*/g, '').trim(),
          instructions: (assignment.instructions || '').replace(/\*\*/g, '').trim(),
          maxPoints: Math.min(100, Math.max(1, Number(assignment.maxPoints) || 100)),
        }));
      }

      return parsed;
    } catch (err) {
      console.warn('Gemini API call failed or unconfigured, using domain fallback:', err);
    }
  }

  // Domain Fallback generator if API key is not present or API call fails
  return {
    courseTitle: `${cleanTopic}: ${level} Masterclass`,
    description: `A hands-on, practical engineering course on ${cleanTopic}. Learn modern best practices, architectural patterns, state management, and real-world deployment.`,
    level,
    modules: Array.from({ length: numModules }).map((_, i) => ({
      title: `Module ${i + 1}: Core Foundations & Architecture of ${cleanTopic}`,
      description: `In-depth breakdown of module ${i + 1} topics, covering key abstractions and practical implementations.`,
      lessons: [
        {
          title: `Lesson ${i + 1}.1: Fundamentals & Getting Started`,
          content: `Introduction to key concepts in ${cleanTopic}. Setting up the project workspace, dev environment, and core abstractions.`,
          durationMinutes: 20,
          isFree: i === 0,
        },
        {
          title: `Lesson ${i + 1}.2: Advanced Patterns & Production Considerations`,
          content: `Deep dive into optimization, state handling, security boundaries, and enterprise integration patterns.`,
          durationMinutes: 30,
          isFree: false,
        },
      ],
    })),
    assignments: [
      {
        title: `${cleanTopic} Capstone Build`,
        instructions: `Design and submit a practical ${cleanTopic} project. Include implementation notes, architecture choices, validation strategy, and testing evidence.`,
        maxPoints: 100,
      },
      {
        title: `${cleanTopic} Production Review`,
        instructions: `Analyze a realistic ${cleanTopic} scenario and write recommendations for security, performance, maintainability, and deployment readiness.`,
        maxPoints: 100,
      },
    ],
  };
}

export async function generateAssignmentDraft(
  courseTitle: string,
  courseDescription: string,
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER'
): Promise<GeneratedAssignment> {
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an instructional designer. Generate one practical graded assignment for this course.
Course Title: "${courseTitle}"
Course Description: "${courseDescription}"
Level: "${level}"

Return raw JSON only:
{
  "title": "Assignment title under 100 characters",
  "instructions": "Detailed, student-facing instructions with deliverables and grading criteria.",
  "maxPoints": 100
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson) as GeneratedAssignment;

      return {
        title: (parsed.title || `${courseTitle} Practical Assignment`).replace(/\*\*/g, '').trim(),
        instructions: (parsed.instructions || '').replace(/\*\*/g, '').trim(),
        maxPoints: Math.min(100, Math.max(1, Number(parsed.maxPoints) || 100)),
      };
    } catch (err) {
      console.warn('Gemini assignment generation failed, using domain fallback:', err);
    }
  }

  return {
    title: `${courseTitle} Applied Project`,
    instructions: `Create a practical submission that demonstrates your understanding of ${courseTitle}. Include your solution, reasoning, edge cases, and a short reflection on improvements you would make in production.`,
    maxPoints: 100,
  };
}

export async function generateAssignmentFeedback(
  assignmentTitle: string,
  instructions: string,
  submissionContent: string
): Promise<{ suggestedGrade: number; feedbackText: string }> {
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are an automated academic TA. Grade the following student submission.
Assignment Title: "${assignmentTitle}"
Instructions: "${instructions}"
Student Submission: "${submissionContent}"

Return raw JSON only:
{
  "suggestedGrade": 85,
  "feedbackText": "Constructive 3-4 sentence feedback highlighting strengths and key recommendations."
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson);
    } catch (err) {
      console.warn('Gemini API call failed, using domain fallback:', err);
    }
  }

  // Domain Fallback feedback generator
  const length = submissionContent.trim().length;
  const score = Math.min(100, Math.max(70, Math.floor(75 + (length / 20))));
  return {
    suggestedGrade: score,
    feedbackText: `Solid submission! You clearly demonstrated a strong grasp of ${assignmentTitle}. Key concepts were well explained. To improve further, consider adding more edge-case validation and unit test coverage.`,
  };
}
