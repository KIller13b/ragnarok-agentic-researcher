export const INITIAL_RESEARCHES = [
  {
    id: '673f2a1e4c9d',
    title: 'AI coding tools for hackathon',
    question: 'Compare three free AI coding tools for a college hackathon. Research their features, supported programming languages, limitations, and internet requirements. Recommend one for a beginner team and justify the recommendation.',
    status: 'in_progress', // queued, planning, researching, evaluating, generating_report, completed, failed
    stage: 'researching',
    createdAt: 'Apr 26, 2025, 10:24 AM',
    startedAt: 'Apr 26, 2025, 10:26 AM',
    updatedAt: 'Apr 26, 2025, 10:28 AM',
    timeAgo: '2m ago',
    constraints: {
      deadline: 'Not set',
      budget: 'Not set',
      preferredSourceTypes: 'Any source',
      maxSources: 'Not set',
    },
    activitySteps: [
      {
        id: 1,
        title: 'Planning Research',
        description: 'Breaking down the question into research subtasks...',
        status: 'completed',
        time: '2m ago',
      },
      {
        id: 2,
        title: 'Searching Sources',
        description: 'Searching the web for AI coding tools and documentation...',
        status: 'in_progress',
        time: '1m ago',
      },
      {
        id: 3,
        title: 'Evaluating Evidence',
        description: 'Checking source reliability and identifying conflicts...',
        status: 'pending',
        time: 'Pending',
      },
      {
        id: 4,
        title: 'Generating Report',
        description: 'Creating a structured report with citations...',
        status: 'pending',
        time: 'Pending',
      },
    ],
    tasks: [
      {
        id: 't-1',
        title: 'Identify popular free AI code assistants',
        description: 'Screen candidate tools: GitHub Copilot (Student pack), Codeium Free, and Amazon Q Developer Free.',
        order: 1,
        status: 'completed',
      },
      {
        id: 't-2',
        title: 'Analyze language support and IDE integration',
        description: 'Compare VS Code, JetBrains extensions, and coverage for Python, JS/TS, C++, and Go.',
        order: 2,
        status: 'in_progress',
      },
      {
        id: 't-3',
        title: 'Evaluate rate limits and offline/latency constraints',
        description: 'Document free-tier monthly caps, telemetry requirements, and internet connection demands during hackathon venue wifi hiccups.',
        order: 3,
        status: 'pending',
      },
      {
        id: 't-4',
        title: 'Synthesize final recommendation for beginners',
        description: 'Score tools on ease of onboarding, setup friction, and helpfulness for novice developers.',
        order: 4,
        status: 'pending',
      },
    ],
    evidence: [
      {
        id: 'ev-1',
        title: 'Codeium Individual Free Tier Features & Language Support Matrix',
        url: 'https://codeium.com/pricing',
        domain: 'codeium.com',
        sourceType: 'official',
        snippet: 'Offers unlimited single-line and multi-line code generation, in-IDE chat, and repository context across 70+ languages without credit card or token limits.',
        qualityScore: 0.96,
        retrievedAt: '2m ago',
      },
      {
        id: 'ev-2',
        title: 'Amazon Q Developer Free Tier Limits & IDE Extension Guide',
        url: 'https://aws.amazon.com/q/developer/',
        domain: 'aws.amazon.com',
        sourceType: 'documentation',
        snippet: 'Provides free code completions and inline suggestions via AWS Builder ID login. Includes security scanning for up to 50 projects per month.',
        qualityScore: 0.92,
        retrievedAt: '1m ago',
      },
      {
        id: 'ev-3',
        title: 'GitHub Copilot for Students & Open Source Program Documentation',
        url: 'https://github.com/features/copilot',
        domain: 'github.com',
        sourceType: 'official',
        snippet: 'Free for verified students via GitHub Student Developer Pack. Requires academic email validation which may take 24-48 hours to activate.',
        qualityScore: 0.94,
        retrievedAt: '1m ago',
      },
      {
        id: 'ev-4',
        title: 'Collegiate Hackathon Tooling Survey: Beginner Friction Points',
        url: 'https://devpost.com/hackathons/tooling-survey',
        domain: 'devpost.com',
        sourceType: 'news',
        snippet: 'Mentors noted that authentication hurdles and complex cloud setup caused significant delays for first-time hackathon attendees.',
        qualityScore: 0.88,
        retrievedAt: '30s ago',
      },
    ],
    toolCalls: [
      {
        id: 'tc-1',
        toolName: 'web_search',
        input: { query: 'free AI coding assistants for hackathon 2025 comparison', maxResults: 5 },
        outputSummary: 'Found 14 relevant developer comparison pages and official vendor documentation links.',
        durationMs: 412,
        status: 'succeeded',
      },
      {
        id: 'tc-2',
        toolName: 'extract_documentation',
        input: { url: 'https://codeium.com/pricing', extract: ['pricing', 'tier_limits', 'languages'] },
        outputSummary: 'Extracted free tier features: zero-cost unlimited completions, 70+ languages, VS Code support.',
        durationMs: 640,
        status: 'succeeded',
      },
      {
        id: 'tc-3',
        toolName: 'extract_documentation',
        input: { url: 'https://aws.amazon.com/q/developer/', extract: ['free_tier', 'login_requirements'] },
        outputSummary: 'Extracted AWS Builder ID requirement; no AWS billing account required for standalone developer tier.',
        durationMs: 510,
        status: 'succeeded',
      },
      {
        id: 'tc-4',
        toolName: 'evaluate_conflicts',
        input: { comparisonAspects: ['offline_support', 'activation_speed', 'rate_limits'] },
        outputSummary: 'Evaluating activation delay for GitHub Student Pack vs instant email login for Codeium...',
        durationMs: 230,
        status: 'running',
      },
    ],
    report: null, // Initial empty report state
  },
  {
    id: '673f1b0a8f21',
    title: 'Climate change solutions',
    question: 'Analyze cost-effective municipal carbon mitigation strategies for mid-sized cities.',
    status: 'completed',
    stage: 'completed',
    createdAt: 'Apr 26, 2025, 09:15 AM',
    startedAt: 'Apr 26, 2025, 09:16 AM',
    updatedAt: 'Apr 26, 2025, 09:22 AM',
    timeAgo: '1h ago',
    constraints: {
      deadline: 'May 1, 2025',
      budget: '$50,000',
      preferredSourceTypes: 'Academic, Official',
      maxSources: '15',
    },
    activitySteps: [
      { id: 1, title: 'Planning Research', description: 'Decomposed urban emission factors into transport and energy.', status: 'completed', time: '1h ago' },
      { id: 2, title: 'Searching Sources', description: 'Retrieved 18 municipal climate reports and IEA datasets.', status: 'completed', time: '1h ago' },
      { id: 3, title: 'Evaluating Evidence', description: 'Verified cost-benefit metrics across 12 mid-sized cities.', status: 'completed', time: '1h ago' },
      { id: 4, title: 'Generating Report', description: 'Structured findings with ROI tables and localized recommendations.', status: 'completed', time: '1h ago' },
    ],
    tasks: [
      { id: 't-c1', title: 'Scope municipal emission profiles', description: 'Profile scope 1 and 2 emissions.', order: 1, status: 'completed' },
      { id: 't-c2', title: 'Compare transit electrification vs building retrofits', description: 'Evaluate CAPEX and carbon offset ratios.', order: 2, status: 'completed' },
    ],
    evidence: [
      { id: 'ev-c1', title: 'IEA Net Zero Municipal Roadmap 2024', url: 'https://iea.org/reports/municipal', domain: 'iea.org', sourceType: 'official', snippet: 'Municipal fleet electrification presents the highest immediate abatement ratio per dollar invested.', qualityScore: 0.98, retrievedAt: '1h ago' }
    ],
    toolCalls: [
      { id: 'tc-c1', toolName: 'academic_search', input: { query: 'municipal carbon mitigation ROI' }, outputSummary: 'Found 8 meta-analyses.', durationMs: 780, status: 'succeeded' }
    ],
    report: {
      title: 'Municipal Carbon Abatement Strategy Report',
      generatedAt: 'Apr 26, 2025, 09:22 AM',
      confidenceScore: 0.94,
      verificationStatus: 'verified',
      executiveSummary: 'This synthetic report synthesizes findings on municipal carbon mitigation strategies for cities with populations between 100,000 and 500,000. Fleet electrification combined with smart LED grid retrofits yields the fastest payback periods (2.8 to 4.2 years) while residential heat pump subsidies offer the highest aggregate long-term emission reduction.',
      comparisonTable: {
        headers: ['Strategy', 'Initial CAPEX', 'Annual Abatement', 'Payback Period', 'Implementation Friction'],
        rows: [
          ['Transit Fleet Electrification', 'High ($2.4M avg)', '1,850 tCO2e/yr', '3.8 years', 'Moderate (Charging infra)'],
          ['Municipal Building LED & HVAC', 'Low ($420k avg)', '620 tCO2e/yr', '2.4 years', 'Very Low'],
          ['Residential Heat Pump Incentives', 'Medium ($1.1M avg)', '3,400 tCO2e/yr', '5.1 years', 'High (Public adoption)'],
          ['Urban Canopy & Micro-parks', 'Low ($180k avg)', '120 tCO2e/yr', 'N/A (Co-benefits)', 'Low']
        ]
      },
      sections: [
        {
          heading: '1. Priority Intervention: Transit & Municipal Fleet',
          content: 'Converting public transit buses and municipal service vehicles to battery electric vehicles (BEVs) accounts for up to 34% of direct city operational emissions reductions. Localized depot fast-charging infrastructure requires coordinated grid interconnection agreements.',
          evidenceIds: ['ev-c1']
        },
        {
          heading: '2. Commercial and Residential Retrofit Enablers',
          content: 'Building envelope upgrades combined with heat pump water heaters yield substantial thermal efficiency gains. Financing mechanisms such as Property Assessed Clean Energy (PACE) mitigate upfront municipal budget exposure.',
          evidenceIds: ['ev-c1']
        }
      ],
      conflicts: [
        {
          claim: 'Grid Capacity Readiness for Electric Fleets',
          description: 'Two regional utility filings contested whether distribution feeder substations can handle simultaneous bus charging without dedicated battery storage buffers.',
          evidenceIds: ['ev-c1']
        }
      ],
      limitations: [
        'Geographic bias toward temperate climates; cold climate heating penalties require localized adjustment.',
        'Estimates rely on 2024 regional average electricity carbon intensity.'
      ],
      recommendation: 'Adopt a dual-track strategy: immediately deploy municipal building lighting/HVAC modernizations to generate rapid operational savings, while drafting a 3-year phased electric bus deployment alongside utility partners.',
    }
  },
  {
    id: '673e990c7b12',
    title: 'Best laptops for developers',
    question: 'Evaluate top 3 developer laptops under $2000 balancing battery life, Unix environment, and compile speeds.',
    status: 'completed',
    stage: 'completed',
    createdAt: 'Apr 26, 2025, 07:10 AM',
    startedAt: 'Apr 26, 2025, 07:11 AM',
    updatedAt: 'Apr 26, 2025, 07:17 AM',
    timeAgo: '3h ago',
    constraints: {
      deadline: 'Not set',
      budget: '$2,000',
      preferredSourceTypes: 'Documentation, News, Blogs',
      maxSources: '8',
    },
    activitySteps: [
      { id: 1, title: 'Planning Research', description: 'Defined benchmark criteria: Chromium compile time, battery runtime.', status: 'completed', time: '3h ago' },
      { id: 2, title: 'Searching Sources', description: 'Scraped hardware reviews and standardized synthetic test suites.', status: 'completed', time: '3h ago' },
      { id: 3, title: 'Evaluating Evidence', description: 'Cross-referenced thermal throttling under sustained loads.', status: 'completed', time: '3h ago' },
      { id: 4, title: 'Generating Report', description: 'Ranked MacBook Pro 14 (M3 Pro), ThinkPad T14s, and Dell XPS 14.', status: 'completed', time: '3h ago' },
    ],
    tasks: [],
    evidence: [],
    toolCalls: [],
    report: {
      title: 'Developer Laptops Benchmark Report 2025',
      generatedAt: 'Apr 26, 2025, 07:17 AM',
      confidenceScore: 0.91,
      verificationStatus: 'verified',
      executiveSummary: 'For software engineering workflows requiring strong Unix tooling and sustained unplugged battery runtime, the 14-inch MacBook Pro (M3 Pro / 18GB RAM) ranked highest in battery-adjusted compilation speed. For pure Linux native workflows, the ThinkPad T14s Gen 5 (Snapdragon X Elite or AMD 8040) offered superior keyboard ergonomics and modular repairability.',
      comparisonTable: {
        headers: ['Model', 'CPU / RAM', 'Battery (Real World)', 'Linux / Unix Support', 'Est. Price'],
        rows: [
          ['MacBook Pro 14"', 'M3 Pro / 18GB', '15.5 hours', 'macOS (POSIX native)', '$1,799'],
          ['Lenovo ThinkPad T14s G5', 'Ryzen 7 8840U / 32GB', '12.0 hours', 'Certified Ubuntu / Fedora', '$1,450'],
          ['Dell XPS 14 (9440)', 'Intel Core Ultra 7 / 32GB', '9.5 hours', 'WSL2 / Linux support', '$1,899']
        ]
      },
      sections: [
        {
          heading: 'Compiler Benchmark & Thermal Efficiency',
          content: 'Apple Silicon maintained identical benchmark performance on battery versus AC wall power, whereas Intel Core Ultra configurations experienced a 22-28% reduction in multi-threaded compile throughput when unplugged.'
        }
      ],
      conflicts: [],
      limitations: ['Prices subject to regional seasonal promotions.'],
      recommendation: 'Choose the MacBook Pro 14" for mobile development and web stacks; select ThinkPad T14s AMD for native Linux kernel or containerized enterprise backend work.'
    }
  },
  {
    id: '673d441f9e34',
    title: 'Remote work productivity',
    question: 'Analyze peer-reviewed literature measuring asynchronous communication impact on software delivery metrics.',
    status: 'failed',
    stage: 'failed',
    createdAt: 'Apr 26, 2025, 05:00 AM',
    startedAt: 'Apr 26, 2025, 05:01 AM',
    updatedAt: 'Apr 26, 2025, 05:03 AM',
    timeAgo: '5h ago',
    constraints: {
      deadline: 'Not set',
      budget: 'Not set',
      preferredSourceTypes: 'Academic papers',
      maxSources: '5',
    },
    activitySteps: [
      { id: 1, title: 'Planning Research', description: 'Formulated query vectors for IEEE and ACM digital libraries.', status: 'completed', time: '5h ago' },
      { id: 2, title: 'Searching Sources', description: 'Academic paper search failed: Paywalled repository rate limit encountered.', status: 'failed', time: '5h ago' },
      { id: 3, title: 'Evaluating Evidence', description: 'Cancelled due to upstream search timeout.', status: 'pending', time: 'Pending' },
      { id: 4, title: 'Generating Report', description: 'Aborted.', status: 'pending', time: 'Pending' },
    ],
    tasks: [],
    evidence: [],
    toolCalls: [
      { id: 'tc-f1', toolName: 'academic_gateway', input: { query: 'asynchronous software engineering velocity' }, outputSummary: 'HTTP 429 Rate limit exceeded by academic repository proxy.', durationMs: 1200, status: 'failed' }
    ],
    report: null
  },
  {
    id: '673c223a5a89',
    title: 'Healthy eating for students',
    question: 'Practical meal prep guidelines for college students with limited cooking equipment and under $50/week budget.',
    status: 'completed',
    stage: 'completed',
    createdAt: 'Apr 25, 2025, 10:00 AM',
    startedAt: 'Apr 25, 2025, 10:01 AM',
    updatedAt: 'Apr 25, 2025, 10:08 AM',
    timeAgo: '1d ago',
    constraints: {
      deadline: 'Not set',
      budget: '$50/week',
      preferredSourceTypes: 'Official, Blogs',
      maxSources: '10',
    },
    activitySteps: [
      { id: 1, title: 'Planning Research', description: 'Categorized budget nutrition macro targets and staple ingredients.', status: 'completed', time: '1d ago' },
      { id: 2, title: 'Searching Sources', description: 'Queried USDA nutrient databases and budget meal prep portals.', status: 'completed', time: '1d ago' },
      { id: 3, title: 'Evaluating Evidence', description: 'Filtered recipes requiring only microwave or single induction burner.', status: 'completed', time: '1d ago' },
      { id: 4, title: 'Generating Report', description: 'Synthesized 7-day grocery list and batch cooking protocols.', status: 'completed', time: '1d ago' },
    ],
    tasks: [],
    evidence: [],
    toolCalls: [],
    report: {
      title: 'Student Budget Nutrition & Meal Prep Protocol',
      generatedAt: 'Apr 25, 2025, 10:08 AM',
      confidenceScore: 0.95,
      verificationStatus: 'verified',
      executiveSummary: 'This research synthesizes evidence-based dietary guidelines adapted for university students operating with a microwave, mini-fridge, and electric kettle on a $45-50 weekly budget. High-protein legume staples, frozen produce, canned tuna, and whole grains meet RDA standards at $1.85 per meal.',
      comparisonTable: {
        headers: ['Food Group', 'Primary Budget Staples', 'Cost / Serving', 'Prep Equipment Required'],
        rows: [
          ['Protein', 'Eggs, Black Beans, Canned Chickpeas, Peanut Butter', '$0.35 - $0.70', 'Microwave / Kettle'],
          ['Complex Carbs', 'Rolled Oats, Brown Rice (pre-cooked or instant), Sweet Potatoes', '$0.25 - $0.40', 'Microwave'],
          ['Produce', 'Frozen Mixed Berries, Frozen Broccoli Florets, Bananas', '$0.40 - $0.65', 'None / Microwave'],
          ['Healthy Fats', 'Olive Oil, Sunflower Seeds, Flaxseed Meal', '$0.15 - $0.30', 'None']
        ]
      },
      sections: [
        {
          heading: 'Batch Prep Strategies for Dorm Rooms',
          content: 'Overnight oats paired with chia and frozen berries eliminate morning cooking friction. Microwave-steamed sweet potatoes paired with rinsed canned black beans and salsa form a complete micronutrient-dense dinner in under 6 minutes.'
        }
      ],
      conflicts: [],
      limitations: ['Assumes access to standard tap water and basic refrigeration.'],
      recommendation: 'Anchor weekly grocery trips on bulk dry staples and frozen vegetables; avoid single-serve pre-packaged student meals which cost 3x more per nutrient gram.'
    }
  }
];

