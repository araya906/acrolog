// Built-in starter library. Users can edit any entry (the edited copy is stored on the device under the
// same id and wins over this one) or add their own figures and flows.
//
// tag   = Instagram hashtag (without #) for "Search on Instagram".
// guide = tutorial page on the Partner Acrobatics manual (path under GUIDE_BASE).
// video = video of the skill as listed on Acropedia (YouTube or Instagram; belongs to its creator).
// ap    = Acropedia skill id (page under ACROPEDIA_BASE).
// Levels are a rough guide for ordering; adjust them to how your community teaches.

export const GUIDE_BASE = "https://partneracrobatics.com";
export const ACROPEDIA_BASE = "https://www.acrolove.org/acropedia/skill/";
export const ACROPEDIA_ALL = "https://www.acrolove.org/acropedia/#/all?view=list&sort=az";

export const CATS = ["lbase", "standing", "therapeutic", "trio"];
export const FLOW_TYPES = ["transition", "flow", "washing"];
export const ROLES = ["base", "flyer"];
export const STATUS = [0, 1, 2, 3, 4]; // not started, learning, with spotter, solid, mastered
export const LEVELS = [1, 2, 3, 4];

const f = (id, en, es, cat, level, tag, guide) => ({ id, kind: "fig", name: { en, es }, cat, level, tag, ...(guide && { guide }) });

