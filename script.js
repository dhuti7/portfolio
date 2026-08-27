document.addEventListener('DOMContentLoaded', () => {
    // Signature Intro Animation
    const sigIntro = document.getElementById('sig-intro');
    const navLogo = document.getElementById('nav-logo');

    // Moves the signature SVG out of the intro overlay and into the nav logo slot.
    // When `animate` is true, it uses a FLIP transition (fixed-position "from" rect
    // animated to the resting "to" rect) so the signature visibly shrinks and slides
    // into place; otherwise it snaps straight there.
    function relocateSigToNav(sigSvg, animate) {
        if (!navLogo || !sigSvg) return;

        if (!animate) {
            navLogo.innerHTML = '';
            sigSvg.classList.add('sig-svg--nav');
            navLogo.appendChild(sigSvg);
            return;
        }

        const firstRect = sigSvg.getBoundingClientRect();

        // Briefly drop it into its real resting slot just to measure where that is.
        navLogo.innerHTML = '';
        sigSvg.classList.add('sig-svg--nav');
        navLogo.appendChild(sigSvg);
        const lastRect = sigSvg.getBoundingClientRect();

        // Animate it as a direct child of <body> instead of inside .navbar — .navbar
        // is its own stacking context (position:fixed + z-index), which would trap a
        // nested z-index:1000 element beneath it and hide the shrink behind the still
        // -fading intro overlay. As a body-level sibling, its z-index compares directly
        // against the overlay's, so it stays visibly on top throughout the animation.
        document.body.appendChild(sigSvg);
        sigSvg.style.position = 'fixed';
        sigSvg.style.margin = '0';
        sigSvg.style.zIndex = '1000';
        sigSvg.style.transition = 'none';
        sigSvg.style.top = firstRect.top + 'px';
        sigSvg.style.left = firstRect.left + 'px';
        sigSvg.style.width = firstRect.width + 'px';
        sigSvg.style.height = firstRect.height + 'px';

        sigSvg.getBoundingClientRect(); // force reflow before animating

        let cleaned = false;
        function cleanup() {
            if (cleaned) return;
            cleaned = true;
            sigSvg.removeEventListener('transitionend', onTransitionEnd);
            sigSvg.style.position = '';
            sigSvg.style.margin = '';
            sigSvg.style.zIndex = '';
            sigSvg.style.transition = '';
            sigSvg.style.top = '';
            sigSvg.style.left = '';
            sigSvg.style.width = '';
            sigSvg.style.height = '';
            navLogo.appendChild(sigSvg); // settle into its permanent home in the flex layout
        }
        function onTransitionEnd(e) {
            if (e.target === sigSvg && e.propertyName === 'width') cleanup();
        }
        sigSvg.addEventListener('transitionend', onTransitionEnd);
        setTimeout(cleanup, 1900); // fallback in case transitionend doesn't fire

        requestAnimationFrame(() => {
            const RELOCATE_DURATION = 1600; // ms
            const easing = `${RELOCATE_DURATION}ms cubic-bezier(0.16, 1, 0.3, 1)`;
            sigSvg.style.transition = ['top', 'left', 'width', 'height']
                .map((prop) => `${prop} ${easing}`)
                .join(', ');
            sigSvg.style.top = lastRect.top + 'px';
            sigSvg.style.left = lastRect.left + 'px';
            sigSvg.style.width = lastRect.width + 'px';
            sigSvg.style.height = lastRect.height + 'px';
        });
    }

    function finishSigIntro(overlay, sigSvg, animate) {
        relocateSigToNav(sigSvg, animate);
        overlay.classList.add('sig-intro--done');
        document.body.classList.remove('sig-lock');
        document.body.classList.add('intro-done');
        setTimeout(() => overlay.remove(), 900);
    }

    if (sigIntro) {
        const sigSvg = sigIntro.querySelector('.sig-svg');
        const letters = Array.from(sigIntro.querySelectorAll('.sig-svg .letter'));
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Crop the viewBox tightly around the drawn strokes so the signature scales
        // cleanly down to logo size later, instead of shrinking inside a mostly-empty canvas.
        if (sigSvg && letters.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            letters.forEach((path) => {
                const box = path.getBBox();
                minX = Math.min(minX, box.x);
                minY = Math.min(minY, box.y);
                maxX = Math.max(maxX, box.x + box.width);
                maxY = Math.max(maxY, box.y + box.height);
            });
            const pad = 14;
            sigSvg.setAttribute(
                'viewBox',
                `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`
            );
        }

        function resetLetter(path) {
            const len = path.getTotalLength();
            path.style.transition = 'none';
            path.style.strokeDasharray = len;
            path.style.strokeDashoffset = len;
        }

        function drawLetter(path, duration) {
            path.getBoundingClientRect(); // force reflow
            path.style.transition = `stroke-dashoffset ${duration}ms ease-out`;
            requestAnimationFrame(() => { path.style.strokeDashoffset = 0; });
        }

        if (letters.length === 0) {
            finishSigIntro(sigIntro, sigSvg, false);
        } else if (prefersReducedMotion) {
            letters.forEach((path) => { path.style.strokeDashoffset = 0; });
            finishSigIntro(sigIntro, sigSvg, false);
        } else {
            document.body.classList.add('sig-lock');
            letters.forEach(resetLetter);

            const LETTER_DURATION = 1;      // ms each letter takes to draw
            const GAP_BETWEEN_LETTERS = 60; // ms pause before the next letter starts
            const GAP_AFTER_WORD = 220;     // extra pause after a word-ending letter

            let t = 0;
            letters.forEach((path) => {
                const isWordEnd = path.dataset.wordEnd === '1';
                setTimeout(() => drawLetter(path, LETTER_DURATION), t);
                t += LETTER_DURATION + (isWordEnd ? GAP_AFTER_WORD : GAP_BETWEEN_LETTERS);
            });

            const HOLD_AFTER_DRAW = 900; // ms to sit on the completed signature before transitioning away
            setTimeout(() => {
                // If some letters are flagged data-nav-keep="1" (e.g. just "dhuti" out of
                // "Hey, I am dhuti"), fade the rest out and re-crop the viewBox to only
                // those letters before the signature shrinks into the nav logo — so the
                // full phrase draws in the intro, but only the kept word persists in the nav.
                const navKeepLetters = letters.filter((path) => path.dataset.navKeep === '1');
                if (sigSvg && navKeepLetters.length > 0 && navKeepLetters.length < letters.length) {
                    const dropLetters = letters.filter((path) => path.dataset.navKeep !== '1');
                    const FADE_DURATION = 300; // ms

                    dropLetters.forEach((path) => {
                        path.style.transition = `opacity ${FADE_DURATION}ms ease`;
                        path.style.opacity = '0';
                    });

                    setTimeout(() => {
                        dropLetters.forEach((path) => path.remove());

                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        navKeepLetters.forEach((path) => {
                            const box = path.getBBox();
                            minX = Math.min(minX, box.x);
                            minY = Math.min(minY, box.y);
                            maxX = Math.max(maxX, box.x + box.width);
                            maxY = Math.max(maxY, box.y + box.height);
                        });
                        const pad = 14;
                        sigSvg.setAttribute(
                            'viewBox',
                            `${minX - pad} ${minY - pad} ${(maxX - minX) + pad * 2} ${(maxY - minY) + pad * 2}`
                        );

                        finishSigIntro(sigIntro, sigSvg, true);
                    }, FADE_DURATION);
                } else {
                    finishSigIntro(sigIntro, sigSvg, true);
                }
            }, t + HOLD_AFTER_DRAW);
        }
    } else {
        // No intro overlay on this page — let the hero content animate in normally.
        document.body.classList.add('intro-done');
    }

    // Theme Toggling Logic
    const themeToggle = document.getElementById('theme-toggle');

    const savedTheme = localStorage.getItem('theme');

    const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;

    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (themeToggle) themeToggle.innerHTML = sunIcon;
    } else {
        // Default to Light Mode
        document.documentElement.setAttribute('data-theme', 'light');
        if (themeToggle) themeToggle.innerHTML = moonIcon;
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'light') {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = sunIcon;
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = moonIcon;
            }
        });
    }

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Optional: stop observing once it's visible
                // observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const showcaseItems = document.querySelectorAll('.showcase-item');
    showcaseItems.forEach(item => {
        observer.observe(item);
    });

    // Optional subtle parallax on images
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY;
        const images = document.querySelectorAll('.showcase-img');

        images.forEach(img => {
            const rect = img.parentElement.getBoundingClientRect();
            // simple parallax calculation
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                const yPos = (rect.top - window.innerHeight / 2) * 0.05;
                // img.style.transform = `translateY(${yPos}px) scale(1.1)`;
                // Committing this out by default as transform on hover handles scale, 
                // but this could be elaborated if user wants more parallax.
            }
        });
    });

    // Chatbot Logic
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotClose = document.getElementById('chatbot-close');
    const chatbotWindow = document.getElementById('chatbot-window');
    const iconOpen = document.querySelector('.chat-icon.open');
    const iconClose = document.querySelector('.chat-icon.close');
    const chatInput = document.getElementById('chatbot-input');
    const chatSendBtn = document.getElementById('chatbot-send');
    const chatMessages = document.getElementById('chatbot-messages');

    function toggleChat() {
        chatbotWindow.classList.toggle('hidden');
        if (chatbotWindow.classList.contains('hidden')) {
            iconOpen.classList.remove('hidden');
            iconClose.classList.add('hidden');
        } else {
            iconOpen.classList.add('hidden');
            iconClose.classList.remove('hidden');
            chatInput.focus();
        }
    }

    if (chatbotToggle && chatbotClose) {
        chatbotToggle.addEventListener('click', toggleChat);
        chatbotClose.addEventListener('click', toggleChat);
    }

    function addMessage(text, isUser = false) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user' : 'bot'}`;
        msgDiv.innerHTML = `<div class="message-content">${text}</div>`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator active';
        indicator.id = 'typing-indicator';
        indicator.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
        chatMessages.appendChild(indicator);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return indicator;
    }

    const dummyResponses = [
        "That's interesting! By the way, check out my recent work in the 'Work' section.",
        "I'm just a simple assistant, but Arundhuti builds amazing experiences!",
        "Feel free to drop an email to arundhutib.work@gmail.com if you want to connect.",
        "Did you see the pediatric wheelchair acquisition project?",
        "I'm here to help you navigate! Click around to see more of the portfolio.",
        "I'm not fully AI-powered yet, but I think you'll love the portfolio anyway!"
    ];

    function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        addMessage(text, true);
        chatInput.value = '';

        // Show typing indicator
        const typingIndic = showTypingIndicator();

        // Simulate thinking time (1-2 seconds)
        setTimeout(() => {
            typingIndic.remove();
            // Pick a random response
            const randomResponse = dummyResponses[Math.floor(Math.random() * dummyResponses.length)];
            addMessage(randomResponse, false);
        }, 1000 + Math.random() * 1000);
    }

    if (chatSendBtn && chatInput) {
        chatSendBtn.addEventListener('click', handleSend);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
    }
});
