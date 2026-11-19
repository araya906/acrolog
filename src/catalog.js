// Built-in starter library. Users can edit any entry (the edited copy is stored on the device under the
// same id and wins over this one) or add their own figures and flows.
//
// tag   = Instagram hashtag (without #) for "Search on Instagram".
// guide = tutorial page on the Partner Acrobatics manual (path under GUIDE_BASE).
// video = video of the skill as listed on Acropedia (YouTube or Instagram; belongs to its creator).
// ap    = Acropedia skill id (page under ACROPEDIA_BASE).
// ap ids also link a flow to its entry in the Acropedia library (src/acropedia.js).
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
  f("side-plank", "Side plank", "Plancha lateral", "lbase", 2, "acroyogasideplank"),
  f("free-bird", "Free bird (no hands)", "Pájaro libre (sin manos)", "lbase", 2, "freebird"),
  f("straddle-throne", "Straddle throne", "Trono abierto", "lbase", 2, "straddlethrone"),
  f("thinker", "Thinker", "Pensador", "lbase", 2, "acroyogathinker"),
  f("pigeon", "Pigeon", "Paloma", "lbase", 3, "acroyogapigeon"),
  f("croc", "Croc", "Cocodrilo", "lbase", 3, "acrocroc"),
  f("bow-and-arrow", "Bow and arrow", "Arco y flecha", "lbase", 3, "acroyoga"),
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
  f("shoulder-sit", "Shoulder sit", "Sentado en hombros", "standing", 1, "shouldersit"),
  f("climb-to-shoulders", "Climb to shoulders", "Subida a hombros", "standing", 2, "acrobalance"),
  f("cupie", "Cupie (one-hand stand)", "Cupie (de pie en una mano)", "standing", 4, "acrocupie"),
  // Trios and groups
  f("trio-back-bird", "Trio back bird (two flyers)", "Pájaro invertido en trío (dos flyers)", "trio", 2, "acroyogatrio"),
  f("trio-down-dog", "Trio down dog with hanging flyer", "Perro bocabajo en trío con flyer colgado", "trio", 2, "acroyogatrio"),
  f("pyramid", "Pyramid", "Pirámide", "trio", 3, "acropyramid"),
  f("trio-double-bird", "Double-base front bird (trio)", "Pájaro con dos bases (trío)", "trio", 2, "acroyogatrio")
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
  fl("plank-bird", "Plank to bird", "Plancha a pájaro", "transition", 1, ["plank", "front-bird"], "acroyogatransitions"),
  fl("bird-back-bird", "Bird to back bird", "Pájaro a pájaro invertido", "transition", 2, ["front-bird", "back-bird"], "acroyogatransitions"),
  fl("throne-candlestick", "Throne to candlestick", "Trono a vela", "transition", 2, ["throne", "candlestick"], "acroyogatransitions"),
  fl("whale-high-whale", "Whale to high flying whale", "Ballena a ballena voladora", "transition", 2, ["whale", "high-flying-whale"], "acroyogawhale"),
  fl("star-reverse-star", "Star to reverse star", "Estrella a estrella invertida", "transition", 3, ["star", "reverse-star"], "reversestar"),
  fl("shoulder-sit-two-high", "Shoulder sit to two-high", "Sentado en hombros a two-high", "transition", 4, ["shoulder-sit", "two-high"], "twohigh"),
  // Flows
  fl("first-flight", "First flight", "Primer vuelo", "flow", 1, ["plank", "front-bird", "back-bird", "folded-leaf"], "acroyogabeginner"),
  fl("therapeutic-flow", "Therapeutic flow", "Secuencia terapéutica", "flow", 1, ["folded-leaf", "floating-paschimo", "straddle-bat", "hangle-dangle"], "therapeuticflying"),
  fl("throne-family", "Throne family", "Familia del trono", "flow", 2, ["front-bird", "throne", "reverse-throne", "chair"], "acroyogathrone"),
  fl("bird-family", "Bird family", "Familia del pájaro", "flow", 2, ["front-bird", "free-bird", "side-star", "back-bird"], "frontbird"),
  fl("star-family", "Star family", "Familia de la estrella", "flow", 3, ["candlestick", "star", "side-star", "reverse-star"], "acroyogastar"),
  fl("standing-warmup", "Standing warm-up", "Calentamiento de pie", "flow", 2, ["shoulder-sit", "thigh-stand", "camel"], "standingacro"),
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
  fl("high-ninja-star", "High ninja star (standing)", "Estrella ninja alta (de pie)", "washing", 4, [], "ninjastar", { video: "https://www.youtube.com/watch?v=05qGlrjsyww", ap: "high-ninja-star" }),
  // More washing machines from Acropedia (heads of the larger families and well-known classics)
  fl("perfect-storms", "Perfect storms", "Tormentas perfectas", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/mp6Nhe-33gI", ap: "perfect-storms" }),
  fl("doublefly-flow", "Doublefly flow", "Doublefly flow", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/9pKJY-s69es", ap: "doublefly-flow" }),
  fl("swimming-mermaid", "Swimming mermaid", "Sirena nadadora", "washing", 3, [], "acroyogamermaid", { video: "https://www.youtube.com/watch?v=5sVWIPe8F0A", ap: "swimming-mermaid" }),
  fl("topsy-turvy", "Topsy turvy", "Patas arriba", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=qCNN1vOeRS0", ap: "topsy-turvy-3" }),
  fl("russian-braid", "Russian braid", "Trenza rusa", "washing", 4, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=ZyFqoI31NGs", ap: "russian-braid" }),
  fl("temple-spin", "Temple spin", "Giro del templo", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=0FIZ1D-dYdk", ap: "temple-spin" }),
  fl("spider-rolls", "Spider rolls", "Rodadas araña", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/mxQWgMl8ZiM", ap: "spider-rolls" }),
  fl("piston", "Piston", "Pistón", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=nJ-LtE0NOgw", ap: "piston" }),
  fl("star-abaho", "Star Abaho", "Star Abaho", "washing", 3, [], "acroyogastar", { video: "https://youtu.be/le6QqNudhM4", ap: "star-abaho-1" }),
  fl("twisted-tornado", "Twisted tornado", "Tornado retorcido", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/JaMDksmZ5m8", ap: "twisted-tornado" }),
  fl("merry-go-rounds", "Merry-go-rounds", "Tiovivo", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/8ixufOp2P_M", ap: "merry-go-rounds" }),
  fl("crochet-hooks-inside-star", "Crochet hooks (inside star)", "Ganchillo (estrella interior)", "washing", 3, [], "acroyogastar", { video: "https://youtu.be/rQjmXBWMTwI", ap: "crochet-hooks-inside-star" }),
  fl("moonies-back", "Moonies (back)", "Moonies (de espalda)", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/fBU7BXpmzo8", ap: "moonies-back" }),
  fl("musical-chairs", "Musical chairs", "Sillas musicales", "washing", 3, [], "acroyogathrone", { video: "https://www.youtube.com/watch?v=95Z0FAPIZGg", ap: "musical-chairs" }),
  fl("propeller", "Propeller", "Hélice", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=ZOzawRVdj1w", ap: "propeller" }),
  fl("spiral", "Spiral", "Espiral", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=ZIyI555tGfo", ap: "spiral" }),
  fl("angry-birds", "Angry birds", "Angry birds", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=hwiKouIMWhk", ap: "angry-birds" }),
  fl("carousel", "Carousel", "Carrusel", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=0zbGnUwWu8I", ap: "carousel" }),
  fl("leap-frog", "Leap frog", "Pídola", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/fcUkTS63rcw", ap: "leap-frog" }),
  fl("somersault", "Somersault", "Voltereta", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=IhqUPYA2J7k", ap: "somersault" }),
  fl("eagle-roll", "Eagle roll", "Rodada del águila", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=q5YJBZZhoGo", ap: "eagle-roll" }),
  fl("music-box", "Music box", "Caja de música", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=6e9BwNVxSzg", ap: "music-box" }),
  fl("whip-prep", "Whip prep", "Preparación del látigo", "washing", 3, [], "acroyogawhip", { video: "https://www.youtube.com/watch?v=whC19SdcUvg", ap: "whip-prep" }),
  fl("popping-barrel-rolls", "Popping barrel rolls", "Barriles con pop", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/6uRJVxmhL8Y", ap: "popping-barrel-rolls" }),
  fl("swimming-side-stars", "Swimming side stars", "Estrellas laterales nadando", "washing", 3, [], "sidestar", { video: "https://youtu.be/Ev1-ItnkU9M", ap: "swimming-side-stars" }),
  fl("starfish-roll", "Starfish roll", "Rodada estrella de mar", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=alAsPIBq2qM", ap: "starfish-roll" }),
  fl("rotisseries", "Rotisseries", "Rostizador", "washing", 3, [], "acroyogawashingmachine", { video: "https://youtu.be/vPTh_dUi8VE", ap: "rotisseries" }),
  fl("pizza-flipper", "Pizza flipper", "Volteador de pizza", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=y4_8Fcc-WAI", ap: "pizza-flipper" }),
  fl("ninja-copter", "Ninja copter", "Ninja copter", "washing", 3, [], "acroyogahelicopter", { video: "https://youtu.be/E8mhA3IWJHM", ap: "ninja-copter" }),
  fl("shoulderang", "Shoulderang", "Shoulderang", "washing", 4, [], "acroyogawashingmachine", { video: "https://youtu.be/wRuzYvVf1JI", ap: "shoulderang" }),
  fl("waltz", "Waltz", "Vals", "washing", 3, [], "acroyogawashingmachine", { video: "https://www.youtube.com/watch?v=2bG9JV9Dwzg", ap: "waltz" })
];

export const SEED = [...FIGURES, ...FLOWS];

// Basque (euskara) names. Entries without one show the English name (most washing machines keep their
// original name in every language).
const EU = {
  "plank": "Ohola", "back-plank": "Alderantzizko ohola", "front-bird": "Txoria", "back-bird": "Alderantzizko txoria",
  "throne": "Tronua", "chair": "Aulkia", "secretary": "Idazkaria", "reverse-throne": "Alderantzizko tronua",
  "tuck-sit": "Tuck sit / L-sit", "whale": "Balea", "high-flying-whale": "Balea hegalaria", "bow": "Arkua",
  "candlestick": "Kandela", "star": "Izarra", "side-star": "Alboko izarra", "square-box": "Kutxa karratua",
  "reverse-star": "Alderantzizko izarra", "vishnus-couch": "Vishnuren sofa", "mermaid": "Sirena",
  "free-shoulder-stand": "Sorbalden gaineko oreka librea", "foot-to-hand": "Oina eskura",
  "reverse-foot-to-hand": "Alderantzizko oina eskura", "handstand-on-feet": "Esku-oreka oinetan",
  "bicep-stand": "Esku-oreka bizepsetan", "hand-to-hand": "Eskuz esku (L-base)",
  "reverse-hand-to-hand": "Alderantzizko eskuz esku", "side-plank": "Alboko ohola", "free-bird": "Txori librea (eskurik gabe)",
  "straddle-throne": "Tronu irekia", "thinker": "Pentsalaria", "pigeon": "Usoa", "croc": "Krokodiloa",
  "bow-and-arrow": "Arkua eta gezia", "folded-leaf": "Hosto tolestua", "floating-paschimo": "Paschimottanasana flotatzailea",
  "hangle-dangle": "Hangle dangle", "backbend": "Atzera-kurba lagundua", "super-yogi": "Super yogi", "straddle-bat": "Saguzarra",
  "thigh-stand": "Izterren gainean zutik", "camel": "Gamelua", "bird-on-shoulders": "Txoria sorbaldetan",
  "handstand-on-thighs": "Esku-oreka izterretan", "flag": "Bandera", "two-high": "Sorbaldetan zutik (two-high)",
  "standing-f2h": "Oina eskura zutik", "standing-reverse-f2h": "Alderantzizko oina eskura zutik",
  "handstand-on-shoulders": "Esku-oreka sorbaldetan", "standing-h2h": "Eskuz esku zutik", "shoulder-sit": "Sorbaldetan eserita",
  "climb-to-shoulders": "Sorbaldetara igoera", "cupie": "Cupie (esku bakarrean zutik)",
  "trio-back-bird": "Alderantzizko txoria hirukoan (bi flyer)", "trio-down-dog": "Txakurra behera hirukoan, flyer zintzilik",
  "pyramid": "Piramidea", "trio-double-bird": "Bi baseko txoria (hirukoa)",
  "bird-throne": "Txoritik tronura", "secretary-throne": "Idazkaritik tronura", "bird-side-star-bird": "Txoria – alboko izarra – txoria",
  "candlestick-star": "Kandelatik izarrera", "reverse-star-throne": "Alderantzizko izarretik tronura",
  "secretary-f2h": "Idazkaritik oina eskura", "back-plank-f2h": "Alderantzizko oholatik oina eskura",
  "bird-reverse-h2h": "Txoritik alderantzizko eskuz eskura", "thigh-stand-h2h": "Izterretatik eskuz eskura (zutik)",
  "plank-bird": "Oholatik txorira", "bird-back-bird": "Txoritik alderantzizko txorira", "throne-candlestick": "Tronutik kandelara",
  "whale-high-whale": "Baleatik balea hegalarira", "star-reverse-star": "Izarretik alderantzizko izarrera",
  "shoulder-sit-two-high": "Sorbaldetan eseritik two-high-ra", "first-flight": "Lehen hegaldia", "therapeutic-flow": "Sekuentzia terapeutikoa",
  "throne-family": "Tronuaren familia", "bird-family": "Txoriaren familia", "star-family": "Izarraren familia",
  "standing-warmup": "Zutik beroketa", "helicopter": "Helikopteroa", "ninja-star": "Ninja izarra", "catherine-wheel": "Katalinaren gurpila",
  "barrel-roll": "Upela", "corkscrew": "Kortxo-kentzailea", "two-step": "2 urrats", "four-step": "4 urrats",
  "ballerina": "Balerina", "carousel": "Karrusela", "spiral": "Espirala", "propeller": "Helizea", "waltz": "Valsa"
};
for (const it of SEED) if (EU[it.id]) it.name.eu = EU[it.id];
