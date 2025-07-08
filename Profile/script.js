// Main JavaScript for Pragadeesh Srinivasan's Portfolio
// Certrificate toggle functionality
function filterCerts(category) {
    const certs = document.querySelectorAll('.cert-card');
    const buttons = document.querySelectorAll('.cert-filter-buttons button');
    // Show/hide certificates based on category
    certs.forEach(cert => {
        if (category === 'all' || cert.classList.contains(category)) {
            cert.style.display = 'block';
        } else {
            cert.style.display = 'none';
        }
    });
    // Remove 'active' from all buttons
    buttons.forEach(btn => btn.classList.remove('active'));
    // Add 'active' to the clicked button
    // Ensure event.currentTarget is valid or find button by category
    const activeButton = document.querySelector(`.cert-filter-buttons button[data-category='${category}']`);
    if (activeButton) {
        activeButton.classList.add('active');
    } else {
        // Fallback or error handling if button not found,
        // though ideally the selector should work if HTML is structured with data-category
        console.warn(`Filter button for category '${category}' not found.`);
    }
}
function toggleSection(sectionId, introId) {
    const section = document.getElementById(sectionId);
    const intro = document.getElementById(introId);

    if (section.classList.contains('is-hidden')) {
        section.classList.remove('is-hidden');
        if (intro) intro.classList.add('hidden');
    } else {
        section.classList.add('is-hidden');
        if (intro) intro.classList.remove('hidden');
    }
}


// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function () {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease',
        once: true,
        offset: 100
    });
    // Navigation menu toggle for mobile
    const menuOpen = document.getElementById('menuOpen');
    const menuClose = document.getElementById('menuClose');
    const navLinks = document.getElementById('navLinks');
    if (menuOpen) {
        menuOpen.addEventListener('click', function () {
            navLinks.classList.add('active');
        });
    }
    if (menuClose) {
        menuClose.addEventListener('click', function () {
            navLinks.classList.remove('active');
        });
    }
    // Navigation links active state
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links ul li a');
    window.addEventListener('scroll', function () {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = section.getAttribute('id');
            }
        });
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').substring(1) === current) {
                item.classList.add('active');
            }
        });
        // Sticky header
        const header = document.querySelector('header');
        header.classList.toggle('sticky', window.scrollY > 100);
    });
    // Typewriter effect for hero section
    class TxtRotate {
        constructor(el, toRotate, period) {
            this.toRotate = toRotate;
            this.el = el;
            this.loopNum = 0;
            this.period = parseInt(period, 10) || 2000;
            this.txt = '';
            this.tick();
            this.isDeleting = false;
        }
        tick() {
            const i = this.loopNum % this.toRotate.length;
            const fullTxt = this.toRotate[i];
            if (this.isDeleting) {
                this.txt = fullTxt.substring(0, this.txt.length - 1);
            } else {
                this.txt = fullTxt.substring(0, this.txt.length + 1);
            }
            this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>';
            let delta = 200 - Math.random() * 100;
            if (this.isDeleting) { delta /= 2; }
            if (!this.isDeleting && this.txt === fullTxt) {
                delta = this.period;
                this.isDeleting = true;
            } else if (this.isDeleting && this.txt === '') {
                this.isDeleting = false;
                this.loopNum++;
                delta = 500;
            }
            setTimeout(() => {
                this.tick();
            }, delta);
        }
    }
    const txtRotateElements = document.getElementsByClassName('txt-rotate');
    for (let i = 0; i < txtRotateElements.length; i++) {
        const toRotate = txtRotateElements[i].getAttribute('data-rotate');
        const period = txtRotateElements[i].getAttribute('data-period');
        if (toRotate) {
            new TxtRotate(txtRotateElements[i], JSON.parse(toRotate), period);
        }
    }
    // Skills category selector
    const categorySelectors = document.querySelectorAll('.category-selector');
    const skillsGroups = document.querySelectorAll('.skills-group');
    categorySelectors.forEach(selector => {
        selector.addEventListener('click', function () {
            // Remove active class from all selectors
            categorySelectors.forEach(s => s.classList.remove('active'));
            // Add active class to clicked selector
            this.classList.add('active');
            // Hide all skills groups
            skillsGroups.forEach(group => group.classList.remove('active'));
            // Show the corresponding skills group
            const category = this.getAttribute('data-category');
            document.getElementById(category).classList.add('active');
        });
    });
    // Project filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            projectCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = ''; // Revert to stylesheet display type
                } else {
                    if (card.getAttribute('data-category').includes(filter)) {
                        card.style.display = ''; // Revert to stylesheet display type
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
            AOS.refresh(); // Refresh AOS after filtering
        });
    });
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                subject: document.getElementById('subject').value,
                message: document.getElementById('message').value
            };
            const submitButton = contactForm.querySelector("button[type='submit']");
            submitButton.disabled = true;
            submitButton.innerText = "Processing... Please wait (5s)";
            let countdown = 5;
            const interval = setInterval(() => {
                countdown--;
                submitButton.innerText = `Processing... Please wait (${countdown}s)`;
            }, 1000);
            const scriptURL = "https://script.google.com/macros/s/AKfycbzks30Pvqd9lI49PbTtGTFeFUA5RqYh0AHIzemnI2wlUfI6WlJ-nYNmWDq9daGOt92nww/exec";
            fetch(scriptURL, {
                method: "POST",
                body: JSON.stringify(formData),
                headers: { "Content-Type": "application/json" },
                mode: "no-cors"
            })
                .then(() => {
                    clearInterval(interval);
                    const successMessage = document.createElement("div");
                    successMessage.classList.add("booking-success-message");
                    successMessage.innerHTML = `
        <i class="fas fa-check-circle success-icon"></i>
        <p class="success-text">Your request has been submitted.</p>
        <p class="success-subtext">Would you like to contact via WhatsApp?</p>
        <div class="success-buttons">
        <button id="confirmYes" class="action-button">Yes</button>
        <button id="confirmNo" class="action-button">No</button>
        </div>
    `;
                    contactForm.parentElement.appendChild(successMessage);
                    submitButton.style.display = "none";
                    document.getElementById("confirmYes").onclick = function () {
                        sendWhatsAppMessage(formData); // Assuming this function exists
                        contactForm.reset();
                        successMessage.remove();
                        submitButton.style.display = "block";
                        submitButton.disabled = false;
                        submitButton.innerText = "Send Message";
                    };
                    document.getElementById("confirmNo").onclick = function () {
                        successMessage.innerHTML = `
        <i class="fas fa-smile-beam success-icon"></i>
        <p class="success-text">Thank you! He will contact you shortly.</p>
        `;
                        contactForm.reset();
                        submitButton.style.display = "block";
                        submitButton.disabled = false;
                        submitButton.innerText = "Send Message";
                    };
                })
                .catch((error) => {
                    clearInterval(interval);
                    alert("Error! Please try again.");
                    submitButton.innerText = "Send Message";
                    submitButton.disabled = false;
                    console.error("Booking error:", error);
                });
        });
    }
    function sendWhatsAppMessage(data) {
        const phone = "+918903558066"; // Replace with your WhatsApp number
        const message = `Hi, I am ${data.name}. I just submitted a request on your website.`;
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
    const fab = document.getElementById('resume-fab');
    const eyeContainer = fab.querySelector('.eye-container');
    const eyeIris = eyeContainer.querySelector('.eye-iris');
    const eyePupil = eyeContainer.querySelector('.eye-pupil');
    const eyeHighlight = eyeContainer.querySelector('.eye-highlight');
    let isAwake = false;
    let isAnimating = false;
    let blinkInterval;
    let sleepTimeout;
    let lastMovementTime = 0;
    const WAKE_DISTANCE = 180;
    const SLEEP_DELAY = 2500;
    setTimeout(() => {
        fab.classList.remove('collapsed');
    }, 1500);
    setTimeout(() => {
        fab.classList.add('collapsed');
    }, 4000);
    document.addEventListener('mousemove', (e) => {
        const rect = fab.getBoundingClientRect();
        const fabCenterX = rect.left + rect.width / 2;
        const fabCenterY = rect.top + rect.height / 2;
        const deltaX = e.clientX - fabCenterX;
        const deltaY = e.clientY - fabCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance < WAKE_DISTANCE) {
            lastMovementTime = Date.now();
            wakeUp();
            trackEye(deltaX, deltaY, distance);
        }
        clearTimeout(sleepTimeout);
        sleepTimeout = setTimeout(() => {
            if (Date.now() - lastMovementTime > SLEEP_DELAY) {
                goToSleep();
            }
        }, SLEEP_DELAY);
    });
    function wakeUp() {
        if (!isAwake) {
            isAwake = true;
            eyeContainer.classList.add('awake');
            startBlinking();
        }
    }
    function goToSleep() {
        if (isAwake) {
            isAwake = false;
            eyeContainer.classList.remove('awake');
            stopBlinking();
            eyeIris.setAttribute('transform', 'translate(0, 0)');
            eyePupil.setAttribute('transform', 'translate(0, 0)');
            eyeHighlight.setAttribute('transform', 'translate(1.5, -1.5)');
        }
    }
    function trackEye(deltaX, deltaY, distance) {
        if (!isAwake) return;
        const angle = Math.atan2(deltaY, deltaX);
        const intensity = Math.min(distance / WAKE_DISTANCE, 1);
        const maxMovement = 3;
        const irisX = Math.cos(angle) * maxMovement * intensity;
        const irisY = Math.sin(angle) * maxMovement * intensity * 0.6;
        const pupilX = Math.cos(angle) * (maxMovement + 0.5) * intensity;
        const pupilY = Math.sin(angle) * (maxMovement + 0.5) * intensity * 0.6;
        const highlightX = Math.cos(angle) * (maxMovement - 0.8) * intensity + 1.5;
        const highlightY = Math.sin(angle) * (maxMovement - 0.8) * intensity * 0.6 - 1.5;
        eyeIris.setAttribute('transform', `translate(${irisX}, ${irisY})`);
        eyePupil.setAttribute('transform', `translate(${pupilX}, ${pupilY})`);
        eyeHighlight.setAttribute('transform', `translate(${highlightX}, ${highlightY})`);
    }
    function startBlinking() {
        if (blinkInterval) clearInterval(blinkInterval);
        blinkInterval = setInterval(() => {
            if (isAwake && !eyeContainer.classList.contains('blinking')) {
                eyeContainer.classList.add('blinking');
                setTimeout(() => {
                    eyeContainer.classList.remove('blinking');
                }, 400);
            }
        }, 2500 + Math.random() * 2000);
    }
    function stopBlinking() {
        if (blinkInterval) {
            clearInterval(blinkInterval);
            blinkInterval = null;
        }
    }
    fab.addEventListener('mouseenter', () => {
        if (!isAnimating) {
            isAnimating = true;
            fab.classList.remove('collapsed');
            setTimeout(() => {
                if (isAnimating) {
                    fab.classList.add('collapsed');
                    isAnimating = false;
                }
            }, 3000);
        }
    });
    fab.addEventListener('click', (e) => {
        e.preventDefault();
        stopBlinking();
        fab.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        fab.style.transform = 'translateY(-50%) scale(0.8)';
        fab.style.opacity = '0.7';
        setTimeout(() => {
            fab.style.transform = 'translateY(-50%) scale(1.2)';
            fab.style.opacity = '0';
        }, 200);
        setTimeout(() => {
            window.open('https://drive.google.com/file/d/1KQHBfX7tTakzHwfmIr8fLGX-Fs0hmybp/view', '_blank');
            fab.style.transform = 'translateY(-50%) scale(1)';
            fab.style.opacity = '1';
            fab.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            if (isAwake) startBlinking();
        }, 800);
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            goToSleep();
        }
    });
    goToSleep();

    const themeToggle = document.getElementById('theme-toggle');
    const themeLink = document.getElementById('theme-link');
    const themeIcon = document.getElementById('theme-icon');

    function setTheme(theme) {
        if (theme === 'dark') {
            themeLink.href = 'styles.css'; // dark mode CSS
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            themeToggle.style.color = '#ddd'; // optional icon color for dark
        } else {
            themeLink.href = 'style.css'; // light mode CSS
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            themeToggle.style.color = '#ffcc00'; // sun yellow for light mode
        }
        localStorage.setItem('theme', theme);
    }

    // Load saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = themeLink.href.includes('style.css') ? 'light' : 'dark';
        setTheme(currentTheme === 'light' ? 'dark' : 'light');
    });
    // Inside your script.js or relevant <script> tag

    // document.addEventListener('DOMContentLoaded', () => {
    const toggleServicesBtn = document.getElementById('toggleServicesBtn');
    const servicesContent = document.getElementById('services-content-wrapper'); // Target the new wrapper

    if (toggleServicesBtn && servicesContent) {
        // Ensure content starts hidden (CSS already does this, but good practice)
        servicesContent.classList.remove('visible');

        toggleServicesBtn.addEventListener('click', () => {
            servicesContent.classList.toggle('visible'); // Toggle the .visible class

            // Optional: Change button text based on visibility
            if (servicesContent.classList.contains('visible')) {
                toggleServicesBtn.textContent = 'Hide Services'; // Or use an icon
            } else {
                toggleServicesBtn.textContent = 'View My Services';
            }
        });
    }
    // });

});
