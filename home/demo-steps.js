// Guided demo content. Screens live in home/demo/ and are captured from the real app at 1440x640.
// `hotspot` is the clickable element's box as percentages of the screen.
export const DEMO_STEPS = [
  {
    screen: "signup",
    path: "signup",
    tip: "Click here to sign up!",
    hotspot: { x: 59.72, y: 86.94, w: 30.56, h: 6.88 },
  },
  {
    screen: "create",
    path: "teacher/create",
    tip: "Add questions, marks and a time limit, then submit",
    hotspot: { x: 68.01, y: 90.55, w: 8.45, h: 6.88 },
  },
  {
    screen: "exams",
    path: "student/exams",
    tip: "Students see the exam instantly. Click Start",
    hotspot: { x: 87.43, y: 27.03, w: 8.33, h: 6.88 },
  },
  {
    screen: "exam",
    path: "exam/CHE204",
    tip: "Live timer, autosave and a question navigator. Submit when ready",
    hotspot: { x: 77.25, y: 64.22, w: 12.19, h: 6.88 },
  },
  {
    screen: "results",
    path: "student/results",
    tip: "AI grades every answer with marks and feedback",
    hotspot: { x: 69.87, y: 47.66, w: 25.96, h: 7.81 },
  },
  {
    screen: "report",
    path: "teacher/analytics",
    tip: "Track the class average and every student's score",
    hotspot: { x: 20.83, y: 39.53, w: 44.44, h: 10.86 },
  },
];
