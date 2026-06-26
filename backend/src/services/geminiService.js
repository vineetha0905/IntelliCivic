const dotenv = require('dotenv');
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

/**
 * Call the Gemini API.
 * 
 * @param {Array} contents The content parts for the model.
 * @param {String} systemInstruction Optional system instruction to guide behavior.
 * @returns {Object|null} The parsed JSON response, or null on failure.
 */
/**
 * Fetch a remote image and convert it to base64.
 */
async function fetchImageBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    return {
      mimeType: contentType,
      data: buffer.toString('base64')
    };
  } catch (error) {
    console.error(`Error fetching image from url ${url}:`, error.message);
    return null;
  }
}

/**
 * Call the Gemini API.
 * 
 * @param {Array} contents The content parts for the model.
 * @param {String} systemInstruction Optional system instruction to guide behavior.
 * @returns {Object|null} The parsed JSON response, or null on failure.
 */
async function callGemini(contents, systemInstruction = null) {
  if (!GEMINI_API_KEY) {
    console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables. Falling back to default mock responses.');
    return null;
  }

  try {
    const payload = {
      contents,
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error: ${response.status} ${response.statusText}`, errText);
      return null;
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!textResponse) {
      console.error('Empty response from Gemini:', JSON.stringify(data));
      return null;
    }

    // Parse structured JSON output
    return JSON.parse(textResponse);
  } catch (error) {
    console.error('Failed to communicate with Gemini API:', error);
    return null;
  }
}

/**
 * Feature 1: Gemini Complaint Intelligence
 */
async function analyzeIssue(description, imageBase64 = null) {
  if (isAbusive(description)) {
    return {
      category: 'Other',
      priority: 'Medium',
      department: 'Public Works',
      summary: description.slice(0, 100),
      recommended_action: '',
      urgency_reason: '',
      image_relevant: false,
      image_relevance_reason: 'Abusive language detected.',
      is_abusive: true
    };
  }

  const systemInstruction = `
    You are an expert Civic Intelligence AI. Analyze the citizen-submitted description and optional image.
    Categorize the issue into one of the following exact categories:
    - Road Damage
    - Water Leakage
    - Garbage & Sanitation
    - Streetlight Failure
    - Drainage Issue
    - Traffic Issue
    - Public Infrastructure
    - Environmental Hazard
    - Other

    Assign a Priority level: Low, Medium, High, or Critical.
    Specify the most appropriate Department (e.g. Public Works, Water Department, Sanitation Department, Electricity Board, Traffic Police).
    Provide a concise Summary, a Recommended Action, and an Urgency Reason.
    
    Verify if the uploaded image matches or is relevant to the issue description and the detected category.
    If an image is provided:
    - Determine if it is relevant to the civic issue described and represents the same category. If the image is completely irrelevant or represents a different category or civic issue than the description and detected category (for example, a garbage image for a streetlight issue, a pothole image for a garbage issue, a pet/selfie/abstract graphic, etc.), set 'image_relevant' to false and set 'image_relevance_reason' to 'Image does not match the selected category, issue title, or complaint description.'.
    - Otherwise, set 'image_relevant' to true and 'image_relevance_reason' to ''.
    If no image is provided:
    - Set 'image_relevant' to true and 'image_relevance_reason' to 'No image provided'.
    
    You must output a JSON object matching this exact format:
    {
      "category": "Road Damage",
      "priority": "High",
      "department": "Public Works",
      "summary": "Short summary",
      "recommended_action": "Suggested response action",
      "urgency_reason": "Why this priority was chosen",
      "image_relevant": true,
      "image_relevance_reason": ""
    }
  `;

  const parts = [{ text: `Issue Description: "${description}"` }];
  
  if (imageBase64) {
    // Determine mime type if base64 includes header, else default to jpeg
    let mimeType = 'image/jpeg';
    let rawBase64 = imageBase64;
    if (imageBase64.includes(';base64,')) {
      const splitted = imageBase64.split(';base64,');
      mimeType = splitted[0].replace('data:', '');
      rawBase64 = splitted[1];
    }
    parts.push({
      inlineData: {
        mimeType,
        data: rawBase64
      }
    });
  }

  const result = await callGemini([{ parts }], systemInstruction);
  
  if (!result) {
    // Robust Mock Fallback if API fails or Key is missing
    const fallbackCategory = description.toLowerCase().includes('water') ? 'Water Leakage' :
                             description.toLowerCase().includes('garbage') ? 'Garbage & Sanitation' :
                             description.toLowerCase().includes('light') ? 'Streetlight Failure' : 'Other';
    
    // Check if the description contains keywords to mock irrelevant image
    const isMockIrrelevant = imageBase64 && (
      description.toLowerCase().includes('irrelevant') ||
      description.toLowerCase().includes('invalid image') ||
      description.toLowerCase().includes('dog') ||
      description.toLowerCase().includes('cat')
    );

    return {
      category: fallbackCategory,
      priority: 'Medium',
      department: fallbackCategory === 'Water Leakage' ? 'Water Department' :
                  fallbackCategory === 'Garbage & Sanitation' ? 'Sanitation Department' : 'Public Works',
      summary: description.slice(0, 100),
      recommended_action: 'Inspect and repair reported site.',
      urgency_reason: 'Automated fallback due to service availability.',
      image_relevant: !isMockIrrelevant,
      image_relevance_reason: isMockIrrelevant ? 'Image does not match the selected category, issue title, or complaint description.' : (imageBase64 ? 'Mock validation: image assumed relevant' : 'No image provided')
    };
  }

  return result;
}

/**
 * Feature 2: Smart Duplicate Issue Detection
 */
async function checkDuplicate(newIssue, existingIssues) {
  if (!existingIssues || existingIssues.length === 0) {
    return { duplicate: false, confidence: 0, reason: "No nearby issues reported" };
  }

  const systemInstruction = `
    You are a Smart Civic Issue Duplicate Detector.
    Compare the new issue submission with the list of existing nearby issues.
    Evaluate description similarity, categories, coordinates, and images.
    An image block or image data might be provided for the new issue (labeled as Image 0) and for some of the existing issues (labeled as Image 1, Image 2, etc. corresponding to the existing issues).
    If the same or extremely similar/identical image is uploaded for a new issue and an existing issue at or near the same location, it should be detected as a duplicate.
    Determine if this new submission is a duplicate of one of the existing issues.
    Output a JSON object matching this format:
    {
      "duplicate": true/false,
      "confidence": 0-100 percentage,
      "reason": "Clear explanation of similarity or difference",
      "duplicateIssueId": "id of the matching existing issue, or null"
    }
  `;

  let promptText = `
    NEW ISSUE SUBMISSION:
    - Description: "${newIssue.description}"
    - Category: "${newIssue.category}"
    - Location: "${newIssue.locationName}"
    - Coordinates: Lat ${newIssue.coordinates?.latitude}, Lng ${newIssue.coordinates?.longitude}
  `;

  if (newIssue.imageBase64) {
    promptText += `- Image: Provided below as Image 0 (New Issue Image)\n`;
  } else {
    promptText += `- Image: No image provided\n`;
  }

  promptText += `\nEXISTING NEARBY ISSUES:\n`;

  const imageParts = [];
  
  if (newIssue.imageBase64) {
    let mimeType = 'image/jpeg';
    let rawBase64 = newIssue.imageBase64;
    if (newIssue.imageBase64.includes(';base64,')) {
      const splitted = newIssue.imageBase64.split(';base64,');
      mimeType = splitted[0].replace('data:', '');
      rawBase64 = splitted[1];
    }
    imageParts.push({
      inlineData: {
        mimeType,
        data: rawBase64
      }
    });
  }

  let imageCounter = 1;
  for (let idx = 0; idx < existingIssues.length; idx++) {
    const issue = existingIssues[idx];
    const hasImage = issue.images && issue.images.length > 0 && issue.images[0].url;
    
    promptText += `
      Issue ${idx + 1}:
      - ID: "${issue._id || issue.id}"
      - Title: "${issue.title}"
      - Description: "${issue.description}"
      - Category: "${issue.category}"
      - Coordinates: Lat ${issue.location?.coordinates?.latitude || issue.coordinates?.[0] || issue.coordinates?.latitude}, Lng ${issue.location?.coordinates?.longitude || issue.coordinates?.[1] || issue.coordinates?.longitude}
      - Distance: Approx ${issue.distanceMeters || 'unknown'} meters away
    `;

    if (hasImage) {
      const imgUrl = issue.images[0].url;
      const base64Data = await fetchImageBase64(imgUrl);
      if (base64Data) {
        promptText += `- Image: Provided below as Image ${imageCounter} (Existing Issue ${idx + 1} Image)\n`;
        imageParts.push({
          inlineData: base64Data
        });
        imageCounter++;
      } else {
        promptText += `- Image: Has image at ${imgUrl} but failed to fetch/load\n`;
      }
    } else {
      promptText += `- Image: No image\n`;
    }
  }

  const parts = [{ text: promptText }, ...imageParts];

  const result = await callGemini([{ parts }], systemInstruction);

  if (!result) {
    // If Gemini fails or key is missing, perform a basic programmatic check as fallback
    for (const issue of existingIssues) {
      const cleanNew = newIssue.description.toLowerCase().trim();
      const cleanOld = (issue.description || '').toLowerCase().trim();
      
      const latDiff = Math.abs((newIssue.coordinates?.latitude || 0) - (issue.location?.coordinates?.latitude || issue.coordinates?.[0] || issue.coordinates?.latitude || 0));
      const lngDiff = Math.abs((newIssue.coordinates?.longitude || 0) - (issue.location?.coordinates?.longitude || issue.coordinates?.[1] || issue.coordinates?.longitude || 0));
      
      const hasImage = issue.images && issue.images.length > 0 && issue.images[0].url;
      
      // If same description or very close location
      if (cleanNew === cleanOld || (latDiff < 0.001 && lngDiff < 0.001)) {
        return {
          duplicate: true,
          confidence: 95,
          reason: "Duplicate detected programmatically: Similar description or identical coordinates.",
          duplicateIssueId: issue._id || issue.id
        };
      }
    }
    
    // Check if coordinates are close in general
    if (existingIssues.length > 0) {
      const firstIssue = existingIssues[0];
      const latDiff = Math.abs((newIssue.coordinates?.latitude || 0) - (firstIssue.location?.coordinates?.latitude || firstIssue.coordinates?.[0] || firstIssue.coordinates?.latitude || 0));
      const lngDiff = Math.abs((newIssue.coordinates?.longitude || 0) - (firstIssue.location?.coordinates?.longitude || firstIssue.coordinates?.[1] || firstIssue.coordinates?.longitude || 0));
      
      if (latDiff < 0.01 && lngDiff < 0.01) {
        return {
          duplicate: true,
          confidence: 90,
          reason: "Duplicate detected programmatically: Another issue reported nearby in this vicinity.",
          duplicateIssueId: firstIssue._id || firstIssue.id
        };
      }
    }

    return { duplicate: false, confidence: 0, reason: "Detection service temporarily unavailable" };
  }

  return result;
}

/**
 * Feature 3: Community Feedback Summarization
 */
async function summarizeCommunityFeedback(comments, verifications) {
  const systemInstruction = `
    You are a Civic Consensus Summarizer. 
    Analyze the community's verification comments and votes on this issue.
    Synthesize their feedback, highlight corroborating details (e.g. photos/evidence confirmed),
    and determine the consensus verification status (e.g. Verified, Contested, Insufficient Info, Rejected).
    Determine a confidence score between 0 and 100 based on the balance and credibility of the reports.
    Output a JSON object matching this format:
    {
      "verification_status": "Verified | Contested | Insufficient Info | Rejected",
      "community_summary": "Synthesized summary of comments and reports",
      "confidence_score": 0-100 number
    }
  `;

  const promptText = `
    VERIFICATIONS RECEIVED:
    ${verifications.map((v, i) => `Vote ${i+1}: User role=${v.userRole || 'Citizen'}, status=${v.status}, comment="${v.comment || ''}"`).join('\n')}

    COMMENTS RECEIVED:
    ${comments.map((c, i) => `Comment ${i+1}: "${c.content}"`).join('\n')}
  `;

  const result = await callGemini([{ parts: [{ text: promptText }] }], systemInstruction);

  if (!result) {
    return {
      verification_status: 'Insufficient Info',
      community_summary: 'Consensus calculation pending community review.',
      confidence_score: 50
    };
  }

  return result;
}

/**
 * Feature 4: AI Resolution Assistant
 */
async function explainResolution(technicalNote) {
  const systemInstruction = `
    You are a Citizen Relations Specialist for a smart municipality.
    Translate a technical issue resolution note written by field staff into:
    1. A citizen-friendly explanation (clear, simple language).
    2. A resolution summary (1 sentence).
    3. An impact statement detailing the community benefit.
    
    Output a JSON object matching this format:
    {
      "explanation": "Citizen friendly explanation",
      "summary": "One sentence resolution summary",
      "impactStatement": "Positive impact on the neighborhood/community"
    }
  `;

  const result = await callGemini([{ parts: [{ text: `Technical Note: "${technicalNote}"` }] }], systemInstruction);

  if (!result) {
    return {
      explanation: `The reported issue was updated: "${technicalNote}"`,
      summary: 'Issue resolved by field staff.',
      impactStatement: 'Municipal services have been restored at this location.'
    };
  }

  return result;
}

/**
 * Feature 5: AI Civic Insights Dashboard
 */
async function generateCivicInsights(issues) {
  const systemInstruction = `
    You are a Strategic Smart City Planner.
    Analyze this dump of civic issue reports for the last period and compile a smart city intelligence report.
    Identify the most common issue type, hotspots, resolution trends, high-risk locations, department performance, emerging civic concerns, and preventative recommendations.
    Output a JSON object matching this exact format:
    {
      "most_common_issue_type": "string",
      "complaint_hotspots": ["hotspot location description or street name"],
      "resolution_trends": "string summarising resolution performance",
      "high_risk_locations": ["locations prone to severe issues"],
      "department_performance": "string analyzing department efficiency",
      "emerging_civic_concerns": ["emerging issues"],
      "preventive_recommendations": ["proactive structural recommendations"]
    }
  `;

  const dataInput = issues.map(i => ({
    category: i.category,
    status: i.status,
    priority: i.priority,
    location: i.location?.name,
    age: i.ageInDays || 0,
    resTime: i.actualResolutionTime || null
  }));

  const result = await callGemini([{ parts: [{ text: JSON.stringify(dataInput) }] }], systemInstruction);

  if (!result) {
    return {
      most_common_issue_type: 'Unknown',
      complaint_hotspots: ['Main City Center'],
      resolution_trends: 'Stable resolution rates.',
      high_risk_locations: ['High traffic intersections'],
      department_performance: 'Slight backlog in garbage collection.',
      emerging_civic_concerns: ['Water pipeline ageing'],
      preventive_recommendations: ['Perform routine visual checks.']
    };
  }

  return result;
}

/**
 * Feature 9: Predictive Civic Intelligence
 */
async function generatePredictiveInsights(issues) {
  const systemInstruction = `
    You are a Predictive Infrastructure Analyst.
    Look at historical reports, timestamps, location clusters, and categories.
    Identify:
    1. Areas likely to develop recurring issues soon (risk score 0-100).
    2. Frequently damaged infrastructure nodes.
    3. Seasonal complaint trends (e.g. monsoon flooding, summer water cuts).
    4. Proactive recommendations for early intervention.
    
    Output a JSON object matching this exact format:
    {
      "recurring_risk_zones": [
        { "location": "string", "risk": "High/Medium/Low", "reason": "string" }
      ],
      "damaged_infrastructure": ["nodes / components requiring replacement"],
      "seasonal_trends": ["anticipated issues and periods"],
      "proactive_interventions": ["concrete preventative measures"]
    }
  `;

  const dataInput = issues.map(i => ({
    category: i.category,
    location: i.location?.name,
    created: i.createdAt,
    status: i.status,
    priority: i.priority
  }));

  const result = await callGemini([{ parts: [{ text: JSON.stringify(dataInput) }] }], systemInstruction);

  if (!result) {
    return {
      recurring_risk_zones: [{ location: 'Ward 5 Lowland', risk: 'High', reason: 'Repeated drainage overflows reported.' }],
      damaged_infrastructure: ['Substation transformers', 'Asphalt on Outer Ring Road'],
      seasonal_trends: ['Drainage clogging during monsoons'],
      proactive_interventions: ['Clear storm gutters pre-monsoon']
    };
  }

  return result;
}

/**
 * Feature 10: Executive Governance Dashboard
 */
async function generateExecutiveGovernance(issues, userStats) {
  const systemInstruction = `
    You are a Chief Commissioner Executive Advisor.
    Analyze the municipal performance indicators.
    Review overall citizen engagement, department resolution timelines, and ward performance.
    Provide strategic governance summaries and critical AI recommendations for administrative action.
    
    Output a JSON object matching this exact format:
    {
      "ward_performance": [{ "ward": "string", "efficiency": "percentage string", "status": "Good/Average/Needs Attention" }],
      "department_performance": [{ "name": "string", "resolved": 0, "pending": 0, "avgTime": "string" }],
      "resolution_efficiency": "Strategic summary of resolution efficiency",
      "citizen_engagement": "Assessment of citizen trust and participation levels",
      "ai_recommendations": ["policy or operational recommendations"]
    }
  `;

  const formattedIssues = issues.map(i => ({
    category: i.category,
    status: i.status,
    priority: i.priority,
    location: i.location?.name,
    resTime: i.actualResolutionTime
  }));

  const payloadText = JSON.stringify({
    issues: formattedIssues,
    userStats
  });

  const result = await callGemini([{ parts: [{ text: payloadText }] }], systemInstruction);

  if (!result) {
    return {
      ward_performance: [{ ward: 'Ward A', efficiency: '85%', status: 'Good' }],
      department_performance: [{ name: 'Public Works', resolved: 5, pending: 2, avgTime: '3 days' }],
      resolution_efficiency: 'Stable municipal operations.',
      citizen_engagement: 'Average civic participation rate.',
      ai_recommendations: ['Allocate budget for automated pipe repairs.']
    };
  }

  return result;
}

module.exports = {
  analyzeIssue,
  checkDuplicate,
  summarizeCommunityFeedback,
  explainResolution,
  generateCivicInsights,
  generatePredictiveInsights,
  generateExecutiveGovernance
};

const ABUSIVE_WORDS = [
  "fuck", "fucking", "motherfucker", "shit", "shitty", "asshole", "arsehole", "bitch", "bastard", "slut", "whore", 
  "idiot", "moron", "stupid", "dumb", "fool", "loser", "nonsense", "useless", "worthless", "pathetic", "disgusting", 
  "bloody", "damn", "hell", "scam", "fraud", "cheater", "corrupt", "corruption", "bribe", "go to hell", "shut up", 
  "get lost", "no sense", "piece of shit"
];

function isAbusive(text) {
  if (!text) return false;
  const normalized = text.toLowerCase().trim();
  return ABUSIVE_WORDS.some(word => {
    const regex = new RegExp(`\\b${word.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    return regex.test(normalized);
  });
}
