(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }

  function loadText() {
    var node = document.getElementById("speech-source");
    if (!node) return "";
    try {
      var data = JSON.parse(node.textContent);
      return (data && data.text) ? String(data.text) : "";
    } catch (e) {
      return node.textContent || "";
    }
  }

  function splitSentences(text) {
    var t = String(text || "").replace(/\s+/g, "");
    if (!t) return [];
    var parts = t.split(/(?<=[。！？!?])/);
    return parts.map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function jaVoices() {
    if (!window.speechSynthesis) return [];
    return speechSynthesis.getVoices().filter(function (v) {
      var lang = (v.lang || "").toLowerCase();
      return lang === "ja" || lang.indexOf("ja-") === 0 || lang.indexOf("jp") === 0;
    });
  }

  function pickVoice() {
    var list = jaVoices();
    if (!list.length) return null;
    var prefer = list.find(function (v) { return /japan|japanese|kyoko|otoya|ichiro|sayaka|haruka|google/i.test(v.name + " " + v.lang); });
    return prefer || list[0];
  }

  function init() {
    var text = loadText();
    var sentences = splitSentences(text);
    var playBtn = $(".play");
    var pauseBtn = $(".pause");
    var stopBtn = $(".stop");
    var rateSel = $("#rate");
    var hint = $("#voice-hint");
    if (!playBtn) return;

    var index = 0;
    var paused = false;
    var speaking = false;
    var supported = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);

    function showHint(needed) {
      if (!hint) return;
      if (needed) hint.removeAttribute("hidden");
      else hint.setAttribute("hidden", "");
    }

    function refreshVoices() {
      var has = jaVoices().length > 0;
      showHint(supported && !has);
      return has;
    }

    if (window.speechSynthesis) {
      speechSynthesis.addEventListener("voiceschanged", refreshVoices);
      refreshVoices();
      setTimeout(refreshVoices, 400);
    } else {
      showHint(true);
    }

    function cancelAll() {
      if (supported) speechSynthesis.cancel();
      speaking = false;
      paused = false;
      index = 0;
      if (pauseBtn) pauseBtn.textContent = "暂停/继续";
    }

    function speakNext() {
      if (!supported) return;
      if (index >= sentences.length) {
        speaking = false;
        paused = false;
        index = 0;
        if (pauseBtn) pauseBtn.textContent = "暂停/继续";
        return;
      }
      var u = new SpeechSynthesisUtterance(sentences[index]);
      u.lang = "ja-JP";
      u.rate = rateSel ? parseFloat(rateSel.value) || 1 : 1;
      var voice = pickVoice();
      if (voice) u.voice = voice;
      u.onend = function () {
        if (!speaking || paused) return;
        index += 1;
        setTimeout(speakNext, 40);
      };
      u.onerror = function () {
        if (!speaking) return;
        index += 1;
        setTimeout(speakNext, 40);
      };
      speechSynthesis.speak(u);
    }

    playBtn.addEventListener("click", function () {
      if (!supported) { showHint(true); return; }
      refreshVoices();
      cancelAll();
      if (!sentences.length) return;
      speaking = true;
      paused = false;
      index = 0;
      speakNext();
    });

    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        if (!supported || !speaking) return;
        if (!paused) {
          speechSynthesis.pause();
          paused = true;
          pauseBtn.textContent = "继续";
        } else {
          speechSynthesis.resume();
          // Some browsers drop the queue after pause; if nothing is speaking, resume from current index.
          paused = false;
          pauseBtn.textContent = "暂停/继续";
          setTimeout(function () {
            if (speaking && !speechSynthesis.speaking && !speechSynthesis.pending) {
              speakNext();
            }
          }, 80);
        }
      });
    }

    if (stopBtn) {
      stopBtn.addEventListener("click", function () {
        cancelAll();
      });
    }

    window.addEventListener("pagehide", cancelAll);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        /* keep state; do not auto-cancel */
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
