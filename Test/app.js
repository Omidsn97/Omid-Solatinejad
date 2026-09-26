/**
 * English Profile — Assessment Engine
 * -----------------------------------------------------------------------
 * Fully client-side. No backend, no accounts, nothing leaves the browser.
 * Reuses the host site's CSS custom properties (--bg, --ink, --accent, etc.)
 * so the assessment inherits the site's light/dark theme automatically.
 */
(function () {
  "use strict";

  const TESTS = ENGLISH_PROFILE_TESTS; // from questions.js
  const TEST_IDS = Object.keys(TESTS); // ["A","B","C","D","E"]
  const STORAGE_KEY_LAST_TEST = "ep-last-test";
  const STORAGE_KEY_THEME = "omid-theme"; // shared with the main site

  const CONSTRUCT_ORDER = ["grammar", "vocabulary", "comprehension", "functional", "naturalness"];
  const CONSTRUCT_META = {
    grammar:        { icon: "🧠", fa: "دستور زبان",              en: "Grammar" },
    vocabulary:     { icon: "🧩", fa: "واژگان",                   en: "Vocabulary" },
    comprehension:  { icon: "👂", fa: "درک مطلب",                en: "Comprehension" },
    functional:     { icon: "💬", fa: "ارتباط کاربردی",           en: "Functional Communication" },
    naturalness:    { icon: "🎯", fa: "طبیعی‌بودن زبان",          en: "Naturalness" },
  };

  // -------------------------------------------------------------------
  // State
  // -------------------------------------------------------------------
  const state = {
    screen: "intro",       // intro | instructions | test | results
    testId: null,
    questions: [],         // flattened 30-question array for the chosen test
    current: 0,            // index of current question
    answers: {},           // { questionId: selectedOptionIndex }
    hasStarted: false,
  };

  // -------------------------------------------------------------------
  // Test selection — avoid immediate repeat via localStorage
  // -------------------------------------------------------------------
  function pickTestId() {
    let last = null;
    try { last = localStorage.getItem(STORAGE_KEY_LAST_TEST); } catch (e) {}
    let pool = TEST_IDS.filter((id) => id !== last);
    if (pool.length === 0) pool = TEST_IDS.slice();
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    try { localStorage.setItem(STORAGE_KEY_LAST_TEST, chosen); } catch (e) {}
    return chosen;
  }

  // -------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------
  function computeConstructScores() {
    const raw = {};
    CONSTRUCT_ORDER.forEach((c) => (raw[c] = 0));

    state.questions.forEach((q) => {
      const chosen = state.answers[q.id];
      if (chosen === q.correctAnswer) raw[q.construct] += 1;
    });

    // Each construct has exactly 6 questions -> 0-6 raw points.
    // Normalize to a 0-5 profile score: profileScore = (raw / 6) * 5
    const profile = {};
    CONSTRUCT_ORDER.forEach((c) => {
      profile[c] = Math.round(((raw[c] / 6) * 5) * 100) / 100;
    });
    return { raw, profile };
  }

  function bandForScore(score) {
    // 0-5 scale. Thresholds chosen so "Strong" requires clearly
    // above-average performance, "Needs Attention" flags a construct
    // where fewer than half the items were answered correctly.
    if (score >= 4.0) return "strong";
    if (score >= 2.5) return "developing";
    return "needsAttention";
  }

  const BAND_LABEL = {
    strong:        { fa: "قوی",            en: "Strong" },
    developing:    { fa: "در حال رشد",     en: "Developing" },
    needsAttention:{ fa: "نیازمند توجه",   en: "Needs Attention" },
  };

  // Persian, score-dependent explanation for each construct + band
  const CONSTRUCT_EXPLANATIONS = {
    grammar: {
      strong: "شما ساختارهای دستوری متنوعی از سطح مقدماتی تا پیشرفته را با دقت بالایی تشخیص می‌دهید و در به‌کارگیری زمان‌ها، جملات شرطی و جملات مرکب مشکل چندانی ندارید.",
      developing: "پایه دستوری شما قابل قبول است، اما در برخی ساختارهای پیچیده‌تر مانند جملات شرطی، مجهول یا نقل قول غیرمستقیم هنوز جای تقویت وجود دارد.",
      needsAttention: "در حال حاضر ساختارهای پایه دستوری برای شما چالش‌برانگیز است؛ مرور منظم زمان‌های اصلی و ساختارهای جمله می‌تواند تأثیر زیادی داشته باشد.",
    },
    vocabulary: {
      strong: "دامنه واژگانی شما گسترده است و در انتخاب کلمه مناسب با توجه به بافت جمله، از جمله ترکیب‌های رایج (collocations)، عملکرد خوبی دارید.",
      developing: "دایره واژگانی شما در سطح قابل‌قبولی قرار دارد، اما در تشخیص ترکیب‌های دقیق‌تر کلمات و واژگان تخصصی‌تر می‌توانید بیشتر تمرین کنید.",
      needsAttention: "گسترش دامنه واژگانی، به‌ویژه در سطح روزمره، در حال حاضر می‌تواند بیشترین تأثیر را در بهبود عملکرد کلی شما داشته باشد.",
    },
    comprehension: {
      strong: "شما در درک اطلاعات صریح و ضمنی متن‌های انگلیسی، از جمله استنباط معنا از بافت، عملکرد قوی و قابل اتکایی نشان داده‌اید.",
      developing: "درک مطلب کلی شما خوب است، اما در استخراج معنای ضمنی یا نتیجه‌گیری از جزئیات غیرمستقیم متن هنوز جای پیشرفت وجود دارد.",
      needsAttention: "تمرکز بر تمرین خواندن متن‌های کوتاه انگلیسی و پرسیدن سؤالات «چرا» و «چگونه» درباره آن‌ها می‌تواند به تقویت این مهارت کمک کند.",
    },
    functional: {
      strong: "شما در انتخاب پاسخ مناسب برای موقعیت‌های واقعی ارتباطی، مانند درخواست، توضیح یا مذاکره، عملکرد طبیعی و مناسبی از خود نشان داده‌اید.",
      developing: "در بیشتر موقعیت‌های ارتباطی روزمره عملکرد قابل‌قبولی دارید، اما در موقعیت‌های حساس‌تر یا حرفه‌ای‌تر هنوز جای تمرین بیشتر وجود دارد.",
      needsAttention: "تمرین مکالمات واقعی و موقعیت‌محور، به‌ویژه در قالب نقش‌آفرینی (role-play)، می‌تواند به بهبود محسوس این مهارت کمک کند.",
    },
    naturalness: {
      strong: "شما نه‌تنها زبان انگلیسی صحیح، بلکه زبان طبیعی و رایج در میان گویشوران بومی را نیز به‌خوبی تشخیص می‌دهید؛ این توانایی معمولاً حاصل قرارگیری قابل‌توجه در معرض زبان طبیعی است.",
      developing: "شما می‌توانید جملات درست از نظر دستوری بسازید، اما گاهی تفاوت میان جمله «قابل‌قبول» و جمله «طبیعی و رایج» برایتان چالش‌برانگیز است.",
      needsAttention: "این حوزه معمولاً آخرین مهارتی است که در یادگیری زبان دوم شکل می‌گیرد؛ گوش‌دادن و خواندن گسترده محتوای طبیعی انگلیسی (نه صرفاً آموزشی) بیشترین کمک را می‌کند.",
    },
  };

  // -------------------------------------------------------------------
  // Overall CEFR mapping
  // -------------------------------------------------------------------
  // Overall = average of the five 0-5 construct profile scores.
  // Thresholds are set at even intervals across the 0-5 range (0-1, 1-2,
  // 2-3, 3-4, 4-5), nudged slightly so that a genuinely mixed profile
  // (mostly "Developing" constructs) lands in the middle band (B1)
  // rather than being pulled down by a single weak construct.
  const CEFR_LEVELS = [
    { code: "A1", en: "Elementary",        fa: "مقدماتی",         min: 0 },
    { code: "A2", en: "Pre-Intermediate",  fa: "پیش‌متوسط",       min: 1.2 },
    { code: "B1", en: "Intermediate",      fa: "متوسط",           min: 2.2 },
    { code: "B2", en: "Upper-Intermediate",fa: "فوق متوسط",       min: 3.3 },
    { code: "C1", en: "Advanced",          fa: "پیشرفته",         min: 4.2 },
  ];

  function overallLevel(overallScore) {
    let level = CEFR_LEVELS[0];
    for (const l of CEFR_LEVELS) {
      if (overallScore >= l.min) level = l;
    }
    return level;
  }

  const CEFR_DESCRIPTIONS = {
    A1: "نتیجه شما نشان می‌دهد که در حال حاضر در ابتدای مسیر یادگیری زبان انگلیسی هستید. شما با برخی کلمات و ساختارهای پایه آشنایی دارید، اما درک و استفاده روان از زبان در موقعیت‌های واقعی هنوز نیازمند تمرین منظم و پیوسته است. این نقطه شروع کاملاً طبیعی است و با برنامه‌ریزی درست، پیشرفت قابل‌توجهی در کوتاه‌مدت ممکن است.",
    A2: "عملکرد شما نشان می‌دهد که پایه‌های اولیه زبان انگلیسی را دارید و می‌توانید در موقعیت‌های ساده و آشنا، مانند مکالمات روزمره کوتاه، منظور خود را برسانید. برای رسیدن به سطح متوسط، تمرکز بر گسترش واژگان و تثبیت ساختارهای دستوری پرکاربرد توصیه می‌شود.",
    B1: "شما در سطح متوسطی از زبان انگلیسی قرار دارید و می‌توانید در بیشتر موقعیت‌های روزمره، تحصیلی یا کاری ساده، منظور خود را به‌درستی منتقل کنید. برای رسیدن به سطوح بالاتر، تمرکز بر دقت در ساختارهای پیچیده‌تر و افزایش طبیعی‌بودن زبان می‌تواند مؤثر باشد.",
    B2: "نتیجه شما نشان‌دهنده تسلط قابل‌توجهی بر زبان انگلیسی است. شما می‌توانید ایده‌های نسبتاً پیچیده را به‌خوبی بیان کنید و متون طولانی‌تر را با درک خوبی دنبال کنید. برای رسیدن به سطح پیشرفته، ظرافت‌های زبانی و طبیعی‌بودن بیان می‌تواند تمرکز بعدی شما باشد.",
    C1: "عملکرد شما نشان‌دهنده تسلط پیشرفته‌ای بر زبان انگلیسی است. شما در بیشتر ابعاد زبانی، از جمله دستور، واژگان و درک مطلب، عملکرد قوی و باثباتی داشته‌اید. تداوم قرارگیری در معرض محتوای طبیعی و پیچیده انگلیسی می‌تواند این تسلط را حتی عمیق‌تر کند.",
  };

  // -------------------------------------------------------------------
  // Deterministic pattern synthesis (rule-based, no AI)
  // -------------------------------------------------------------------
  function synthesizePattern(bands) {
    const values = CONSTRUCT_ORDER.map((c) => bands[c]);
    const countOf = (b) => values.filter((v) => v === b).length;
    const isStrong = (c) => bands[c] === "strong";
    const isWeak = (c) => bands[c] === "needsAttention";

    if (countOf("strong") === 5) {
      return "پروفایل شما در همه پنج بُعد ارزیابی‌شده در سطح قوی قرار دارد. این الگو نشان می‌دهد که مهارت زبانی شما نسبتاً یکپارچه و متوازن رشد کرده است، نه اینکه فقط در یک حوزه خاص قوی باشید.";
    }
    if (countOf("needsAttention") >= 4) {
      return "در حال حاضر، بیشتر ابعاد ارزیابی‌شده نیازمند تمرین بیشتری هستند. این وضعیت طبیعی برای کسی است که در ابتدای مسیر یادگیری قرار دارد و بهترین راهکار، تمرکز بر پایه‌های زبان به‌صورت منظم و گام‌به‌گام است.";
    }
    if (isStrong("grammar") && isWeak("naturalness")) {
      return "الگوی عملکرد شما نشان می‌دهد که دستور زبان انگلیسی را به‌خوبی آموخته‌اید، اما در تشخیص زبان طبیعی و رایج در مکالمات واقعی هنوز فاصله وجود دارد. این الگو معمولاً در افرادی دیده می‌شود که زبان را عمدتاً از طریق آموزش رسمی یاد گرفته‌اند و اکنون نیاز به قرارگیری بیشتر در معرض زبان طبیعی (فیلم، پادکست، مکالمه واقعی) دارند.";
    }
    if (isStrong("comprehension") && isWeak("functional")) {
      return "شما در درک مطلب انگلیسی عملکرد قوی‌ای دارید، اما در تولید پاسخ‌های ارتباطی مناسب برای موقعیت‌های واقعی هنوز جای پیشرفت وجود دارد. این الگو رایج است در افرادی که بیشتر با خواندن زبان را تقویت کرده‌اند تا با مکالمه واقعی.";
    }
    if (isStrong("vocabulary") && isWeak("grammar")) {
      return "دامنه واژگانی شما نسبت به دقت دستوری‌تان جلوتر است. این الگو نشان می‌دهد که می‌توانید منظور خود را با کلمات مناسب برسانید، اما تثبیت ساختارهای دستوری می‌تواند دقت و دقت نگارش شما را به‌طور محسوسی بهبود دهد.";
    }
    if (countOf("strong") + countOf("developing") === 5 && countOf("needsAttention") === 0) {
      return "پروفایل شما نسبتاً متوازن است؛ هیچ‌کدام از ابعاد در سطح ضعیف قرار ندارند و برخی از آن‌ها از بقیه کمی جلوترند. این تعادل نشان‌دهنده پایه محکمی برای پیشرفت هدفمند در حوزه‌های خاص‌تر است.";
    }
    if (countOf("developing") >= 4) {
      return "بیشتر ابعاد زبانی شما در مرحله رشد قرار دارند؛ یعنی پایه‌های لازم شکل گرفته، اما هنوز به سطح تثبیت‌شده نرسیده‌اند. تمرین منظم و هدفمند در این مرحله معمولاً نتیجه سریع و محسوسی به همراه دارد.";
    }
    return "عملکرد شما در ابعاد مختلف زبانی متفاوت است؛ برخی حوزه‌ها قوی‌تر و برخی نیازمند تمرین بیشتر هستند. تمرکز بر حوزه‌های ضعیف‌تر، در کنار حفظ نقاط قوت فعلی، مسیر مؤثری برای پیشرفت شما خواهد بود.";
  }

  // -------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------
  const root = document.getElementById("ep-root");

  function render() {
    if (state.screen === "intro") return renderIntro();
    if (state.screen === "instructions") return renderInstructions();
    if (state.screen === "test") return renderTest();
    if (state.screen === "results") return renderResults();
  }

  function renderIntro() {
    root.innerHTML = `
      <div class="ep-screen ep-fa" dir="rtl">
        <h1 class="ep-title">پروفایل زبان انگلیسی شما</h1>
        <p class="ep-lede">
          این یک آزمون ارزیابی زبان انگلیسی است که چند بُعد مهم از مهارت زبانی شما — از جمله دستور زبان،
          واژگان، درک مطلب، ارتباط کاربردی و طبیعی‌بودن زبان — را بررسی می‌کند و در پایان، یک
          <strong>پروفایل زبانی نشان‌دهنده</strong> از عملکرد شما ارائه می‌دهد.
        </p>
        <p class="ep-lede">
          نتیجه شامل یک برآورد کلی از سطح زبانی شما (بر اساس چارچوب مرجع اروپایی زبان، CEFR) و همچنین
          عملکرد جداگانه در هر یک از پنج بُعد یادشده خواهد بود.
        </p>
        <p class="ep-lede">
          <strong>این آزمون یک گواهی رسمی یا بین‌المللی نیست</strong> و جایگزین آزمون‌های معتبری مانند
          آیلتس، تافل یا کمبریج نمی‌شود. همچنین به‌دلیل ماهیت آزمون، توانایی <strong>مکالمه</strong> شما
          به‌صورت مستقیم و دقیق ارزیابی نمی‌شود.
        </p>
        <div class="ep-cta-row">
          <button class="ep-btn ep-btn-primary" id="ep-to-instructions">ادامه</button>
        </div>
      </div>
    `;
    document.getElementById("ep-to-instructions").addEventListener("click", () => {
      state.screen = "instructions";
      render();
    });
  }

  function renderInstructions() {
    root.innerHTML = `
      <div class="ep-screen ep-fa" dir="rtl">
        <h2 class="ep-title ep-title-sm">آزمون چگونه انجام می‌شود؟</h2>

        <div class="ep-info-grid">
          <div class="ep-info-card">
            <div class="ep-info-label">تعداد سؤالات</div>
            <div class="ep-info-value">۳۰ سؤال</div>
          </div>
          <div class="ep-info-card">
            <div class="ep-info-label">زمان تقریبی</div>
            <div class="ep-info-value">۱۵ تا ۲۰ دقیقه</div>
          </div>
        </div>

        <p class="ep-lede">آزمون شامل پنج بخش است، هر بخش با ۶ سؤال:</p>
        <ul class="ep-construct-list">
          ${CONSTRUCT_ORDER.map((c) => `<li>${CONSTRUCT_META[c].icon} ${CONSTRUCT_META[c].fa} (${CONSTRUCT_META[c].en})</li>`).join("")}
        </ul>

        <ul class="ep-notes">
          <li>شما یکی از چند نسخه مختلف آزمون را به‌صورت تصادفی دریافت می‌کنید.</li>
          <li>هر سؤال چهار گزینه دارد و معمولاً فقط یک پاسخ درست است.</li>
          <li>پاسخ‌ها به‌صورت خودکار و در همان لحظه بررسی می‌شوند.</li>
          <li>در پایان، هم نتیجه کلی و هم عملکرد شما در هر بخش نمایش داده می‌شود.</li>
          <li>برای اینکه نتیجه واقعاً نشان‌دهنده سطح شما باشد، لطفاً بدون استفاده از مترجم یا کمک بیرونی پاسخ دهید.</li>
        </ul>

        <div class="ep-cta-row">
          <button class="ep-btn ep-btn-primary" id="ep-start-test">شروع آزمون</button>
        </div>
      </div>
    `;
    document.getElementById("ep-start-test").addEventListener("click", startTest);
  }

  function startTest() {
    state.testId = pickTestId();
    state.questions = TESTS[state.testId];
    state.current = 0;
    state.answers = {};
    state.hasStarted = true;
    state.screen = "test";
    window.addEventListener("beforeunload", beforeUnloadHandler);
    render();
  }

  function beforeUnloadHandler(e) {
    if (state.screen === "test" && Object.keys(state.answers).length > 0) {
      e.preventDefault();
      e.returnValue = "";
    }
  }

  function renderTest() {
    const q = state.questions[state.current];
    const total = state.questions.length;
    const answered = state.answers[q.id];
    const progressPct = Math.round(((state.current) / total) * 100);
    const isLast = state.current === total - 1;

    root.innerHTML = `
      <div class="ep-screen ep-en" dir="ltr">
        <div class="ep-progress-wrap">
          <div class="ep-progress-bar"><div class="ep-progress-fill" style="width:${progressPct}%"></div></div>
          <div class="ep-progress-label">Question ${state.current + 1} of ${total}</div>
        </div>

        <div class="ep-construct-tag">${CONSTRUCT_META[q.construct].icon} ${CONSTRUCT_META[q.construct].en}</div>

        <p class="ep-question">${escapeHtml(q.question).replace(/\n/g, "<br>")}</p>

        <div class="ep-options" role="radiogroup">
          ${q.options.map((opt, i) => `
            <button type="button" class="ep-option${answered === i ? " ep-option-selected" : ""}" data-index="${i}">
              <span class="ep-option-letter">${String.fromCharCode(65 + i)}</span>
              <span class="ep-option-text">${escapeHtml(opt)}</span>
            </button>
          `).join("")}
        </div>

        <div class="ep-nav-row">
          <button class="ep-btn ep-btn-ghost" id="ep-prev" ${state.current === 0 ? "disabled" : ""}>Previous</button>
          <button class="ep-btn ep-btn-primary" id="ep-next" ${answered === undefined ? "disabled" : ""}>
            ${isLast ? "Finish Test" : "Next"}
          </button>
        </div>
      </div>
    `;

    root.querySelectorAll(".ep-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        state.answers[q.id] = idx;
        render();
      });
    });
    document.getElementById("ep-prev").addEventListener("click", () => {
      if (state.current > 0) { state.current -= 1; render(); }
    });
    document.getElementById("ep-next").addEventListener("click", () => {
      if (isLast) {
        finishTest();
      } else {
        state.current += 1;
        render();
      }
    });
  }

  function finishTest() {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    state.screen = "results";
    render();
  }

  function renderResults() {
    const { profile } = computeConstructScores();
    const overall = CONSTRUCT_ORDER.reduce((sum, c) => sum + profile[c], 0) / CONSTRUCT_ORDER.length;
    const overallRounded = Math.round(overall * 100) / 100;
    const level = overallLevel(overallRounded);
    const bands = {};
    CONSTRUCT_ORDER.forEach((c) => (bands[c] = bandForScore(profile[c])));
    const synthesis = synthesizePattern(bands);

    root.innerHTML = `
      <div class="ep-screen ep-fa" dir="rtl">
        <h2 class="ep-title ep-title-sm">نتیجه ارزیابی زبان انگلیسی شما</h2>

        <div class="ep-result-hero">
          <div class="ep-result-code">${level.code}</div>
          <div class="ep-result-label">
            <span class="ep-result-en">${level.en}</span>
            <span class="ep-result-fa">${level.fa}</span>
          </div>
        </div>

        <p class="ep-lede">${CEFR_DESCRIPTIONS[level.code]}</p>

        <h3 class="ep-subheading">عملکرد شما در هر بخش</h3>
        <div class="ep-construct-cards">
          ${CONSTRUCT_ORDER.map((c) => `
            <div class="ep-construct-card">
              <div class="ep-construct-card-head">
                <span>${CONSTRUCT_META[c].icon} ${CONSTRUCT_META[c].fa}</span>
                <span class="ep-construct-score">${profile[c].toFixed(1)} / 5</span>
              </div>
              <div class="ep-construct-band ep-band-${bands[c]}">${BAND_LABEL[bands[c]].fa}</div>
              <p class="ep-construct-explain">${CONSTRUCT_EXPLANATIONS[c][bands[c]]}</p>
            </div>
          `).join("")}
        </div>

        <h3 class="ep-subheading">برداشت کلی از عملکرد شما</h3>
        <p class="ep-lede">${synthesis}</p>

        <div class="ep-cta-card">
          <p class="ep-cta-question">حالا یک سؤال مهم‌تر:<br>در یک گفت‌وگوی واقعی، چقدر می‌توانید انگلیسی صحبت کنید؟</p>
          <p class="ep-lede">
            این آزمون چند بُعد از زبان شما را از طریق سؤالات کنترل‌شده بررسی کرد، اما توانایی مکالمه واقعی —
            شامل تولید بی‌درنگ جمله، تلفظ، روانی کلام و بازیابی سریع واژگان در لحظه — را نمی‌توان تنها با این
            آزمون به‌طور دقیق سنجید.
          </p>
          <p class="ep-lede">برای شرکت در ارزیابی رایگان مکالمه:</p>
          <p class="ep-cta-steps">«از این صفحه نتیجه اسکرین‌شات بگیرید و آن را در تلگرام برای من ارسال کنید و بگویید که آزمون پروفایل زبان انگلیسی را کامل کرده‌اید و درخواست ارزیابی رایگان مکالمه دارید.»</p>
          <a class="ep-btn ep-btn-primary ep-cta-btn" href="https://t.me/OmidJournals" target="_blank" rel="noopener noreferrer">
            درخواست ارزیابی رایگان مکالمه
          </a>
        </div>

        <div class="ep-cta-row">
          <button class="ep-btn ep-btn-ghost" id="ep-retake">شروع دوباره آزمون</button>
        </div>
      </div>
    `;

    document.getElementById("ep-retake").addEventListener("click", () => {
      state.screen = "intro";
      state.hasStarted = false;
      render();
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // -------------------------------------------------------------------
  // Theme: follow the host site's saved preference / system preference
  // -------------------------------------------------------------------
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY_THEME); } catch (e) {}
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  })();

  render();
})();
