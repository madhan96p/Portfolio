// --- documents.js ---
// Manages the Documents page (documents.html)

document.addEventListener('DOMContentLoaded', () => {
    // --- Page Elements ---
    const container = document.getElementById('doc-card-container');
    
    // --- Existing Modal Elements (for viewing docs) ---
    const modal = document.getElementById('doc-modal');
    const modalViewer = document.getElementById('doc-viewer');
    const closeBtn = document.getElementById('close-doc-modal');

    // --- NEW FORM ELEMENTS ---
    const addDocBtn = document.getElementById('add-doc-btn');
    const addDocModal = document.getElementById('add-doc-modal');
    const closeAddDocModalBtn = document.getElementById('close-add-doc-modal');
    const addDocForm = document.getElementById('add-doc-form');
    const saveDocBtn = document.getElementById('save-doc-btn');

    // --- Definitions for Sorting ---
    const IDENTITY_TYPES = ['Aadhaar Card', 'PAN Card', 'Driving Licence', 'Passport', 'Voter ID'];
    const FINANCIAL_TYPES = ['IPPBank', 'IOBank'];
    const ACADEMIC_TYPES = ['12th mark sheet', '10th mark sheet'];

    // --- Modal Functions (Unchanged) ---
    const showModal = (content) => {
        modalViewer.innerHTML = content;
        modal.classList.add('visible');
    };
    const hideModal = () => {
        modalViewer.innerHTML = '';
        modal.classList.remove('visible');
    };
    const handleLinkClick = (e) => {
        e.preventDefault();
        const link = e.currentTarget.href;

        if (link.toLowerCase().endsWith('.pdf') || e.currentTarget.dataset.type === 'pdf') {
            showModal(`<iframe src="${link}" title="PDF Viewer"></iframe>`);
        } else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(link)) {
            showModal(`<img src="${link}" alt="Document Scan">`);
        } else if (link.includes('drive.google.com/file')) {
            const previewLink = link.replace('/view', '/preview');
            showModal(`<iframe src="${previewLink}" title="Google Drive Viewer"></iframe>`);
        } else {
            window.open(link, '_blank');
        }
    };

    // --- NEW: Handle Copy Button Click ---
    const handleCopyClick = (e) => {
        const copyValue = e.currentTarget.dataset.copyValue;
        if (!copyValue) return;

        navigator.clipboard.writeText(copyValue).then(() => {
            const originalText = e.currentTarget.innerHTML;
            e.currentTarget.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(() => {
                e.currentTarget.innerHTML = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
            alert('Failed to copy to clipboard.');
        });
    };

    // --- NEW: Proactive Expiry Date Checker ---
    const checkExpiry = (expiryDate) => {
        if (!expiryDate || expiryDate === '–') {
            return { text: 'N/A', class: '' };
        }
        
        const [day, month, year] = expiryDate.split('-');
        const exp = new Date(`${year}-${month}-${day}`);
        const now = new Date();
        const sixMonthsFromNow = new Date();
        sixMonthsFromNow.setMonth(now.getMonth() + 6);

        if (exp < now) {
            return { text: 'EXPIRED', class: 'expired' };
        }
        if (exp < sixMonthsFromNow) {
            return { text: `Expires: ${expiryDate}`, class: 'expires-soon' };
        }
        return { text: `Expires: ${expiryDate}`, class: '' };
    };

    // --- NEW: Function to create a single card (Assumed to be defined in full) ---
    const createDocCard = (doc) => {
        // ... (This function remains as defined in the previous version) ...
        const { docType, fullName, docNumber, issued, expiry, link, pdf } = doc;
        
        const expiryStatus = checkExpiry(expiry);
        
        const linkBtn = link && link.startsWith('http')
            ? `<a href="${link}" class="doc-btn doc-link" data-type="drive"><i class="fab fa-google-drive"></i> G-Drive</a>` : '';
        const pdfBtn = pdf && pdf.startsWith('http')
            ? `<a href="${pdf}" class="doc-btn doc-link" data-type="pdf"><i class="far fa-file-pdf"></i> PDF</a>` : '';
        
        const copyBtn = docNumber
            ? `<button class="doc-btn copy-btn" data-copy-value="${docNumber}"><i class="far fa-copy"></i> Copy No.</button>` : '';

        let icon = 'fa-file-alt';
        if (IDENTITY_TYPES.includes(docType)) icon = 'fa-id-card';
        if (FINANCIAL_TYPES.includes(docType)) icon = 'fa-university';
        if (ACADEMIC_TYPES.includes(docType)) icon = 'fa-user-graduate';

        return `
            <div class="doc-card">
                <div class="doc-card-header">
                    <h3>${docType}</h3>
                    <i class="fas ${icon}"></i>
                </div>
                <div class="doc-card-body">
                    <p>${fullName}</p>
                    ${docNumber ? `<span class="doc-card-id">${docNumber}</span>` : ''}
                    <small>Issued: ${issued || 'N/A'}</small>
                    ${expiryStatus.class ? 
                        `<small><span class="expiry-badge ${expiryStatus.class}">${expiryStatus.text}</span></small>` : 
                        '<small>Expires: N/A</small>'
                    }
                </div>
                <div class="doc-card-footer">
                    ${copyBtn}
                    ${linkBtn}
                    ${pdfBtn}
                </div>
            </div>
        `;
    };

    // --- NEW: Function to render all cards, grouped (Assumed to be defined in full) ---
    const renderDocs = (documents) => {
        // ... (This function remains as defined in the previous version) ...
        const identityDocs = documents.filter(doc => IDENTITY_TYPES.includes(doc.docType));
        const financialDocs = documents.filter(doc => FINANCIAL_TYPES.includes(doc.docType));
        const academicDocs = documents.filter(doc => ACADEMIC_TYPES.includes(doc.docType));
        const otherDocs = documents.filter(doc => 
            !IDENTITY_TYPES.includes(doc.docType) &&
            !FINANCIAL_TYPES.includes(doc.docType) &&
            !ACADEMIC_TYPES.includes(doc.docType)
        );

        let html = '';

        if (identityDocs.length > 0) {
            html += '<h2 class="doc-category-header">Identity Documents</h2>';
            html += '<div class="doc-grid">';
            identityDocs.forEach(doc => html += createDocCard(doc));
            html += '</div>';
        }
        
        if (financialDocs.length > 0) {
            html += '<h2 class="doc-category-header">Financial Documents</h2>';
            html += '<div class="doc-grid">';
            financialDocs.forEach(doc => html += createDocCard(doc));
            html += '</div>';
        }

        if (academicDocs.length > 0) {
            html += '<h2 class="doc-category-header">Academic Documents</h2>';
            html += '<div class="doc-grid">';
            academicDocs.forEach(doc => html += createDocCard(doc));
            html += '</div>';
        }
        
        if (otherDocs.length > 0) {
            html += '<h2 class="doc-category-header">Other Documents</h2>';
            html += '<div class="doc-grid">';
            otherDocs.forEach(doc => html += createDocCard(doc));
            html += '</div>';
        }

        container.innerHTML = html;

        // 6. Add event listeners to all new buttons
        container.querySelectorAll('.doc-link').forEach(link => {
            link.addEventListener('click', handleLinkClick);
        });
        container.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', handleCopyClick);
        });
    };

    // --- NEW: Add Document Submission Logic ---
    const handleAddDocSubmission = async (e) => {
        e.preventDefault();

        // NOTE: Full_Name is assumed to be the user's name
        const docData = {
            fullName: 'PRAGADEESH SRINIVASAN', 
            docType: document.getElementById('doc-type').value,
            docNumber: document.getElementById('doc-number').value,
            issuedDate: document.getElementById('doc-issued').value,
            expiryDate: document.getElementById('doc-expiry').value,
            driveLink: document.getElementById('doc-link').value,
            uploadedPdf: document.getElementById('doc-pdf').value,
        };

        if (!docData.docType || !docData.docNumber) {
            alert('Document Type and Number are required.');
            return;
        }

        saveDocBtn.disabled = true;
        saveDocBtn.textContent = 'Saving...';

        const result = await callApi('addDocument', docData);

        if (result && result.success) {
            alert('Document added successfully!');
            addDocModal.classList.remove('visible');
            addDocForm.reset(); // Clear the form
            loadDocuments(); // Reload the document list
        }

        saveDocBtn.disabled = false;
        saveDocBtn.textContent = 'Save Document';
    };


    // Main function to load and render documents
    const loadDocuments = async () => {
        const result = await callApi('getDocumentData');
        
        if (!result || !result.data || result.data.length === 0) {
            container.innerHTML = '<h2 class="doc-category-header">No documents found.</h2>';
            return;
        }

        renderDocs(result.data);
    };

    // --- Add listener for document viewing modal close button ---
    closeBtn.addEventListener('click', hideModal);

    // --- NEW: Add listeners for Add Document feature ---
    if (addDocBtn) {
        addDocBtn.addEventListener('click', () => addDocModal.classList.add('visible'));
    }
    if (closeAddDocModalBtn) {
        closeAddDocModalBtn.addEventListener('click', () => addDocModal.classList.remove('visible'));
    }
    if (addDocForm) {
        addDocForm.addEventListener('submit', handleAddDocSubmission);
    }

    // Initial load
    loadDocuments();
});