export const FIGURES = [
  // L-basing
  f("plank", "Front plank", "Plancha", "lbase", 1, "acroyogaplank"),
  f("back-plank", "Back plank", "Plancha invertida", "lbase", 1, "backplank", "/l-basing/l-base-basics/back-plank/"),
  f("front-bird", "Front bird", "Pájaro", "lbase", 1, "frontbird", "/l-basing/l-base-basics/bird-flyer/"),
  f("back-bird", "Back bird", "Pájaro invertido", "lbase", 1, "backbird"),
  f("throne", "Throne", "Trono", "lbase", 1, "acroyogathrone", "/l-basing/l-base-basics/secretary-and-throne/"),
  f("chair", "Chair", "Silla", "lbase", 1, "acroyogachair"),
  f("secretary", "Secretary", "Secretaria", "lbase", 2, "acroyogasecretary", "/l-basing/l-base-basics/secretary-and-throne/"),
  f("reverse-throne", "Reverse throne", "Trono invertido", "lbase", 2, "reversethrone", "/l-basing/icarian-bird-to-throne-and-reverse-throne/"),
  f("tuck-sit", "Tuck sit / L-sit", "Tuck sit / L-sit", "lbase", 2, "acroyogalsit", "/l-basing/l-base-basics/arm-balancestuck-sits-l-sits/"),
  f("whale", "Whale", "Ballena", "lbase", 2, "acroyogawhale"),
  f("high-flying-whale", "High flying whale", "Ballena voladora", "lbase", 2, "highflyingwhale"),
  f("bow", "Bow", "Arco", "lbase", 2, "acroyogabow"),
  f("candlestick", "Candlestick", "Vela", "lbase", 2, "acroyogacandlestick"),
  f("star", "Star", "Estrella", "lbase", 2, "acroyogastar"),
  f("side-star", "Side star", "Estrella lateral", "lbase", 2, "sidestar"),
  f("square-box", "Square box", "Caja cuadrada", "lbase", 2, "acroyogabox"),
  f("reverse-star", "Reverse star", "Estrella invertida", "lbase", 3, "reversestar", "/l-basing/l-base-basics/reverse-shoulder-stand-feet-reverse-star/"),
  f("vishnus-couch", "Vishnu's couch", "Sofá de Vishnu", "lbase", 3, "vishnuscouch"),
  f("mermaid", "Mermaid", "Sirena", "lbase", 3, "acroyogamermaid", "/l-basing/washing-machines/mermaid-1/"),
  f("free-shoulder-stand", "Free shoulder stand", "Pino libre sobre hombros", "lbase", 3, "freeshoulderstand"),
  f("foot-to-hand", "Foot to hand", "Pie a mano", "lbase", 3, "foottohand", "/l-basing/l-base-basics/foot-to-hand/"),
  f("reverse-foot-to-hand", "Reverse foot to hand", "Pie a mano invertido", "lbase", 3, "reversefoottohand", "/l-basing/rev-f2h-low/"),
  f("handstand-on-feet", "Handstand on feet", "Pino sobre pies", "lbase", 3, "handstandonfeet", "/inversions/handstands-on-body/handstand-on-feet/"),
  f("bicep-stand", "Bicep stand", "Pino sobre bíceps", "lbase", 3, "bicepstand", "/inversions/handstands-on-body/handstand-on-biceps/"),
  f("hand-to-hand", "Hand to hand (L-base)", "Mano a mano (L-base)", "lbase", 4, "handtohand", "/l-basing/l-base-intermediate-advanced/hand-to-hand-2/"),
  f("reverse-hand-to-hand", "Reverse hand to hand", "Mano a mano invertido", "lbase", 4, "reversehandtohand"),
  // Therapeutic
  f("folded-leaf", "Folded leaf", "Hoja plegada", "therapeutic", 1, "foldedleaf"),
  f("floating-paschimo", "Floating paschimottanasana", "Paschimottanasana flotante", "therapeutic", 1, "floatingpaschimo"),
  f("hangle-dangle", "Hangle dangle", "Hangle dangle", "therapeutic", 1, "hangledangle", "/l-basing/l-base-basics/hangle-dangle/"),
  f("backbend", "Supported backbend", "Extensión asistida", "therapeutic", 1, "acroyogabackbend", "/l-basing/l-base-basics/backbends/"),
  f("super-yogi", "Super yogi", "Super yogi", "therapeutic", 2, "superyogi"),
  f("straddle-bat", "Straddle bat", "Murciélago", "therapeutic", 2, "straddlebat"),
  // Standing
  f("thigh-stand", "Thigh stand", "De pie sobre muslos", "standing", 2, "thighstand", "/standing-acrobatics/standing-basics/thighstands/"),
  f("camel", "Camel", "Camello", "standing", 2, "acrocamel", "/standing-acrobatics/standing-basics/camel/"),
  f("bird-on-shoulders", "Bird on shoulders", "Pájaro sobre hombros", "standing", 3, "birdonshoulders", "/standing-acrobatics/standing-basics/bird-on-shoulders/"),
  f("handstand-on-thighs", "Handstand on thighs", "Pino sobre muslos", "standing", 3, "handstandonthighs", "/standing-acrobatics/cartwheel-to-handstand-on-thighs/"),
  f("flag", "Flag", "Bandera", "standing", 3, "acroflag", "/standing-acrobatics/standing-basics/flag/"),
  f("two-high", "Standing on shoulders (two-high)", "De pie sobre hombros (two-high)", "standing", 4, "twohigh", "/standing-acrobatics/standing-basics/two-high/"),
  f("standing-f2h", "Standing foot to hand", "Pie a mano de pie", "standing", 4, "standingfoottohand", "/standing-acrobatics/standing-basics/foot-to-hand-standing/"),
  f("standing-reverse-f2h", "Standing reverse foot to hand", "Pie a mano invertido de pie", "standing", 4, "reversefoottohand", "/standing-acrobatics/reverse-f2h-standing/"),
  f("handstand-on-shoulders", "Handstand on shoulders", "Pino sobre hombros", "standing", 4, "handstandonshoulders", "/standing-acrobatics/handstand-on-shoulders/"),
  f("standing-h2h", "Standing hand to hand", "Mano a mano de pie", "standing", 4, "standinghandtohand"),
  // Trios and groups
  f("trio-back-bird", "Trio back bird (two flyers)", "Pájaro invertido en trío (dos flyers)", "trio", 2, "acroyogatrio"),
  f("trio-down-dog", "Trio down dog with hanging flyer", "Perro bocabajo en trío con flyer colgado", "trio", 2, "acroyogatrio"),
  f("pyramid", "Pyramid", "Pirámide", "trio", 3, "acropyramid")
];

