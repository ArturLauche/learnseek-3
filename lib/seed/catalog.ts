export type SeedItem = {
  slug: string;
  title: string;
  learningObjective: string;
  bodyText: string;
  durationSeconds: number;
  format:
    | "explanation"
    | "practical_lesson"
    | "visual_comparison"
    | "timeline"
    | "worked_example"
    | "interactive_quiz"
    | "flashcard"
    | "code_example"
    | "misconception_correction"
    | "decision_exercise"
    | "short_story"
    | "diagram"
    | "reflection_prompt"
    | "interactive_demo";
  topic: string;
  difficulty: "new" | "familiar" | "experienced" | "expert";
  safetyClass?: "general" | "health" | "finance" | "law" | "politics" | "security" | "safety";
  sources: { title: string; url: string; citation: string }[];
};

export const SEED_TOPICS = [
  { slug: "software", name: "Software", description: "Programs, systems, and how they fail usefully." },
  { slug: "science", name: "Science", description: "Methods and models for explaining the physical world." },
  { slug: "history", name: "History", description: "What people did, and how we know." },
  { slug: "psychology", name: "Psychology", description: "Minds under ordinary conditions." },
  { slug: "business", name: "Business", description: "How organizations create and lose value." },
  { slug: "finance", name: "Finance", description: "Time, risk, and claims on the future." },
  { slug: "communication", name: "Communication", description: "Making meaning travel intact." },
  { slug: "health-literacy", name: "Health literacy", description: "Reading bodies and studies without panic." },
  { slug: "philosophy", name: "Philosophy", description: "Questions that stay useful after the answer moves." },
  { slug: "design", name: "Design", description: "Choices that other people have to live with." },
  { slug: "ai", name: "AI", description: "What statistical machines can and cannot do." },
  { slug: "practical-life", name: "Practical life skills", description: "Small techniques with outsized calm." },
] as const;

