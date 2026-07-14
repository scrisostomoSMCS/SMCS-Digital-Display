/*
  Content + timing for the auto-rotating /information wall display.
  Placeholder/sample data for now, structured so the services lists can later
  come from Supabase without changing the page components. Edit copy here.
*/

// How long each full-screen page is shown before advancing (milliseconds).
export const PAGE_DURATION = 30000; // 30 seconds

import type { LucideIcon } from "lucide-react";
import {
  UtensilsCrossed,
  BedDouble,
  Droplets,
  Stethoscope,
  Users,
  Shirt,
  Apple,
  Baby,
  Moon,
} from "lucide-react";

export type Service = {
  name: string;
  schedule?: string;
  description?: string;
  location?: string;
  icon?: LucideIcon; // lucide icon shown on the card
  details?: string[]; // optional multi-line detail (e.g. per-meal times)
};

// --- Page 1: general services overview (later: fetch from Supabase) ---------
export const servicesPage = {
  title: "This Week's Services",
};

export const weeklyServices: Service[] = [
  {
    name: "Hot Meals",
    icon: UtensilsCrossed,
    details: [
      "Breakfast · 8:30–9:15 AM",
      "Lunch · 12:00–1:00 PM",
      "Dinner · 4:30–5:30 PM",
    ],
    location: "Dining Hall",
  },
  {
    name: "Overnight Shelter",
    icon: BedDouble,
    schedule: "Nightly · Check-in 6 PM",
    description: "A safe, warm bed for the night.",
    location: "Main Building",
  },
  {
    name: "Showers & Hygiene",
    icon: Droplets,
    schedule: "Daily · 7 AM–Noon",
    description: "Showers, toiletries, and clean towels.",
    location: "Wellness Center",
  },
  {
    name: "Medical Clinic",
    icon: Stethoscope,
    schedule: "Mon, Wed, Fri · 9 AM–3 PM",
    description: "Walk-in care from on-site nurses.",
    location: "Health Office",
  },
  {
    name: "Caseworker Support",
    icon: Users,
    schedule: "Weekdays · 9 AM–5 PM",
    description: "Help with housing, benefits, and next steps.",
    location: "Front Office",
  },
  {
    name: "Clothing Closet",
    icon: Shirt,
    schedule: "Tue, Thu · 10 AM–2 PM",
    description: "Free clothing, shoes, and seasonal gear.",
    location: "Annex",
  },
];

// --- Page 2: new arrivals (people who just came onto campus) -----------------
export const newArrivals = {
  headline: "Welcome.",
  intro:
    "If you've just arrived, you're in the right place. Here's how to get started, and what's available to you right now.",
  stepsLabel: "Where to start",
  availableLabel: "Available now",
  steps: [
    {
      title: "Check in at the Front Desk",
      detail:
        "Just inside the Main Building. Someone will welcome you and help you right away.",
    },
    {
      title: "Have a hot meal",
      detail: "The Dining Hall is open now, no cost, no questions.",
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
  `featuredDemographicKey` at it, the page component doesn't change.
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
        icon: Stethoscope,
        schedule: "Mon, Wed, Fri · 9 AM–3 PM",
        description: "On-site medical care throughout your pregnancy.",
        location: "Health Office",
      },
      {
        name: "Nutritious Meals",
        icon: Apple,
        schedule: "Daily",
        description: "Priority access to healthy meals and snacks.",
        location: "Dining Hall",
      },
      {
        name: "Maternity & Baby Supplies",
        icon: Baby,
        schedule: "Tue, Thu · 10 AM–2 PM",
        description: "Maternity clothing, diapers, and newborn essentials.",
        location: "Clothing Closet",
      },
      {
        name: "Private Rest Area",
        icon: Moon,
        schedule: "Daily",
        description: "A quiet, comfortable space to rest.",
        location: "Wellness Center",
      },
      {
        name: "Program Referrals",
        icon: Users,
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
