export interface StandardizedRoleResult {
    standardized_role: string;
    normalized_key: string;
    confidence_score: number;
    original_input: string;
}

// Map of standard roles to their known variants/keywords
export const ROLE_DEFINITIONS: Record<string, string[]> = {
    // --- Software Engineering ---
    "Frontend Developer": ["frontend", "front-end", "front end", "react", "angular", "vue", "web developer", "ui developer", "javascript developer", "html/css"],
    "Backend Developer": ["backend", "back-end", "back end", "server-side", "node", "python", "java", "django", "spring", "golang", "php", "laravel", "ruby", "rails", ".net developer", "c# developer"],
    "Full Stack Developer": ["fullstack", "full-stack", "full stack", "mern", "mean", "lamp stack"],
    "Mobile Developer": ["mobile", "android", "ios", "react native", "flutter", "swift", "kotlin", "app developer"],
    "Game Developer": ["game developer", "unity", "unreal", "gameplay programmer", "graphics programmer"],
    "Embedded Systems Engineer": ["embedded", "firmware", "iot", "robotics", "c++ developer"],
    "Blockchain Developer": ["blockchain", "web3", "smart contract", "solidity", "crypto", "ethereum"],

    // --- Data & AI ---
    "Data Scientist": ["data scientist", "data science"],
    "Data Analyst": ["data analyst", "business intelligence", "bi analyst", "tableau", "power bi"],
    "Data Engineer": ["data engineer", "big data", "etl", "hadoop", "spark", "kafka"],
    "Machine Learning Engineer": ["machine learning", "ml engineer", "mlops", "deep learning"],
    "AI Engineer": ["ai engineer", "artificial intelligence", "nlp", "computer vision"],

    // --- Infrastructure & Security ---
    "DevOps Engineer": ["devops", "cloud engineer", "aws", "azure", "gcp", "ci/cd", "infrastructure", "platform engineer"],
    "Site Reliability Engineer (SRE)": ["sre", "site reliability", "reliability engineer"],
    "Cyber Security Analyst": ["cyber security", "cybersecurity", "security analyst", "infosec", "information security", "network security", "pen tester", "ethical hacker", "soc analyst"],
    "Cloud Architect": ["cloud architect", "solutions architect", "aws architect", "azure architect"],
    "System Administrator": ["sysadmin", "system administrator", "linux administrator", "windows administrator"],
    "Database Administrator": ["dba", "database administrator", "sql developer", "database engineer"],
    "Network Engineer": ["network engineer", "network admin", "ccna", "ccnp"],

    // --- Quality Assurance ---
    "QA Engineer": ["qa", "quality assurance", "tester", "test engineer", "automation engineer", "sqa", "software date engineer in test", "sdet", "manual tester"],
    "API Tester": ["api tester", "api testing", "backend tester"],

    // --- Design & Product ---
    "UX/UI Designer": ["ui designer", "ux designer", "product designer", "web designer", "ui/ux", "ux/ui"],
    "Product Manager": ["product manager", "pm", "product owner"],
    "Project Manager": ["project manager", "technical project manager", "program manager"],
    "Scrum Master": ["scrum master", "agile coach"],
    "Technical Writer": ["technical writer", "documentation specialist"],

    // --- Marketing & Business ---
    "Brand Manager": ["brand manager", "branding", "brand strategist"],
    "Marketing Manager": ["marketing manager", "digital marketing", "growth hacker", "marketing specialist"],
    "SEO Specialist": ["seo specialist", "seo expert", "search engine optimization"],
    "Content Strategist": ["content strategist", "content manager", "copywriter"],
    "Business Analyst": ["business analyst", "ba", "system analyst"],

    // --- Management & Sales ---
    "Engineering Manager": ["engineering manager", "em", "tech lead", "team lead"],
    "Sales Engineer": ["sales engineer", "pre-sales", "technical sales"],
    "Developer Advocate": ["developer advocate", "devrel", "developer relations"],
};

export const STANDARD_ROLES = Object.keys(ROLE_DEFINITIONS);

/**
 * Standardizes a user-input job role into a consistent format.
 * Mimics the logic of an AI standardization assistant.
 */
export const standardizeRole = (inputRating: string): StandardizedRoleResult => {
    if (!inputRating) {
        return {
            standardized_role: "",
            normalized_key: "",
            confidence_score: 0,
            original_input: inputRating
        };
    }

    // 1. Normalize Input
    const normalizedInput = inputRating
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "") // Remove special chars except hyphen/space
        .replace(/\s+/g, " ");    // Collapse multiple spaces

    // 2. Exact Match Check
    for (const [standardRole] of Object.entries(ROLE_DEFINITIONS)) {
        if (standardRole.toLowerCase() === normalizedInput) {
            return {
                standardized_role: standardRole,
                normalized_key: standardRole.toLowerCase().replace(/\s+/g, ""),
                confidence_score: 1.0,
                original_input: inputRating
            };
        }
    }

    // 3. Variant/Keyword Match
    // We search for the longest matching variant to be specific (e.g. "React Native" vs "React")
    let bestMatch: string | null = null;
    let maxConfidence = 0;

    for (const [standardRole, variants] of Object.entries(ROLE_DEFINITIONS)) {
        for (const variant of variants) {
            if (normalizedInput.includes(variant)) {
                // Boost confidence if the variant is a significant part of the string
                let score = 0.8; // Base match score
                if (normalizedInput === variant) score = 0.95;
                else if (normalizedInput.startsWith(variant) || normalizedInput.endsWith(variant)) score = 0.9;

                if (score > maxConfidence) {
                    maxConfidence = score;
                    bestMatch = standardRole;
                }
            }
        }
    }

    if (bestMatch) {
        return {
            standardized_role: bestMatch,
            normalized_key: bestMatch.toLowerCase().replace(/\s+/g, ""),
            confidence_score: maxConfidence,
            original_input: inputRating
        };
    }

    // 4. No Match - Return normalized input formatted as Title Case
    const fallbackRole = normalizedInput
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    return {
        standardized_role: fallbackRole,
        normalized_key: normalizedInput.replace(/\s+/g, ""),
        confidence_score: 0.1, // Low confidence
        original_input: inputRating
    };
};