// Rich completed report template for the active "AI coding tools" session once completed
export const COMPLETED_AI_TOOLS_REPORT = {
  title: 'Comparative Analysis: Free AI Coding Assistants for Collegiate Hackathons',
  generatedAt: 'Just now',
  confidenceScore: 0.93,
  verificationStatus: 'verified',
  executiveSummary: 'This report evaluates three prominent free AI coding assistants — Codeium Free, GitHub Copilot (Student Developer Pack), and Amazon Q Developer — specifically contextualized for collegiate hackathons. Key parameters evaluated include language breadth, IDE support, zero-cost limits, setup friction, and latency under constrained event network conditions. Based on zero-friction onboarding, unlimited code suggestions, and native VS Code/JetBrains support without credit card or verification delays, Codeium Free is recommended as the optimal choice for beginner hackathon teams.',
  comparisonTable: {
    headers: ['Feature', 'Codeium Free', 'GitHub Copilot (Student)', 'Amazon Q Developer'],
    rows: [
      ['Price / Tier', 'Free Forever (Individual)', 'Free via Student Pack', 'Free (AWS Builder ID)'],
      ['Setup Friction', 'Very Low (1-minute email login)', 'Moderate (Requires 24-48h student ID verification)', 'Low (AWS Builder ID creation)'],
      ['Supported Languages', '70+ (Python, JS/TS, C++, Go, Java)', '80+ (Python, JS/TS, Ruby, Go, C#)', '25+ (Specialized in Java, Python, JS, SQL)'],
      ['IDE Integration', 'VS Code, JetBrains, Vim, Eclipse', 'VS Code, JetBrains, Neovim, Visual Studio', 'VS Code, JetBrains, AWS Cloud9'],
      ['Offline Mode', 'Limited local caching (requires net)', 'No offline support', 'No offline support'],
      ['Security / Scanning', 'Opt-out telemetry available', 'Repository privacy guarantees', '50 security scans/month included']
    ]
  },
  sections: [
    {
      heading: '1. Tool Comparison: Features and Limitations',
      content: 'Codeium provides unlimited inline completions, comment-to-code generation, and in-IDE conversational chat at no cost. Its response latency averaged 180-240ms in benchmark testing. GitHub Copilot remains the gold standard in multi-line context understanding, but its prerequisite academic verification process creates a severe barrier for participants registering on hackathon day. Amazon Q Developer excels at enterprise and cloud tasks, but possesses narrower language support for common hackathon game-dev or mobile toolchains.',
      evidenceIds: ['ev-1', 'ev-2', 'ev-3']
    },
    {
      heading: '2. Hackathon Venue Network Constraints',
      content: 'Hackathon Wi-Fi environments routinely suffer bandwidth throttling and captive portal drops. All cloud-assisted LLM tools require active network connections for telemetry and generation. Codeium features optimized client payloads (~12KB per completion query), reducing timeout frequencies during peak event concurrency compared to heavier chat-first assistants.',
      evidenceIds: ['ev-1', 'ev-4']
    }
  ],
  conflicts: [
    {
      claim: 'Offline Assistance Capabilities',
      description: 'Vendor marketing occasionally references "offline caching", but independent testing confirms that real-time multi-token autocomplete fails without an active internet connection on all three platforms.',
      evidenceIds: ['ev-1', 'ev-2']
    }
  ],
  limitations: [
    'Benchmarked on standard web and Python development tasks; niche domain-specific languages (e.g. Solidity, Zig) were not exhaustively tested.',
    'Free-tier terms of service and telemetry policies are subject to vendor revision.'
  ],
  recommendation: 'We recommend Codeium Free for beginner hackathon teams. Its zero-delay onboarding (no waiting for student ID approval), support for multiple programming languages, and robust VS Code plugin ensure teammates can begin building within minutes of team formation without getting stuck in account approval queues.',
};
