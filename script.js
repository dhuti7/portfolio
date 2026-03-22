document.addEventListener('DOMContentLoaded', () => {
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
});
