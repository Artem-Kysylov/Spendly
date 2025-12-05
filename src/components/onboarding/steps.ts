export type OnboardingStepData = {
  id: number;
  title: string;
  description: string;
  image: string;
};

export const steps: OnboardingStepData[] = [
  {
    id: 1,
    title: "Welcome to Spendly",
    description:
      "Set your monthly budget, track expenses and stay in control. Quick 3-step tour.",
    image: "/draft.png",
  },
  {
    id: 2,
    title: "Track what matters",
    description:
      "Categorize transactions and see budgets at a glance. Intuitive visuals keep you focused.",
    image: "/draft.png",
  },
  {
    id: 3,
    title: "Meet Spendly Pal",
    description:
      "Your AI assistant surfaces insights, warns on overspending, and suggests optimizations.",
    image: "/draft.png",
  },
  {
    id: 4,
    title: "Ready to start?",
    description:
      "Pick a monthly budget or use a preset. You can change it anytime.",
    image: "/draft.png",
  },
];