export const SEED_ITEMS: SeedItem[] = [
  {
    slug: "electrons-in-a-leaf",
    title: "Where the electron actually goes in photosynthesis",
    learningObjective: "Trace one electron from water to NADPH without treating the leaf as a black box.",
    durationSeconds: 95,
    format: "explanation",
    topic: "science",
    difficulty: "familiar",
    bodyText:
      "Light does not 'feed' the plant in the everyday sense. Photons strike chlorophyll in photosystem II and raise an electron to a higher energy. That electron is not created from nothing: it is taken from water, which is why oxygen is released as a leftover. The electron then rides a chain of proteins in the thylakoid membrane, losing energy in controlled drops that pump protons. Photosystem I re-energizes the electron so it can be stored in NADPH. The proton gradient, not the electron itself, is what ATP synthase uses. Remember the split: electrons become reducing power; the leftover gradient becomes ATP. Both are spent in the Calvin cycle to fix carbon.",
    sources: [
      {
        title: "Photosynthesis - Khan Academy (CC-BY-NC-SA educational overview)",
        url: "https://www.khanacademy.org/science/biology/photosynthesis-in-plants",
        citation: "Educational review of light-dependent reactions. Oriel text is original.",
      },
    ],
  },
  {
    slug: "compound-interest-is-a-curve",
    title: "Compound interest is a curve, not a raise",
    learningObjective: "Explain why equal annual percentages produce unequal dollar jumps later.",
    durationSeconds: 70,
    format: "practical_lesson",
    topic: "finance",
    difficulty: "new",
    bodyText:
      "A 7% return on $100 is $7. A 7% return on $200 is $14. The rate did not change; the base did. That is the whole mechanism. If you sketch the dollars each year, the line bends upward even when the percentage is constant. This is not a trick of banks so much as a property of multiplication. The practical move is to notice which number you are multiplying: principal, or principal plus yesterday's gain. If you withdraw the gain each year, you flatten the curve back into a line. If you leave it, later years do more of the work. No streak language required — just which base you keep.",
    sources: [
      {
        title: "Federal Reserve Education: compound interest",
        url: "https://www.federalreserveeducation.org/",
        citation: "Public education materials on interest. Numerical examples original to Oriel.",
      },
    ],
  },
  {
    slug: "correlation-is-not-a-lever",
    title: "Correlation is a weather report, not a lever",
    learningObjective: "Separate a co-occurrence from an intervention that would change an outcome.",
    durationSeconds: 80,
    format: "misconception_correction",
    topic: "psychology",
    difficulty: "new",
    bodyText:
      "Two measurements can rise together because one causes the other, because they share a cause, or because the window you chose is noisy. Ice cream sales and drowning deaths both rise in summer. Turning off ice cream shops would not drain the pool. The misconception is treating a scatterplot as a recipe. A recipe names an intervention: do X, Y changes. A correlation does not name the do. When you hear 'linked to', ask: linked how, in whom, and what would we actually change? If nobody can name the intervention, you still have a weather report — useful, incomplete.",
    sources: [
      {
        title: "US Census / open teaching notes on correlation vs causation",
        url: "https://www.census.gov/",
        citation: "Public statistical literacy theme. Ice-cream example is a commonplace teaching device, wording original.",
      },
    ],
  },
  {
    slug: "http-cache-in-90s",
    title: "HTTP caching in one trip to the cupboard",
    learningObjective: "Decide whether a browser may reuse a response from Cache-Control and ETag.",
    durationSeconds: 90,
    format: "code_example",
    topic: "software",
    difficulty: "familiar",
    bodyText:
      "A cache is a cupboard. Cache-Control: max-age=60 says 'this leftover is fine for a minute.' After that, you may still have the container (the stored bytes) but you should ask the kitchen. That question is often conditional: If-None-Match with an ETag. If the server says 304, keep the leftovers; nothing transferred but a nod. no-store means do not even use the cupboard. private means a shared CDN cupboard is the wrong place. The mistake is treating cache as 'make it faster' rather than 'who is allowed to remember this, and for how long?' Headers are policy, not a speed hack.",
    sources: [
      {
        title: "RFC 9111 HTTP Caching",
        url: "https://www.rfc-editor.org/rfc/rfc9111",
        citation: "IETF RFC 9111. Explanation original to Oriel.",
      },
    ],
  },
  {
    slug: "alexandria-what-we-know",
    title: "The Library of Alexandria: fire, slow leak, or both?",
    learningObjective: "Distinguish the popular single-fire story from the fragmentary historical record.",
    durationSeconds: 110,
    format: "timeline",
    topic: "history",
    difficulty: "familiar",
    bodyText:
      "There is no one night when the entire Mouseion vanished on schedule. Caesar's Alexandrian war (48 BCE) is associated with fires in the harbour quarter; later writers disagree about how much of the royal library burned. The Serapeum collection is described as suffering in late antiquity. What we have are layered notices, not a CCTV tape. A useful timeline: founding under the Ptolemies; growth as a research campus; damage reports in the first century BCE; later temple conflicts; medieval memory turning many events into one parable about lost knowledge. The lesson is methodological: spectacular stories compress centuries. Ask which author is speaking, how late they write, and what they could have seen.",
    sources: [
      {
        title: "Livius.org: Library of Alexandria (public-history overview)",
        url: "https://www.livius.org/",
        citation: "Public-history synthesis. Oriel wording is original and cautious.",
      },
    ],
  },
  {
    slug: "binary-search-needs-order",
    title: "Binary search is not a faster loop. It is a contract.",
    learningObjective: "State the ordering contract binary search assumes and what breaks without it.",
    durationSeconds: 75,
    format: "worked_example",
    topic: "software",
    difficulty: "new",
    bodyText:
      "Suppose you look up a word by opening a dictionary in the middle. That only works because the printer sorted the words. If someone shuffled the pages, opening the middle tells you nothing about the rest. Binary search is the same contract: the array must be ordered under the same comparison you use to decide left or right. Example: hunt for 7 in [1, 3, 7, 8, 12]. Mid is 7 — done. Shuffle to [8, 1, 12, 7, 3] and the same mid-test can walk away from 7 forever. The algorithm is not 'check fewer items'; it is 'discard half because order guarantees they cannot contain the answer.' No sort, no discard, no binary search.",
    sources: [
      {
        title: "CLRS / common algorithms teaching (public domain idea)",
        url: "https://en.wikipedia.org/wiki/Binary_search_algorithm",
        citation: "Wikipedia (CC BY-SA) for the algorithm name. Worked numbers original.",
      },
    ],
  },
  {
    slug: "bayes-clinic-door",
    title: "A rare disease and a pretty good test",
    learningObjective: "Recalculate a positive test using base rates instead of the test's headline accuracy.",
    durationSeconds: 120,
    format: "worked_example",
    topic: "health-literacy",
    difficulty: "experienced",
    safetyClass: "health",
    bodyText:
      "Imagine 1,000 people. The condition occurs in 1%. That is 10 people with it, 990 without. A test is 99% sensitive and 99% specific. Of the 10, about 10 true positives. Of the 990, 1% false positives ≈ 10. So a positive result sits in a bag with 10 real and 10 false. About half. The test was not a lie; the door of the clinic was. Base rates do this quietly. This is not medical advice and not a diagnosis. It is arithmetic that belongs next to any impressive accuracy claim. If you change the prevalence, the same test becomes a different story.",
    sources: [
      {
        title: "Gigerenzer-style natural frequency teaching (public science communication)",
        url: "https://en.wikipedia.org/wiki/Base_rate_fallacy",
        citation: "Base-rate fallacy overview. Clinic numbers are a teaching fiction, not a real assay.",
      },
    ],
  },
  {
    slug: "stack-vs-queue",
    title: "A stack is a plate pile. A queue is a bakery line.",
    learningObjective: "Contrast LIFO and FIFO with one insertion and one removal each.",
    durationSeconds: 50,
    format: "visual_comparison",
    topic: "software",
    difficulty: "new",
    bodyText:
      "Stack: last plate down is first plate up. Push A, push B, pop — you get B. Function calls use this so the newest frame finishes first. Queue: first ticket in is first ticket served. Enqueue A, enqueue B, dequeue — you get A. Printers and request handlers use this so nobody's job is buried by later arrivals. Same two operations (add, remove), different end. If you mix them, you have a bug with a metaphor problem. Draw both with three letters and you will not forget which end moves.",
    sources: [
      {
        title: "NIST Dictionary of Algorithms: stack / queue",
        url: "https://xlinux.nist.gov/dads/",
        citation: "Public-domain algorithm dictionary concepts. Metaphors original to Oriel.",
      },
    ],
  },
  {
    slug: "germ-theory-short",
    title: "Germ theory did not arrive as a slogan",
    learningObjective: "Place Pasteur, Lister, and Koch as a sequence of evidence, not a single eureka.",
    durationSeconds: 100,
    format: "timeline",
    topic: "science",
    difficulty: "familiar",
    bodyText:
      "People had contagion guesses long before microbes had names. The 19th century made the guess expensive to deny. Pasteur's fermentation and silkworm work argued that specific organisms do specific jobs. Lister applied carbolic acid to wounds after reading about airborne particles. Koch's postulates demanded you isolate, reproduce, and recover the organism. None of this was a TED talk; it was instruments, farms, wards, and stubborn replication. The timeline is messy because evidence accumulated in different trades. Treat 'germ theory' as a bundle of practices: sterilize, isolate, attribute, test — not as a personality cult.",
    sources: [
      {
        title: "NIH / NLM historical materials on germ theory",
        url: "https://www.nlm.nih.gov/",
        citation: "US NLM historical collections. Narrative original.",
      },
    ],
  },
  {
    slug: "nutrition-label-90s",
    title: "How to read a nutrition label without shopping it",
    learningObjective: "Use serving size, then the two numbers that usually matter for a goal.",
    durationSeconds: 85,
    format: "practical_lesson",
    topic: "health-literacy",
    difficulty: "new",
    safetyClass: "health",
    bodyText:
      "The first honest line is serving size. Every other number is per that serving, not per package. If you eat two servings, you double the row — including the cheerful ones. Then pick a goal. If you care about blood pressure, scan sodium. If you care about energy across an afternoon, scan added sugars and fiber together rather than calories alone. % Daily Value is a 2,000 kcal adult yardstick, not your personal metabolism. This is literacy, not a diet plan. Labels are regulated summaries; they are not a moral score.",
    sources: [
      {
        title: "US FDA: How to Understand and Use the Nutrition Facts Label",
        url: "https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label",
        citation: "FDA public guidance. Oriel paraphrase for microlearning length.",
      },
    ],
  },
  {
    slug: "knowing-that-vs-knowing-how",
    title: "Two ways of knowing, sitting in the same chair",
    learningObjective: "Distinguish propositional knowledge from skill, and notice when a quiz measures the wrong one.",
    durationSeconds: 90,
    format: "reflection_prompt",
    topic: "philosophy",
    difficulty: "familiar",
    bodyText:
      "You can say 'a bicycle stays up by steering into a fall' and still wobble at the curb. Gilbert Ryle called this the difference between knowing that and knowing how. Flashcards capture the first. Riding captures the second. Oriel will sometimes quiz you. Ask, before you celebrate a score: did I need a sentence, or a hand? If the goal was a hand, a perfect sentence is a souvenir. Reflection: name one thing you 'know' that you cannot yet do, and one thing you can do that you would struggle to explain. Both count. Neither should bully the other.",
    sources: [
      {
        title: "Ryle, The Concept of Mind (public discussion of knowing-how)",
        url: "https://en.wikipedia.org/wiki/The_Concept_of_Mind",
        citation: "Philosophical commonplace. Prompt original to Oriel.",
      },
    ],
  },
  {
    slug: "ten-percent-brain",
    title: "You are not using 10% of your brain. That would be a medical emergency.",
    learningObjective: "Reject the 10% myth using basic imaging and lesion evidence.",
    durationSeconds: 60,
    format: "misconception_correction",
    topic: "science",
    difficulty: "new",
    bodyText:
      "Brain imaging shows widespread activity even at rest. Small lesions can cost speech, faces, or movement — odd outcomes if 90% were spare. The myth probably grew from a mash of unused-potential self-help and misread neuroscience. Metabolic cost also argues against vast idle tissue: the brain is expensive. 'Potential' is real in the sense of skill and knowledge you have not practiced. It is not a dormant lobe waiting for a secret. If a claim needs you to be mostly switched off, it is selling a switch.",
    sources: [
      {
        title: "NIH brain basics / myth-busting education",
        url: "https://www.ninds.nih.gov/",
        citation: "Public NIH education. Wording original.",
      },
    ],
  },
  {
    slug: "study-method-decision",
    title: "Pick a study method like a tool, not a personality",
    learningObjective: "Choose retrieval, spacing, or explanation based on the next 20 minutes of work.",
    durationSeconds: 80,
    format: "decision_exercise",
    topic: "practical-life",
    difficulty: "new",
    bodyText:
      "If you cannot yet recall the idea with a blank page, retrieval practice (closed-book questions) is the tool. If you already recall it today but forget by Friday, spacing is the tool — stop bingeing the same hour. If you can recite but cannot use it on a new example, self-explanation or a worked problem is the tool. Personality quizzes about 'visual learners' are a side quest. The decision: what failure did you just observe? Match the method to the failure, then work for one short block. You can change tools tomorrow without drama.",
    sources: [
      {
        title: "IES / What Works Clearinghouse: organizing instruction (public)",
        url: "https://ies.ed.gov/ncee/wwc/",
        citation: "US education evidence summaries. Decision frame original.",
      },
    ],
  },
  {
    slug: "fallacy-flashcards",
    title: "Three named holes in an argument",
    learningObjective: "Identify ad hominem, false dilemma, and post hoc in short claims.",
    durationSeconds: 70,
    format: "flashcard",
    topic: "communication",
    difficulty: "new",
    bodyText:
      "Card 1 — Ad hominem: attacking the speaker's character instead of the claim. 'You would say that, you work there' does not test the data. Card 2 — False dilemma: 'either we ban it or we do nothing.' Most policies live in the middle. Card 3 — Post hoc: 'after the ritual, the rain' is a sequence, not a cause. Flip each card and invent a workplace version. Naming is not winning; it is slowing the slide from claim to certainty.",
    sources: [
      {
        title: "Public domain logic primers / fallacy lists",
        url: "https://en.wikipedia.org/wiki/List_of_fallacies",
        citation: "Common names. Examples original to Oriel.",
      },
    ],
  },
  {
    slug: "scribe-one-afternoon",
    title: "An afternoon in a scriptorium",
    learningObjective: "Describe how manuscript copying mixed labor, error, and care before print.",
    durationSeconds: 100,
    format: "short_story",
    topic: "history",
    difficulty: "new",
    bodyText:
      "The window is high, on purpose: more light, less street. Ink is soot and gum; a knife waits for mistakes. You copy not because you love the author's jokes but because the house needs a second psalter. Your hand slips on a minim and 'n' becomes 'u'. A later reader will invent a theology from your fatigue. You rule the lines first, then letters, then a red capital if the budget allows. Nothing here is 'content' in the platform sense. It is hours, skins, and a chain of trust that a page is what the last trusted page said. When print arrives, it will not end error. It will industrialize it — and correction.",
    sources: [
      {
        title: "British Library / public manuscript primers",
        url: "https://www.bl.uk/",
        citation: "Public heritage education. Story is original fiction for learning, not a historical individual.",
      },
    ],
  },
  {
    slug: "osi-vs-tcpip",
    title: "OSI is a teaching apartment building. TCP/IP is the one people live in.",
    learningObjective: "Map OSI's seven layers onto the four-layer internet model without pretending they are the same building.",
    durationSeconds: 85,
    format: "diagram",
    topic: "software",
    difficulty: "familiar",
    bodyText:
      "OSI: Physical, Data Link, Network, Transport, Session, Presentation, Application. TCP/IP as used: Link, Internet, Transport, Application. Session and presentation did not vanish; they folded into application protocols (TLS, for example, is not a polite extra floor — it is how the application floor locks the doors). Use OSI when you need a vocabulary for 'whose problem is this?' Use TCP/IP when you are reading a packet capture. The diagram is two columns, not a moral ranking. Teachers like seven because it has more handles. Networks like four because that is what deployed.",
    sources: [
      {
        title: "RFC 1122 Requirements for Internet Hosts",
        url: "https://www.rfc-editor.org/rfc/rfc1122",
        citation: "IETF host requirements. Teaching comparison original.",
      },
    ],
  },
];
