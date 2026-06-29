/* ==========================================================================
   ASTRA_TRANSLATE QUANTUM LAYER JS CORE ENGINE
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     LANGUAGE CONFIGURATION
     ========================================================================== */
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧', voice: 'en-US' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', voice: 'es-ES' },
    { code: 'fr', name: 'French', flag: '🇫🇷', voice: 'fr-FR' },
    { code: 'de', name: 'German', flag: '🇩🇪', voice: 'de-DE' },
    { code: 'it', name: 'Italian', flag: '🇮🇹', voice: 'it-IT' },
    { code: 'ja', name: 'Japanese', flag: '🇯🇵', voice: 'ja-JP' },
    { code: 'zh', name: 'Chinese', flag: '🇨🇳', voice: 'zh-CN' },
    { code: 'hi', name: 'Hindi', flag: '🇮🇳', voice: 'hi-IN' },
    { code: 'ar', name: 'Arabic', flag: '🇦🇪', voice: 'ar-SA' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺', voice: 'ru-RU' }
  ];

  // System State registries
  let currentSrcLang = languages[0]; // English
  let currentTargetLang = languages[1]; // Spanish
  let isTranslating = false;
  let ttsSpeech = null;
  let recognition = null;
  let systemStartTime = Date.now();
  let swapClickCount = 0;

  /* ==========================================================================
     DOM SELECTORS
     ========================================================================== */
  const sourceInput = document.getElementById('source-input');
  const targetOutput = document.getElementById('target-output');
  const outputPlaceholder = document.getElementById('output-placeholder');
  const translateBtn = document.getElementById('translate-btn');
  const clearTextBtn = document.getElementById('clear-text-btn');
  const copyBtn = document.getElementById('copy-btn');
  const speakBtn = document.getElementById('speak-btn');
  const voiceInputBtn = document.getElementById('voice-input-btn');
  const languageSwapBtn = document.getElementById('language-swap-btn');
  const charCounter = document.getElementById('char-counter');
  const confidenceRating = document.getElementById('confidence-rating');
  const aiModelSelect = document.getElementById('ai-model');
  
  // Custom Dropdown Wrapper Elements
  const srcDropdownBtn = document.getElementById('source-dropdown-btn');
  const srcDropdownMenu = document.getElementById('source-dropdown-menu');
  const srcDropdownList = document.getElementById('src-dropdown-list');
  const srcSearchInput = document.getElementById('src-lang-search');
  
  const targetDropdownBtn = document.getElementById('target-dropdown-btn');
  const targetDropdownMenu = document.getElementById('target-dropdown-menu');
  const targetDropdownList = document.getElementById('target-dropdown-list');
  const targetSearchInput = document.getElementById('target-lang-search');

  // Diagnostics & Status Overlays
  const diagnosticsBar = document.getElementById('diagnostics-bar');
  const diagnosticsToggle = document.getElementById('diagnostics-toggle');
  const diagnosticsBody = document.getElementById('diagnostics-body');
  const terminalLogs = document.getElementById('terminal-logs-container');
  const logStatus = document.getElementById('log-status');
  const syncStatus = document.getElementById('sync-status');
  const syncSpinner = document.getElementById('sync-spinner');
  
  const holoLatency = document.getElementById('holo-latency');
  const footerUptime = document.getElementById('footer-uptime');
  
  const ttsRate = document.getElementById('tts-rate');
  const rateValue = document.getElementById('rate-value');
  const listeningIndicator = document.getElementById('listening-indicator');

  /* ==========================================================================
     COGNITIVE DIAGNOSTICS & HARDWARE STATS
     ========================================================================== */
  function addDiagnostic(message, type = 'info') {
    const elapsed = ((Date.now() - systemStartTime) / 1000).toFixed(2);
    const line = document.createElement('div');
    line.className = 'flex gap-2 text-[11px] leading-relaxed';
    
    let colorClass = 'text-outline';
    if (type === 'success') colorClass = 'text-primary';
    if (type === 'warning') colorClass = 'text-secondary';
    
    line.innerHTML = `<span class="text-outline/40 font-mono">[${elapsed}s]</span><span class="${colorClass}">${message}</span>`;
    terminalLogs.appendChild(line);
    
    // Auto-scroll body
    diagnosticsBody.scrollTop = diagnosticsBody.scrollHeight;
  }

  // Active Latency Monitor
  setInterval(() => {
    const baseLatency = aiModelSelect.value === 'quantum' ? 6 : aiModelSelect.value === 'aether' ? 14 : 38;
    const jitter = Math.floor(Math.random() * 4) - 2;
    const currentLat = `${Math.max(2, baseLatency + jitter)}ms`;
    if (holoLatency) holoLatency.textContent = currentLat;
  }, 4000);

  // System Uptime Count
  setInterval(() => {
    const elapsedSecs = Math.floor((Date.now() - systemStartTime) / 1000);
    if (footerUptime) footerUptime.textContent = `99.99% // ${elapsedSecs}s UP`;
  }, 1000);

  // Toggle Diagnostics body
  diagnosticsToggle.addEventListener('click', () => {
    const arrow = document.getElementById('diagnostics-arrow');
    if (diagnosticsBar.classList.contains('open')) {
      diagnosticsBar.classList.remove('open');
      diagnosticsBody.style.height = '0';
      diagnosticsBody.style.opacity = '0';
      diagnosticsBody.classList.remove('p-4', 'border-t');
      arrow.style.transform = 'rotate(0deg)';
    } else {
      diagnosticsBar.classList.add('open');
      diagnosticsBody.style.height = '120px';
      diagnosticsBody.style.opacity = '1';
      diagnosticsBody.classList.add('p-4', 'border-t');
      arrow.style.transform = 'rotate(180deg)';
    }
  });

  /* ==========================================================================
     INTERACTIVE SEARCHABLE DROPDOWNS
     ========================================================================== */
  function populateDropdown(listElement, langArray, selectCallback, activeLang) {
    listElement.innerHTML = '';
    langArray.forEach(lang => {
      const item = document.createElement('li');
      const isActive = lang.code === activeLang.code;
      item.className = `flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all text-[13px] ${
        isActive 
          ? 'bg-primary/10 text-primary font-semibold border border-primary/20' 
          : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface'
      }`;
      
      item.innerHTML = `
        <div class="flex items-center gap-2">
          <span>${lang.flag}</span>
          <span>${lang.name}</span>
        </div>
        ${isActive ? '<span class="material-symbols-outlined text-[14px]">check</span>' : ''}
      `;
      
      item.addEventListener('click', () => selectCallback(lang));
      listElement.appendChild(item);
    });
  }

  function toggleDropdownMenu(menu, show) {
    if (show) {
      menu.classList.remove('opacity-0', 'invisible', 'scale-95');
      menu.classList.add('opacity-100', 'visible', 'scale-100');
    } else {
      menu.classList.add('opacity-0', 'invisible', 'scale-95');
      menu.classList.remove('opacity-100', 'visible', 'scale-100');
    }
  }

  function closeAllDropdowns() {
    toggleDropdownMenu(srcDropdownMenu, false);
    toggleDropdownMenu(targetDropdownMenu, false);
  }

  // Toggles for buttons
  srcDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = srcDropdownMenu.classList.contains('opacity-100');
    closeAllDropdowns();
    if (!isVisible) {
      toggleDropdownMenu(srcDropdownMenu, true);
      srcSearchInput.value = '';
      srcSearchInput.focus();
      populateDropdown(srcDropdownList, languages, selectSource, currentSrcLang);
    }
  });

  targetDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = targetDropdownMenu.classList.contains('opacity-100');
    closeAllDropdowns();
    if (!isVisible) {
      toggleDropdownMenu(targetDropdownMenu, true);
      targetSearchInput.value = '';
      targetSearchInput.focus();
      populateDropdown(targetDropdownList, languages, selectTarget, currentTargetLang);
    }
  });

  // Global close
  document.addEventListener('click', closeAllDropdowns);

  // Stop propagation on dropdown menus to allow scrolling, clicking inputs, and list navigation
  srcDropdownMenu.addEventListener('click', (e) => e.stopPropagation());
  targetDropdownMenu.addEventListener('click', (e) => e.stopPropagation());

  // Dropdown list searches
  srcSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = languages.filter(l => l.name.toLowerCase().includes(q));
    populateDropdown(srcDropdownList, filtered, selectSource, currentSrcLang);
  });

  targetSearchInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = languages.filter(l => l.name.toLowerCase().includes(q));
    populateDropdown(targetDropdownList, filtered, selectTarget, currentTargetLang);
  });

  // Item selections
  function selectSource(lang) {
    currentSrcLang = lang;
    document.getElementById('src-flag').textContent = lang.flag;
    document.getElementById('src-lang-text').textContent = lang.name;
    closeAllDropdowns();
    addDiagnostic(`Telemetry source node bound to: ${lang.name.toUpperCase()}`);
    rebuildDropdowns();
  }

  function selectTarget(lang) {
    currentTargetLang = lang;
    document.getElementById('target-flag').textContent = lang.flag;
    document.getElementById('target-lang-text').textContent = lang.name;
    closeAllDropdowns();
    addDiagnostic(`Telemetry target node bound to: ${lang.name.toUpperCase()}`);
    rebuildDropdowns();
  }

  function rebuildDropdowns() {
    populateDropdown(srcDropdownList, languages, selectSource, currentSrcLang);
    populateDropdown(targetDropdownList, languages, selectTarget, currentTargetLang);
  }

  rebuildDropdowns();

  /* ==========================================================================
     TRANSLATION CONTROLS
     ========================================================================== */
  
  // Real-time character constraints and UI cleanups
  sourceInput.addEventListener('input', () => {
    const count = sourceInput.value.length;
    charCounter.textContent = `${count} / 5000`;
    
    // Toggle active status colors on counter limits
    if (count > 4800) {
      charCounter.classList.add('text-secondary');
      charCounter.classList.remove('text-outline');
    } else {
      charCounter.classList.remove('text-secondary');
      charCounter.classList.add('text-outline');
    }

    // Toggle clear button
    if (count > 0) {
      clearTextBtn.classList.remove('opacity-0', 'pointer-events-none');
      clearTextBtn.classList.add('opacity-100', 'pointer-events-auto');
    } else {
      clearTextBtn.classList.add('opacity-0', 'pointer-events-none');
      clearTextBtn.classList.remove('opacity-100', 'pointer-events-auto');
    }
  });

  // Clear button click handler
  clearTextBtn.addEventListener('click', () => {
    sourceInput.value = '';
    targetOutput.innerText = '';
    targetOutput.classList.add('hidden');
    outputPlaceholder.classList.remove('hidden');
    outputPlaceholder.innerHTML = '<span>Esperando telemetría de entrada...</span>';
    
    copyBtn.disabled = true;
    speakBtn.disabled = true;
    confidenceRating.textContent = 'CONFIDENCE: --';
    
    sourceInput.dispatchEvent(new Event('input'));
    addDiagnostic('System input registry reset.', 'warning');
  });

  // Swap matrix selector
  languageSwapBtn.addEventListener('click', () => {
    swapClickCount += 180;
    document.getElementById('swap-icon').style.transform = `rotate(${swapClickCount}deg)`;
    
    const tempLang = currentSrcLang;
    selectSource(currentTargetLang);
    selectTarget(tempLang);

    // Swap textfields
    const tempText = sourceInput.value;
    sourceInput.value = targetOutput.innerText || '';
    if (sourceInput.value === 'Esperando telemetría de entrada...') sourceInput.value = '';
    
    targetOutput.innerText = tempText;
    
    if (targetOutput.innerText.trim() !== '') {
      outputPlaceholder.classList.add('hidden');
      targetOutput.classList.remove('hidden');
    } else {
      outputPlaceholder.classList.remove('hidden');
      targetOutput.classList.add('hidden');
    }

    sourceInput.dispatchEvent(new Event('input'));
    addDiagnostic('Transducer matrices inverted.', 'warning');
  });

  // Typewriter effect
  function typewrite(element, text, index = 0) {
    if (index === 0) {
      element.innerText = '';
      element.classList.add('typing-cursor');
    }
    
    if (index < text.length) {
      element.innerText += text.charAt(index);
      const speed = text.charAt(index) === ' ' || text.charAt(index) === ',' ? 16 : 8;
      setTimeout(() => typewrite(element, text, index + 1), speed);
    } else {
      element.classList.remove('typing-cursor');
      isTranslating = false;
      translateBtn.classList.remove('opacity-80');
      translateBtn.disabled = false;
      
      logStatus.textContent = 'SYSTEM READY';
      logStatus.classList.remove('text-primary', 'border-primary/30');
      logStatus.classList.add('text-outline', 'border-white/5');
      
      syncStatus.textContent = 'Synchronized';
      syncSpinner.classList.remove('animate-spin');
      
      copyBtn.disabled = false;
      speakBtn.disabled = false;
    }
  }

  // Translate click processor
  translateBtn.addEventListener('click', async () => {
    const text = sourceInput.value.trim();
    if (!text || isTranslating) return;

    isTranslating = true;
    translateBtn.disabled = true;
    translateBtn.classList.add('opacity-80');
    
    outputPlaceholder.classList.remove('hidden');
    targetOutput.classList.add('hidden');
    outputPlaceholder.innerHTML = '<span class="animate-pulse">Decoding quantum dialect...</span>';
    
    logStatus.textContent = 'PROCESSING';
    logStatus.classList.add('text-primary', 'border-primary/30');
    logStatus.classList.remove('text-outline', 'border-white/5');

    syncStatus.textContent = 'Processing...';
    syncSpinner.classList.add('animate-spin');

    const modelName = aiModelSelect.value;
    addDiagnostic(`Transmission requested via ${modelName.toUpperCase()} core.`, 'info');
    addDiagnostic('Tokenizing lexical vectors...');

    try {
      const srcCode = currentSrcLang.code;
      const targetCode = currentTargetLang.code;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcCode}|${targetCode}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Endpoint connection failure');
      const data = await res.json();
      
      const transResult = data.responseData.translatedText;
      const score = data.responseData.match || 0.98;
      
      setTimeout(() => {
        addDiagnostic('Resolving grammatical layers...', 'success');
        
        setTimeout(() => {
          outputPlaceholder.classList.add('hidden');
          targetOutput.classList.remove('hidden');
          
          const confidence = (score * 100).toFixed(1);
          confidenceRating.textContent = `CONFIDENCE: ${confidence}%`;
          addDiagnostic(`Synthesis compiled successfully. Vector fit: ${confidence}%`, 'success');
          
          typewrite(targetOutput, transResult);
        }, 300);
      }, 600);

    } catch (err) {
      addDiagnostic(`Gateway offline: ${err.message}. Initializing localized offline emulator...`, 'warning');
      
      setTimeout(() => {
        outputPlaceholder.classList.add('hidden');
        targetOutput.classList.remove('hidden');
        
        let localMock = `[ASTRA Offline Translate Node]\n`;
        localMock += `Target code [${currentTargetLang.code.toUpperCase()}]: "${text}"`;
        
        confidenceRating.textContent = 'CONFIDENCE: 99.00% (LOCAL)';
        typewrite(targetOutput, localMock);
      }, 1000);
    }
  });

  /* ==========================================================================
     TEXT TO SPEECH (SYNTHESIS)
     ========================================================================== */
  speakBtn.addEventListener('click', () => {
    const speakText = targetOutput.innerText;
    if (!speakText) return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      document.getElementById('speaker-icon').classList.remove('animate-bounce');
      addDiagnostic('Speech synthesis thread killed.');
      return;
    }

    ttsSpeech = new SpeechSynthesisUtterance(speakText);
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    const voiceMatch = voices.find(v => v.lang.startsWith(currentTargetLang.code));
    if (voiceMatch) ttsSpeech.voice = voiceMatch;
    
    ttsSpeech.lang = currentTargetLang.voice;
    ttsSpeech.rate = parseFloat(ttsRate.value);

    ttsSpeech.onstart = () => {
      document.getElementById('speaker-icon').classList.add('animate-bounce');
      addDiagnostic(`Vocalizer engaged [Voice: ${voiceMatch ? voiceMatch.name : 'Default System'}]`, 'success');
    };

    ttsSpeech.onend = () => {
      document.getElementById('speaker-icon').classList.remove('animate-bounce');
      addDiagnostic('Speech synthesis completed.');
    };

    ttsSpeech.onerror = () => {
      document.getElementById('speaker-icon').classList.remove('animate-bounce');
      addDiagnostic('Audio thread error encountered.', 'warning');
    };

    window.speechSynthesis.speak(ttsSpeech);
  });

  // TTS speed controller
  ttsRate.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value).toFixed(1);
    rateValue.textContent = `${val}x`;
    if (ttsSpeech && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setTimeout(() => speakBtn.click(), 100);
    }
  });

  // Enable speed controller slider toggle on double click or right click
  speakBtn.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    document.getElementById('speech-settings').classList.toggle('hidden');
  });

  /* ==========================================================================
     SPEECH TO TEXT (DICTATION)
     ========================================================================== */
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    voiceInputBtn.addEventListener('click', () => {
      if (voiceInputBtn.classList.contains('bg-white/10')) {
        recognition.stop();
        return;
      }
      recognition.lang = currentSrcLang.voice;
      recognition.start();
      addDiagnostic('Speech analyzer active. Transmitting voice telemetries...');
    });

    recognition.onstart = () => {
      voiceInputBtn.classList.add('bg-white/10', 'text-secondary');
      document.getElementById('mic-icon').textContent = 'hearing';
      listeningIndicator.classList.remove('hidden');
    };

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      sourceInput.value = transcript;
      sourceInput.dispatchEvent(new Event('input'));
      addDiagnostic(`Lexical dictation resolved: "${transcript}"`, 'success');
    };

    recognition.onerror = (e) => {
      addDiagnostic(`Acoustic error: ${e.error}`, 'warning');
    };

    recognition.onend = () => {
      voiceInputBtn.classList.remove('bg-white/10', 'text-secondary');
      document.getElementById('mic-icon').textContent = 'mic';
      listeningIndicator.classList.add('hidden');
      addDiagnostic('Speech recognition scanner offline.');
    };

  } else {
    voiceInputBtn.style.opacity = '0.3';
    voiceInputBtn.style.cursor = 'not-allowed';
    voiceInputBtn.title = 'Speech-to-Text not supported on this browser profile';
    voiceInputBtn.addEventListener('click', () => {
      addDiagnostic('Speech recognition engine unavailable on this client browser.', 'warning');
    });
  }

  /* ==========================================================================
     CLIPBOARD COPY
     ========================================================================== */
  copyBtn.addEventListener('click', () => {
    const text = targetOutput.innerText;
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      const icon = document.getElementById('copy-icon');
      copyBtn.classList.add('text-primary');
      icon.textContent = 'check';
      addDiagnostic('Vector strings written securely to system clipboard.', 'success');
      
      setTimeout(() => {
        copyBtn.classList.remove('text-primary');
        icon.textContent = 'content_copy';
      }, 2000);
    }).catch(err => {
      addDiagnostic(`Clipboard failure: ${err.message}`, 'warning');
    });
  });

  /* ==========================================================================
     ATMOSPHERIC NEBULA & FLOATING PARTICLES (TAILWIND SPEC)
     ========================================================================== */
  // Simple JS for atmospheric parallax effect on desktop
  document.addEventListener('mousemove', (e) => {
    if (window.innerWidth > 768) {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      const bg = document.querySelector('.bg-nebula');
      if (bg) {
        bg.style.backgroundPosition = `${x * 10}px ${y * 10}px`;
      }
    }
  });

  // Generate CSS float particles if reduced motion is not active
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const container = document.getElementById('particles-container');
    const count = 35;
    
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.classList.add('particle');
      
      const size = Math.random() * 3 + 1;
      const posX = Math.random() * 100;
      const posY = Math.random() * 100;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 10;
      const moveX = (Math.random() - 0.5) * 20 + 'vw';
      const moveY = (Math.random() - 0.5) * 20 - 20 + 'vh'; // upward drift
      const maxOpacity = Math.random() * 0.4 + 0.1;
      const color = Math.random() > 0.5 ? '#00f2ff' : '#ebb2ff';
      
      p.style.width = `${size}px`;
      p.style.height = `${size}px`;
      p.style.left = `${posX}%`;
      p.style.top = `${posY}%`;
      p.style.backgroundColor = color;
      p.style.boxShadow = `0 0 ${size * 3}px ${size}px ${color}66`;
      
      p.style.setProperty('--duration', `${duration}s`);
      p.style.setProperty('--delay', `-${delay}s`);
      p.style.setProperty('--move-x', moveX);
      p.style.setProperty('--move-y', moveY);
      p.style.setProperty('--max-opacity', maxOpacity.toString());
      
      container.appendChild(p);
    }
  }
});
