import { API_BASE_URL } from '../config/api';

export interface BodyLanguageData {
  sessionId: string;
  eyeContact: number;
  engagement: number;
  attention: number;
  stability: number;
  expression: string; // Frontend uses: 'confident' | 'nervous' | 'distracted'
  // Backend expects: 'happy' | 'sad' | 'nervous' | 'neutral' | 'shocked'
  // We'll map frontend values to backend values
  expressionConfidence: number;
  dominantExpression?: string; // Most common expression over time
  sampleCount: number;
  timestamp: number;
}

/**
 * Map frontend expression values to backend-compatible values
 * Frontend: confident, nervous, distracted
 * Backend: happy, sad, nervous, neutral, shocked
 */
function mapExpressionToBackend(expression: string | null): string {
  if (!expression) return 'neutral';

  const mapping: Record<string, string> = {
    'confident': 'happy',      // Confident → happy (positive emotion)
    'nervous': 'nervous',      // Nervous → nervous (same)
    'distracted': 'sad',       // Distracted → sad (negative emotion)
  };

  return mapping[expression.toLowerCase()] || 'neutral';
}

/**
 * Save body language data to backend
 * This is called periodically during the interview to save aggregated scores
 */
export async function saveBodyLanguageData(
  data: BodyLanguageData
): Promise<void> {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No auth token found, skipping body language save");
    return;
  }

  try {
    // Map frontend expression values to backend-compatible values
    const backendData = {
      ...data,
      expression: mapExpressionToBackend(data.expression),
      dominantExpression: data.dominantExpression
        ? mapExpressionToBackend(data.dominantExpression)
        : undefined,
    };

    const response = await fetch(`${API_BASE_URL}/api/interview/body-language`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(backendData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Failed to save body language data: ${response.status}`
      );
    }

    console.log("✅ Body language data saved to backend");
  } catch (error: any) {
    // Don't throw - just log the error so it doesn't break the interview
    console.error("❌ Error saving body language data:", error.message);
  }
}

/**
 * Get body language data for a specific interview session
 */
export async function getBodyLanguageData(
  sessionId: string
): Promise<BodyLanguageData | null> {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No auth token found");
    return null;
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/interview/body-language/${sessionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No data found for this session
      }
      throw new Error(`Failed to fetch body language data: ${response.status}`);
    }

    const data = await response.json();
    return data.bodyLanguage || null;
  } catch (error: any) {
    console.error("❌ Error fetching body language data:", error.message);
    return null;
  }
}