const fl = (id, en, es, type, level, steps, tag, extra = {}) => ({ id, kind: "flow", name: { en, es }, type, level, steps, tag, ...extra });

// Washing machines come with the Acropedia video; their steps start empty on purpose (teachers break them
// down differently): watch the video and add the steps the way you learned them (Edit).
export const FLOWS = [
  // Transitions (steps follow from the name)
  fl("bird-throne", "Bird to throne", "Pájaro a trono", "transition", 1, ["front-bird", "throne"], "acroyogatransitions"),
  fl("secretary-throne", "Secretary to throne", "Secretaria a trono", "transition", 2, ["secretary", "throne"], "acroyogatransitions", { guide: "/l-basing/l-base-basics/secretary-and-throne/" }),
  fl("bird-side-star-bird", "Bird – side star – bird", "Pájaro – estrella lateral – pájaro", "transition", 2, ["front-bird", "side-star", "front-bird"], "sidestar", { guide: "/l-basing/bird-side-star-bird-no-hands/" }),
  fl("candlestick-star", "Candlestick to star", "Vela a estrella", "transition", 2, ["candlestick", "star"], "acroyogaflow"),
  fl("reverse-star-throne", "Reverse star to throne", "Estrella invertida a trono", "transition", 3, ["reverse-star", "throne"], "reversestar", { guide: "/l-basing/rev-star-to-throne/" }),
  fl("secretary-f2h", "Secretary to foot to hand", "Secretaria a pie a mano", "transition", 3, ["secretary", "foot-to-hand"], "foottohand", { guide: "/l-basing/l-base-basics/secretary-foot-hand/" }),
  fl("back-plank-f2h", "Back plank to foot to hand", "Plancha invertida a pie a mano", "transition", 3, ["back-plank", "foot-to-hand"], "foottohand", { guide: "/l-basing/l-base-intermediate-advanced/back-plank-foot-hand/" }),
  fl("bird-reverse-h2h", "Bird to reverse hand to hand", "Pájaro a mano a mano invertido", "transition", 4, ["front-bird", "reverse-hand-to-hand"], "reversehandtohand", { guide: "/l-basing/l-base-intermediate-advanced/bird-reverse-hand-hand/" }),
  fl("thigh-stand-h2h", "Thigh stand to hand to hand (standing)", "De muslos a mano a mano (de pie)", "transition", 4, ["thigh-stand", "standing-h2h"], "standinghandtohand", { guide: "/standing-acrobatics/thighstand-to-h2h-standing/" }),
  // Flows
  fl("first-flight", "First flight", "Primer vuelo", "flow", 1, ["plank", "front-bird", "back-bird", "folded-leaf"], "acroyogabeginner"),
  fl("therapeutic-flow", "Therapeutic flow", "Secuencia terapéutica", "flow", 1, ["folded-leaf", "floating-paschimo", "straddle-bat", "hangle-dangle"], "therapeuticflying"),
  fl("throne-family", "Throne family", "Familia del trono", "flow", 2, ["front-bird", "throne", "reverse-throne", "chair"], "acroyogathrone"),
  // Washing machines (video and page from Acropedia)
  fl("helicopter", "Helicopter", "Helicóptero", "washing", 2, [], "acroyogahelicopter", { video: "https://www.youtube.com/watch?v=x5yuJ1rUP50", ap: "helicopter", guide: "/l-basing/washing-machines/helicopter/" }),
  fl("ninja-star", "Ninja star", "Estrella ninja", "washing", 2, [], "ninjastar", { video: "https://youtu.be/xk1Vkx6Q83s", ap: "ninja-stars", guide: "/l-basing/washing-machines/ninja-star/" }),
  fl("catherine-wheel", "Catherine's wheel", "Rueda de Catalina", "washing", 2, [], "catherineswheel", { video: "https://youtu.be/T0_awJTagmw", ap: "catherines-wheels", guide: "/l-basing/washing-machines/kathrins-wheel/" }),
  fl("barrel-roll", "Barrel roll", "Barril", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/2sO0Qw0anbc", ap: "barrel-rolls", guide: "/l-basing/washing-machines/barrell-roll/" }),
  fl("corkscrew", "Corkscrew", "Sacacorchos", "washing", 3, [], "acroyogacorkscrew", { video: "https://www.youtube.com/watch?v=sljrqLLercc", ap: "corkscrew", guide: "/l-basing/washing-machines/corkscrew/" }),
  fl("two-step", "2-step", "2 pasos", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=rBgIFi2Mdew", ap: "2-step" }),
  fl("four-step", "4-step", "4 pasos", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=mlmMfaEAhdE", ap: "4-step", guide: "/l-basing/washing-machines/4-step/" }),
  fl("ninja-throne", "Ninja throne", "Trono ninja", "washing", 3, [], "acroyogathrone", { video: "https://youtu.be/BnYbJPRoHLk", ap: "ninja-throne" }),
  fl("roll-the-throne", "Roll the throne", "Rodar el trono", "washing", 3, [], "acroyogathrone", { video: "https://www.youtube.com/watch?v=Jj5diuG3NSc", ap: "roll-the-throne" }),
  fl("lazy-throne", "Lazy throne", "Trono perezoso", "washing", 3, [], "acroyogathrone", { video: "https://www.youtube.com/watch?v=FMDGN9n1itE", ap: "lazy-throne" }),
  fl("rocking-the-throne", "Rocking the throne", "Mecer el trono", "washing", 3, [], "acroyogathrone", { video: "https://www.youtube.com/watch?v=KsThPYSZaGw", ap: "rocking-the-throne" }),
  fl("buddha-twist", "Buddha twist", "Giro de Buda", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/Jl4kiKmeJ58", ap: "buddha-twist" }),
  fl("ballerina", "Ballerina", "Bailarina", "washing", 3, [], "acroyogaballerina", { video: "https://youtu.be/EDkqcB__v1k", ap: "ballerina", guide: "/l-basing/washing-machines/ballerina/" }),
  fl("whale-cycle", "Whale cycle", "Ciclo de ballena", "washing", 3, [], "acroyogawhale", { video: "https://www.instagram.com/reel/C4RJrV4I71C/", ap: "whale-cycle" }),
  fl("helicopter-reverse", "Helicopter (reverse)", "Helicóptero (inverso)", "washing", 3, [], "acroyogahelicopter", { video: "https://youtu.be/ArEp2bXaVZQ", ap: "helicopters-reverse" }),
  fl("catherine-wheel-reverse", "Catherine's wheel (reverse)", "Rueda de Catalina (inversa)", "washing", 3, [], "catherineswheel", { video: "https://youtu.be/8QEBrfblPV8", ap: "catherines-wheels-reverse" }),
  fl("corkscrew-reverse", "Corkscrew (reverse)", "Sacacorchos (inverso)", "washing", 3, [], "acroyogacorkscrew", { video: "https://www.instagram.com/reel/C4VJSOkI36q/", ap: "corkscrew-reverse" }),
  fl("bowcycle", "Bowcycle", "Bowcycle", "washing", 4, [], "acroyogabow", { video: "https://www.youtube.com/watch?v=AYIrPioDfV8", ap: "bowcycle" }),
  fl("boomerangs", "Boomerangs", "Bumeranes", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/6ApP-dpWToU", ap: "boomerangs" }),
  fl("back-orbit", "Back orbit", "Órbita trasera", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/KH12OiZhrUc", ap: "back-orbit" }),
  fl("nunchucks", "Nunchucks", "Nunchakus", "washing", 4, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=CEzvEITbudo", ap: "nunchucks" }),
  fl("majestic-throne", "Majestic throne", "Trono majestuoso", "washing", 4, [], "acroyogathrone", { video: "https://www.youtube.com/watch?v=-scpxte01pM", ap: "majestic-throne" }),
  fl("high-ninja-star", "High ninja star (standing)", "Estrella ninja alta (de pie)", "washing", 4, [], "ninjastar", { video: "https://www.youtube.com/watch?v=05qGlrjsyww", ap: "high-ninja-star" })
];

export const SEED = [...FIGURES, ...FLOWS];
