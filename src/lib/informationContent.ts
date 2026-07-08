/*
  Content + timing for the auto-rotating /information wall display.
  Placeholder/sample data for now, structured so the services lists can later
  come from Supabase without changing the page components. Edit copy here.
*/

// How long each full-screen page is shown before advancing (milliseconds).
export const PAGE_DURATION = 30000; // 30 seconds

export type Service = {
  name: string;
  schedule: string;
  description: string;
  location?: string;
};

// --- Page 1: general services overview (later: fetch from Supabase) ---------
export const weeklyServices: Service[] = [
  {
    name: "Hot Meals",
    schedule: "Daily · 8 AM–7 PM",
    description: "Breakfast, lunch, and dinner at no cost.",
    location: "Dining Hall",
  },
  {
    name: "Overnight Shelter",
    schedule: "Nightly · Check-in 6 PM",
    description: "A safe, warm bed for the night.",
    location: "Main Building",
  },
  {
    name: "Showers & Hygiene",
    schedule: "Daily · 7 AM–Noon",
    description: "Showers, toiletries, and clean towels.",
    location: "Wellness Center",
  },
  {
    name: "Medical Clinic",
    schedule: "Mon, Wed, Fri · 9 AM–3 PM",
    description: "Walk-in care from on-site nurses.",
    location: "Health Office",
  },
  {
    name: "Caseworker Support",
    schedule: "Weekdays · 9 AM–5 PM",
    description: "Help with housing, benefits, and next steps.",
    location: "Front Office",
  },
  {
    name: "Clothing Closet",
    schedule: "Tue, Thu · 10 AM–2 PM",
    description: "Free clothing, shoes, and seasonal gear.",
    location: "Annex",
  },
];

// --- Page 2: new arrivals (people who just came onto campus) -----------------
export const newArrivals = {
  heading: "Welcome — We're Glad You're Here",
  intro:
    "If you've just arrived, you're in the right place. Here's how to get started, and what's available to you right now.",
  steps: [
    {
      title: "Check in at the Front Desk",
      detail:
        "Just inside the Main Building. Someone will welcome you and help you right away.",
    },
    {
      title: "Have a hot meal",
      detail: "The Dining Hall is open now — no cost, no questions.",
    },
    {
      title: "Talk with a caseworker",
      detail: "Free, private help with shelter, benefits, and your next steps.",
    },
  ],
  availableNow: [
    "Restrooms, showers, and clean clothing",
    "A safe, warm place to rest",
    "Water and a hot meal",
    "Someone to talk to",
  ],
};

// --- Page 3: demographic-focused (reconfigurable) ---------------------------
export type Demographic = {
  audience: string;
  heading: string;
  intro: string;
  services: Service[];
};

/*
  The demographic page shows ONE demographic at a time. To rotate the focus
  later (veterans, families, seniors, …), add an entry here and point
  `featuredDemographicKey` at it — the page component doesn't change.
*/
export const demographics = {
  pregnantWomen: {
    audience: "Expecting Mothers",
    heading: "Support for Expecting Mothers",
    intro:
      "If you are pregnant, we have care set aside for you and your baby. You are welcome here.",
    services: [
      {
        name: "Prenatal Check-ups",
        schedule: "Mon, Wed, Fri · 9 AM–3 PM",
        description: "On-site medical care throughout your pregnancy.",
        location: "Health Office",
      },
      {
        name: "Nutritious Meals",
        schedule: "Daily",
        description: "Priority access to healthy meals and snacks.",
        location: "Dining Hall",
      },
      {
        name: "Maternity & Baby Supplies",
        schedule: "Tue, Thu · 10 AM–2 PM",
        description: "Maternity clothing, diapers, and newborn essentials.",
        location: "Clothing Closet",
      },
      {
        name: "Private Rest Area",
        schedule: "Daily",
        description: "A quiet, comfortable space to rest.",
        location: "Wellness Center",
      },
      {
        name: "Program Referrals",
        schedule: "Weekdays",
        description: "Connections to prenatal and parenting programs.",
        location: "Front Office",
      },
    ],
  },
} satisfies Record<string, Demographic>;

export type DemographicKey = keyof typeof demographics;

// The demographic currently featured on page 3.
export const featuredDemographicKey: DemographicKey = "pregnantWomen";
export const featuredDemographic: Demographic =
  demographics[featuredDemographicKey];
