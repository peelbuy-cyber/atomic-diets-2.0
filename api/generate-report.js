export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY in environment variables." });
    }

    const body = req.body || {};
    const user = body.user || body;

    // Basic required inputs
    const goal = user.goal || body.goal;
    const name = user.name || "User";
    const age = Number(user.age);
    const gender = user.gender;
    const heightCm = Number(user.heightCm || user.height);
    const weightKg = Number(user.weightKg || user.weight);
    const activityLevel = user.activityLevel || user.activity;
    const country = user.country;
    const dietType = user.dietType || user.diet;
    const workoutTiming = user.workoutTiming || user.timing;
    const workoutExperience = user.workoutExperience || user.exp;

    if (!goal) return res.status(400).json({ error: "Missing goal" });
    if (!name) return res.status(400).json({ error: "Missing name" });
    if (!Number.isFinite(age)) return res.status(400).json({ error: "Missing age" });
    if (!gender) return res.status(400).json({ error: "Missing gender" });
    if (!Number.isFinite(heightCm)) return res.status(400).json({ error: "Missing height" });
    if (!Number.isFinite(weightKg)) return res.status(400).json({ error: "Missing weight" });
    if (!activityLevel) return res.status(400).json({ error: "Missing activity level" });
    if (!country) return res.status(400).json({ error: "Missing country" });
    if (!dietType) return res.status(400).json({ error: "Missing diet type" });
    if (!workoutTiming) return res.status(400).json({ error: "Missing workout timing" });

    // Country-specific region prompt helper (keep short; model will decide foods)
    const prompt = `
You are a health & fitness assistant generating an AI plan.

LEGAL SAFETY RULE (must follow):
NEVER say:
- "You have diabetes"
- "You will get heart disease"
- "You are obese"
ALWAYS use safer wording:
- "Based on your inputs, you may have risk factors associated with..."
- "Your results suggest you may benefit from..."

Generate a JSON response only (no markdown), with this schema:

{
  "healthAnalysis": {
    "summary": string,
    "riskFactorsCarefulWording": [string],
    "sleepRecommendation": string,
    "heartRateZones": [ { "zone": string, "target": string, "notes": string } ],
    "healthScore": number, 
    "scoreRationale": string
  },
  "calculations": {
    "bmi": number,
    "bmr": number,
    "tdee": number,
    "bodyFatPercentEstimate": number,
    "leanBodyMassEstimateKg": number,
    "idealWeightKgEstimate": number,
    "goalCaloriesKcalPerDay": number,
    "weightToGoalKg": number,
    "waterIntakeGlassesPerDayEstimate": number
  },
  "timeline": {
    "months": [
      { "month": number, "weightKgEstimate": number, "goalReachedByMonth": boolean }
    ]
  },
  "mealPlan7Days": [
    {
      "day": "Day 1" | ... | "Day 7",
      "meals": [
        { "time": "8am" | "1pm" | "4pm" | "7pm", 
          "items": [ { "food": string, "portionGrams": number } ],
          "calories": number,
          "proteinG": number,
          "carbsG": number,
          "fatG": number
        }
      ],
      "notes": string
    }
  ],
  "weeklyGroceryList": [ { "category": string, "items": [ { "item": string, "quantity": string } ] } ],
  "workoutPlan7Days": [
    {
      "day": "Day 1" | ... | "Day 7",
      "sessions": [
        {
          "type": "Strength" | "Cardio" | "Mobility" | "Rest" | "Mixed",
          "exercises": [
            {
              "name": string,
              "sets": number,
              "reps": string,
              "restSeconds": number,
              "howTo": string,
              "estimatedCaloriesBurned": number
            }
          ]
        }
      ],
      "progressionNotes": string
    }
  ],
  "recommendations": [string]
}

Inputs:
Goal: ${goal}
Name: ${name}
Age: ${age}
Gender: ${gender}
Height (cm): ${heightCm}
Weight (kg): ${weightKg}
Activity Level: ${activityLevel}
Country: ${country}
Diet Type: ${dietType}
Workout Timing: ${workoutTiming}
Workout Experience: ${workoutExperience || "unspecified"}

Constraints:
- Use country-appropriate foods always.
- Provide exact portions in grams for meal items.
- Provide 7-day meal plan with times: 8am, 1pm, 4pm, 7pm (4 meals/day).
- Provide 7-day workout plan with rest days included.
- Keep explanations concise and actionable.
- healthScore must be 0-100 number.
`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({
        error: data?.error?.message || "Anthropic API error",
        raw: data
      });
    }

    const text = data?.content?.[0]?.text || "";
    // Model output should be JSON; try parse.
    let report;
    try {
      report = JSON.parse(text);
    } catch (e) {
      // If parsing fails, return raw text so we can adjust prompt later.
      return res.status(500).json({
        error: "Failed to parse AI JSON output",
        rawText: text
      });
    }

    return res.status(200).json({ report });
  } catch (err) {
    console.error("generate-report error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
