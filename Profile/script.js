// Main JavaScript for Pragadeesh Srinivasan's Portfolio

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease',
        once: true,
        offset: 100
    });
// TODO: Check and fix layout behavior on mobile screen sizes

    // Navigation menu toggle for mobile
    const menuOpen = document.getElementById('menuOpen');
    const menuClose = document.getElementById('menuClose');
    const navLinks = document.getElementById('navLinks');
    
    if (menuOpen) {
        menuOpen.addEventListener('click', function() {
            navLinks.classList.add('active');
        });
    }
    
    if (menuClose) {
        menuClose.addEventListener('click', function() {
            navLinks.classList.remove('active');
        });
    }

    // Navigation links active state
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links ul li a');
    
    window.addEventListener('scroll', function() {
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
        selector.addEventListener('click', function() {
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
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            const filter = this.getAttribute('data-filter');
            
            projectCards.forEach(card => {
                if (filter === 'all') {
                    card.style.display = 'block';
                } else {
                    if (card.getAttribute('data-category').includes(filter)) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
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
    
});
