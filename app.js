(() => {
  const STORAGE_KEY = "spellbound_state_v1";

  const defaultState = {
    profile: { name: "", avatar: "🙂" },
    settings: { difficulty: "all", autoRead: false, sound: true, practiceMode: "listen", voiceValue: "", category: "general" },
    stats: {
      totalSeen: 0,
      totalCorrect: 0,
      bestStreak: 0,
      currentStreak: 0,
      mastered: {},      // word -> correct-in-a-row count
      misses: {},        // word -> miss count
      days: {}           // "YYYY-MM-DD" -> { seen, correct }
    }
  };

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultState);
      const parsed = JSON.parse(raw);
      return { ...structuredClone(defaultState), ...parsed,
        profile: { ...defaultState.profile, ...(parsed.profile || {}) },
        settings: { ...defaultState.settings, ...(parsed.settings || {}) },
        stats: { ...defaultState.stats, ...(parsed.stats || {}) }
      };
    } catch (e) {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  const state = loadState();
  let wordBank = [];
  let currentWord = null;
  let answered = false;

  const todayKey = () => new Date().toISOString().slice(0, 10);

  // ---------- Data loading (the "backend") ----------
  async function loadWords() {
    const category = state.settings.category || "general";
    try {
      const res = await fetch(`words-${category}.json`, { cache: "no-store" });
      const data = await res.json();
      wordBank = data.words || [];
    } catch (e) {
      wordBank = [];
      document.getElementById("hintText").textContent =
        `Couldn't load words-${category}.json. Make sure that file is in the repo.`;
    }
  }

  function filteredBank() {
    const d = state.settings.difficulty;
    if (d === "all") return wordBank;
    return wordBank.filter(w => w.level === d);
  }

  function pickWord() {
    const pool = filteredBank();
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function maskWord(word) {
    const letters = word.split("");
    const maskableIdx = letters.map((_, i) => i).filter(i => i !== 0 && i !== letters.length - 1);
    const numToMask = Math.max(1, Math.min(maskableIdx.length, Math.round(letters.length * 0.4)));
    const chosen = shuffle(maskableIdx).slice(0, numToMask);
    chosen.forEach(i => (letters[i] = "_"));
    return letters.join(" ");
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- Navigation ----------
  const screens = document.querySelectorAll(".screen");
  const tabs = document.querySelectorAll(".tab-btn");

  function showScreen(name) {
    screens.forEach(s => s.hidden = s.dataset.screen !== name);
    tabs.forEach(t => t.classList.toggle("active", t.dataset.target === name));
    if (name === "stats") renderStats();
    if (name === "settings") renderSettings();
  }
  tabs.forEach(t => t.addEventListener("click", () => showScreen(t.dataset.target)));

  // ---------- Practice ----------
  const optionsWrap = document.getElementById("optionsWrap");
  const typeArea = document.getElementById("typeArea");
  const typeInput = document.getElementById("typeInput");
  const checkBtn = document.getElementById("checkBtn");
  const feedbackEl = document.getElementById("feedback");
  const nextBtn = document.getElementById("nextBtn");
  const listenBtn = document.getElementById("listenBtn");
  const listenArea = document.getElementById("listenArea");
  const maskedArea = document.getElementById("maskedArea");
  const maskedWordEl = document.getElementById("maskedWord");
  const hintText = document.getElementById("hintText");
  const progressLabel = document.getElementById("progressLabel");
  const streakPill = document.getElementById("streakPill");
  const modeButtons = document.querySelectorAll(".mode-btn");
  const categoryButtons = document.querySelectorAll(".category-btn");

  modeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      state.settings.practiceMode = btn.dataset.mode;
      saveState();
      modeButtons.forEach(b => b.classList.toggle("active", b === btn));
      renderWord();
    });
  });

  categoryButtons.forEach(btn => {
    btn.addEventListener("click", async () => {
      if (btn.classList.contains("active")) return;
      state.settings.category = btn.dataset.category;
      saveState();
      categoryButtons.forEach(b => b.classList.toggle("active", b === btn));
      hintText.textContent = "Loading words...";
      optionsWrap.innerHTML = "";
      await loadWords();
      sessionSeen = 0;
      sessionCorrect = 0;
      updateSessionBar();
      renderWord();
    });
  });

  let sessionSeen = 0;
  let sessionCorrect = 0;

  function rvAvailable() {
    if (typeof responsiveVoice === "undefined" || typeof responsiveVoice.speak !== "function") return false;
    if (typeof responsiveVoice.voiceSupport === "function") return responsiveVoice.voiceSupport();
    return true;
  }

  function speak(text) {
    const value = state.settings.voiceValue || "";
    const [engine, id] = value.includes("::") ? value.split("::") : ["", value];

    if (engine === "rv" && rvAvailable()) {
      responsiveVoice.speak(text, id, { rate: 0.85 });
      return;
    }

    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    const voices = window.speechSynthesis.getVoices();
    const chosen = engine === "native" ? voices.find(v => v.voiceURI === id) : null;
    if (chosen) u.voice = chosen;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function renderWord() {
    currentWord = pickWord();
    answered = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "feedback";
    nextBtn.hidden = true;

    if (!currentWord) {
      optionsWrap.innerHTML = "";
      hintText.textContent = "No words match this difficulty. Try another one in Settings.";
      progressLabel.textContent = "—";
      return;
    }

    progressLabel.textContent = `Word ${sessionSeen + 1}`;

    const mode = state.settings.practiceMode || "listen";
    listenArea.hidden = mode !== "listen";
    maskedArea.hidden = mode !== "fill";
    typeArea.hidden = mode !== "listen";
    optionsWrap.hidden = mode === "listen";

    if (mode === "listen") {
      hintText.textContent = currentWord.hint || "Tap the speaker to hear the word.";
      typeInput.value = "";
      typeInput.className = "type-input";
      typeInput.disabled = false;
      checkBtn.disabled = false;
      optionsWrap.innerHTML = "";
      setTimeout(() => typeInput.focus(), 50);
      if (state.settings.autoRead) speak(currentWord.word);
      return;
    } else if (mode === "fill") {
      maskedWordEl.textContent = maskWord(currentWord.word);
      hintText.textContent = currentWord.hint || "Fill in the missing letters.";
    } else {
      hintText.textContent = currentWord.hint
        ? `${currentWord.hint} — which spelling is correct?`
        : "Which spelling is correct?";
    }

    const opts = shuffle(currentWord.options);
    optionsWrap.innerHTML = "";
    opts.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "opt-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => handleAnswer(opt, btn));
      optionsWrap.appendChild(btn);
    });

    if (state.settings.autoRead) speak(currentWord.word);
  }

  function handleTypedAnswer() {
    if (answered || !currentWord) return;
    answered = true;
    sessionSeen++;

    const typed = typeInput.value.trim();
    const isCorrect = typed.toLowerCase() === currentWord.word.toLowerCase();

    typeInput.disabled = true;
    checkBtn.disabled = true;
    typeInput.classList.add(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      sessionCorrect++;
      feedbackEl.textContent = "Nice — that's right.";
      feedbackEl.className = "feedback good";
    } else {
      feedbackEl.textContent = `Not quite. Correct spelling: ${currentWord.word}`;
      feedbackEl.className = "feedback bad";
    }

    recordAttempt(currentWord.word, isCorrect);
    updateSessionBar();
    nextBtn.hidden = false;
  }

  checkBtn.addEventListener("click", handleTypedAnswer);
  typeInput.addEventListener("keydown", e => {
    if (e.key === "Enter") handleTypedAnswer();
  });

  function handleAnswer(choice, btn) {
    if (answered) return;
    answered = true;
    sessionSeen++;
    const isCorrect = choice === currentWord.word;

    [...optionsWrap.children].forEach(b => {
      b.disabled = true;
      if (b.textContent === currentWord.word) b.classList.add("correct");
    });
    if (!isCorrect) btn.classList.add("wrong");

    if (isCorrect) {
      sessionCorrect++;
      feedbackEl.textContent = "Nice — that's right.";
      feedbackEl.className = "feedback good";
    } else {
      feedbackEl.textContent = `Not quite. Correct spelling: ${currentWord.word}`;
      feedbackEl.className = "feedback bad";
    }

    recordAttempt(currentWord.word, isCorrect);
    updateSessionBar();
    nextBtn.hidden = false;
  }

  function updateSessionBar() {
    document.getElementById("sessionCorrect").textContent = sessionCorrect;
    document.getElementById("sessionSeen").textContent = sessionSeen;
    document.getElementById("sessionAccuracy").textContent =
      sessionSeen ? Math.round((sessionCorrect / sessionSeen) * 100) + "%" : "—";
  }

  function recordAttempt(word, correct) {
    const s = state.stats;
    s.totalSeen++;
    if (correct) s.totalCorrect++;

    s.currentStreak = correct ? s.currentStreak + 1 : 0;
    s.bestStreak = Math.max(s.bestStreak, s.currentStreak);
    streakPill.textContent = `🔥 ${s.currentStreak}`;

    if (correct) {
      s.mastered[word] = (s.mastered[word] || 0) + 1;
    } else {
      s.mastered[word] = 0;
      s.misses[word] = (s.misses[word] || 0) + 1;
    }

    const key = todayKey();
    if (!s.days[key]) s.days[key] = { seen: 0, correct: 0 };
    s.days[key].seen++;
    if (correct) s.days[key].correct++;

    saveState();
  }

  listenBtn.addEventListener("click", () => currentWord && speak(currentWord.word));
  nextBtn.addEventListener("click", renderWord);

  // ---------- Stats screen ----------
  function renderStats() {
    const s = state.stats;
    document.getElementById("statTotal").textContent = s.totalSeen;
    document.getElementById("statAccuracy").textContent =
      s.totalSeen ? Math.round((s.totalCorrect / s.totalSeen) * 100) + "%" : "0%";
    document.getElementById("statBestStreak").textContent = s.bestStreak;
    document.getElementById("statMastered").textContent =
      Object.values(s.mastered).filter(n => n >= 3).length;

    const barsEl = document.getElementById("dayBars");
    barsEl.innerHTML = "";
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const maxSeen = Math.max(1, ...days.map(k => (s.days[k]?.seen || 0)));
    days.forEach(k => {
      const seen = s.days[k]?.seen || 0;
      const col = document.createElement("div");
      col.className = "bar-col";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.height = `${(seen / maxSeen) * 90 + (seen ? 10 : 2)}px`;
      const label = document.createElement("span");
      label.className = "bar-day";
      label.textContent = "SMTWTFS"[new Date(k).getDay()];
      col.appendChild(fill);
      col.appendChild(label);
      barsEl.appendChild(col);
    });

    const trickyList = document.getElementById("trickyList");
    trickyList.innerHTML = "";
    const tricky = Object.entries(s.misses).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (tricky.length === 0) {
      trickyList.innerHTML = '<p class="empty-note">No tricky words yet — keep practicing.</p>';
    } else {
      tricky.forEach(([word, count]) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${word}</span><span class="miss-count">${count} miss${count > 1 ? "es" : ""}</span>`;
        trickyList.appendChild(li);
      });
    }
  }

  document.getElementById("resetStatsBtn").addEventListener("click", () => {
    if (!confirm("Reset all progress and stats?")) return;
    state.stats = structuredClone(defaultState.stats);
    saveState();
    renderStats();
    streakPill.textContent = "🔥 0";
  });

  // ---------- Settings screen ----------
  const AVATARS = ["🙂", "🦉", "🐝", "🦋", "🐢", "🦊", "🐼", "🌟"];

  function renderSettings() {
    document.getElementById("nameInput").value = state.profile.name;
    document.getElementById("avatarBtn").textContent = state.profile.avatar;
    document.getElementById("difficultySelect").value = state.settings.difficulty;
    document.getElementById("autoReadToggle").checked = state.settings.autoRead;
    document.getElementById("soundToggle").checked = state.settings.sound;
    if (voicesPopulated && state.settings.voiceValue) voiceSelect.value = state.settings.voiceValue;
  }

  document.getElementById("nameInput").addEventListener("input", e => {
    state.profile.name = e.target.value;
    saveState();
  });

  const avatarPicker = document.getElementById("avatarPicker");
  document.getElementById("avatarBtn").addEventListener("click", () => {
    if (avatarPicker.hidden) {
      avatarPicker.innerHTML = "";
      AVATARS.forEach(a => {
        const b = document.createElement("button");
        b.textContent = a;
        b.addEventListener("click", () => {
          state.profile.avatar = a;
          saveState();
          renderSettings();
          avatarPicker.hidden = true;
        });
        avatarPicker.appendChild(b);
      });
    }
    avatarPicker.hidden = !avatarPicker.hidden;
  });

  document.getElementById("difficultySelect").addEventListener("change", e => {
    state.settings.difficulty = e.target.value;
    saveState();
  });
  document.getElementById("autoReadToggle").addEventListener("change", e => {
    state.settings.autoRead = e.target.checked;
    saveState();
  });
  document.getElementById("soundToggle").addEventListener("change", e => {
    state.settings.sound = e.target.checked;
    saveState();
  });

  // ---------- Voice picker ----------
  const voiceSelect = document.getElementById("voiceSelect");
  const previewVoiceBtn = document.getElementById("previewVoiceBtn");
  let voicesPopulated = false;

  const RV_ENGLISH_VOICES = [
    "US English Female", "US English Male",
    "UK English Female", "UK English Male",
    "Australian Female", "Australian Male",
    "Indian Female"
  ];

  function populateVoices() {
    voiceSelect.innerHTML = "";
    let firstValue = "";

    if (rvAvailable()) {
      const rvGroup = document.createElement("optgroup");
      rvGroup.label = "AI Voices (ResponsiveVoice)";
      RV_ENGLISH_VOICES.forEach(name => {
        const opt = document.createElement("option");
        opt.value = `rv::${name}`;
        opt.textContent = name;
        rvGroup.appendChild(opt);
        if (!firstValue) firstValue = opt.value;
      });
      voiceSelect.appendChild(rvGroup);
    }

    if ("speechSynthesis" in window) {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const englishFirst = [...voices].sort((a, b) => {
          const aEn = a.lang.toLowerCase().startsWith("en") ? 0 : 1;
          const bEn = b.lang.toLowerCase().startsWith("en") ? 0 : 1;
          return aEn - bEn || a.name.localeCompare(b.name);
        });
        const nativeGroup = document.createElement("optgroup");
        nativeGroup.label = "Device Voices";
        englishFirst.forEach(v => {
          const opt = document.createElement("option");
          opt.value = `native::${v.voiceURI}`;
          opt.textContent = `${v.name} (${v.lang})`;
          nativeGroup.appendChild(opt);
          if (!firstValue) firstValue = opt.value;
        });
        voiceSelect.appendChild(nativeGroup);
      }
    }

    if (voiceSelect.options.length === 0) return;

    const savedStillValid = state.settings.voiceValue &&
      [...voiceSelect.options].some(o => o.value === state.settings.voiceValue);
    if (savedStillValid) {
      voiceSelect.value = state.settings.voiceValue;
    } else {
      voiceSelect.value = firstValue;
      state.settings.voiceValue = firstValue;
      saveState();
    }
    voicesPopulated = true;
  }

  populateVoices();
  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = populateVoices;
  }

  voiceSelect.addEventListener("change", () => {
    state.settings.voiceValue = voiceSelect.value;
    saveState();
  });

  previewVoiceBtn.addEventListener("click", () => {
    if (!voicesPopulated) populateVoices();
    speak("This is how this voice sounds.");
  });

  // ---------- Boot ----------
  (async function init() {
    await loadWords();
    document.getElementById("streakPill").textContent = `🔥 ${state.stats.currentStreak}`;
    modeButtons.forEach(b => b.classList.toggle("active", b.dataset.mode === (state.settings.practiceMode || "listen")));
    categoryButtons.forEach(b => b.classList.toggle("active", b.dataset.category === (state.settings.category || "general")));
    renderWord();
  })();
})();
