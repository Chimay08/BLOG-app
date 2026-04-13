/* ===================================================
   WORD SUGGESTIONS — Autocomplete for blog textareas
   Attaches to #contentInput and #promptInput
=================================================== */

const WORD_LIST = [
  // A
  "abstract","accomplish","accurate","achieve","acknowledge","across","action","actively",
  "actually","address","advance","advantage","affect","agree","algorithm","although",
  "amazing","analysis","apply","approach","appropriate","architecture","argument","aspect",
  "attention","attract","authentication","authorization","available","awareness",
  // B
  "background","beautiful","because","behavior","believe","benefit","between","beyond",
  "blockchain","boundaries","briefly","brilliant","building","business",
  // C
  "challenge","change","chapter","character","clarity","collaborate","collection",
  "comment","community","comparison","complex","concept","conclusion","connect",
  "content","context","continue","contribute","creative","critical","culture",
  // D
  "database","decision","define","describe","design","detail","develop","different",
  "digital","directly","discover","discussion","distribute","document","dynamic",
  // E
  "effective","efficiency","enhance","environment","establish","evaluate","evolve",
  "example","experience","explain","explore","express","extended",
  // F
  "feature","feedback","flexible","framework","freedom","function","fundamental",
  // G
  "generate","global","growth","guidelines",
  // H
  "highlight","however","human",
  // I
  "implement","important","improve","include","industry","information","integrate",
  "interface","interesting","introduction","intelligence","interact",
  // J
  "journey","justice",
  // K
  "knowledge",
  // L
  "language","learning","leverage","library","lifestyle","limitation",
  // M
  "maintain","management","maximize","meaningful","methodology","minimize","modern",
  "monitor","multiple",
  // N
  "necessary","network","notable",
  // O
  "objective","optimize","overview",
  // P
  "pattern","performance","perspective","platform","practical","practice","primary",
  "principle","problem","process","product","programming","project","purpose",
  // Q
  "quality","quickly",
  // R
  "readable","recognize","recommend","reduce","refactor","reference","relationship",
  "relevant","research","resource","response","responsible","review",
  // S
  "scalable","security","server","significant","simple","solution","strategy",
  "structure","support","system","sustainable",
  // T
  "technology","therefore","through","together","transform","transparent",
  // U
  "understand","unique","update","useful","utilize",
  // V
  "valuable","visualization","various",
  // W
  "whether","workflow","writing",
];


/* ===================================================
   SuggestionBox CLASS
=================================================== */

class SuggestionBox {

  constructor(textarea) {
    this.textarea    = textarea;
    this.box         = null;
    this.suggestions = [];
    this.activeIndex = -1;

    this._build();
    this._bind();
  }


  /* --- Setup --- */

  _build() {
    this.box = document.createElement("ul");
    this.box.className = "suggestion-box";
    document.body.appendChild(this.box);
  }

  _bind() {
    this.textarea.addEventListener("input",   () => this._onInput());
    this.textarea.addEventListener("keydown", (e) => this._onKeydown(e));
    this.textarea.addEventListener("blur",    () => {
      // Small delay so mousedown on a suggestion fires first
      setTimeout(() => this._hide(), 120);
    });
  }


  /* --- Input handler --- */

  _onInput() {
    const word = this._currentWord();

    if (word.length < 2) {
      this._hide();
      return;
    }

    this.suggestions = WORD_LIST
      .filter(w => w.startsWith(word.toLowerCase()))
      .slice(0, 8);

    if (this.suggestions.length === 0) {
      this._hide();
      return;
    }

    this._render(word);
    this._position();
  }


  /* --- Keyboard navigation --- */

  _onKeydown(e) {
    if (!this.box.classList.contains("visible")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.activeIndex = Math.min(this.activeIndex + 1, this.suggestions.length - 1);
      this._updateActive();

    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.activeIndex = Math.max(this.activeIndex - 1, -1);
      this._updateActive();

    } else if (e.key === "Enter" || e.key === "Tab") {
      if (this.activeIndex >= 0) {
        e.preventDefault();
        this._select(this.suggestions[this.activeIndex]);
      }

    } else if (e.key === "Escape") {
      this._hide();
    }
  }


  /* --- Render dropdown --- */

  _render(typedWord) {
    this.activeIndex = -1;

    this.box.innerHTML = this.suggestions.map((word, i) => {
      // Bold the typed prefix, normal for the rest
      const match = word.slice(0, typedWord.length);
      const rest  = word.slice(typedWord.length);
      return `<li data-word="${word}" data-index="${i}">
        <span class="sg-match">${match}</span>${rest}
      </li>`;
    }).join("");

    this.box.querySelectorAll("li").forEach(li => {

      // mousedown (not click) so it fires before blur
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this._select(li.dataset.word);
      });

      li.addEventListener("mouseenter", () => {
        this.activeIndex = parseInt(li.dataset.index);
        this._updateActive();
      });
    });

    this.box.classList.add("visible");
  }


  /* --- Highlight active item --- */

  _updateActive() {
    this.box.querySelectorAll("li").forEach((li, i) => {
      li.classList.toggle("active", i === this.activeIndex);
    });
  }


  /* --- Position box under textarea (fixed) --- */

  _position() {
    const rect = this.textarea.getBoundingClientRect();
    this.box.style.top   = `${rect.bottom + 4}px`;
    this.box.style.left  = `${rect.left}px`;
    this.box.style.width = `${Math.min(rect.width, 280)}px`;
  }


  /* --- Extract the word at cursor --- */

  _currentWord() {
    const pos  = this.textarea.selectionStart;
    const text = this.textarea.value.slice(0, pos);
    const m    = text.match(/(\S+)$/);
    return m ? m[1] : "";
  }


  /* --- Replace current word with selected suggestion --- */

  _select(word) {
    const pos      = this.textarea.selectionStart;
    const text     = this.textarea.value;
    const before   = text.slice(0, pos);
    const after    = text.slice(pos);
    const newBefore = before.replace(/(\S+)$/, word);

    this.textarea.value = newBefore + after;

    const newPos = newBefore.length;
    this.textarea.setSelectionRange(newPos, newPos);
    this.textarea.focus();
    this._hide();
  }


  /* --- Hide dropdown --- */

  _hide() {
    this.box.classList.remove("visible");
    this.activeIndex = -1;
  }
}


/* ===================================================
   INIT — attach to both textareas
=================================================== */

document.addEventListener("DOMContentLoaded", () => {

  const contentArea = document.getElementById("contentInput");
  const promptArea  = document.getElementById("promptInput");

  if (contentArea) new SuggestionBox(contentArea);
  if (promptArea)  new SuggestionBox(promptArea);

});
